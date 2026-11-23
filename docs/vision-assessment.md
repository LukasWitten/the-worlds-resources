# Neue Ideen: Bewertung und Abgleich mit den laufenden Plänen

Stand: 23.11.2026 · Status: **Entschieden und freigegeben am 23.11.2026** (Abschnitt 10). Übernommen in [map-extension-analysis.md](map-extension-analysis.md) (Rev. 3), [MINI_EDITOR_PLAN.md](MINI_EDITOR_PLAN.md) (ersetzt) und `CONTRIBUTING.md` (Regeln W7, W8). Der SEO-Plan wird angepasst, sobald PR #18 (`claude/seo-audit`) gemergt ist; die Änderungen stehen in Abschnitt 3.

Abgeglichen mit:
- [map-extension-analysis.md](map-extension-analysis.md), kurz **EP**. Phase 0 und 1 sind umgesetzt und auf `main`, nächster Schritt ist Phase 2 (Export-Ansicht).
- `docs/seo-geo-plan.md` (Branch `claude/seo-audit`, noch nicht auf `main`), kurz **SEO**. Alle Entscheidungen E1–E11 sind getroffen, die Umsetzung hat noch nicht begonnen.
- [MINI_EDITOR_PLAN.md](MINI_EDITOR_PLAN.md) vom 18.11.2026. Das ist ein kleiner GeoJSON-Editor, ein Vorläufer von Idee 1.
- Der Code auf `main` (461c144 + #19) sowie `LICENSE`, `CONTRIBUTING.md` und `public/data/LICENSE.md`.

---

## 0. Kurzfassung

1. **Fast alle Ideen sind sinnvoll** und passen zum Kern des Projekts: belegte Lieferketten verständlich machen. Den größten Nutzen bringen der **Präsentationsmodus** (Idee 2) und der **Editor** (Idee 1). Sie machen aus einer Karte zum Anschauen ein Werkzeug, mit dem Studierende, Lehrkräfte und Journalistinnen eigene Geschichten erzählen. Das unterscheidet uns klar von allen geprüften Werkzeugen (Abschnitt 8).
2. **Eine Entscheidung trägt fast alles:** Video-Export, Editor, Transportnetz-Ebenen und Bündelung brauchen eine Karte, die in ein Canvas zeichnet, Vektordaten zeigt und sich Bild für Bild steuern lässt. Die heutige Karte (Leaflet, SVG-Routen über CARTO-Rasterkacheln) kann das nicht zuverlässig. **Empfehlung: den Umstieg auf MapLibre GL aus EP Phase 7 vorziehen, vor die Export-Ansicht.** Sonst bauen wir Phase 2 und 3 auf Leaflet und schreiben sie danach neu. Der Leaflet-Code steckt in zwei Modulen (`map.js`, `heroMap.js`, zusammen ca. 660 Zeilen). Aufwand ca. 5–7 PT.
3. **Kommerzialisierung hat technische Folgen, nicht nur rechtliche:** Drei heutige oder geplante Abhängigkeiten sind an nicht-kommerzielle Nutzung gebunden:
   - CARTO-Kacheln: laut SEO-Plan „nicht-kommerziell (bestätigt)“.
   - OpenRailwayMap-Kacheln: nur für frei zugängliche Anwendungen.
   - Vercel: Das Projekt läuft auf dem Hobby-Tarif, der nur für private, nicht-kommerzielle Nutzung gedacht ist.

   Der Ausweg ist ein **selbst gehosteter Vektor-Basemap** (Protomaps/PMTiles aus OpenStreetMap, statische Datei, Quellenangabe „© OpenStreetMap“). Er passt zu MapLibre, funktioniert offline (Editor) und ist im Video erlaubt.
4. **Lizenz:** Es gibt noch **keinen einzigen externen Beitrag**, alle 56 Commits stammen von dir. Das ist der ideale Zeitpunkt, die Beitragsregeln festzulegen. Empfehlung: MIT für den Code behalten, CC BY 4.0 für die Daten behalten. Dazu kommt vor dem ersten externen Pull Request ein **CLA mit Lizenzeinräumung** (über CLA Assistant). OSM-Daten (ODbL) werden strikt in eigenen Dateien gehalten.
5. **Acht Weichenstellungen** sollten jetzt in den Plan, damit später nichts umgebaut werden muss (Abschnitt 2). Die meisten sind klein: ein Feld im Schema, eine Dimension im Kartenzustand, eine Regel im Validator. Die große ist MapLibre.
6. **Reihenfolge:**
   - Zuerst die Weichen, MapLibre und die Export-Ansicht.
   - Dann der Story-Mechanismus mit Präsentationsmodus und Bild-Export.
   - Dann der Editor (MVP), mit dem dein Praxistest beginnen kann, gefolgt vom Video-Export.
   - Transportnetze erst als Ebene, Einrasten und Routing deutlich später.
   - Trailer erst, wenn das Gezeigte live ist (Abschnitt 5).

---

## 1. Bewertung pro Idee

Aufwand: **S** ≤ 3 PT · **M** 4–8 PT · **L** 2–4 Wochen · **XL** > 1 Monat (PT = Personentage, grobe Schätzung).

| # | Idee | Sinnvoll? | Begründung | Nutzen | Aufwand | Abhängigkeiten | Empfohlene Stufe (Abschnitt 3) |
|---|---|---|---|---|---|---|---|
| 1a | **Editor: eigene Netzwerke modellieren** (leer oder aus Website-Daten) | **ja** | Erweitert die Zielgruppe von „Lesern“ zu „Erzählern“. Gleichzeitig der Weg, wie Beiträge ohne Git entstehen. Ersetzt den Mini-Editor-Plan und geht über ihn hinaus. | sehr hoch | L (MVP) | Projektformat (W1), Schema-Felder (W4, W5), MapLibre (W2) | **C2** |
| 1b | **Editor: Präsentationsmodus** | **ja** | Derselbe Mechanismus wie Idee 2. Einmal bauen, zweimal nutzen. | sehr hoch | M (auf Story-Engine) | Story-Engine (C1) | **C1/C2** |
| 1c | Editor lokal nutzbar | **ja, als PWA** | Siehe 1.1. Desktop-App (Tauri) erst bei konkretem Bedarf. | mittel | S–M | eigener Basemap (W3) für offline | **C4** |
| 2 | **Präsentationsmodus für Website-Ansichten** | **ja** | Eine Story ist eine Abfolge von Kartenzuständen. Unser `mapState` ist dafür schon fast richtig gebaut. Export- und Import-Ansicht können ihre Story **automatisch erzeugen** (Land → Leitgut → Abnehmer nacheinander). | hoch | M | Story-Dimension (W6), zeitgesteuertes Rendering (W7) | **C1** |
| 2a | Video-Export (MP4, GIF, 9:16) | **ja** | Social-Media-Material und Präsentationen ohne Internet. Technisch gut lösbar, wenn das Rendering Bild für Bild steuerbar ist (2.2). | hoch | M (nach C1) | MapLibre, eigener Basemap | **C3** |
| 2b | Bild pro Schritt (PNG) | **ja, zuerst** | Fällt bei der gleichen Render-Pipeline fast kostenlos ab. Deckt den häufigsten Fall (Folie in einer Präsentation) sofort ab. SEO Phase 3 plant „Ansicht als Bild exportieren“ ohnehin. | hoch | S | Render-Pipeline (C1) | **C1** |
| 2c | PPTX-Export, eine Folie pro Schritt | **ja** | Für dein Kernbeispiel (Referat) das nützlichste Format: Text, Bild und Quelle pro Folie, im Vortrag frei bearbeitbar. Läuft im Browser (`pptxgenjs`, MIT). | hoch | S | PNG-Export | **C2** |
| 2d | Live-Einbettung in PowerPoint (Add-in) | **teilweise, später** | Flourish bietet das nur in bezahlten Tarifen. Zuschauer brauchen das Add-in, offline gibt es nur ein Ersatzbild. Pflege und Microsoft-Store-Freigabe kosten dauerhaft Zeit. PPTX und Video decken 90 % ab. | mittel | L | `/embed/` (SEO 3) | **später** |
| 3 | Werbe-Trailer | **ja, aber zuletzt** | Erst wenn das Gezeigte live ist. Zum großen Teil mit dem eigenen Video-Export machbar. Das ist zugleich der beste Test des Exports. | hoch (Reichweite) | M je Trailer | siehe 5.1 | **D3** |
| 4 | Praxistest mit bekannten Produkten | **ja** | Prüft Editor und Datenmodell an der Realität, bevor wir werben. Liefert Insights-Artikel (SEO Phase 4) und Beispiele für Trailer b und c. | hoch | M je Produkt (Recherche) | Editor-MVP | **ab C2** |
| 5a | Verkehrsnetze als Ebene (Schnellzug, Autobahn) | **ja** | Hilft beim Verstehen von Transportwegen, vor allem im Editor. Auf der Weltkarte ohne Zoom aber wenig Mehrwert. | mittel | M | MapLibre, eigene Vektordaten (Lizenz 5.2) | **C4** |
| 5b | Einrasten / Routing auf Netzen | **teilweise, spät** | Sehr nützlich für Straße und Schiene im Editor. Braucht aber einen Routing-Dienst (Server) oder große Netzdaten im Browser. Ein Server bricht mit „statisch hosten“. Die ODbL wirkt auf die eingerasteten Geometrien. | mittel | XL | 5a, Lizenztrennung (W8) | **E** |
| 5c | Allgemeines Transportnetz-Konzept | **ja, als Begriff jetzt** | Die bestehenden Routentypen (`pipeline`, `shipping_route`, `rail_corridor`) sind schon Verkehrsträger. Ein gemeinsames Vokabular `mode` kostet jetzt fast nichts. | hoch (Struktur) | S | – | **W5** |
| 6 | Bündelung zusammenlaufender Routen | **ja** | Dein Vorschlag (Zwischenknoten) ist richtig und passt zu unserem Graph. Für kuratierte Routen besser als automatisches Edge Bundling (Abschnitt 6.3). | mittel–hoch | M | Wegpunkt-Knoten (W4), MapLibre | **A2a/C2** |
| 7 | Offenheit und Kommerzialisierung | **ja, sofort klären** | Vor dem ersten externen Beitrag entscheiden. Danach ist jede Änderung teuer, weil alle Beitragenden zustimmen müssten. | sehr hoch (Option) | S (Technik), Anwalt extern | – | **W8** |

### 1.1 Editor: Antworten auf deine Fragen

**Dasselbe Güter- und Flussmodell wie die Website.** Der Editor bekommt kein eigenes Modell. Er arbeitet auf denselben Bausteinen, die EP 4.2 für die Website festlegt:

| Baustein | Website heute / geplant | Im Editor |
|---|---|---|
| Gut | `goods.json` (Stufe raw/intermediate/final, HS-Codes, Stil) | Gleicher Katalog, **plus eigene Güter** im Projekt (Präfix `x-`, z. B. `x-tropical-logs`). Sie können später als Vorschlag in den Katalog wandern. |
| Ort (Knoten) | GeoJSON-Point, `category: node` | gleich, mit `kind` (5.1 unten) |
| Route (Kante) | GeoJSON-LineString mit `from_node_id`/`to_node_id` | gleich, plus `via` (Wegpunkte) und `mode` |
| Rezept / Stückliste | `recipes.json` (EP Phase 5) | `process` je Verarbeitungsknoten (Inputs → Outputs) im gleichen Aufbau |
| Herkunft | `provenance` observed/modelled/curated (EP 4.5) | gleich, plus `confidence` (W5) |
| Kartenzustand | `mapState` | Story-Schritte bestehen aus Kartenzuständen (W6) |

Technisch heißt das:
- Schemas und Validator laufen **auch im Browser**. `ajv` läuft dort, die Prüflogik aus `scripts/validate-data.js` wandert in ein gemeinsames Modul.
- Ein **Konverter in beide Richtungen** verbindet Projektdatei und GeoJSON der Website:
  - „In Editor öffnen“: Die aktuelle Kette oder Ansicht wird zum Projekt.
  - „Beitragen“: Das Projekt wird zu GeoJSON-Features und Katalog-Vorschlägen.
  - Importierte Elemente behalten eine Referenz (`ref`) auf ihre Website-ID. So lassen sich Änderungen später zuordnen.

**Offenes Dokumentformat: ja, unbedingt.** Format und Beispiel stehen in Abschnitt 4. Die Eckpunkte:
- Eine einzige JSON-Datei `*.twr.json` mit `format` und `formatVersion` (SemVer).
- Ein öffentliches JSON-Schema (`/data/schemas/project-1.schema.json`).
- Migrationsfunktionen je Hauptversion: Eine alte Datei wird beim Öffnen hochgestuft, nie stillschweigend kaputt geladen.
- Projekte mit eigenen Bildern kommen später als ZIP-Paket (`*.twrz`) mit derselben JSON-Datei darin.

**Lokal nutzbar: Empfehlung PWA.**

| Option | Für | Gegen | Bewertung |
|---|---|---|---|
| Lokal per `npm run editor` | Für Entwickler sofort da, kostet nichts | Für Studierende unbrauchbar (Node, Terminal) | gibt es automatisch nebenbei |
| **PWA** (installierbar, offline) | Gleicher Code wie die Website, Updates automatisch, keine Installer, kein Signieren. Dateien öffnen und speichern über File System Access API (Chrome, Edge), sonst Hoch- und Herunterladen (Safari, Firefox). | Offline braucht einen Basemap ohne Caching-Verbot (CARTO verbietet Caching) → eigener Basemap (W3). Begrenzter Speicher im Browser. | **empfohlen** |
| Desktop-App (Tauri 2) | Echte Dateien, Dateiverknüpfung `.twr`, große Offline-Daten, kein Browser-Speicherlimit | Zweiter Build, Signieren und Notarisieren für macOS/Windows (laufende Kosten), Updates selbst verteilen | erst, wenn die PWA an Grenzen stößt (z. B. Videos über 1 GB, ganze Netzdaten offline) |

**Datenspeicherung:**
1. **Automatisch im Browser** (IndexedDB): Arbeitsstand, Rückgängig-Verlauf. Das sind nur lokale Kopien, sie verlassen das Gerät nicht.
2. **Als Datei** (`.twr.json`): der eigentliche Speicherort zum Teilen, Archivieren und Beitragen. Ein Hinweis erinnert an das Sichern, weil Browser lokale Daten löschen können.
3. **Teilen ohne Server:** Kleine Projekte passen komprimiert in einen Link (Hash, nur für Ansichten, nicht für große Projekte). Beiträge gehen als Datei in ein GitHub-Issue oder einen Pull Request, wie im Mini-Editor-Plan.
4. **Account** erst, wenn es einen Grund dafür gibt (gemeinsames Bearbeiten, Galerie, Kommerzialisierung). Er braucht ein Backend, Datenschutzerklärung, Löschkonzept und Moderation. Das gehört nicht in die nächsten Stufen.

### 1.2 Story und Präsentationsmodus: ein Mechanismus für beide

**Ja, Website und Editor können denselben Story-Mechanismus nutzen.** Eine Story ist:

```
Story = [Schritt]
Schritt = {
  camera:  Kartenausschnitt (Bounds oder Mitte/Zoom), Übergang (fliegen | schneiden)
  reveal:  IDs, die in diesem Schritt neu erscheinen (kumulativ)
  focus:   IDs, die hervorgehoben werden (der Rest wird gedimmt)
  state:   optional ein mapState-Ausschnitt (view, good, country, direction …)
  text:    Titel und kurzer Text, Quelle
  duration: Dauer im Abspielmodus
}
```

- **Website:** Jede Ansicht kann eine Story **erzeugen**. Beispiel Export-Ansicht Chile:
  1. Weltkarte, Chile hervorgehoben.
  2. Kupfer, 49,7 % der Exporte.
  3. Bögen zu China, USA, Japan nacheinander.
  4. Lithium.

  Kuratierte Ketten (Jet Fuel Frankfurt, Lithium Atacama → Schwarzheide) bekommen handgeschriebene Stories.
- **Editor:** Der Nutzer legt Schritte selbst an: „Schritt hinzufügen“ merkt sich den aktuellen Ausschnitt und die seither neu gezeichneten Elemente.
- **URL:** `#map?story=lithium-atacama&step=3`. So lässt sich jeder Schritt verlinken und als Seite indexieren (SEO 3.2).
- **Abspielen:** Eine Zeitleiste `t` läuft von 0 bis zur Gesamtdauer. Aus `(story, t)` berechnet eine **reine Funktion** den Zustand des Bildes: Kamera, sichtbare Elemente mit Fortschritt 0–1 (eine Route „wächst“), Texte. Die Live-Karte ruft sie pro Animationsframe auf, der Video-Export pro Videoframe. Das ist die Weichenstellung W7.

### 1.3 Export: Reihenfolge und Technik

| Format | Wofür | Technik | Aufwand | Reihenfolge |
|---|---|---|---|---|
| **PNG pro Schritt** | Folie, Arbeitsblatt, Social-Post | Canvas der Karte + Text-Overlay in ein 2D-Canvas zeichnen | S | **1** |
| **PPTX** | Referat, Unterricht | `pptxgenjs` (MIT, Browser): je Schritt eine Folie mit Bild, Titel, Text, Quelle in den Notizen | S | **2** |
| **MP4 16:9 und 9:16** | Präsentation ohne Internet, Reels/TikTok/Shorts | Bild für Bild rendern (unten) → WebCodecs `VideoEncoder` → MP4 mit **Mediabunny** (Nachfolger von `mp4-muxer`, MPL-2.0) | M | **3** |
| GIF | Kurze Schleifen für Foren, Messenger | aus denselben Frames, wenige Sekunden, geringe Auflösung (`gifenc`) | S | 4 |
| Live-Einbettung PowerPoint | live aktualisierte Karte im Vortrag | Office-Add-in mit `/embed/`-Seite | L | später |

**Deine Vermutung „Video zuerst“** stimmt im Ziel. In der Umsetzung kommen PNG und PPTX trotzdem zuerst: Sie entstehen aus **derselben Render-Pipeline** und brauchen keine Zeitleisten-Logik. Video baut direkt darauf auf. Zwischen PNG und MP4 liegen etwa 1–2 Wochen, nicht eine ganze Phase.

**Ruckelfreies Video: Bild für Bild, nicht Bildschirmaufnahme.**
1. Eine unsichtbare Karte in fester Größe (1920×1080 bzw. 1080×1920) mit `preserveDrawingBuffer: true`.
2. Für jedes Frame `n` mit `t = n / fps`:
   - Kamera per `jumpTo` setzen (die Interpolation rechnen wir selbst, nicht `flyTo`).
   - Sichtbarkeit und Fortschritt der Elemente setzen.
   - Auf das MapLibre-Ereignis `idle` warten, also bis alle Kacheln geladen und gezeichnet sind.
   - Canvas plus Text-Overlay zu einem `VideoFrame` mit Zeitstempel `t` machen und an den Encoder geben.
3. Das Rendern läuft **langsamer oder schneller als Echtzeit**, das Ergebnis ist trotzdem gleichmäßig. Genau so arbeiten Remotion (Kartenvideos mit MapLibre) und hubble.gl (deck.gl/kepler.gl).
4. Für 9:16 bekommt jeder Schritt eigene Bounds oder wird automatisch eingepasst, mit Sicherheitsrändern für die Bedienelemente von TikTok und Instagram.
5. **Keine CSS-Animationen im Video:** Die heutigen „fließenden“ Routen (CSS `stroke-dashoffset`-Animation) werden aus `t` berechnet. Sonst flackern sie im Export.
6. **Basemap im Video:** CARTO erlaubt statische Bilder nur eingeschränkt (SEO 6.2). Im Export nutzen wir deshalb den eigenen Basemap (W3) oder nur Natural-Earth-Umrisse, wie in SEO-Entscheidung E9 für Vorschaubilder. Quellenangabe und `theworldsresources.org` stehen im Bild.

Mit Leaflet wäre das kaum machbar: SVG-Routen und Rasterkacheln müssten pro Frame in ein Canvas übertragen werden, mit Kachel-Caching (verboten) und CORS-Problemen. Darum W2.

---

## 2. Weichenstellungen jetzt

Diese Punkte sollten in den laufenden Plan, **bevor** EP Phase 2 beginnt. Die meisten sind klein. Was nicht jetzt passiert, kostet später einen Umbau.

| # | Weiche | Was genau | Warum jetzt | Aufwand | Wo im Plan |
|---|---|---|---|---|---|
| **W1** | **Projekt-Dokumentformat v0** | Spezifikation und JSON-Schema `project-1.schema.json` (Abschnitt 4). Noch kein Editor, nur das Format und ein Beispiel im Repo. | Story, Editor, Beiträge und Exporte bauen alle darauf. Wird es erst mit dem Editor festgelegt, passen Website-Stories nicht dazu. | S | neu, vor EP 2 |
| **W2** | **MapLibre GL statt Leaflet, vorgezogen** | `map.js` und `heroMap.js` auf MapLibre umstellen. Zuerst mit dem **CARTO-Vektorstil** (gleicher Anbieter, gleiche Bedingungen), damit sich nur eine Sache ändert. Routen, Knoten und Ölfelder als GeoJSON-Quellen und -Ebenen. | Phase 2 bringt bis zu 200 Ländermarker und Hunderte Bögen. Als Canvas-Ebenen sind sie schneller und später ohne Umbau exportierbar. Bauen wir sie in Leaflet, schreiben wir Phase 2 und 3 neu. | M (5–7 PT) | **verschoben** aus EP Phase 7, neu vor EP 2 |
| **W3** | **Eigener Basemap als Option** | Protomaps-Basemap (OSM, ODbL „Produced Work“) als PMTiles-Datei selbst hosten, Ausschnitt bis Zoom ~6 für die Weltkarte. CARTO bleibt zunächst Standard für die Live-Karte, der eigene Basemap ist Pflicht für Export, offline und eine spätere kommerzielle Nutzung. | Video-Export, Offline-Editor und Kommerzialisierung hängen daran. Mit MapLibre ist es nur ein anderer `style`. Ein Plus beim Datenschutz: keine Verbindung zu CARTO mehr. | S–M | neu, mit W2 vorbereiten, spätestens C1 |
| **W4** | **Wegpunkte und Umschlagknoten im Datenmodell** | Neue Knotenart `kind: waypoint` (unsichtbar, aber **adressierbar und mehrfach nutzbar**). Routen dürfen an Wegpunkten beginnen und enden. Der Validator erlaubt das, die Kettensuche läuft durch sie hindurch. Sichtbare Umschlagknoten gibt es schon (`import_hub`, `transit_point`). | Bündelung (Idee 6) und das Editor-Format brauchen es. Heute verbietet der Validator unsichtbare Knoten als Routenende, Wegpunkte sind nur Koordinaten in der Linie. | S | neu, mit EP 2 |
| **W5** | **Verkehrsträger und Verlässlichkeit als Felder** | (a) `mode`: `sea`, `pipeline`, `rail`, `road`, `inland_waterway`, `air` an jeder Route. Heute steckt das im `type`, der bleibt als Darstellungsart. (b) `confidence`: `documented`, `plausible`, `estimated` an jedem Knoten und jeder Kante (UI: belegt, plausibel, geschätzt), dazu `sources` als Liste mit `url`, `accessed` (Datum) und optional `quote`. Das bisherige Einzelfeld `source` bleibt gültig. | Transportnetz-Konzept, Recherche-Vorlage, Praxistest und die Provenienz-Darstellung aus EP 4.5 brauchen dieselben Felder. Nachträglich müssten alle 69 Features angefasst werden. | S | neu, mit EP 2 |
| **W6** | **Story und Schritt im Kartenzustand** | `mapState` bekommt `story` und `step` (reserviert wie heute `depth`/`year`). Dazu ein Modul `story.js` mit dem Schrittformat aus 1.2. Noch keine Abspiel-UI. | Die Export-Ansicht kann ihre Auto-Story dann gleich mitliefern. Die URL-Regeln (push/replace) bleiben konsistent. | S | neu, mit EP 2 |
| **W7** | **Rendering von einer Zeitleiste steuerbar** | Regel für allen neuen Kartencode: Was sichtbar ist und wie weit eine Animation ist, kommt aus einer Funktion `frameAt(state, story, t)`. Keine `setTimeout`- oder CSS-Animation, die den Zustand der Karte bestimmt. Hover und reine Deko bleiben erlaubt. | Nur so werden Live-Karte, PNG, PPTX und Video identisch. Als Regel kostet das jetzt nichts, nachträglich müsste jede Animation neu gebaut werden. | S (Regel), Teil von W2 | neu, in CONTRIBUTING |
| **W8** | **Lizenz, CLA und Datenquellen-Trennung** | (a) Entscheidung Codelizenz und CLA (Abschnitt 7) **vor dem ersten externen Pull Request**. (b) Regel: OSM/ODbL-Daten nur in eigenen Dateien mit eigener Lizenz, nie in CC-BY-Datensätzen, auch nicht als eingerastete Routengeometrie. (c) Copyright-Zeile in `LICENSE` korrigieren: heute „the-worlds-resources“, das ist keine Person. | Danach müssten alle Beitragenden einer Änderung zustimmen. ODbL-Vermischung lässt sich nachträglich kaum trennen. | S (+ Anwalt) | neu, sofort |

**Nicht** jetzt nötig (bewusst später): Routing-Server, Accounts, Tauri, PowerPoint-Add-in, automatisches Edge Bundling.

---

## 3. Aktualisierte Gesamt-Roadmap

Legende: **🆕 neu** · **↪️ verschoben** · **✏️ geändert** · ohne Zeichen = unverändert.
Spalte „Herkunft“: EP = Kartenerweiterung, SEO = SEO/GEO-Plan, NEU = aus diesem Dokument. Die Stufen-IDs (W, A, B …) sind neu. Sie ordnen die Phasen beider Pläne in eine gemeinsame Reihenfolge ein, ohne die alten Nummern zu ersetzen.

**Spuren:** A = Karte und Daten · B = Seiten und SEO · C = Story, Editor, Export · T = Transportnetze · D = Projekt, Recht, Marketing.

| Stufe | Inhalt | Herkunft | Status | Aufwand | Voraussetzung |
|---|---|---|---|---|---|
| ✅ | Güterkatalog, mapState, Ressourcen-Ansicht, Korridore | EP 0 | erledigt | – | – |
| ✅ | Länder, BACI-Pipeline, Validierung, Fluss-API | EP 1 | erledigt | – | – |
| **W** | Weichen W1, W4, W5, W6, W7, W8 | NEU | 🆕 | ca. 3–4 PT + Anwalt | – |
| **L** | 🆕 **Lebkuchen-Beitrag** (F15): Format W1 vorziehen, Renderskript für Bilder pro Schritt (Vorstufe von C1), Gewürze, Mandeln, Honig in Katalog und BACI-Pipeline, Recherche, Karussell-Post Anfang Dezember | NEU | 🆕 | ca. 4–5 PT + Recherche | W1 |
| **A2a** | MapLibre-Umstieg (W2), Basemap-Option (W3), **Darstellung gemeinsamer Teilstücke** (Idee 6) | EP 7 + NEU | ↪️ vorgezogen | 5–7 PT | W4 |
| **A2** | Export-Ansicht. ✏️ auf MapLibre, ✏️ liefert eine Auto-Story mit (ohne Abspiel-UI) | EP 2 | ✏️ | ca. 1 Woche | A2a |
| **B1** | Astro-Fundament, App auf `/map` | SEO 1 | unverändert, **parallel** zu A2a/A2 möglich (andere Dateien) | 6–8 PT | Absprache zu `index.html`/`app.js` |
| **A3** | Import-Ansicht | EP 3 | unverändert | 3–4 Tage | A2 |
| **C1** | 🆕 **Story-Engine + Präsentationsmodus** (Website-Ansichten und kuratierte Ketten), **PNG-Export** pro Schritt (vereint mit SEO 3 „Ansicht als Bild“) | NEU + SEO 3 | 🆕 / ↪️ (Bild-Export vorgezogen) | ca. 1,5 Wochen | A2, W3 |
| **A4** | Länderprofil, Produktion (USGS vorgezogen laut SEO E5), Abhängigkeit Tiefe 1 | EP 4 | unverändert | ca. 1 Woche | A3 |
| **B2** | Entitätsseiten 2a/2b | SEO 2 | ✏️ Seiten können eine Story einbetten | 10–13 PT | B1, A3 |
| **C2** | 🆕 **Editor-MVP** (ersetzt MINI_EDITOR_PLAN): leere Karte oder „In Editor öffnen“; Knoten, Wegpunkte, Kanten, eigene Güter, `process` (Inputs/Outputs); Quellen und Verlässlichkeit pro Element; Story-Schritte; Datei speichern/laden, Autosave; PNG- und **PPTX-Export** | NEU | 🆕 | L (3–4 Wochen) | C1, W1 |
| **P** | 🆕 **Praxistest** (Idee 4): 2–3 Produkte im Editor recherchieren | NEU | 🆕 | laufend, ca. 1 Woche je Produkt | C2 |
| **C3** | 🆕 **Video-Export** MP4 16:9 und 9:16, GIF | NEU | 🆕 | 1–2 Wochen | C1, W3 |
| **A5** | Produkt-Pilot Li-Ion-Batterie. ✏️ Rezepte im gleichen Aufbau wie `process` im Editor | EP 5 | ✏️ | 2–3 Wochen | A4 |
| **B3** | Zitieren, Einbetten, Downloads. ✏️ Bild-Export ist schon in C1 erledigt | SEO 3 | ✏️ kleiner | 4–5 PT | B2 |
| **C4** | 🆕 Editor als **PWA** (offline mit eigenem Basemap), **Beitragen-Fluss** (Projekt → Prüfung → Issue/PR), Katalog-Vorschläge für eigene Güter | NEU | 🆕 | 1–2 Wochen | C2, W3, W8 |
| **T1** | 🆕 **Verkehrsnetze als Ebenen**: Hochgeschwindigkeitsstrecken, Autobahnen, (später) Häfen und Seewege. Eigene Vektordaten aus OSM in getrennter ODbL-Datei | NEU | 🆕 | M | A2a, W8 |
| **B4** | Insights, `/de/` | SEO 4 | ✏️ Insights aus dem Praxistest | 6–8 PT + Texte | B2, P |
| **D1** | 🆕 Trailer c (Editor) | NEU | 🆕 | M | C2, C3, C4 |
| **D2** | 🆕 Trailer b (Beitragen) | NEU | 🆕 | M | C4, ein echter angenommener Beitrag |
| **D3** | 🆕 Trailer a (Website) | NEU | 🆕 | M | A5 (Produkte), Gold im Katalog (SEO E6) |
| **A6** | Produkt-Ansicht ausbauen | EP 6 | unverändert | laufend | A5 |
| **E** | Langfristig: Jahresauswahl, Choropleth, **Einrasten und Routing** (T2), Seewege-Netz, PowerPoint-Add-in, Tauri-App, Accounts | EP 7 + NEU | ✏️ ohne MapLibre (→ A2a), mit den neuen späten Punkten | – | – |

**Kritischer Pfad bis zum Praxistest:** W → L → A2a → A2 → C1 → C2. Grob 8–10 Wochen bei gleichem Tempo wie bisher, davon ca. 1 Woche für den Lebkuchen-Beitrag. A3, B1 und A4 laufen dazwischen oder parallel.

**Was sich an den bestehenden Plänen ändert:**
- **EP:**
  - Phase 7 verliert MapLibre (wird A2a).
  - Phase 2 baut auf MapLibre und liefert eine Auto-Story.
  - Phase 5 nutzt das gemeinsame `process`-Format.
  - Neue Weichen W4–W6 im Datenmodell (Abschnitt 4.4 von EP ergänzen).
- **SEO:**
  - Phase 3 „Ansicht als Bild exportieren“ wandert nach C1.
  - E9 (Vektor statt Kachel-Screenshot) gilt weiter und wird mit W3 einfacher.
  - Seitentyp `/stories/<id>` als möglicher Zusatz (offene Frage F7).
- **MINI_EDITOR_PLAN:** wird durch C2/C4 ersetzt. Seine Erfolgskriterien („2 Knoten und 1 Route in 15 Minuten“) übernehmen wir.

---

## 4. Editor-Datenformat (Vorschlag)

### 4.1 Aufbau

| Teil | Inhalt | Pflicht |
|---|---|---|
| `format`, `formatVersion` | `"twr-project"`, `"1.0.0"` | ja |
| `meta` | Titel, Autor (frei, optional), Sprache, Lizenz der Datei, erstellt/geändert, `basedOn` (Datenstand der Website, falls importiert), `example: true` für Beispieldaten | ja |
| `sources` | Quellenliste: `id`, `title`, `url`, `publisher`, `accessed` (Datum), `type` (`primary` / `secondary` / `self_reported`) | ja (darf leer sein) |
| `goods` | Nur **eigene** Güter des Projekts (`x-…`). Katalog-Güter werden nur per ID referenziert. Felder wie in `goods.json`, plus `parent` (z. B. Holz → Tisch). | nein |
| `nodes` | Orte: `id`, `kind` (`site` = Ort, `transfer` = Umschlagknoten, `waypoint` = unsichtbarer Wegpunkt), `type` (wie heute: `extraction_site`, `processing_hub` …), `name`, `coord` [lon, lat], `country`, `process` (Inputs → Outputs), `claims` | ja |
| `edges` | Routen: `id`, `from`, `to`, `via` (Wegpunkt-IDs **oder** freie Koordinaten), `mode`, `good`, `qty` (optional), `claims` | ja |
| `claims` | Jede Aussage mit `confidence` (`documented` / `plausible` / `estimated`), `sourceIds`, `note`. Mindestens ein Claim für die Existenz des Elements. | ja (pro Element) |
| `story` | `steps`: `id`, `title`, `text`, `camera` (`bounds` oder `center`/`zoom`), `transition`, `reveal`, `focus`, `durationMs` | nein |
| `ref` (an Knoten/Kanten) | Herkunft aus Website-Daten: `{ "dataset": "twr", "id": "port-rotterdam", "version": "2026-11-23" }` | nein |

Regeln:
- IDs nur `[a-z0-9_-]`, eindeutig im Projekt.
- **Wegpunkte sind Knoten.** Mehrere Kanten, die denselben Wegpunkt in `via` haben, teilen sich das Teilstück. Darauf baut die Bündelung (6.2).
- `reveal` ist kumulativ. Was in Schritt 2 erscheint, bleibt in Schritt 3 sichtbar, außer es steht in `hide`.
- Keine Geometrie aus OSM-Routing in dieser Datei, solange sie unter CC BY steht (W8). Eingerastete Linien werden aus `via` beim Anzeigen berechnet oder in einer getrennten ODbL-Datei gehalten.
- Unbekannte Felder werden beim Laden **erhalten** (Vorwärtskompatibilität), aber nicht interpretiert.

### 4.2 Beispiel: Tropenholz bis zu einem Möbelhaus in Karlsruhe

> **Alle Werte sind erfundene Beispieldaten** (`meta.example: true`). Orte, Mengen und Quellen illustrieren nur das Format und sind keine Aussage über reale Lieferketten oder Unternehmen. Bewusst steht dort „ein Möbelhaus“ statt eines Markennamens (Hinweise zu Marken in 6.3).

```json
{
  "$schema": "https://theworldsresources.org/data/schemas/project-1.schema.json",
  "format": "twr-project",
  "formatVersion": "1.0.0",
  "meta": {
    "title": "From rainforest to living room (example)",
    "language": "en",
    "license": "CC-BY-4.0",
    "created": "2026-11-23",
    "modified": "2026-11-23",
    "example": true,
    "note": "Illustrative example data. Not a statement about any real company or supply chain."
  },
  "sources": [
    { "id": "s1", "title": "Example source A (placeholder)", "url": "https://example.org/source-a", "type": "secondary", "accessed": "2026-11-23" },
    { "id": "s2", "title": "Example port statistics (placeholder)", "url": "https://example.org/port-stats", "type": "primary", "accessed": "2026-11-23" }
  ],
  "goods": {
    "x-tropical-logs": { "label": "Tropical logs", "stage": "raw", "category": "wood", "unit": "m3", "hs": { "rev": "HS17", "codes": ["4403"], "precision": "partial" } },
    "x-sawn-timber":   { "label": "Sawn tropical timber", "stage": "intermediate", "category": "wood", "unit": "m3", "parent": "x-tropical-logs", "hs": { "rev": "HS17", "codes": ["4407"], "precision": "partial" } },
    "x-dining-table":  { "label": "Dining table", "stage": "final", "category": "furniture", "unit": "pcs", "hs": { "rev": "HS17", "codes": ["940360"], "precision": "partial" } }
  },
  "nodes": [
    { "id": "logging-site", "kind": "site", "type": "extraction_site", "name": "Logging concession (example)", "coord": [-50.5, -3.8], "country": "BR",
      "process": { "outputs": [{ "good": "x-tropical-logs", "qty": 1200, "unit": "m3/yr" }] },
      "claims": [{ "confidence": "estimated", "sourceIds": ["s1"], "note": "Example location" }] },
    { "id": "sawmill", "kind": "site", "type": "processing_hub", "name": "Sawmill (example)", "coord": [-47.4, -3.0], "country": "BR",
      "process": { "inputs": [{ "good": "x-tropical-logs", "qty": 1200, "unit": "m3/yr" }], "outputs": [{ "good": "x-sawn-timber", "qty": 550, "unit": "m3/yr" }] },
      "claims": [{ "confidence": "plausible", "sourceIds": ["s1"] }] },
    { "id": "port-belem", "kind": "transfer", "type": "import_hub", "name": "Port of Belém", "coord": [-48.50, -1.45], "country": "BR",
      "claims": [{ "confidence": "documented", "sourceIds": ["s2"] }] },
    { "id": "wp-channel", "kind": "waypoint", "coord": [-1.5, 49.9] },
    { "id": "port-rotterdam", "kind": "transfer", "type": "import_hub", "name": "Port of Rotterdam", "coord": [4.05, 51.95], "country": "NL",
      "ref": { "dataset": "twr", "id": "port-rotterdam", "version": "2026-11-23" },
      "claims": [{ "confidence": "documented", "sourceIds": ["s2"] }] },
    { "id": "furniture-plant", "kind": "site", "type": "processing_hub", "name": "Furniture plant (example)", "coord": [17.0, 52.4], "country": "PL",
      "process": { "inputs": [{ "good": "x-sawn-timber", "qty": 0.08, "unit": "m3/pcs" }], "outputs": [{ "good": "x-dining-table", "qty": 1, "unit": "pcs" }] },
      "claims": [{ "confidence": "estimated", "sourceIds": ["s1"], "note": "Example: assumed location of final assembly" }] },
    { "id": "store-karlsruhe", "kind": "site", "type": "storage_hub", "name": "Furniture store, Karlsruhe (example)", "coord": [8.40, 49.01], "country": "DE",
      "claims": [{ "confidence": "estimated", "sourceIds": [], "note": "Example end point" }] }
  ],
  "edges": [
    { "id": "e1", "from": "logging-site", "to": "sawmill", "mode": "road", "good": "x-tropical-logs",
      "claims": [{ "confidence": "plausible", "sourceIds": ["s1"] }] },
    { "id": "e2", "from": "sawmill", "to": "port-belem", "mode": "road", "good": "x-sawn-timber",
      "claims": [{ "confidence": "plausible", "sourceIds": ["s1"] }] },
    { "id": "e3", "from": "port-belem", "to": "port-rotterdam", "via": ["wp-channel"], "mode": "sea", "good": "x-sawn-timber",
      "qty": { "value": 550, "unit": "m3/yr", "confidence": "estimated" },
      "claims": [{ "confidence": "estimated", "sourceIds": ["s1", "s2"] }] },
    { "id": "e4", "from": "port-rotterdam", "to": "furniture-plant", "mode": "rail", "good": "x-sawn-timber",
      "claims": [{ "confidence": "estimated", "sourceIds": [] }] },
    { "id": "e5", "from": "furniture-plant", "to": "store-karlsruhe", "mode": "road", "good": "x-dining-table",
      "claims": [{ "confidence": "estimated", "sourceIds": [] }] }
  ],
  "story": {
    "steps": [
      { "id": "1", "title": "It starts in the rainforest", "text": "Example: logs are cut in a concession in Pará, Brazil.",
        "camera": { "center": [-50.0, -3.5], "zoom": 6 }, "transition": "cut", "reveal": ["logging-site"], "durationMs": 4000 },
      { "id": "2", "title": "Cut to size", "text": "A sawmill turns logs into sawn timber; less than half the volume remains (example value).",
        "camera": { "bounds": [[-51.5, -4.5], [-46.5, -0.8]] }, "transition": "fly", "reveal": ["e1", "sawmill", "e2", "port-belem"], "focus": ["sawmill"], "durationMs": 5000 },
      { "id": "3", "title": "Across the Atlantic", "text": "Example: about two weeks by ship to Rotterdam.",
        "camera": { "bounds": [[-55, -8], [12, 56]] }, "transition": "fly", "reveal": ["e3", "port-rotterdam"], "focus": ["e3"], "durationMs": 6000 },
      { "id": "4", "title": "Made into a table", "text": "Example: by rail to a furniture plant, where the table is built.",
        "camera": { "bounds": [[2, 48], [20, 54]] }, "transition": "fly", "reveal": ["e4", "furniture-plant"], "focus": ["furniture-plant"], "durationMs": 5000 },
      { "id": "5", "title": "In the shop in Karlsruhe", "text": "The whole journey, from rainforest to store (all values are examples).",
        "camera": { "bounds": [[-55, -8], [22, 56]] }, "transition": "fly", "reveal": ["e5", "store-karlsruhe"], "durationMs": 6000 }
    ]
  }
}
```

### 4.3 Verhältnis zu den Website-Daten

- **Website → Projekt:** „In Editor öffnen“ auf einer Kette oder Ansicht erzeugt `nodes`/`edges` mit `ref` und übernimmt die bisherige `source` als Quelle. Die Verlässlichkeit ist `documented`, wenn eine URL vorhanden ist.
- **Projekt → Website:** Der Konverter erzeugt GeoJSON-Features nach dem heutigen Schema. Er bricht ab, wenn ein Element nur `estimated` ist und keine Quelle hat, oder wenn eigene Güter fehlen. Daraus entstehen ein Issue- oder PR-Text und eine Datei.
- **Stories auf der Website** nutzen genau den `story`-Teil. Kuratierte Stories liegen als Projektdateien in `public/data/stories/`.

---

## 5. Storyboard-Vorlagen für die drei Trailer

### 5.1 Was muss fertig sein (ehrliche Werbung)

| Trailer | Muss live sein | Stufe | Nicht zeigen, solange es fehlt |
|---|---|---|---|
| **a) Website** | Export-, Import-, Ressourcen-Ansicht, Präsentationsmodus. Für „gold, oil, energy and products“: **Gold im Katalog** (SEO E6) und **mindestens ein Produkt** (A5). | nach A5 | Produktketten, wenn A5 fehlt; dann den Abschlusssatz anpassen („…of oil, gas, metals and minerals“) |
| **b) Beitragen** | Beitragen-Fluss im Editor (C4), Prüfung, **ein echter, angenommener Beitrag**, der live auf der Karte zu sehen ist | nach C4 | „Watch your addition educate others“ nur mit echter Zahl oder einem echten Beispiel |
| **c) Editor** | Editor-MVP, Präsentationsmodus, PPTX-Export. Video-Export, wenn gezeigt. | nach C2 + C3 | Live-Einbettung in PowerPoint (nur PPTX zeigen), Einrasten an Straßen und Schienen (T2) |

