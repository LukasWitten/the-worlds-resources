/**
 * UI Module - Handles top navigation, sidebar toggles, search, filters, and modals.
 */

import { mapController } from './map.js';
import { dataService } from './dataService.js';

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

    document.querySelectorAll('[data-section-target]').forEach(btn => {
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

    // Persist section in the URL so reload / share keeps the same view (#map, #sources, …)
    const desiredHash = `#${sectionId}`;
    if (window.location.hash !== desiredHash) {
      history.replaceState(null, '', desiredHash);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    const mapSection = document.getElementById('section-map');

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
      if (mapSection) {
        mapSection.classList.remove('h-screen');
        mapSection.classList.add('h-[calc(100vh-4rem)]');
      }
    } else {
      // Hide Navbar
      navbar?.classList.add('-translate-y-full', '-mb-16', 'opacity-0', 'pointer-events-none');
      toggleBtn?.classList.remove('top-16');
      toggleBtn?.classList.add('top-0');
      if (toggleIcon) toggleIcon.innerText = '▼';
      if (mapSection) {
        mapSection.classList.remove('h-[calc(100vh-4rem)]');
        mapSection.classList.add('h-screen');
      }
    }

    mapController.invalidateSize();
  }

  setupFilters() {
    const filterInputs = document.querySelectorAll('[data-filter-type]');
    filterInputs.forEach(input => {
      input.addEventListener('change', () => {
        const type = input.getAttribute('data-filter-type');
        const key = input.getAttribute('data-filter-key');
        dataService.setFilter(type, key, input.checked);
        this.refreshMap();
      });
    });
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

  setupViewModeButtons() {
    const btnOverview = document.getElementById('btn-view-overview');
    const btnOil = document.getElementById('btn-view-oil-fields');
    const hint = document.getElementById('view-mode-hint');
    const panelResources = document.getElementById('panel-resources');

    const setActiveStyles = (mode) => {
      const active = 'px-2.5 py-2 rounded-lg bg-indigo-950/90 text-[11px] font-semibold text-indigo-200 border border-indigo-600/60 transition cursor-pointer';
      const idle = 'px-2.5 py-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 border border-slate-700 transition cursor-pointer';
      if (btnOverview) btnOverview.className = mode === 'overview' ? active : idle;
      if (btnOil) btnOil.className = mode === 'oil_fields' ? active : idle;
    };

    const applyMode = (mode) => {
      dataService.setViewMode(mode);
      setActiveStyles(mode);

      if (hint) {
        hint.textContent = mode === 'oil_fields'
          ? 'Isolated view: major oil deposits (lakes) + crude oil routes and hubs only.'
          : 'Overview shows all active resources. Oil Fields isolates major global deposits and the crude supply chain.';
      }

      // In isolated oil mode, resource toggles are less relevant – dim the panel slightly
      if (panelResources) {
        panelResources.style.opacity = mode === 'oil_fields' ? '0.45' : '1';
        panelResources.style.pointerEvents = mode === 'oil_fields' ? 'none' : '';
      }

      this.refreshMap();

      if (mode === 'oil_fields') {
        mapController.focusOilFields();
      }
    };

    btnOverview?.addEventListener('click', () => applyMode('overview'));
    btnOil?.addEventListener('click', () => applyMode('oil_fields'));
    setActiveStyles(dataService.getViewMode());
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

  refreshMap() {
    const filtered = dataService.getFilteredFeatures();
    mapController.renderFeatures(filtered);

    const counter = document.getElementById('active-elements-count');
    if (counter) {
      counter.innerText = `${filtered.length} active`;
    }
  }
}

export const uiController = new UIController();
