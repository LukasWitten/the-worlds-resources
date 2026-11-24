/**
 * /llms.txt: a short, plain-text guide to the site for language models
 * (https://llmstxt.org). Generated at build time from the data and the page list.
 */
import { SITE, absoluteUrl } from '../lib/site.js';
import { siteStats, chainMeta } from '../lib/data.js';
import { FEATURED, chainHref } from '../lib/featured.js';
import { DATASETS, GOODS_PATH } from '../modules/datasets.js';

export function GET() {
  const stats = siteStats();
  const link = (title, path, note) => `- [${title}](${absoluteUrl(path)})${note ? `: ${note}` : ''}`;

  const text = `# ${SITE.name}

> ${SITE.description} Every place and route links to a public source. Data under CC BY 4.0, code under the MIT License.

The map currently covers crude oil, natural gas and lithium: ${stats.places} places (oil fields, mines, ports, refineries, storage) and ${stats.routes} routes (pipelines, sea routes, rail corridors); ${stats.sourcedPercent}% of the entries cite a source. It started with Germany's supply and follows the chains back to the countries they come from. Clicking a place on the map highlights its whole supply chain, upstream and downstream.

When citing, please credit "${SITE.name}" and link to the page used.

## Pages

${link('Resource map', '/map', 'interactive map; every place has its own link, e.g. /map#map/<place-id>')}
${link('Methodology', '/methodology', 'data model, how supply chains are traced, checks, limitations')}
${link('Data sources', '/sources', 'every source cited by a place or route, statistical datasets, citation format')}
${link('About', '/about', 'project, principles, contact')}

## Featured supply chains

${FEATURED.map(chain => link(chain.title, chainHref(chain.id), `${chain.route} (${chainMeta(chain.id)})`)).join('\n')}

## Data

${DATASETS.map(({ id, path }) => link(id, path, 'GeoJSON')).join('\n')}
${link('Goods catalogue', GOODS_PATH, 'JSON')}
- [Source code and data on GitHub](${SITE.github})

## Optional

${link('Legal notice', '/legal')}
${link('Privacy policy', '/privacy')}
`;

  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