**Mit dem eigenen Video-Export machbar?** Zu etwa 70–80 %. Alle Kartenszenen lassen sich aus Stories rendern. Es fehlen:
1. **UI-Aufnahmen** (Editor-Bedienung, Klicks): Dafür braucht es eine Bildschirmaufnahme mit fester Fenstergröße, oder besser ein Skript (Playwright) mit hoher Auflösung und gleichmäßiger Mausbewegung.
2. **Schnitt, Musik, Untertitel, Abspann:** ein Schnittprogramm, z. B. DaVinci Resolve (kostenlos). Musik nur lizenzfrei mit Nachweis.
3. Im Export nützlich, später ergänzbar: **Titelkarten** (Text auf Vollbild), **Logo-Abspann**, **sicherer Bereich für 9:16** (die unteren ca. 20 % und die rechte Spalte sind bei Reels von Bedienelementen verdeckt).

### 5.2 Trailer a: Website (30 s in 16:9, 20 s in 9:16)

| # | Zeit (16:9) | Bild | Kartenanimation | Text (Entwurf, nicht final) | 9:16-Hinweis |
|---|---|---|---|---|---|
| 1 | 0–3 s | Dunkle Weltkarte, eine Zapfsäule, ein Smartphone, eine Batterie (Icons) | Zoom aus dem Weltall auf die Karte | „Where does your fuel come from?“ | Text oben, Icons groß |
| 2 | 3–9 s | Export-Ansicht | Ländermarker erscheinen nacheinander, Leader-Ringe pulsieren einmal | „See what every country exports …“ | Ausschnitt Amerika → Asien schwenken |
| 3 | 9–15 s | Chile → Welt | Kupfer-Bögen wachsen von Chile nach China, USA, Japan | „… and where it goes.“ | Bögen vertikal, Chile unten |
| 4 | 15–21 s | Kuratierte Kette Lithium | Route Atacama → Antofagasta → Panama → Hamburg → Schwarzheide wächst Schritt für Schritt | „Follow real supply chains, step by step.“ | nur 3 Stationen |
| 5 | 21–26 s | Produkt-Ansicht Batterie (A5) | Inputs fließen aus 4 Ländern zusammen | „From raw material to product.“ | weglassen, falls zu dicht |
| 6 | 26–30 s | Logo + URL | Karte dimmt, Logo blendet ein | „Visit theworldsresources.org …“ | URL groß, Mitte |

