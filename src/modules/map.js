/**
 * Map Module - Leaflet Map setup, dark styling, glowing SVG markers, and animated pipeline routes.
 */

import { inspector } from './inspector.js';

// =========================================================================
// HIER DEINEN CARTO API KEY EINTRAGEN:
// =========================================================================
export const DEFAULT_CARTO_API_KEY = 'cb1_5axy_1_4f1f333309a9b1bc4633b172';

class MapController {
  constructor() {
    this.map = null;
    this.tileLayer = null;
    this.layersGroup = null;
    this.activeFeatures = [];

    // Prioritize user-provided hardcoded key or saved key
    this.cartoApiKey = DEFAULT_CARTO_API_KEY || localStorage.getItem('carto_api_key') || '';
    
    // Default to CARTO if a key exists; otherwise fallback to Esri
    if (this.cartoApiKey) {
      this.currentProvider = localStorage.getItem('tile_provider') || 'carto';
    } else {
      this.currentProvider = localStorage.getItem('tile_provider') || 'esri';
    }
  }

  init(containerId) {
    if (this.map) return;

    // Centered on Germany for the MVP
    this.map = L.map(containerId, {
      zoomControl: false,
      attributionControl: false,
      minZoom: 2,
      maxZoom: 18
    }).setView([51.1657, 10.4515], 6);

    // Setup Basemap Layer
    this.setupTileLayer();

    // Custom Zoom control at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // Attribution control bottom left
    this.attributionControl = L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(this.map);
    this.updateAttribution();

    this.layersGroup = L.layerGroup().addTo(this.map);

    // Close inspector when clicking on empty map space
    this.map.on('click', (e) => {
      if (!e.originalEvent._layerClicked) {
        inspector.hide();
      }
    });
  }

