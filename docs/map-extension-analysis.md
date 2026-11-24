# Kartenerweiterung: Export-, Import- und Ressourcen-Ansicht – Analyse

Stand: 23.11.2026 · Status: Revision 3. Phase 0 und 1 umgesetzt. Rev. 3 übernimmt die Entscheidungen aus [vision-assessment.md](vision-assessment.md) (Editor, Präsentationsmodus, Export, Verkehrsnetze, Bündelung, Lizenz). Geänderte Stellen sind mit „(Rev. 3)“ markiert.

Ziel: Die Karte wird schrittweise zu einem **Lieferketten-Atlas** ausgebaut:

| Ansicht | Einstieg | Klick auf ein Gut zeigt | Zeitpunkt |
|---|---|---|---|
| **Import** | Pro Land die 1–3 wichtigsten Import-Rohstoffe | Wege vom Zielland zurück zu allen Quellen | Phase 3 |
| **Export** | Pro Land die 1–3 wichtigsten Export-Rohstoffe | Wege von der Quelle zu allen Abnehmern | Phase 2 |
| **Ressource** | Ein Rohstoff, global oder auf ein Land gefiltert | Alle Quellen, Ziele und Routen (global gibt es das heute schon, siehe Abschnitt 2) | Phase 0 |
| **Produkt** | Ein Land → seine wichtigsten hergestellten Waren | a) **upstream**: Vorprodukte und Rohstoffe über mehrere Stufen mit Herkunftsländern · b) **downstream**: Exportwege des fertigen Produkts | Pilot in Phase 5, vollständig erst viel später, **Architektur aber jetzt** |
| **Kombinationen** | Länderprofil (Import und Export nebeneinander), Sprung vom Produkt zum Vorprodukt, Abhängigkeitsanalyse „Wie stark hängt Produkt X in Land A von Land B ab?“ | | ab Phase 4 |

Die Produkt-Ansicht ändert die Planung jetzt schon an mehreren Stellen:
1. Das zentrale Objekt ist das **Gut** (mit Stufe), nicht die Ressource.
2. Jeder Fluss bekommt eine **Herkunftskennzeichnung**.
3. Die Daten werden so **aufgeteilt**, dass sie auf hunderte Güter skalieren.
4. Der URL-Zustand wird in **Dimensionen** modelliert und nicht in festen Ansichten.

Details stehen in Abschnitt 4.1.

---

## 1. Referenz-Analyse: georesourceatlas.com

Im Browser geprüft am 23.11.2026, Desktop (1024 px) und Mobil (375 px Hochformat), inklusive Netzwerk-Requests und JS-Bundle.

### 1.1 Was die Seite tatsächlich macht

**Technik**
- Next.js (App Router, Turbopack) und **MapLibre GL** mit MapTiler-Vektor-Tiles (`dataviz-v4-dark`). Seitenhintergrund `rgb(7, 11, 18)` ≈ `#070b12`.
- **Alle Daten stecken im JS-Bundle.** Ein Chunk ist ca. 1,8 MB groß. Beim Klick auf ein Land gibt es keinen Netzwerk-Request, es werden auch keine JSON- oder GeoJSON-Dateien nachgeladen.
- Datensätze im Bundle, wie sie dort vorliegen:
  - **942 Handelsströme**, jeweils pro Herkunftsland, Ressource und Jahr:
    `{ originIso3, country, partnerCode, resourceId, hsCode, year, total, destinations: [{ iso3, country, value, share }] }`
  - Pro Land ein **Profil der Leitressource**: `{ iso3, resource, categoryLabel, dataYear, source: "UN Comtrade via World Bank WITS", measurement: "2024 destination-reported mirror-import value", productCode: "HS 750120 …", destinations: [{ country, share }] }`
  - **Unternehmen** mit Hauptsitz (ISO3) und Quell-URL sowie **Förderstätten** (`mine-site-markers`, Typen: open-pit, underground, processing, exploration).
  - Grundlage für den Status „Global leader“: `production | exports | reserves | processing | strategic-influence`. Im Tooltip steht z. B. „Iron ore · Global leader · Production · 2024“.
- HS-Codes im Bundle sind 4-stellig, z. B. 2711, 2709, 7108, 2601, 7102. Es gibt 24 Ressourcen-IDs, Jahre 2024 und 2025.
- Ländercodes sind durchgehend **ISO 3166-1 alpha-3**.

**Informationsarchitektur und UI**
- Die Landingpage besteht aus Hero, einem CTA „Explore the live atlas“, einer Live-Kartenvorschau, Kennzahlen („28 resources“, „production sites“, „verified trade flows“; die letzten beiden waren im Test ohne Zahl) und einem großen „Open map“-Button.
- Auf der Karte gibt es **genau einen Marker pro Land** (Icon der Leitressource) mit Ländernamen. Alle Marker stehen zusätzlich als Liste „Crude oil in Nigeria …“ im DOM, gut für Screenreader und SEO.
- Die **Legende („Marker guide“)** ist einklappbar und hat drei Stufen: *Major national resource* (blau), *Global leader* (goldener Ring), *Currently selected*.
- Das **Detailpanel** („Raw resource profile · 2025“) öffnet beim Klick auf ein Land rechts. Inhalt:
  ISO-Kürzel und Ländername → Kategorie („Industrial metal“) → Auswahl der Ressource (nur eine) → Auswahl des Jahres → **Top 5 Abnehmerländer** mit Gesamtwert, gestapeltem Balken, Wert und Anteil je Land → USD/GBP-Umschalter → „Top consuming companies“ → **Quelle** („UN Comtrade mirror imports“).
- Auf der Karte erscheinen dabei **Bögen** vom Land zu den Abnehmern, beschriftet mit Land und Anteil, z. B. „India 1.27%“.
- Auf dem Handy im Hochformat legt sich ein bildschirmfüllender Hinweis „Rotate your phone“ über die Karte, die Karte ist dann nicht nutzbar. Der Viewport ist auf `maximum-scale=1` gesetzt, Pinch-Zoom der Seite ist also gesperrt.

**Beobachtete Schwächen**
- **Unvollständige Daten werden als vollständig gezeigt.** Australien, Eisenerz: 2025 ergibt 10,8 Mrd. USD, Japan steht auf Platz 1 mit 44 %, **China fehlt ganz**. 2024 sind es 92,1 Mrd. USD mit China bei 86 %. Grund sind Spiegeldaten (Importmeldungen der Abnehmer), und China hatte für 2025 noch nicht gemeldet. Einen Hinweis darauf gibt es nicht.
- Pro Land gibt es nur **eine** Ressource, Importe werden gar nicht dargestellt.
- Es gibt **keine Produkte und keine mehrstufigen Ketten**. Die Seite bleibt bei „Rohstoff → Abnehmerland“. Für die Produkt-Ansicht taugt die Referenz also nicht als Vorbild. Hier betreten wir eigenes Terrain.
- Der **Kartenzustand steht nicht in der URL** (nach Klick auf ein Land bleibt `/map`), Ansichten lassen sich also nicht verlinken.
- Die Bögen sind Luftlinien und **keine Transportwege**.
- Kleinigkeiten: kaputtes Encoding im Panel-Titel („Â·“), keine Methodik-Seite, kein Impressum oder Datenschutz auf der Landingpage.
- Datenquellen werden **nur im Panel** genannt, als Kurzform. Die genauen HS-Codes und die Messmethode („mirror-import value“) stehen nur im Bundle, nicht in der Oberfläche.

### 1.2 Was wir übernehmen sollten

| Aspekt | Übernehmen | Wie bei uns |
|---|---|---|
| Ein Marker pro Land, Icon der Leitressource | ✅ | Export- und Import-Ansicht: Marker am Länder-Ankerpunkt, Farbe und Icon nach Ressource. Optional zusätzlich eine dezente Länderfläche. |
| Legende mit Stufen „national wichtig / Weltmarktführer / ausgewählt“ | ✅ | Genau so, ergänzt um Ressourcenfarben. **Unsere heutige Karte hat gar keine Legende**, das ist ein Quick Win. |
| Detailpanel: Gesamtwert, gestapelter Balken, Top-N-Liste mit Wert und Anteil | ✅ | Unser Inspector-Drawer kann das darstellen. Top 5 plus „Rest der Welt“, damit die Summe 100 % ergibt. |
| Jahresauswahl im Panel | ✅ (später) | Zuerst ein Jahr (das letzte vollständige), Auswahl in einer späteren Phase |
| Bögen mit Beschriftung „Land · Anteil“ | ✅ | Bogenbreite nach Wert. Ausdrücklich als *Handelsbeziehung* kennzeichnen, nicht als Route. |
| Quelle direkt im Panel | ✅ | Bei uns ausführlicher: Quelle, Version, Jahr, HS-Codes, Methode, Link |
| Grund für den „Global leader“-Status (Produktion/Export/Reserven) im Tooltip | ✅ | Wir zeigen die Kennzahl, die den Status begründet, z. B. „31 % des Weltexports“ |
| Barrierearme Liste aller Marker im DOM | ✅ | Liste „Ressource in Land“ als zugängliche Alternative zur Karte |
| Landingpage-Kennzahlen aus den Daten | ✅ (haben wir schon, `fillHomeStats`) | Um „Länder“ und „Handelsströme“ erweitern |

