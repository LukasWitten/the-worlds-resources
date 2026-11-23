/**
 * Inspector Module - Manages the details drawer, scroll isolation, and fullscreen reader mode.
 */

import L from 'leaflet';
import { escapeHtml, safeHttpUrl } from './html.js';
import { supplyChain } from './supplyChain.js';
import { getEdgeColor } from './colors.js';

const TYPE_ICONS = {
  oil_field: '🛢️',
  extraction_site: '⛏️',
  import_hub: '⚓',
  processing_hub: '🏭',
  storage_hub: '🏬',
  transit_point: '🧭',
  rail_corridor: '🚂',
  shipping_route: '🚢'
};

const ROUTE_TYPES = new Set(['pipeline', 'rail_corridor', 'shipping_route']);

/** Icon for a node; for routes a short line in the route's map color (plus 🚢/🚂). */
function chainIcon(feature) {
  const p = feature.properties || {};
  if (!ROUTE_TYPES.has(p.type)) return typeIcon(p);
  const line = `<span class="inline-block w-3.5 h-[3px] rounded-full" style="background:${getEdgeColor(feature)}"></span>`;
  return p.type === 'pipeline' ? line : `${line}<span>${TYPE_ICONS[p.type]}</span>`;
}

function typeIcon(p) {
  if (p.type === 'processing_hub' && p.resource === 'natural_gas') return '🔥';
  if (p.type === 'processing_hub' && p.resource === 'lithium') return '🔋';
  return TYPE_ICONS[p.type] || '📍';
}

class Inspector {
  constructor() {
    this.container = null;
    this.isOpen = false;
    this.isFullscreen = false;
    this.currentFeature = null;
    /** Called with the shown feature, or null when the inspector closes. */
    this.onFeatureChange = null;
    /** Called with the features of the shown supply chain ("Show on map"). */
    this.onShowChain = null;
    this.currentChain = null;
  }

  init(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    // Prevent any scroll or click event inside inspector from zooming or moving the Leaflet map
    if (L.DomEvent) {
      L.DomEvent.disableScrollPropagation(this.container);
      L.DomEvent.disableClickPropagation(this.container);
    }

    // Explicit native event listeners to prevent event bubbling to background canvas
    const stopPropagation = (e) => e.stopPropagation();
    this.container.addEventListener('wheel', stopPropagation, { passive: false });
    this.container.addEventListener('touchmove', stopPropagation, { passive: false });
    this.container.addEventListener('pointerdown', stopPropagation);
    this.container.addEventListener('mousedown', stopPropagation);
    this.container.addEventListener('dblclick', stopPropagation);
  }