### 5.3 Trailer b: Beitragen (35 s in 16:9, 25 s in 9:16)

| # | Zeit | Bild | Animation | Text (Entwurf) |
|---|---|---|---|---|
| 1 | 0–4 s | Karte mit einer Lücke (ein Land ohne Route) | Fragezeichen über dem Land | „Some supply chains are still missing.“ |
| 2 | 4–12 s | Editor (UI-Aufnahme) | Knoten setzen, Route ziehen, Quelle einfügen, Verlässlichkeit „belegt“ wählen | „You know a mine, a port, a factory?“ |
| 3 | 12–20 s | Prüfung | Validator-Häkchen, „Submit“ → Issue/PR (UI-Aufnahme) | „Add it, with a source.“ |
| 4 | 20–28 s | Live-Karte | Der echte Beitrag erscheint auf der Karte, im Inspector steht „Contributed by …“ (nur mit Einwilligung) | „Reviewed, published, open for everyone.“ |
| 5 | 28–35 s | Logo + URL + „Your contribution is needed.“ | – | „Your contribution is needed …“ |

### 5.4 Trailer c: Editor (40 s in 16:9, 30 s in 9:16)

| # | Zeit | Bild | Animation | Text (Entwurf) |
|---|---|---|---|---|
| 1 | 0–4 s | Leere Karte | Cursor setzt einen Knoten in den Regenwald | „Start with a single place.“ |
| 2 | 4–14 s | Editor | Schritt für Schritt: Sägewerk, Hafen, Schiff, Fabrik, Möbelhaus (Beispieldaten, als solche eingeblendet) | „Add each step of the journey.“ |
| 3 | 14–24 s | Präsentationsmodus | Die gleiche Kette spielt sich als Story ab | „Then present it, step by step.“ |
| 4 | 24–32 s | Export | Klick „Export“ → PowerPoint mit 5 Folien → Video im Hochformat auf einem Handy | „In PowerPoint, as a video, or as a post.“ |
| 5 | 32–40 s | Logo + URL | – | „Create your own map. Free and open.“ |

