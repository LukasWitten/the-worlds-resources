# The World's Resources

Ein interaktives, minimalistisches Open-Source-Projekt zur Visualisierung weltweiter Rohstoffströme – von der Rohstoffquelle und dem Importterminal über Transportkorridore und Raffinerien bis hin zum verarbeiteten Endprodukt im Alltag der Verbraucher.

## Projektübersicht

- **Minimalistisches Dark-Mode Design**: Dunkle Kartendarstellung, auf der fluoreszierende Leitungen und Knotenpunkte im Fokus stehen.
- **Einklappbare Seitenleiste**: Vollbild-Kartenerlebnis mit flexiblen Filtern nach Rohstoff und Infrastrukturtyp.
- **Der "Aha-Moment"**: Klick auf ein Element öffnet eine Detailansicht mit Angaben zu Betreiber, Kapazität und den konkreten Endprodukten (z. B. Kraftstoffe, Kunststoffe, Kerosin für Flughäfen).
- **MVP-Fokus**: Deutschland mit dem Rohstoff Rohöl als Machbarkeitsnachweis (Ports Wilhelmshaven & Rostock, Raffinerien Schwedt, Leuna, MiRO, TAL- und NWO-Pipelines).

## Projektstruktur

```
├── data/
│   ├── geojson/
│   │   └── germany/
│   │       └── crude_oil.geojson       # Reale GeoJSON-Daten zu Rohöl-Infrastruktur
│   └── schemas/
│       └── resource-feature.schema.json # Schema für Knoten und Kanten
├── docs/
│   └── PROJECT_SPECIFICATIONS.md        # Ursprüngliche Konzept- und Vision-Spezifikation
├── prototypes/
│   └── gemini_prototype_v1.html         # Archivierte Gemini-Prototyp-Datei
├── scripts/
│   └── validate-data.js                # Datenvalidierungsskript für GeoJSON
├── src/
│   ├── modules/
│   │   ├── dataService.js              # Laden, Filtern und Cachen der GeoJSON-Daten
│   │   ├── inspector.js                # Detail-Drawer & Aha-Moment für Verbraucher
│   │   ├── map.js                      # Leaflet-Initialisierung, leuchtende Marker & Routen
│   │   └── ui.js                       # Navigation, Suche und Filter-Events
│   ├── styles/
│   │   └── main.css                    # Dark Theme, Neon-Glow und Animationen
│   └── app.js                          # Haupt-Einstiegspunkt
├── index.html                          # Einstiegsseite der Web-App
└── package.json                        # Projektkonfiguration und Startskripte
```

## Lokaler Start

Die Anwendung nutzt native ES-Module und kann ohne Build-Schritt mit jedem lokalen Webserver gestartet werden:

```bash
# Option A: Mit Python
python3 -m http.server 8080

# Option B: Mit Node / npm (falls Vite installiert ist)
npm run dev
```

Anschließend im Browser unter `http://localhost:8080` aufrufen.

## Datenprüfung

Die GeoJSON-Dateien können mit folgendem Befehl auf formale Korrektheit geprüft werden:

```bash
node scripts/validate-data.js
```
