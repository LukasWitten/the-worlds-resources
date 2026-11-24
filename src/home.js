/**
 * Entry point of the homepage: the live hero map. Everything else on the page
 * is static HTML (numbers included, see src/lib/data.js).
 */

import { heroMap } from './modules/heroMap.js';
import { dataService } from './modules/dataService.js';
import { goods } from './modules/goods.js';
import { DATASETS, GOODS_PATH } from './modules/datasets.js';

async function initHero() {
  heroMap.init('hero-map');
  await Promise.all([
    goods.load(GOODS_PATH),
    ...DATASETS.map(({ id, path }) => dataService.loadDataset(id, path))
  ]);
  heroMap.render();
}

initHero();