Allgemein:
- Formate 1920×1080 (16:9) und 1080×1920 (9:16), 30 fps, Untertitel eingebrannt, ohne Ton verständlich.
- Jede Kartenszene ist eine Story-Datei im Repo (`marketing/trailers/*.twr.json`), damit sich die Trailer bei neuen Daten neu rendern lassen.
- **Beispieldaten im Bild kennzeichnen** („Example data“), vor allem in Trailer c.

---

## 6. Praxistest mit Produkten

### 6.1 Mindestumfang des Editors für den Praxistest

1. Knoten, Wegpunkte und Kanten anlegen, verschieben, löschen. Rückgängig machen.
2. **Eigene Güter mit Stufe** (Rohstoff → Vorprodukt → Endprodukt) und `process` je Verarbeitungsknoten. Sonst lässt sich ein T-Shirt (Baumwolle → Garn → Stoff → Nähen) nicht abbilden.
3. **Quellen und Verlässlichkeit je Element** (W5), mit Ansicht „alle Elemente ohne Beleg“.
4. Website-Daten importieren (z. B. Lithium-Kette, Häfen, BACI-Flüsse als Hintergrund).
5. Story-Schritte anlegen und abspielen.
6. Datei speichern und laden, Autosave.
7. PNG- und PPTX-Export.

