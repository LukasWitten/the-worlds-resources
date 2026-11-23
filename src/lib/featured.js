/**
 * Supply chains featured on the homepage and in llms.txt, by the id of the
 * feature they end at. (The hero map keeps its own list in heroMap.js.)
 */
export const FEATURED = [
  {
    id: 'refinery-rheinland',
    title: 'Jet fuel for Frankfurt Airport',
    route: 'Texas, Venezuela and Canada → Wilhelmshaven → Cologne',
    resource: 'Crude oil',
    textClass: 'text-amber-300',
    dotClass: 'bg-amber-400'
  },
  {
    id: 'processing-schwarzheide',
    title: 'Battery materials for electric cars',
    route: 'Atacama Desert → Panama Canal → Hamburg → Lusatia',
    resource: 'Lithium',
    textClass: 'text-purple-300',
    dotClass: 'bg-purple-400'
  },
  {
    id: 'refinery-bayernoil',
    title: 'Diesel and petrol for Bavaria',
    route: 'Persian Gulf → Suez Canal → Trieste → across the Alps',
    resource: 'Crude oil',
    textClass: 'text-amber-300',
    dotClass: 'bg-amber-400'
  }
];

/** Link that opens the chain on the map. */
export const chainHref = (id) => `/map#map/${encodeURIComponent(id)}`;