### 1.3 Was wir bewusst NICHT übernehmen

| Aspekt | Warum nicht |
|---|---|
| Unvollständige Jahre ohne Hinweis | Lieber das **letzte vollständige Jahr** zeigen. Wenn ein Jahr gezeigt wird, nennen wir die Meldeabdeckung („Daten von 143 von 190 Ländern“). |
| Quelle nur als Kurzform | Bei uns gehört zu jedem Strom eine Quelle mit Version, Jahr, HS-Codes und Methodik-Link. Das passt zu unserem Grundsatz „Every feature names its source“. |
| Sperre im Hochformat und `maximum-scale=1` | Schlecht für Barrierefreiheit. Bei uns funktioniert die Karte im Hochformat, das Panel wird dort zum Bottom-Sheet. |
| Daten im JS-Bundle | Unsere Daten bleiben **offene, statische Dateien unter `/data/`** (CC BY 4.0). Sie sind wiederverwendbar, im Review prüfbar und ohne neuen Build austauschbar. |
| Zustand nicht in der URL | Jede Ansicht bekommt eine eigene URL (siehe Abschnitt 4.4). |
| Bögen als Ersatz für Routen | Wir haben echte, kuratierte Infrastrukturrouten. Bögen zeigen *wer an wen liefert*, Routen zeigen *wie*. Beides sichtbar unterscheiden. |
| Kommerzieller Tile-Anbieter mit Key im Client (MapTiler) | Wir haben CARTO/Esri mit Referrer-Schutz. Für die Erweiterung braucht es keinen Anbieterwechsel. |
| Firmenranking ohne Daten („not available“) | Leere Abschnitte gar nicht erst zeigen |

---

## 2. Ist-Zustand unserer Implementierung

### 2.1 Stack und Komponenten

- **Vanilla JS (ES-Module), Vite 6, Tailwind 3, Leaflet 1.9** (SVG-Renderer, `divIcon`-Marker, Polylines mit CSS-Glow). Hosting auf Vercel mit strikter CSP (`connect-src 'self'`, Tiles nur von CARTO/Esri).
- Module als Singletons:

| Modul | Aufgabe |
|---|---|
| `src/app.js` | Bootstrap, lädt 5 GeoJSON-Dateien, Hash-Routing (`#home`, `#map`, `#map/<feature-id>`) |
| `modules/dataService.js` | Hält die Datensätze, Filter (Ressourcen- und Typ-Checkboxen, Suche), `viewMode` (`overview` / `oil_fields`) |
| `modules/supplyChain.js` | Gerichteter Graph aus `from_node_id`/`to_node_id`, `getChain(id)` für upstream/downstream |
| `modules/map.js` | Leaflet-Karte, Rendern von Knoten, Routen und Ölfeld-Polygonen, Hervorhebung einer Kette |
| `modules/inspector.js` | Detail-Drawer (Aha-Moment, Kettenzeitleiste, Teilen, Vollbild) |
| `modules/ui.js` | Navigation, Sidebar, Filter-Checkboxen, Suche, Basemap-Dialog |
| `modules/heroMap.js` | Nicht-interaktive Karte auf der Startseite mit wechselnden Beispielketten |
| `modules/colors.js` | Routenfarben |

### 2.2 Wie die heutige „Ressourcen-Ansicht“ wirklich funktioniert

Eine echte Ressourcenauswahl („eine Ressource wählen, alle Quellen und Ziele sehen“) gibt es heute **nicht als eigene Ansicht**. Es gibt:
- **Checkboxen** je Ressource (Rohöl, Gas, Lithium) und je Infrastrukturtyp, alle standardmäßig aktiv, also eine Mehrfachauswahl.
- Den Modus **„Oil Fields“**, der Ölfelder und die Rohölkette isoliert.
- **Klick auf einen Knoten oder eine Route** hebt die zugehörige Lieferkette hervor (Graph-Traversierung upstream/downstream).

Die Ressourcen-Ansicht aus dem Zielbild lässt sich daraus schnell ableiten (siehe Roadmap Phase 0). Formal ist sie heute aber kein eigener Zustand.

### 2.3 Datenmodell

Daten liegen ausschließlich in `public/data/geojson/` (5 Dateien, 156 KB). Validiert werden sie gegen `public/data/schemas/resource-feature.schema.json` (`npm run validate:data`, auch in CI).

| Datei | Knoten | Routen | Inhalt |
|---|---|---|---|
| `germany/crude_oil` | 13 | 7 | Häfen, Raffinerien, Pipelines in DE (plus Triest) |
| `germany/natural_gas` | 9 | 3 | LNG, Speicher, Fernleitungen in DE |
| `global/lithium` | 4 | 3 | Atacama → Antofagasta → Hamburg → Schwarzheide |
| `global/oil_export_corridors` | 7 | 15 | Exportterminals SA, KW, IQ, AE, VE, US, CA und Tankerrouten nach Europa |
| `global/oil_fields` | 8 Polygone | – | Große Ölfelder als stilisierte „Seen“ |

Felder pro Feature: `id, name, resource, category (node|edge), type, status, country, operator, capacity, length_km, flow_direction, summary, description, consumer_products, supply_chain_stage, aha_moment, source{name,url,year}` und bei Routen `from_node_id`, `to_node_id`.

Bewertung entlang der Fragen aus der Aufgabe:

| Frage | Befund |
|---|---|
| **Ressourcen** | Fest als Enum im Schema (`crude_oil, natural_gas, hydrogen, copper, lithium, gold, water`). Farben, Labels und Icons sind **an drei Stellen hart kodiert** (`colors.js`, `inspector.js`, `heroMap.js`, dazu `index.html`). Einen zentralen Ressourcenkatalog gibt es nicht. |
| **Länder** | Nur als freier String `country` an Knoten, faktisch ISO alpha-2 (`DE`, `SA`, …) plus Sonderwert `INT`. Bei Routen fehlt `country` meist oder ist `INT`. Keine Stammdaten, keine Ländergeometrien. |
| **Routen** | Gerichtete **Infrastruktur-Kanten** zwischen zwei Knoten (Pipeline, Schiffsroute, Bahn) mit eigener Geometrie (LineString, Zwischenpunkte von Hand gesetzt). |
| **Mengen und Werte** | Nur als **Freitext** in `capacity` („approx. 20 million tonnes per year“). Nicht maschinenlesbar, ohne Einheit und ohne Bezug auf einen tatsächlichen Fluss. |
| **Jahre** | Nur `source.year` (Jahr der Quelle) und `metadata.last_updated`. Kein Bezugsjahr eines Flusses. |
| **Transportarten** | Implizit über `type` (pipeline / shipping_route / rail_corridor). |
| **Routengeometrien** | Vorhanden, handgezeichnet, „educational simplifications“. |
| **Laden** | `fetch` aller 5 Dateien beim Start (`app.js`), danach alles im Speicher. |

### 2.4 Ist eine Route als gerichteter Fluss modelliert?

**Nein.** Eine Route ist heute ein *Stück Infrastruktur* und kein *Handelsstrom*:

- Es gibt kein Tupel `(Ressource, Herkunftsland, Zielland, Menge/Wert, Jahr)`.
- Herkunfts- und Zielland lassen sich nur **indirekt über den Graphen** ermitteln. Beispiel: `ship-houston-northsea` endet am Transitpunkt `crude-origin-north-sea` (Land `INT`). Dass am Ende Rohöl **USA → Deutschland** fließt, ergibt sich erst über zwei weitere Kanten bis zur Raffinerie.
- Der Graph ist **auf Deutschland zugeschnitten**. Herkunftsländer: SA, KW, IQ, AE, VE, US, CA (Öl), CL (Lithium). Zielländer: DE, Triest (IT) nur als Transit. Eine Export-Ansicht hätte heute **8 Länder mit je einem Abnehmer**, eine Import-Ansicht nur **Deutschland**.
- Mengen fehlen. Ein Ranking „wichtigste Ressource“ lässt sich daraus nicht berechnen.

Der Graph ist trotzdem wertvoll: Er beschreibt *wie* eine Ressource transportiert wird. Die Export- und Import-Ansicht brauchen zusätzlich die Information *wer wie viel an wen* liefert. Das ist eine **zweite, statistische Ebene**, kein Ersatz für die erste (siehe Abschnitt 4).

### 2.5 Länder-Stammdaten

Fehlen vollständig: keine ISO-Code-Tabelle (alpha-2/alpha-3/numerisch), keine Namen, keine Regionen, keine Ankerpunkte für Marker, keine Ländergeometrien für eine Choroplethen-Darstellung.

### 2.6 Zustand und URL

Der Zustand ist **über vier Singletons verteilt**:
- `uiController.currentSection`: Seitenbereich
- `dataService.viewMode`, `dataService.activeFilters`: Modus, Checkboxen, Suche
- `inspector.currentFeature` / `currentChain`: geöffnetes Feature
- `mapController.highlight`: hervorgehobene Kette

