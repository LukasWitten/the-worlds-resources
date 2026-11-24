#!/usr/bin/env node
/**
 * Lighthouse budget for the main pages (mobile), run against a local preview:
 *
 *   npm run build && npm run preview &      # serves dist/ on http://localhost:4321
 *   npm run check:lighthouse                # or: BASE_URL=https://… npm run check:lighthouse
 *
 * Accessibility, best practices and SEO must reach the budget. Performance is
 * reported but only warns: on shared CI machines it varies too much to fail a build.
 * Needs Chrome or Chromium (present on GitHub's ubuntu runners).
 */

import { execFileSync } from 'node:child_process';

const LIGHTHOUSE = 'lighthouse@13.6.0';
const BASE_URL = (process.env.BASE_URL || 'http://localhost:4321').replace(/\/$/, '');
const PAGES = ['/', '/map', '/methodology', '/sources'];
const BUDGET = { accessibility: 0.95, 'best-practices': 0.9, seo: 0.95 };
const PERFORMANCE_WARN = 0.85;

let failed = false;
const rows = [];

for (const page of PAGES) {
  const url = BASE_URL + page;
  const report = JSON.parse(execFileSync('npx', [
    '--yes', LIGHTHOUSE, url,
    '--output=json', '--output-path=stdout', '--quiet',
    '--only-categories=performance,accessibility,best-practices,seo',
    '--chrome-flags=--headless=new --no-sandbox'
  ], { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 }));

  const score = (id) => report.categories[id]?.score ?? 0;
  const row = { page, performance: score('performance') };
  for (const [category, min] of Object.entries(BUDGET)) {
    row[category] = score(category);
    if (row[category] < min) {
      failed = true;
      const audits = report.categories[category].auditRefs
        .map(ref => report.audits[ref.id])
        .filter(audit => audit.score !== null && audit.score < 1 && audit.scoreDisplayMode !== 'informative' && audit.scoreDisplayMode !== 'manual');
      console.error(`✖ ${page}: ${category} ${Math.round(row[category] * 100)} < ${min * 100}`);
      for (const audit of audits) console.error(`    - ${audit.id}: ${audit.title}`);
    }
  }
  if (row.performance < PERFORMANCE_WARN) {
    console.warn(`⚠ ${page}: performance ${Math.round(row.performance * 100)} (LCP ${report.audits['largest-contentful-paint']?.displayValue})`);
  }
  row.lcp = report.audits['largest-contentful-paint']?.displayValue;
  rows.push(row);
}

const pct = (v) => String(Math.round(v * 100)).padStart(3);
console.log('\npage           perf  a11y  bp   seo   LCP');
for (const r of rows) {
  console.log(`${r.page.padEnd(14)} ${pct(r.performance)}   ${pct(r.accessibility)}  ${pct(r['best-practices'])}  ${pct(r.seo)}   ${r.lcp}`);
}
process.exit(failed ? 1 : 0);
