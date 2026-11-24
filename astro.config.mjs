import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { ALTERNATES } from './src/lib/site.js';
import { DATASETS } from './src/modules/datasets.js';

// Reuse the production security headers from vercel.json for `astro preview`, so the Content-Security-Policy is tested locally before deploying.
const vercel = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf-8'));
const securityHeaders = Object.fromEntries(
  vercel.headers.flatMap(rule => rule.headers).map(h => [h.key, h.value])
);

// Date of the latest data update, for the sitemap of the pages built from the data
const dataUpdated = DATASETS
  .map(({ path }) => JSON.parse(readFileSync(new URL(`./public${path}`, import.meta.url), 'utf-8')).metadata?.last_updated)
  .filter(Boolean)
  .sort()
  .at(-1);
const DATA_PAGES = new Set(['/', '/map', '/sources']);

export default defineConfig({
  site: 'https://www.theworldsresources.org',
  // /map, /sources … without trailing slash; Vercel serves map.html as /map (cleanUrls)
  trailingSlash: 'never',
  build: {
    format: 'file'
  },
  integrations: [
    sitemap({
      filter: (page) => !page.endsWith('/404'),
      serialize(item) {
        const path = new URL(item.url).pathname.replace(/\/$/, '') || '/';
        if (DATA_PAGES.has(path) && dataUpdated) item.lastmod = dataUpdated;
        const alternates = ALTERNATES[path];
        if (alternates) {
          item.links = alternates.map(({ lang, path: altPath }) => ({
            lang,
            url: new URL(altPath, 'https://www.theworldsresources.org').href
          }));
        }
        return item;
      }
    })
  ],
  // Only for `astro preview`: the dev server needs inline scripts for hot reloading
  server: ({ command }) => ({
    headers: command === 'preview' ? securityHeaders : {}
  }),
  vite: {
    build: {
      // The CSP allows only scripts from our own origin (script-src 'self'):
      // never inline scripts or assets into the HTML.
      assetsInlineLimit: 0
    }
  }
});