In der URL stehen nur Bereich und Feature (`#map/refinery-schwedt`), geschrieben per `history.replaceState`. Der Zurück-Button springt also nicht zwischen Features. Filter, Modus und Suche gehen beim Teilen verloren. Ein zentraler Zustand mit Ereignissen fehlt: `ui.js` ruft `refreshMap()` direkt auf, `app.js` verdrahtet Callbacks zwischen Inspector und Karte.

---

## 3. Lücken: Was für Export- und Import-Ansicht fehlt

| # | Lücke | Schwere | Betrifft |
|---|---|---|---|
| L1 | **Kein Flussmodell** `(Ressource, Herkunft, Ziel, Wert, Menge, Jahr, Quelle)` | blockierend | Datenmodell |
| L2 | **Keine Handelsdaten** für die meisten Länder. Der Graph deckt 9 Länder ab, fast nur Richtung Deutschland. | blockierend | Daten, Pipeline |
| L3 | **Keine Länder-Stammdaten** (ISO-Codes, Namen, Ankerpunkte) | blockierend | Datenmodell |
| L4 | **Keine Ländergeometrien** | nur für Choropleth nötig, Marker reichen zunächst | Daten |
| L5 | **Kein zentraler Ressourcenkatalog** (Label, Farbe, Icon, HS-Codes, Einheit). Werte sind an 3–4 Stellen dupliziert. | hoch (jede neue Ressource heißt heute 4 Dateien anfassen) | Code |
| L6 | **Kein zentraler Kartenzustand**, URL bildet nur das Feature ab | hoch | Architektur |
| L7 | **Keine Datenpipeline** für Fremddaten. Heute wird alles von Hand gepflegt. | hoch | Tooling, CI |
| L8 | Keine **Verbindung zwischen Statistik und Infrastruktur**. Zu „USA → DE Rohöl“ gehört keine Route. | mittel | Datenmodell |
| L9 | Kein Rendering für **Bögen** und **Länder-Marker**, keine **Legende** | mittel | Karte |
| L10 | Ressourcen-Enum enthält nur 7 Werte. Für Export/Import sind mindestens Kupfer, Eisenerz, Kohle, Nickel, Kobalt usw. sinnvoll. | mittel | Schema |
| L11 | Schema kennt keine Mengen- und Jahresfelder an Routen (`capacity` ist Freitext) | niedrig (für die Statistikebene nicht nötig) | Schema |

Zusätzliche Lücken durch die Produkt-Ansicht:

| # | Lücke | Schwere | Betrifft |
|---|---|---|---|
| L12 | **Kein Güterbegriff mit Stufe.** `resource` ist ein Enum aus Rohstoffen. Produkte wie Diesel oder Kathodenmaterial stehen nur als Freitext in `consumer_products`. | blockierend für die Produkt-Ansicht, **jetzt billig zu beheben** | Datenmodell |
| L13 | **Kein Rezept- bzw. Stücklisten-Graph** („Gut A ist Input für Gut B“) | blockierend für upstream/downstream | Datenmodell, Daten |
| L14 | **Keine Produktionsdaten** (wer stellt was in welcher Menge her) | blockierend für modellierte Mehrstufen-Herkunft | Daten |
| L15 | **Keine Herkunftskennzeichnung.** Beobachtet, modelliert und kuratiert sind heute nicht unterscheidbar. | hoch, muss **vor** den ersten Fremddaten feststehen | Datenmodell, UI |
| L16 | **Datenmenge.** BACI hat auf HS6-Ebene ca. 5 000 Güter und ca. 10 Mio. Zeilen pro Jahr. Das passt nicht in eine Datei im Browser. | hoch für die Produkt-Ansicht, für Rohstoffe unkritisch | Architektur, Hosting |
| L17 | **Infrastruktur kennt keine Umwandlung.** Eine Raffinerie macht aus Rohöl Diesel, im Modell ist sie nur ein Endknoten. | niedrig, später | Schema |

**Nicht nötig:** ein Wechsel der Kartenbibliothek. Leaflet schafft ca. 200 Länder-Marker, einige Dutzend Bögen und optional ca. 250 vereinfachte Länderpolygone (Natural Earth 1:110m, ca. 100–200 KB) problemlos. MapLibre wird erst bei Vektor-Tiles, großen Datenmengen oder WebGL-Animationen interessant (siehe Phase 4). Auch die CSP muss nicht geändert werden, solange alle Daten als statische Dateien unter `/data/` liegen.

---

## 4. Vorschlag Datenmodell

### 4.1 Bewertung der Architektur-Leitlinien

| # | Leitlinie | Bewertung | Anpassung und Begründung |
|---|---|---|---|
| 1 | **Einheitliches Güter-Modell** mit Stufe, Kategorie, HS-Code; Ansichten 1–3 filtern auf `stage = raw` | ✅ übernehmen, **sofort (Phase 0)** | Der Umbau kostet heute fast nichts (3 Ressourcen), später müsste jede Datei, jedes Schema und jede URL umbenannt werden. Vier Präzisierungen folgen unter der Tabelle. |
| 2 | **Einheitliches Flussmodell** (Gut, Herkunft, Ziel, Menge/Wert, Jahr, optional Transportart und Geometrie) | ✅ übernehmen, mit einer Änderung | **Die Geometrie gehört nicht in den Fluss**, sie wird nur per Verweis (`corridor_ids`) angebunden. Eine Pipeline trägt Flüsse vieler Länder, ein Fluss nutzt mehrere Routen. Eine eigene Geometrie pro Fluss würde dieselbe Linie hundertfach kopieren. Bögen ohne Korridor entstehen im Client aus den Länder-Ankerpunkten. Die **Transportart** ist optional und meist unbekannt: BACI hat keine. Beobachtbar ist sie nur bei Gas (LNG vs. Pipeline über den HS-Code) und für EU-Handel (Eurostat Comext). |
| 3 | **Produktionsdaten** | ✅ notwendig, Datenlage aber sehr ungleich | Für Rohstoffe gut (USGS CC0, EIA Public Domain), für Zwischen- und Endprodukte schlecht: Eurostat PRODCOM nur für die EU, UN Industrial Commodity Statistics lückenhaft. Bis dahin dienen **Exporte als Ersatz**, und die UI sagt das („gemessen an Exporten“). Eigene Tabelle `production`, gleiche Form wie Flüsse, nur ohne Zielland. |
| 4 | **Rezept- bzw. Stücklisten-Graph** „A ist Input für B“, optional mit Mengenanteil | ✅ übernehmen, um **Varianten** erweitern | Rezepte hängen von der Technologie ab: Eine LFP-Batterie braucht kein Nickel und kein Kobalt, eine NMC-Batterie schon. Es gibt außerdem Koppelprodukte (Raffinerie: ein Input, viele Outputs). Rezept ist daher eine eigene Entität mit `variant`, optionalem Variantenanteil je Land und einer Quelle. Kuratierte Rezepte müssen zyklenfrei sein, der Validator prüft das. Sektorale Input-Output-Tabellen kommen erst später für die Breite (siehe 5.4). |
| 5 | **Herkunftskennzeichnung** beobachtet vs. modelliert, mit Quelle und Jahr | ✅ übernehmen, um **„kuratiert“** erweitern | Unsere handgezeichneten Pipelines und Tankerrouten sind weder Handelsstatistik noch Hochrechnung, sondern redaktionell recherchiert. Das gilt auch für Rezepte aus Fachliteratur. Drei Werte: `observed` · `modelled` · `curated`. Sichtbarkeit in der UI siehe 4.5. |
| 6 | **Zentraler, URL-fähiger Kartenzustand** (view, country, good, direction, depth, year) | ✅ übernehmen | Der Satz endet im übermittelten Text bei „Damit“. Angenommen ist: damit Ansichten verlinkbar und kombinierbar sind. Zu beachten: `direction` mischt zwei Dinge. **import/export** ist *eine Handelsstufe* eines Landes (beobachtet), **upstream/downstream** ist eine *Traversierung des Rezept-Graphen* (mehrstufig, modelliert). Ein gemeinsamer Parameter funktioniert trotzdem, weil jede Ansicht nur eines der beiden Paare nutzt (siehe 4.7). |

Präzisierungen zu Leitlinie 1 (Güter-Modell):
- **Ein Gut ist nicht dasselbe wie ein HS-Code.** Ein Gut bündelt 1 bis n HS6-Codes (Lithium = 283691 + 282520). Manche Güter haben gar keinen eigenen Code: Kathodenmaterial ist in 2841/2842/3824 versteckt, Batteriezelle und Batteriepack fallen beide unter 850760. Deshalb wird `hs.precision` mit `exact | partial | none` angegeben.
- **Die Stufe beschreibt die typische Position, nicht die Wahrheit.** Kupferkathode ist das Endprodukt der Hütte, aber Vorprodukt für Kabel. Die echte Kette steht im Rezept-Graphen.
- Als Vorschlag für die Stufe dient **UN BEC Rev.5**: Jeder HS6-Code ist dort nach primär/verarbeitet und Vorleistung/Investition/Konsum eingeordnet. Der Vorschlag wird kuratiert, nicht blind übernommen.
- **Hierarchie** über `parent` (Kupfer → Kupfererz, Kupferkathode), damit sich Güter für die Rohstoff-Ansichten zusammenfassen lassen.

