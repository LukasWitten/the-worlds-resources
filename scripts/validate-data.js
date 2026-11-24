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
 *  - the trade files (public/data/trade/<year>/) match their schema, name only
 *    known goods, countries (or "ZZ" = rest of the world) and sources, and add
 *    up: flows of a good = its world total, flows of an exporter = the value in
 *    its country profile, world.json = the top goods in the country profiles
 *  - project files (*.twr.json: stories, examples) match project-1.schema.json
 *    and are consistent: routes start and end at known places, waypoints are
 *    waypoint nodes, goods exist in the catalogue or the project, claims and
 *    story steps point to existing sources and elements, "documented" claims
 *    name a source
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
const TRADE_DIR = path.join(DATA_ROOT, 'trade');
const TRADE_SCHEMA_PATH = path.join(DATA_ROOT, 'schemas', 'trade.schema.json');
const REST_OF_WORLD = 'ZZ';
const PROJECT_SCHEMA_PATH = path.join(DATA_ROOT, 'schemas', 'project-1.schema.json');
const PROJECT_EXT = '.twr.json';

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

// Trade data ------------------------------------------------------------------
const tradeSchema = readJson(TRADE_SCHEMA_PATH);
if (tradeSchema) ajv.addSchema(tradeSchema);
const tradeValidator = (name) => ajv.getSchema(`${tradeSchema.$id}#/definitions/${name}`);

function checkTradeFile(file, definition) {
  const data = readJson(file);
  if (!data) return null;
  const validate = tradeValidator(definition);
  if (!validate(data)) {
    for (const msg of formatAjvErrors(validate.errors).slice(0, 10)) fail(file, msg);
    return null;
  }
  const sourceId = data.meta?.provenance?.sourceId || data.provenance?.sourceId;
  if (sourceId && !sourceIds.has(sourceId)) fail(file, `provenance.sourceId "${sourceId}" is not in ${SOURCES_PATH}`);
  return data;
}

const knownCountry = (code) => code === REST_OF_WORLD || countryCodes.has(code);
// Values are rounded to whole USD per row, so sums may differ by up to 0.5 USD per row
const sumMatches = (a, b, rows) => Math.abs(a - b) <= Math.max(1, Math.ceil(rows / 2));

