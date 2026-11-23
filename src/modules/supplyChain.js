/**
 * Supply chain graph: routes reference their start and end node via
 * from_node_id / to_node_id, so all datasets together form a directed graph
 * (oil field → pipeline → export port → tanker route → … → refinery).
 *
 * getChain(id) follows that graph from one feature:
 *  - upstream:   everything the feature receives its resource from
 *  - downstream: everything it delivers to
 * Siblings (e.g. a second refinery fed by the same port) are not part of it.
 */

import { dataService } from './dataService.js';

class SupplyChain {
  constructor() {
    this.builtFrom = null;
  }

  /** (Re)build the adjacency lists when the loaded data has changed. */
  ensureGraph() {
    const features = dataService.getAllFeatures();
    if (this.builtFrom === features.length) return;

    this.byId = new Map();
    this.edgesInto = new Map(); // node id → routes ending there
    this.edgesOutOf = new Map(); // node id → routes starting there

    for (const f of features) {
      const p = f.properties || {};
      if (!p.id) continue;
      this.byId.set(p.id, f);
      if (p.from_node_id && p.to_node_id) {
        push(this.edgesOutOf, p.from_node_id, f);
        push(this.edgesInto, p.to_node_id, f);
      }
    }
    this.builtFrom = features.length;
  }

  /**
   * Returns null if the feature is unknown, otherwise
   * { upstream: Feature[][], selected: Feature, downstream: Feature[][], ids: Set<string> }
   * upstream[0] is the step right before the feature, downstream[0] right after it.
   * Every step alternates between nodes and routes.
   */
  getChain(id) {
    this.ensureGraph();
    const selected = this.byId.get(id);
    if (!selected) return null;

    const p = selected.properties;
    const isRoute = Boolean(p.from_node_id && p.to_node_id);
    const ids = new Set([id]);

    const walk = (startIds, step) => {
      const levels = [];
      let frontier = startIds.map(nid => this.byId.get(nid)).filter(Boolean);
      while (frontier.length) {
        const level = frontier.filter(f => !ids.has(f.properties.id));
        if (!level.length) break;
        level.forEach(f => ids.add(f.properties.id));
        levels.push(level);
        frontier = level.flatMap(step);
      }
      return levels;
    };

    // From a node: routes ending here → their start nodes → routes ending there …
    const prev = (f) => {
      const fp = f.properties;
      if (fp.from_node_id && fp.to_node_id) return [this.byId.get(fp.from_node_id)].filter(Boolean);
      return this.edgesInto.get(fp.id) || [];
    };
    const next = (f) => {
      const fp = f.properties;
      if (fp.from_node_id && fp.to_node_id) return [this.byId.get(fp.to_node_id)].filter(Boolean);
      return this.edgesOutOf.get(fp.id) || [];
    };

    const upstream = walk(
      isRoute ? [p.from_node_id] : (this.edgesInto.get(id) || []).map(e => e.properties.id),
      prev
    );
    const downstream = walk(
      isRoute ? [p.to_node_id] : (this.edgesOutOf.get(id) || []).map(e => e.properties.id),
      next
    );

    return { upstream, selected, downstream, ids };
  }

  /** All features of a chain, from the furthest source to the furthest destination. */
  features(chain) {
    if (!chain) return [];
    return [...[...chain.upstream].reverse().flat(), chain.selected, ...chain.downstream.flat()];
  }

  /** Number of steps (levels) in a chain, including the selected feature. */
  steps(chain) {
    return chain ? chain.upstream.length + chain.downstream.length + 1 : 0;
  }

  /** Countries a chain passes through ("INT" marks international waters and is not counted). */
  countries(chain) {
    const codes = this.features(chain).map(f => f.properties.country).filter(c => c && c !== 'INT');
    return new Set(codes).size;
  }
}

function push(map, key, value) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

export const supplyChain = new SupplyChain();
