# The World's Resources

Ein interaktives, minimalistisches Open-Source-Projekt zur Visualisierung weltweiter Rohstoffströme – von der Rohstoffquelle und dem Importterminal über Transportkorridore und Raffinerien bis hin zum verarbeiteten Endprodukt im Alltag der Verbraucher.

## Projektübersicht

- **Minimalistisches Dark-Mode Design**: Dunkle Kartendarstellung, auf der fluoreszierende Leitungen und Knotenpunkte im Fokus stehen.
- **Einklappbare Seitenleiste**: Vollbild-Kartenerlebnis mit flexiblen Filtern nach Rohstoff und Infrastrukturtyp.
- **Der "Aha-Moment"**: Klick auf ein Element öffnet eine Detailansicht mit Angaben zu Betreiber, Kapazität und den konkreten Endprodukten (z. B. Kraftstoffe, Kunststoffe, Kerosin für Flughäfen).
- **MVP-Fokus**: Deutschland mit dem Rohstoff Rohöl als Machbarkeitsnachweis (Ports Wilhelmshaven & Rostock, Raffinerien Schwedt, Leuna, MiRO, TAL- und NWO-Pipelines).

## Technik

- **Vite** als Dev-Server und Build-Tool (Ausgabe nach `dist/`)
- **Leaflet** für die Karte, **Tailwind CSS** (v3, über PostCSS) für das Styling – beides wird gebündelt, es werden keine Skripte oder Styles von fremden CDNs geladen
- **GeoJSON** als Datenformat, geprüft gegen ein JSON-Schema (`npm run validate:data`)
- **Hosting:** Vercel (mit Cloudflare davor) unter theworldsresources.org; Sicherheits-Header (u. a. Content-Security-Policy) stehen in `vercel.json`
- **CI:** GitHub Actions prüft bei jedem Pull Request die Daten und den Build (`.github/workflows/ci.yml`)

## Projektstruktur

```
├── public/
│   └── data/                            # Einzige Datenquelle – wird 1:1 unter /data/ ausgeliefert
│       ├── geojson/
│       │   ├── germany/                 # crude_oil, natural_gas
│       │   └── global/                  # lithium, oil_fields, oil_export_corridors
│       ├── schemas/
│       │   └── resource-feature.schema.json
│       └── templates/                   # Kopiervorlagen für neue Knoten & Routen
├── docs/
│   ├── PROJECT_SPECIFICATIONS.md        # Vision & Konzept
│   ├── CONTRIBUTING_DATA.md             # Anleitung zum Beitragen von Daten
│   └── MINI_EDITOR_PLAN.md              # Plan für den Routen-Editor
├── prototypes/
│   └── gemini_prototype_v1.html         # Archivierter erster Prototyp
├── scripts/
│   └── validate-data.js                 # Schema-, ID- und Routen-Prüfung der GeoJSON-Daten
├── src/
│   ├── modules/
│   │   ├── dataService.js               # Laden, Filtern und Cachen der GeoJSON-Daten
│   │   ├── html.js                      # Escaping von Datenwerten (Schutz vor XSS)
│   │   ├── inspector.js                 # Detail-Drawer & Aha-Moment
│   │   ├── map.js                       # Leaflet-Karte, Marker & Routen
│   │   └── ui.js                        # Navigation, Suche, Filter, Modals
│   ├── styles/
│   │   └── main.css                     # Leaflet-CSS, Dark Theme, Animationen, Tailwind
│   └── app.js                           # Einstiegspunkt
├── index.html                           # Einstiegsseite (wird von Vite verarbeitet)
├── tailwind.config.js / postcss.config.js
├── vite.config.js                       # Übernimmt die Header aus vercel.json für `npm run preview`
└── vercel.json                          # Build-Einstellungen & Sicherheits-Header
```

## Lokaler Start

Voraussetzung: Node.js 20 oder neuer.

```bash
npm install
npm run dev
```

Anschließend die angezeigte Adresse (meist `http://localhost:5173`) im Browser öffnen.

Ein einfacher statischer Server (z. B. `python3 -m http.server`) reicht nicht mehr, weil Leaflet und Tailwind über Vite gebündelt werden.

Produktions-Build lokal testen (mit denselben Sicherheits-Headern wie live):

```bash
npm run build
npm run preview
```

## Datenprüfung

```bash
npm run validate:data
```

Geprüft werden: gültiges JSON, das Schema `public/data/schemas/resource-feature.schema.json`, projektweit eindeutige IDs und dass jede Route über `from_node_id` / `to_node_id` auf existierende Knoten verweist, deren Position zum ersten bzw. letzten Koordinatenpunkt passt. Fehlende Quell-URLs werden als Warnung gemeldet.

## Lizenz

- **Code:** MIT License (siehe [`LICENSE`](LICENSE))
- **Daten** (`public/data/geojson/`): Creative Commons Namensnennung 4.0 (CC BY 4.0), siehe [`public/data/LICENSE.md`](public/data/LICENSE.md)

Vorgeschlagene Namensnennung bei Weiterverwendung der Daten:
„Data: © The World's Resources contributors (theworldsresources.org), CC BY 4.0“
