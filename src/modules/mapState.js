/**
 * Central map state, mirrored in the URL so every view can be linked.
 *
 * The state is a set of dimensions; the view only decides how they are shown:
 *   view       'overview' | 'oil_fields' | 'good'   (later: 'trade', 'product', 'profile')
 *   good       good id from the goods catalogue (view 'good')
 *   country    ISO 3166-1 alpha-2 code, e.g. 'CL'
 *   direction  'export' | 'import' | 'upstream' | 'downstream'   (reserved for later views)
 *   depth      1..3                                              (reserved for later views)
 *   year       e.g. 2024                                         (reserved for later views)
 *   feature    id of the place or route open in the inspector
 *
 * URL: #map[/<feature-id>][?view=good&good=lithium&country=CL]
 * Old links (#map, #map/<feature-id>) keep working and open the overview.
 */

export const DEFAULT_STATE = Object.freeze({
  view: 'overview',
  good: null,
  country: null,
  direction: null,
  depth: null,
  year: null,
  feature: null
});

/** Query parameters in the order they appear in the URL. */
const PARAMS = ['view', 'good', 'country', 'direction', 'depth', 'year'];
const NUMERIC = new Set(['depth', 'year']);

/** Parse "#map/<id>?a=b" → state, or null if the hash is not a map URL. */
export function parseMapHash(hash) {
  const raw = (hash || '').replace(/^#/, '');
  const [path, query = ''] = raw.split('?');
  const [section, rawId] = path.split('/');
  if (section !== 'map') return null;

  const state = { ...DEFAULT_STATE };
  if (rawId) state.feature = safeDecode(rawId);
  const params = new URLSearchParams(query);
  for (const key of PARAMS) {
    const value = params.get(key);
    if (value === null || value === '') continue;
    state[key] = NUMERIC.has(key) ? Number(value) : value;
  }
  if (state.country) state.country = state.country.toUpperCase();
  return state;
}

/** State → "#map/<id>?view=…" (default values are left out, so plain #map stays plain). */
export function buildMapHash(state) {
  const params = new URLSearchParams();
  for (const key of PARAMS) {
    const value = state[key];
    if (value === null || value === undefined || value === DEFAULT_STATE[key]) continue;
    params.set(key, String(value));
  }
  const query = params.toString();
  const feature = state.feature ? `/${encodeURIComponent(state.feature)}` : '';
  return `#map${feature}${query ? `?${query}` : ''}`;
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

class MapState {
  constructor() {
    this.state = { ...DEFAULT_STATE };
    this.listeners = new Set();
    /** Replaced by the app once the data is loaded: drops unknown goods, countries and features. */
    this.normalize = (state) => state;
  }

  get() {
    return { ...this.state };
  }

  /** fn(state, changedKeys) is called after every change; returns an unsubscribe function. */
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /**
   * Change some dimensions.
   * history: 'push' (new entry, back button returns), 'replace' (same entry) or 'none' (URL untouched).
   * Returns the list of keys that actually changed.
   */
  set(patch, { history = 'push' } = {}) {
    const next = this.normalize({ ...this.state, ...patch });
    const changed = Object.keys(DEFAULT_STATE).filter(key => next[key] !== this.state[key]);
    if (!changed.length) {
      if (history !== 'none') this.writeUrl('replace'); // keep a normalized URL
      return changed;
    }
    this.state = next;
    if (history !== 'none') this.writeUrl(history);
    for (const fn of this.listeners) fn(this.get(), changed);
    return changed;
  }

  /** Take over the state from a map URL (all dimensions not in the URL fall back to their defaults). */
  applyHash(hash) {
    const parsed = parseMapHash(hash);
    if (!parsed) return [];
    const changed = this.set(parsed, { history: 'none' });
    this.writeUrl('replace'); // e.g. an unknown good is removed from the address bar
    return changed;
  }

  /** Link to the current state with some dimensions changed (for <a href>). */
  href(patch = {}) {
    return buildMapHash(this.normalize({ ...this.state, ...patch }));
  }

  /** Absolute URL of the current state, for sharing. */
  shareUrl(patch = {}) {
    return `${window.location.origin}${window.location.pathname}${this.href(patch)}`;
  }

  writeUrl(mode) {
    // Only while the map section is open; other sections own the hash themselves
    if (!window.location.hash.startsWith('#map')) return;
    const desired = buildMapHash(this.state);
    if (window.location.hash === desired) return;
    if (mode === 'push') history.pushState(null, '', desired);
    else history.replaceState(null, '', desired);
  }
}

export const mapState = new MapState();
