/**
 * Builds the trade data of the export, import and resource views from CEPII BACI.
 *
 * Which goods: every good in public/data/reference/goods.json whose HS codes
 * are given in the BACI revision (HS17). A 4-digit code covers all its 6-digit
 * sub-codes.
 *
 * Output, public/data/trade/<year>/ (year = latest BACI year):
 *   meta.json              source, years, thresholds, goods with world totals
 *   world.json             per country the top 1–3 export and import goods (world map markers)
 *   by-good/<good>.json    all bilateral flows of one good (columnar)
 *   by-country/<CC>.json   per good: value, quantity, N, G, rank, score, HHI, top partners
 *
 * Metrics (docs/map-extension-analysis.md, section 5):
 *   N = value of the good / value of all goods the country exports (imports)
 *   G = value of the good / world exports of the good
 *   score = √(N·G)
 *   Ranking, thresholds and the global-leader flag use the average of the
 *   last RANKING_YEARS years (prices of oil and gas swing a lot); the values
 *   shown are those of the latest year.
 *
 * Flows below MIN_FLOW_USD are merged per exporter into one row to "ZZ"
 * (rest of the world), so the rows of an exporter still add up to its total.
 * Regional "nes" partners of BACI are reported as "ZZ" as well.
 *
 * Usage: node scripts/pipeline/build-trade.js [--baci <zip>] [--year 2024]
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  BACI_ZIP, BACI_VERSION, BACI_REV, BACI_SOURCE_ID, REST_OF_WORLD,
  parseArgs, requireFile, readBaciCountries, zipLines, writeJson
} from './lib.js';

const GOODS_PATH = 'public/data/reference/goods.json';
const COUNTRIES_PATH = 'public/data/reference/countries.json';
const OUT_ROOT = 'public/data/trade';

const FIRST_YEAR = 2017;
const LAST_YEAR = 2024; // latest year in BACI HS17 V202601
const RANKING_YEARS = 3;
const MIN_FLOW_USD = 1_000_000;
const TOP_PARTNERS = 10;

// Selection of a country's top goods (section 5.1)
const MIN_VALUE_USD = 100_000_000;
const MIN_NATIONAL_SHARE = 0.02;
const MIN_GLOBAL_SHARE = 0.05;
const LEADER_GLOBAL_SHARE = 0.15;
const MAX_TOP_GOODS = 3;

const args = parseArgs();
const baciZip = args.baci || BACI_ZIP;
const year = Number(args.year || LAST_YEAR);
requireFile(baciZip, 'Download BACI (see scripts/pipeline/lib.js).');
if (!(year >= FIRST_YEAR + RANKING_YEARS - 1 && year <= LAST_YEAR)) {
  console.error(`--year must be between ${FIRST_YEAR + RANKING_YEARS - 1} and ${LAST_YEAR}`);
  process.exit(1);
}
const years = Array.from({ length: RANKING_YEARS }, (_, i) => year - RANKING_YEARS + 1 + i);

// ---------------------------------------------------------------------------
// Goods and their HS codes

const catalogue = JSON.parse(fs.readFileSync(GOODS_PATH, 'utf-8')).goods;
const hsToGood = new Map(); // "2603" or "271111" → good id
for (const [id, good] of Object.entries(catalogue)) {
  if (good.hs?.rev !== BACI_REV || !good.hs.codes?.length) continue;
  for (const code of good.hs.codes) {
    const clash = [...hsToGood].find(([c]) => c.startsWith(code) || code.startsWith(c));
    if (clash) throw new Error(`HS code ${code} of "${id}" overlaps ${clash[0]} of "${clash[1]}"`);
    hsToGood.set(code, id);
  }
}
const goodIds = [...new Set(hsToGood.values())];
const productCache = new Map();
function goodOf(k) {
  let id = productCache.get(k);
  if (id === undefined) {
    id = hsToGood.get(k) ?? hsToGood.get(k.slice(0, 4)) ?? null;
    productCache.set(k, id);
  }
  return id;
}

// ---------------------------------------------------------------------------
// Countries: BACI code → ISO-2 (or ZZ for regional aggregates)

const known = new Set(Object.keys(JSON.parse(fs.readFileSync(COUNTRIES_PATH, 'utf-8')).countries));
const baciCountries = await readBaciCountries(baciZip);
const isoOf = new Map();
for (const [code, c] of baciCountries) isoOf.set(code, c.iso2 && known.has(c.iso2) ? c.iso2 : REST_OF_WORLD);

// ---------------------------------------------------------------------------
// Read one year: totals of all goods per country and the flows of our goods

async function readYear(y) {
  const file = `BACI_${BACI_REV}_Y${y}_V${BACI_VERSION}.csv`;
  const exportTotal = new Map(); // iso → USD, all goods
  const importTotal = new Map();
  const flows = new Map(goodIds.map(id => [id, new Map()])); // good → "from|to" → { v, q }
  let lines = 0;
  let header = true;
  for await (const line of zipLines(baciZip, file)) {
    if (header) { header = false; continue; }
    lines++;
    const [, i, j, k, v, q] = line.split(',');
    const from = isoOf.get(Number(i)) || REST_OF_WORLD;
    const to = isoOf.get(Number(j)) || REST_OF_WORLD;
    const usd = Number(v) * 1000; // BACI values are in thousand USD
    exportTotal.set(from, (exportTotal.get(from) || 0) + usd);
    importTotal.set(to, (importTotal.get(to) || 0) + usd);
    const good = goodOf(k);
    if (!good) continue;
    const key = `${from}|${to}`;
    const pairs = flows.get(good);
    const flow = pairs.get(key) || { v: 0, q: 0, qMissing: false };
    flow.v += usd;
    const tonnes = Number(q);
    if (q === '' || Number.isNaN(tonnes)) flow.qMissing = true;
    else flow.q += tonnes;
    pairs.set(key, flow);
  }
  console.log(`[trade] ${y}: ${lines.toLocaleString('en')} rows read`);
  return { exportTotal, importTotal, flows };
}

const data = new Map();
for (const y of years) data.set(y, await readYear(y));
const latest = data.get(year);

// ---------------------------------------------------------------------------
// Per year, per good: value by exporter / importer and the world total

function sideTotals(pairs) {
  const byFrom = new Map();
  const byTo = new Map();
  let world = 0;
  let worldQty = 0;
  for (const [key, f] of pairs) {
    const [from, to] = key.split('|');
    byFrom.set(from, (byFrom.get(from) || 0) + f.v);
    byTo.set(to, (byTo.get(to) || 0) + f.v);
    world += f.v;
    worldQty += f.q;
  }
  return { byFrom, byTo, world, worldQty };
}

const totals = new Map(); // year → good → sideTotals
for (const [y, d] of data) {
  totals.set(y, new Map(goodIds.map(id => [id, sideTotals(d.flows.get(id))])));
}

const avg = (fn) => years.reduce((sum, y) => sum + fn(y), 0) / years.length;
const r4 = (n) => Math.round(n * 1e4) / 1e4;
const usd = (n) => Math.round(n);
const tonnes = (n) => (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10);

/** Rank (1 = largest) of every country in a Map of values. */
function ranks(values) {
  const order = [...values].filter(([c, v]) => c !== REST_OF_WORLD && v > 0).sort((a, b) => b[1] - a[1]);
  return new Map(order.map(([c], i) => [c, i + 1]));
}

