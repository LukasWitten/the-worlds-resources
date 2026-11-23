/**
 * Data Service - Handles loading, caching, and filtering of resource GeoJSON datasets.
 *
 * Which features are shown depends on the map state (see mapState.js):
 *  - view 'overview'   → all resources, minus the ones switched off in the sidebar
 *  - view 'good'       → one good (resource) with all its sources, routes and destinations
 *  - view 'oil_fields' → isolated oil view (field lakes + crude oil chain only)
 *  - country           → only what lies in that country or belongs to a supply chain touching it
 */

class DataService {
  constructor() {
    this.datasets = new Map();
    this.activeFilters = {
      // Goods switched off in the overview; everything else is shown, so new goods appear by default
      hiddenResources: new Set(),
      categories: new Set([
        'extraction_site',
        'import_hub',
        'processing_hub',
        'storage_hub',
        'transit_point',
        'pipeline',
        'rail_corridor',
        'shipping_route',
        'oil_field'
      ]),
      searchQuery: ''
    };
  }

  async loadDataset(id, path) {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load dataset from ${path} (${response.status})`);
      }
      const data = await response.json();
      this.datasets.set(id, data);
      return data;
    } catch (err) {
      console.error(`[DataService] Error loading dataset ${id}:`, err);
      return null;
    }
  }

  getAllFeatures() {
    const all = [];
    for (const dataset of this.datasets.values()) {
      if (dataset.features) {
        all.push(...dataset.features);
      }
    }
    return all;
  }

  /** Country codes (ISO alpha-2) that occur in the data; "INT" (international waters) is left out. */
  getCountries() {
    const codes = this.getAllFeatures().map(f => f.properties?.country).filter(c => c && c !== 'INT');
    return [...new Set(codes)];
  }

  /**
   * Returns the features that match the map state + sidebar filters.
   * view, good: from the map state. scopeIds: Set of feature ids to limit to (country filter) or null.
   */
  getFilteredFeatures({ view = 'overview', good = null, scopeIds = null } = {}) {
    const all = this.getAllFeatures();
    const query = this.activeFilters.searchQuery.toLowerCase().trim();

    return all.filter(feature => {
      const p = feature.properties || {};

      if (scopeIds && !scopeIds.has(p.id)) return false;

      // --- Isolated oil-fields mode ---
      if (view === 'oil_fields') {
        // Show major oil-field polygons always (unless search excludes them)
        // Plus the full crude_oil infrastructure chain (nodes + routes)
        const isOilField = p.type === 'oil_field';
        const isCrudeChain = p.resource === 'crude_oil';
        if (!isOilField && !isCrudeChain) return false;
      } else if (view === 'good') {
        // One good: everything that carries it, still respecting the layer toggles
        if (p.resource !== good) return false;
        if (!this.activeFilters.categories.has(p.type)) return false;
      } else {
        // Overview: respect resource + category toggles
        if (this.activeFilters.hiddenResources.has(p.resource)) return false;
        if (!this.activeFilters.categories.has(p.type)) return false;
      }

      // Search: name, country, region, summary, operator, resource
      if (query) {
        const haystack = [
          p.name,
          p.country,
          p.region,
          p.summary,
          p.operator,
          p.resource,
          p.type,
          p.id
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }

  setFilter(type, key, enabled) {
    if (type === 'resources') {
      if (enabled) this.activeFilters.hiddenResources.delete(key);
      else this.activeFilters.hiddenResources.add(key);
    } else if (type === 'categories') {
      if (enabled) this.activeFilters.categories.add(key);
      else this.activeFilters.categories.delete(key);
    }
  }

  setSearchQuery(query) {
    this.activeFilters.searchQuery = query || '';
  }

  getFeatureById(id) {
    const all = this.getAllFeatures();
    return all.find(f => f.properties && f.properties.id === id) || null;
  }
}

export const dataService = new DataService();