function checkTradeYear(dir) {
  const meta = checkTradeFile(path.join(dir, 'meta.json'), 'meta');
  if (!meta) return;
  const yearOf = path.basename(dir);
  if (String(meta.year) !== yearOf) fail(path.join(dir, 'meta.json'), `year ${meta.year} does not match folder ${yearOf}`);

  // by-good: flows per exporter, used to cross-check the country profiles
  const exportedBy = new Map(); // "good|country" → { usd, rows }
  for (const good of Object.keys(meta.goods)) {
    const file = path.join(dir, 'by-good', `${good}.json`);
    if (!goodIds.has(good)) fail(path.join(dir, 'meta.json'), `good "${good}" is not in ${GOODS_PATH}`);
    if (!fs.existsSync(file)) { fail(file, 'listed in meta.json but missing'); continue; }
    const data = checkTradeFile(file, 'byGood');
    if (!data) continue;
    let sum = 0;
    for (const [from, to, usd] of data.rows) {
      if (!knownCountry(from)) fail(file, `unknown exporter "${from}"`);
      if (!knownCountry(to)) fail(file, `unknown importer "${to}"`);
      sum += usd;
      const acc = exportedBy.get(`${good}|${from}`) || { usd: 0, rows: 0 };
      exportedBy.set(`${good}|${from}`, { usd: acc.usd + usd, rows: acc.rows + 1 });
    }
    if (!sumMatches(sum, data.meta.worldUsd, data.rows.length)) {
      fail(file, `rows add up to ${sum} USD, meta.worldUsd is ${data.meta.worldUsd}`);
    }
  }

  // by-country: profiles must match the flows and world.json
  const world = checkTradeFile(path.join(dir, 'world.json'), 'world');
  const files = listFiles(path.join(dir, 'by-country'), ['.json']);
  const listed = new Set(meta.countries);
  for (const file of files) {
    const code = path.basename(file, '.json');
    if (!listed.has(code)) fail(file, 'not listed in meta.json countries');
    if (!countryCodes.has(code)) fail(file, `"${code}" is not in ${COUNTRIES_PATH}`);
    const data = checkTradeFile(file, 'byCountry');
    if (!data) continue;
    for (const side of ['exports', 'imports']) {
      for (const g of data[side]) {
        if (!goodIds.has(g.good)) fail(file, `${side}: good "${g.good}" is not in ${GOODS_PATH}`);
        for (const [partner] of g.partners) if (!knownCountry(partner)) fail(file, `${side} ${g.good}: unknown partner "${partner}"`);
        const shareSum = g.partners.reduce((s, [, , share]) => s + share, 0);
        if (g.partners.length && Math.abs(shareSum - 1) > 0.005) fail(file, `${side} ${g.good}: partner shares add up to ${shareSum.toFixed(4)}`);
      }
    }
    for (const g of data.exports) {
      // The profile value is rounded once, the flows per row (plus 1 for the profile itself)
      const flows = exportedBy.get(`${g.good}|${code}`) || { usd: 0, rows: 0 };
      if (!sumMatches(flows.usd, g.valueUsd, flows.rows + 1)) fail(file, `exports ${g.good}: ${g.valueUsd} USD, but the flows in by-good add up to ${flows.usd}`);
    }
    const marker = world?.countries?.[code];
    for (const side of ['export', 'import']) {
      const expected = data.top[side].join(',');
      const actual = (marker?.[side] || []).map(m => m.good).join(',');
      if (expected !== actual) fail(file, `top ${side} goods [${expected}] differ from world.json [${actual}]`);
    }
  }
  for (const code of listed) {
    if (!fs.existsSync(path.join(dir, 'by-country', `${code}.json`))) fail(path.join(dir, 'meta.json'), `country "${code}" has no by-country file`);
  }
  for (const code of Object.keys(world?.countries || {})) {
    if (!countryCodes.has(code)) fail(path.join(dir, 'world.json'), `"${code}" is not in ${COUNTRIES_PATH}`);
    if (!listed.has(code)) fail(path.join(dir, 'world.json'), `country "${code}" is not in meta.json countries`);
  }
  console.log(`[checked] ${dir} (${Object.keys(meta.goods).length} goods, ${files.length} countries)`);
}

