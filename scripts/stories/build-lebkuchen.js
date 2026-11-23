/**
 * Builds the Lebkuchen story in English and German from one source, so both
 * files always carry the same data:
 *
 *   public/data/stories/lebkuchen.twr.json      (en)
 *   public/data/stories/lebkuchen.de.twr.json   (de)
 *
 *   node scripts/stories/build-lebkuchen.js
 *
 * Shares and values come from our BACI files (public/data/trade/2024/by-country/DE.json),
 * so a new trade year only needs a rerun. Edit texts, routes and sources here,
 * not in the generated files.
 */

import fs from 'node:fs';

const de = JSON.parse(fs.readFileSync('public/data/trade/2024/by-country/DE.json', 'utf8'));
const imp = Object.fromEntries(de.imports.map(i => [i.good, i]));
const DATE = '2026-11-23';

/* ---------- Data (language-independent) ---------- */

const sources = [
  { id: 'baci', title: 'BACI – International Trade Database at the Product-Level, HS17 V202601, trade year 2024', publisher: 'CEPII', url: 'https://www.cepii.fr/CEPII/en/bdd_modele/bdd_modele_item.asp?id=37', type: 'dataset', registryId: 'baci-202601', note: 'Processed by scripts/pipeline/build-trade.js into public/data/trade/2024/. Partner = country the goods were shipped from; re-exports (e.g. via the Netherlands) count for the shipping country.' },
  { id: 'lgl-gga', title: 'Geschützte Herkunftsangaben (Nürnberger Lebkuchen)', publisher: 'Bayerisches Landesamt für Gesundheit und Lebensmittelsicherheit (LGL)', url: 'https://www.lgl.bayern.de/lebensmittel/kennzeichnung/echtheit_herkunft/herkunftsangaben.htm', type: 'primary' },
  { id: 'nbg-lebkuchen', title: 'Nürnberger Lebkuchen – geschützte geografische Angabe', publisher: 'Stadt Nürnberg, EU-Büro', url: 'https://www.nuernberg.de/internet/eu_buero/nuernbergerlebkuchen.html', type: 'primary' },
  { id: 'leitsaetze-backwaren', title: 'Leitsätze für Feine Backwaren (text as published by umwelt-online)', publisher: 'umwelt-online (Deutsche Lebensmittelbuch-Kommission)', url: 'https://umwelt-online.de/recht/lebensmt/lebensmb.ges/yback.htm', type: 'secondary', note: 'Elisenlebkuchen: at least 25 % almonds, hazelnuts or walnuts, at most 10 % flour. The Leitsätze were revised on 19.11.2024; check against the current official text before publishing.' },
  { id: 'lebkuchen-schmidt-press', title: 'Pressemappe (Elisenlebkuchen)', publisher: 'Lebkuchen-Schmidt', url: 'https://www.lebkuchen-schmidt.com/userdata/filegallery/original/52_pressemappe.pdf', type: 'self_reported' },
  { id: 'dm-gewuerz', title: 'Lebkuchengewürz selber machen', publisher: 'dm', url: 'https://www.dm.de/tipps-und-trends/food/lebkuchengewuerz-selber-machen-2041132', type: 'secondary' },
  { id: 'oekotest-gewuerz', title: 'Lebkuchengewürz selber machen: Einfaches Rezept für die perfekte Gewürzmischung', publisher: 'ÖKO-TEST', url: 'https://www.oekotest.de/essen-trinken/Lebkuchengewuerz-selber-machen-Einfaches-Rezept-fuer-die-perfekte-Gewuerzmischung_15917_1.html', type: 'secondary' },
  { id: 'unctad-rmt2024', title: 'Review of Maritime Transport 2024: Navigating maritime chokepoints', publisher: 'UNCTAD', url: 'https://unctad.org/publication/review-maritime-transport-2024', type: 'primary', note: 'By mid-2024 tonnage through the Suez Canal was down about 70 %; ship arrivals at the Cape of Good Hope up about 89 %.' }
].map(s => ({ ...s, accessed: DATE }));