Zusätzlich nötig, obwohl in keiner Leitlinie genannt:

| # | Ergänzung | Warum |
|---|---|---|
| 7 | **Statische, vorberechnete und partitionierte Dateien** | BACI hat auf HS6-Ebene ca. 10 Mio. Zeilen pro Jahr. Die Pipeline rechnet, der Browser lädt pro Ansicht höchstens 2–3 kleine Dateien. So bleibt Hosting ohne Server möglich (siehe 4.3). |
| 8 | **Quellenregister** `sources.json` | Jede Zeile verweist auf eine `source_id` statt Quelle, Version und Lizenz zu wiederholen. Das hält die Dateien klein und die Quellenangabe vollständig. |
| 9 | **HS-Revision festhalten** | HS-Codes ändern sich alle 5 Jahre (HS17 → HS22 → HS28). Güter verweisen auf Codes *mit* Revision, BACI wird durchgehend in einer Revision bezogen. |
| 10 | **Infrastruktur und Güter verbinden** | Verarbeitungsknoten bekommen optional `inputs` und `outputs` (Raffinerie Schwedt: `crude_oil` → `diesel`, `jet_fuel`, …). Dann ist der Knoten die physische Instanz eines Rezepts, und die Produkt-Ansicht kann reale Werke zeigen. |

### 4.2 Überblick: drei Ebenen, eine Abfragelogik

```
┌──────────────────────────────────────────────────────────────────────┐
│ Referenz        goods · countries · recipes · sources                  │
│                 (was es gibt, woraus es besteht, woher die Angabe ist) │
├──────────────────────────────────────────────────────────────────────┤
│ Statistik       flows       (good, from, to, year, value, qty, prov.) │
│                 production  (good, country, year, qty, prov.)         │
│                 → observed aus BACI/USGS, modelled aus der Pipeline    │
├──────────────────────────────────────────────────────────────────────┤
│ Infrastruktur   GeoJSON-Knoten + Routen (curated), Graph               │
│                 → abgeleitete Korridore (good, Land A → Land B, ids)   │
│                 → Verarbeitungsknoten mit inputs/outputs (später)      │
└──────────────────────────────────────────────────────────────────────┘
```

Jede Ansicht ist eine Abfrage auf diese Ebenen. Es gibt keine eigene Datenstruktur pro Ansicht:

| Ansicht | Abfrage |
|---|---|
| Export-Weltkarte | Ranking je Land über `flows` mit `from = c`, `stage = raw` (vorberechnet) |
| Export, Klick auf Gut | `flows` mit `from = c`, `good = g` → Bögen, Korridore falls vorhanden |
| Import | dasselbe mit `to = c` |
| Ressource (global / Land) | `flows` mit `good = g` [und `from = c` oder `to = c`] + Infrastruktur mit `good = g` |
| Produkt: Liste eines Landes | `production` mit `country = c`, `stage ≠ raw` (bis dahin Ersatz: Exporte) |
| Produkt: **downstream** | `flows` mit `from = c`, `good = g`. **Das ist derselbe Code wie die Export-Ansicht**, nur für ein Nicht-Rohstoff-Gut. |
| Produkt: **upstream** | Rezept(g) rekursiv × Versorgungsmix je Input in c (und in den Lieferländern) → `modelled` (siehe 4.5) |
| Abhängigkeit „X in A von B“ | Anteil von B im upstream-Baum von (A, X) |
| Länderprofil | `exportsOf(c)` + `importsOf(c)` nebeneinander |

Daran zeigt sich, dass das Modell trägt: Produkt-downstream braucht **keinen neuen Code**, wenn die Export-Ansicht generisch für Güter gebaut ist und nicht für „Ressourcen“.

### 4.3 Dateien und Partitionierung

```
public/data/
├── reference/
│   ├── goods.json              # Güterkatalog mit Stufe, HS-Codes, Darstellung (Phase 0)
│   ├── sources.json            # Quellenregister (Phase 0)
│   ├── countries.json          # Länder-Stammdaten (Phase 1)
│   ├── countries-110m.geojson  # Natural Earth, vereinfacht (Phase 1, ca. 150 KB)
│   └── recipes.json            # Rezepte und Stücklisten (Phase 5)
├── trade/<jahr>/
│   ├── meta.json               # Quelle, Abdeckung, Liste der verfügbaren Güter
│   ├── world.json              # Leitgut je Land für Export- und Import-Weltkarte (eine Datei)
│   ├── by-good/<good>.json     # alle bilateralen Flüsse eines Guts
│   └── by-country/<CC>.json    # Profil: Top-Exporte/-Importe, Summen, N, G, HHI
├── production/<jahr>.json      # Produktion je Land und Gut (Phase 4/5)
├── schemas/                    # je Dateityp ein Schema
└── geojson/…                   # unverändert, alles curated
scripts/
├── validate-data.js            # erweitert
└── pipeline/
    ├── build-trade.js          # BACI-CSV → trade/<jahr>/…
    └── build-production.js     # USGS/EIA → production/<jahr>.json
```

Warum diese Aufteilung und nicht eine Datei `flows-2024.json` wie in Revision 1:

| Ansicht | Lädt |
|---|---|
| Export- oder Import-Weltkarte | `world.json` (ca. 20 KB) |
| Klick auf ein Land | `by-country/CL.json` (ca. 5–20 KB) |
| Klick auf ein Gut | `by-good/copper.json` (ca. 50–300 KB) |
| Produkt upstream, Tiefe 3 | Rezept + `by-good/<input>.json` je Input, also ca. 5–15 Dateien, nachgeladen beim Aufklappen |

Mit 7 Rohstoffen wäre eine einzige Datei noch klein genug. Die Struktur wird aber jetzt festgelegt, damit sie bei 300 Gütern nicht umgebaut werden muss.

**Grenze dieser Lösung:** Sollen Nutzer später beliebige Güter oder Jahre frei kombinieren können, reicht vorberechnetes JSON nicht mehr. Die nächste Stufe ohne eigenen Server wäre **Parquet und DuckDB-WASM** im Browser (Abfragen per HTTP-Range-Request auf statische Dateien; CSP bräuchte `wasm-unsafe-eval` und `worker-src blob:`). Für Phasen 0–5 ist das nicht nötig.

### 4.4 Schemas (Beispiele)

Alle Zahlen in diesem Abschnitt sind nur Beispielwerte.

**`goods.json`**: ersetzt die geplante `resources.json`. Die bestehenden IDs (`crude_oil`, `natural_gas`, `lithium`) bleiben gleich, damit die GeoJSON-Daten unverändert gültig sind.

```json
{
  "lithium": {
    "label": "Lithium", "stage": "raw", "category": "critical_mineral",
    "hs": { "rev": "HS17", "codes": ["283691", "282520"], "precision": "partial",
            "note": "Spodumene concentrate (253090) is not separable and not included." },
    "unit": "t",
    "style": { "color": "#c084fc", "icon": "🔋" }
  },
  "cathode_material": {
    "label": "Battery cathode material", "stage": "intermediate", "category": "battery",
    "hs": { "precision": "none" },
    "unit": "t"
  },
  "li_ion_battery": {
    "label": "Lithium-ion battery", "stage": "intermediate", "category": "battery",
    "hs": { "rev": "HS17", "codes": ["850760"], "precision": "exact" },
    "unit": "t"
  }
}
```

Zur Stufe `raw`: Gemeint ist ein Rohstoff im Sinne der Karte, also **gefördert oder erstverarbeitet** (Rohöl, Erzkonzentrat, Lithiumcarbonat), so wie USGS ihn zählt. Streng nach BEC wäre Lithiumcarbonat schon „verarbeitet“. Die Definition steht im Methodik-Text.

**`sources.json`**

```json
{
  "baci-202601": { "name": "CEPII BACI", "version": "202601", "license": "Etalab-2.0",
                   "url": "https://www.cepii.fr/CEPII/en/bdd_modele/presentation.asp?id=37" },
  "usgs-mcs-2026": { "name": "USGS Mineral Commodity Summaries 2026", "license": "CC0-1.0",
                     "url": "https://doi.org/10.5066/P1WKQ63T" }
}
```

**Fluss** (logisch, gespeichert im Spaltenformat):

```js
{ good: 'copper', from: 'CL', to: 'CN', year: 2024,
  valueUsd: 2.1e10, qty: 6.1e6, qtyUnit: 't',
  mode: null,                 // 'sea' | 'pipeline' | 'rail' | 'road' | null (unbekannt)
  corridorIds: [],            // Verweis auf Infrastruktur, keine eigene Geometrie
  provenance: { kind: 'observed', sourceId: 'baci-202601' } }
```

```json
{
  "meta": { "year": 2024, "provenance": { "kind": "observed", "sourceId": "baci-202601" },
            "minFlowUsd": 1000000 },
  "columns": ["from", "to", "valueUsd", "qty"],
  "rows": [["CL", "CN", 21000000000, 6100000], ["CL", "JP", 4100000000, 1200000]]
}
```

