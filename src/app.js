/**
 * Main Application Entry Point
 */

import { mapController } from './modules/map.js';
import { uiController } from './modules/ui.js';
import { inspector } from './modules/inspector.js';
import { dataService } from './modules/dataService.js';
import { supplyChain } from './modules/supplyChain.js';
import { heroMap, FEATURED_CHAINS } from './modules/heroMap.js';
import { inject as injectAnalytics } from '@vercel/analytics';

// Cookieless page-view statistics (Vercel Web Analytics), only on the live site:
// local development and preview deployments are not counted.
const PRODUCTION_HOSTS = new Set(['www.theworldsresources.org', 'theworldsresources.org']);
if (PRODUCTION_HOSTS.has(window.location.hostname)) {
  injectAnalytics({ mode: 'production' });
}

async function bootstrap() {
  console.log('[App] Initializing "The World\'s Resources" WebApp...');

  // 1. Initialize UI Controls & Inspector
  uiController.init();
  inspector.init('inspector-drawer');

  // 2. Initialize Leaflet maps (resource map + homepage hero)
  mapController.init('leaflet-map');
  heroMap.init('hero-map');

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
  heroMap.render();
  fillHomeStats();

  // 5. Highlight the supply chain of the open feature and keep the URL in sync: #map/<feature-id>
  inspector.onFeatureChange = (feature) => {
    mapController.highlightChain(feature ? inspector.currentChain?.ids : null, feature?.properties?.id);
    if (uiController.currentSection !== 'map') return;
    const id = feature?.properties?.id;
    const desired = id ? `#map/${encodeURIComponent(id)}` : '#map';
    if (window.location.hash !== desired) {
      history.replaceState(null, '', desired);
    }
  };

  inspector.onShowChain = (features) => {
    // On phones the inspector covers the map: close it so the chain is visible
    if (window.innerWidth < 640) {
      inspector.hide();
      mapController.highlightChain(new Set(features.map(f => f.properties.id)));
    }
    // Fullscreen reader: go back to the sidebar first and wait for its width
    const wasFullscreen = inspector.isFullscreen;
    if (wasFullscreen) inspector.toggleFullscreen();
    setTimeout(() => {
      mapController.invalidateSize();
      mapController.fitFeatures(features, inspectorInset());
    }, wasFullscreen ? 400 : 0);
  };

  // 6. Handle deep links: #home, #map, #sources, #contact, #map/<feature-id>
  route(window.location.hash);
  window.addEventListener('hashchange', () => route(window.location.hash));

  console.log('[App] All datasets loaded and rendered successfully.');
}

/** Numbers on the homepage come from the loaded data, so they never go stale. */
function fillHomeStats() {
  const all = dataService.getAllFeatures();
  const isRoute = (f) => f.geometry?.type?.includes('LineString');
  const set = (key, value) => {
    const el = document.querySelector(`[data-stat="${key}"]`);
    if (el) el.textContent = value;
  };
  set('places', all.filter(f => !isRoute(f)).length);
  set('routes', all.filter(isRoute).length);
  const sourced = all.filter(f => f.properties?.source?.url).length;
  set('sourced', `${Math.round((sourced / Math.max(all.length, 1)) * 100)}%`);

  for (const { id } of FEATURED_CHAINS) {
    const el = document.querySelector(`[data-chain-meta="${id}"]`);
    const chain = supplyChain.getChain(id);
    if (!el || !chain) continue;
    const countries = supplyChain.countries(chain);
    el.textContent = `${supplyChain.steps(chain)} steps · ${countries} ${countries === 1 ? 'country' : 'countries'}`;
  }
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
  setTimeout(() => mapController.focusFeature(feature, inspectorInset()), 400);
}

/** Width in px the open inspector covers on the right side of the map (0 on phones). */
function inspectorInset() {
  const drawer = document.getElementById('inspector-drawer');
  if (!inspector.isOpen || !drawer || window.innerWidth < 640) return 0;
  return drawer.offsetWidth < window.innerWidth ? drawer.offsetWidth : 0;
}

// Bootstrap once DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
