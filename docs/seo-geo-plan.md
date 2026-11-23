# SEO und GEO: Audit und Plan

Stand: 23.11.2026, Rev. 2 · Status: **Teil A (Audit und Plan), alle Entscheidungen getroffen.** Umsetzung (Teil B) noch nicht begonnen.
Rev. 2 übernimmt die Entscheidungen aus [vision-assessment.md](vision-assessment.md) (Abschnitt 3 und 10, Branch `claude/vision-assessment`): Story-Seiten, Bild-Export in den Präsentationsmodus, MapLibre vor der Export-Ansicht, eigener Basemap für Exporte, gemeinsame Roadmap mit Stufen B1–B4. Siehe Abschnitt 12.
Geprüft: Live-Seite `www.theworldsresources.org` (`main` c344b00), Lighthouse 12 (mobil und Desktop), ausgeliefertes HTML per `curl`, Crawler-Zugriff mit 8 User-Agents. Grundlage ist außerdem [map-extension-analysis.md](map-extension-analysis.md), kurz **EP**. Phase 0 und 1 sind auf `main` (PR #17, #19): Güterkatalog, Kartenzustand, Quellenregister, Länder-Stammdaten, BACI-Handelsdaten 2024.

Ziel: Die Seite soll von Google und Bing sowie von KI-Assistenten und KI-Suchen (ChatGPT, Claude, Perplexity, Google AI Overviews) **gefunden, gelesen, zitiert und verlinkt** werden.
Leitsatz: **Jede wichtige Information liegt als echtes HTML mit Text, Tabelle und Quelle vor, ohne dass JavaScript laufen muss.** Die Karte ist die Zugabe, nicht der Inhalt.

---

## 0. Kurzfassung

1. **Heute ist die Seite eine reine Client-App mit genau einer indexierbaren URL.** `#map`, `#sources` und `#map/<id>` sind für Suchmaschinen dieselbe Seite. Die Substanz liegt nur in GeoJSON-Dateien, die per JavaScript geladen werden: 41 Orte und 28 Routen mit Beschreibung, Kapazität und Quelle. KI-Crawler, die kein JavaScript ausführen, sehen davon nichts.
2. **Die Basis ist solide:**
   - Lighthouse SEO 100, Best Practices 100, Performance 92 (mobil) bzw. 99 (Desktop).
   - Kein Crawler wird blockiert.
   - Jeder Datensatz hat eine Quelle, die Daten sind offen (CC BY 4.0).
   - Seit heute läuft eine Besucherstatistik ohne Cookies.
3. **Empfehlung zur Technik:** ein statischer Seitengenerator, der zur Build-Zeit HTML erzeugt. Die bestehende Karte wird als nachgeladene Komponente eingebunden und **nicht umgebaut**. Für den vollen Umfang (Hunderte Entitätsseiten, Markdown-Artikel, `/de/` mit hreflang, Sitemap, Vorschaubilder) nutzen wir **Astro** (entschieden, E1).
4. **Reihenfolge nach Datenlage:**
   - Infrastruktur-Seiten und Methodik gehen sofort.
   - Ressourcenseiten werden mit den USGS-Förderdaten substanziell.
   - Länder- und Routenseiten brauchen die Handelsdaten (BACI) aus Phase 1 des Erweiterungsplans.
   - Produktseiten kommen mit dessen Phase 5.
5. **CARTO** stellt zum 1. Dezember 2026 um. Das Projekt ist nicht-kommerziell (bestätigt) und bleibt bis 5 Mio. Tile-Requests pro Monat kostenlos.

---

## 1. Audit

Legende Priorität: **P1** = Fundament, ohne das der Rest wenig bringt · **P2** = großer Hebel · **P3** = sinnvoll, später.
Aufwand in Personentagen (PT), geschätzt für die Umsetzung durch mich, ohne redaktionelle Texte (diese stehen separat).

### 1.1 Rendering und Indexierbarkeit

| Punkt | Status | Befund | Aufwand | Prio |
|---|---|---|---|---|
| SSR/SSG | **fehlt** | Statische `index.html` (47 kB) mit allen Abschnitten. Daten kommen per `fetch` aus `/data/geojson/*`. Ohne JS sind ca. 1 250 Wörter Startseiten-Text da, aber **kein Ort, keine Route, keine Zahl aus den Daten**. | 4–6 PT (Umstieg, siehe 2.) | P1 |
| Indexierbare URLs | **fehlt** | 1 URL. Ansichten nur über `#…`. Sitemap enthält nur `/`. | im Umstieg | P1 |
| Interne Links | **fehlt** | Navigation und Footer sind `<button data-section-target>`. Für Crawler gibt es keinen Pfad zu weiteren Seiten. | im Umstieg | P1 |
| Crawler-Zugriff | **vorhanden** | Googlebot, bingbot, GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended und CCBot erhalten alle HTTP 200, auch für `/data/…`. Cloudflare blockiert keine KI-Crawler. | 0 | – |

### 1.2 Entitätsseiten (Programmatic SEO)

| Punkt | Status | Datenlage | Aufwand | Prio |
|---|---|---|---|---|
| `/countries/[land]` | **fehlt** | **Daten vorhanden** seit EP Phase 1: `reference/countries.json` und `trade/2024/by-country/*` (BACI 202601). | 3 PT Vorlage | P2 |
| `/resources/[ressource]` | **fehlt** | Infrastruktur für 3 Güter vorhanden. Förderländer aus USGS (Public Domain) und Export/Abnehmer aus BACI fehlen. | 2 PT Vorlage, +1 PT USGS-Import | P2 |
| `/products/[produkt]` | **fehlt** | Lithium-Ionen-Batterie erst in Phase 5 (Rezept, Handel). | 2 PT, wenn Daten da sind | P3 |
| `/routes/[herkunft]-[ziel]-[gut]` | **fehlt** | Kuratierte Korridore für SA/KW/IQ/AE/US/CA/VE → DE (Öl) und CL → DE (Lithium) lassen sich heute ableiten (`supplyChain.corridors()` aus Phase 0). Mengen kommen aus BACI. | 1,5 PT | P2 |
| *Zusatz:* `/stories/[id]` (kuratierte Stories, Rev. 2) | **fehlt** | Story-Format `*.twr.json` existiert (W1), erste Story „Lebkuchen“ (EN + DE). Abspiel-UI kommt mit C1. | 1 PT (Text- und Bildfassung ohne JS) | P2 |
| *Zusatz:* `/infrastructure/[id]` (Orte, Pipelines, Tankerrouten) | **fehlt** | **69 kuratierte Features mit Text, Betreiber, Kapazität, Aha-Moment und Quelle, sofort nutzbar.** Das ist heute unser einzigartigster Inhalt (→ E4). | 1,5 PT | P1/P2 |
| Title, Description, H1, Einordnung, Kennzahlen, Datenjahr, Quelle, Aktualisierungsdatum, interne Links | **fehlt** | Ein globaler Title und eine globale Description | in den Vorlagen | P1 |
| Kartenzustände ↔ Seiten | **fehlt** | `mapState` (Phase 0) modelliert den Zustand im Hash (`#map?view=…`) und ist damit unsichtbar für Crawler. Das ist günstig: Filterkombinationen erzeugen **keinen** Duplicate Content (siehe 3.3). | 1 PT | P1 |
| Textbausteine (Vorlagen + redaktionelle Einordnung) | **fehlt** | siehe 4. | 2 PT Vorlagensystem; redaktionell ca. 1–2 h je Seite | P2 |

### 1.3 Technische SEO-Grundlagen

| Punkt | Status | Befund | Aufwand | Prio |
|---|---|---|---|---|
| XML-Sitemap | **teilweise** | Vorhanden, aber nur `/` und manuell gepflegt | 0,5 PT (automatisch) | P1 |
| robots.txt | **vorhanden** | `Allow: /` + Sitemap. Ausdrückliche Regeln je KI-Crawler fehlen (→ E7). | 0,25 PT | P1 |
| canonical | **teilweise** | Nur für `/` | in den Vorlagen | P1 |
| Sprechende URLs, Breadcrumbs | **fehlt** | – | in den Vorlagen | P1 |
| Überschriften-Hierarchie | **teilweise** | Eine H1, aber **alle Bereiche in einem Dokument**: H2 „🎛️ Map Controls“ (Sidebar), „Data Sources“ und „Contact“ liegen in derselben URL, H4/H5 im Impressums-Modal. Unter „How it works“ hängen H3 ohne eigene H2. | mit dem Umstieg | P1 |
| JSON-LD | **fehlt** | Kein `WebSite`, `Organization`, `Dataset`, `BreadcrumbList` oder `Article` | 1,5 PT | P1 |
| Open Graph / Twitter | **teilweise** | Global vorhanden, Bild seit PR #15 im neuen Design. Bilder je Seite fehlen. | 2 PT (automatisch erzeugt, siehe 6.3) | P2 |
| Performance / CWV | **vorhanden** | Lighthouse **mobil 92** (FCP 1,7 s, **LCP 3,3 s**, TBT 0, CLS 0), **Desktop 99**. LCP mobil ist die Hero-Karte. JS 57 kB, CSS 14 kB (gzip). Inhaltsseiten mit Text zuerst und nachgeladener Karte werden schneller sein. Die Kartenansicht selbst wurde nicht gemessen (Hash-URL). | 0,5 PT Feinschliff | P2 |
| Mobile | **vorhanden** | `width=device-width, initial-scale=1.0`, **Zoom nicht gesperrt**. Ohne Karte ist auf dem Handy heute nur die Startseite nützlich. Mit Textseiten wird das gelöst. | – | – |
| Barrierefreiheit | **teilweise** | Lighthouse **mobil 88, Desktop 92**. Fehler: (1) `aria-hidden`-Hero-Karte enthält fokussierbare Elemente, (2) **Kontrast** zu schwach bei Footer-Text (`slate-500`) und Kettenkennzahlen, (3) **Touch-Ziele** zu klein (Hero-Punkte 10 px). Alternativtexte vorhanden. **Keine einzige Datentabelle** (alles Karten/Listen). | 0,5 PT für die 3 Fehler | P1 |

### 1.4 Mehrsprachigkeit

| Punkt | Status | Befund | Aufwand | Prio |
|---|---|---|---|---|
| EN Haupt-, DE Zweitsprache mit hreflang | **fehlt** | Nur Englisch, `lang="en"`. Mit dem heutigen Stack (eine HTML-Datei) **nicht sauber machbar**. Entschieden: alle Seiten auf Deutsch über deutsche Vorlagen (E10). Mit Astro gibt es i18n-Routing (`/de/…`) und hreflang in der Sitemap eingebaut. | 2 PT Gerüst + Übersetzung je Seite | P3 (Phase 4) |

### 1.5 KI-Crawler und KI-Suchen (GEO)

| Punkt | Status | Befund | Aufwand | Prio |
|---|---|---|---|---|
| robots.txt für KI-Crawler | **teilweise** | Alles erlaubt (implizit). Optionen siehe 7.1. | 0,25 PT | P1 |
| `llms.txt` | **fehlt** | 404 | 0,25 PT (automatisch aus Seiten) | P2 |
| Zitierfähige Aussagen (Zahl, Jahr, Quelle im Satz), Zusammenfassung oben | **teilweise** | Die Aha-Texte sind gut, aber nicht im HTML. Zahlen stehen als Freitext in `capacity`, ohne Jahr im Satz. | in den Vorlagen | P1 |
| Stabile URLs | **teilweise** | `#map/<id>` ist stabil, aber nicht indexierbar. Feature-IDs sind sprechend und stabil, also gute Slugs. | Weiterleitungen 0,25 PT | P1 |

### 1.6 Vertrauen und Zitierfähigkeit

| Punkt | Status | Befund | Aufwand | Prio |
|---|---|---|---|---|
| Methodology | **fehlt** | Nur README und `docs/`. Die Inhalte gibt es zum Großteil schon im Erweiterungsplan (Kennzahlen 5.1–5.6, Provenienz 4.5). | 1 PT + Text | P1 |
| Sources & Data | **teilweise** | Hash-Abschnitt mit 4 Quellengruppen. **Widerspruch:** Dort steht „OpenStreetMap & Overpass API – exact geocoordinates“. CONTRIBUTING verbietet aber OSM-Bulk-Kopien (ODbL ≠ CC BY 4.0), und kein Feature nennt OSM als Quelle (→ E11). Destatis wird genannt, aber von keinem Feature zitiert. Tatsächlich zitiert werden v. a. U.S. EIA (≈ 30×), Betreiber, FNB Gas, BNetzA und USGS. | 1 PT (automatisch aus den Daten) | P1 |
| About | **fehlt** | – | 0,5 PT + Text | P1 |
| Impressum / Datenschutz | **vorhanden** (als Modal und GitHub-Datei) | Rechtlich erreichbar über den Footer. Besser sind eigene URLs `/legal` und `/privacy` und eine **deutsche Fassung** (Betreiber in DE). | 0,5 PT | P1 |
| „Cite this page“ (Text, BibTeX), Datenstand | **fehlt** | – | 1 PT | P3 (Phase 3) |
| Inkonsistente Quelldaten | **teilweise** | `source.year` ist mal Zahl, mal Text, mal Spanne („2020–2025“). Für „Datenjahr“ im Text muss das vereinheitlicht werden. | 0,5 PT (Schema + Daten) | P2 |

### 1.7 Funktionen für Verlinkungen

| Punkt | Status | Befund | Aufwand | Prio |
|---|---|---|---|---|
| Einbettbare Karten | **fehlt** | CSP `frame-ancestors 'none'` und `X-Frame-Options: DENY` gelten für alle Pfade. Für `/embed/*` gezielt öffnen. CARTO: Einbettung der eigenen Seite mit eigenem Key ist mit den Bedingungen vereinbar (Tiles direkt vom Browser, kein Proxy). | 2 PT | P3 |
| Daten-Download CSV/JSON | **teilweise** | GeoJSON ist frei abrufbar, aber nicht als Download angeboten. Lizenzen siehe 6.2. | 1,5 PT | P3 |
| Teilen ohne Tracking | **teilweise** | „Copy link“ im Inspector. Keine Plattform-Links, kein Web Share API. | 0,5 PT | P3 |
| Kartenansicht als Bild exportieren | **fehlt** | **Rev. 2: wandert in Stufe C1** (Story-Engine und Präsentationsmodus, PNG pro Schritt, später PPTX, MP4, GIF). Nicht mehr Teil dieses Plans. | – | – |

### 1.8 Insights

| Punkt | Status | Aufwand | Prio |
|---|---|---|---|
| Artikelstruktur (Markdown/MDX, Article-Schema, Autor, Datum, eingebettete Kartenansichten) | **fehlt** | 2 PT Gerüst, Text je Artikel 1–2 Tage | P3 (Phase 4), **ein oder zwei Artikel früher**, siehe 8. |

### 1.9 Messen

| Punkt | Status | Befund | Aufwand | Prio |
|---|---|---|---|---|
| Search Console / Bing Webmaster | **unbekannt** | Nur von deinem Konto aus prüfbar. Verifizierung am besten per **DNS-TXT in Cloudflare** (Domain-Property), dann ist keine Codeänderung nötig. | 1 h (du) | P1 |
| Analytics ohne Cookie-Banner | **vorhanden** | Vercel Web Analytics läuft seit heute ohne Cookies. Einschränkung: Hash-Routing zählt nur den ersten Aufruf, mit echten Seiten ist das gelöst. Plausible und Umami siehe E8. | 0 | – |
| IndexNow (Bing, Yandex, Seznam) | **fehlt** | Key-Datei + Ping nach jedem Deploy | 0,5 PT | P2 |

### 1.10 Was wir nicht tun

Eingehalten, und im Code-Review weiter so zu prüfen: kein Keyword-Stuffing, kein versteckter Text (**Achtung:** Die heute versteckten Abschnitte „Sources“ und „Contact“ sind ehrliche UI-Zustände und kein Spam. Mit eigenen URLs entfällt aber jede Zweideutigkeit.), keine gekauften Links, keine massenhaft generierten Seiten ohne Prüfung, keine Zahlen ohne Quelle oder ohne Kennzeichnung als Schätzung.

---

## 2. Rendering: Vorschlag

### 2.1 Optionen

| | A. **Astro** (Empfehlung) | B. Eigenes Build-Skript | C. Prerendering der App |
|---|---|---|---|
| Prinzip | Statische Seiten aus `.astro`-Vorlagen. Datenseiten über `getStaticPaths` aus JSON/GeoJSON. Die Karte ist ein **Island** und lädt erst bei Sichtbarkeit. | Node-Skript nach `vite build` schreibt `dist/<pfad>/index.html` aus Template-Funktionen | Headless-Browser fotografiert Hash-Ansichten |
| Karte | Bestehende Module werden unverändert per `<script>` importiert (Astro nutzt intern Vite) | unverändert | unverändert |
| Markdown/MDX für Insights | eingebaut (Content Collections mit Schema-Prüfung) | Bibliothek selbst einbinden (`marked`) | – |
| i18n + hreflang | eingebaut | selbst bauen | – |
| Sitemap | Integration `@astrojs/sitemap` (mit hreflang) | selbst bauen | – |
| JS im Ergebnis | 0 kB auf reinen Textseiten | 0 kB | ganze App |
| Hosting/CSP | statisch auf Vercel wie heute. Achtung: kleine Skripte nicht inline ausgeben (CSP `script-src 'self'`), das ist per Konfiguration lösbar. | wie heute | wie heute |
| Passt zu „no framework“ | Zur Laufzeit ja (kein Client-Framework). Zur Build-Zeit kommt ein Werkzeug dazu. | ja | ja |
| Aufwand Phase 1 | 4–6 PT | 4–5 PT, später mehr für i18n, MDX und Sitemap | – |
| Bewertung | Bester Fit für den Gesamtumfang | gut, solange es nur wenige Seitentypen gibt | nicht empfohlen: Hash-URLs bleiben unsichtbar, Ergebnis brüchig |

### 2.2 Zielbild Rendering

```
Build (Vercel, statisch)
├── Daten:   public/data/geojson/* · reference/goods.json, countries.json · trade/<jahr>/* · content/*.md
├── Seiten:  /, /map, /countries/…, /resources/…, /products/…, /routes/…, /infrastructure/…,
│            /insights/…, /methodology, /sources, /about, /legal, /privacy, /embed/…, /de/…
├── Bilder:  /og/<pfad>.png      (Vorschaubilder je Seite, beim Build erzeugt)
├── Dateien: /downloads/…csv|json (Datenexporte je Seite)
└── Meta:    sitemap-index.xml, robots.txt, llms.txt, IndexNow-Key
```

Aufbau jeder Datenseite (**Text zuerst, Karte danach**):

```
<header>  Navigation mit echten Links · Breadcrumbs
<main>
  <h1>       ← enthält den Suchbegriff
  <p lead>   ← 2–3 Sätze Antwort mit Zahl, Jahr, Quelle („Key facts“)
  <figure>   ← statisches Kartenbild (SVG, beim Build erzeugt) + <figcaption> mit Quelle
             ← Button „Open interactive map“ → lädt die Karte in denselben Container (Island)
  <table>    ← Kennzahlen als echte HTML-Tabelle (<caption>, <th scope>)
  <section>  ← Einordnung (Vorlage + redaktioneller Text)
  <section>  ← Verwandte Seiten
  <aside>    ← Quellen · Datenjahr · Zuletzt aktualisiert · Download · Cite this page
</main>
<script type="application/ld+json">
```

### 2.3 Übergang ohne Bruch

- **Karten-App** zieht auf `/map` um. **Alle bisherigen Links bleiben gültig:** Ein kleines Skript auf `/` leitet `/#map…` auf `/map#map…` um. Der Hash erreicht den Server nie, deshalb geht das nur im Client.
- Die **Startseite** wird eine statische Seite. Die Hero-Karte bleibt als Island, Kennzahlen und Ketten-Karten stehen im HTML.
- `#sources`, `#contact` werden zu `/sources` bzw. `/about#contact`, alte Hashes leiten weiter.
- **Abstimmung mit der laufenden Session** (`claude/supply-chain-map-export-import-3a3401`): Diese ändert gerade `index.html`, `app.js` und `ui.js`. Der Umstieg verschiebt genau diese Dateien. **Er sollte deshalb erst nach dem Merge von deren Phase 0 beginnen** (→ E2).

---

## 3. Zielarchitektur: Seiten und URLs

### 3.1 URL-Schema

| Seitentyp | URL (Beispiel) | Quelle der Daten | Ab |
|---|---|---|---|
| Startseite | `/` | Kennzahlen aus allen Daten | Phase 1 |
| Karte (App) | `/map` (+ Hash-Zustand) | – | Phase 1 |
| Methodik | `/methodology` | redaktionell | Phase 1 |
| Quellen & Daten | `/sources` | automatisch aus `sources.json` + Features | Phase 1 |
| Über uns / Kontakt | `/about` | redaktionell | Phase 1 |
| Impressum / Datenschutz | `/legal`, `/privacy` (+ `/de/impressum`, `/de/datenschutz`) | redaktionell | Phase 1 |
| Infrastruktur | `/infrastructure/tal-pipeline`, `/infrastructure/refinery-rheinland` | GeoJSON (69 Features) | Phase 2a |
| Lieferkette (kuratiert) | `/supply-chains/jet-fuel-frankfurt-airport` | Graph + kuratierter Titel | Phase 2a |
| Ressource | `/resources/lithium` | `goods.json`, USGS, BACI, GeoJSON | Phase 2a (Gerüst), 2b (Zahlen) |
| Land | `/countries/germany` | `trade/<jahr>/by-country`, `countries.json` (vorhanden) | Phase 2b |
| Route / Korridor | `/routes/chile-germany-lithium` | BACI-Fluss + kuratierter Korridor | Phase 2b |
| Produkt | `/products/lithium-ion-battery` | `recipes.json`, BACI | mit Phase 5 der Karte |
| Story (kuratiert) | `/stories/lebkuchen` (+ `/de/geschichten/lebkuchen`) | `public/data/stories/*.twr.json` | Phase 2 (B2), nur kuratierte Stories, keine Nutzerprojekte (F7) |
| Insights | `/insights/where-does-the-lithium-in-an-eu-ev-battery-come-from` | Markdown | Phase 4 (1–2 Artikel früher) |
| Einbettung | `/embed/supply-chains/jet-fuel-frankfurt-airport` | wie Seite, nur Karte + Quelle | Phase 3 |
| Downloads | `/downloads/countries/germany.csv` | wie Seite | Phase 3 |
| Deutsch | `/de/rohstoffe/lithium`, `/de/laender/deutschland` … (deutsche Pfade und Slugs) | **alle Seiten**: Datenteile aus deutschen Vorlagen, Einordnung nur wo geprüft übersetzt (E10) | Phase 4 |

Regeln:
- **Slugs aus englischen Namen** (`/countries/germany`, nicht `/countries/de`). Das ist besser lesbar und enthält den Suchbegriff. ISO-Kürzel leiten per 301 weiter (`/countries/de` → `/countries/germany`) (→ E3).
- Nur Kleinbuchstaben und `-`, kein abschließender `/` (`trailingSlash: false`, `cleanUrls: true` in Vercel).
- **Einmal veröffentlichte URLs ändern sich nie.** Umbenennungen nur mit 301 und Eintrag in einer Weiterleitungsliste im Repo.
- Routen: `/routes/[herkunft]-[ziel]-[gut]` **nur**, wenn es einen beobachteten Fluss über einer Schwelle **und** Inhalt gibt (Wert, Anteil, ggf. kuratierter Korridor). Sonst gibt es keine Seite (siehe 3.3).

### 3.2 Kartenzustand ↔ Seite

Die Seite ist die **teilbare, indexierbare Fassung** eines Kartenzustands. Die Karte verlinkt auf die Seite, die Seite in die Karte.

| Kartenzustand (`mapState`, Hash) | Kanonische Seite |
|---|---|
| `#map?view=good&good=lithium` | `/resources/lithium` |
| `#map?view=good&good=lithium&country=CL` | `/countries/chile#lithium` (Abschnitt), keine eigene Seite |
| `#map?view=trade&direction=export&country=CL` | `/countries/chile#exports` |
| `#map?view=trade&direction=import&country=DE&good=crude_oil` | `/countries/germany#imports` |
| `#map?view=trade&direction=export&country=CL&good=lithium` + Ziel DE | `/routes/chile-germany-lithium` (falls vorhanden) |
| `#map?view=product&good=li_ion_battery&…` | `/products/lithium-ion-battery` |
| `#map?view=profile&country=DE` | `/countries/germany` |
| `#map/refinery-rheinland` (Feature) | `/infrastructure/refinery-rheinland` |
| `#map?story=lebkuchen&step=3` | `/stories/lebkuchen#step-3` (jeder Schritt ist ein Abschnitt mit Anker) |

Umsetzung:
- Eine Funktion `pageFor(state)` liegt in einem gemeinsamen Modul und wird in der App **und** im Build genutzt.
- Im Inspector erscheint ein Link „About this place →“.
- Der Teilen-Button teilt die **Seiten-URL**, wo es eine gibt. Das bringt bessere Vorschaubilder und indexierbare Links.

### 3.3 Duplicate Content

- Kartenzustände stehen im **Hash** und werden nicht gecrawlt. Damit gibt es **kein** Duplicate-Content-Problem durch Filter. `/map` hat `canonical` auf sich selbst.
- Falls Zustände später als **Query-Parameter** ausgeliefert werden (z. B. für Embeds): `canonical` auf die passende Entitätsseite, sonst `noindex, follow`.
- **Mindestinhalt je Seite** (sonst wird sie nicht erzeugt bzw. bekommt `noindex`):
  - **Land:** ≥ 1 Rohstoff über der Kandidatenschwelle (Erweiterungsplan 5.1: ≥ 100 Mio. USD und N ≥ 2 % oder G ≥ 5 %).
  - **Route:** Fluss ≥ Schwelle (Vorschlag 500 Mio. USD/Jahr oder ≥ 10 % der Exporte des Guts aus dem Herkunftsland).
  - **Ressource:** in `goods.json` mit mindestens einer Zahlenquelle.
- `/embed/*`, `/downloads/*` und Druckansichten: `noindex`.
- Die `/de/`-Fassungen verweisen per hreflang gegenseitig aufeinander. `x-default` ist Englisch.

### 3.4 Interne Verlinkung

```
            ┌────────────── /resources/lithium ──────────────┐
            │  Top-Förderländer → /countries/…               │
            │  Top-Routen → /routes/…                        │
            │  Infrastruktur → /infrastructure/…             │
            │  Produkte → /products/lithium-ion-battery      │
            ▼                                                ▼
 /countries/chile ◄────► /routes/chile-germany-lithium ◄────► /countries/germany
            │                         │
            └─► /infrastructure/port-antofagasta ─► /supply-chains/…
                                  ▲
                    /insights/… verlinkt auf alle Ebenen
```

Hub-Seiten: `/countries`, `/resources`, `/routes`, `/infrastructure`, `/insights`, jeweils mit Tabelle aller Einträge. Breadcrumbs auf jeder Seite: `Home › Resources › Lithium`.

---

## 4. Textbausteine: Vorlagen plus Redaktion

**Zwei Ebenen, klar getrennt:**

| Ebene | Was | Wo | Wer |
|---|---|---|---|
| **Datengetriebene Vorlage** | Sätze mit Bedingungen, gefüllt aus Kennzahlen. Nur Aussagen, die die Zahl wirklich trägt. | `src/content/templates/*.ts` | Code, im Review geprüft |
| **Redaktionelle Einordnung** | 2–4 Absätze Kontext (Geschichte, Politik, Besonderheiten) mit Quellen | `src/content/countries/germany.md` usw. Frontmatter: `reviewed_by`, `reviewed_at`, `sources` | Mensch. Entwürfe darf ich liefern, freigegeben wird nur nach Prüfung. |

**Regeln für Vorlagen:**
- Jede Aussage hängt an einer Bedingung. Ist sie nicht erfüllt, **fehlt der Satz**, statt dass er schwammig wird.
  - `if (hhi >= 0.25)` → „Germany's {good} imports are highly concentrated: {top1} alone supplies {share1} %.“
  - `if (G >= 0.15)` → „{country} is one of the world's leading exporters of {good}, with {G} % of global exports in {year}.“
- **Jede Zahl** wird mit Jahr und Quellenkürzel ausgegeben, Schätzungen mit „estimated“ und Spanne.
- Höchstens 3–5 Vorlagensätze pro Abschnitt. Der Rest sind Tabelle und redaktioneller Text.
- Vorlagen gibt es in **Englisch und Deutsch** als eigene Dateien (`templates/en/*`, `templates/de/*`), keine Maschinenübersetzung. Jede Seite existiert in beiden Sprachen. Der redaktionelle Abschnitt erscheint auf `/de/` nur, wenn eine geprüfte deutsche Fassung vorliegt (`content/countries/germany.de.md`), sonst fehlt er (E10).
- Güter- und Ländernamen auf Deutsch kommen aus `goods.json` (`label_de`) und `countries.json` (`name_de`).

**Umfang Redaktion** (Vorschlag aus der Aufgabe):
- **30 Länder:** die größten Rohstoff-Exporteure und -Importeure nach BACI. Die Liste ergibt sich nach Phase 1 aus den Daten.
- **20 Ressourcen:** Hier gibt es eine Abweichung. Der Güterkatalog umfasst nach Phase 1 nur **7 Güter** (Rohöl, Erdgas, Lithium, Kupfer, Eisenerz, Kohle, Nickel). Für 20 Ressourcenseiten muss `goods.json` auf ca. 20 erweitert werden. Das ist dank der Pipeline technisch billig, braucht aber das HS-Mapping je Gut (→ E6).
- Aufwand Redaktion: ca. 1–2 h je Seite → **50 Seiten ≈ 8–12 Arbeitstage**, verteilt über Phase 2.

---

## 5. Vorlagen für drei Seitentypen

Alle Zahlen sind **Platzhalter** `{…}`, es gibt hier keine echten Werte.

### 5.1 Länderseite `/countries/germany`

**Title:** `Germany's main resource imports and exports ({year}) – The World's Resources`
**Description:** `Which raw materials does Germany import and export most? Crude oil, natural gas and more, by value, share and supplier – with sources ({source}, {year}).`

| Block | Inhalt | Ebene |
|---|---|---|
| H1 | Germany's most important resource imports and exports | Vorlage |
| Key facts (Zusammenfassung) | 3 Aufzählungspunkte: größter Import, größter Export, höchste Lieferantenkonzentration, jeweils mit Zahl, Jahr, Quelle | Vorlage |
| Karte | Statisches Bild „Imports by value“ + „Open interactive map“ (`#map?view=profile&country=DE`) | Build |
| Tabelle **Imports** | Gut · Wert (USD) · Anteil an allen Importen (N) · Anteil am Weltimport (G) · Top-3-Lieferanten mit Anteil · HHI | Daten |
| Tabelle **Exports** | dito | Daten |
| Einordnung | 2–4 Absätze (nur für die 30 redaktionell betreuten Länder) | Redaktion |
| Infrastruktur im Land | Liste mit Links `/infrastructure/…` | Daten |
| Verwandte Seiten | Ressourcen-, Routen- und Nachbarländerseiten, Insights | Daten |
| Quellen & Methodik | BACI {version}, USGS {jahr}, Link `/methodology#country-metrics` | Daten |
| Datenstand | „Data year {year} · Updated {date}“ | Build |
| Cite / Download / Embed | ab Phase 3 | Build |

**Textbausteine (Vorlage):**
> In {year}, Germany's largest resource import by value was {good1} ({value1}, {N1} % of all goods imports), followed by {good2} and {good3}. {if hhi1 ≥ 0.25: Supply is concentrated: {top1} provided {share1} % of Germany's {good1} imports.} Source: CEPII BACI {version}.