const ASIA = ['wp-singapore', 'wp-malacca', 'wp-sri-lanka', 'wp-madagascar', 'wp-agulhas', 'wp-cape', 'wp-cape-verde', 'wp-finisterre', 'wp-channel', 'wp-dover', 'wp-german-bight'];
const tail = from => ASIA.slice(ASIA.indexOf(from));

// Countries the ingredients come from. coord = a representative port or region, not a site.
const origins = [
  { cc: 'TR', coord: [38.39, 40.92], mode: 'road', via: [[29.0, 41.05], [20.46, 44.81], [16.37, 48.21]] },
  { cc: 'IT', coord: [12.6, 42.4], mode: 'road', via: [[11.4, 47.3]] },
  { cc: 'ES', coord: [-1.13, 37.99], mode: 'road', via: [[2.0, 41.6], [4.8, 45.8]] },
  { cc: 'UA', coord: [30.52, 50.45], mode: 'road', via: [[21.0, 50.1]] },
  { cc: 'HU', coord: [19.04, 47.5], mode: 'road', via: [[16.37, 48.21]] },
  { cc: 'US', coord: [-122.3, 37.8], mode: 'sea', via: [[-110, 20], 'wp-panama', [-74, 19.8], 'wp-north-atlantic', 'wp-channel', 'wp-dover', 'wp-german-bight'] },
  { cc: 'GT', coord: [-88.6, 15.7], mode: 'sea', via: [[-85.6, 21.8], [-79.8, 25.6], [-76, 30], 'wp-north-atlantic', 'wp-channel', 'wp-dover', 'wp-german-bight'] },
  { cc: 'AR', coord: [-58.4, -34.6], mode: 'sea', via: [[-40, -22], [-30, -5], ...tail('wp-cape-verde')] },
  { cc: 'CN', coord: [113.6, 22.3], mode: 'sea', via: ['wp-south-china-sea', ...ASIA] },
  { cc: 'VN', coord: [106.7, 20.8], mode: 'sea', via: ['wp-south-china-sea', ...ASIA] },
  { cc: 'ID', coord: [106.9, -6.1], mode: 'sea', via: ASIA },
  { cc: 'LK', coord: [79.85, 6.93], mode: 'sea', via: tail('wp-sri-lanka') },
  { cc: 'MG', coord: [49.4, -18.15], mode: 'sea', via: tail('wp-madagascar') },
  { cc: 'KM', coord: [43.25, -11.7], mode: 'sea', via: [[40, -21], ...tail('wp-agulhas')] }
];

// Suppliers shown per good: the largest ones. The Netherlands (a re-export hub) is named in the text instead.
const picks = {
  hazelnuts: ['TR', 'IT'],
  almonds: ['US', 'ES', 'IT'],
  honey: ['UA', 'AR', 'HU'],
  cinnamon: ['CN', 'VN', 'ID', 'LK', 'MG'],
  cloves: ['MG', 'KM', 'ID', 'LK'],
  nutmeg: ['ID', 'VN', 'LK'],
  cardamom: ['GT', 'ID'],
  ginger: ['CN']
};

const waypoints = {
  'wp-south-china-sea': [111, 12],
  'wp-singapore': [104.3, 1.2],
  'wp-malacca': [97.5, 6],
  'wp-sri-lanka': [80.3, 5.4],
  'wp-madagascar': [47, -28.5],
  'wp-agulhas': [28, -35],
  'wp-cape': [17.5, -35.3],
  'wp-cape-verde': [-20, 14],
  'wp-finisterre': [-11, 44],
  'wp-panama': [-79.7, 9.1],
  'wp-north-atlantic': [-40, 41],
  'wp-channel': [-5.5, 49.3],
  'wp-dover': [1.6, 51.0],
  'wp-german-bight': [8.2, 54.0]
};

const SPICES = ['cinnamon', 'cloves', 'nutmeg', 'cardamom', 'ginger'];
const WORLD = { bounds: [[-130, -45], [150, 62]] };
const pct = (g, cc) => Math.round(imp[g].partners.find(p => p[0] === cc)[2] * 100);
const kt = g => Math.round(imp[g].qty / 1000);

