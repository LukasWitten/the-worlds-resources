# Contributing Data – Nodes, Routes & Texts

Thank you for helping expand **The World’s Resources**.  
This guide explains how to add or edit **visible nodes**, **invisible waypoints**, and **routes** without breaking the map.

---

## 1. Core concepts

| Concept | What it is | Shown on map? |
|--------|------------|----------------|
| **Visible node** | Port, refinery, field, storage, plant, hub | Yes – marker + Inspector |
| **Invisible waypoint** | Bend / sketch point for a route only | No – only shapes the line |
| **Route (edge)** | Pipeline, shipping lane, rail corridor | Yes – colored line |
| **Oil field polygon** | Stylized reserve “lake” | Yes – in Oil Fields view |

**Rule:** Every route must start and end on a **visible node**.  
Invisible waypoints may only appear **between** start and end.

---

## 2. Where files live

```
data/geojson/
  germany/          # country-focused infrastructure
    crude_oil.geojson
    natural_gas.geojson
  global/           # intercontinental layers
    lithium.geojson
    oil_fields.geojson
    oil_export_corridors.geojson
public/data/geojson/   # must stay in sync (copied for deployment)
```

When you change a file under `data/geojson/`, **copy the same change** to `public/data/geojson/`.

Schema reference: `data/schemas/resource-feature.schema.json`  
Copy-paste templates: `data/templates/`

---

## 3. Visible node template

Use **Point** geometry. Coordinates are `[longitude, latitude]` (GeoJSON order).

```json
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [8.1402, 53.535]
  },
  "properties": {
    "id": "wilhelmshaven-port",
    "name": "Wilhelmshaven Oil Hub",
    "resource": "crude_oil",
    "category": "node",
    "type": "import_hub",
    "status": "operational",
    "country": "DE",
    "operator": "Nord-West Oelleitung GmbH (NWO)",
    "capacity": "approx. 20 million tonnes per year",
    "summary": "One-line summary for tooltips.",
    "description": "Longer explanation for the Inspector.",
    "supply_chain_stage": "import",
    "consumer_products": ["Gasoline", "Diesel", "Jet fuel"],
    "aha_moment": {
      "title": "Short punchy title",
      "explanation": "What is surprising or important?",
      "everyday_impact": "How does this touch daily life?"
    },
    "source": {
      "name": "Organisation or report",
      "year": "2025",
      "url": "https://example.com"
    },
    "visible": true
  }
}
```

### Allowed `type` values (nodes)

| `type` | Use for |
|--------|---------|
| `extraction_site` | Mine, field well cluster, salar, basin label point |
| `import_hub` | Import port, LNG terminal, landing station |
| `processing_hub` | Refinery, plant, compressor, upgrader |
| `storage_hub` | Storage cavern / tank farm |
| `oil_field` | Reserved for polygon “lakes” (see oil_fields layer) |

### Allowed `resource` values

`crude_oil` · `natural_gas` · `lithium`  
(further resources later: e.g. `copper`, `hydrogen`)

### `id` rules

- lowercase
- only `a-z`, `0-9`, `-`, `_`
- unique across the whole project  
  Examples: `export-ras-tanura`, `pipeline-nwo`, `field-ghawar`

---

## 4. Invisible waypoint (route sketch only)

Waypoints are **not** separate Features in the file.  
They are simply **extra coordinates** on a LineString between start and end.

```json
"coordinates": [
  [50.15, 26.65],
  [45.0, 25.0],
  [35.0, 30.0],
  [19.0, 36.0]
]
```

- First coordinate = start **visible** node  
- Last coordinate = end **visible** node  
- Middle coordinates = invisible bends (no marker, no Inspector)

Keep bends minimal (usually 1–3) so routes stay readable.

---

## 5. Route (edge) template

```json
{
  "type": "Feature",
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [8.1402, 53.535],
      [6.995, 50.845]
    ]
  },
  "properties": {
    "id": "pipeline-nwo",
    "name": "Nord-West Oelleitung (NWO Pipeline)",
    "resource": "crude_oil",
    "category": "edge",
    "type": "pipeline",
    "status": "operational",
    "country": "DE",
    "operator": "NWO",
    "capacity": "",
    "length_km": 400,
    "summary": "Main pipeline from Wilhelmshaven toward the Rhine.",
    "description": "Optional longer text.",
    "flow_direction": "Wilhelmshaven Oil Hub → Shell Rheinland",
    "supply_chain_stage": "transport",
    "consumer_products": ["Refinery feedstock"],
    "aha_moment": {
      "title": "Optional",
      "explanation": "Optional",
      "everyday_impact": "Optional"
    },
    "source": {
      "name": "Source name",
      "year": "2025",
      "url": ""
    }
  }
}
```

### Allowed `type` values (edges)

| `type` | Map style |
|--------|-----------|
| `pipeline` | Amber (oil) / emerald (gas) |
| `shipping_route` | Teal or purple (lithium) |
| `rail_corridor` | Yellow |

**Start/end coordinates should match an existing visible node** (within ~0.08°), otherwise the multi-color node border and chain logic will not connect cleanly.

---

## 6. Quality checklist before you submit

- [ ] `id` is unique and matches the pattern  
- [ ] `resource`, `category`, `type` use allowed values  
- [ ] Visible nodes have: `name`, `summary`, `source`  
- [ ] Routes have a clear `flow_direction` (A → B)  
- [ ] Route starts and ends on visible nodes  
- [ ] Coordinates are `[lon, lat]` (not lat, lon)  
- [ ] Texts are in **English** (project UI language)  
- [ ] Sources are named (link if possible)  
- [ ] File is valid JSON (trailing commas break the map)  
- [ ] Same file updated under `public/data/geojson/`  

Optional local check:

```bash
npm run validate:data
```

---

## 7. How to propose a change

1. Fork / branch the repository  
2. Add or edit the GeoJSON following this guide  
3. Test locally: `npm run dev` → open the map → verify markers and lines  
4. Open a Pull Request with:
   - what you added (resource + region)
   - data sources used
   - screenshot if possible  

If you cannot use Git, open a GitHub **Issue** and paste the JSON feature(s) there.

---

## 8. Writing good “Aha-Moment” texts

Keep them short and concrete:

- **title** – 3–8 words  
- **explanation** – one clear insight  
- **everyday_impact** – one link to daily life (fuel, heating, phones, EVs, …)

Avoid politics; stick to logistics, scale, and consumer connection.

---

## 9. What not to do

- Do not invent precise volumes or coordinates without a source  
- Do not leave routes floating in the ocean without start/end nodes  
- Do not mix multiple resources in one Feature  
- Do not commit API keys or personal data  

---

*Questions? Open an issue with the label `data`.*