/**
 * Metrics of every country for one direction.
 * side: 'byFrom' (export) or 'byTo' (import); countryTotal: exportTotal or importTotal.
 */
function metrics(side, countryTotalKey) {
  const out = new Map(); // country → good → metrics
  for (const good of goodIds) {
    const latestSide = totals.get(year).get(good)[side];
    const avgValues = new Map();
    for (const y of years) {
      for (const [c, v] of totals.get(y).get(good)[side]) avgValues.set(c, (avgValues.get(c) || 0) + v / years.length);
    }
    const latestRanks = ranks(latestSide);
    const avgRanks = ranks(avgValues);
    const worldLatest = totals.get(year).get(good).world;
    const worldAvg = avg(y => totals.get(y).get(good).world);

    for (const [c, avgValue] of avgValues) {
      if (c === REST_OF_WORLD || !avgValue) continue;
      const value = latestSide.get(c) || 0;
      const countryLatest = latest[countryTotalKey].get(c) || 0;
      const countryAvg = avg(y => data.get(y)[countryTotalKey].get(c) || 0);
      const N = countryAvg ? avgValue / countryAvg : 0;
      const G = worldAvg ? avgValue / worldAvg : 0;
      const m = {
        good,
        valueUsd: usd(value),
        N: countryLatest ? r4(value / countryLatest) : 0,
        G: worldLatest ? r4(value / worldLatest) : 0,
        rank: latestRanks.get(c) || null,
        avg: { valueUsd: usd(avgValue), N: r4(N), G: r4(G), rank: avgRanks.get(c) || null },
        score: r4(Math.sqrt(N * G)),
        leader: G >= LEADER_GLOBAL_SHARE || avgRanks.get(c) === 1,
        eligible: avgValue >= MIN_VALUE_USD && (N >= MIN_NATIONAL_SHARE || G >= MIN_GLOBAL_SHARE)
      };
      if (!out.has(c)) out.set(c, new Map());
      out.get(c).set(good, m);
    }
  }
  return out;
}

const exportMetrics = metrics('byFrom', 'exportTotal');
const importMetrics = metrics('byTo', 'importTotal');

/** Partners of country c for one good in the latest year: top N, the rest summed, and the HHI. */
function partners(good, c, direction) {
  const list = [];
  let total = 0;
  let qty = 0;
  let qtyMissing = false;
  for (const [key, f] of latest.flows.get(good)) {
    const [from, to] = key.split('|');
    if ((direction === 'export' ? from : to) !== c) continue;
    list.push([direction === 'export' ? to : from, f.v]);
    total += f.v;
    qty += f.q;
    qtyMissing ||= f.qMissing;
  }
  list.sort((a, b) => b[1] - a[1]);
  const hhi = total ? list.reduce((s, [, v]) => s + (v / total) ** 2, 0) : null;
  const top = list.slice(0, TOP_PARTNERS).map(([p, v]) => [p, usd(v), r4(v / total)]);
  const rest = list.slice(TOP_PARTNERS).reduce((s, [, v]) => s + v, 0);
  if (rest > 0) top.push([REST_OF_WORLD, usd(rest), r4(rest / total)]);
  return { qty: qtyMissing && !qty ? null : tonnes(qty), partnerCount: list.length, hhi: hhi === null ? null : r4(hhi), partners: top };
}