**JSON-LD (Beispiel):**

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://www.theworldsresources.org/countries/germany",
      "name": "Germany's most important resource imports and exports",
      "inLanguage": "en",
      "dateModified": "{date}",
      "about": { "@type": "Country", "name": "Germany", "sameAs": "https://www.wikidata.org/wiki/Q183" },
      "isPartOf": { "@id": "https://www.theworldsresources.org/#website" },
      "breadcrumb": { "@id": "https://www.theworldsresources.org/countries/germany#breadcrumb" }
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://www.theworldsresources.org/countries/germany#breadcrumb",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.theworldsresources.org/" },
        { "@type": "ListItem", "position": 2, "name": "Countries", "item": "https://www.theworldsresources.org/countries" },
        { "@type": "ListItem", "position": 3, "name": "Germany" }
      ]
    },
    {
      "@type": "Dataset",
      "name": "Germany: resource imports and exports by value, {year}",
      "description": "Imports and exports of raw materials for Germany by good and partner country, derived from CEPII BACI.",
      "license": "https://creativecommons.org/licenses/by/4.0/",
      "creator": { "@id": "https://www.theworldsresources.org/#organization" },
      "temporalCoverage": "{year}",
      "spatialCoverage": { "@type": "Country", "name": "Germany" },
      "isBasedOn": "https://www.cepii.fr/CEPII/en/bdd_modele/bdd_modele_item.asp?id=37",
      "variableMeasured": ["Import value (USD)", "Export value (USD)", "Share of total imports", "Supplier concentration (HHI)"],
      "distribution": [
        { "@type": "DataDownload", "encodingFormat": "text/csv", "contentUrl": "https://www.theworldsresources.org/downloads/countries/germany.csv" }
      ]
    }
  ]
}
```

### 5.2 Ressourcenseite `/resources/lithium`

**Title:** `Lithium supply chain map: where lithium comes from and where it goes – The World's Resources`
**Description:** `Top lithium producing and exporting countries, main buyers and the routes in between – with sources (USGS {year}, BACI {year}).`

