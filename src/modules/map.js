/**
 * Map Module - Leaflet Map setup, dark styling, glowing SVG markers, and animated pipeline routes.
 */

import L from 'leaflet';
import { inspector } from './inspector.js';
import { escapeHtml } from './html.js';

// =========================================================================
// Project CARTO basemap key. It is public by nature (it is sent with every
// tile request), so restrict it to the project domains in the CARTO dashboard.
// =========================================================================
export const DEFAULT_CARTO_API_KEY = 'cb1_5axy_1_4f1f333309a9b1bc4633b172';

class MapController {
  constructor() {
    this.map = null;
    this.tileLayer = null;
    this.layersGroup = null;
    this.activeFeatures = [];

    // A key the visitor saved in the basemap dialog wins over the project default
    this.cartoApiKey = localStorage.getItem('carto_api_key') || DEFAULT_CARTO_API_KEY || '';
    
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

  /**
   * Fixed color order for multi-color node borders.
   * Always the same sequence so the visual language stays consistent.
   */
  static ROUTE_COLOR_ORDER = [
    '#fbbf24', // crude oil pipelines (amber)
    '#10b981', // natural gas pipelines (emerald)
    '#c084fc', // lithium shipping / extraction (purple)
    '#2dd4bf', // other shipping routes (teal)
    '#eab308'  // rail corridors (yellow)
  ];

  getEdgeColor(feature) {
    const p = feature.properties || {};
    if (p.type === 'rail_corridor') return '#eab308';
    if (p.type === 'shipping_route') {
      return p.resource === 'lithium' ? '#c084fc' : '#2dd4bf';
    }
    if (p.type === 'pipeline') {
      return p.resource === 'natural_gas' ? '#10b981' : '#fbbf24';
    }
    return '#fbbf24';
  }

  /**
   * Returns true if two [lon, lat] coordinates are close enough to be considered the same node.
   */
  coordsMatch(a, b, tolerance = 0.08) {
    if (!a || !b) return false;
    return Math.abs(a[0] - b[0]) < tolerance && Math.abs(a[1] - b[1]) < tolerance;
  }

  /**
   * Collect all route colors that touch a given node coordinate.
   * Returns colors in the global fixed order.
   */
  getConnectedRouteColors(nodeCoords, edges) {
    const found = new Set();

    for (const edge of edges) {
      const geom = edge.geometry;
      if (!geom) continue;

      let endpoints = [];
      if (geom.type === 'LineString') {
        endpoints = [geom.coordinates[0], geom.coordinates[geom.coordinates.length - 1]];
      } else if (geom.type === 'MultiLineString') {
        for (const line of geom.coordinates) {
          if (line.length) {
            endpoints.push(line[0], line[line.length - 1]);
          }
        }
      }

      for (const ep of endpoints) {
        if (this.coordsMatch(nodeCoords, ep)) {
          found.add(this.getEdgeColor(edge));
          break;
        }
      }
    }

    // Return in fixed global order
    return MapController.ROUTE_COLOR_ORDER.filter(c => found.has(c));
  }

  /**
   * Build a CSS conic-gradient border from an ordered list of colors.
   */
  buildMultiColorBorder(colors) {
    if (!colors || colors.length === 0) {
      return 'border: 2px solid rgba(255,255,255,0.55);';
    }
    if (colors.length === 1) {
      return `border: 2.5px solid ${colors[0]};`;
    }
    // Equal segments around the circle
    const step = 100 / colors.length;
    const stops = colors.map((c, i) => {
      const start = (i * step).toFixed(1);
      const end = ((i + 1) * step).toFixed(1);
      return `${c} ${start}% ${end}%`;
    }).join(', ');
    return `
      border: 2.5px solid transparent;
      background:
        linear-gradient(#0f172a, #0f172a) padding-box,
        conic-gradient(${stops}) border-box;
    `;
  }

  renderFeatures(features) {
    if (!this.map || !this.layersGroup) return;

    this.layersGroup.clearLayers();
    this.activeFeatures = features;

    // Order: lakes (polygons) → routes (lines) → nodes (points)
    const lakes = features.filter(f => f.geometry && f.geometry.type === 'Polygon');
    const edges = features.filter(f => f.geometry && f.geometry.type.includes('LineString'));
    const nodes = features.filter(f => f.geometry && f.geometry.type === 'Point');

    lakes.forEach(lake => this.renderOilField(lake));
    edges.forEach(edge => this.renderEdge(edge));
    nodes.forEach(node => this.renderNode(node, edges));
  }

  /**
   * Render a major oil field as a semi-transparent "lake".
   * Fill opacity scales slightly with reserves for visual hierarchy.
   */
  renderOilField(feature) {
    const p = feature.properties || {};
    const reserves = Number(p.reserves_billion_bbl) || 20;
    // Soft scale: larger reserves → slightly stronger fill (capped)
    const fillOpacity = Math.min(0.22 + Math.log10(Math.max(reserves, 5)) * 0.06, 0.42);

    const layer = L.geoJSON(feature, {
      style: {
        color: '#f59e0b',
        weight: 1.5,
        opacity: 0.85,
        fillColor: '#f59e0b',
        fillOpacity: fillOpacity,
        className: 'oil-field-lake'
      }
    });

    layer.bindTooltip(`
      <div class="text-xs font-sans">
        <strong class="text-white">${escapeHtml(p.name || 'Oil field')}</strong><br>
        <span class="text-amber-300">${escapeHtml(reserves)} bn bbl</span>
        ${p.country ? `<span class="text-slate-400"> · ${escapeHtml(p.country)}</span>` : ''}<br>
        <span class="text-slate-300">${escapeHtml(p.summary)}</span>
      </div>
    `, {
      sticky: true,
      className: 'glass-tooltip'
    });

    layer.on('click', (e) => {
      if (e.originalEvent) e.originalEvent._layerClicked = true;
      inspector.show(feature);
    });

    this.layersGroup.addLayer(layer);
  }

  focusOilFields() {
    if (!this.map) return;
    // Wide view covering major global oil provinces
    this.map.flyTo([25, 20], 2.2, { duration: 1.6 });
  }

  renderNode(feature, edges = []) {
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

    // Multi-color border from all connected routes (fixed color order)
    const routeColors = this.getConnectedRouteColors(coords, edges);
    const borderStyle = this.buildMultiColorBorder(routeColors);

    const customIcon = L.divIcon({
      className: 'custom-node-icon',
      html: `
        <div class="relative flex items-center justify-center cursor-pointer group" style="width: 36px; height: 36px;">
          <div class="absolute inset-0 rounded-full pulse-marker" style="background-color: ${glowColor};"></div>
          <div class="relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs shadow-lg"
               style="background-color: ${mainColor}; color: #0f172a; ${borderStyle}">
            ${iconSymbol}
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    const marker = L.marker(latLng, { icon: customIcon });

    marker.bindTooltip(`
      <div class="text-xs font-sans">
        <strong class="text-white">${escapeHtml(p.name)}</strong><br>
        <span class="text-slate-300">${escapeHtml(p.capacity || p.summary)}</span>
      </div>
    `, {
      direction: 'top',
      offset: [0, -14],
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

    const color = this.getEdgeColor(feature);
    let className = 'pipeline-glow-oil';
    let weight = 4;

    if (p.type === 'rail_corridor') {
      className = 'rail-glow';
      weight = 3.5;
    } else if (p.type === 'shipping_route') {
      className = p.resource === 'lithium' ? 'shipping-glow-ocean' : 'shipping-glow';
      weight = p.resource === 'lithium' ? 3.5 : 3;
    } else if (p.type === 'pipeline') {
      className = p.resource === 'natural_gas' ? 'pipeline-glow-gas' : 'pipeline-glow-oil';
      weight = 4;
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
        <strong class="text-white">${escapeHtml(p.name)}</strong><br>
        <span class="text-slate-300">${escapeHtml(p.flow_direction || p.summary)}</span>
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