  show(feature) {
    if (!this.container || !feature) return;
    this.currentFeature = feature;

    const p = feature.properties || {};
    const aha = p.aha_moment || {};
    const products = p.consumer_products || [];
    const source = p.source || {};
    const sourceUrl = safeHttpUrl(source.url);
    const e = escapeHtml;
    this.currentChain = supplyChain.getChain(p.id);

    const typeBadge = {
      oil_field: '<span class="px-2.5 py-1 text-xs rounded-full bg-amber-950 text-amber-300 border border-amber-700">🛢️ Major Oil Field</span>',
      extraction_site: '<span class="px-2.5 py-1 text-xs rounded-full bg-purple-950 text-purple-400 border border-purple-800">⛏️ Extraction Site</span>',
      import_hub: '<span class="px-2.5 py-1 text-xs rounded-full bg-sky-950 text-sky-400 border border-sky-800">⚓ Import Terminal / Port</span>',
      processing_hub: '<span class="px-2.5 py-1 text-xs rounded-full bg-amber-950 text-amber-400 border border-amber-800">🏭 Refinery / Processing</span>',
      storage_hub: '<span class="px-2.5 py-1 text-xs rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">🏬 Underground Storage</span>',
      transit_point: '<span class="px-2.5 py-1 text-xs rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">🧭 Shipping Approach</span>',
      pipeline: '<span class="px-2.5 py-1 text-xs rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800">⚡ Pipeline Corridor</span>',
      rail_corridor: '<span class="px-2.5 py-1 text-xs rounded-full bg-yellow-950 text-yellow-400 border border-yellow-800">🚂 Rail Freight Corridor</span>',
      shipping_route: '<span class="px-2.5 py-1 text-xs rounded-full bg-teal-950 text-teal-400 border border-teal-800">🚢 Ocean Shipping Route</span>'
    }[p.type] || '<span class="px-2.5 py-1 text-xs rounded-full bg-slate-800 text-slate-300">Infrastructure</span>';

    const resourceBadge = {
      crude_oil: '<span class="text-amber-400 text-xs font-semibold px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/60">🛢️ Crude Oil</span>',
      natural_gas: '<span class="text-emerald-400 text-xs font-semibold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60">🔥 Natural Gas & LNG</span>',
      lithium: '<span class="text-purple-400 text-xs font-semibold px-2 py-0.5 rounded bg-purple-950/60 border border-purple-800/60">🔋 Lithium</span>'
    }[p.resource] || '';

    const productsHtml = products.length > 0 
      ? products.map(prod => `
          <span class="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900/90 text-slate-200 border border-slate-700/70 shadow-sm">
            📦 ${e(prod)}
          </span>
        `).join('')
      : '<span class="text-xs text-slate-500">No specific end products listed.</span>';

    this.container.innerHTML = `
      <!-- Fixed / Sticky Top Header Bar -->
      <div class="sticky top-0 z-20 flex items-center justify-between px-6 py-4 bg-cardbg/95 backdrop-blur-md border-b border-slate-800 shrink-0">
        <div class="flex flex-wrap items-center gap-1.5 min-w-0 [&>span]:whitespace-nowrap">
          ${typeBadge}
          ${resourceBadge}
        </div>
        <div class="flex items-center space-x-1.5">
          <!-- Share / Copy Link Button -->
          <button id="share-feature-btn" class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition flex items-center space-x-1.5 cursor-pointer text-xs" title="Copy a link to this place">
            <span id="share-feature-icon" class="text-base">🔗</span>
            <span id="share-feature-label" class="font-medium ${this.isFullscreen ? 'hidden sm:inline' : 'hidden'}">Share</span>
          </button>
          <!-- Toggle Fullscreen Button -->
          <button id="toggle-fullscreen-btn" class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition flex items-center space-x-1.5 cursor-pointer text-xs" title="${this.isFullscreen ? 'Reduce to sidebar' : 'Expand to fullscreen'}">
            <span class="text-base">${this.isFullscreen ? '🗗' : '⛶'}</span>
            <span class="font-medium ${this.isFullscreen ? 'hidden sm:inline' : 'hidden'}">${this.isFullscreen ? 'Sidebar' : 'Fullscreen'}</span>
          </button>
          <!-- Close Button -->
          <button id="close-inspector-btn" class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition cursor-pointer" title="Close" aria-label="Close">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Scrollable Body with Independent Isolated Scroll (Endless Downward Scrolling) -->
      <div class="flex-grow overflow-y-auto overscroll-contain p-6 space-y-6">
        <div class="${this.isFullscreen ? 'max-w-4xl mx-auto' : 'w-full'} space-y-6">
          
          <!-- Facility / Route Heading -->
          <div>
            <h2 class="${this.isFullscreen ? 'text-3xl sm:text-4xl' : 'text-2xl'} font-extrabold text-white leading-tight mb-2">
              ${e(p.name || 'Unnamed feature')}
            </h2>
            <p class="${this.isFullscreen ? 'text-base' : 'text-sm'} text-slate-300 leading-relaxed">
              ${e(p.summary)}
            </p>
          </div>

          <!-- Key Metrics Grid -->
          <div class="grid ${this.isFullscreen ? 'grid-cols-2 sm:grid-cols-4 gap-4' : 'grid-cols-2 gap-3'} text-xs">
            <div class="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
              <span class="text-slate-500 block mb-1">Operator / Coordination</span>
              <span class="font-semibold text-slate-200 text-sm">${e(p.operator || 'N/A')}</span>
            </div>
            <div class="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
              <span class="text-slate-500 block mb-1">${p.reserves_billion_bbl ? 'Reserves' : 'Capacity / Dimension'}</span>
              <span class="font-semibold text-slate-200 text-sm">${e(p.reserves_billion_bbl ? `~${p.reserves_billion_bbl} bn bbl` : (p.capacity || (p.length_km ? `${p.length_km} km` : 'N/A')))}</span>
            </div>
            <div class="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
              <span class="text-slate-500 block mb-1">Status</span>
              <span class="font-semibold text-emerald-400 text-sm capitalize">${p.status === 'operational' ? 'Operational' : 'Under development / Active'}</span>
            </div>
            <div class="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
              <span class="text-slate-500 block mb-1">Supply-chain stage</span>
              <span class="font-semibold text-indigo-300 text-sm capitalize">${e(p.supply_chain_stage || 'Transport')}</span>
            </div>
          </div>

          <!-- The Consumer "Aha-Moment" (Prominent Visual Feature) -->
          ${aha.title ? `
            <div class="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/70 via-purple-950/40 to-slate-900 border border-indigo-500/40 shadow-xl">
              <div class="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2.5">
                <span class="text-base">💡</span>
                <span>The Consumer Aha-Moment</span>
              </div>
              <h3 class="${this.isFullscreen ? 'text-xl' : 'text-base'} font-bold text-white mb-2">${e(aha.title)}</h3>
              <p class="${this.isFullscreen ? 'text-sm' : 'text-xs'} text-slate-200 leading-relaxed mb-3">${e(aha.explanation)}</p>
              <div class="pt-3 border-t border-indigo-900/60 text-xs text-indigo-300 font-medium flex items-start space-x-2">
                <span class="text-sm">🎯</span>
                <span><strong>Everyday impact:</strong> ${e(aha.everyday_impact)}</span>
              </div>
            </div>
          ` : ''}

          ${this.renderChain(this.currentChain)}

          <!-- Detailed Extended Description (Can be arbitrarily long) -->
          <div class="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400">Technical Documentation & Geopolitics</h4>
            <div class="${this.isFullscreen ? 'text-base' : 'text-xs sm:text-sm'} text-slate-300 leading-relaxed space-y-3">
              <p>${e(p.description || p.summary || 'No further detailed description available.')}</p>
              ${p.flow_direction ? `
                <div class="pt-2 text-xs text-slate-400">
                  <strong class="text-slate-300">Flow & transport corridor:</strong> ${e(p.flow_direction)}
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Consumer End-Products Tags -->
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Linked Consumer Products</h4>
            <div class="flex flex-wrap gap-2">
              ${productsHtml}
            </div>
          </div>

          <!-- Official Data Source Footer -->
          <div class="pt-6 border-t border-slate-800 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-6">
            <span>Data source: <strong>${e(source.name || 'Public official data')}</strong> (${e(source.year || '2025/2026')})</span>
            ${sourceUrl ? `
              <a href="${e(sourceUrl)}" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:text-indigo-300 underline font-medium flex items-center space-x-1">
                <span>Verify official dataset</span>
                <span>↗</span>
              </a>
            ` : ''}
          </div>

        </div>
      </div>
    `;

    // Bind event listeners
    document.getElementById('close-inspector-btn')?.addEventListener('click', () => {
      this.hide();
    });

    document.getElementById('share-feature-btn')?.addEventListener('click', () => {
      this.shareCurrentFeature();
    });

    document.getElementById('show-chain-btn')?.addEventListener('click', () => {
      this.onShowChain?.(this.chainFeatures());
    });

    document.getElementById('toggle-fullscreen-btn')?.addEventListener('click', () => {
      this.toggleFullscreen();
    });

    this.container.classList.remove('translate-x-full');
    this.container.classList.add('translate-x-0');
    this.isOpen = true;
    this.onFeatureChange?.(feature);
  }

  /** All features of the current supply chain, including the shown one. */
  chainFeatures(chain = this.currentChain) {
    return supplyChain.features(chain);
  }

  /**
   * Vertical timeline: where the resource comes from, this feature, where it goes.
   * Each entry links to #map/<id>, so the browser's back button walks the chain back.
   */
  renderChain(chain) {
    const e = escapeHtml;
    if (!chain) return '';
    const hasLinks = chain.upstream.length > 0 || chain.downstream.length > 0;
    if (!hasLinks) {
      return `
        <div class="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
          <span class="font-bold uppercase tracking-wider text-slate-400">Supply chain</span>
          <p class="mt-1.5">No connected routes are recorded for this place yet.</p>
        </div>`;
    }

    const chip = (f) => {
      const fp = f.properties;
      return `
        <a href="#map/${encodeURIComponent(fp.id)}" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-slate-800/80 text-slate-200 border border-slate-700/70 hover:border-indigo-400 hover:text-white transition" title="${e(fp.summary || fp.name)}">
          <span aria-hidden="true" class="inline-flex items-center gap-1">${chainIcon(f)}</span><span>${e(fp.name)}</span>
        </a>`;
    };

    const row = (level, kind) => `
      <li class="relative pl-6">
        <span class="absolute left-0 top-2 w-2.5 h-2.5 rounded-full ${kind === 'up' ? 'bg-sky-400' : 'bg-amber-400'}"></span>
        <div class="flex flex-wrap gap-1.5">${level.map(chip).join('')}</div>
      </li>`;

    const p = chain.selected.properties;
    const steps = supplyChain.steps(chain);
    const countries = supplyChain.countries(chain);

    return `
      <div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400">Supply chain</h4>
            <p class="text-xs text-slate-500 mt-1">${steps} steps${countries > 1 ? ` · ${countries} countries` : ''}</p>
          </div>
          <button id="show-chain-btn" class="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600/80 hover:bg-indigo-500 text-white transition cursor-pointer">🗺️ Show on map</button>
        </div>
        <ol class="relative space-y-3 before:absolute before:left-[4px] before:top-2 before:bottom-2 before:w-px before:bg-slate-700">
          ${chain.upstream.length ? `<li class="pl-6 text-[11px] uppercase tracking-wider text-sky-400/80 font-semibold">Where it comes from</li>` : ''}
          ${[...chain.upstream].reverse().map(level => row(level, 'up')).join('')}
          <li class="relative pl-6">
            <span class="absolute -left-[3px] top-1 w-4 h-4 rounded-full bg-indigo-500 ring-4 ring-indigo-500/25"></span>
            <span class="block text-[11px] uppercase tracking-wider text-indigo-300 font-semibold mb-1">You are here</span>
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-950 text-indigo-200 border border-indigo-500/60">
              <span aria-hidden="true" class="inline-flex items-center gap-1">${chainIcon(chain.selected)}</span><span>${e(p.name)}</span>
            </div>
          </li>
          ${chain.downstream.length ? `<li class="pl-6 text-[11px] uppercase tracking-wider text-amber-400/80 font-semibold">Where it goes</li>` : ''}
          ${chain.downstream.map(level => row(level, 'down')).join('')}
        </ol>
      </div>`;
  }

  /** Link that opens the map directly on the current feature. */
  getShareUrl(feature = this.currentFeature) {
    const id = feature?.properties?.id;
    const base = `${window.location.origin}${window.location.pathname}`;
    return id ? `${base}#map/${encodeURIComponent(id)}` : `${base}#map`;
  }