| Block | Inhalt |
|---|---|
| H1 | Where does lithium come from? The lithium supply chain |
| Key facts | Top-3-Förderländer mit Anteil (USGS), Top-3-Exporteure (BACI), größter Abnehmer, jeweils mit Jahr |
| Karte | Statisches Bild aller Lithium-Flüsse über der Schwelle + kuratierte Infrastruktur |
| Tabelle **Production** | Land · Förderung (t) · Anteil · Reserven (USGS) |
| Tabelle **Exports** | Land · Wert · Anteil am Weltexport · Hauptabnehmer |
| Tabelle **Main buyers** | Land · Importwert · Anteil |
| Routen | Liste `/routes/…` + kuratierte Ketten `/supply-chains/…` |
| Wertschöpfung | Förderung → Verarbeitung (Carbonat/Hydroxid) → Kathode → Batterie, mit Link `/products/lithium-ion-battery` |
| Methodik-Hinweis | HS-Codes (283691, 282520), Genauigkeit `partial`: Spodumen-Konzentrat ist nicht trennbar (aus `goods.json`) |
| Einordnung | redaktionell (für die 20 betreuten Ressourcen) |
| Quellen, Datenstand, Cite, Download | wie oben |

**Textbaustein:**
> {country1} produced {share1} % of the world's mined lithium in {year}, followed by {country2} ({share2} %) and {country3} ({share3} %) (USGS Mineral Commodity Summaries {year}). Measured by exports of lithium chemicals, the largest supplier was {exp1} ({expShare1} % of world exports, CEPII BACI {year}). {if prodLeader ≠ expLeader: The difference arises because much lithium is exported as concentrate, which trade statistics do not record separately.}

