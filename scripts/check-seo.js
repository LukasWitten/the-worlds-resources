#!/usr/bin/env node
/**
 * SEO checks on the built site (dist/), without a browser and without JavaScript:
 * what a crawler gets is exactly what these checks read.
 *
 *  - every page: title, description, canonical, one <h1>, lang, readable text in <main>
 *  - no inline scripts (the CSP only allows script-src 'self'); JSON-LD parses
 *  - internal links and images point to files that exist
 *  - sitemap lists every indexable page (and nothing else), robots.txt and llms.txt
 *
 * Usage: npm run build && npm run check:seo
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
const SITE = 'https://www.theworldsresources.org';
const errors = [];
const warnings = [];
const error = (where, message) => errors.push(`${where}: ${message}`);
const warn = (where, message) => warnings.push(`${where}: ${message}`);

if (!existsSync(DIST)) {
  console.error('dist/ not found – run `npm run build` first.');
  process.exit(1);
}

function listHtml(dir) {
  return readdirSync(dir).flatMap(name => {
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) return name === '_astro' || name === 'data' ? [] : listHtml(file);
    return name.endsWith('.html') ? [file] : [];
  });
}

/** dist/map.html → /map, dist/index.html → /, dist/de/impressum.html → /de/impressum */
const urlPath = (file) => '/' + path.relative(DIST, file).replace(/\\/g, '/').replace(/(index)?\.html$/, '').replace(/\/$/, '');

