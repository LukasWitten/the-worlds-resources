/**
 * Validates all GeoJSON datasets (and the contributor templates).
 *
 * Checks:
 *  - every file is valid JSON and a FeatureCollection (templates: a single Feature)
 *  - every feature matches public/data/schemas/resource-feature.schema.json
 *  - feature ids are unique across the whole project
 *  - every route starts and ends on a visible node (same tolerance as the map)
 *    or inside an oil-field area (field → export pipeline)
 *
 * Warnings (do not fail the build): sources without a URL.
 *
 * Usage: npm run validate:data
 */

import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const DATA_ROOT = 'public/data';
const GEOJSON_DIR = path.join(DATA_ROOT, 'geojson');
const TEMPLATES_DIR = path.join(DATA_ROOT, 'templates');
const SCHEMA_PATH = path.join(DATA_ROOT, 'schemas', 'resource-feature.schema.json');

// Must match MapController.coordsMatch() in src/modules/map.js
const NODE_MATCH_TOLERANCE_DEG = 0.08;

const inCI = Boolean(process.env.GITHUB_ACTIONS);
const errors = [];
const warnings = [];

function report(list, level, file, message) {
  list.push(`${file}: ${message}`);
  if (inCI) {
    console.log(`::${level} file=${file}::${message}`);
  }
}
const fail = (file, message) => report(errors, 'error', file, message);
const warn = (file, message) => report(warnings, 'warning', file, message);

function listFiles(dir, extensions) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(full, extensions);
    return extensions.some(ext => entry.name.endsWith(ext)) ? [full] : [];
  });
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (err) {
    fail(file, `invalid JSON – ${err.message}`);
    return null;
  }
}

function label(feature, index) {
  const id = feature?.properties?.id;
  return id ? `feature "${id}"` : `feature #${index}`;
}

function formatAjvErrors(ajvErrors) {
  // if/then wrappers add noise ("must match then schema"); keep the concrete causes
  return ajvErrors
    .filter(e => e.keyword !== 'if' && e.keyword !== 'anyOf')
    .map(e => {
      const where = e.instancePath || '(feature)';
      const extra = e.params?.allowedValues ? ` (${e.params.allowedValues.join(', ')})` : '';
      return `${where} ${e.message}${extra}`;
    });
}

// ---------------------------------------------------------------------------

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const schema = readJson(SCHEMA_PATH);
if (!schema) process.exit(1);
const validateFeature = ajv.compile(schema);

function checkFeature(file, feature, index) {
  if (validateFeature(feature)) return true;
  for (const msg of formatAjvErrors(validateFeature.errors)) {
    fail(file, `${label(feature, index)} ${msg}`);
  }
  return false;
}

// 1. Datasets --------------------------------------------------------------
const datasets = [];
const datasetFiles = listFiles(GEOJSON_DIR, ['.geojson', '.json']);

for (const file of datasetFiles) {
  const data = readJson(file);
  if (!data) continue;
  if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
    fail(file, 'root must be a FeatureCollection with a "features" array');
    continue;
  }
  data.features.forEach((feature, i) => checkFeature(file, feature, i));
  datasets.push({ file, features: data.features });
  console.log(`[checked] ${file} (${data.features.length} features)`);
}

// 2. Templates (single Features, excluded from the id/topology checks) ------
for (const file of listFiles(TEMPLATES_DIR, ['.json'])) {
  const feature = readJson(file);
  if (feature) checkFeature(file, feature, 0);
  console.log(`[checked] ${file} (template)`);
}

// 3. Unique ids across all datasets ------------------------------------------
const seenIds = new Map();
for (const { file, features } of datasets) {
  for (const feature of features) {
    const id = feature?.properties?.id;
    if (!id) continue;
    if (seenIds.has(id)) {
      fail(file, `duplicate id "${id}" (already used in ${seenIds.get(id)})`);
    } else {
      seenIds.set(id, file);
    }
  }
}

// 4. Routes must start and end on a visible node or an oil-field area -----------
const allFeatures = datasets.flatMap(d => d.features);
const nodeCoords = allFeatures
  .filter(f => f?.geometry?.type === 'Point' && f.properties?.visible !== false)
  .map(f => f.geometry.coordinates);
const areaRings = allFeatures
  .filter(f => f?.geometry?.type === 'Polygon' && Array.isArray(f.geometry.coordinates))
  .map(f => f.geometry.coordinates[0]);

// Ray casting point-in-polygon on the outer ring ([lon, lat] pairs)
function insideRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

const nearNode = coord =>
  Array.isArray(coord) &&
  (nodeCoords.some(n =>
    Math.abs(n[0] - coord[0]) < NODE_MATCH_TOLERANCE_DEG &&
    Math.abs(n[1] - coord[1]) < NODE_MATCH_TOLERANCE_DEG
  ) || areaRings.some(ring => insideRing(coord, ring)));

for (const { file, features } of datasets) {
  features.forEach((feature, i) => {
    const geom = feature?.geometry;
    if (!geom || !Array.isArray(geom.coordinates)) return;
    const lines =
      geom.type === 'LineString' ? [geom.coordinates] :
      geom.type === 'MultiLineString' ? geom.coordinates : [];
    for (const line of lines) {
      if (!Array.isArray(line) || line.length < 2) continue;
      const start = line[0];
      const end = line[line.length - 1];
      if (!nearNode(start)) fail(file, `${label(feature, i)} starts at [${start}], which is not on a visible node or oil field`);
      if (!nearNode(end)) fail(file, `${label(feature, i)} ends at [${end}], which is not on a visible node or oil field`);
    }
  });
}

// 5. Soft quality checks ----------------------------------------------------------
for (const { file, features } of datasets) {
  features.forEach((feature, i) => {
    if (feature?.properties?.source && !feature.properties.source.url) {
      warn(file, `${label(feature, i)} has no source URL`);
    }
  });
}

// ---------------------------------------------------------------------------------
if (warnings.length && !inCI) {
  console.log(`\nWarnings (${warnings.length}):`);
  warnings.forEach(w => console.log(`  ⚠ ${w}`));
}
if (errors.length && !inCI) {
  console.error(`\nErrors (${errors.length}):`);
  errors.forEach(e => console.error(`  ✖ ${e}`));
}

const featureCount = datasets.reduce((sum, d) => sum + d.features.length, 0);
console.log(
  `\nValidation complete: ${datasets.length} datasets, ${featureCount} features, ` +
  `${errors.length} errors, ${warnings.length} warnings.`
);
if (errors.length > 0) process.exit(1);
