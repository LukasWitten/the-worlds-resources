/**
 * Validates all GeoJSON datasets (and the contributor templates).
 *
 * Checks:
 *  - every file is valid JSON and a FeatureCollection (templates: a single Feature)
 *  - every feature matches public/data/schemas/resource-feature.schema.json
 *  - the goods catalogue matches its schema, and every feature's "resource"
 *    is a good from that catalogue
 *  - the sources register and the country master data match their schemas;
 *    every source id they name exists, every feature's "country" is a known
 *    country (or "INT")
 *  - feature ids are unique across the whole project
 *  - every route names its start/end via from_node_id / to_node_id, the ids
 *    exist, and the first/last coordinate lies on that node (or inside that
 *    oil-field area for field → export pipelines)
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
const GOODS_PATH = path.join(DATA_ROOT, 'reference', 'goods.json');
const GOODS_SCHEMA_PATH = path.join(DATA_ROOT, 'schemas', 'goods.schema.json');
const SOURCES_PATH = path.join(DATA_ROOT, 'reference', 'sources.json');
const SOURCES_SCHEMA_PATH = path.join(DATA_ROOT, 'schemas', 'sources.schema.json');
const COUNTRIES_PATH = path.join(DATA_ROOT, 'reference', 'countries.json');
const COUNTRIES_SCHEMA_PATH = path.join(DATA_ROOT, 'schemas', 'countries.schema.json');

// How close a route's first/last coordinate must be to its referenced node
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

// 0. Goods catalogue ---------------------------------------------------------
const goodsSchema = readJson(GOODS_SCHEMA_PATH);
const goodsCatalogue = readJson(GOODS_PATH);
if (!goodsSchema || !goodsCatalogue) process.exit(1);
const validateGoods = ajv.compile(goodsSchema);
if (!validateGoods(goodsCatalogue)) {
  for (const msg of formatAjvErrors(validateGoods.errors)) fail(GOODS_PATH, msg);
}
const goodIds = new Set(Object.keys(goodsCatalogue.goods || {}));
for (const [id, good] of Object.entries(goodsCatalogue.goods || {})) {
  if (good.parent && !goodIds.has(good.parent)) {
    fail(GOODS_PATH, `good "${id}" has unknown parent "${good.parent}"`);
  }
}
console.log(`[checked] ${GOODS_PATH} (${goodIds.size} goods)`);

/** Validate a JSON file against a schema file; returns the data (or null if unreadable). */
function checkAgainstSchema(file, schemaFile) {
  const fileSchema = readJson(schemaFile);
  const data = readJson(file);
  if (!fileSchema || !data) return null;
  const validate = ajv.compile(fileSchema);
  if (!validate(data)) {
    for (const msg of formatAjvErrors(validate.errors)) fail(file, msg);
  }
  return data;
}

const sourcesRegister = checkAgainstSchema(SOURCES_PATH, SOURCES_SCHEMA_PATH);
const sourceIds = new Set(Object.keys(sourcesRegister?.sources || {}));
console.log(`[checked] ${SOURCES_PATH} (${sourceIds.size} sources)`);

const countryData = checkAgainstSchema(COUNTRIES_PATH, COUNTRIES_SCHEMA_PATH);
const countryCodes = new Set(Object.keys(countryData?.countries || {}));
for (const id of countryData?.metadata?.sources || []) {
  if (!sourceIds.has(id)) fail(COUNTRIES_PATH, `metadata.sources names unknown source "${id}" (not in ${SOURCES_PATH})`);
}
console.log(`[checked] ${COUNTRIES_PATH} (${countryCodes.size} countries)`);

function checkFeature(file, feature, index) {
  const resource = feature?.properties?.resource;
  if (resource && !goodIds.has(resource)) {
    fail(file, `${label(feature, index)} /properties/resource "${resource}" is not a good in ${GOODS_PATH} (${[...goodIds].join(', ')})`);
  }
  const country = feature?.properties?.country;
  if (country && country !== 'INT' && countryCodes.size && !countryCodes.has(country)) {
    fail(file, `${label(feature, index)} /properties/country "${country}" is not in ${COUNTRIES_PATH}`);
  }
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

// 4. Routes must reference existing start/end nodes and touch them ----------------
//    from_node_id → visible node or oil field; to_node_id → visible node.
//    The first / last coordinate must lie on that node (tolerance) or inside that field.
const featuresById = new Map();
for (const { features } of datasets) {
  for (const f of features) {
    if (f?.properties?.id && !featuresById.has(f.properties.id)) featuresById.set(f.properties.id, f);
  }
}

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

function touches(coord, target) {
  if (!Array.isArray(coord) || !target?.geometry) return false;
  const g = target.geometry;
  if (g.type === 'Point') {
    return Math.abs(g.coordinates[0] - coord[0]) < NODE_MATCH_TOLERANCE_DEG &&
      Math.abs(g.coordinates[1] - coord[1]) < NODE_MATCH_TOLERANCE_DEG;
  }
  if (g.type === 'Polygon') return insideRing(coord, g.coordinates[0]);
  return false;
}

function checkEndpoint(file, feature, i, key, coord, allowArea) {
  const refId = feature.properties[key];
  if (!refId) return; // missing field is already reported by the schema
  const target = featuresById.get(refId);
  const where = coord ? `[${coord}]` : '(no coordinate)';
  if (!target) {
    fail(file, `${label(feature, i)} ${key} "${refId}" does not exist`);
    return;
  }
  const isNode = target.geometry?.type === 'Point' && target.properties?.visible !== false;
  const isArea = target.geometry?.type === 'Polygon';
  if (!isNode && !(allowArea && isArea)) {
    fail(file, `${label(feature, i)} ${key} "${refId}" is not a visible node${allowArea ? ' or oil field' : ''}`);
    return;
  }
  if (!touches(coord, target)) {
    fail(file, `${label(feature, i)} ${key} "${refId}" does not match the route's ${key === 'from_node_id' ? 'first' : 'last'} coordinate ${where}`);
  }
}

for (const { file, features } of datasets) {
  features.forEach((feature, i) => {
    const geom = feature?.geometry;
    if (!geom || !Array.isArray(geom.coordinates)) return;
    const lines =
      geom.type === 'LineString' ? [geom.coordinates] :
      geom.type === 'MultiLineString' ? geom.coordinates : null;
    if (!lines || !lines.length) return;
    const first = lines[0]?.[0];
    const lastLine = lines[lines.length - 1] || [];
    const last = lastLine[lastLine.length - 1];
    checkEndpoint(file, feature, i, 'from_node_id', first, true);
    checkEndpoint(file, feature, i, 'to_node_id', last, false);
    const p = feature.properties || {};
    if (p.from_node_id && p.from_node_id === p.to_node_id) {
      fail(file, `${label(feature, i)} starts and ends at the same node "${p.from_node_id}"`);
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
