/**
 * Runs on every page: mobile menu and (on the live site only) page-view statistics.
 */

import { inject as injectAnalytics } from '@vercel/analytics';

// Cookieless page-view statistics (Vercel Web Analytics), only on the live site:
// local development and preview deployments are not counted.
const PRODUCTION_HOSTS = new Set(['www.theworldsresources.org', 'theworldsresources.org']);
if (PRODUCTION_HOSTS.has(window.location.hostname)) {
  injectAnalytics({ mode: 'production' });
}

const menuButton = document.getElementById('mobile-menu-btn');
const menu = document.getElementById('mobile-menu');
menuButton?.addEventListener('click', () => {
  const open = menu.classList.toggle('hidden') === false;
  menuButton.setAttribute('aria-expanded', String(open));
});
