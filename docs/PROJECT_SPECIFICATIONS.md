# The World's Resources - Project Documentation & Specifications

This document contains the complete project vision, concept, roadmap, and technical implementation proposals for **"The Worlds Resources"**.

---

## 1. Project Concept, Vision & Roadmap

### **Project Idea & Vision**
* **Name:** „The World’s Resources“
* **Vision:** A minimalist, modern, and publicly accessible web application that visually and comprehensibly maps complex global resource flows (extraction sources, transport routes, and processing hubs).
* **Key Features:**
  * **Minimalist Dark-Mode Design:** A deep, dark world map where neon-colored resource flows and locations stand out.
  * **Immersive UI:** A fully collapsible left menu (controlled via an arrow button) to enjoy the map in pure full-screen mode.
  * **The "Aha Moment" for Consumers:** Bridging the gap from the raw resource source (e.g., oil terminal) through the transport route (pipelines, shipping lanes) to the everyday consumer product.
  * **Open Source:** Fully transparent, collaboratively expandable (under the MIT License).

### **Website Structure & Navigation**
* **Top Navigation (English):**
  1. *Home* (Landing page with a hero section and explanatory info sections on scroll)
  2. *Resource Map* (The interactive web app with filter menu)
  3. *Data Sources* (Transparent listing of all official sources and APIs)
  4. *Contact* (Social media channels, GitHub, Email)
* **Footer:** Discreetly contains the legally required **Imprint (Impressum)** as well as links to privacy policies and community channels.

### **The MVP Roadmap (Starting with Germany)**
* **Phase 1 (Conception & Data):** Focus on *Germany* as a test market and *precisely one resource* (e.g., crude oil: ports, pipelines, refineries) as a proof of concept.
* **Phase 2 (Tech Stack & Prototype):** Set up local Git repository, build frontend structure, and interactive map.
* **Phase 3 & 4 (Data Integration & Open-Source Release):** Integrate real GeoJSON data and publish on GitHub.

---

## 2. Technical Implementation Proposals

### **Technology Stack**
> **Current implementation (Nov 2026):** Vanilla JavaScript (ES modules) bundled with **Vite**, **Leaflet** and **Tailwind CSS v3** from npm, GeoJSON data in `public/data/`, hosted on **Vercel** behind Cloudflare. The options below are the original proposals; React/Next.js and Deck.gl are not used. A later move to MapLibre GL with vector tiles is the most likely upgrade path once the datasets grow.

* **Frontend Framework:** React.js or Next.js for a modular UI (Alternatively for quick start: Vanilla JavaScript / HTML5 with Tailwind CSS).
* **Mapping Libraries:**
  * *For easy setup & interactive markers:* **Leaflet.js** (currently used in the prototype).
  * *For high-end animations & large datasets:* **Deck.gl** (by Uber) with the `TripsLayer` or `PathLayer` for fluid, animated arrows and transport routes on a dark mode map (e.g., Mapbox GL JS or MapLibre).
* **Data Format:** **GeoJSON** (Standard web format for geographic data, storing points, lines, and polygons including metadata).
* **Versioning & Hosting:** 
  * Local Git repository (`git init`, `main` branch).
  * Hosting via Vercel or Netlify for fast global deployment.

### **Data Model (GeoJSON Structure)**
Each resource element is structured as a GeoJSON feature:
* **Nodes:** Type `Point` (e.g., Wilhelmshaven oil port as source, Schwedt refinery as processing facility).
* **Edges (Routes):** Type `LineString` (e.g., pipeline paths between source and destination).
* **Attributes (Properties):** Name, resource type (e.g., `oil`), type (`source`, `route`, `processing`), and description texts for the sidebar.

### **Official Data Sources for the Germany MVP**
* Federal Statistical Office of Germany (Destatis)
* German Environment Agency (Umweltbundesamt - UBA)
* Federal Network Agency (Bundesnetzagentur - BNetzA)
* OpenStreetMap / Overpass API for geographic coordinates of infrastructure.