Nicht nötig für den Test: Video, Offline, Einrasten, Beitragen-Fluss.

### 6.2 Recherche-Vorlage

Eine Zeile pro Knoten oder Kante. Sie ist als Tabelle (CSV) und als Teil der Projektdatei (`claims`, `sources`) nutzbar.

| Feld | Inhalt | Beispiel |
|---|---|---|
| `id` | eindeutig | `cocoa-coop-1` |
| Element | Knoten / Kante / Wegpunkt | Knoten |
| Art | Abbau, Anbau, Verarbeitung, Umschlag, Lager, Verkauf, Transport (Verkehrsträger) | Anbau |
| Name | sachlich, ohne Logo | „Kakaokooperative (Region X)“ |
| Ort | Koordinate [lon, lat] **und** Genauigkeit: exakt / Stadt / Region / Land | Region |
| Gut rein / raus | mit Menge und Einheit, falls belegt | Kakaobohnen, t/Jahr |
| Aussage | Was genau wird behauptet? Ein Satz. | „Liefert Kakao an Hersteller Y“ |
| **Verlässlichkeit** | **belegt**: Primärquelle oder zwei unabhängige seriöse Quellen sagen genau das · **plausibel**: eine seriöse Quelle oder ein eindeutiger indirekter Beleg (z. B. Handelsstatistik + Unternehmensangabe) · **geschätzt**: eigene Ableitung oder Annahme, mit Begründung | plausibel |
| Quelle 1 | Titel, Herausgeber, URL, **Abrufdatum**, Typ (Primär, Sekundär, **Selbstauskunft** des Unternehmens) | Nachhaltigkeitsbericht 2025, Hersteller Y, URL, 23.11.2026, Selbstauskunft |
| Quelle 2 | für kritische Aussagen Pflicht | Bericht einer NGO oder Behörde |
| Stand der Aussage | Jahr, für das sie gilt | 2025 |
| Zitat / Seite | kurze Stelle, die die Aussage trägt (nicht ganze Tabellen kopieren) | S. 34 |
| Kritische Aussage? | ja / nein. Ja = Vorwurf oder negative Bewertung gegenüber einem konkreten Unternehmen (z. B. Abholzung, Zwangsarbeit) | nein |
| Notiz | Unsicherheiten, Widersprüche | „Region, keine genaue Plantage bekannt“ |

**Regeln für den Praxistest:**
- Lieber **Region statt erfundener Punktgenauigkeit**. Die Karte zeigt die Genauigkeit (z. B. Kreis statt Punkt).
- **Selbstauskünfte** von Unternehmen (Lieferantenlisten, Nachhaltigkeitsberichte) als solche kennzeichnen. Sie sind wertvoll, aber nicht unabhängig. Ein Beispiel ist die jährliche öffentliche Lieferantenliste, die manche Hersteller veröffentlichen.
- Handelsstatistik (BACI) belegt **Länderströme**, nie die Lieferbeziehung eines einzelnen Unternehmens. Eine Formulierung wie „Kakao aus Land X geht zu einem großen Teil nach Land Y“ ist belegt, „Hersteller Y bezieht aus Land X“ braucht eine eigene Quelle.
- Je Produkt eine kurze **Methodik-Notiz**: Welche Stufen sind belegt, wo sind Lücken.

### 6.3 Umgang mit Markennamen

Grundsätze (Prüfung durch den Anwalt vorgesehen):
1. **Sachliche Nennung** von Unternehmen und Produkten ist zur Beschreibung erlaubt („Lieferkette einer Tafel Schokolade von Hersteller X“). Wir benutzen **keine Logos, Produktfotos, Markenfarben oder Schriftarten** und nichts, was nach offiziellem Inhalt aussieht.
2. **Kein Eindruck einer Kooperation.** Auf jeder Seite und Folie, die Unternehmen nennt, steht ein fester Hinweis, z. B.:
   > „This project is independent and not affiliated with, endorsed by or sponsored by the companies named. Names are used only to describe products and supply chains.“
