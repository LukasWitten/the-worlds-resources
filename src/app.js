/**
 * Main Application Entry Point
 */

import { mapController } from './modules/map.js';
import { uiController } from './modules/ui.js';
import { inspector } from './modules/inspector.js';
import { dataService } from './modules/dataService.js';

async function bootstrap() {
  console.log('[App] Initializing "The World\'s Resources" WebApp...');

  // 1. Initialize UI Controls & Inspector
  uiController.init();
  inspector.init('inspector-drawer');

  // 2. Initialize Leaflet Map
  mapController.init('leaflet-map');

  // 3. Load All Datasets (Crude Oil, Natural Gas, Lithium Intercontinental)
  await Promise.all([
    dataService.loadDataset('germany_crude_oil', './data/geojson/germany/crude_oil.geojson'),
    dataService.loadDataset('germany_natural_gas', './data/geojson/germany/natural_gas.geojson'),
    dataService.loadDataset('global_lithium', './data/geojson/global/lithium.geojson')
  ]);

  // 4. Initial Render
  uiController.refreshMap();

  // 5. Handle direct deep links / URL hash (e.g. #map)
  const initialHash = window.location.hash.replace('#', '');
  if (initialHash && ['home', 'map', 'sources', 'contact'].includes(initialHash)) {
    uiController.showSection(initialHash);
  }

  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash && ['home', 'map', 'sources', 'contact'].includes(hash)) {
      uiController.showSection(hash);
    }
  });

  console.log('[App] All datasets loaded and rendered successfully.');
}

// Bootstrap once DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