function topGoods(goodMetrics) {
  return [...goodMetrics.values()]
    .filter(m => m.eligible)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_TOP_GOODS);
}

// ---------------------------------------------------------------------------
// Write

const outDir = path.join(OUT_ROOT, String(year));
fs.rmSync(outDir, { recursive: true, force: true });
const provenance = { kind: 'observed', sourceId: BACI_SOURCE_ID };

// by-good: columnar flows, small ones merged per exporter into "ZZ"
const goodsMeta = {};
for (const good of goodIds) {
  const merged = new Map();
  for (const [key, f] of latest.flows.get(good)) {
    const [from, to] = key.split('|');
    const target = f.v >= MIN_FLOW_USD && to !== REST_OF_WORLD ? key : `${from}|${REST_OF_WORLD}`;
    const row = merged.get(target) || { v: 0, q: 0, qMissing: false };
    row.v += f.v;
    row.q += f.q;
    row.qMissing ||= f.qMissing;
    merged.set(target, row);
  }
  const rows = [...merged]
    .map(([key, f]) => [...key.split('|'), usd(f.v), f.qMissing && !f.q ? null : tonnes(f.q)])
    .sort((a, b) => b[2] - a[2] || a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
  const t = totals.get(year).get(good);
  const exporters = [...t.byFrom.keys()].filter(c => c !== REST_OF_WORLD).length;
  const importers = [...t.byTo.keys()].filter(c => c !== REST_OF_WORLD).length;
  goodsMeta[good] = { worldUsd: usd(t.world), worldQty: tonnes(t.worldQty), exporters, importers, rows: rows.length };
  writeJson(path.join(outDir, 'by-good', `${good}.json`), {
    meta: { good, year, provenance, minFlowUsd: MIN_FLOW_USD, worldUsd: usd(t.world), worldQty: tonnes(t.worldQty) },
    columns: ['from', 'to', 'valueUsd', 'qty'],
    rows
  });
}

// by-country: profile of one country
const countriesOut = [...new Set([...exportMetrics.keys(), ...importMetrics.keys()])].sort();
const world = {};
for (const c of countriesOut) {
  const side = (all, direction) => [...(all.get(c)?.values() || [])]
    .sort((a, b) => b.avg.valueUsd - a.avg.valueUsd)
    .map(({ eligible, ...m }) => ({ ...m, ...partners(m.good, c, direction) }));
  const exportsTop = topGoods(exportMetrics.get(c) || new Map());
  const importsTop = topGoods(importMetrics.get(c) || new Map());
  writeJson(path.join(outDir, 'by-country', `${c}.json`), {
    meta: { country: c, year, provenance, rankingYears: years },
    totals: {
      exportUsd: usd(latest.exportTotal.get(c) || 0),
      importUsd: usd(latest.importTotal.get(c) || 0)
    },
    top: { export: exportsTop.map(m => m.good), import: importsTop.map(m => m.good) },
    exports: side(exportMetrics, 'export'),
    imports: side(importMetrics, 'import')
  });
  const marker = (list) => list.map(m => ({ good: m.good, score: m.score, leader: m.leader }));
  if (exportsTop.length || importsTop.length) {
    world[c] = { export: marker(exportsTop), import: marker(importsTop) };
  }
}

writeJson(path.join(outDir, 'world.json'), {
  meta: { year, provenance, rankingYears: years },
  countries: world
});

writeJson(path.join(outDir, 'meta.json'), {
  year,
  rankingYears: years,
  provenance,
  hsRev: BACI_REV,
  units: { value: 'USD', qty: 't' },
  minFlowUsd: MIN_FLOW_USD,
  selection: {
    minValueUsd: MIN_VALUE_USD,
    minNationalShare: MIN_NATIONAL_SHARE,
    minGlobalShare: MIN_GLOBAL_SHARE,
    leaderGlobalShare: LEADER_GLOBAL_SHARE,
    maxTopGoods: MAX_TOP_GOODS
  },
  goods: goodsMeta,
  countries: countriesOut,
  generated: new Date().toISOString().slice(0, 10)
}, { pretty: true });

const size = (dir) => fs.readdirSync(dir, { withFileTypes: true })
  .reduce((s, e) => s + (e.isDirectory() ? size(path.join(dir, e.name)) : fs.statSync(path.join(dir, e.name)).size), 0);
console.log(`[trade] ${goodIds.length} goods, ${countriesOut.length} countries, ${Object.keys(world).length} with top goods → ${outDir} (${Math.round(size(outDir) / 1024)} KB)`);
