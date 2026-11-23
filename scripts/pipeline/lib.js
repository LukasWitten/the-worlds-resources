/**
 * Shared helpers for the data pipeline (scripts/pipeline/*.js).
 *
 * Raw source files are downloaded by hand into data-raw/ (ignored by git):
 *   data-raw/baci/BACI_HS17_V202601.zip
 *     https://www.cepii.fr/CEPII/en/bdd_modele/bdd_modele_item.asp?id=37
 *   data-raw/naturalearth/ne_50m_admin_0_countries.zip   (unzipped next to it)
 *     https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import readline from 'node:readline';

export const RAW_DIR = 'data-raw';
export const BACI_VERSION = '202601';
export const BACI_REV = 'HS17';
export const BACI_SOURCE_ID = `baci-${BACI_VERSION}`;
export const BACI_ZIP = path.join(RAW_DIR, 'baci', `BACI_${BACI_REV}_V${BACI_VERSION}.zip`);
export const NE_DBF = path.join(RAW_DIR, 'naturalearth', 'ne_50m_admin_0_countries.dbf');

/** Pseudo country code for "rest of the world" rows and unknown partners. */
export const REST_OF_WORLD = 'ZZ';

/** "--key value" command line options → { key: value } */
export function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    args[key] = next && !next.startsWith('--') ? (i++, next) : true;
  }
  return args;
}

export function requireFile(file, hint) {
  if (!fs.existsSync(file)) {
    console.error(`Missing ${file}\n${hint}`);
    process.exit(1);
  }
}

export function writeJson(file, data, { pretty = false } = {}) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, pretty ? 2 : 0) + '\n');
}

/** Split one CSV line (double quotes, no line breaks inside fields). */
export function splitCsvLine(line) {
  const out = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(field); field = ''; }
    else field += ch;
  }
  out.push(field);
  return out;
}

/** Stream one member of a zip archive line by line (uses the system's `unzip -p`). */
export async function* zipLines(zipFile, member) {
  const child = spawn('unzip', ['-p', zipFile, member], { stdio: ['ignore', 'pipe', 'inherit'] });
  const exited = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', code => (code === 0 ? resolve() : reject(new Error(`unzip -p ${member} exited with ${code}`))));
  });
  const rl = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
  for await (const line of rl) yield line;
  await exited;
}

/** Read a whole (small) zip member as text. */
export async function zipText(zipFile, member) {
  const lines = [];
  for await (const line of zipLines(zipFile, member)) lines.push(line);
  return lines.join('\n');
}

/**
 * BACI country code (numeric) → ISO 3166-1 alpha-2.
 * BACI leaves a few ISO-2 fields empty: Namibia's code "NA" and the
 * "Other Asia, nes" code 490, which is Taiwan in UN trade statistics.
 * Regional "nes" aggregates have no country and become REST_OF_WORLD.
 */
const BACI_OVERRIDES = { 490: { iso2: 'TW', iso3: 'TWN' }, 516: { iso2: 'NA' } };

export async function readBaciCountries(zipFile = BACI_ZIP) {
  const text = await zipText(zipFile, `country_codes_V${BACI_VERSION}.csv`);
  const [header, ...rows] = text.split('\n').filter(Boolean);
  const cols = splitCsvLine(header);
  const idx = (name) => cols.indexOf(name);
  const byCode = new Map();
  for (const row of rows) {
    const f = splitCsvLine(row);
    const code = Number(f[idx('country_code')]);
    const override = BACI_OVERRIDES[code] || {};
    const iso2 = override.iso2 || f[idx('country_iso2')] || null;
    byCode.set(code, {
      code,
      name: f[idx('country_name')],
      iso2: iso2 && /^[A-Z]{2}$/.test(iso2) ? iso2 : null,
      iso3: override.iso3 || f[idx('country_iso3')]
    });
  }
  return byCode;
}

/** Minimal dBASE III reader for the attribute table of a shapefile. */
export function readDbf(file, encoding = 'utf-8') {
  const buf = fs.readFileSync(file);
  const count = buf.readUInt32LE(4);
  const headerLength = buf.readUInt16LE(8);
  const recordLength = buf.readUInt16LE(10);
  const fields = [];
  for (let off = 32; buf[off] !== 0x0d; off += 32) {
    fields.push({
      name: buf.toString('latin1', off, off + 11).replace(/\0.*$/, ''),
      type: String.fromCharCode(buf[off + 11]),
      length: buf[off + 16]
    });
  }
  const decoder = new TextDecoder(encoding);
  const records = [];
  for (let r = 0; r < count; r++) {
    let off = headerLength + r * recordLength;
    if (buf[off] === 0x2a) continue; // deleted
    off += 1;
    const rec = {};
    for (const field of fields) {
      const raw = decoder.decode(buf.subarray(off, off + field.length)).replace(/[\0\s]+$/, '').trim();
      off += field.length;
      rec[field.name] = field.type === 'N' || field.type === 'F' ? (raw === '' ? null : Number(raw)) : raw;
    }
    records.push(rec);
  }
  return records;
}