3. **Kritische Aussagen** über konkrete Unternehmen (Abholzung, Menschenrechte, Umweltschäden):
   - Nur mit Verlässlichkeit **belegt** (zwei unabhängige Quellen oder eine amtliche Primärquelle).
   - Als **Bericht mit Quelle** formulieren („Laut Bericht von Z aus 2025 …“), nicht als eigene Bewertung.
   - Datum nennen. Ist der Bericht älter als 3 Jahre, prüfen, ob er noch gilt.
   - Keine Schätzung oder Ableitung auf ein Unternehmen beziehen.
   - Hintergrund: In Deutschland können unwahre Tatsachenbehauptungen, die einem Unternehmen schaden, Ansprüche auslösen (u. a. § 824 BGB). Meinungen müssen als solche erkennbar sein. Das genaue Risiko klärt der Anwalt.
4. **Korrekturweg:** Eine Kontaktadresse für Korrekturen, auch für betroffene Unternehmen. Korrekturen werden dokumentiert (Änderungsverlauf je Story).
5. In den **Trailern** nur Beispieldaten oder ausdrücklich belegte Ketten, keine Markennamen im Bild, solange der Anwalt nicht zugestimmt hat.

---

### 6.4 Reihenfolge der Produkte (F9)

| # | Produkt | Warum an dieser Stelle | Was es testet | Voraussetzung |
|---|---|---|---|---|
| 1 | **Schokolade** | Klein, wenige Stufen (Kakao, Zucker, Milch, Verpackung), gut belegt. Zum Kennenlernen des Editors und um die gröbsten Lücken zu finden. | Grundfunktionen, eigene Güter, `process`, Recherche-Vorlage. Kakao hat kritische Themen (Abholzung, Kinderarbeit) → Regeln aus 6.3 von Anfang an üben. | Editor-MVP (C2) |
| 2 | **Lebkuchen** | Direkt danach, weil es zur Jahreszeit passt. Ein Clip Anfang Dezember kann der **erste echte Social-Media-Beitrag** sein. | Viele Herkunftsländer für wenige Zutaten (Gewürze, Mandeln, Honig, Orangeat). Lassen sich gut mit BACI-Flüssen belegen. | siehe Zeitkonflikt unten |
| 3 | **E-Bike** | Sobald die Lithium-Kette steht (A5) | **Datenimport** aus der Website: Lithium-Kette, Batterie-Rezept, BACI-Flüsse ins Projekt übernehmen | A5, „In Editor öffnen“ (C2) |
| 4 | **Fairphone / iPhone** | Als Abschluss, wenn der Editor ausgereift ist | Viele Stufen und Rohstoffe, öffentliche Lieferantenlisten (Selbstauskunft), Vergleich zweier Hersteller | C2–C4 |

**Zeitkonflikt Lebkuchen (F15):** Heute ist der 23.11.2026. Editor (C2) und Video-Export (C3) liegen nach der Roadmap 7–9 Wochen entfernt, also nach Weihnachten. Ein Clip Anfang Dezember geht deshalb nur mit einer Abkürzung. Optionen:

| Option | Was | Aufwand | Nebeneffekt |
|---|---|---|---|
| **a) Bilder-Karussell aus einer handgeschriebenen Projektdatei** | Die Lebkuchen-Kette als `.twr.json` von Hand schreiben (Format W1). Ein kleines Skript rendert je Schritt ein PNG aus Natural-Earth-Umrissen und unseren Linien (Vektor, ohne CARTO, wie SEO E9), in 1:1 bzw. 4:5 (Instagram) und 9:16. Als Karussell-Post. | ca. 3–4 PT (Format + Renderskript) + 2–3 Tage Recherche | Testet W1 und den späteren PNG-Export vorab. Nichts davon ist Wegwerfarbeit. |
| b) wie a), plus kurzes Video | Die Bilder im Schnittprogramm zu einem 15–20-s-Clip mit Überblendungen und Text | a) + ca. 1 Tag Handarbeit | Ein Video schon im Dezember, aber ohne wachsende Routen (die kommen mit C3) |
| c) Lebkuchen-Daten auf die Website | Gewürze, Mandeln und Honig als Güter in den Katalog (HS 0906, 0907, 0908, 0802, 0409), BACI-Pipeline erneut laufen lassen → echte Flüsse nach Deutschland | ca. 1 PT | Belegt die Zahlen im Clip mit unseren eigenen Daten; erweitert den Katalog (passt zu SEO E6) |
| d) Lebkuchen auf 2027 verschieben | Schokolade zuerst wie geplant im Editor, Lebkuchen zur nächsten Saison | – | kein Druck, aber kein Dezember-Beitrag |

✅ **Entschieden (F15): a + c.** Das schiebt die Weichen W1 (Format) und einen Teil von C1 (Bild-Export) etwas nach vorn und verzögert MapLibre und Phase 2 um etwa eine Woche. Ohne Markennamen, nur „Nürnberger Lebkuchen“ als Herkunftsbezeichnung und Zutaten mit Herkunftsländern.

## 7. Offenheit und Kommerzialisierung

### 7.1 Ist-Zustand

| Punkt | Stand | Bewertung |
|---|---|---|
| Codelizenz | MIT (`LICENSE`) | erlaubt jedem, auch dir, kommerzielle Nutzung |
| Copyright-Zeile | „Copyright (c) 2026 the-worlds-resources“ | sollte eine Person oder Organisation nennen, z. B. „Lukas Wittenzellner and contributors“ (W8) |
| Datenlizenz | CC BY 4.0 (`public/data/LICENSE.md`), generierte BACI-Daten mit Quellenangabe (Etalab 2.0) | erlaubt kommerzielle Nutzung durch jeden, mit Namensnennung |
| Beitragsregel Daten | Satz in `CONTRIBUTING.md`: Beiträge erscheinen unter CC BY 4.0; keine OSM-Daten in Masse | gut, aber nur ein Satz ohne Bestätigung |
| CLA / DCO | keins | vor dem ersten externen Beitrag entscheiden |
| Externe Beiträge bisher | **keine** (56 Commits, alle von dir) | Jetzt gibt es keine Altlasten. |
| Abhängigkeiten mit Nutzungsgrenzen | CARTO (laut SEO-Plan nicht-kommerziell bestätigt), Vercel (läuft auf Hobby, der nur für nicht-kommerzielle Nutzung gedacht ist), geplant: OpenRailwayMap-Kacheln (nur für frei zugängliche Anwendungen) | wird bei einer Kommerzialisierung kostenpflichtig oder unzulässig → W3 und T1 mit eigenen Daten |

### 7.2 Optionen

**Code:**

| Option | Wirkung auf eine spätere Kommerzialisierung oder einen Verkauf | Wirkung auf Beitragende | Bewertung |
|---|---|---|---|
| **MIT + CLA** (Lizenzeinräumung, keine Übertragung) | Klare Rechtekette für Käufer (Due Diligence). Du darfst alles auch unter anderer Lizenz verwerten. | CLA ist eine kleine Hürde, ein Klick über CLA Assistant | **empfohlen** |
| MIT + DCO | Kommerzielle Nutzung geht auch so (MIT erlaubt Unterlizenzierung). Neu lizenzieren unter strengeren Bedingungen ist aber unsicher, und die Rechtekette ist schwächer. | sehr niedrige Hürde | gut, falls du bewusst auf maximale Offenheit setzt |
| AGPL-3.0 + CLA | Schützt vor kommerziellen Klonen als Webdienst. Du kannst dank CLA zusätzlich kommerziell lizenzieren (Dual Licensing). | AGPL schreckt manche ab. Ein Wechsel von MIT gilt nur für neuen Code. | nur sinnvoll, wenn Klone ein echtes Risiko sind |
| Source-available (BSL, FSL) | stärkster Schutz | nicht mehr „Open Source“ im üblichen Sinn | **nicht empfohlen**, widerspricht dem Projekt |

**Einschätzung:** Der Wert des Projekts liegt nicht im Code (Vanilla JS, ein paar tausend Zeilen), sondern in **Daten, Quellenarbeit, Marke und Gemeinschaft**. Eine strenge Codelizenz schützt davon wenig. Wichtiger sind:
1. eine saubere **Rechtekette** (CLA),
2. die **Marke** (Name und Logo, ggf. als Wortmarke anmelden; eine Markenrichtlinie erlaubt Forks, aber nicht unter unserem Namen),
3. **Unabhängigkeit von nicht-kommerziellen Diensten** (W3).

**Daten:**
- **CC BY 4.0 für Beiträge beibehalten** (inbound = outbound). Kommerzielle Nutzung, auch durch dich, ist damit erlaubt. Einen exklusiven Datenbestand kannst du daraus nicht mehr machen, er bleibt offen. Das passt zum Projekt.
- Optional könnte die CLA auch Datenbeiträge abdecken (zusätzliches Recht für den Betreiber). Das ist nur nötig, wenn du die Daten später unter **anderen** Bedingungen verwerten willst. Frage F3.
- **ODbL (OSM, OpenRailwayMap):**
  - Bilder, Kacheln und Videos sind „Produced Works“ und brauchen nur die Quellenangabe.
  - Aus OSM abgeleitete **Datenbanken** (z. B. eine Datei mit eingerasteten Routen oder extrahierten Bahnstrecken) stehen unter ODbL mit Share-Alike.
  - Deshalb: eigene Dateien, eigene Lizenzangabe, nie mit CC-BY-Datensätzen mischen. `CONTRIBUTING.md` verbietet das Kopieren von OSM-Koordinaten in Masse schon heute.
- **Editor-Uploads** (ab C4): Nutzungsbedingungen beim Einreichen:
  - Checkbox „Ich habe die Rechte an den Inhalten, sie erscheinen unter CC BY 4.0“.
  - Hinweis auf Quellenpflicht.
  - Private Projekte bleiben lokal, wir speichern nichts.

### 7.3 Vor dem ersten externen Beitrag erledigen

Technisch vorbereiten (die rechtlichen Texte prüft der Anwalt):
1. Entscheidung Codelizenz plus CLA oder DCO (F1, F2).
2. CLA-Text (Vorlage z. B. Apache Individual CLA oder Harmony-Vorlagen) vom Anwalt anpassen lassen.
3. **CLA Assistant** (GitHub-App, kostenlos) einrichten. Er prüft jeden Pull Request und bittet um Zustimmung per Klick.
4. `LICENSE`: Copyright-Zeile korrigieren. `CONTRIBUTING.md`: Abschnitt „Rechte und Lizenz“ mit CLA, CC BY 4.0 für Daten und dem ODbL-Verbot.
5. Pull-Request-Vorlage (`.github/pull_request_template.md`) mit Checkboxen: Quellen angegeben, Rechte an den Daten, keine OSM-Daten in Masse, Verlässlichkeit gesetzt.
6. Issue-Vorlage für Daten (`data.yml`) um denselben Lizenzhinweis ergänzen. Auch Beiträge über Issues sind Beiträge.
7. `CODE_OF_CONDUCT.md` (heute nur ein Absatz in CONTRIBUTING).
8. Optional: Markenrichtlinie (`TRADEMARK.md`), sobald eine Marke angemeldet ist.