**JSON-LD:** `WebPage` (about: `Thing` mit `sameAs` Wikidata „lithium“) + `BreadcrumbList` + `Dataset` (wie 5.1, `isBasedOn` USGS und BACI) + `ItemList` der Länder in der Förder-Tabelle (optional).

### 5.3 Produktseite `/products/lithium-ion-battery`

**Title:** `Lithium-ion battery supply chain: from mine to battery – The World's Resources`
**Description:** `Which raw materials go into a lithium-ion battery, where they are mined and processed, and how dependent Europe is on single countries – with sources and estimates clearly marked.`

| Block | Inhalt |
|---|---|
| H1 | The lithium-ion battery supply chain |
| Key facts | Wichtigste Rohstoffe je kWh (Rezept, kuratiert, mit Quelle), größte Abhängigkeit (modelliert, **als Spanne + „estimated“**) |
| Diagramm | Stufen Rohstoff → Raffinade → Kathode/Anode → Zelle → Pack als HTML-Liste/SVG (ohne JS lesbar) |
| Tabelle **Bill of materials** | Input · Menge je kWh · Variante (LFP / NMC811) · Quelle |
| Tabelle **Where inputs come from** | Input · Top-3-Länder · Anteil · `observed`/`modelled` |
| Karte | Statisch + interaktiv (`#map?view=product&good=li_ion_battery&direction=upstream&depth=2`) |
| Downstream | Exportwege der Batterie (= Export-Ansicht des Produkts) |
| Kennzeichnung | Legende beobachtet / modelliert / kuratiert, Link `/methodology#modelled-flows` |
| Einordnung | redaktionell |

