/**
 * Data Service - Handles loading, caching, and filtering of resource GeoJSON datasets.
 *
 * viewMode:
 *  - 'overview'   → normal multi-resource map
 *  - 'oil_fields' → isolated oil view (field lakes + crude oil chain only)
 */

class DataService {
  constructor() {
    this.datasets = new Map();
    this.viewMode = 'overview';
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

  setViewMode(mode) {
    this.viewMode = mode || 'overview';
  }

  getViewMode() {
    return this.viewMode;
  }

  /**
   * Returns features that match the active view mode + filter criteria.
   */
  getFilteredFeatures() {
    const all = this.getAllFeatures();
    const query = this.activeFilters.searchQuery.toLowerCase().trim();

    return all.filter(feature => {
      const p = feature.properties || {};

      // --- Isolated oil-fields mode ---
      if (this.viewMode === 'oil_fields') {
        // Show major oil-field polygons always (unless search excludes them)
        // Plus the full crude_oil infrastructure chain (nodes + routes)
        const isOilField = p.type === 'oil_field';
        const isCrudeChain = p.resource === 'crude_oil';
        if (!isOilField && !isCrudeChain) return false;
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