---

### 7.4 Vorbereitet sein: mehr Traffic oder kommerzielle Nutzung (F11, F12)

Keine drastischen Schritte jetzt. Diese Liste macht nur sichtbar, was dann zu tun ist. Die Architektur-Entscheidungen W2/W3 halten den Weg offen.

| Auslöser | Was dann zu tun ist | Vorbereitet durch |
|---|---|---|
| **Kommerzielle Nutzung** (Werbung, Bezahlfunktionen, Firmenkunden, Verkauf) | Vercel auf Pro (Hobby ist nur nicht-kommerziell). CARTO kommerziell lizenzieren **oder** Live-Karte auf eigenen Basemap umstellen. Keine fremden Kacheln mit „nur frei“-Bedingung (OpenRailwayMap). Nutzungsbedingungen und Impressum anpassen. | W3 (eigener Basemap), T1 (eigene Netzdaten), F2 (CLA) |
| **Deutlich mehr Traffic** | Vercel-Limits prüfen (Bandbreite, Funktionsaufrufe; die Seite ist statisch und braucht kaum Funktionen). CARTO-Kontingent prüfen (laut SEO-Plan bis 5 Mio. Tile-Requests pro Monat kostenlos). Große Dateien (PMTiles) bei Bedarf auf einen günstigen Objektspeicher mit CDN auslagern. | statische Architektur, partitionierte Daten (EP 4.3) |
| **Vor den Trailern oder größerer Bekanntheit** | Marke prüfen und ggf. anmelden (F12, Wiedervorlage). Markenrichtlinie für Forks. | – |
| **Verkauf des Projekts** | Rechtekette nachweisen: CLA-Liste, Lizenzen aller Daten und Abhängigkeiten (`sources.json`), ODbL-Dateien getrennt. | F2, W8, `sources.json` |

## 8. Positionierung

| Werkzeug | Was es ist | Was wir übernehmen | Abgrenzung |
|---|---|---|---|
| **Sourcemap** | Unternehmenssoftware für Lieferketten-Kartierung, Rückverfolgung und Compliance (z. B. EUDR). Gestartet 2008 als offenes Projekt am MIT, später als kommerzielle Firma ausgegründet. | Stufenmodell (Tier 1…n) und **Nachweis pro Verbindung**. Das ist unsere Verlässlichkeit je Kante. Und der Präzedenzfall: Ein offenes Projekt kann später zu einem Unternehmen werden, wenn die Rechte sauber sind. | Sourcemap arbeitet mit vertraulichen Lieferantendaten für Unternehmen. Wir arbeiten mit **öffentlichen, belegten Daten für alle**. |
| **Flourish** | Datenstorys und Diagramme, Story-Folien, PowerPoint-Add-in (nur in bezahlten Tarifen, offline ein statisches Ersatzbild) | Story als Folge von Zuständen. Ersatzbild, wenn die Live-Ansicht fehlt (unser PNG pro Schritt). | Allgemeines Diagramm-Werkzeug, keine Lieferketten-Logik, keine offenen Daten |
| **Mult.dev** | App (iOS/macOS) für animierte Reiserouten-Videos, Formate für Reels/TikTok/Shorts, Import von GPX/KML/GeoJSON | Wachsende Route als Animation, Hochformat, einfache Bedienung | Reiserouten, keine Güter, keine Quellen, geschlossen und kostenpflichtig |
| **Kepler.gl** (+ hubble.gl) | Offenes Werkzeug (MIT) für die Analyse großer Geodaten, mit hubble.gl Video-Export über Keyframes (experimentell) | Keyframe- bzw. Zeitleisten-Prinzip für den Export (W7) | Für Analysten, ohne Erzählung und ohne kuratierte Inhalte |
| **ArcGIS StoryMaps** | Kartengestützte Geschichten, geführte Kartentouren. Öffentliches Konto kostenlos, aber nur nicht-kommerziell und eingeschränkt. | Geführte Tour: Schritt = Kamera + Text + Ebene | Proprietär, an die Esri-Plattform gebunden, kein offenes Datenformat |

**Unser Alleinstellungsmerkmal:** **Ein offener, belegter Graph der Lieferketten der Welt, mit dem jeder eigene Geschichten erzählen kann.**
- Website und Editor teilen **denselben Graphen**: echte Handelsdaten (BACI), kuratierte Infrastruktur, Produktrezepte. Eine Story baut auf geprüften Daten auf, statt bei null zu beginnen.
- **Verlässlichkeit ist sichtbar** (belegt / plausibel / geschätzt) und jede Aussage hat eine Quelle. Keins der geprüften Werkzeuge macht das so.
- **Offen in beide Richtungen:** Was Nutzer bauen, kann (mit Prüfung) in die gemeinsame Karte zurückfließen.
- **Kostenlos, ohne Konto, mit Fokus auf Bildung**, mit Exporten in die Formate, die im Unterricht und auf Social Media gebraucht werden.

---

## 9. Idee 5 und 6 im Detail

### 9.1 Transportnetze

**Ein allgemeines Konzept „Transportnetz“: ja.** Jede Route hat einen Verkehrsträger (`mode`, W5). Ein Netz ist eine Ebene von Linien gleichen Verkehrsträgers, die als Hintergrund dient (Hochgeschwindigkeitsstrecken, Autobahnen, Seewege, Pipelines anderer Anbieter, Luftfrachtkorridore). Unsere eigenen Routen sind die **Nutzung** eines Netzes. Später (T2) kann eine Route auf einem Netz einrasten.

| Frage | Einschätzung |
|---|---|
| **Sinnvoll, welche Phase?** | Deine Vermutung stimmt. **Ebene früh nach MapLibre (T1)**, im Editor am nützlichsten. **Einrasten und Routing spät (T2, Stufe E).** |
| **Fremde Kacheln nutzen?** | **OpenRailwayMap-Kacheln:** Laut OpenRailwayMap-API-Seite nur für Anwendungen, die frei und ohne Registrierung zugänglich sind. Für starke Nutzung wird ein eigener Server empfohlen. Heute würde das passen, bei Kommerzialisierung oder Accounts nicht mehr. **OSM-Standardkacheln** (tile.openstreetmap.org): laut Tile Usage Policy nicht für starke oder kommerzielle Nutzung gedacht, Sperrung ohne Vorwarnung möglich. Raster passt außerdem nicht zum Video-Export. → **Eigene Vektordaten erzeugen und statisch hosten** (PMTiles). |
| **Woher die Daten?** | **Weltkarte:** Natural Earth hat Straßen und Eisenbahnen (1:10 Mio., Public Domain, keine Quellenangabe nötig). Laut Dokumentation sind die Eisenbahnen nicht überall weltweit vollständig, vor Nutzung prüfen. Das reicht für die Übersicht. **Detail (Europa, Hochgeschwindigkeit):** OSM-Auszug (z. B. Geofabrik) → Filter `railway=rail` + `highspeed=yes` bzw. `highway=motorway` → vereinfachen → PMTiles (z. B. mit `tippecanoe`). Lizenz ODbL, Quellenangabe „© OpenStreetMap“, Datei getrennt halten (W8). |
| **Lizenz-Folgen** | Die Kacheln sind ein „Produced Work“ (Quellenangabe genügt). Eine Datei, aus der man die Strecken als Daten herausziehen kann, ist eher eine Datenbank, also ODbL mit Share-Alike. Für eine **getrennte** Netzdatei ist das kein Problem, solange sie nicht mit CC-BY-Daten vermischt wird. Genau prüfen lassen. |
| **Routing** | **Straße:** OSRM (BSD-2) oder GraphHopper (Apache-2.0). Beide brauchen einen Server mit großen Daten. Öffentliche Demo-Server sind nicht für den Produktivbetrieb gedacht. **Schiene:** eigener Graph aus den OSM-Schienendaten. Für Europa vereinfacht ist er klein genug für den Browser (Dijkstra/A* im Client), ohne Server. **See:** ein offenes Seewege-Netz (z. B. das Eurostat-Projekt „SeaRoute“, Lizenz vor Nutzung prüfen). **Empfehlung:** zuerst Schiene und See im Browser (statisch), Straße erst, wenn ein Server ohnehin kommt. Eingerastete Linien beim Beitragen **nicht** als Geometrie speichern, sondern als Wegpunkte; die Linie wird beim Anzeigen berechnet (W8). |

### 9.2 Bündelung: Bewertung deines Vorschlags

**Zwischenknoten als gemeinsames Zwischenziel und Zwischenquelle: sinnvoll, mit deiner Unterscheidung.**
- **Sichtbare Umschlagknoten** (Hafen Rotterdam, Verteilzentrum, Meerenge): Sie gibt es schon (`import_hub`, `transit_point`), mit Inspector und Quelle. Sie sind Teil der Lieferkette.
- **Unsichtbare Wegpunkte** (`kind: waypoint`, W4): nur für die Linienführung. Sie sind adressierbar, damit mehrere Routen sie teilen können, haben aber keinen Marker und tauchen nicht in der Kettenliste des Inspectors auf.

**Darstellung eines gemeinsamen Teilstücks:**
- Teilen sich mehrere Routen die Folge `Wegpunkt A → Wegpunkt B`, wird das Teilstück **einmal** gezeichnet.
- **Breite nach Summe der Mengen**, wenn alle Routen eine Menge haben. Sonst nach Anzahl der Routen, mit Mindest- und Höchstbreite.
- **Farbe:** bei einem Gut dessen Farbe. Bei mehreren Gütern neutral, mit **parallelen Farbstreifen** (bis 3 Güter) oder einem Muster.
- **Hover/Klick** auf das Teilstück: Liste der Routen, die darüber laufen. Klick auf eine hebt nur ihren ganzen Weg hervor.
- **Fließrichtung:** Pfeile oder Strich-Animation in Fließrichtung. Bei Gegenverkehr zwei schmale Bahnen nebeneinander.
- Technisch: Die Teilstücke werden **beim Laden** aus dem Graphen berechnet (Kanten in Segmente zwischen aufeinanderfolgenden Knoten/Wegpunkten zerlegen, gleiche Segmente zusammenfassen). In den Daten wird nichts doppelt gespeichert.

**Automatisches Edge Bundling** (Kräfte- oder Hierarchie-Verfahren):