**Textbaustein:**
> A {variant} battery needs about {qty} kg of lithium per kWh ({source}). Based on trade data, an estimated {low}–{high} % of the lithium in batteries made in Germany can be traced to {country} (modelled, depth {d}; see methodology).

**JSON-LD:** `WebPage` + `BreadcrumbList` + `Dataset` (mit `measurementTechnique`: „Modelled using the proportionality assumption, see /methodology“) und `about` → `Product`-ähnlich als `Thing` (kein `Product`-Schema, weil wir nichts verkaufen).

### 5.4 Gemeinsam auf allen Seiten

- `WebSite` + `Organization` einmal auf `/` (mit `sameAs` GitHub, später Wikidata), überall per `@id` referenziert
- `Article` auf Insights (Autor, `datePublished`, `dateModified`, `image`, `citation` der Quellen)
- Validierung: Schema.org-Validator und Google Rich Results Test je Seitentyp, im Build ein JSON-Parse-Test

---

## 6. Technische Details

### 6.1 Sitemap, robots, Meta

- `sitemap-index.xml` → `sitemap-pages.xml`, `sitemap-countries.xml` … mit `lastmod` aus dem Datenstand und hreflang-Paaren (ab Phase 4)
- Pro Seite: `<title>` ≤ 60 Zeichen, Description ≤ 155, `canonical`, `og:*`, `twitter:*`, `og:image` je Seite
- `robots.txt` aus der Entscheidung E7 erzeugt, mit `Sitemap:`-Zeile

### 6.2 Lizenzen für Downloads und Embeds

| Daten | Lizenz | Download erlaubt? |
|---|---|---|
| Eigene kuratierte Infrastruktur (GeoJSON) | CC BY 4.0 | ja (Koordinaten sind eigene Näherungen, siehe E11) |
| BACI-Aggregate (Länder, Güter, Flüsse) | Etalab 2.0 (laut CEPII-Seite) | Etalab erlaubt Weiterverbreitung mit Quellenangabe. **Lizenztext vor Phase 3 lesen und Zitierhinweis übernehmen** (Gaulier & Zignago 2010). |
| USGS-Produktion | U.S. Public Domain (USGS-Richtlinie), Quellenangabe erbeten | ja |
| EIA | U.S. Public Domain | ja |
| Betreiber- und Behördenberichte | Fakten frei, Tabellen nicht | nur unsere eigenen Angaben, keine kopierten Tabellen |
| Kuratierte Stories (`*.twr.json`) | CC BY 4.0 | ja (Rev. 2) |
| OSM-abgeleitete Netzdaten (T1, Verkehrsnetze) | ODbL | ja, aber **nur als eigene Datei mit ODbL-Hinweis**, nie in CC-BY-Downloads gemischt (W8) |
| UN Comtrade | restriktiv | **nein** (wird ohnehin nicht genutzt) |
| CARTO-Kacheln | CARTO-Bedingungen (Stand 29.09.2026) | Kacheln dürfen nicht gecacht oder per Proxy verteilt werden. Statische Bilder sind nur „illustrativ/redaktionell“ mit lesbarer Quellenangabe erlaubt. |

### 6.3 Vorschaubilder und Bild-Export (Abweichung von „Karten-Screenshot“)

