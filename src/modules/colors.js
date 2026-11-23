/**
 * Shared route colors, used by the map lines, the node borders and the
 * supply-chain timeline in the inspector.
 */
export function getEdgeColor(feature) {
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
