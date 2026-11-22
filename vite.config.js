import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// Reuse the production security headers from vercel.json for `npm run preview`,
// so the Content-Security-Policy can be tested locally before deploying.
const vercel = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf-8'));
const previewHeaders = Object.fromEntries(
  vercel.headers.flatMap(rule => rule.headers).map(h => [h.key, h.value])
);

export default defineConfig({
  preview: {
    headers: previewHeaders
  }
});