- **Empfehlung: Vektor statt Kachel-Screenshot.** Vorschaubilder werden beim Build als SVG → PNG gerendert, aus Natural-Earth-Umrissen (Public Domain), unseren Routen und dem Seitentitel (z. B. mit `satori` + `resvg`, ohne Browser, funktioniert im Vercel-Build).
- **Warum:**
  - CARTO erlaubt statische Bilder nur eingeschränkt, und serverseitiges Laden von Kacheln für Hunderte Bilder ist nahe am verbotenen Caching.
  - Ein Headless-Chrome im Vercel-Build wäre langsam und schwer.
  - Vektor ist schärfer und kleiner.
- **Rev. 2:** Mit dem eigenen Basemap (Protomaps/PMTiles aus OSM, W3) können Vorschaubilder auch einen Kartenhintergrund bekommen. Das Bild ist dann ein „Produced Work“, die Quellenangabe „© OpenStreetMap“ steht im Bild. Natural-Earth-Umrisse bleiben die einfache Variante ohne Abhängigkeit.
- **„Ansicht als Bild exportieren“** gehört ab Rev. 2 zur Stufe C1 (Präsentationsmodus). Der folgende Absatz bleibt nur als Hintergrund stehen. In der App: ebenfalls Vektor (unsere Ebenen + Umrisse + Quellenangabe) als PNG/SVG. Optional mit Kacheln, falls CARTO CORS liefert. Das wäre noch zu prüfen, mit Quellenangabe im Bild (→ E9).

### 6.4 Performance-Ziele

| Seite | Ziel mobil |
|---|---|
| Textseiten | LCP < 1,5 s, 0 kB JS bis zur Interaktion mit der Karte, Lighthouse ≥ 95 in Performance, SEO und Accessibility |
| Startseite | LCP < 2,5 s. Die Hero-Karte lädt **nach** dem Text, das statische Bild ist LCP. |
| `/map` | wie heute. Daten nachladen (Partitionierung aus dem Erweiterungsplan). |

**Rev. 2, MapLibre (Stufe A2a):** MapLibre GL ist deutlich größer als Leaflet (Richtwert ca. 200 kB gzip). Umso wichtiger: Auf Text- und Startseiten lädt die Karte erst bei Sichtbarkeit oder Klick, das statische Bild ist LCP. Die CSP braucht für MapLibre zusätzlich `worker-src blob:` (Web Worker). Für den CARTO-Vektorstil und eigene PMTiles kommen die entsprechenden Hosts in `connect-src`. Das wird mit A2a geändert, nicht in B1.

---

## 7. GEO: KI-Crawler und KI-Suchen

### 7.1 robots.txt: Optionen

| Crawler | Wofür | A: alles erlauben (Empfehlung) | B: Suche ja, Training nein | C: KI aussperren |
|---|---|---|---|---|
| Googlebot | Google-Suche **und AI Overviews** | ✅ | ✅ | ✅ (sonst verschwindet die Seite aus Google) |
| Bingbot | Bing, **Copilot, ChatGPT-Suche** (nutzt u. a. den Bing-Index) | ✅ | ✅ | ✅ |
| OAI-SearchBot / ChatGPT-User | ChatGPT-Suche, Abruf auf Nutzeranfrage | ✅ | ✅ | ❌ |
| Claude-SearchBot / Claude-User | Claude-Suche, Abruf auf Nutzeranfrage | ✅ | ✅ | ❌ |
| PerplexityBot / Perplexity-User | Perplexity-Index, Abruf | ✅ | ✅ | ❌ |
| GPTBot | Training OpenAI | ✅ | ❌ | ❌ |
| ClaudeBot | Training Anthropic | ✅ | ❌ | ❌ |
| Google-Extended | Training und Grounding von Gemini. **Beeinflusst die Google-Suche und AI Overviews nicht.** | ✅ | ❌ | ❌ |
| CCBot | Common Crawl (Grundlage vieler Modelle) | ✅ | ❌ | ❌ |
| Applebot-Extended | Training Apple | ✅ | ❌ | ❌ |

**Konsequenzen:**
- **A:**
  - Die Seite fließt in Trainingsdaten ein. Modelle „kennen“ das Projekt und nennen es auch ohne Live-Suche.
  - Das passt zum Ziel und zur offenen Lizenz (CC BY 4.0). Die Namensnennung ist beim Training allerdings nicht durchsetzbar.
- **B:**
  - Zitiert wird nur, wenn eine KI live sucht. Die Attribution ist dann gut (Link in der Antwort).
  - Die Präsenz im Modellwissen bleibt dafür geringer.
- **C:** widerspricht dem Ziel.

Unabhängig davon: Die Cloudflare-Einstellungen „Block AI bots“ und „Managed robots.txt“ müssen **aus** bleiben. Heute ist das der Fall.

### 7.2 llms.txt

Automatisch beim Build erzeugt:
- Kurzbeschreibung des Projekts;
- Links zu Methodik, Quellen, Daten-Downloads und den Hub-Seiten;
- je Hub die 20 wichtigsten Einträge.

Optional `llms-full.txt` mit den Key-Facts aller Seiten als Markdown. Es ist kein offizieller Standard, kostet aber kaum etwas.

### 7.3 Zitierfähige Inhalte

- **Erster Absatz beantwortet die Frage**, vollständig und für sich lesbar (KI-Systeme zitieren gern den ersten Absatz).
- **Zahl + Jahr + Quelle im selben Satz:** „In 2024, {x} % of Germany's lithium imports came from Chile (CEPII BACI 202601).“
- Echte `<table>` mit `<caption>`, Einheiten in der Kopfzeile.
- Definitionen einmal auf `/methodology` mit Anker (`#import-dependence`), von jeder Seite verlinkt.
- „Last updated“ und „Data year“ sichtbar **und** in JSON-LD.
- Feste URLs (3.1), nie umbenennen, alte Hash-Links leiten weiter.

---

## 8. Insights

- **Struktur:** Astro Content Collection `src/content/insights/*.mdx` mit geprüftem Frontmatter (`title`, `description`, `author`, `datePublished`, `dateModified`, `sources[]`, `heroMapState`). In den Text eingebettet: `<MapView state="…" />` (statisches Bild + Island) und `<DataTable from="trade/2024/by-good/lithium" />`.
- **Article-Schema** mit `author` (Person oder Organisation, → E13), `citation`, `image` (automatisches Vorschaubild).

**Themenvorschläge** (die nötige Datenbasis steht jeweils dabei):

| # | Titel | Daten | Frühestens | Warum gut |
|---|---|---|---|---|
| 1 | How jet fuel gets to Frankfurt Airport | kuratierte Kette (heute) | **sofort** | Einzigartig, konkret, Lokalbezug, regt zum Teilen an |
| 2 | From the Atacama Desert to Lusatia: the journey of lithium for German EV batteries | kuratierte Kette + USGS | sofort / Phase 2a | Starker Suchbegriff („where does lithium come from“) |
| 3 | Through Hormuz and Suez: the sea routes of Europe's oil | EIA-Engpässe + Routen | sofort | Bei jeder Krise in der Region aktuell (Nachrichtenanlass) |
| 4 | Where does the lithium in a European EV battery come from? | Produkt-Pilot (Phase 5), vorher als Rohstoff-Text | Phase 2b/5 | Genau der Zielbegriff „lithium-ion battery supply chain“ |
| 5 | Resources Germany depends on a single country for | BACI + HHI | Phase 2b | Sehr zitierfähig, Medienthema „Abhängigkeit“ |
| 6 | Germany's gas since 2022: pipelines, LNG and storage | kuratierte Gasinfrastruktur + BACI (271111/271121 = LNG/Pipeline) | Phase 2b | Dauerthema, Bezug zu Haushalten |
| 7 | Who controls the world's critical minerals? Top-3 share for each mineral | USGS | Phase 2a | Listenformat, oft verlinkt |
| 8 | Export restrictions and tariffs: which resource flows are most exposed | BACI + Konzentration | Phase 2b | An Nachrichtenlage koppelbar (Zölle, Exportkontrollen) |
| 9 | One barrel, many products: what a German refinery makes from crude oil | Raffinerie-Knoten + `outputs` | Phase 2a | Erklärstück für Lehre und Schulen |
| 10 | Copper: from Chilean mines to German cables | BACI + USGS (Kupfer in Phase 1) | Phase 2b | Neuer Rohstoff, Ergänzung zur Lithium-Story |
| 11 | *Rev. 2:* Where the ingredients of German Lebkuchen come from | Lebkuchen-Story (vorhanden) + BACI (Kakao, Honig, Nüsse, Gewürze) | **Anfang Dezember** als Story-Seite | Saisonaler Anlass, sehr teilbar, erster Test des Story-Formats |
| 12 | *Rev. 2:* Insights aus dem Praxistest: Schokolade, E-Bike, Fairphone/iPhone | Editor-Projekte (Stufe P) | nach C2 | Produktgeschichten mit Belegen und Verlässlichkeitsangabe |

