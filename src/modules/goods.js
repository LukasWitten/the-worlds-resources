/**
 * Goods catalogue (public/data/reference/goods.json): the single place for
 * labels, colours, icons and HS codes of every good on the map.
 *
 * A good has a stage: raw (crude oil, lithium …), intermediate or final.
 * The resource views use the raw goods; the GeoJSON field "resource" holds a good id.
 */

const FALLBACK_COLOR = '#94a3b8';
const FALLBACK_ICON = '📍';

class GoodsCatalog {
  constructor() {
    this.goods = new Map();
  }

  async load(path) {
    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`Failed to load goods catalogue from ${path} (${response.status})`);
      const data = await response.json();
      this.goods = new Map(Object.entries(data.goods || {}));
    } catch (err) {
      console.error('[Goods] Error loading catalogue:', err);
    }
  }

  has(id) {
    return this.goods.has(id);
  }

  get(id) {
    return this.goods.get(id) || null;
  }

  /** Ids in catalogue order, optionally only one stage ('raw', 'intermediate', 'final'). */
  ids(stage = null) {
    return [...this.goods.entries()]
      .filter(([, good]) => !stage || good.stage === stage)
      .map(([id]) => id);
  }

  label(id) {
    return this.get(id)?.label || id || 'Unknown';
  }

  color(id) {
    return this.get(id)?.style?.color || FALLBACK_COLOR;
  }

  icon(id) {
    return this.get(id)?.style?.icon || FALLBACK_ICON;
  }

  /** Emoji for processing plants of this good (refinery 🏭, gas hub 🔥, cathode plant 🔋). */
  processingIcon(id) {
    const style = this.get(id)?.style;
    return style?.processing_icon || style?.icon || '🏭';
  }

  /** Colour of a route of the given type (pipeline, shipping_route, rail_corridor) carrying this good. */
  routeColor(id, routeType) {
    return this.get(id)?.style?.route_colors?.[routeType] || this.color(id);
  }

  /** Every colour a route of any good can have, in catalogue order (main colours first). */
  routeColorOrder() {
    const main = this.ids().map(id => this.color(id));
    const overrides = this.ids().flatMap(id => Object.values(this.get(id)?.style?.route_colors || {}));
    return [...new Set([...main, ...overrides])];
  }
}

/** "#c084fc" → "rgba(192, 132, 252, 0.5)" */
export function withAlpha(hex, alpha) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return `rgba(148, 163, 184, ${alpha})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export const goods = new GoodsCatalog();
