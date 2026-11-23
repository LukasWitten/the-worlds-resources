/**
 * UI Module - Handles top navigation, sidebar toggles, search, filters, and modals.
 */

import { mapController } from './map.js';
import { dataService } from './dataService.js';
import { goods } from './goods.js';
import { escapeHtml } from './html.js';
import { mapState } from './mapState.js';
import { supplyChain } from './supplyChain.js';

const regionNames = typeof Intl !== 'undefined' && Intl.DisplayNames
  ? new Intl.DisplayNames(['en'], { type: 'region' })
  : null;

/** "CL" → "Chile" (falls back to the code). */
export function countryName(code) {
  try {
    return regionNames?.of(code) || code;
  } catch {
    return code;
  }
}

class UIController {
  constructor() {
    this.sidebarOpen = true;
    this.navbarOpen = true;
    this.currentSection = 'home';
  }

  init() {
    this.setupNavigation();
    this.setupSidebarToggle();
    this.setupNavbarToggle();
    this.setupFilters();
    this.setupSearch();
    this.setupModal();
    this.setupMapPerspectiveButtons();
    this.setupApiKeyModal();
  }

  setupNavigation() {
    const navButtons = document.querySelectorAll('[data-section-target]');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-section-target');
        this.showSection(target);
      });
    });

    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileBtn && mobileMenu) {
      mobileBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
      });
    }
  }

  showSection(sectionId) {
    this.currentSection = sectionId;

    ['home', 'map', 'sources', 'contact'].forEach(id => {
      const el = document.getElementById(`section-${id}`);
      if (el) el.classList.add('hidden');
    });

    const targetEl = document.getElementById(`section-${sectionId}`);
    if (targetEl) targetEl.classList.remove('hidden');

    document.querySelectorAll('[data-nav-item]').forEach(btn => {
      if (btn.getAttribute('data-section-target') === sectionId) {
        btn.classList.add('text-indigo-400');
        btn.classList.remove('text-slate-300');
      } else {
        btn.classList.remove('text-indigo-400');
        btn.classList.add('text-slate-300');
      }
    });

    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
      mobileMenu.classList.add('hidden');
    }

    // Top navbar toggle button should only appear when viewing the map
    const topNavbarToggleBtn = document.getElementById('navbar-toggle-btn');
    const navbar = document.getElementById('top-navbar');

    // The map view fills exactly the viewport (navbar + map + footer), so the page never scrolls
    // and the inspector's header can't end up above the visible area
    document.body.classList.toggle('map-mode', sectionId === 'map');

    if (sectionId === 'map') {
      // Start in clean fullscreen: collapse sidebar + top navbar for maximum "wow" impact
      this.collapseMapChrome();
      topNavbarToggleBtn?.classList.remove('hidden');
      mapController.invalidateSize();
    } else {
      topNavbarToggleBtn?.classList.add('hidden');
      // Ensure navbar is visible when leaving map view
      if (!this.navbarOpen && navbar) {
        this.toggleNavbar(true);
      }
    }

    // Persist section in the URL so reload / share keeps the same view (#map, #sources, …);
    // the map keeps its own state (#map/<feature>?view=…)
    const desiredHash = sectionId === 'map' ? mapState.href() : `#${sectionId}`;
    if (window.location.hash !== desiredHash) {
      history.replaceState(null, '', desiredHash);
    }

    // Instant: a smooth scroll can be cut short when the map view locks the page height
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  /**
   * Collapse sidebar and top navbar so the map opens in a clean fullscreen state.
   */
  collapseMapChrome() {
    const sidebar = document.getElementById('map-sidebar');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const sidebarToggleIcon = document.getElementById('sidebar-toggle-icon');

    // Collapse left sidebar
    this.sidebarOpen = false;
    if (sidebar) {
      sidebar.classList.add('-ml-80');
    }
    if (sidebarToggleBtn) {
      sidebarToggleBtn.classList.remove('left-[20.5rem]');
      sidebarToggleBtn.classList.add('left-4');
      sidebarToggleBtn.setAttribute('title', 'Show sidebar');
    }
    if (sidebarToggleIcon) {
      sidebarToggleIcon.innerText = '▶';
    }

    // Collapse top navbar
    this.toggleNavbar(false);
  }

  setupSidebarToggle() {
    const sidebar = document.getElementById('map-sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    const toggleIcon = document.getElementById('sidebar-toggle-icon');

    if (!toggleBtn || !sidebar) return;

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.sidebarOpen = !this.sidebarOpen;

      if (this.sidebarOpen) {
        sidebar.classList.remove('-ml-80');
        toggleBtn.classList.remove('left-4');
        toggleBtn.classList.add('left-[20.5rem]');
        if (toggleIcon) toggleIcon.innerText = '◀';
        toggleBtn.setAttribute('title', 'Hide sidebar');
      } else {
        sidebar.classList.add('-ml-80');
        toggleBtn.classList.remove('left-[20.5rem]');
        toggleBtn.classList.add('left-4');
        if (toggleIcon) toggleIcon.innerText = '▶';
        toggleBtn.setAttribute('title', 'Show sidebar');
      }

      mapController.invalidateSize();
    });
  }

  setupNavbarToggle() {
    const toggleBtn = document.getElementById('navbar-toggle-btn');
    if (!toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
      this.toggleNavbar();
    });
  }

  toggleNavbar(forceOpen = null) {
    const navbar = document.getElementById('top-navbar');
    const toggleBtn = document.getElementById('navbar-toggle-btn');
    const toggleIcon = document.getElementById('navbar-toggle-icon');

    if (forceOpen !== null) {
      this.navbarOpen = forceOpen;
    } else {
      this.navbarOpen = !this.navbarOpen;
    }

    if (this.navbarOpen) {
      // Show Navbar
      navbar?.classList.remove('-translate-y-full', '-mb-16', 'opacity-0', 'pointer-events-none');
      toggleBtn?.classList.remove('top-0');
      toggleBtn?.classList.add('top-16');
      if (toggleIcon) toggleIcon.innerText = '▲';
    } else {
      // Hide Navbar
      navbar?.classList.add('-translate-y-full', '-mb-16', 'opacity-0', 'pointer-events-none');
      toggleBtn?.classList.remove('top-16');
      toggleBtn?.classList.add('top-0');
      if (toggleIcon) toggleIcon.innerText = '▼';
    }

    mapController.invalidateSize();
  }

  setupFilters() {
    // Delegated, so the resource checkboxes rendered from the goods catalogue are covered too
    document.getElementById('map-sidebar')?.addEventListener('change', (e) => {
      const input = e.target.closest('[data-filter-type]');
      if (!input) return;
      dataService.setFilter(input.dataset.filterType, input.dataset.filterKey, input.checked);
      this.refreshMap();
    });
  }

  /** One checkbox per raw good in the catalogue (call once the catalogue is loaded). */
  renderResourceFilters() {
    const list = document.getElementById('resource-filter-list');
    if (!list) return;
    const hidden = dataService.activeFilters.hiddenResources;
    list.innerHTML = goods.ids('raw').map(id => {
      const color = goods.color(id);
      return `
        <label class="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 cursor-pointer transition border border-slate-700/50">
          <input type="checkbox" ${hidden.has(id) ? '' : 'checked'} data-filter-type="resources" data-filter-key="${escapeHtml(id)}" class="rounded bg-slate-900 border-slate-700 h-4 w-4" style="accent-color:${color}">
          <span class="text-xs font-medium" style="color:${color}">${escapeHtml(goods.icon(id))} ${escapeHtml(goods.label(id))}</span>
        </label>`;
    }).join('');
  }

  setupSearch() {
    const searchInput = document.getElementById('map-search-input');
    if (!searchInput) return;

    let timeout = null;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        dataService.setSearchQuery(e.target.value);
        this.refreshMap();
      }, 250);
    });
  }

  setupModal() {
    const modal = document.getElementById('imprint-modal');
    const openBtns = document.querySelectorAll('[data-open-imprint]');
    const closeBtn = document.getElementById('close-imprint-btn');

    openBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        modal?.classList.remove('hidden');
      });
    });

    closeBtn?.addEventListener('click', () => {
      modal?.classList.add('hidden');
    });

    modal?.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  }

  setupMapPerspectiveButtons() {
    const btnGermany = document.getElementById('btn-focus-germany');
    const btnGlobal = document.getElementById('btn-focus-global');

    btnGermany?.addEventListener('click', () => {
      mapController.focusGermany();
    });

    btnGlobal?.addEventListener('click', () => {
      mapController.focusGlobalRoute();
    });

    this.setupViewModeButtons();
  }

  /** View buttons and selects only change the map state; syncMapControls() reflects it in the sidebar. */
  setupViewModeButtons() {
    document.querySelectorAll('[data-map-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.mapView;
        // "Resource" keeps the last chosen resource, or starts with the first one
        const good = view === 'good' ? (this.lastGood || goods.ids('raw')[0]) : null;
        mapState.set({ view, good });
      });
    });
    document.getElementById('good-select')?.addEventListener('change', (e) => {
      mapState.set({ view: 'good', good: e.target.value });
    });
    document.getElementById('country-select')?.addEventListener('change', (e) => {
      mapState.set({ country: e.target.value || null });
    });
    document.getElementById('map-view-chip-reset')?.addEventListener('click', () => {
      mapState.set({ view: 'overview', good: null, country: null });
    });
    this.syncMapControls(mapState.get());
  }

  /** Options of the resource and country selects (call once catalogue and data are loaded). */
  renderMapSelects() {
    const goodSelect = document.getElementById('good-select');
    if (goodSelect) {
      goodSelect.innerHTML = goods.ids('raw')
        .map(id => `<option value="${escapeHtml(id)}">${escapeHtml(goods.icon(id))} ${escapeHtml(goods.label(id))}</option>`)
        .join('');
    }
    const countrySelect = document.getElementById('country-select');
    if (countrySelect) {
      const countries = dataService.getCountries()
        .map(code => ({ code, name: countryName(code) }))
        .sort((a, b) => a.name.localeCompare(b.name));
      countrySelect.innerHTML = '<option value="">All countries</option>' + countries
        .map(({ code, name }) => `<option value="${escapeHtml(code)}">${escapeHtml(name)}</option>`)
        .join('');
    }
    this.syncMapControls(mapState.get());
  }

  /** Bring the sidebar controls in line with the map state (called on every state change). */
  syncMapControls(state) {
    const active = 'px-2.5 py-2 rounded-lg bg-indigo-950/90 text-[11px] font-semibold text-indigo-200 border border-indigo-600/60 transition cursor-pointer';
    const idle = 'px-2.5 py-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 border border-slate-700 transition cursor-pointer';
    document.querySelectorAll('[data-map-view]').forEach(btn => {
      const on = btn.dataset.mapView === state.view;
      btn.className = on ? active : idle;
      btn.setAttribute('aria-pressed', String(on));
    });

    if (state.good) this.lastGood = state.good;
    document.getElementById('good-select-wrap')?.classList.toggle('hidden', state.view !== 'good');
    const goodSelect = document.getElementById('good-select');
    if (goodSelect && state.good) goodSelect.value = state.good;
    const countrySelect = document.getElementById('country-select');
    if (countrySelect) countrySelect.value = state.country || '';

    // The isolated oil view is global; a country filter doesn't apply there
    const panelCountry = document.getElementById('panel-country');
    if (panelCountry) {
      const off = state.view === 'oil_fields';
      panelCountry.style.opacity = off ? '0.45' : '1';
      panelCountry.style.pointerEvents = off ? 'none' : '';
    }

    const hint = document.getElementById('view-mode-hint');
    if (hint) {
      const where = state.country ? ` touching ${countryName(state.country)}` : '';
      hint.textContent = {
        oil_fields: 'Isolated view: major oil deposits (lakes) + crude oil routes and hubs only.',
        good: `All sources, routes and destinations of ${goods.label(state.good)}${where}.`
      }[state.view] || (state.country
        ? `All resources in ${countryName(state.country)} and the supply chains that touch it.`
        : 'Overview shows all active resources. Resource focuses on one of them. Oil Fields isolates major global deposits and the crude supply chain.');
    }

    // The resource checkboxes only apply to the overview – dim them otherwise
    const panelResources = document.getElementById('panel-resources');
    if (panelResources) {
      const off = state.view !== 'overview';
      panelResources.style.opacity = off ? '0.45' : '1';
      panelResources.style.pointerEvents = off ? 'none' : '';
    }
  }

  /** Chip on the map naming the active resource / country filter, with a reset button. */
  updateViewChip(state, visibleCount) {
    const chip = document.getElementById('map-view-chip');
    const text = document.getElementById('map-view-chip-text');
    if (!chip || !text) return;
    const parts = [];
    if (state.view === 'good') parts.push(`${goods.icon(state.good)} ${goods.label(state.good)}`);
    if (state.country) parts.push(countryName(state.country));
    const show = parts.length > 0;
    chip.classList.toggle('hidden', !show);
    chip.classList.toggle('flex', show);
    if (!show) return;
    text.textContent = visibleCount > 0
      ? parts.join(' · ')
      : `${parts.join(' · ')}: nothing recorded yet`;
  }

  setupApiKeyModal() {
    const modal = document.getElementById('apikey-modal');
    const openBtn = document.getElementById('open-apikey-modal-btn');
    const closeBtn = document.getElementById('close-apikey-btn');
    const cancelBtn = document.getElementById('cancel-apikey-btn');
    const saveBtn = document.getElementById('save-apikey-btn');
    const keyField = document.getElementById('carto-key-field');
    const keyInput = document.getElementById('carto-key-input');
    const activeSourceLabel = document.getElementById('active-tile-source');

    const providerRadios = document.querySelectorAll('input[name="tile-provider"]');

    // Prepopulate current values (prefer default key if present)
    const currentKey = mapController.cartoApiKey || '';
    const currentProvider = mapController.currentProvider;

    if (keyInput) keyInput.value = currentKey;

    providerRadios.forEach(radio => {
      if (radio.value === currentProvider) {
        radio.checked = true;
      }
      radio.addEventListener('change', () => {
        if (radio.value === 'carto') {
          keyField?.classList.remove('hidden');
        } else {
          keyField?.classList.add('hidden');
        }
      });
    });

    if (currentProvider === 'carto') {
      keyField?.classList.remove('hidden');
    }

    const updateLabel = (provider) => {
      if (!activeSourceLabel) return;
      if (provider === 'carto') {
        activeSourceLabel.innerText = 'Karte: CARTO Dark Matter (Aktiv)';
      } else {
        activeSourceLabel.innerText = 'Karte: Esri Dark (ohne Watermark)';
      }
    };
    updateLabel(currentProvider);

    const openModal = () => {
      modal?.classList.remove('hidden');
    };
    const closeModal = () => {
      modal?.classList.add('hidden');
    };

    openBtn?.addEventListener('click', openModal);
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    saveBtn?.addEventListener('click', () => {
      const selectedRadio = document.querySelector('input[name="tile-provider"]:checked');
      const provider = selectedRadio ? selectedRadio.value : 'esri';
      const key = keyInput ? keyInput.value.trim() : '';

      mapController.setTileProvider(provider, key);
      updateLabel(provider);
      closeModal();
    });
  }

  /** Features the current map state + sidebar filters show. */
  visibleFeatures(state = mapState.get()) {
    const scopeIds = state.country ? supplyChain.countryScope(state.country) : null;
    return dataService.getFilteredFeatures({ view: state.view, good: state.good, scopeIds });
  }

  refreshMap() {
    const state = mapState.get();
    const filtered = this.visibleFeatures(state);
    mapController.renderFeatures(filtered);
    this.updateViewChip(state, filtered.length);

    const counter = document.getElementById('active-elements-count');
    if (counter) {
      counter.innerText = `${filtered.length} active`;
    }
  }
}

export const uiController = new UIController();
