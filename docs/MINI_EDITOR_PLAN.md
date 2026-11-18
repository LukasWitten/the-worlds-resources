# Mini Route Editor – Plan (Stage 2)

Goal: let domain experts **sketch nodes and routes on the map** and export valid GeoJSON, without using Git or hand-writing coordinates.

This is **not** a full CMS and **not** a backend.  
Everything runs in the browser; the user downloads JSON and submits it via PR or Issue.

---

## 1. Scope (MVP editor)

### In scope

1. **Map canvas** (reuse existing Leaflet dark map)
2. **Modes**
   - Place **visible node**
   - Place **invisible waypoint** (only while drawing a route)
   - **Connect route** (click start node → optional waypoints → end node)
   - **Select / edit** existing draft feature
   - **Delete** draft feature
3. **Property form** for the selected feature
   - Visible node: name, resource, type (category), country, operator, capacity, summary, description, aha_moment, source
   - Route: name, resource, type (pipeline / shipping / rail), flow_direction, summary, source
4. **Export**
   - Download `FeatureCollection` JSON (draft only)
   - Optional: “copy to clipboard”
5. **Import draft** (load a previous export to continue editing)
6. **Validation** before export
   - Routes must have ≥ 2 coordinates
   - Start/end should snap to visible nodes
   - Required fields present
   - `id` auto-generated or user-defined (unique in draft)

### Out of scope (later)

- Login / permissions  
- Direct commit to GitHub  
- Live editing of production datasets  
- Collaborative real-time editing  
- Complex polygon drawing for oil lakes (Phase 3)  
- Automatic topology of the full global graph  

---

## 2. User flow

```
Open /editor (or editor.html)
  → empty draft or import JSON
  → choose resource (e.g. crude_oil)
  → place visible nodes (port, plant, …)
  → start “Draw route”
       → click start node
       → optional map clicks = invisible waypoints
       → click end node → route created
  → fill texts in side form
  → Export GeoJSON
  → submit via GitHub PR / Issue
```

---

## 3. Technical approach (lightweight)

| Piece | Proposal |
|-------|----------|
| Entry | `editor.html` + `src/editor/` (separate from main app bundle if needed) |
| Map | Leaflet, same dark basemap as main app |
| Draft state | In-memory GeoJSON FeatureCollection + `localStorage` autosave |
| Snapping | Prefer click on existing visible node within ~5–10 px |
| IDs | `slug(name)` + short suffix if collision |
| Styling | Visible nodes = normal markers; waypoints = small dim dots only while drawing; routes = dashed until saved |

No backend. No build requirement beyond what the main site already uses (Vite optional).

---

## 4. Data rules (aligned with CONTRIBUTING_DATA.md)

- Visible node → `category: "node"`, `visible: true`
- Waypoints → **only** middle coordinates on LineString (no Point features)
- Route → `category: "edge"`, `type`: `pipeline` | `shipping_route` | `rail_corridor`
- Export must be valid JSON ready to paste into `data/geojson/...`

---

## 5. UI sketch (minimal)

```
┌─────────────────────────────────────────────────────────┐
│  [Resource ▾]  [● Node] [╱ Route] [✎ Select] [Export]   │
├──────────────┬──────────────────────────────────────────┤
│ Properties   │                                          │
│ Name         │              MAP                         │
│ Type         │                                          │
│ Country      │                                          │
│ Summary      │                                          │
│ Aha title    │                                          │
│ …            │                                          │
│ [Delete]     │                                          │
└──────────────┴──────────────────────────────────────────┘
```

---

## 6. Implementation phases

| Phase | Deliverable | Effort (rough) |
|-------|-------------|----------------|
| **A** | `editor.html` shell + map + place visible nodes + form + export | Small |
| **B** | Route drawing with invisible waypoints + snap to nodes | Medium |
| **C** | Import draft, localStorage, validation messages | Small |
| **D** | Polish (undo, keyboard, mobile limits, help panel) | Small–medium |

Do **not** start Phase A until the main map data model is stable (it largely is).

---

## 7. Success criteria

- A non-developer can add 2 nodes and 1 route and export valid GeoJSON in under 15 minutes  
- Exported file passes `npm run validate:data` (or a dedicated editor validator)  
- No change required to production map code to accept the export (after manual paste into the right dataset file)  

---

## 8. Decision log

- **2026-11-18:** Stage 1 = templates + CONTRIBUTING_DATA.md; Stage 2 = this mini-editor plan. Full CMS deferred.