| Für | Gegen |
|---|---|
| Keine Datenpflege, wirkt bei Hunderten Linien aufgeräumt | Verzerrt die Geografie: Linien verlaufen nicht mehr dort, wo die Ware fährt (über Land statt über See). |
| Gut für **abstrakte** Bögen | Mehrdeutig: Welcher Strang gehört zu welcher Route? |
| | Nicht stabil: Kleine Datenänderung → anderes Bild. Schlecht für Stories und Videos. |
| | Rechenaufwand bei jeder Änderung |

**Empfehlung:**
- **Kuratierte Routen und Editor-Projekte:** explizite Bündelung über Wegpunkte (dein Vorschlag).
- **BACI-Bögen** der Export- und Import-Ansicht (abstrakt, keine echte Route): leichte automatische Bündelung **an Ziel oder Quelle** (Bögen laufen kurz vor dem Ziel zusammen), keine allgemeine Bündelung. Das gehört zu A2/A3.

**Folgen für das Datenmodell:**
- Eine Route ist eine **Folge von Knoten**: `from`, `via[]`, `to`. Freie Koordinaten in `via` bleiben für Kurven erlaubt, werden aber nicht geteilt.
- Im heutigen GeoJSON bekommt eine Route ein optionales Feld `via_node_ids`. Die LineString-Geometrie bleibt zum Anzeigen erhalten. Der Validator prüft, dass sie durch die genannten Wegpunkte läuft (gleiche Toleranz wie heute an den Enden).
- Wegpunkte als eigene Point-Features mit `visible: false` und `type: waypoint`. Das erweitert das `type`-Enum und die Regel in `CONTRIBUTING_DATA.md` („Waypoints are not separate Features“). Bestehende Daten bleiben gültig.
- Kettensuche (`supplyChain.js`) und Korridore (`corridors()`) gehen durch Wegpunkte hindurch. Als Station zählen sie nicht.

---

## 10. Entscheidungen

Am 23.11.2026 geklärt: F1–F11 und F13–F15. F12 ist vorerst zurückgestellt.

| # | Frage | Entscheidung |
|---|---|---|
| **F1** | Codelizenz | ✅ **MIT behalten** |
| **F2** | CLA oder DCO für Code-Beiträge | ✅ **CLA** (Lizenzeinräumung, keine Übertragung) über CLA Assistant, Text vom Anwalt. Muss vor dem ersten externen Pull Request stehen (7.3). |
| **F3** | Soll die CLA auch Datenbeiträge abdecken? | ✅ **Nein**, CC BY 4.0 reicht. Daten bleiben für alle offen. |
| **F4** | MapLibre vor EP Phase 2 vorziehen (W2) | ✅ **Ja**, Reihenfolge A2a → A2 |
| **F5** | Eigener Basemap auch für die Live-Karte? | ✅ **Erst Export und offline.** CARTO bleibt auf der Live-Karte, bis das Aussehen verglichen ist. |
| **F6** | Editor als PWA, Desktop-App nur bei Bedarf | ✅ **Ja** |
| **F7** | Kuratierte Stories als eigene Seiten (`/stories/<id>`) | ✅ **Ja**, ab B2. Nutzerprojekte bekommen keine Seiten. |
| **F8** | Export-Reihenfolge PNG → PPTX → MP4 → GIF, Add-in später | ✅ **Ja** |
| **F9** | Produkte im Praxistest | ✅ **Reihenfolge festgelegt** (6.4): Schokolade → Lebkuchen → E-Bike → Fairphone/iPhone |
| **F10** | Unternehmen namentlich in der öffentlichen Karte? | ✅ **Nur mit Verlässlichkeit „belegt“** und nach anwaltlicher Prüfung der Hinweistexte |
| **F11** | Vercel-Tarif | ✅ **Hobby** (nicht-kommerziell). Bleibt vorerst so. Vorbereitung auf mehr Traffic und eine spätere kommerzielle Nutzung: Checkliste in 7.4. |
| **F12** | Wortmarke „The World's Resources“ anmelden? | ⏸ **Vorerst nicht.** Steht in der Checkliste 7.4, Wiedervorlage vor den Trailern. |
| **F13** | Beitragende im Inspector nennen („Contributed by …“) | ✅ **Ja**, freiwillig, mit Einwilligung beim Einreichen |
| **F14** | Weitere Leitlinien nach „Damit“? | ✅ **Keine** |
| **F15** | Lebkuchen-Clip Anfang Dezember: Wie, obwohl Editor und Video-Export noch Wochen entfernt sind? | ✅ **Option a + c** (6.4): Bilder-Karussell aus einer handgeschriebenen Projektdatei, Lebkuchen-Zutaten mit BACI-Flüssen auf der Website. MapLibre und EP Phase 2 rücken dafür ca. 1 Woche nach hinten. |

---|---|---|---|
| **F1** | Codelizenz | **MIT behalten** | W8, alles Weitere |
| **F2** | CLA oder DCO für Code-Beiträge | **CLA** (Lizenzeinräumung, keine Übertragung) über CLA Assistant, Text vom Anwalt | W8 |
| **F3** | Soll die CLA auch **Datenbeiträge** abdecken (zusätzliches Recht für dich über CC BY hinaus)? | Nur wenn du die Daten später unter anderen Bedingungen verwerten willst. Sonst reicht CC BY 4.0. | W8, Nutzungsbedingungen im Editor |
| **F4** | **MapLibre vor Phase 2 vorziehen** (W2) | **ja** | Reihenfolge A2a → A2 |
| **F5** | Eigener Basemap (Protomaps, „© OpenStreetMap“) zuerst nur für Export und offline oder **sofort** auch für die Live-Karte (ersetzt CARTO, weniger Drittanbieter, Stil anpassbar)? | erst Export/offline (C1), Live-Karte nach Vergleich des Aussehens | W3, Datenschutzerklärung |
| **F6** | Editor als **PWA** (Desktop-App nur bei Bedarf) | **ja** | C4 |
| **F7** | Stories als **eigene Seiten** (`/stories/<id>`) für SEO und Teilen? | ja, ab B2, aber nur kuratierte Stories, keine Nutzerprojekte | SEO-Plan |
| **F8** | Reihenfolge Export-Formate: PNG → PPTX → MP4 → GIF, Add-in später | **ja** | C1–C3 |
| **F9** | Welche **Produkte** im Praxistest zuerst? Für den Anfang eignen sich Produkte mit öffentlichen Lieferantenangaben. Bei Produkten mit vielen kritischen Aussagen (Abholzung, Arbeitsbedingungen) ist der Belegaufwand höher. | Start mit **einem einfachen Produkt** (Schokolade oder T-Shirt, wenige Stufen), dann Smartphone (viele Stufen) | P |
| **F10** | Sollen Unternehmen in der **öffentlichen** Karte namentlich auftauchen oder nur in privaten Editor-Projekten? | öffentlich nur mit Verlässlichkeit „belegt“ und nach anwaltlicher Prüfung der Hinweistexte | 6.3, C4 |
| **F11** | Vercel-Tarif: Hobby (nicht-kommerziell) oder Pro? | Tarif prüfen, vor jeder Kommerzialisierung auf Pro | Hosting |
| **F12** | **Marke** „The World's Resources“ anmelden (Wortmarke)? | sinnvoll vor größerer Bekanntheit (Trailer), Kosten und Klassen mit dem Anwalt klären | 7.2 |
| **F13** | Dürfen Beitragende im Inspector **namentlich** genannt werden („Contributed by …“)? | ja, freiwillig mit Einwilligung beim Einreichen | Trailer b, C4 |
| **F14** | Leitlinie 6 aus der ersten Ideen-Runde endete bei „Damit“: Gibt es noch weitere Anforderungen? | Bitte ergänzen, falls ja | EP 4.7 |

---

## Quellen

- OpenRailwayMap API und Nutzungsregeln: [wiki.openstreetmap.org/wiki/OpenRailwayMap/API](https://wiki.openstreetmap.org/wiki/OpenRailwayMap/API)
- OSMF Tile Usage Policy: [operations.osmfoundation.org/policies/tiles](https://operations.osmfoundation.org/policies/tiles/), Licence and Legal FAQ: [osmfoundation.org/wiki/Licence_and_Legal_FAQ](https://osmfoundation.org/wiki/Licence_and_Legal_FAQ)
- ODbL Produced Work Guideline: [osmfoundation.org/wiki/Community_Guidelines/Produced_Work_-_Guideline](https://osmfoundation.org/wiki/Community_Guidelines/Produced_Work_-_Guideline)
- Protomaps Basemap (Lizenz, Quellenangabe, PMTiles): [protomaps.com/faq](https://protomaps.com/faq), [docs.protomaps.com/basemaps/downloads](https://docs.protomaps.com/basemaps/downloads)
- Natural Earth Straßen und Eisenbahnen: [purl.stanford.edu/nr660bt1223](https://purl.stanford.edu/nr660bt1223), [purl.stanford.edu/vs175mk0273](https://purl.stanford.edu/vs175mk0273)
- MapLibre Bild-für-Bild-Rendering: [remotion.dev/docs/maps](https://www.remotion.dev/docs/maps), [github.com/bjperson/maplibre-gl-video-export](https://github.com/bjperson/maplibre-gl-video-export)
- Mediabunny (Nachfolger von mp4-muxer): [mediabunny.dev](https://mediabunny.dev/), [github.com/Vanilagy/mp4-muxer](https://github.com/Vanilagy/mp4-muxer)
- hubble.gl: [github.com/visgl/hubble.gl](https://www.github.com/visgl/hubble.gl)
- Flourish in PowerPoint: [helpcenter.flourish.studio – How to embed Flourish projects in PowerPoint](https://helpcenter.flourish.studio/hc/en-us/articles/15168223674127-How-to-embed-Flourish-projects-in-PowerPoint-presentations)
- Mult.dev: [App Store](https://apps.apple.com/us/app/mult-dev-animated-maps/id1606800134)
- Sourcemap: [news.mit.edu – End-to-end supply chain transparency](https://news.mit.edu/2021/end-to-end-supply-chain-transparency-sourcemap-0913), [sourcemap.com/supply-chain-mapping](https://sourcemap.com/supply-chain-mapping)
- ArcGIS StoryMaps Lizenzierung: [ArcGIS StoryMaps – Licensing](https://ngmdb.usgs.gov/arcgis/help/en/storymaps/reference/licensing.htm)

Nicht abschließend geprüft (vor Umsetzung nachlesen): aktueller Wortlaut der CARTO-Bedingungen ab 01.12.2026, Vercel-Tarifbedingungen, Lizenz des Eurostat-Seewegenetzes, Abdeckung der Natural-Earth-Eisenbahnen. Alle rechtlichen Einschätzungen sind keine Rechtsberatung.
