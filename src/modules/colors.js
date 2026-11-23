/**
 * Shared route colors, used by the map lines, the node borders and the
 * supply-chain timeline in the inspector. They come from the goods catalogue;
 * rail corridors keep one transport colour for every good.
 */
import { goods } from './goods.js';

export const RAIL_COLOR = '#eab308';

export function getEdgeColor(feature) {
  const p = feature.properties || {};
  if (p.type === 'rail_corridor') return RAIL_COLOR;
  return goods.routeColor(p.resource, p.type);
}

/** Fixed order of all route colours, so multi-colour node borders always look the same. */
export function routeColorOrder() {
  return [...goods.routeColorOrder(), RAIL_COLOR];
}