Die Provenienz steht einmal pro Datei und nur bei Abweichung pro Zeile. Ströme unter `minFlowUsd` werden je Herkunftsland zu „Rest der Welt“ (`to: "ZZ"`) zusammengefasst, damit Anteile weiter 100 % ergeben.

**Produktion**

```js
{ good: 'copper', country: 'CL', year: 2024, qty: 5.3e6, qtyUnit: 't',
  provenance: { kind: 'observed', sourceId: 'usgs-mcs-2026' } }
```

**Rezept** (Phase 5)

```json
{
  "id": "li_ion_battery.nmc811",
  "output": "li_ion_battery", "variant": "NMC811",
  "per": { "qty": 1, "unit": "kWh" },
  "inputs": [
    { "good": "cathode_material", "qty": 1.4, "unit": "kg" },
    { "good": "graphite",         "qty": 1.0, "unit": "kg" },
    { "good": "copper",           "qty": 0.6, "unit": "kg" }
  ],
  "provenance": { "kind": "curated", "sourceId": "…" }
}
```

Optional gibt es je Land Variantenanteile (`{ "CN": { "LFP": 0.7, "NMC811": 0.3 } }`). Fehlen sie, gilt ein globaler Mix, und die UI zeigt das an.

**Ergänzungen (Rev. 3, aus [vision-assessment.md](vision-assessment.md), Abschnitt 2 und 4):**
- **Projektdatei `*.twr.json`** (W1): ein offenes, versioniertes Format für Stories, Editor-Projekte und Beiträge, mit eigenem Schema `project-1.schema.json`. Rezepte nutzen denselben Aufbau wie `process` (Inputs → Outputs) in der Projektdatei.
- **Wegpunkte als Knoten** (W4): `kind: waypoint` bzw. GeoJSON-Point mit `type: waypoint`, `visible: false`. Routen dürfen an Wegpunkten beginnen und enden und nennen sie in `via_node_ids`. Mehrere Routen über dieselben Wegpunkte teilen sich ein Teilstück; dieses wird einmal gezeichnet, Breite nach Summe der Mengen.
- **Verkehrsträger** (W5): `mode` = `sea` | `pipeline` | `rail` | `road` | `inland_waterway` | `air` an jeder Route. `type` bleibt als Darstellungsart.
- **Verlässlichkeit und Quellen** (W5): `confidence` = `documented` | `plausible` | `estimated` (UI: belegt, plausibel, geschätzt) an jedem Knoten und jeder Kante, dazu `sources` als Liste mit `url` und Abrufdatum `accessed`. Das bisherige Feld `source` bleibt gültig. `confidence` ergänzt `provenance.kind`: Diese sagt, *wie* eine Zahl entstand, `confidence`, *wie sicher* eine Aussage ist.
- **ODbL getrennt halten** (W8): Aus OSM abgeleitete Daten (Verkehrsnetze, eingerastete Routen) nur in eigenen Dateien mit eigener Lizenzangabe, nie in den CC-BY-Datensätzen.

### 4.5 Mehrstufige Herkunft (upstream): Methode und Kennzeichnung

Mehrstufige Herkunft ist **nicht messbar**, nur schätzbar. Der Standardansatz (wie bei OECD TiVA) ist die **Proportionalitätsannahme**: Ein Land verwendet ein Vorprodukt im selben Länder-Mix, in dem es das Vorprodukt bezieht.

Für Land A, Produkt X mit Rezept-Inputs *i* und Gewichten *wᵢ*:

```
Anteil_B(X in A) = Σᵢ wᵢ · Mix_B(i in A)

Mix_B(i in A) = [ Produktion_i(A)·[B = A] + Import_i(A ← B) ] / [ Produktion_i(A) + Import_i(A) ]
```

Bei Tiefe > 1 wird jeder Lieferant C von *i* durch dessen eigenen Mix der Vorprodukte von *i* ersetzt, rekursiv bis `depth` oder bis zur Stufe `raw`.

Konsequenzen für Daten und UI:

| Situation | Was wir zeigen dürfen | Kennzeichnung |
|---|---|---|
| Nur Handelsdaten, Tiefe 1 | „Von Deutschlands **Importen** an Lithium kommen 60 % aus Chile“ | `observed`, ausdrücklich „Importmix, nicht Gesamtversorgung“ |
| Handel + Produktion, Tiefe 1 | „Deutschlands **Versorgung** mit Lithium …“ | `modelled`, Tiefe 1 |
| Tiefe 2–3 | „Geschätzt stammen 35–45 % des Lithiums in in Deutschland gebauten Batterien aus Chile“ | `modelled`, Tiefe, Annahme, **Spanne statt Punktwert** |
| Tiefe > 3 | nicht anbieten | Unsicherheit wird zu groß |

Sichtbarkeit in der UI:
- **observed**: durchgezogene Linie
- **modelled**: gestrichelte Linie mit Badge „geschätzt“
- **curated**: heutiger Glow-Stil

Jede modellierte Zahl ist gerundet oder als Spanne angegeben. Im Panel gibt es einen „Wie berechnet?“-Link auf eine Methodik-Seite. Die Legende erklärt die drei Linienarten.

**Wo gerechnet wird:** Im Pilot (Phase 5) im Browser, weil nur wenige Güter und Länder beteiligt sind. Beim Ausbau in der Pipeline, mit Ausgabe nach `trade/<jahr>/upstream/<CC>/<good>.json`.

**downstream** ist einfacher. Tiefe 1 entspricht der Export-Ansicht des Produkts (beobachtet). Tiefe > 1 (wohin geht die Batterie als Teil eines Autos) ist die umgekehrte Rezept-Traversierung. Das ist modelliert und kommt später.

### 4.6 Verbindung zur Infrastruktur-Ebene (Korridore)

Das bestehende Schema bleibt. Aus dem Graphen leiten wir **Korridore** ab: Für jede Kette vom Startknoten (Förderstätte, Ölfeld, Exportterminal) bis zum Endknoten (Raffinerie, Verarbeitung) ergibt sich `(good, country(start), country(ende), [feature-ids])`. Transitpunkte mit Land `INT` werden übersprungen.

Ergebnis mit heutigen Daten, z. B.:
- `crude_oil, SA → DE`: Ghawar → Ras Tanura → Mittelmeer → Triest → TAL → Bayernoil
- `lithium, CL → DE`: Atacama → Antofagasta → Hamburg → Schwarzheide

Klickt man in der Export-Ansicht auf „Saudi-Arabien → Deutschland“, zeigt die Karte statt des Luftlinienbogens die **echte Route**, sofern ein Korridor existiert. Der Mehrwert gegenüber der Referenz wächst so mit jeder kuratierten Route.

Für die Produkt-Ansicht kommen später optionale Felder an Verarbeitungsknoten dazu: `inputs: [good]` und `outputs: [good]`. **BASF Schwarzheide** (`lithium` → `cathode_material`) ist heute schon das Ende unserer Lithiumkette und damit die natürliche Brücke zum Pilotprodukt Batterie. Das GeoJSON-Feld `resource` bleibt aus Kompatibilitätsgründen bestehen und muss eine gültige Güter-ID sein. Der Validator prüft das gegen `goods.json` statt gegen das heutige Enum.

### 4.7 Zentraler Zustand und URL

Ein kleines Modul `modules/mapState.js` ohne Framework, als einfacher Store mit `get()`, `set(patch)` und `subscribe(fn)`. Der Zustand besteht aus **Dimensionen**, die Ansicht bestimmt nur, wie sie dargestellt werden:

```js
{ view:      'trade' | 'good' | 'product' | 'profile',
  direction: 'export' | 'import' | 'upstream' | 'downstream' | null,
  country:   'DE' | null,
  good:      'lithium' | null,
  depth:     1..3,
  year:      2024,
  feature:   'refinery-schwedt' | null,   // bestehender Deep Link
  story:     'lithium-atacama' | null,    // Rev. 3: kuratierte Story oder Auto-Story einer Ansicht
  step:      1..n | null }                // Rev. 3: Schritt der Story
```

**Story (Rev. 3):** Eine Story ist eine Folge von Schritten (Kamera, neu sichtbare und hervorgehobene Elemente, Text, Dauer), siehe [vision-assessment.md](vision-assessment.md) 1.2. Export- und Import-Ansicht erzeugen ihre Story automatisch. `story` und `step` ändern sich per `pushState`, damit jeder Schritt verlinkbar ist. Was die Karte zeigt, berechnet eine Funktion `frameAt(state, story, t)` aus einer Zeitleiste `t` (W7). Das gilt für die Live-Karte, den Bild-Export und den Video-Export gleichermaßen.

