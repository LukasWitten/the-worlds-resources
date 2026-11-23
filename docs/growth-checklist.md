# Growth-Checkliste: Aufgaben außerhalb des Codes

Stand: 23.11.2026, Rev. 2 (mit den Entscheidungen aus [vision-assessment.md](vision-assessment.md)) · Gehört zu [seo-geo-plan.md](seo-geo-plan.md)
Für jeden Punkt steht dabei, **womit du heute anfangen kannst**. Fertige Post-Texte liegen in `LAUNCH_KIT.md`, die Datei ist lokal und nicht im Repo.

---

## 0. Dringend (vor dem 1. Dezember 2026)

- [x] **CARTO-Status geklärt (23.11.2026): nicht-kommerziell.** Trotzdem monatlich die Nutzung im CARTO-Konto prüfen. Der Rest des Punktes bleibt als Hintergrund stehen. Ab 1.12.2026 gelten für Keys, die kommerziell genutzt werden, bezahlte Pläne. Nicht-kommerzielle Nutzung bleibt bis 5 Mio. Tile-Requests pro Monat frei. „Kommerziell“ heißt laut CARTO: Die Seite erzielt Einnahmen (auch Werbung), kostet Geld oder wird von einem Unternehmen betrieben.
  **Start:** Im CARTO-Konto nachsehen, wie der Key eingestuft ist, und die Nutzung prüfen. Falls unklar, CARTO kurz schreiben („open-source, non-commercial educational project, no revenue“). Bedingungen: carto.com/legal/basemap-terms

- [ ] **Vercel-Tarif im Blick behalten** (Vision-Bewertung F11): Hobby ist nur für nicht-kommerzielle Nutzung gedacht. Das passt heute. Vor jeder Kommerzialisierung (Werbung, Bezahlfunktionen, Firmenkunden) auf Pro wechseln, und CARTO kommerziell lizenzieren oder auf den eigenen Basemap umstellen.
  **Start:** nichts zu tun, solange das Projekt nicht-kommerziell bleibt. Checkliste in `docs/vision-assessment.md` 7.4.

## 0a. Recht und Beitragende (vor dem ersten externen Pull Request)

Aus der Vision-Bewertung (F1–F3, W8, Abschnitt 7.3). Diese Aufgaben liegen bei dir, die technischen Teile kann ich vorbereiten.

- [ ] **CLA-Text** (Lizenzeinräumung, keine Übertragung; nur für Code, Daten bleiben CC BY 4.0) vom Anwalt anpassen lassen.
  **Start:** Vorlage Apache Individual CLA oder Harmony-Vorlage an den Anwalt geben, mit dem Hinweis „MIT-Projekt, Lizenzeinräumung, keine Übertragung“.
- [ ] **CLA Assistant** (kostenlose GitHub-App) für das Repo einrichten, sobald der Text steht.
  **Start:** cla-assistant.io → mit GitHub anmelden → Repo wählen → CLA-Text als Gist verlinken.
- [ ] **Copyright-Zeile in `LICENSE`** korrigieren (heute „the-worlds-resources“, keine Person) und den Abschnitt „Rights and licence“ in CONTRIBUTING, die PR-Vorlage und `CODE_OF_CONDUCT.md` freigeben. Den Code-Teil kann ich vorbereiten.
  **Start:** Sag mir, welcher Name in die Copyright-Zeile soll.
- [ ] **Hinweistexte zu Unternehmen** in der öffentlichen Karte (F10) anwaltlich prüfen lassen, bevor Firmen namentlich erscheinen.
- [ ] **Wortmarke** „The World's Resources“: zurückgestellt (F12). Wiedervorlage vor den Trailern.

## 1. Suchmaschinen einrichten

- [ ] **Google Search Console:** Domain-Property `theworldsresources.org`.
  **Start:** search.google.com/search-console → „Domain“ → TXT-Eintrag in Cloudflare-DNS anlegen → bestätigen → Sitemap `https://www.theworldsresources.org/sitemap.xml` einreichen. Nach Phase 1 die neue Sitemap erneut einreichen.
- [ ] **Bing Webmaster Tools.** Wichtig, weil ChatGPT-Suche und Copilot auf Bing zurückgreifen.
  **Start:** bing.com/webmasters → „Import from Google Search Console“ (übernimmt Verifizierung und Sitemap in 2 Minuten).
- [ ] **IndexNow** aktivieren, sobald die Key-Datei aus Phase 2a live ist.
  **Start:** In Bing Webmaster → IndexNow prüfen, ob Pings ankommen.
- [ ] **Cloudflare:** prüfen, dass „Block AI bots“ und „Managed robots.txt“ **aus** sind (Stand heute: aus).
  **Start:** Cloudflare-Dashboard → Security → Bots (bzw. „AI Crawl Control“).
- [ ] **Monatliche KI-Stichprobe** (10 Minuten): Diese Fragen in ChatGPT, Claude, Perplexity und Google stellen und notieren, ob die Seite genannt wird.

