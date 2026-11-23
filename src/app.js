/**
 * Main Application Entry Point
 */

import { mapController } from './modules/map.js';
import { uiController } from './modules/ui.js';
import { inspector } from './modules/inspector.js';
import { dataService } from './modules/dataService.js';
import { goods } from './modules/goods.js';
import { mapState } from './modules/mapState.js';
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
    goods.load('/data/reference/goods.json'),
    dataService.loadDataset('germany_crude_oil', '/data/geojson/germany/crude_oil.geojson'),
    dataService.loadDataset('germany_natural_gas', '/data/geojson/germany/natural_gas.geojson'),
    dataService.loadDataset('global_lithium', '/data/geojson/global/lithium.geojson'),
    dataService.loadDataset('global_oil_fields', '/data/geojson/global/oil_fields.geojson'),
    dataService.loadDataset('global_oil_export_corridors', '/data/geojson/global/oil_export_corridors.geojson')
  ]);

  // 4. Initial Render
  mapState.normalize = normalizeMapState;
  mapState.subscribe(onMapStateChange);
  uiController.renderResourceFilters();
  uiController.refreshMap();
  heroMap.render();
  fillHomeStats();

  // 5. Highlight the supply chain of the open feature and keep it in the map state (and URL)
  inspector.onFeatureChange = (feature) => {
    mapController.highlightChain(feature ? inspector.currentChain?.ids : null, feature?.properties?.id);
    if (uiController.currentSection !== 'map') return;
    mapState.set({ feature: feature?.properties?.id || null }, { history: 'replace' });
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

  // 6. Handle deep links: #home, #map, #sources, #contact, #map/<feature-id>?view=…
  route(window.location.hash);
  window.addEventListener('hashchange', () => route(window.location.hash));
  // Back/forward between entries created by mapState (pushState)
  window.addEventListener('popstate', () => route(window.location.hash));

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
const MAP_VIEWS = ['overview', 'oil_fields', 'good'];

/**
 * Show the section named in the URL hash. For #map URLs the map state is taken
 * over from the URL; onMapStateChange() then updates map, sidebar and inspector.
 */
function route(hash) {
  const section = hash.replace(/^#/, '').split(/[/?]/)[0];
  if (!SECTIONS.includes(section)) return;

  const enteringMap = section === 'map' && uiController.currentSection !== 'map';
  if (uiController.currentSection !== section) {
    uiController.showSection(section);
  }
  if (section !== 'map') return;

  const changed = mapState.applyHash(hash);
  // Coming from another section with a feature in the URL: the state may be
  // unchanged, but the map still has to fly to it once it has its size.
  if (enteringMap && !changed.includes('feature')) focusOpenFeature();
}

/** Drop what the loaded data doesn't know (unknown view, good, country or feature). */
function normalizeMapState(state) {
  const next = { ...state };
  if (!MAP_VIEWS.includes(next.view)) next.view = 'overview';
  if (next.view === 'good' && goods.get(next.good)?.stage !== 'raw') next.view = 'overview';
  if (next.view !== 'good') next.good = null;
  if (next.country && (next.view === 'oil_fields' || !dataService.getCountries().includes(next.country))) {
    next.country = null;
  }
  // Reserved for the export, import and product views
  next.direction = null;
  next.depth = null;
  next.year = null;
  if (next.feature && !dataService.getFeatureById(next.feature)) next.feature = null;
  return next;
}

/** Single place where a change of the map state reaches map, sidebar and inspector. */
function onMapStateChange(state, changed) {
  const filterChanged = changed.some(key => key === 'view' || key === 'good' || key === 'country');

  if (filterChanged) {
    uiController.syncMapControls(state);
    uiController.refreshMap();
    // An open place that the new view doesn't show is closed
    if (state.feature && !uiController.visibleFeatures(state).some(f => f.properties.id === state.feature)) {
      mapState.set({ feature: null }, { history: 'replace' });
      focusView(mapState.get());
      return;
    }
  }

  if (changed.includes('feature')) {
    const openId = inspector.isOpen ? inspector.currentFeature?.properties?.id : null;
    if (state.feature && state.feature !== openId) {
      // Opened from a link (not from a click on the map): show it and fly there
      inspector.show(dataService.getFeatureById(state.feature));
      focusOpenFeature();
    } else if (!state.feature && inspector.isOpen) {
      inspector.hide();
    }
  }

  if (filterChanged && !state.feature) focusView(state);
}

/** Wait until the map has its final size after a section switch, then fly to the open feature. */
function focusOpenFeature() {
  const feature = inspector.isOpen ? inspector.currentFeature : null;
  if (!feature) return;
  // On wider screens the inspector covers the right side of the map.
  setTimeout(() => mapController.focusFeature(feature, inspectorInset()), 400);
}

/** Camera for a new view: oil fields → world view; one resource or country → fit its features. */
function focusView(state) {
  if (state.view === 'oil_fields') {
    mapController.focusOilFields();
  } else if (state.view === 'good' || state.country) {
    setTimeout(() => mapController.fitFeatures(uiController.visibleFeatures(state), inspectorInset()), 50);
  }
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