/* ---------- Texts ---------- */

const TEXT = {
  en: {
    title: 'The world in a Lebkuchen',
    subtitle: 'Where the ingredients of Nuremberg gingerbread come from',
    disclaimer: "Supplier countries and shares are Germany's total imports of each ingredient (BACI 2024), not the supply chain of any particular bakery. Routes are schematic. This project is independent and not affiliated with any company or with the protection association of Nürnberger Lebkuchen.",
    countries: { TR: 'Turkey', IT: 'Italy', ES: 'Spain', UA: 'Ukraine', HU: 'Hungary', US: 'United States', GT: 'Guatemala', AR: 'Argentina', CN: 'China', VN: 'Vietnam', ID: 'Indonesia', LK: 'Sri Lanka', MG: 'Madagascar', KM: 'Comoros' },
    waypoints: { 'wp-south-china-sea': 'South China Sea', 'wp-singapore': 'Singapore Strait', 'wp-malacca': 'Strait of Malacca (north)', 'wp-sri-lanka': 'South of Sri Lanka', 'wp-madagascar': 'South of Madagascar', 'wp-agulhas': 'Off Cape Agulhas', 'wp-cape': 'Cape of Good Hope', 'wp-cape-verde': 'Off Cape Verde', 'wp-finisterre': 'Off Cape Finisterre', 'wp-panama': 'Panama Canal', 'wp-north-atlantic': 'North Atlantic', 'wp-channel': 'Western English Channel', 'wp-dover': 'Strait of Dover', 'wp-german-bight': 'German Bight' },
    nuremberg: 'Nuremberg',
    nurembergText: 'Nürnberger Lebkuchen is a protected geographical indication (PGI, since 2 July 1996): it must be baked in Nuremberg. The ingredients may come from anywhere.',
    hamburgText: 'Stands for the North Sea ports. Sea freight to Germany also arrives via Bremerhaven, Rotterdam and Antwerp.',
    notes: {
      hamburg: 'Schematic entry port. BACI records countries, not ports.',
      origin: 'Supplier country in BACI 2024. The coordinate is a representative port or region.',
      qty: 'Value of German imports from this country; share = of all German imports of the good.',
      cape: 'Schematic sea route. In 2024 most Asia–Europe container services avoided the Red Sea and sailed around the Cape of Good Hope.',
      sea: 'Schematic sea route.',
      road: 'Schematic overland route by truck.',
      onward: 'Sum of the sea flows shown here. Not all of it goes to Nuremberg; stands for the onward leg by rail or truck.'
    },
    goodShare: { hazelnuts: 'hazelnut', almonds: 'almond', honey: 'honey', cinnamon: 'cinnamon', cloves: 'clove', nutmeg: 'nutmeg', cardamom: 'cardamom', ginger: 'ginger' },
    edgeText: (p, g) => `${p} % of Germany's ${g} imports (by value).`,
    steps: {
      intro: ['Where does a Lebkuchen come from?', 'Nürnberger Lebkuchen must be baked in Nuremberg – a protected geographical indication since 1996. Its ingredients come from all over the world.'],
      nuts: ['Nuts: the heart of the dough', `Elisenlebkuchen contain at least 25 % nuts and at most 10 % flour. Germany imports more hazelnuts than any other country – ${pct('hazelnuts', 'TR')} % from Turkey. ${pct('almonds', 'US')} % of its almonds come from the United States.`],
      honey: ['Honey: Germany imports the second most in the world', `Germany imported ${kt('honey')},000 tonnes of honey in 2024 – only the United States bought more. The largest suppliers: Ukraine (${pct('honey', 'UA')} %), New Zealand, Argentina and Hungary.`],
      spices: ['Spices from the tropics', `Lebkuchen spice is mostly cinnamon, cloves, nutmeg, cardamom and ginger. ${pct('nutmeg', 'ID')} % of Germany's nutmeg comes from Indonesia, ${pct('cloves', 'MG')} % of its cloves from Madagascar – and ${pct('cardamom', 'GT')} % of its cardamom from Guatemala.`],
      detour: ['The long way round', 'In 2024 most ships from Asia avoided the Red Sea and sailed around the Cape of Good Hope – a detour of thousands of kilometres on the way to Hamburg.'],
      nuremberg: ['All routes lead to Nuremberg', `${origins.length} countries on four continents for one biscuit. The Netherlands also show up as a big spice supplier: Rotterdam and Amsterdam re-export what arrives from the tropics.`]
    }
  },
  de: {
    title: 'Die Welt im Lebkuchen',
    subtitle: 'Woher die Zutaten für Nürnberger Lebkuchen kommen',
    disclaimer: 'Lieferländer und Anteile beziehen sich auf alle deutschen Importe der jeweiligen Zutat (BACI 2024), nicht auf die Lieferkette einer bestimmten Bäckerei. Die Routen sind schematisch. Dieses Projekt ist unabhängig und mit keinem Unternehmen und nicht mit dem Schutzverband Nürnberger Lebkuchen verbunden.',
    countries: { TR: 'Türkei', IT: 'Italien', ES: 'Spanien', UA: 'Ukraine', HU: 'Ungarn', US: 'USA', GT: 'Guatemala', AR: 'Argentinien', CN: 'China', VN: 'Vietnam', ID: 'Indonesien', LK: 'Sri Lanka', MG: 'Madagaskar', KM: 'Komoren' },
    waypoints: { 'wp-south-china-sea': 'Südchinesisches Meer', 'wp-singapore': 'Straße von Singapur', 'wp-malacca': 'Straße von Malakka (Nord)', 'wp-sri-lanka': 'Südlich von Sri Lanka', 'wp-madagascar': 'Südlich von Madagaskar', 'wp-agulhas': 'Vor Kap Agulhas', 'wp-cape': 'Kap der Guten Hoffnung', 'wp-cape-verde': 'Vor Kap Verde', 'wp-finisterre': 'Vor Kap Finisterre', 'wp-panama': 'Panamakanal', 'wp-north-atlantic': 'Nordatlantik', 'wp-channel': 'Westlicher Ärmelkanal', 'wp-dover': 'Straße von Dover', 'wp-german-bight': 'Deutsche Bucht' },
    nuremberg: 'Nürnberg',
    nurembergText: 'Nürnberger Lebkuchen ist eine geschützte geografische Angabe (g.g.A., seit 2. Juli 1996): Er muss in Nürnberg gebacken werden. Die Zutaten dürfen von überall kommen.',
    hamburgText: 'Steht für die Nordseehäfen. Seefracht nach Deutschland kommt auch über Bremerhaven, Rotterdam und Antwerpen.',
    notes: {
      hamburg: 'Schematischer Ankunftshafen. BACI erfasst Länder, keine Häfen.',
      origin: 'Lieferland in BACI 2024. Die Koordinate ist ein typischer Hafen oder eine typische Region.',
      qty: 'Wert der deutschen Importe aus diesem Land; Anteil = an allen deutschen Importen der Zutat.',
      cape: 'Schematische Seeroute. 2024 mieden die meisten Containerdienste zwischen Asien und Europa das Rote Meer und fuhren ums Kap der Guten Hoffnung.',
      sea: 'Schematische Seeroute.',
      road: 'Schematische Landroute per Lkw.',
      onward: 'Summe der hier gezeigten Seetransporte. Nicht alles geht nach Nürnberg; steht für den Weitertransport per Bahn oder Lkw.'
    },
    goodShare: { hazelnuts: 'Haselnuss', almonds: 'Mandel', honey: 'Honig', cinnamon: 'Zimt', cloves: 'Nelken', nutmeg: 'Muskat', cardamom: 'Kardamom', ginger: 'Ingwer' },
    edgeText: (p, g) => `${p} % der deutschen ${g}-Importe (nach Wert).`,
    steps: {
      intro: ['Woher kommt ein Lebkuchen?', 'Nürnberger Lebkuchen muss in Nürnberg gebacken werden – er ist seit 1996 eine geschützte geografische Angabe. Seine Zutaten kommen aus der ganzen Welt.'],
      nuts: ['Nüsse: das Herz des Teigs', `Elisenlebkuchen enthalten mindestens 25 % Nüsse und höchstens 10 % Mehl. Deutschland importiert mehr Haselnüsse als jedes andere Land – ${pct('hazelnuts', 'TR')} % davon aus der Türkei. ${pct('almonds', 'US')} % der Mandeln kommen aus den USA.`],
      honey: ['Honig: Deutschland auf Platz zwei der Welt', `${kt('honey')}.000 Tonnen Honig hat Deutschland 2024 eingeführt – nur die USA kauften mehr. Die größten Lieferanten: Ukraine (${pct('honey', 'UA')} %), Neuseeland, Argentinien und Ungarn.`],
      spices: ['Gewürze aus den Tropen', `Lebkuchengewürz besteht vor allem aus Zimt, Nelken, Muskat, Kardamom und Ingwer. ${pct('nutmeg', 'ID')} % der Muskatnuss kommen aus Indonesien, ${pct('cloves', 'MG')} % der Nelken aus Madagaskar – und ${pct('cardamom', 'GT')} % des Kardamoms aus Guatemala.`],
      detour: ['Der lange Weg ums Kap', '2024 mieden die meisten Schiffe aus Asien das Rote Meer und fuhren ums Kap der Guten Hoffnung – ein Umweg von Tausenden Kilometern bis Hamburg.'],
      nuremberg: ['Alle Wege führen nach Nürnberg', `${origins.length} Länder auf vier Kontinenten für ein Gebäck. Auch die Niederlande tauchen als großer Gewürzlieferant auf: Über Rotterdam und Amsterdam wird weiterverkauft, was aus den Tropen ankommt.`]
    }
  }
};