| Frage | ChatGPT | Claude | Perplexity | Google AI Overview |
|---|---|---|---|---|
| Where does Frankfurt Airport's jet fuel come from? | | | | |
| Where does lithium come from? | | | | |
| Lithium-ion battery supply chain map | | | | |
| Where does Germany get its crude oil? | | | | |
| Germany main resource imports | | | | |
| Which pipelines supply Bavaria with oil? | | | | |

## 2. Launch und Communitys

Reihenfolge: **LinkedIn → (1–2 Tage später) Hacker News → Reddit, ein Subreddit pro Tag.** So kommen Korrekturen aus dem eigenen Netzwerk, bevor die großen Plattformen draufschauen.

- [ ] **LinkedIn** (Deutsch).
  **Start:** Text aus `LAUNCH_KIT.md` §1. Am besten mit 10–15-Sekunden-Bildschirmvideo: Klick auf Wesseling → die Kette leuchtet auf. Link im Post selbst, nicht im Kommentar.
- [ ] **Hacker News „Show HN“.**
  **Start:** `LAUNCH_KIT.md` §2. Di–Do, 15–17 Uhr deutscher Zeit. Den ersten Kommentar sofort selbst schreiben, 2 Stunden lang antworten, nicht um Upvotes bitten.
- [ ] **r/dataisbeautiful.**
  **Start:** Titel mit `[OC]`, **Bild** der Rheinland-Kette (nicht die Startseite), innerhalb 1 h der Pflichtkommentar mit Quelle und Werkzeugen (`LAUNCH_KIT.md` §3).
- [ ] **r/MapPorn.**
  **Start:** Link oder Bild mit klarem Titel „… click any port, pipeline or refinery to see its whole supply chain“.
- [ ] **r/de, r/germany, r/opensource, r/gis:** vorher jeweils die Regeln zur Eigenwerbung lesen.
- [ ] **Mastodon und Bluesky:** Hashtags `#OpenData #Maps #Energy`.
  **Start:** Kurztext aus `LAUNCH_KIT.md` §4.
- [ ] **Newsletter und Blogs, die Einreichungen annehmen:**
  **Start:**
  - *Data Is Plural* (Jeremy Singer-Vine, Datensätze; Hinweis per Formular);
  - *Maps Mania* (Blog über interaktive Karten);
  - *weeklyOSM*, nur falls OSM-Bezug.

  Einreichen jeweils mit einem Satz und dem Link auf eine konkrete Kette.
- [ ] **Verzeichnisse:** awesome-Listen auf GitHub (z. B. *awesome-open-data*, *awesome-geojson*, *awesome-maps*) per Pull Request, Product Hunt (optional).
  **Start:** Ein PR pro Liste. Eine Zeile mit Beschreibung „Open map of resource supply chains (oil, gas, lithium) with sourced GeoJSON, CC BY 4.0“.

## 3. Journalistinnen und Journalisten

- [ ] **Datenjournalismus- und Wirtschaftsredaktionen** (DE): Datenteams von Spiegel, SZ, Zeit, BR, Tagesspiegel, Handelsblatt, Correctiv sowie Energie-Fachmedien (z. B. Tagesspiegel Background Energie & Klima, energate).
  **Start:**
  - Eine Liste mit 10 konkreten Personen anlegen (Autorinnen und Autoren, die zuletzt über Rohstoffe, Gas oder Lieferketten geschrieben haben).
  - Kurze Mail, kein Pressetext: ein Satz zum Projekt, ein konkreter Aufhänger („So kommt das Kerosin zum Frankfurter Flughafen, Karte zum Einbetten“), Link, Hinweis auf CC BY 4.0.
- [ ] **International:** Visual-/Graphics-Desks (z. B. Reuters Graphics, FT Visual, Bloomberg Graphics) erst, wenn Länder- und Ressourcenseiten (Phase 2b) online sind.
  **Start:** vormerken.
- [ ] **Pressebereich:** eine kurze Seite oder Datei mit Logo, Screenshots, Beschreibung in 1/3/5 Sätzen und Kontakt.
  **Start:** Kann ich in Phase 1 als `/about#press` anlegen. Sag Bescheid, ob du das möchtest.

## 4. Lehrende, Hochschulen, Forschung

- [ ] **Lehrstühle und Institute zu Rohstoffen und Lieferketten.**
  **Start:**
  - Angebot: „freie Karte und Daten für Lehre, Abschlussarbeiten willkommen (Datenpflege, neue Ressourcen)“.
  - Mögliche Kontakte:
    - **KIT** (z. B. ITAS – Technikfolgenabschätzung, Institut für Industriebetriebslehre);
    - **TU Bergakademie Freiberg** und **Helmholtz-Institut Freiberg für Ressourcentechnologie**;
    - **RWTH Aachen** (Rohstoff- und Energiethemen);
    - **Wuppertal Institut**;
    - **Öko-Institut**.
  - Pro Institut eine Person anschreiben, die zu Rohstoffen lehrt.