  async shareCurrentFeature() {
    const url = this.getShareUrl();
    const label = document.getElementById('share-feature-label');
    const icon = document.getElementById('share-feature-icon');
    const button = document.getElementById('share-feature-btn');
    try {
      await navigator.clipboard.writeText(url);
      if (icon) icon.textContent = '✅';
      if (label) label.textContent = 'Link copied';
      button?.setAttribute('title', 'Link copied');
      setTimeout(() => {
        if (icon) icon.textContent = '🔗';
        if (label) label.textContent = 'Share';
        button?.setAttribute('title', 'Copy a link to this place');
      }, 2000);
    } catch {
      // Clipboard not available (e.g. insecure context) – let the user copy manually
      window.prompt('Copy this link:', url);
    }
  }

  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;

    if (this.isFullscreen) {
      this.container.classList.remove('sm:w-96');
      this.container.classList.add('sm:w-full', 'w-full');
    } else {
      this.container.classList.remove('sm:w-full');
      this.container.classList.add('sm:w-96');
    }

    // Re-render current feature with adapted typography and layout
    if (this.currentFeature) {
      this.show(this.currentFeature);
    }
  }

  hide() {
    if (!this.container) return;
    this.container.classList.remove('translate-x-0');
    this.container.classList.add('translate-x-full');
    const wasOpen = this.isOpen;
    this.isOpen = false;
    if (wasOpen) this.onFeatureChange?.(null);
  }
}

export const inspector = new Inspector();
