# Contributing to The World's Resources

Thanks for helping to make global resource flows visible! This project lives from people who know a pipeline, a port or a mine better than we do – and from people who like to improve code. Both are equally welcome.

## Ways to contribute

| You want to … | Do this |
|---------------|---------|
| Report a mistake in the data (wrong place, outdated number, broken source) | Open a [data issue](https://github.com/LukasWitten/the-worlds-resources/issues/new?template=data.yml) |
| Suggest a new place, route or resource, but don't use Git | Open a [data issue](https://github.com/LukasWitten/the-worlds-resources/issues/new?template=data.yml) and describe it, ideally with a source |
| Add or change data yourself | Edit the GeoJSON and open a pull request – see [Data contributions](#data-contributions) |
| Report a bug in the website | Open a [bug report](https://github.com/LukasWitten/the-worlds-resources/issues/new?template=bug.yml) |
| Work on the code | Pick an issue, then see [Code contributions](#code-contributions) |

New here? Issues labelled [`good first issue`](https://github.com/LukasWitten/the-worlds-resources/labels/good%20first%20issue) are small and well described. Leave a comment on the issue before you start so that no one does the same work twice.

## Getting started

Requires Node.js 20 or newer.

```bash
git clone https://github.com/<your-username>/the-worlds-resources.git   # your fork
cd the-worlds-resources
npm install
npm run dev
```

Open the address shown in the terminal (usually `http://localhost:4321`). Changes to code and data are picked up automatically.

## Data contributions

All data lives in `public/data/geojson/` as GeoJSON. **[docs/CONTRIBUTING_DATA.md](docs/CONTRIBUTING_DATA.md)** explains the format in detail; the short version:

- **Nodes** (ports, refineries, mines, storage …) are `Point` features with a unique `id`.
- **Routes** (pipelines, shipping lanes, rail corridors) are `LineString` features. They must name their start and end node with `from_node_id` / `to_node_id`, and their first and last coordinate must sit on those nodes. This is what connects places into supply chains.
- Coordinates are **`[longitude, latitude]`**.
- Texts are in **English**.
- Every feature needs a **source** – an official report, operator website or public dataset, with a link whenever possible. Please don't add numbers or locations you cannot back up.
- Copy-paste templates are in `public/data/templates/`.

Before you open the pull request:

```bash
npm run validate:data
```

The validator checks the schema, unique ids and that every route really starts and ends at its nodes. It also runs automatically on every pull request. Then open the map (`npm run dev`), click your new feature and check that its supply chain looks right.

By contributing data you agree that it is published under [CC BY 4.0](public/data/LICENSE.md). Only add data you are allowed to share under that license – for example, don't copy coordinates in bulk from OpenStreetMap (ODbL) or from proprietary maps.

## Code contributions

The stack is deliberately simple: vanilla JavaScript (ES modules), Vite, Leaflet and Tailwind CSS. No framework.

A few rules that keep the site fast and safe:

- **No third-party CDNs.** Install libraries via npm so Vite bundles them. The Content-Security-Policy in `vercel.json` blocks external scripts.
- **Escape data before it goes into HTML.** Use `escapeHtml()` and `safeHttpUrl()` from `src/modules/html.js` for every value that comes from the GeoJSON.
- **No inline `<script>` or `onclick` attributes** – they are blocked by the CSP as well. Attach event listeners in the modules.
- **Keep the build passing:** `npm run build`, and `npm run preview` to test with the production headers.

Where things live:

| File | Responsibility |
|------|----------------|
| `src/pages/` | The pages of the site (Astro); the map is `map.astro` |
| `src/app.js` | Map page: startup and URL state (`/map#map/<feature-id>`) |
| `src/modules/dataService.js` | Loading and filtering datasets |
| `src/modules/supplyChain.js` | Graph of nodes and routes, upstream/downstream chains |
| `src/modules/map.js` | Leaflet map, markers, routes, chain highlight |
| `src/modules/inspector.js` | Detail drawer and supply-chain timeline |
| `src/modules/ui.js` | Map page UI: sidebar, search, filters, dialogs |
| `scripts/validate-data.js` | Data validator (local and CI) |

## Pull requests

1. Fork the repository and create a branch (`git checkout -b add-leuna-supply`).
2. Make your change; keep a pull request focused on one topic.
3. Run `npm run validate:data` and `npm run build`.
4. Open the pull request and describe what you changed and why. For data, list your sources; a screenshot of the map helps.

CI checks every pull request, and Vercel creates a preview deployment you can click through.

## Code of conduct

Be kind and constructive. Stick to facts and sources – this project is about logistics and everyday life, not about political opinions. Harassment or personal attacks are not tolerated.

## Questions?

Open an [issue](https://github.com/LukasWitten/the-worlds-resources/issues) – there are no stupid questions.
