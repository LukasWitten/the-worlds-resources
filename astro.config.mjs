import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';

// Reuse the production security headers from vercel.json for `astro preview`, so the Content-Security-Policy is tested locally before deploying.
const vercel = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf-8'));
const securityHeaders = Object.fromEntries(
  vercel.headers.flatMap(rule => rule.headers).map(h => [h.key, h.value])
);

export default defineConfig({
  site: 'https://www.theworldsresources.org',
  // /map, /sources … without trailing slash; Vercel serves map.html as /map (cleanUrls)
  trailingSlash: 'never',
  build: {
    format: 'file'
  },
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
