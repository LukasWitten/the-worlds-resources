/**
 * Entry point of the map page (/map). The map state lives in the URL hash
 * (#map/<feature-id>?view=…), so shared links and old /#map links keep working.
 */

import { mapController } from './modules/map.js';
import { uiController, mappedGoods } from './modules/ui.js';
import { inspector } from './modules/inspector.js';
import { dataService } from './modules/dataService.js';
import { goods } from './modules/goods.js';
import { mapState } from './modules/mapState.js';
import { supplyChain } from './modules/supplyChain.js';
import { DATASETS, GOODS_PATH } from './modules/datasets.js';

async function bootstrap() {
  console.log('[App] Initializing "The World\'s Resources" WebApp...');

  // 1. Initialize UI Controls & Inspector
  uiController.init();
  inspector.init('inspector-drawer');

  // 2. Initialize the Leaflet map and open it in its clean fullscreen state
  mapController.init('leaflet-map');
  uiController.enterMap();

  // 3. Load the goods catalogue and all datasets (absolute paths from the site root)
  await Promise.all([
    goods.load(GOODS_PATH),
    ...DATASETS.map(({ id, path }) => dataService.loadDataset(id, path))
  ]);

  // 4. Initial Render
  mapState.normalize = normalizeMapState;
  mapState.subscribe(onMapStateChange);
  uiController.renderResourceFilters();
  uiController.renderMapSelects();
  uiController.renderLegend();
  uiController.refreshMap();

  // 5. Highlight the supply chain of the open feature and keep it in the map state (and URL)
  inspector.onFeatureChange = (feature) => {
    mapController.highlightChain(feature ? inspector.currentChain?.ids : null, feature?.properties?.id);
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

  // 6. Handle deep links: #map, #map/<feature-id>?view=…
  route(window.location.hash);
  window.addEventListener('hashchange', () => route(window.location.hash));
  // Back/forward between entries created by mapState (pushState)
  window.addEventListener('popstate', () => route(window.location.hash));

  console.log('[App] All datasets loaded and rendered successfully.');
}

const MAP_VIEWS = ['overview', 'oil_fields', 'good'];

/**
 * Take over the map state from the URL; onMapStateChange() then updates map,
 * sidebar and inspector. A plain /map (no hash) is the default overview.
 */
function route(hash) {
  mapState.applyHash(hash.startsWith('#map') ? hash : '#map');
}

/** Drop what the loaded data doesn't know (unknown view, good, country or feature). */
function normalizeMapState(state) {
  const next = { ...state };
  if (!MAP_VIEWS.includes(next.view)) next.view = 'overview';
  if (next.view === 'good' && !mappedGoods().includes(next.good)) next.view = 'overview';
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