- [ ] **DERA (Deutsche Rohstoffagentur bei der BGR):** potenzielle Datenquelle *und* Multiplikator.
  **Start:** Kontakt über die DERA-Website, Frage nach Feedback und der Nutzung ihrer öffentlichen Rohstoffinformationen mit Quellenangabe.
- [ ] **Schulen (Erdkunde, Wirtschaft, Politik):**
  **Start:**
  - Ein Unterrichtsvorschlag als einseitiges PDF: „Woher kommt unser Benzin?“ mit 3 Aufgaben zur Karte.
  - Einreichen bei Bildungsservern der Länder, Lehrer-Online, ZUM und den Fachverbänden (z. B. Verband Deutscher Schulgeographen).
  - Den Text kann ich nach Phase 2a entwerfen.
- [ ] **Zitierbarkeit für die Forschung:** Datenrelease auf **Zenodo** mit DOI (GitHub-Integration: jedes Release bekommt eine DOI).
  **Start:** zenodo.org → GitHub verbinden → Repo aktivieren → nächstes GitHub-Release erstellen.

## 5. Aktuelle Anlässe nutzen

Ziel: Wenn ein Thema in den Nachrichten ist, gibt es bei uns schon die passende Seite. Dann kommt am selben Tag ein kurzer Post mit Deep Link.

| Anlass | Unsere Seite (heute / ab Phase) | Start |
|---|---|---|
| Spannungen an der Straße von Hormus / im Roten Meer / Suezkanal | Tankerrouten Golf → Suez → Triest, Bayern-Kette (heute) | Post-Vorlage vorbereiten: „So hängt Bayerns Sprit an Hormus und Suez“ + Link `#map/refinery-bayernoil` |
| Zölle und Handelskonflikte | Länder- und Routenseiten (Phase 2b) | Liste der 5 Rohstoffe mit der höchsten Lieferantenkonzentration für DE bereithalten (Insight #5) |
| Exportbeschränkungen (z. B. Gallium, Germanium, Graphit, seltene Erden) | Ressourcenseiten nach Katalog-Erweiterung (E6) | Diese Güter bei der Erweiterung zuerst aufnehmen |
| Gaspreise, Speicherstände im Winter | Gasinfrastruktur, Speicher (heute) | Im Dezember/Januar Post zu Speichern und LNG-Terminals |
| Raffinerie Schwedt / Druschba | Schwedt-Kette, Rostock–Schwedt (heute) | Bei jeder Nachricht: Post mit Link auf die Kette |
| EU Critical Raw Materials Act, Batterieverordnung | Lithium, später Batterie (Phase 5) | Insight #4 vorbereiten |
| **Advent / Weihnachten (Anfang Dezember 2026)** | **Lebkuchen-Story** (Vision-Bewertung F15): Bilder-Karussell + Zutaten mit BACI-Flüssen. Sobald B2 läuft, auch als Seite `/stories/lebkuchen` | Karussell auf LinkedIn, Instagram und Bluesky posten. Jedes Bild mit Quelle und `theworldsresources.org`, Link auf die Story bzw. die Kakao-, Honig- und Gewürzseiten |
| Jahreszahlen (BACI im Januar, USGS MCS im Januar/Februar) | Daten-Update | Nach jedem Update Post „What changed in {year}“ |

**Start:** Google Alerts (oder ein RSS-Feed) für „Hormus“, „Exportbeschränkung Rohstoffe“, „Lithium Lieferkette“, „Schwedt“, „LNG Terminal“ einrichten.

## 6. Verlinkungen pflegen

- [ ] **Wikidata-Eintrag** für das Projekt (Website, Lizenz, GitHub). Wikipedia nur, wenn unsere Seite eine Aussage *als Quelle* belegt. Keine Eigenwerbung.
  **Start:** Wikidata-Item „The World's Resources“ (Instanz von: Website / Datenbank) anlegen.
- [ ] **Antworten statt Werbung:** In Foren und Q&A-Seiten (Reddit, Stack Exchange „Earth Science“/„Economics“, Quora) Fragen zu Ölrouten oder Lithium beantworten und die passende Seite nur als Beleg verlinken.
  **Start:** 1× pro Woche 15 Minuten.
- [ ] **Embeds anbieten** (ab Phase 3): Jede Erwähnung in Blogs oder Medien mit dem Hinweis beantworten, dass es ein Einbettungs-Snippet gibt.
- [ ] **Erwähnungen ohne Link** finden (Google-Suche nach `"The World's Resources" -site:theworldsresources.org`) und freundlich um einen Link bitten.
  **Start:** Monatlich, ab ca. 4 Wochen nach dem Launch.

## 7. Messen und auswerten (monatlich, 30 Minuten)

- [ ] Search Console: Seiten im Index, Abfragen mit Impressionen, aber ohne Klicks (dafür Title und Description verbessern)
- [ ] Bing Webmaster: dasselbe
- [ ] Vercel Analytics: Top-Referrer, darunter KI-Dienste (`chatgpt.com`, `perplexity.ai`, `claude.ai`, `copilot.microsoft.com`)
- [ ] KI-Stichprobe (Tabelle in 1.)
- [ ] Neue Erwähnungen und Links (6.)