| Ansicht (UI-Name) | URL | Gültige `direction` |
|---|---|---|
| Export | `#map?view=trade&direction=export&country=CL&good=copper` | export |
| Import | `#map?view=trade&direction=import&country=DE&good=natural_gas` | import |
| Ressource | `#map?view=good&good=lithium` · mit Land: `…&country=CL` | – |
| Produkt | `#map?view=product&country=DE&good=li_ion_battery&direction=upstream&depth=2` | upstream, downstream |
| Länderprofil | `#map?view=profile&country=DE` | – (beide Seiten) |
| bisher | `#map`, `#map/refinery-schwedt` | **bleibt kompatibel** |

Weil Land und Gut beim Wechsel der Ansicht erhalten bleiben, entstehen Kombinationen ohne Sonderlogik:
- Export → Import: `direction` umschalten, gleiches Land, gleiches Gut.
- Produkt upstream → Klick auf Vorprodukt Lithium → `view=good&good=lithium&country=DE`.
- Länderprofil → Klick auf einen Import → `view=trade&direction=import&country=DE&good=…`.

Regeln:
- Ungültige Kombinationen werden normalisiert, wie heute bei unbekannten Feature-IDs.
- Wechsel von `view`, `country` oder `good` nutzen `pushState`, der Zurück-Button funktioniert also.
- `depth`, `year` und Hover nutzen `replaceState`.
- In der UI heißt ein Gut der Stufe `raw` weiterhin „Ressource“, sonst „Produkt“. Intern gibt es nur `good`.
- Feature-IDs enthalten nur `[a-z0-9_-]`, `?` kollidiert also nicht mit dem bestehenden `#map/<id>`.

---

## 5. Definition der Kennzahlen

Grundlage ist der **Handelswert in USD**. Mengen in Tonnen sind zwischen Ressourcen nicht vergleichbar (1 t Gold ≠ 1 t Kohle), werden aber in der Ressourcen-Ansicht mit angezeigt. Pro Kennzahl wird der **Durchschnitt der letzten 3 vollständigen Jahre** verwendet, weil Öl- und Gaspreise stark schwanken. Angezeigt wird das letzte vollständige Jahr.

### 5.1 Export

Für Land *c* und Ressource *r*, X = Exportwert:

| Kennzahl | Formel | Bedeutung | Entspricht bei der Referenz |
|---|---|---|---|
| **Nationale Bedeutung** N | X(c,r) / X(c, alle Waren) | „Kupfer macht 25 % der Exporte Chiles aus“ | „Major national resource“ |
| **Globale Bedeutung** G | X(c,r) / X(Welt, r) | „Chile liefert 27 % des weltweiten Kupferexports“ | „Global leader“ |
| **Kombinierter Score** S | √(N · G) | Geometrisches Mittel: hoch nur, wenn beides relevant ist | – |

Der Nenner von N ist der **gesamte Warenexport** des Landes (BACI, alle HS-Codes) und nicht nur die Summe unserer Ressourcen. Nur so ist „25 % der Exporte“ eine ehrliche Aussage.

**Auswahl Top 1–3 je Land:**
1. Kandidaten: Ressourcen mit X(c,r) ≥ 100 Mio. USD **und** (N ≥ 2 % **oder** G ≥ 5 %). So entsteht kein Rauschen bei Kleinstaaten.
2. Sortierung nach S. Es werden bis zu 3 angezeigt, manche Länder haben also nur 1 oder 2, manche keine (dann bleibt der Marker grau oder fehlt).
3. **Global-leader-Ring**, wenn G ≥ 15 % **oder** Rang 1 unter allen Exporteuren dieser Ressource.
4. Auf der Weltkarte steht Platz 1 als Marker, im Panel alle bis zu 3 mit N, G, Wert und Rang weltweit.

### 5.2 Import

Analog mit M = Importwert:

| Kennzahl | Formel | Bedeutung |
|---|---|---|
| Nationale Bedeutung N_imp | M(c,r) / M(c, alle Waren) | Anteil an der Importrechnung |
| Globale Bedeutung G_imp | M(c,r) / M(Welt, r) | „Größter Abnehmer der Welt“ |
| Score S_imp | √(N_imp · G_imp) | wie oben |
| **Lieferantenkonzentration** (Zusatz) | HHI = Σ (Anteil Lieferant)² | 0–1. Ab ca. 0,25 hohe Abhängigkeit von wenigen Ländern. Wird im Panel angezeigt, nicht für das Ranking genutzt. |

Später, mit Produktionsdaten (Phase 4): **Importabhängigkeit** = Nettoimport / (Produktion + Nettoimport). Das ist die eigentlich interessante Größe („Deutschland importiert 98 % seines Rohöls“). Sie braucht aber Produktionszahlen je Land und Ressource.

### 5.3 Fallstricke und wie wir damit umgehen

| Problem | Beispiel | Umgang |
|---|---|---|
| **Re-Exporte und Drehscheiben** | Niederlande (Rotterdam) als „Ölexporteur“, Schweiz und UK bei Gold, Singapur | Flag `re_export_hub`, wenn die eigene Förderung ≈ 0 ist (Abgleich USGS / Energy Institute). In der Export-Ansicht ausblenden oder als „Handelsplatz“ kennzeichnen. |
| **Unvollständige Jahre** | Referenz: China fehlt 2025 | Nur Jahre zeigen, für die BACI vollständig ist. BACI hinkt 1–2 Jahre hinterher, ist dafür abgeglichen. |
| **Gold** | Geldgold (HS 7108.20) und Barren über Raffinerie-Drehscheiben | Nur nicht-monetäres Gold 7108.12/13. Drehscheiben-Flag wie oben. |
| **Sanktionen und fehlende Meldungen** | Russland, Iran, Venezuela | BACI ergänzt Spiegeldaten. Trotzdem im Panel „Daten unvollständig“ zeigen, wenn die Meldungen des Landes selbst fehlen. |
| **Taiwan, Kosovo, Westsahara** | Comtrade-Code 490 „Other Asia, nes“ | Explizites Mapping in `countries.json`. Bei Grenzdarstellung die Natural-Earth-Standardversion nutzen und einen Hinweis zu umstrittenen Gebieten geben. |
| **Preisschwankung** | Gas 2022 | 3-Jahres-Mittel für das Ranking |

### 5.4 Datenquellen