  setupTileLayer() {
    if (this.tileLayer && this.map) {
      this.map.removeLayer(this.tileLayer);
    }

    const key = this.cartoApiKey || DEFAULT_CARTO_API_KEY;

    if (this.currentProvider === 'carto' && key) {
      // CARTO Dark Matter with API Key using official param "?key=..."
      console.log('[Map] Using CARTO Dark Matter with API Key');
      this.tileLayer = L.tileLayer(
        `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(key)}`,
        {
          maxZoom: 19,
          subdomains: 'abcd'
        }
      );
    } else if (this.currentProvider === 'carto') {
      console.log('[Map] Using CARTO Dark Matter without key');
      this.tileLayer = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          maxZoom: 19,
          subdomains: 'abcd'
        }
      );
    } else {
      // Esri World Dark Gray Canvas: High resolution, dark slate, 100% free, no watermark
      console.log('[Map] Using Esri Dark Canvas');
      this.tileLayer = L.tileLayer(
        'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 16
        }
      );
    }

    if (this.map) {
      this.tileLayer.addTo(this.map);
      this.updateAttribution();
    }
  }

  updateAttribution() {
    if (!this.attributionControl) return;
    this.attributionControl.setPrefix(false);
    if (this.currentProvider === 'carto') {
      this.attributionControl.addAttribution('&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>');
    } else {
      this.attributionControl.addAttribution('&copy; <a href="https://www.esri.com/">Esri</a> &copy; OpenStreetMap contributors');
    }
  }

  setTileProvider(provider, apiKey = '') {
    this.currentProvider = provider || 'carto';
    this.cartoApiKey = apiKey ? apiKey.trim() : (DEFAULT_CARTO_API_KEY || '');

    localStorage.setItem('tile_provider', this.currentProvider);
    if (this.cartoApiKey) {
      localStorage.setItem('carto_api_key', this.cartoApiKey);
    }

    this.setupTileLayer();
  }

  renderFeatures(features) {
    if (!this.map || !this.layersGroup) return;

    this.layersGroup.clearLayers();
    this.activeFeatures = features;

    // First render edges (lines) so they appear beneath nodes (points)
    const edges = features.filter(f => f.geometry && f.geometry.type.includes('LineString'));
    const nodes = features.filter(f => f.geometry && f.geometry.type === 'Point');

    edges.forEach(edge => this.renderEdge(edge));
    nodes.forEach(node => this.renderNode(node));
  }

  renderNode(feature) {
    const coords = feature.geometry.coordinates;
    const p = feature.properties || {};
    const latLng = [coords[1], coords[0]]; // GeoJSON [lon, lat] -> Leaflet [lat, lon]

    let mainColor = '#f59e0b';
    let glowColor = 'rgba(245, 158, 11, 0.45)';
    let iconSymbol = '📍';

    if (p.type === 'extraction_site') {
      mainColor = '#c084fc';
      glowColor = 'rgba(192, 132, 252, 0.55)';
      iconSymbol = '⛏️';
    } else if (p.type === 'import_hub') {
      mainColor = '#38bdf8';
      glowColor = 'rgba(56, 189, 248, 0.5)';
      iconSymbol = '⚓';
    } else if (p.type === 'storage_hub') {
      mainColor = '#10b981';
      glowColor = 'rgba(16, 185, 129, 0.5)';
      iconSymbol = '🏬';
    } else if (p.type === 'processing_hub') {
      if (p.resource === 'natural_gas') {
        mainColor = '#10b981';
        glowColor = 'rgba(16, 185, 129, 0.5)';
        iconSymbol = '🔥';
      } else if (p.resource === 'lithium') {
        mainColor = '#c084fc';
        glowColor = 'rgba(192, 132, 252, 0.55)';
        iconSymbol = '🔋';
      } else {
        mainColor = '#f59e0b';
        glowColor = 'rgba(245, 158, 11, 0.45)';
        iconSymbol = '🏭';
      }
    }

    const customIcon = L.divIcon({
      className: 'custom-node-icon',
      html: `
        <div class="relative flex items-center justify-center cursor-pointer group" style="width: 32px; height: 32px;">
          <div class="absolute inset-0 rounded-full pulse-marker" style="background-color: ${glowColor};"></div>
          <div class="relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-lg border border-white/60" style="background-color: ${mainColor}; color: #0f172a;">
            ${iconSymbol}
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const marker = L.marker(latLng, { icon: customIcon });

    marker.bindTooltip(`
      <div class="text-xs font-sans">
        <strong class="text-white">${p.name}</strong><br>
        <span class="text-slate-300">${p.capacity || p.summary}</span>
      </div>
    `, {
      direction: 'top',
      offset: [0, -12],
      className: 'glass-tooltip'
    });

    marker.on('click', (e) => {
      e.originalEvent._layerClicked = true;
      inspector.show(feature);
      this.map.panTo(latLng, { animate: true });
    });

    this.layersGroup.addLayer(marker);
  }

  renderEdge(feature) {
    const coords = feature.geometry.coordinates;
    const p = feature.properties || {};
    const latLngs = coords.map(c => [c[1], c[0]]);

    let color = '#fbbf24';
    let className = 'pipeline-glow-oil';
    let weight = 4;

    if (p.type === 'rail_corridor') {
      color = '#eab308';
      className = 'rail-glow';
      weight = 3.5;
    } else if (p.type === 'shipping_route') {
      if (p.resource === 'lithium') {
        color = '#c084fc';
        className = 'shipping-glow-ocean';
        weight = 3.5;
      } else {
        color = '#2dd4bf';
        className = 'shipping-glow';
        weight = 3;
      }
    } else if (p.type === 'pipeline') {
      if (p.resource === 'natural_gas') {
        color = '#10b981';
        className = 'pipeline-glow-gas';
        weight = 4;
      } else {
        color = '#fbbf24';
        className = 'pipeline-glow-oil';
        weight = 4;
      }
    }

    const polyline = L.polyline(latLngs, {
      color: color,
      weight: weight,
      opacity: 0.9,
      className: className,
      lineCap: 'round',
      lineJoin: 'round'
    });

    polyline.bindTooltip(`
      <div class="text-xs font-sans">
        <strong class="text-white">${p.name}</strong><br>
        <span class="text-slate-300">${p.flow_direction || p.summary}</span>
      </div>
    `, {
      sticky: true,
      className: 'glass-tooltip'
    });

    polyline.on('click', (e) => {
      e.originalEvent._layerClicked = true;
      inspector.show(feature);
    });

    this.layersGroup.addLayer(polyline);
  }

  focusGermany() {
    if (this.map) {
      this.map.flyTo([51.1657, 10.4515], 6, { duration: 1.5 });
    }
  }

  focusGlobalRoute() {
    if (this.map) {
      this.map.flyTo([20.0, -30.0], 3, { duration: 1.8 });
    }
  }

  invalidateSize() {
    if (this.map) {
      setTimeout(() => this.map.invalidateSize(), 150);
      setTimeout(() => this.map.invalidateSize(), 350);
    }
  }
}

export const mapController = new MapController();