---

## 9. Messen

- **Google Search Console** und **Bing Webmaster Tools:** Domain-Property per DNS-TXT in Cloudflare (keine Codeänderung). Sitemap einreichen. Bing kann die Einstellungen aus der Search Console importieren.
- **IndexNow:** Key-Datei im Root, Ping aus dem Deploy (GitHub Action nach erfolgreichem Vercel-Deploy) mit allen geänderten URLs.
- **Analytics:** Vercel Web Analytics läuft bereits ohne Cookies und ohne Banner (→ E8 zu Plausible/Umami). Mit echten Seiten zählt jede Seite einzeln. Referrer von `chatgpt.com`, `perplexity.ai`, `claude.ai`, `copilot.microsoft.com` und `gemini.google.com` werden als eigene Gruppe ausgewertet.
- **KI-Stichprobe** alle 1–2 Monate: Die 10 Zielfragen in ChatGPT, Claude, Perplexity und Google (AI Overview) stellen und festhalten, ob und wie die Seite genannt wird (Tabelle in `docs/growth-checklist.md`).
- **Nach jeder Phase (Teil B):** HTML ohne JS (`curl`), Lighthouse (Performance, SEO, Accessibility, mobil und Desktop), JSON-LD-Validierung, Sitemap erreichbar. Kommt als Skript `npm run check:seo` in die CI.

---

## 10. Roadmap

Abhängigkeiten zum Erweiterungsplan der Karte stehen jeweils dabei („EP Phase x“).

### Phase 1: Fundament (ca. 6–8 PT) = Stufe B1

Voraussetzung erfüllt (EP Phase 0 gemergt). Läuft parallel zu A2a (MapLibre). Absprache: B1 **verschiebt** `index.html` und `app.js` in die Astro-Struktur, ändert aber nicht `map.js` und `heroMap.js`. Das ist der Bereich von A2a. Die Karte wird in B1 nur als Island eingebunden.

1. Astro-Gerüst (E1). App nach `/map`, Weiterleitung alter Hash-Links, statische Startseite mit Hero-Island.
2. Layout: Navigation und Footer mit echten Links, Breadcrumbs, Überschriften-Hierarchie, Meta-Komponente (Title, Description, canonical, OG/Twitter).
3. Sitemap automatisch, robots.txt (E7), `llms.txt`.
4. JSON-LD: `WebSite`, `Organization`, `BreadcrumbList`.
5. Seiten `/methodology`, `/sources` (automatisch aus den Daten, Widerspruch zu OSM/Destatis bereinigt, E11), `/about`, `/legal`, `/privacy` (EN + DE).
6. Barrierefreiheit: die 3 Lighthouse-Fehler beheben.
7. `npm run check:seo` (HTML ohne JS, Sitemap, JSON-LD-Parse, Lighthouse-Budget) in CI.
8. Du: Search Console und Bing einrichten (Growth-Checkliste).

### Phase 2: Entitätsseiten = Stufe B2

**2a: mit vorhandenen Daten (ca. 5–6 PT):**
- `/infrastructure/*` (69 Seiten);
- `/supply-chains/*` (3–6 kuratierte Ketten);
- `/resources/*` für 3 Güter, mit USGS-Förderdaten (**USGS-Import aus EP Phase 4 vorziehen**, E5);
- statische Kartenbilder (Vektor);
- `pageFor(state)` und Links aus der App;
- IndexNow;
- `/stories/*` für kuratierte Stories (F7), zuerst Lebkuchen. Jede Seite enthält alle Schritte als Text mit Bild ohne JS, die Abspielfunktion kommt mit C1. Entitätsseiten können eine passende Story einbetten.

**2b: mit Handelsdaten (ca. 5–7 PT; Daten liegen seit EP Phase 1 vor, die interaktiven Kartenzustände für Export/Import kommen mit A2/A3):**
- `/countries/*` (mit Schwelle);
- `/routes/*`;
- Ressourcen um BACI-Tabellen und weitere Güter erweitern (E6);
- Vorlagensystem;
- redaktionelle Texte für die 30 Länder und 20 Ressourcen, fortlaufend.

### Phase 3: Zitieren, Einbetten, Herunterladen (ca. 4–5 PT) = Stufe B3

- „Cite this page“ (Text, BibTeX, Datenstand). Optional ein Zenodo-DOI je Datenrelease.
- Downloads CSV/JSON je Seite, Lizenzhinweis je Datei (6.2).
- `/embed/*` mit eigener CSP (`frame-ancestors *`) und Snippet-Generator. Embeds können eine Story im Präsentationsmodus zeigen (nach C1). Ein späteres PowerPoint-Add-in nutzt dieselbe `/embed/`-Seite.
- Teilen-Links ohne Skripte von Drittanbietern (mailto, LinkedIn, Bluesky, X, Reddit, Web Share API).
- ~~Kartenansicht als Bild exportieren~~ → Stufe C1 (Rev. 2).
- Vorschaubilder je Seite.

### Phase 4: Insights und Mehrsprachigkeit (ca. 6–8 PT + Texte und Übersetzungen) = Stufe B4

- Insights-Gerüst mit MDX, `Article`-Schema und eingebetteten Ansichten (auch Story-Schritte). Insights aus dem Praxistest (Stufe P) kommen dazu. **Artikel 1–3 aus der Themenliste schon in Phase 2a**, als einfache Seiten.
- `/de/` mit hreflang für **alle Seiten** (E10): deutsche Vorlagen für alle Datenteile (Title, Description, Key facts, Tabellen, Kennzahlen-Sätze), deutsche Pfade (`/de/laender/…`, `/de/rohstoffe/…`, `/de/produkte/…`, `/de/routen/…`, `/de/infrastruktur/…`). Redaktionelle Einordnung und Insights nur, wo eine geprüfte Übersetzung vorliegt. Rechtstexte auf Deutsch gibt es schon ab Phase 1.
- `/products/lithium-ion-battery`, sobald EP Phase 5 (Stufe A5) Daten liefert. Rezepte nutzen dasselbe `process`-Format wie der Editor.

---

## 11. Entscheidungen

Alle Entscheidungen sind am 23.11.2026 getroffen. E10 weicht von der Empfehlung ab, alle anderen folgen ihr. E11 (OSM aus „Data Sources“ streichen) gilt als freigegeben.

Abweichungen von deinem Plan sind mit **⚠️** markiert.