| Quelle | Inhalt | Lizenz | Einsatz |
|---|---|---|---|
| **[CEPII BACI](https://www.cepii.fr/CEPII/en/bdd_modele/presentation.asp?id=37)** | Bilateraler Handel, HS 6-stellig, Wert (USD) und Menge (t), ca. 200 Länder, Export- und Importmeldungen **abgeglichen** | **Etalab Open Licence 2.0** (Nutzung mit Quellenangabe frei, verträglich mit CC BY 4.0) | **Hauptquelle** für `flows`. Erscheint jährlich im Januar. Version 202501 reicht bis 2023, für 202601 gibt es Release Notes, Jahresabdeckung (vermutlich bis 2024) vor Nutzung prüfen. |
| [UN Comtrade](https://comtradeplus.un.org/) | Rohdaten der Meldeländer, aktueller als BACI | Restriktiv: massenhafte Weiterverbreitung nur mit Erlaubnis. Für öffentliche, kostenlose Visualisierungen gibt es Ausnahmen. | Nur zum Gegenprüfen und für neuere Jahre. Nicht als Rohdatei ins Repo legen. |
| [World Bank WITS](https://wits.worldbank.org/) | Oberfläche für Comtrade (nutzt die Referenzseite) | wie Comtrade | nicht nötig |
| **[USGS Mineral Commodity Summaries 2026](https://www.usgs.gov/data/mineral-commodity-summaries-2026-data-release)** | Weltproduktion und Reserven je Land für ca. 90 Mineralien, 2021–2025 | **CC0** (Data Release) | „Global leader“ bei *Produktion* und *Reserven*, Erkennung von Drehscheiben, Importabhängigkeit (Phase 4) |
| [EIA International](https://www.eia.gov/international/data/world) | Öl- und Gasproduktion, Verbrauch | US Public Domain | Produktion Öl/Gas (USGS deckt Energie nicht ab) |
| [Energy Institute Statistical Review](https://www.energyinst.org/statistical-review) | Öl-, Gas- und LNG-Handelsströme zwischen Regionen, Produktion | Nutzung mit Quellenangabe, Lizenz vor Weiterverbreitung prüfen | Plausibilitätsprüfung für Energie |
| [Eurostat Comext](https://ec.europa.eu/eurostat/comext/) | EU-Handel **mit Verkehrsträger** (See, Straße, Bahn, Pipeline) | frei, Eurostat-Reuse-Policy (CC BY 4.0) | Transportarten für Ströme in die EU (Phase 7) |
| **[Natural Earth](https://www.naturalearthdata.com/)** Admin 0, 1:110m | Ländergrenzen, Label-Punkte, ISO-Codes | **Public Domain** | `countries-110m.geojson`, `anchor` in `countries.json`. Achtung: `ISO_A3` ist bei Frankreich und Norwegen `-99`, deshalb `ISO_A3_EH` / `ADM0_A3` nutzen. |

Zusätzliche Quellen für die Produkt-Ansicht:

| Quelle | Inhalt | Lizenz | Einsatz |
|---|---|---|---|
| [UN BEC Rev.5](https://unstats.un.org/unsd/classifications/Econ) | Einordnung jedes HS6-Codes nach primär/verarbeitet und Vorleistung/Investition/Konsum | UN-Klassifikation, frei nutzbar | Vorschlag für `stage` im Güterkatalog. Basiert auf HS 2012, Umschlüsselung über die UNSD-Korrespondenztabellen. |
| [Eurostat PRODCOM](https://ec.europa.eu/eurostat/web/prodcom) | Industrieproduktion nach Produkt, Menge und Wert | Eurostat-Reuse-Policy (CC BY 4.0) | Produktion von Zwischen- und Endprodukten, **nur EU** |
| [UN Industrial Commodity Statistics](https://unstats.un.org/unsd/industry/commodity/) | Produktionsmengen je Land und Produkt, weltweit, lückenhaft | vor Nutzung prüfen | Produktion außerhalb der EU (Phase 6) |
| [JRC FIGARO](https://data.jrc.ec.europa.eu/dataset/fb80c0df-2254-4890-bd07-9fecd9a252a1) | Input-Output-Tabellen zwischen Ländern, ca. 64 Branchen, EU plus wichtige Partner | **CC BY 4.0** | Breite, aber grobe sektorale Abhängigkeiten (Phase 6) |
| [OECD ICIO](https://www.oecd.org/en/data/datasets/inter-country-input-output-tables.html) | Input-Output-Tabellen, 76 Länder plus Rest der Welt, 45 Branchen | **unklar**, auf der Seite nicht angegeben | nur nach Klärung der Lizenz |
| [EXIOBASE 3](https://zenodo.org/records/18937492) | Multiregionale Input-Output-Tabellen mit Produkt-Detail | ab v3.9 **nur nicht-kommerziell** | **nicht geeignet**, weil unvereinbar mit CC BY 4.0 für unsere Daten |
| Fachliteratur (Behörden, Studien, Herstellerangaben) | Rezepte und Materialanteile (z. B. kg Lithium pro kWh) | je Quelle | `recipes.json`, `curated`. Übernommen werden nur Zahlen mit Quellenangabe, keine Tabellen. |

### 5.5 HS-Mapping für unsere Ressourcen

HS 2017/2022, 6-stellig wo nötig. Bestehende Ressourcen fett, sinnvolle Ergänzungen kursiv.

| Ressource | HS-Codes | Bemerkung |
|---|---|---|
| **crude_oil** | 2709 | Nur Rohöl. Produkte (2710) bewusst separat, sonst werden Raffinerie-Drehscheiben zu „Ölexporteuren“. |
| **natural_gas** | 271111 (LNG), 271121 (gasförmig = Pipeline) | Die zwei Codes liefern **gleich die Transportart** (Schiff vs. Pipeline) |
| **lithium** | 283691 (Lithiumcarbonat), 282520 (Lithiumoxid/-hydroxid) | Spodumen-Konzentrat (Australien!) steckt in 253090 zusammen mit anderen Mineralien. Daher Lücke, als Hinweis im Panel und per USGS-Produktion ergänzen. |
| **copper** | 2603 (Erze/Konzentrate), 7402 (Rohkupfer), 7403 (raffiniert) | Optional getrennt in „Erz“ und „Metall“ (Kette Chile → China) |
| **gold** | 710812, 710813 | ohne Geldgold (710820) |
| **hydrogen** | 280410 | Handel kaum messbar. Ammoniak (2814) als Träger. Für Phase 1 weglassen. |
| **water** | – | nicht sinnvoll über Handelsstatistik. Aus dem Schema-Enum entfernen oder ignorieren. |
| *iron_ore* | 2601 | |
| *coal* | 2701 | |
| *nickel* | 2604, 7501, 7502 | |
| *cobalt* | 2605, 810520 | DR Kongo exportiert v. a. Hydroxid unter 282200 oder 810520, Mapping prüfen |
| *bauxite / aluminium* | 2606 / 7601 | |
| *rare_earths* | 280530, 2846 | |
| *uranium* | 284410, 261210 | |

Das Mapping steht in `goods.json` und wird im Panel unter „Methodik“ angezeigt.

### 5.6 Kennzahlen für Produkte und Abhängigkeiten

| Kennzahl | Formel | Bedeutung | Provenienz |
|---|---|---|---|
| **Wichtigste hergestellte Waren** (Übergang) | Exportwert, N und G wie in 5.1, zusätzlich **RCA** (Balassa) = (X(c,g)/X(c)) / (X(Welt,g)/X(Welt)) | Worauf ist ein Land im Vergleich zur Welt spezialisiert. Ehrlich beschriftet als „gemessen an Exporten“, weil für den Inlandsmarkt Produziertes fehlt. | observed |
| **Wichtigste hergestellte Waren** (Ziel) | Produktionswert je Gut aus PRODCOM / UN ICS | Echte Produktion | observed |
| **Importmix** | Import(A ← B, g) / Import(A, g) | Anteil von B an A's Importen eines Guts | observed |
| **Versorgungsmix** | wie 4.5 mit Produktion | Anteil von B an A's gesamter Versorgung | modelled (Tiefe 1) |
| **Abhängigkeit** „X in A von B“ | Anteil von B im upstream-Baum, Tiefe d | Wie stark hängt ein Produkt über mehrere Stufen an einem Land | modelled, Spanne |
| **Konzentration** im upstream-Baum | HHI über die Länderanteile auf Tiefe d | Klumpenrisiko | modelled |

Die Rezeptgewichte *wᵢ* werden **wertbasiert** bestimmt, also nach dem Anteil an den Materialkosten. Dafür werden die physischen Mengen aus dem Rezept mit dem mittleren Einheitswert aus BACI multipliziert (Wert / Menge). Rein mengenbasierte Gewichte würden Massengüter wie Graphit überbewerten und Kobalt unterbewerten.

---

## 6. Roadmap

### 6.1 Was sich gegenüber Revision 1 ändert

| Revision 1 | Revision 2 (mit Produkt-Ansicht) | Wann es zählt |
|---|---|---|
| `resources.json` | **`goods.json`** mit Stufe, HS-Revision und Genauigkeit | Phase 0, sonst später Umbenennung überall |
| URL-Parameter `resource` | **`good`**, dazu `direction` und `depth` | Phase 0 |
| Fluss ohne Herkunftsangabe | **`provenance`** (observed/modelled/curated) und Quellenregister | Phase 1, vor den ersten Fremddaten |
| eine Datei `flows-YYYY.json` | **partitioniert** nach Gut und Land plus Weltdatei | Phase 1 |
| Pipeline für 7 Rohstoff-HS-Codes | Pipeline **gesteuert von `goods.json`**, beliebige HS6-Güter | Phase 1 |
| Export-Ansicht für „Ressourcen“ | Export-Ansicht **generisch für Güter** (wird später zu Produkt-downstream) | Phase 2 |
| – | Phasen 4–6: Kombinationen, Produkt-Pilot, Ausbau | neu |

Nichts davon verzögert die ersten Phasen spürbar. Es sind Namens- und Strukturentscheidungen, die jetzt wenig kosten und später teuer wären.

### 6.2 Phasen

**Phase 0: Quick Wins mit vorhandenen Daten (ca. 2–3 Tage)**: ✅ umgesetzt am 23.11.2026. `sources.json` wurde auf Phase 1 verschoben, weil es erst mit den ersten Fremddaten eine Verwendung hat.
1. **`goods.json` und `sources.json`** mit den 3 bestehenden Rohstoffen. Die Duplikate in `colors.js`, `inspector.js` und `heroMap.js` werden ersetzt. Der Validator prüft `resource` gegen den Katalog statt gegen das Enum.
2. **`mapState.js`** mit allen Dimensionen aus 4.7. Genutzt werden zunächst nur `view=good`, `good`, `country` und `feature`. `#map/<id>` bleibt kompatibel.
3. **Ressourcen-Ansicht als echter Modus**, global oder auf ein Land gefiltert (Knoten im Land und Ketten, die das Land berühren). Die Checkboxen bleiben als Modus „alle Ressourcen“.
4. **Legende** für die heutige Karte, mit den Linienarten aus 4.5 schon vorbereitet (heute nur „curated“).
5. **Korridore ableiten** (`supplyChain.corridors()`).

**Phase 1: Fundament (ca. 1,5 Wochen)**: ✅ umgesetzt am 23.11.2026. Abweichungen: Länder-Geometrien entfallen vorerst, weil Marker gewählt wurden (`countries.json` enthält dafür den Label-Punkt als `anchor`). Daten nur für 2024 mit Ranking über 2022–2024. Dazu `sources.json` aus Phase 0 und `trade/index.json` für das neueste Jahr.
6. **Länder-Stammdaten und Geometrien** aus Natural Earth.
7. **Pipeline `build-trade.js`**: BACI → `trade/<jahr>/` (world, by-good, by-country), Provenienz, Rest-der-Welt-Zeilen. Gesteuert von `goods.json`. Die BACI-Rohdaten liegen nicht im Repo, nur die erzeugten Dateien.
8. **Validierung** aller neuen Dateien (Schemas, ISO-Codes, Summen, Quellen-IDs existieren).
9. **`dataService` mit Fluss-API**: `exportsOf`, `importsOf`, `flowsOf(good, {country})`. Lädt Dateien bei Bedarf und speichert sie zwischen.
10. **4–5 weitere Rohstoffe** im Katalog (Vorschlag: Kupfer, Eisenerz, Kohle, Nickel).

**Weichen und Zwischenstufen vor Phase 2 (Rev. 3)**, Details in [vision-assessment.md](vision-assessment.md) Abschnitt 2 und 3:
- **L: Lebkuchen-Beitrag** (Anfang Dezember 2026): Projektformat W1 vorziehen, Renderskript für Bilder pro Schritt, Gewürze, Mandeln, Haselnüsse, Honig und Kakao in Katalog und Pipeline, Bilder-Karussell für Social Media.
- **W: Weichen** W4–W8: Wegpunkte als Knoten, `mode` und `confidence`, `story`/`step` im Kartenzustand, Zeitleisten-Regel, Lizenz und CLA (MIT + CLA, Daten CC BY 4.0).
- **A2a: MapLibre GL statt Leaflet** (aus Phase 7 vorgezogen, F4), zunächst mit dem CARTO-Vektorstil. Eigener Basemap (Protomaps/PMTiles) als Option für Export und offline (F5). Darstellung gemeinsamer Teilstücke über Wegpunkte.

**Phase 2: Export-Ansicht (ca. 1 Woche)**, ✏️ Rev. 3: auf MapLibre, liefert eine Auto-Story mit
11. Ansichtsumschalter, Länder-Marker nach Leitgut, „Global leader“-Ring, Legende.
12. Länderpanel mit Top 1–3, Bögen nach Wert, echte Route falls ein Korridor existiert.
13. Mobil: Bottom-Sheet, kein Rotations-Zwang.
14. **Generisch für Güter bauen**, nicht für Ressourcen. Dann kostet Produkt-downstream später fast nichts.
14a. (Rev. 3) Bögen laufen kurz vor Ziel bzw. Quelle leicht gebündelt zusammen. Kein allgemeines Edge Bundling.
14b. (Rev. 3) Die Ansicht erzeugt ihre Story (Land → Leitgut → Abnehmer nacheinander), noch ohne Abspiel-UI.

**Phase 3: Import-Ansicht (ca. 3–4 Tage)**
15. Gleiche Komponenten mit `direction=import`, dazu die Lieferantenkonzentration (HHI).

**C1 (Rev. 3, neu): Story-Engine und Präsentationsmodus (ca. 1,5 Wochen)**: Stories abspielen (Website-Ansichten und kuratierte Ketten), PNG-Export pro Schritt (16:9, 4:5, 9:16). Ersetzt „Ansicht als Bild exportieren“ aus SEO Phase 3.

**Phase 4: Kombinationen I und Produktion der Rohstoffe (ca. 1 Woche)**
16. **Länderprofil** mit Import und Export nebeneinander, Wechsel zwischen den Ansichten ohne Kontextverlust.
17. **Produktionsdaten der Rohstoffe** (USGS, EIA) → `production/<jahr>.json`. Damit werden „Global leader“ nach Produktion, die Erkennung von Re-Export-Drehscheiben und der **Versorgungsmix** möglich, nicht nur der Importmix.
18. **Abhängigkeit, Tiefe 1**: „Woher kommt Deutschlands Erdgas?“ als Versorgungsmix mit Kennzeichnung.

**C2 (Rev. 3, neu): Editor-MVP (ca. 3–4 Wochen)**: ersetzt [MINI_EDITOR_PLAN.md](MINI_EDITOR_PLAN.md). Leere Karte oder „In Editor öffnen“, Knoten, Wegpunkte, Kanten, eigene Güter mit `process`, Quellen und Verlässlichkeit je Element, Story-Schritte, Datei speichern und laden, PNG- und PPTX-Export. Danach Praxistest: Schokolade, Lebkuchen, E-Bike, Fairphone/iPhone.

**C3 (Rev. 3, neu): Video-Export (1–2 Wochen)**: MP4 in 16:9 und 9:16, GIF. Bild für Bild aus der Zeitleiste gerendert (WebCodecs, Mediabunny), Basemap ohne CARTO.

**Phase 5: Produkt-Pilot (ca. 2–3 Wochen)**
19. **Ein Pilotprodukt** mit kuratiertem Rezept in 2–3 Stufen und Varianten. Vorschlag: **Lithium-Ionen-Batterie**, weil unsere Lithiumkette schon im Kathodenwerk Schwarzheide endet.
20. Zusätzliche Güter im Katalog (Kathodenmaterial, Graphit, Nickel, Kobalt, Mangan, Batterie), dazu die passenden Handelsdaten aus der Pipeline.
21. **upstream** modelliert bis Tiefe 3 (im Browser), **downstream** Tiefe 1 als Export-Ansicht des Produkts.
22. UI für die Provenienz: Linienarten, Badge „geschätzt“, Spannen, **Methodik-Seite**.
23. Verarbeitungsknoten bekommen `inputs`/`outputs` (zuerst Schwarzheide und die Raffinerien). ✏️ Rev. 3: im gleichen Aufbau wie `process` in der Projektdatei.

**C4 (Rev. 3, neu): Editor als PWA und Beitragen (1–2 Wochen)**: offline mit eigenem Basemap, Projekt → Prüfung → Issue/PR, Katalog-Vorschläge. Vorher muss die CLA stehen.

**T1 (Rev. 3, neu): Verkehrsnetze als Ebenen**: Hochgeschwindigkeitsstrecken und Autobahnen aus eigenen Vektordaten (Natural Earth für die Weltkarte, OSM-Auszug für Details, ODbL-Datei getrennt). Keine fremden Kacheln.

**Phase 6: Produkt-Ansicht ausbauen (fortlaufend)**
- Liste der wichtigsten hergestellten Waren je Land: zuerst über Exporte (RCA), dann PRODCOM (EU) und UN Industrial Commodity Statistics.
- Weitere Produkte mit kuratierten Rezepten (z. B. Diesel und Kerosin aus der bestehenden Ölkette, Smartphone, Windturbine).
- Abhängigkeitsanalyse für beliebige Paare (Produkt, Land A, Land B).
- Breite, aber grobe Abhängigkeiten über sektorale Input-Output-Tabellen (JRC FIGARO).
- Vorberechnung der upstream-Bäume in der Pipeline. Erst bei Bedarf: Parquet und DuckDB-WASM.

**Phase 7: Langfristig**
- Jahresauswahl und Zeitreihen
- Transportarten (LNG/Pipeline, Eurostat Comext)
- Choropleth
- Seewege statt Luftlinien
- ~~MapLibre und Vektor-Tiles~~ → vorgezogen (A2a, Rev. 3)
- Förderstätten und Unternehmen, nur mit Quelle (Rev. 3: Unternehmen öffentlich nur mit Verlässlichkeit „belegt“, F10)
- (Rev. 3) Einrasten und Routing auf Verkehrsnetzen (T2): Schiene und See im Browser, Straße erst mit einem Server
- (Rev. 3) Live-Einbettung in PowerPoint (Add-in), Desktop-App (Tauri) nur bei Bedarf, Accounts nur mit einem konkreten Grund

### 6.3 Offene Entscheidungen

| # | Frage | Empfehlung | Entscheidet über |
|---|---|---|---|
| 1 | Datenquelle Handel | **Nur BACI** (Lizenz passt zu CC BY 4.0, abgeglichen, HS6 für alle Güter, Mengen in t). Comtrade nur zum Gegenprüfen. | Phase 1 |
| 2 | Rohstoffe zum Start | Die 3 bestehenden **plus Kupfer, Eisenerz, Kohle, Nickel** | Phase 1, ob die Weltkarte gefüllt ist |
| 3 | Darstellung Export/Import | **Marker** zuerst, Choropleth später | Phase 2 |
| 4 | Score | **Geometrisches Mittel √(N·G), fest** | Phase 2 |
| 5 | Pilotprodukt | **Lithium-Ionen-Batterie** (baut auf der Lithiumkette und Schwarzheide auf) | Phase 5, welche Rohstoffe in Phase 1 sinnvoll sind |
| 6 | Quelle der Rezepte | **Kuratiert aus Fachliteratur** mit Quelle je Rezept. Input-Output-Tabellen erst in Phase 6. | Phase 5 |
| 7 | Hosting | **Statisch bleiben** (partitionierte Dateien). Kein eigenes Backend. | Architektur |
| 8 | Leitlinie 6 endet bei „Damit“ | Gibt es weitere Leitlinien oder Anforderungen nach diesem Satz? | ggf. Abschnitt 4.7 |

**Entschieden am 23.11.2026:**
- 1: nur BACI
- 2: Rohöl, Erdgas, Lithium plus Kupfer, Eisenerz, Kohle, Nickel
- 3: Marker
- 5: Lithium-Ionen-Batterie

**Noch offen:** 4, 6 und 7. Bis zu einer anderen Entscheidung gilt die Empfehlung. Ebenfalls offen ist 8, der Rest der Leitlinien.
