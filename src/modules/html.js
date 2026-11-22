/**
 * HTML helpers for rendering dataset values.
 *
 * GeoJSON properties are contributed by the community via pull requests, so
 * every value must be treated as untrusted text before it is placed in HTML.
 */

const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

/**
 * Escape any value for safe use in HTML text and quoted attribute values.
 * null / undefined become an empty string.
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, ch => HTML_ESCAPES[ch]);
}

/**
 * Return the URL only if it is an absolute http(s) link, otherwise ''.
 * Blocks javascript:, data: and other schemes in source links.
 */
export function safeHttpUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(String(value));
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch {
    return '';
  }
}
