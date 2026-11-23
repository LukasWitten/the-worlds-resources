/**
 * Site-wide constants and structured data (JSON-LD) shared by all pages.
 */

export const SITE = {
  name: "The World's Resources",
  url: 'https://www.theworldsresources.org',
  description: 'An open, interactive map of global supply chains: follow oil, gas and lithium from the oil field or mine to the products you use every day.',
  github: 'https://github.com/LukasWitten/the-worlds-resources',
  email: 'contact@theworldsresources.org',
  ogImage: '/og-image.jpg?v=2',
  ogImageAlt: 'Dark world map with tanker routes from Texas, Venezuela and Canada to Germany, next to the headline: Where does your fuel come from?'
};

/** Main navigation (header) – also used for the footer and llms.txt. */
export const NAV = [
  { href: '/map', label: 'Resource Map' },
  { href: '/methodology', label: 'Methodology' },
  { href: '/sources', label: 'Data Sources' },
  { href: '/about', label: 'About' }
];

export const absoluteUrl = (path) => new URL(path, SITE.url).href;

/**
 * Clean path of a page as it is served: /map, /sources, / (the build writes
 * map.html and index.html, which Vercel serves without the extension).
 */
export const pagePath = (url) =>
  url.pathname.replace(/(index)?\.html$/, '').replace(/\/$/, '') || '/';

const ORGANIZATION_ID = `${SITE.url}/#organization`;
const WEBSITE_ID = `${SITE.url}/#website`;

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE.name,
    url: `${SITE.url}/`,
    logo: absoluteUrl('/apple-touch-icon.png'),
    email: SITE.email,
    sameAs: [SITE.github]
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE.name,
    url: `${SITE.url}/`,
    description: SITE.description,
    inLanguage: 'en',
    publisher: { '@id': ORGANIZATION_ID }
  };
}

/** crumbs: [{ name, path }] without the homepage, which is always the first item. */
export function breadcrumbJsonLd(crumbs, homeLabel = 'Home') {
  const items = [{ name: homeLabel, path: '/' }, ...crumbs];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path)
    }))
  };
}
