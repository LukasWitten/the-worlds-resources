/**
 * Data Service - Handles loading, caching, and filtering of resource GeoJSON datasets.
 */

class DataService {
  constructor() {
    this.datasets = new Map();
    this.activeFilters = {
      resources: new Set(['crude_oil', 'natural_gas', 'lithium']),
      categories: new Set([
        'extraction_site',
        'import_hub',
        'processing_hub',
        'storage_hub',
        'pipeline',
        'rail_corridor',
        'shipping_route'
      ]),
      searchQuery: ''
    };
  }

  /**
   * Loads a GeoJSON file from the data directory
   */
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

  /**
   * Retrieves all loaded features flattened
   */
  getAllFeatures() {
    const all = [];
    for (const dataset of this.datasets.values()) {
      if (dataset.features) {
        all.push(...dataset.features);
      }
    }
    return all;
  }

  /**
   * Returns features that match the active filter criteria
   */
  getFilteredFeatures() {
    const all = this.getAllFeatures();
    const query = this.activeFilters.searchQuery.toLowerCase().trim();

    return all.filter(feature => {
      const p = feature.properties || {};

      // Filter by resource
      if (!this.activeFilters.resources.has(p.resource)) {
        return false;
      }

      // Filter by infrastructure type
      if (!this.activeFilters.categories.has(p.type)) {
        return false;
      }

      // Filter by search query if specified
      if (query) {
        const name = (p.name || '').toLowerCase();
        const summary = (p.summary || '').toLowerCase();
        const operator = (p.operator || '').toLowerCase();
        const matches = name.includes(query) || summary.includes(query) || operator.includes(query);
        if (!matches) return false;
      }

      return true;
    });
  }

  setFilter(type, key, enabled) {
    if (type === 'resources') {
      if (enabled) this.activeFilters.resources.add(key);
      else this.activeFilters.resources.delete(key);
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
