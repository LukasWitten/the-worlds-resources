/**
 * The curated datasets on the map. Paths are relative to the site root
 * (public/ in the repository), so the same list works in the browser and
 * at build time (src/lib/data.js reads the files from public/).
 */

export const GOODS_PATH = '/data/reference/goods.json';

export const DATASETS = [
  { id: 'germany_crude_oil', path: '/data/geojson/germany/crude_oil.geojson' },
  { id: 'germany_natural_gas', path: '/data/geojson/germany/natural_gas.geojson' },
  { id: 'global_lithium', path: '/data/geojson/global/lithium.geojson' },
  { id: 'global_oil_fields', path: '/data/geojson/global/oil_fields.geojson' },
  { id: 'global_oil_export_corridors', path: '/data/geojson/global/oil_export_corridors.geojson' }
];
