/**
 * Trade data (public/data/trade/, generated from CEPII BACI by
 * scripts/pipeline/build-trade.js): loaded file by file when a view needs it
 * and kept in memory afterwards.
 *
 *   index.json                   years with data, latest year
 *   <year>/meta.json             goods with world totals, thresholds
 *   <year>/world.json            top 1–3 export and import goods per country
 *   <year>/by-good/<good>.json   all bilateral flows of a good
 *   <year>/by-country/<CC>.json  profile of a country: N, G, rank, partners per good
 *
 * A flow is { good, from, to, year, valueUsd, qty, qtyUnit, provenance };
 * to/from "ZZ" stands for the rest of the world (small flows merged per exporter).
 */

export const REST_OF_WORLD = 'ZZ';

class TradeData {
  constructor(base = '/data/trade') {
    this.base = base;
    this.cache = new Map(); // path → Promise of the parsed file (null if missing)
  }

  /**
   * Fetch a JSON file once; concurrent calls share the request.
   * Only files listed in index.json / meta.json are requested: the dev server and
   * the static host answer unknown paths with the app's index.html, not with 404.
   */
  load(file) {
    const url = `${this.base}/${file}`;
    if (!this.cache.has(url)) {
      const request = fetch(url)
        .then(response => {
          if (!response.ok) throw new Error(`${url}: ${response.status}`);
          return response.json();
        })
        .catch(err => {
          this.cache.delete(url); // a failed request may be retried later
          throw err;
        });
      this.cache.set(url, request);
    }
    return this.cache.get(url);
  }

  async index() {
    return (await this.load('index.json')) || { years: [], latest: null };
  }

  /** meta.json of the given year, or of the latest year with data; null if there is no such year. */
  async meta(year = null) {
    const index = await this.index();
    const y = year ?? index.latest;
    return index.years.includes(y) ? this.load(`${y}/meta.json`) : null;
  }

  /** { CL: { export: [{ good, score, leader }], import: [...] }, … } */
  async world(year = null) {
    const meta = await this.meta(year);
    return meta ? (await this.load(`${meta.year}/world.json`)).countries : {};
  }

  /** Profile of one country, or null if it has no trade in the catalogue's goods. */
  async country(code, year = null) {
    const meta = await this.meta(year);
    if (!meta?.countries.includes(code)) return null;
    return this.load(`${meta.year}/by-country/${code}.json`);
  }

  /** What a country exports: { country, year, provenance, rankingYears, totalUsd, top, goods }. */
  async exportsOf(code, { year = null } = {}) {
    return this.side(code, 'exports', year);
  }

  /** What a country imports: same shape as exportsOf(). */
  async importsOf(code, { year = null } = {}) {
    return this.side(code, 'imports', year);
  }

  async side(code, key, year) {
    const profile = await this.country(code, year);
    if (!profile) return null;
    const direction = key === 'exports' ? 'export' : 'import';
    return {
      country: profile.meta.country,
      year: profile.meta.year,
      provenance: profile.meta.provenance,
      rankingYears: profile.meta.rankingYears,
      totalUsd: profile.totals[`${direction}Usd`],
      top: profile.top[direction],
      goods: profile[key]
    };
  }

  /**
   * Bilateral flows of one good, largest first.
   * country + direction 'export' → flows from the country, 'import' → flows into it,
   * no direction → both. Without country → all flows of the good.
   */
  async flowsOf(good, { country = null, direction = null, year = null } = {}) {
    const meta = await this.meta(year);
    if (!meta || !Object.hasOwn(meta.goods, good)) return [];
    const data = await this.load(`${meta.year}/by-good/${good}.json`);
    const { provenance } = data.meta;
    const col = Object.fromEntries(data.columns.map((name, i) => [name, i]));
    return data.rows
      .filter(row => {
        if (!country) return true;
        const isFrom = row[col.from] === country;
        const isTo = row[col.to] === country;
        if (direction === 'export') return isFrom;
        if (direction === 'import') return isTo;
        return isFrom || isTo;
      })
      .map(row => ({
        good,
        from: row[col.from],
        to: row[col.to],
        year: data.meta.year,
        valueUsd: row[col.valueUsd],
        qty: row[col.qty],
        qtyUnit: 't',
        provenance
      }));
  }
}

export const trade = new TradeData();