/* ---------- Build ---------- */

function build(lang) {
  const T = TEXT[lang];
  const nodes = [
    {
      id: 'nuremberg', kind: 'site', type: 'processing_hub', name: T.nuremberg, coord: [11.077, 49.452], precision: 'city', country: 'DE',
      goods: Object.keys(picks), text: T.nurembergText,
      claims: [{ about: 'pgi', confidence: 'documented', sourceIds: ['lgl-gga', 'nbg-lebkuchen'] }]
    },
    {
      id: 'hamburg', kind: 'transfer', type: 'import_hub', name: 'Hamburg', coord: [9.97, 53.54], precision: 'city', country: 'DE',
      text: T.hamburgText,
      claims: [{ confidence: 'estimated', sourceIds: [], note: T.notes.hamburg }]
    },
    ...origins.map(o => ({
      id: o.cc.toLowerCase(), kind: 'site', type: 'region', name: T.countries[o.cc], coord: o.coord, precision: 'country', country: o.cc,
      goods: Object.keys(picks).filter(g => picks[g].includes(o.cc)),
      claims: [{ confidence: 'documented', sourceIds: ['baci'], note: T.notes.origin }]
    })),
    ...Object.entries(waypoints).map(([id, coord]) => ({ id, kind: 'waypoint', name: T.waypoints[id], coord }))
  ];

  const routeClaim = o => {
    if (o.mode !== 'sea') return { about: 'route', confidence: 'estimated', sourceIds: [], note: T.notes.road };
    if (o.via.includes('wp-cape')) return { about: 'route', confidence: 'plausible', sourceIds: ['unctad-rmt2024'], note: T.notes.cape };
    return { about: 'route', confidence: 'estimated', sourceIds: [], note: T.notes.sea };
  };

  const edges = [];
  const seaTotals = {};
  for (const [good, ccs] of Object.entries(picks)) {
    const partners = Object.fromEntries(imp[good].partners.map(([cc, usd, share]) => [cc, { usd, share }]));
    for (const cc of ccs) {
      const o = origins.find(x => x.cc === cc);
      const p = partners[cc];
      if (!p) throw new Error(`${good}: ${cc} is not among Germany's top partners`);
      const sea = o.mode === 'sea';
      if (sea) seaTotals[good] = (seaTotals[good] || 0) + p.usd;
      edges.push({
        id: `${cc.toLowerCase()}-${good}`, from: cc.toLowerCase(), to: sea ? 'hamburg' : 'nuremberg', via: o.via, mode: o.mode, goods: [good],
        qty: { value: p.usd, unit: 'USD', year: 2024, share: p.share },
        text: T.edgeText(Math.round(p.share * 100), T.goodShare[good]),
        claims: [{ about: 'qty', confidence: 'documented', sourceIds: ['baci'], note: T.notes.qty }, routeClaim(o)]
      });
    }
  }
  for (const [good, usd] of Object.entries(seaTotals)) {
    edges.push({
      id: `hamburg-nuremberg-${good}`, from: 'hamburg', to: 'nuremberg', mode: 'mixed', goods: [good],
      qty: { value: usd, unit: 'USD', year: 2024 },
      claims: [{ about: 'qty', confidence: 'estimated', sourceIds: ['baci'], note: T.notes.onward }]
    });
  }

  const onward = gs => gs.map(g => `hamburg-nuremberg-${g}`).filter(id => edges.some(e => e.id === id));
  const supply = gs => edges.filter(e => gs.includes(e.goods[0]) && e.from !== 'hamburg');
  const reveal = gs => [...new Set(supply(gs).map(e => e.from))].concat(supply(gs).map(e => e.id), onward(gs));
  const step = (id, extra) => ({ id, title: T.steps[id][0], text: T.steps[id][1], ...extra });

  const story = { steps: [
    step('intro', { camera: WORLD, transition: 'cut', reveal: ['nuremberg'], focus: ['nuremberg'], sourceIds: ['lgl-gga', 'nbg-lebkuchen'] }),
    step('nuts', { camera: { bounds: [[-125, 25], [45, 58]] }, transition: 'fly', reveal: ['hamburg', ...reveal(['hazelnuts', 'almonds'])], focus: ['tr', 'us'], sourceIds: ['leitsaetze-backwaren', 'baci'] }),
    step('honey', { camera: { bounds: [[-75, -50], [45, 60]] }, transition: 'fly', reveal: reveal(['honey']), focus: ['ua', 'ar'], sourceIds: ['baci'] }),
    step('spices', { camera: { bounds: [[-95, -40], [125, 58]] }, transition: 'fly', reveal: reveal(SPICES), focus: ['id', 'mg', 'gt'], sourceIds: ['dm-gewuerz', 'oekotest-gewuerz', 'baci'] }),
    step('detour', { camera: { bounds: [[-30, -50], [125, 58]] }, transition: 'fly', focus: ['wp-cape'], sourceIds: ['unctad-rmt2024'] }),
    step('nuremberg', { camera: WORLD, transition: 'fly', focus: ['nuremberg'], sourceIds: ['baci'] })
  ] };

  return {
    $schema: '../schemas/project-1.schema.json',
    format: 'twr-project',
    formatVersion: '1.0.0',
    meta: {
      title: T.title,
      subtitle: T.subtitle,
      language: lang,
      license: 'CC-BY-4.0',
      author: "The World's Resources",
      created: DATE,
      modified: DATE,
      dataYear: 2024,
      basedOn: 'twr-trade 2024 (BACI V202601)',
      disclaimer: T.disclaimer
    },
    sources, nodes, edges, story
  };
}

for (const [lang, file] of [['en', 'lebkuchen.twr.json'], ['de', 'lebkuchen.de.twr.json']]) {
  const project = build(lang);
  fs.writeFileSync(`public/data/stories/${file}`, JSON.stringify(project, null, 2) + '\n');
  console.log(`${file}: ${project.nodes.length} nodes, ${project.edges.length} edges, ${project.story.steps.length} steps`);
}
