/**
 * Build-time access to the curated data: the same modules the browser uses
 * (dataService, goods, supplyChain), filled from the files in public/ instead
 * of fetch(). Pages use it to print real numbers into the static HTML.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dataService } from '../modules/dataService.js';
import { goods } from '../modules/goods.js';
import { supplyChain } from '../modules/supplyChain.js';
import { DATASETS, GOODS_PATH } from '../modules/datasets.js';

// The build runs from the project root (npm run build); import.meta.url would
// point into the bundled output instead.
const PUBLIC = join(process.cwd(), 'public');

export const readPublicJson = (path) => JSON.parse(readFileSync(join(PUBLIC, path), 'utf-8'));

let loaded = false;

/** Fill dataService and goods once per build. */
export function loadData() {
  if (!loaded) {
    goods.goods = new Map(Object.entries(readPublicJson(GOODS_PATH).goods || {}));
    for (const { id, path } of DATASETS) dataService.datasets.set(id, readPublicJson(path));
    loaded = true;
  }
  return { dataService, goods, supplyChain };
}

const isRoute = (f) => f.geometry?.type?.includes('LineString');

/** Key numbers of the homepage (the browser no longer needs to fill them in). */
export function siteStats() {
  loadData();
  const all = dataService.getAllFeatures();
  const sourced = all.filter(f => f.properties?.source?.url).length;
  return {
    places: all.filter(f => !isRoute(f)).length,
    routes: all.filter(isRoute).length,
    sourcedPercent: Math.round((sourced / Math.max(all.length, 1)) * 100)
  };
}

/** "9 steps · 4 countries" for a featured chain (by the id of the feature it ends at). */
export function chainMeta(id) {
  loadData();
  const chain = supplyChain.getChain(id);
  if (!chain) return '';
  const countries = supplyChain.countries(chain);
  return `${supplyChain.steps(chain)} steps · ${countries} ${countries === 1 ? 'country' : 'countries'}`;
}
