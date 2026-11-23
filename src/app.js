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
  // Use absolute paths from site root so this works both with Vite (public/ → /data/)
  // and with static hosts / GitHub Pages / Vercel after deployment.
  await Promise.all([
    dataService.loadDataset('germany_crude_oil', '/data/geojson/germany/crude_oil.geojson'),
    dataService.loadDataset('germany_natural_gas', '/data/geojson/germany/natural_gas.geojson'),
    dataService.loadDataset('global_lithium', '/data/geojson/global/lithium.geojson'),
    dataService.loadDataset('global_oil_fields', '/data/geojson/global/oil_fields.geojson'),
    dataService.loadDataset('global_oil_export_corridors', '/data/geojson/global/oil_export_corridors.geojson')
  ]);

  // 4. Initial Render
  uiController.refreshMap();

  // 5. Keep the URL in sync with the open feature: #map/<feature-id>
  inspector.onFeatureChange = (feature) => {
    if (uiController.currentSection !== 'map') return;
    const id = feature?.properties?.id;
    const desired = id ? `#map/${encodeURIComponent(id)}` : '#map';
    if (window.location.hash !== desired) {
      history.replaceState(null, '', desired);
    }
  };

  // 6. Handle deep links: #home, #map, #sources, #contact, #map/<feature-id>
  route(window.location.hash);
  window.addEventListener('hashchange', () => route(window.location.hash));

  console.log('[App] All datasets loaded and rendered successfully.');
}

const SECTIONS = ['home', 'map', 'sources', 'contact'];

/**
 * Show the section named in the URL hash and, for #map/<feature-id>,
 * open that feature in the inspector and focus the map on it.
 */
function route(hash) {
  const [section, rawId] = hash.replace(/^#/, '').split('/');
  if (!SECTIONS.includes(section)) return;

  const featureId = rawId ? decodeURIComponent(rawId) : '';
  const feature = section === 'map' && featureId ? dataService.getFeatureById(featureId) : null;

  if (uiController.currentSection !== section) {
    uiController.showSection(section);
  }
  if (!feature) {
    // Unknown or missing id: close any open details and normalize the URL
    if (section === 'map') {
      inspector.hide();
      if (window.location.hash !== '#map') history.replaceState(null, '', '#map');
    }
    return;
  }

  inspector.show(feature);
  // Wait until the map has its final size after the section switch.
  // On wider screens the inspector covers the right side of the map.
  setTimeout(() => {
    const drawer = document.getElementById('inspector-drawer');
    const covers = drawer && window.innerWidth >= 640 && drawer.offsetWidth < window.innerWidth;
    mapController.focusFeature(feature, covers ? drawer.offsetWidth : 0);
  }, 400);
}

// Bootstrap once DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
