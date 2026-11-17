# The World's Resources – Projekt-Checkliste & Deployment-Roadmap

Diese Checkliste führt dich Schritt für Schritt von der lokalen Überprüfung über den Git-Commit bis zum weltweiten Livegang deiner Web-App auf GitHub Pages.

---

## 📌 Aktueller Zwischenstand (Bereits implementiert)

- [x] **Projektstruktur**: Saubere, modulare Open-Source-Architektur (`data/`, `src/`, `docs/`, `prototypes/`, `scripts/`).
- [x] **Ressource 1 (Rohöl & Kraftstoffe)**: 18 Infrastrukturpunkte (Wilhelmshaven, Rostock, Schwedt, Leuna, MiRO, TAL- & NWO-Pipelines).
- [x] **Ressource 2 (Erdgas & LNG)**: 8 Infrastrukturpunkte (FSRU Wilhelmshaven, LNG Brunsbüttel, Gasspeicher Rehden, EUGAL/NETRA/MEGAL).
- [x] **Ressource 3 (Lithium / Interkontinental)**: 6 Infrastrukturpunkte (Salar de Atacama ➔ Puerto Antofagasta ➔ 12.850 km Seeweg via Panamakanal ➔ Hafen Hamburg ➔ Kathodenwerk BASF Schwarzheide).
- [x] **Interaktive Map-Features**: Fließrichtungs-Animationen, Farbdifferenzierung, Perspektiven-Umschalter (*„🇩echenland“* / *„🌍 Interkontinental“*).
- [x] **„Aha-Moment“-Inspector**: Detailansicht für Alltagsbezüge (Flugbenzin BER, Kunstdünger, Smartphone-Akkus) mit Datenquellen-Nachweis.
- [x] **Automatisierung**: GitHub Actions Workflow `.github/workflows/deploy.yml` für automatisches Deployment.

---

## 🚀 Schritt 1: Lokaler Test & Qualitätskontrolle

- [x] **1.1 Webserver lokal starten**
  ```bash
  python3 -m http.server 8080
  ```
- [x] **1.2 Im Browser öffnen**
  - Rufe im Browser `http://localhost:8080` auf.
- [x] **1.3 Funktionen prüfen**
  - [x] Zur Rubrik *„Resource Map“* wechseln.
  - [x] Den Button **„🌍 Interkontinental“** anklicken: Die Ansicht zoomt heraus und visualisiert die 12.850 km lange Seeroute von Chile nach Hamburg.
  - [x] Den Button **„🇩🇪 Deutschland“** anklicken: Die Ansicht springt zurück in den nationalen Detailfokus.
  - [x] Verschiedene Rohstoff- und Infrastruktur-Checkboxen in der linken Seitenleiste an- und abwählen.
  - [x] Auf einen Marker (z. B. *Salar de Atacama*, *FSRU Wilhelmshaven*, *PCK Schwedt*) klicken und den rechten Inspector-Drawer prüfen.
- [x] **1.4 Lokalen Server beenden**
  - Im Terminal mit `Strg + C` stoppen.

---

## 📦 Schritt 2: Git Commit durchführen

- [ ] **2.1 Geänderte und neue Dateien stagen**
  ```bash
  git add .
  ```
- [ ] **2.2 Status prüfen**
  ```bash
  git status
  ```
- [ ] **2.3 Commit erstellen**
  ```bash
  git commit -m "feat: Add Natural Gas, intercontinental Lithium route, and GitHub Pages deployment workflow"
  ```

---

## 🌐 Schritt 3: GitHub-Repository anlegen & verknüpfen

- [ ] **3.1 Neues Repository auf GitHub öffnen**
  - Öffne [github.com/new](https://github.com/new).
- [ ] **3.2 Einstellungen wählen**
  - **Repository name**: `the-worlds-resources`
  - **Visibility**: **Public** *(Erforderlich für kostenloses Hosting über GitHub Pages)*.
  - Keine Haken bei *„Add a README“*, *„Add .gitignore“* oder *„Choose a license“* setzen (bereits im lokalen Projekt vorhanden).
  - Auf **Create repository** klicken.
- [ ] **3.3 Lokales Projekt mit GitHub verknüpfen & pushen**
  *(Ersetze `DEIN-NUTZERNAME` mit deinem GitHub-Benutzernamen)*:
  ```bash
  git remote add origin https://github.com/DEIN-NUTZERNAME/the-worlds-resources.git
  git branch -M main
  git push -u origin main
  ```

---

## ⚡ Schritt 4: GitHub Pages aktivieren & Website live schalten

- [ ] **4.1 Repository-Einstellungen öffnen**
  - Gehe in deinem GitHub-Repository oben rechts auf **Settings**.
- [ ] **4.2 Zu GitHub Pages navigieren**
  - Klicke im linken Menü auf **Pages** (unter dem Bereich *Code and automation*).
- [ ] **4.3 Build-Quelle auf GitHub Actions umstellen**
  - Unter **Build and deployment** ➔ **Source** wählst du im Dropdown-Menü:
    👉 **GitHub Actions**
- [ ] **4.4 Deployment-Vorgang prüfen**
  - Klicke oben auf den Reiter **Actions**.
  - Der Workflow `Deploy to GitHub Pages` startet automatisch. Nach ca. 30–60 Sekunden erscheint ein grünes Häkchen.
- [ ] **4.5 Live-Website im Browser aufrufen**
  - Deine Website ist nun weltweit live erreichbar unter:
    `https://DEIN-NUTZERNAME.github.io/the-worlds-resources/`

---

## 🎯 Schritt 5: Feinschliff & nächste Ausbaustufen

- [ ] **5.1 Repository-About-Bereich pflegen**
  - Auf der GitHub-Projektstartseite rechts oben bei **About** auf das Zahnrad-Symbol klicken.
  - Die Live-URL (`https://DEIN-NUTZERNAME.github.io/the-worlds-resources/`) eintragen und das Häkchen bei *„Use your GitHub Pages website“* aktivieren.
- [ ] **5.2 Optionale 4. Ressource: Stromnetz & Windkraft**
  - Anbindung von Nordsee-Offshore-Windparks über Gleichstromtrassen (SuedLink / SuedOstLink) zu den Verbrauchszentren im Süden.
- [ ] **5.3 Optionale 5. Ressource: Kupfer**
  - Globale Kupferlieferkette (Chile / Sambia ➔ Aurubis Kupferhütte Hamburg ➔ Verkabelung & Transformatoren).
- [ ] **5.4 Eigene Domain (optional)**
  - Hinterlegung einer Custom Domain (z. B. `worldresources.org` oder `die-rohstoffe-der-welt.de`) unter **Settings** ➔ **Pages** ➔ **Custom domain**.