if (tradeSchema && fs.existsSync(TRADE_DIR)) {
  const yearDirs = fs.readdirSync(TRADE_DIR, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort();
  for (const dir of yearDirs) checkTradeYear(path.join(TRADE_DIR, dir));
  // index.json tells the app which years exist and which one to load first
  const indexFile = path.join(TRADE_DIR, 'index.json');
  const index = fs.existsSync(indexFile) ? readJson(indexFile) : (fail(indexFile, 'missing'), null);
  if (index) {
    const listed = (index.years || []).map(String).sort();
    if (listed.join(',') !== yearDirs.join(',')) fail(indexFile, `years [${listed}] differ from the year folders [${yearDirs}]`);
    if (String(index.latest) !== yearDirs[yearDirs.length - 1]) fail(indexFile, `latest ${index.latest} is not the newest year folder`);
  }
}

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
const datasetFiles = listFiles(GEOJSON_DIR, ['.geojson', '.json']).filter(f => !f.endsWith(PROJECT_EXT));

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
for (const file of listFiles(TEMPLATES_DIR, ['.json']).filter(f => !f.endsWith(PROJECT_EXT))) {
  const feature = readJson(file);
  if (feature) checkFeature(file, feature, 0);
  console.log(`[checked] ${file} (template)`);
}

// 2b. Project files (*.twr.json) -------------------------------------------------
const projectSchema = readJson(PROJECT_SCHEMA_PATH);
const validateProject = projectSchema ? ajv.compile(projectSchema) : null;

function checkProject(file) {
  const project = readJson(file);
  if (!project || !validateProject) return;
  if (!validateProject(project)) {
    for (const msg of formatAjvErrors(validateProject.errors).slice(0, 15)) fail(file, msg);
    return;
  }
  const sourceSet = new Set();
  for (const src of project.sources) {
    if (sourceSet.has(src.id)) fail(file, `duplicate source id "${src.id}"`);
    sourceSet.add(src.id);
    if (src.registryId && !sourceIds.has(src.registryId)) fail(file, `source "${src.id}": registryId "${src.registryId}" is not in ${SOURCES_PATH}`);
  }
  const projectGoods = new Set(Object.keys(project.goods || {}));
  const knownGood = (g) => goodIds.has(g) || projectGoods.has(g);
  for (const [id, good] of Object.entries(project.goods || {})) {
    if (good.parent && !knownGood(good.parent)) fail(file, `good "${id}": unknown parent "${good.parent}"`);
  }

  const nodes = new Map();
  const elementIds = new Set();
  const addId = (id) => {
    if (elementIds.has(id)) fail(file, `duplicate id "${id}"`);
    elementIds.add(id);
  };
  const checkClaims = (label, claims = []) => {
    for (const claim of claims) {
      for (const sid of claim.sourceIds) if (!sourceSet.has(sid)) fail(file, `${label}: unknown source "${sid}"`);
      if (claim.confidence === 'documented' && !claim.sourceIds.length) fail(file, `${label}: a "documented" claim needs at least one source`);
    }
  };
  for (const node of project.nodes) {
    addId(node.id);
    nodes.set(node.id, node);
    const label = `node "${node.id}"`;
    if (node.country && countryCodes.size && !countryCodes.has(node.country)) fail(file, `${label}: country "${node.country}" is not in ${COUNTRIES_PATH}`);
    for (const g of node.goods || []) if (!knownGood(g)) fail(file, `${label}: unknown good "${g}"`);
    for (const a of [...(node.process?.inputs || []), ...(node.process?.outputs || [])]) {
      if (!knownGood(a.good)) fail(file, `${label}: process uses unknown good "${a.good}"`);
    }
    checkClaims(label, node.claims);
  }
  for (const edge of project.edges) {
    addId(edge.id);
    const label = `edge "${edge.id}"`;
    for (const end of ['from', 'to']) {
      const node = nodes.get(edge[end]);
      if (!node) fail(file, `${label}: ${end} "${edge[end]}" is not a node`);
    }
    if (edge.from === edge.to) fail(file, `${label}: starts and ends at the same node`);
    for (const via of edge.via || []) {
      if (typeof via !== 'string') continue;
      const node = nodes.get(via);
      if (!node) fail(file, `${label}: via "${via}" is not a node`);
      else if (node.kind !== 'waypoint') fail(file, `${label}: via "${via}" is a ${node.kind}, not a waypoint (split the route at that place instead)`);
    }
    for (const g of edge.goods) if (!knownGood(g)) fail(file, `${label}: unknown good "${g}"`);
    checkClaims(label, edge.claims);
  }
  for (const step of project.story?.steps || []) {
    const label = `story step "${step.id}"`;
    for (const key of ['reveal', 'hide', 'focus']) {
      for (const id of step[key] || []) if (!elementIds.has(id)) fail(file, `${label}: ${key} names unknown element "${id}"`);
    }
    for (const sid of step.sourceIds || []) if (!sourceSet.has(sid)) fail(file, `${label}: unknown source "${sid}"`);
  }
  console.log(`[checked] ${file} (${project.nodes.length} nodes, ${project.edges.length} edges, ${project.story?.steps?.length || 0} steps)`);
}

for (const file of listFiles(DATA_ROOT, [PROJECT_EXT])) checkProject(file);

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