/** Does a site path (/map, /favicon.svg, /data/…) resolve to a built file? */
function resolves(sitePath) {
  const clean = decodeURIComponent(sitePath.split(/[?#]/)[0]).replace(/\/$/, '') || '/';
  if (clean === '/') return existsSync(path.join(DIST, 'index.html'));
  const target = path.join(DIST, clean);
  return [target, `${target}.html`, path.join(target, 'index.html')].some(f => existsSync(f) && statSync(f).isFile());
}

const attr = (tag, name) => tag.match(new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`, 'i'))?.[1] ?? null;
const decode = (s) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const textOf = (html) => decode(html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

// 1. Pages ------------------------------------------------------------------
const pages = listHtml(DIST).map(file => {
  const html = readFileSync(file, 'utf-8');
  const where = urlPath(file);
  const metaContent = (name) => {
    const tag = html.match(new RegExp(`<meta[^>]+(?:name|property)="${name}"[^>]*>`, 'i'))?.[0];
    return tag ? decode(attr(tag, 'content') ?? '') : null;
  };
  const noindex = /<meta[^>]+name="robots"[^>]+noindex/i.test(html);
  const title = decode(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? '');
  const description = metaContent('description');
  const canonical = attr(html.match(/<link[^>]+rel="canonical"[^>]*>/i)?.[0] ?? '', 'href');

  if (!title) error(where, 'missing <title>');
  else if (title.length > 70) warn(where, `title is ${title.length} characters (aim for ≤ 60): "${title}"`);
  if (!description) error(where, 'missing meta description');
  else if (description.length > 160) warn(where, `description is ${description.length} characters (aim for ≤ 155)`);
  if (!/<html[^>]+lang="[a-z-]+"/i.test(html)) error(where, '<html> has no lang attribute');

  if (noindex) {
    if (canonical) warn(where, 'noindex page has a canonical link');
  } else {
    const expected = SITE + (where === '/' ? '/' : where);
    if (canonical !== expected) error(where, `canonical is ${canonical ?? 'missing'}, expected ${expected}`);
    for (const key of ['og:title', 'og:description', 'og:image', 'og:url', 'twitter:card']) {
      if (!metaContent(key)) error(where, `missing ${key}`);
    }
  }

  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  if (h1Count !== 1) error(where, `${h1Count} <h1> elements (expected exactly 1)`);

  // Readable without JavaScript: the content is in the HTML, not filled in by scripts
  const main = html.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? '';
  const words = textOf(main.replace(/<noscript>[\s\S]*?<\/noscript>/gi, '')).split(' ').filter(Boolean).length;
  if (where !== '/map' && !noindex && words < 80) error(where, `only ${words} words of text in <main> without JavaScript`);

  // Scripts: external files or JSON-LD only (CSP script-src 'self')
  for (const [, tag, body] of html.matchAll(/(<script[^>]*>)([\s\S]*?)<\/script>/gi)) {
    const type = attr(tag, 'type');
    if (type === 'application/ld+json') {
      try {
        const data = JSON.parse(body);
        if (!data['@context'] || !data['@type']) error(where, 'JSON-LD without @context or @type');
        if (data['@type'] === 'BreadcrumbList') {
          data.itemListElement.forEach((item, i) => {
            if (item.position !== i + 1) error(where, 'BreadcrumbList positions are not 1, 2, 3 …');
            if (!item.item?.startsWith(SITE)) error(where, `BreadcrumbList item outside the site: ${item.item}`);
          });
        }
      } catch (err) {
        error(where, `JSON-LD does not parse: ${err.message}`);
      }
    } else if (!attr(tag, 'src')) {
      error(where, 'inline <script> (blocked by the Content-Security-Policy)');
    } else if (/^(https?:)?\/\//.test(attr(tag, 'src'))) {
      error(where, `script from another origin: ${attr(tag, 'src')}`);
    }
  }

  // Internal links and images
  for (const [, href] of html.matchAll(/<a\s[^>]*href="([^"]+)"/gi)) {
    if (href.startsWith('/') && !href.startsWith('//') && !resolves(href)) error(where, `broken link ${href}`);
  }
  for (const [tag] of html.matchAll(/<img\s[^>]*>/gi)) {
    if (attr(tag, 'alt') === null) error(where, `<img> without alt: ${tag.slice(0, 80)}`);
    const src = attr(tag, 'src');
    if (src?.startsWith('/') && !resolves(src)) error(where, `missing image ${src}`);
  }

  return { where, noindex };
});

// 2. Sitemap ----------------------------------------------------------------
const indexFile = path.join(DIST, 'sitemap-index.xml');
const sitemapUrls = new Set();
if (!existsSync(indexFile)) {
  error('sitemap', 'dist/sitemap-index.xml is missing');
} else {
  for (const [, loc] of readFileSync(indexFile, 'utf-8').matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const file = path.join(DIST, new URL(loc).pathname);
    if (!existsSync(file)) { error('sitemap', `${loc} listed in the index but not built`); continue; }
    for (const [, url] of readFileSync(file, 'utf-8').matchAll(/<loc>([^<]+)<\/loc>/g)) sitemapUrls.add(url);
  }
}
for (const url of sitemapUrls) {
  const { pathname } = new URL(url);
  if (!url.startsWith(SITE)) error('sitemap', `URL outside the site: ${url}`);
  if (!resolves(pathname)) error('sitemap', `${url} does not resolve to a built page`);
  if (pathname.length > 1 && pathname.endsWith('/')) error('sitemap', `${url} has a trailing slash (the site has none)`);
}
for (const { where, noindex } of pages) {
  const url = SITE + (where === '/' ? '/' : where);
  if (!noindex && !sitemapUrls.has(url)) error('sitemap', `${where} is missing from the sitemap`);
  if (noindex && sitemapUrls.has(url)) error('sitemap', `${where} is noindex but listed in the sitemap`);
}

// 3. robots.txt and llms.txt -------------------------------------------------
const robots = existsSync(path.join(DIST, 'robots.txt')) ? readFileSync(path.join(DIST, 'robots.txt'), 'utf-8') : '';
if (!robots) error('robots.txt', 'missing');
if (/^Disallow:\s*\/\s*$/m.test(robots)) error('robots.txt', 'disallows the whole site');
const sitemapLine = robots.match(/^Sitemap:\s*(\S+)/m)?.[1];
if (!sitemapLine) error('robots.txt', 'no Sitemap: line');
else if (!resolves(new URL(sitemapLine).pathname)) error('robots.txt', `Sitemap ${sitemapLine} does not exist`);

const llmsFile = path.join(DIST, 'llms.txt');
if (!existsSync(llmsFile)) {
  error('llms.txt', 'missing');
} else {
  for (const [, url] of readFileSync(llmsFile, 'utf-8').matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)) {
    if (url.startsWith(SITE) && !resolves(new URL(url).pathname)) error('llms.txt', `broken link ${url}`);
  }
}

// Report ----------------------------------------------------------------------
for (const w of warnings) console.warn(`⚠ ${w}`);
for (const e of errors) console.error(`✖ ${e}`);
console.log(`\nSEO check: ${pages.length} pages, ${sitemapUrls.size} sitemap URLs, ${errors.length} errors, ${warnings.length} warnings.`);
process.exit(errors.length ? 1 : 0);
