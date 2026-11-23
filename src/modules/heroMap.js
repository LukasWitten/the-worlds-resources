/**
 * Homepage hero: a live, non-interactive map that shows the real data and
 * highlights one featured supply chain at a time.
 */

import L from 'leaflet';
import { mapController } from './map.js';
import { dataService } from './dataService.js';
import { supplyChain } from './supplyChain.js';
import { getEdgeColor } from './colors.js';
import { escapeHtml } from './html.js';

/** Chains shown on the homepage, by the id of the feature they end at. */
export const FEATURED_CHAINS = [
  { id: 'refinery-rheinland', title: 'Jet fuel for Frankfurt Airport' },
  { id: 'processing-schwarzheide', title: 'Battery materials for electric cars' },
  { id: 'refinery-bayernoil', title: 'Diesel and petrol for Bavaria' }
];

const RESOURCE_COLORS = { crude_oil: '#fbbf24', natural_gas: '#10b981', lithium: '#c084fc' };
const CYCLE_MS = 8000;

class HeroMap {
  constructor() {
    this.map = null;
    this.layers = new Map(); // id → { layer, kind }
    this.index = 0;
    this.timer = null;
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }

  init(containerId) {
    this.el = document.getElementById(containerId);
    if (!this.el || this.map) return;

    this.map = L.map(this.el, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      touchZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      zoomSnap: 0.25
    }).setView([40, 0], 3);

    mapController.createTileLayer().addTo(this.map);
    L.control.attribution({ position: 'topright', prefix: false })
      .addAttribution(mapController.attributionHtml())
      .addTo(this.map);

    // The home section can be hidden at start (deep link to #map): refit once it gets a size
    if ('ResizeObserver' in window) {
      new ResizeObserver(() => {
        if (!this.hasSize()) return;
        this.map.invalidateSize(false);
        this.focus(false);
      }).observe(this.el);
    }

    document.getElementById('hero-chain-dots')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-chain-index]');
      if (!btn) return;
      this.show(Number(btn.dataset.chainIndex));
      this.restartCycle();
    });
  }

  /** Draw all datasets once they are loaded. */
  render() {
    if (!this.map) return;
    for (const f of dataService.getAllFeatures()) {
      const p = f.properties || {};
      const type = f.geometry?.type;
      let layer;
      let kind;
      if (type === 'Polygon') {
        kind = 'area';
        layer = L.geoJSON(f, { style: { color: '#f59e0b', weight: 1, fillColor: '#f59e0b' } });
      } else if (type?.includes('LineString')) {
        kind = 'line';
        layer = L.geoJSON(f, {
          style: { color: getEdgeColor(f), lineCap: 'round', lineJoin: 'round', className: 'hero-route' }
        });
      } else if (type === 'Point') {
        kind = 'node';
        const [lon, lat] = f.geometry.coordinates;
        layer = L.circleMarker([lat, lon], {
          radius: 4,
          color: RESOURCE_COLORS[p.resource] || '#94a3b8',
          weight: 2,
          fillColor: '#0b0f19'
        });
      } else {
        continue;
      }
      layer.addTo(this.map);
      this.layers.set(p.id, { layer, kind });
    }
    this.show(0, false);
    this.restartCycle();
  }

  show(index, animate = true) {
    const featured = FEATURED_CHAINS[index];
    const chain = featured && supplyChain.getChain(featured.id);
    if (!chain) return;
    this.index = index;
    this.chain = chain;

    for (const [id, { layer, kind }] of this.layers) {
      const on = chain.ids.has(id);
      if (kind === 'line') layer.setStyle({ opacity: on ? 1 : 0.12, weight: on ? 3.5 : 1.5 });
      else if (kind === 'area') layer.setStyle({ opacity: on ? 0.9 : 0.15, fillOpacity: on ? 0.35 : 0.05 });
      else layer.setStyle({ opacity: on ? 1 : 0.2, fillOpacity: on ? 1 : 0.2, radius: on ? 5.5 : 3 });
      if (on && layer.bringToFront) layer.bringToFront();
    }

    this.updateCaption(featured, chain);
    this.focus(animate);
  }

  focus(animate = true) {
    if (!this.chain || !this.hasSize()) return;
    const bounds = L.geoJSON({ type: 'FeatureCollection', features: supplyChain.features(this.chain) }).getBounds();
    if (!bounds.isValid()) return;
    const width = this.el.clientWidth;
    // On wide screens the headline covers the left part of the map
    const wide = width >= 1024;
    const options = {
      paddingTopLeft: [wide ? Math.round(width * 0.42) : 24, wide ? 48 : 24],
      paddingBottomRight: [wide ? 96 : 24, wide ? 110 : 56],
      maxZoom: 6
    };
    if (animate && !this.reducedMotion) this.map.flyToBounds(bounds, { ...options, duration: 1.8 });
    else this.map.fitBounds(bounds, options);
  }

  updateCaption(featured, chain) {
    const caption = document.getElementById('hero-chain-caption');
    if (caption) {
      const steps = supplyChain.steps(chain);
      const countries = supplyChain.countries(chain);
      caption.innerHTML = `
        <span class="block text-[11px] uppercase tracking-wider text-slate-400">Now showing</span>
        <a href="#map/${encodeURIComponent(featured.id)}" class="text-sm font-medium text-white hover:text-amber-200 transition">${escapeHtml(featured.title)} →</a>
        <span class="block text-xs text-slate-400">${steps} steps · ${countries} ${countries === 1 ? 'country' : 'countries'}</span>`;
    }
    document.querySelectorAll('#hero-chain-dots [data-chain-index]').forEach((dot) => {
      const active = Number(dot.dataset.chainIndex) === this.index;
      dot.classList.toggle('bg-white', active);
      dot.classList.toggle('bg-slate-600', !active);
      dot.setAttribute('aria-pressed', String(active));
    });
  }

  restartCycle() {
    clearInterval(this.timer);
    if (this.reducedMotion) return;
    this.timer = setInterval(() => {
      // Only move while the homepage is actually visible
      if (document.hidden || !this.el.offsetParent) return;
      this.show((this.index + 1) % FEATURED_CHAINS.length);
    }, CYCLE_MS);
  }

  hasSize() {
    return Boolean(this.el && this.el.clientWidth > 0 && this.el.clientHeight > 0);
  }
}

export const heroMap = new HeroMap();