| # | Frage | Empfehlung |
|---|---|---|
| E1 | Technik für SSG: **Astro** oder eigenes Build-Skript? | ✅ **Entschieden 23.11.2026: Astro.** Zur Laufzeit bleibt es framework-frei, CONTRIBUTING wird angepasst. |
| E2 | Startzeitpunkt Phase 1 | ✅ **Freigegeben 23.11.2026:** Erst nach dem Merge von EP Phase 0 (Branch `claude/supply-chain-map-export-import-3a3401`), weil beide `index.html`, `app.js` und `ui.js` ändern. Bis dahin kann ich die Inhalte schreiben (Methodik, About, Quellen) und die 3 Barrierefreiheits-Fehler beheben. |
| E3 | Länder-URLs mit Namen (`/countries/germany`) oder ISO (`/countries/de`)? | ✅ **Freigegeben 23.11.2026:** Namen, ISO-Kürzel als 301-Weiterleitung |
| E4 | ⚠️ **Zusätzlicher** Seitentyp `/infrastructure/[id]` (69 Seiten) und `/supply-chains/[id]` | ✅ **Freigegeben 23.11.2026:** Ja. Das ist heute unser bester und einzigartigster Inhalt und sofort verfügbar. `/routes/[herkunft]-[ziel]-[gut]` bleibt für Handelskorridore. |
| E5 | ⚠️ USGS-Förderdaten aus EP Phase 4 **vorziehen** (für Ressourcenseiten in Phase 2a) | ✅ **Freigegeben 23.11.2026:** Ja |
| E6 | ⚠️ **20 Ressourcen** vs. 7 Güter im Katalog nach EP Phase 1 | ✅ **Freigegeben 23.11.2026:** Zuerst 7 Seiten mit redaktionellem Text. Den Katalog in Phase 2b auf ca. 20 erweitern (Vorschlag: + Kobalt, Graphit, Mangan, seltene Erden, Bauxit/Aluminium, Uran, Gold, Gallium, Germanium, Silizium, Platin, Zinn, Zink). |
| E7 | robots.txt: Option A, B oder C (7.1) | ✅ **Entschieden 23.11.2026: A** (alle Crawler erlauben, auch Training) |
| E8 | ⚠️ Analytics: **Vercel Web Analytics behalten** statt Plausible/Umami | ✅ **Freigegeben 23.11.2026:** Behalten. Es läuft schon ohne Cookies, ohne Banner, ohne Mehrkosten und ohne CSP-Änderung. Wechsel nur, wenn du EU-Hosting (Plausible, kostenpflichtig) oder eigene Daten (Umami, selbst gehostet, braucht eine Datenbank) willst. |
| E9 | ⚠️ Vorschaubilder und Bild-Export als **Vektor statt Karten-Screenshot** | ✅ **Freigegeben 23.11.2026:** Vektor (CARTO-Bedingungen, Build ohne Browser) |
| E10 | Umfang der deutschen Fassung | ✅ **Entschieden 23.11.2026: alle Seiten unter `/de/`**, Datenteile aus deutschen Vorlagen, redaktionelle Einordnung nur wo geprüft übersetzt (sonst fehlt der Abschnitt), keine Maschinenübersetzung. Pfade und Slugs auf Deutsch. Gleiche Mindestinhalt-Schwelle wie Englisch. Zeitpunkt: Phase 4. |
| E11 | **Herkunft der Koordinaten** (Seite „Data Sources“ nennt OSM/Overpass) | Stichprobe 23.11.2026: Alle 33 Punkt-Koordinaten haben höchstens 4, meist **2 Nachkommastellen** (≈ 1 km Genauigkeit), Routen 0–2. Sie sind also **von Hand gesetzte Näherungen** und keine Übernahme von OSM-Geometrien. Ein „wesentlicher Auszug“ der OSM-Datenbank im Sinne der ODbL liegt damit nicht vor. **Empfehlung:** OSM als Datenquelle aus „Data Sources“ streichen und stattdessen schreiben: „Coordinates are approximate (≈ 1 km) and set by hand from operator information and public maps.“ OSM bleibt nur als Basiskarte (über CARTO) genannt. In CONTRIBUTING die Regel beibehalten. ✅ **Freigegeben 23.11.2026.** |
| E12 | Produktseite vor EP Phase 5? | ✅ **Freigegeben 23.11.2026:** Eine redaktionelle Vorab-Seite „Lithium-ion battery supply chain“ in Phase 2a (Stufen, Rohstoffe, Links), Zahlen erst mit Phase 5 |
| E13 | **Autorenangabe** (About, Insights): Klarname, Pseudonym oder „The World's Resources team“? | ✅ **Freigegeben 23.11.2026:** Ein Klarname stärkt das Vertrauen (E-E-A-T), ist aber deine Entscheidung. Das Impressum nennt den Betreiber ohnehin. |
| E14 | Redaktion: Wer prüft die 50 Einordnungstexte? | ✅ **Freigegeben 23.11.2026:** Ich liefere Entwürfe mit Quellen, du (oder Fachleute) gibst frei. Frontmatter `reviewed_by` ist Pflicht für die Veröffentlichung. |
| E15 | CARTO: Ist das Projekt **nicht-kommerziell** im Sinne der Bedingungen? | ✅ **Bestätigt 23.11.2026: nicht-kommerziell.** Frei bis 5 Mio. Tile-Requests pro Monat. Die Nutzung im CARTO-Konto ab und zu prüfen (Embeds erhöhen die Zahl). |

---

## 12. Abgleich mit der Vision-Bewertung (Rev. 2)

Quelle: [vision-assessment.md](vision-assessment.md), Entscheidungen F1–F15 vom 23.11.2026. Die Stufen-IDs stammen aus deren gemeinsamer Roadmap (Abschnitt 3).

**Einordnung dieses Plans in die gemeinsame Roadmap:**

| Stufe | Inhalt | Dieser Plan | Voraussetzung |
|---|---|---|---|
| **B1** | Astro-Fundament, App auf `/map` | Phase 1 | – (parallel zu A2a möglich, siehe Phase 1) |
| **B2** | Entitätsseiten 2a/2b + Story-Seiten | Phase 2 | B1. Für die interaktiven Export- und Import-Zustände zusätzlich A2/A3. |
| **B3** | Zitieren, Einbetten, Downloads (ohne Bild-Export) | Phase 3 | B2 |
| **B4** | Insights (auch aus dem Praxistest), `/de/` | Phase 4 | B2, Praxistest (P) für die Produktartikel |

**Was sich gegenüber Rev. 1 ändert:**

| # | Änderung | Grund (Vision-Bewertung) | Abschnitt hier |
|---|---|---|---|
| R1 | Neuer Seitentyp **`/stories/[id]`** für kuratierte Stories, ab B2. Nutzerprojekte aus dem Editor bekommen **keine** Seiten. | F7 | 1.2, 3.1, 3.2, Phase 2a |
| R2 | **„Kartenansicht als Bild exportieren“ wandert in Stufe C1** (Story-Engine und Präsentationsmodus; Exportreihenfolge PNG → PPTX → MP4 → GIF). Phase 3 wird kleiner. | F8, Roadmap C1 | 1.7, 6.3, Phase 3 |
| R3 | **E9 bleibt** (Vektor statt Kachel-Screenshot). Mit dem eigenen Basemap (W3) sind Vorschaubilder mit Kartenhintergrund möglich, mit Quellenangabe „© OpenStreetMap“. CARTO bleibt auf der Live-Karte (F5). | F5, W3 | 6.3 |
| R4 | **MapLibre (A2a) kommt vor der Export-Ansicht.** Für SEO heißt das: Karte als Island strikt nachladen (größeres Bundle) und die CSP für Worker und Vektor-Tiles mit A2a anpassen. B1 fasst `map.js` und `heroMap.js` nicht an. | F4, W2 | 6.4, Phase 1 |
| R5 | Kartenzustand bekommt `story` und `step` (W6). Abbildung auf `/stories/<id>#step-n`. | W6 | 3.2 |
| R6 | Länderseiten sind **datenseitig sofort möglich** (BACI 2024 auf `main`). | EP Phase 1 erledigt | 1.2, 3.1, Phase 2b |
| R7 | Neue Themen: Lebkuchen (Anfang Dezember) und Produkte aus dem Praxistest | F9, F15 | 8 |
| R8 | Datenmodell bekommt **Verlässlichkeit** (`confidence`: belegt / plausibel / geschätzt) und **Quellenliste mit Abrufdatum** (W5). Seiten zeigen die Verlässlichkeit je Element sichtbar an, die Quellen-Seite listet sie. Das erfüllt die Regel „keine Zahl ohne Kennzeichnung als Schätzung“ (1.10) auch für die Infrastruktur. | W5 | 5.x (Vorlagen), 1.10 |
| R9 | Downloads: Kuratierte Stories sind als `*.twr.json` (CC BY 4.0) herunterladbar. OSM-abgeleitete Daten (Verkehrsnetze, T1) liegen in **eigenen ODbL-Dateien** und werden getrennt angeboten. | W8 | 6.2 |
| R10 | Growth-Checkliste: Vercel Hobby nur nicht-kommerziell (F11), CLA vor dem ersten externen Pull Request (F2, W8), Wortmarke zurückgestellt (F12) | F2, F11, F12 | growth-checklist.md |

**Unverändert:** alle Entscheidungen E1–E15, das URL-Schema der übrigen Seitentypen, robots.txt (Option A), Deutsch für alle Seiten über Vorlagen (E10).

