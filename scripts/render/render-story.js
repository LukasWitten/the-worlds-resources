/**
 * Render one image per story step of a project file (*.twr.json).
 *
 *   npm run render:story -- --project public/data/stories/lebkuchen.twr.json
 *   options: --out exports/stories/<name>   --formats 4x5,9x16   --svg-only
 *
 * Vector only: country outlines from Natural Earth (data-raw/naturalearth/
 * ne_50m_admin_0_countries.shp, see scripts/pipeline/lib.js), routes and places
 * from the project file. No map tiles, so there are no tile licences to observe.
 * Routes that share a waypoint or place are drawn once per segment, with one
 * strand per good side by side and widths by value (vision assessment, idea 6).
 *
 * Writes an SVG per step and turns it into a PNG with the locally installed
 * Google Chrome (headless). Set CHROME=/path/to/chrome if it lives elsewhere;
 * without Chrome only the SVGs are written.
 *
 * Preview of the later in-app PNG export (stage C1); the layout rules here
 * (safe areas, step counter, source line, footer) are meant to carry over.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseArgs, readDbf, RAW_DIR } from '../pipeline/lib.js';

const NE_SHP = path.join(RAW_DIR, 'naturalearth', 'ne_50m_admin_0_countries.shp');
const NE_DBF = NE_SHP.replace(/\.shp$/, '.dbf');
const GOODS = JSON.parse(fs.readFileSync('public/data/reference/goods.json', 'utf8')).goods;

const FORMATS = {
  '4x5': { w: 1080, h: 1350, header: 300, map: [300, 1010], text: 1030, footer: 1316 },
  // 9:16 keeps text out of the zones Instagram/TikTok cover (about 200 px top, 300 px bottom).
  '9x16': { w: 1080, h: 1920, top: 190, header: 560, map: [560, 1400], text: 1420, footer: 1640 },
  '1x1': { w: 1080, h: 1080, header: 250, map: [250, 800], text: 820, footer: 1050 }
};

const C = {
  bg: '#0f172a', land: '#1e293b', border: '#334155', germany: '#3b2f1a', text: '#f8fafc',
  muted: '#94a3b8', accent: '#fbbf24', link: '#818cf8'
};
const FONT = "-apple-system, 'SF Pro Display', 'Helvetica Neue', Helvetica, Arial, sans-serif";

/* ---------- Natural Earth shapefile (polygons only) ---------- */

function readShpPolygons(file) {
  const buf = fs.readFileSync(file);
  const shapes = [];
  let off = 100;
  while (off < buf.length) {
    const len = buf.readInt32BE(off + 4) * 2;
    const rec = off + 8;
    const type = buf.readInt32LE(rec);
    const rings = [];
    if (type === 5 || type === 15) {
      const numParts = buf.readInt32LE(rec + 36);
      const numPoints = buf.readInt32LE(rec + 40);
      const parts = [];
      for (let i = 0; i < numParts; i++) parts.push(buf.readInt32LE(rec + 44 + i * 4));
      const pts = rec + 44 + numParts * 4;
      for (let p = 0; p < numParts; p++) {
        const end = p + 1 < numParts ? parts[p + 1] : numPoints;
        const ring = [];
        for (let i = parts[p]; i < end; i++) ring.push([buf.readDoubleLE(pts + i * 16), buf.readDoubleLE(pts + i * 16 + 8)]);
        rings.push(ring);
      }
    }
    shapes.push(rings);
    off = rec + len;
  }
  return shapes;
}

function loadCountries() {
  if (!fs.existsSync(NE_SHP)) {
    console.error(`Missing ${NE_SHP}. Download Natural Earth admin 0 countries (1:50m), see scripts/pipeline/lib.js.`);
    process.exit(1);
  }
  const shapes = readShpPolygons(NE_SHP);
  const records = readDbf(NE_DBF);
  return shapes.map((rings, i) => ({ iso2: records[i]?.ISO_A2_EH, name: records[i]?.NAME, rings }))
    .filter(c => c.iso2 !== 'AQ');
}

/* ---------- Web Mercator camera ---------- */

const MAX_LAT = 85;
const mx = lon => (lon + 180) / 360;
const my = lat => {
  const s = Math.sin((Math.max(-MAX_LAT, Math.min(MAX_LAT, lat)) * Math.PI) / 180);
  return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
};

function camera(step, fmt) {
  const pad = 40;
  const box = { x: pad, y: fmt.map[0], w: fmt.w - 2 * pad, h: fmt.map[1] - fmt.map[0] };
  const [[w, s], [e, n]] = step.camera.bounds || boundsAround(step.camera);
  const x0 = mx(w), x1 = mx(e), y0 = my(n), y1 = my(s);
  const k = Math.min(box.w / (x1 - x0), box.h / (y1 - y0));
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return ([lon, lat]) => [box.x + box.w / 2 + (mx(lon) - cx) * k, box.y + box.h / 2 + (my(lat) - cy) * k];
}

function boundsAround({ center: [lon, lat], zoom }) {
  const span = 360 / 2 ** zoom;
  return [[lon - span / 2, lat - span / 4], [lon + span / 2, lat + span / 4]];
}

/* ---------- Project model ---------- */

function loadProject(file) {
  const p = JSON.parse(fs.readFileSync(file, 'utf8'));
  const nodes = new Map(p.nodes.map(n => [n.id, n]));
  const edges = new Map(p.edges.map(e => [e.id, e]));
  const coordOf = v => (typeof v === 'string' ? nodes.get(v).coord : v);
  const keyOf = v => (typeof v === 'string' ? v : v.join(','));
  for (const e of p.edges) {
    const pts = [e.from, ...(e.via || []), e.to];
    e.points = pts.map(coordOf);
    e.keys = pts.map(keyOf);
  }
  return { ...p, nodeMap: nodes, edgeMap: edges };
}

/** Fixed slide texts and catalogue labels per project language (meta.language); English is the fallback. */
const UI = {
  en: { sources: 'Sources', footer: 'Map: Natural Earth · Routes schematic', next: 'swipe →' },
  de: { sources: 'Quellen', footer: 'Karte: Natural Earth · Routen schematisch', next: 'weiter →' }
};
const GOOD_LABELS = {
  de: {
    crude_oil: 'Rohöl', natural_gas: 'Erdgas & LNG', lithium: 'Lithium', copper: 'Kupfer', iron_ore: 'Eisenerz',
    coal: 'Kohle', nickel: 'Nickel', cocoa: 'Kakaobohnen', honey: 'Honig', almonds: 'Mandeln', hazelnuts: 'Haselnüsse',
    cinnamon: 'Zimt', cloves: 'Nelken', nutmeg: 'Muskatnuss & Macis', cardamom: 'Kardamom', ginger: 'Ingwer'
  }
};
let LANG = 'en';
const ui = key => (UI[LANG] || UI.en)[key];

const goodColor = g => GOODS[g]?.style?.color || '#e2e8f0';
const goodLabel = g => GOOD_LABELS[LANG]?.[g] || GOODS[g]?.label || g;
const goodOrder = g => Object.keys(GOODS).indexOf(g);

/** Which element ids are visible at each step, and which are new in it. */
function stepStates(project) {
  const visible = new Set();
  return project.story.steps.map(step => {
    const added = new Set();
    for (const id of step.reveal || []) if (!visible.has(id)) { visible.add(id); added.add(id); }
    for (const id of step.hide || []) visible.delete(id);
    return { step, visible: new Set(visible), added };
  });
}

/* ---------- Drawing ---------- */

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const r1 = n => Math.round(n * 10) / 10;

function countriesSvg(countries, project, highlight, fmt) {
  const out = [];
  for (const c of countries) {
    let d = '';
    for (const ring of c.rings) {
      let last = null, seg = '';
      let n = 0;
      for (const pt of ring) {
        const [x, y] = project(pt);
        if (last && Math.abs(x - last[0]) < 0.8 && Math.abs(y - last[1]) < 0.8) continue;
        seg += `${n ? 'L' : 'M'}${r1(x)} ${r1(y)}`;
        last = [x, y]; n++;
      }
      if (n > 2) d += seg + 'Z';
    }
    if (!d) continue;
    const fill = c.iso2 === 'DE' ? C.germany : highlight.get(c.iso2) || C.land;
    out.push(`<path d="${d}" fill="${fill}"/>`);
  }
  return `<g stroke="${C.border}" stroke-width="${0.7 * fmt.w / 1080}" stroke-linejoin="round">${out.join('')}</g>`;
}

/**
 * Bundle the visible edges into segments between consecutive points. A segment
 * shared by several edges is drawn once, with one strand per good side by side.
 */
function routesSvg(project, state, toXY, fmt) {
  const unit = fmt.w / 1080;
  const width = usd => unit * (1.4 + 0.00055 * Math.sqrt(usd || 0));
  const segments = new Map();
  for (const id of state.visible) {
    const e = project.edgeMap.get(id);
    if (!e) continue;
    const fresh = state.added.has(id) || state.step.focus?.includes(id);
    for (let i = 0; i < e.points.length - 1; i++) {
      const key = `${e.keys[i]}>${e.keys[i + 1]}`;
      if (!segments.has(key)) segments.set(key, { a: e.points[i], b: e.points[i + 1], goods: new Map() });
      const goods = segments.get(key).goods;
      const g = e.goods[0];
      const cur = goods.get(g) || { usd: 0, fresh: false };
      goods.set(g, { usd: cur.usd + (e.qty?.value || 0), fresh: cur.fresh || fresh });
    }
  }
  const anyFresh = [...segments.values()].some(s => [...s.goods.values()].some(v => v.fresh));
  const lines = [];
  const arrows = [];
  for (const seg of segments.values()) {
    const [x1, y1] = toXY(seg.a), [x2, y2] = toXY(seg.b);
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    const nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
    const strands = [...seg.goods.entries()].sort((p, q) => goodOrder(p[0]) - goodOrder(q[0]));
    const total = strands.reduce((s, [, v]) => s + width(v.usd), 0);
    let offset = -total / 2;
    for (const [g, v] of strands) {
      const w = width(v.usd);
      const o = offset + w / 2;
      offset += w;
      const opacity = !anyFresh || v.fresh ? 0.95 : 0.3;
      lines.push(`<line x1="${r1(x1 + nx * o)}" y1="${r1(y1 + ny * o)}" x2="${r1(x2 + nx * o)}" y2="${r1(y2 + ny * o)}" stroke="${goodColor(g)}" stroke-width="${r1(w)}" stroke-opacity="${opacity}" stroke-linecap="round"/>`);
    }
    // A light chevron in the middle of longer segments shows the direction of transport.
    // Only on longer segments of the routes this step is about, so the map stays calm.
    const current = !anyFresh || strands.some(([, v]) => v.fresh);
    if (current && len > 170 * unit) {
      const dx = (x2 - x1) / len, dy = (y2 - y1) / len;
      const mxp = (x1 + x2) / 2, myp = (y1 + y2) / 2;
      const half = Math.max(10 * unit, total / 2 + 5 * unit);
      const depth = Math.max(11 * unit, half * 0.9);
      const tip = [mxp + dx * depth / 2, myp + dy * depth / 2];
      const back = [mxp - dx * depth / 2, myp - dy * depth / 2];
      const d = `M${r1(back[0] + nx * half)} ${r1(back[1] + ny * half)}L${r1(tip[0])} ${r1(tip[1])}L${r1(back[0] - nx * half)} ${r1(back[1] - ny * half)}`;
      arrows.push(`<path d="${d}" fill="none" stroke="${C.bg}" stroke-width="${r1(5.5 * unit)}" stroke-opacity="0.55" stroke-linecap="round" stroke-linejoin="round"/>`
        + `<path d="${d}" fill="none" stroke="${C.text}" stroke-width="${r1(2.5 * unit)}" stroke-opacity="0.9" stroke-linecap="round" stroke-linejoin="round"/>`);
    }
  }
  return `<g>${lines.join('')}${arrows.join('')}</g>`;
}

function placesSvg(project, state, toXY, fmt) {
  const unit = fmt.w / 1080;
  const out = [];
  const labels = [];
  const markers = [];
  const focus = new Set(state.step.focus || []);
  for (const id of state.visible) {
    const n = project.nodeMap.get(id);
    if (!n || n.kind === 'waypoint') continue;
    const [x, y] = toXY(n.coord);
    markers.push(Object.assign(ring(x, y, 9 * unit), { own: n.id }));
    if (n.id === 'nuremberg' || n.type === 'processing_hub') {
      out.push(`<circle cx="${r1(x)}" cy="${r1(y)}" r="${9 * unit}" fill="${C.accent}" stroke="${C.bg}" stroke-width="${3 * unit}"/>`);
    } else if (n.kind === 'transfer') {
      const s = 6 * unit;
      out.push(`<rect x="${r1(x - s)}" y="${r1(y - s)}" width="${2 * s}" height="${2 * s}" transform="rotate(45 ${r1(x)} ${r1(y)})" fill="${C.text}" stroke="${C.bg}" stroke-width="${2 * unit}"/>`);
    } else {
      out.push(`<circle cx="${r1(x)}" cy="${r1(y)}" r="${6 * unit}" fill="${goodColor(n.goods?.[0])}" stroke="${C.bg}" stroke-width="${2 * unit}"/>`);
    }
    if (focus.has(id) || state.added.has(id)) labels.push({ n, x, y, strong: focus.has(id) });
  }
  // Focused waypoints (e.g. a strait or cape) get a ring and a label.
  for (const id of focus) {
    const n = project.nodeMap.get(id);
    if (n?.kind !== 'waypoint') continue;
    const [x, y] = toXY(n.coord);
    labels.push({ n, x, y, strong: true });
  }
  // Strong labels first; each label takes the first position around its point that
  // does not overlap a label already placed (or the rings of focused places).
  labels.sort((a, b) => b.strong - a.strong);
  const routePoints = [];
  for (const id of state.visible) {
    const e = project.edgeMap.get(id);
    if (!e) continue;
    const pts = e.points.map(toXY);
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      const steps = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / (4 * unit)));
      for (let k = 0; k <= steps; k++) routePoints.push([x1 + (x2 - x1) * k / steps, y1 + (y2 - y1) * k / steps]);
    }
  }
  const taken = [...markers, ...labels.filter(l => l.strong).map(l => ring(l.x, l.y, 24 * unit))];
  for (const { n, x, y, strong } of labels) {
    if (strong) out.push(`<circle cx="${r1(x)}" cy="${r1(y)}" r="${22 * unit}" fill="none" stroke="${C.accent}" stroke-width="${2.5 * unit}" stroke-opacity="0.9"/>`);
    const size = (strong ? 30 : 23) * unit;
    const w = n.name.length * size * 0.56;
    const gap = (strong ? 30 : 13) * unit;
    const h = size * 1.1;
    const preferRight = x < fmt.w * 0.75;
    // Positions around the point: right, left, above, below, the four diagonals, each
    // also a bit further out. Each is scored by how much route it covers and whether
    // it hits another label or marker; ties keep the order (right first, near first).
    const candidates = [];
    for (const k of [1, 1.8]) {
      const g = gap * k;
      const d = g * 0.75;
      const sides = [
        { anchor: 'start', tx: x + g, ty: y + size * 0.35, box: [x + g, y - size * 0.65, w, h] },
        { anchor: 'end', tx: x - g, ty: y + size * 0.35, box: [x - g - w, y - size * 0.65, w, h] },
        { anchor: 'middle', tx: x, ty: y - g - size * 0.2, box: [x - w / 2, y - g - size, w, h] },
        { anchor: 'middle', tx: x, ty: y + g + size * 0.9, box: [x - w / 2, y + g, w, h] },
        { anchor: 'start', tx: x + d, ty: y - d - size * 0.2, box: [x + d, y - d - size, w, h] },
        { anchor: 'end', tx: x - d, ty: y - d - size * 0.2, box: [x - d - w, y - d - size, w, h] },
        { anchor: 'start', tx: x + d, ty: y + d + size * 0.9, box: [x + d, y + d, w, h] },
        { anchor: 'end', tx: x - d, ty: y + d + size * 0.9, box: [x - d - w, y + d, w, h] }
      ];
      if (!preferRight) sides.unshift(sides.splice(1, 1)[0]);
      // Small penalties keep labels close and beside their point when there is room.
      sides.forEach((c, i) => { c.penalty = (k > 1 ? 8 : 0) + (i >= 4 ? 3 : 0); });
      candidates.push(...sides);
    }
    const score = c => {
      const [bx, by, bw, bh] = c.box;
      const outside = bx < 8 * unit || by < 8 * unit || bx + bw > fmt.w - 8 * unit || by + bh > fmt.h - 8 * unit;
      const hits = taken.some(t => overlaps(t, c.box) && t.own !== n.id);
      const pad = 4 * unit;
      const covered = routePoints.filter(([px, py]) => px > bx - pad && px < bx + bw + pad && py > by - pad && py < by + bh + pad).length;
      return (outside ? 1e6 : 0) + (hits ? 1e5 : 0) + covered + c.penalty;
    };
    let pick = candidates[0], best = Infinity;
    candidates.forEach((c, i) => { const v = score(c) + i * 0.01; if (v < best) { best = v; pick = c; } });
    taken.push(Object.assign(pick.box, { own: n.id }));
    // A label pushed further out gets a thin leader line back to its point.
    if (pick.penalty >= 8) {
      const [bx, by, bw, bh] = pick.box;
      const cx = Math.max(bx, Math.min(x, bx + bw)), cy = Math.max(by, Math.min(y, by + bh));
      const len = Math.hypot(cx - x, cy - y) || 1;
      const r0 = (strong ? 23 : 8) * unit, r1end = len - 4 * unit;
      if (r1end > r0) {
        const ux = (cx - x) / len, uy = (cy - y) / len;
        out.push(`<line x1="${r1(x + ux * r0)}" y1="${r1(y + uy * r0)}" x2="${r1(x + ux * r1end)}" y2="${r1(y + uy * r1end)}" stroke="${C.text}" stroke-width="${2 * unit}" stroke-opacity="0.75" stroke-linecap="round"/>`);
      }
    }
    out.push(`<text x="${r1(pick.tx)}" y="${r1(pick.ty)}" font-size="${r1(size)}" font-weight="${strong ? 700 : 500}" fill="${strong ? C.text : '#cbd5e1'}" text-anchor="${pick.anchor}" stroke="${C.bg}" stroke-width="${5 * unit}" paint-order="stroke" stroke-linejoin="round">${esc(n.name)}</text>`);
  }
  return out.join('');
}

const ring = (x, y, r) => Object.assign([x - r, y - r, 2 * r, 2 * r], { own: null });
const overlaps = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];

/** Greedy word wrap by an estimated average glyph width. */
function wrap(text, size, maxWidth, factor = 0.5) {
  const perLine = Math.floor(maxWidth / (size * factor));
  const lines = [];
  let line = '';
  // Keep "25 %" together; split only on ordinary spaces.
  for (const word of text.replace(/(\d) %/g, '$1 %').split(/ +/)) {
    if (line && (line + ' ' + word).length > perLine) { lines.push(line); line = word; }
    else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

function textBlock(lines, x, y, size, lineHeight, attrs) {
  return `<text x="${x}" y="${y}" font-size="${size}" ${attrs}>${lines.map((l, i) => `<tspan x="${x}" dy="${i ? lineHeight : 0}">${esc(l)}</tspan>`).join('')}</text>`;
}

function slideSvg({ project, countries, state, index, total, fmt }) {
  const { step } = state;
  const toXY = camera(step, fmt);
  const unit = fmt.w / 1080;
  const side = 64 * unit;
  const inner = fmt.w - 2 * side;

  // Supplier countries of the newly shown routes get a tint of their good's colour.
  const highlight = new Map();
  for (const id of state.visible) {
    const e = project.edgeMap.get(id);
    const from = e && project.nodeMap.get(e.from);
    if (from?.country && from.kind === 'site' && (state.added.has(id) || !highlight.has(from.country))) {
      highlight.set(from.country, mix(goodColor(e.goods[0]), C.land, state.added.has(id) ? 0.38 : 0.18));
    }
  }

  const titleSize = 58 * unit;
  const titleLines = wrap(step.title, titleSize, inner, 0.54);
  const top = fmt.top || 0;
  const kicker = `${project.meta.title.toUpperCase()} · ${index + 1}/${total}`;
  const bodySize = 33 * unit;
  const bodyLines = wrap(step.text || '', bodySize, inner, 0.5);

  // Goods newly shown in this step, as a legend under the title.
  const newGoods = [...new Set([...state.added].map(id => project.edgeMap.get(id)).filter(e => e && e.from !== 'hamburg').map(e => e.goods[0]))]
    .sort((a, b) => goodOrder(a) - goodOrder(b));
  const legendY = top + 100 * unit + titleLines.length * titleSize * 1.12 + 24 * unit;
  let lx = side;
  const legend = newGoods.map(g => {
    const label = goodLabel(g);
    const item = `<circle cx="${r1(lx + 9 * unit)}" cy="${r1(legendY - 8 * unit)}" r="${9 * unit}" fill="${goodColor(g)}"/><text x="${r1(lx + 26 * unit)}" y="${r1(legendY)}" font-size="${24 * unit}" fill="#cbd5e1">${esc(label)}</text>`;
    lx += (26 + label.length * 12 + 30) * unit;
    return item;
  }).join('');

  const sourceNames = [...new Set((step.sourceIds || []).map(id => project.sources.find(s => s.id === id)).filter(Boolean).map(s => s.publisher || s.title))];
  const sourceLine = sourceNames.length ? `${ui('sources')}: ${sourceNames.join('; ')}` : '';
  const footer = `theworldsresources.org · ${ui('footer')}`;
  // Push the source line and footer down if a long text would run into them.
  const bodyEnd = fmt.text + bodySize + (bodyLines.length - 1) * bodySize * 1.38;
  const footerY = Math.max(fmt.footer, bodyEnd + (sourceLine ? 82 : 44) * unit);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt.w}" height="${fmt.h}" viewBox="0 0 ${fmt.w} ${fmt.h}" font-family="${FONT}">
<defs>
  <linearGradient id="top" x1="0" y1="0" x2="0" y2="1"><stop offset="0.7" stop-color="${C.bg}"/><stop offset="1" stop-color="${C.bg}" stop-opacity="0"/></linearGradient>
  <linearGradient id="bottom" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.bg}" stop-opacity="0"/><stop offset="0.18" stop-color="${C.bg}"/></linearGradient>
</defs>
<rect width="100%" height="100%" fill="${C.bg}"/>
${countriesSvg(countries, toXY, highlight, fmt)}
${routesSvg(project, state, toXY, fmt)}
${placesSvg(project, state, toXY, fmt)}
<rect x="0" y="0" width="${fmt.w}" height="${fmt.header}" fill="url(#top)"/>
<rect x="0" y="${fmt.text - 80 * unit}" width="${fmt.w}" height="${fmt.h - fmt.text + 80 * unit}" fill="url(#bottom)"/>
<text x="${side}" y="${top + 70 * unit}" font-size="${21 * unit}" font-weight="600" letter-spacing="${2 * unit}" fill="${C.accent}">${esc(kicker)}</text>
${textBlock(titleLines, side, top + 70 * unit + titleSize * 1.1, titleSize, titleSize * 1.12, `font-weight="800" fill="${C.text}" letter-spacing="${-0.5 * unit}"`)}
${legend}
${textBlock(bodyLines, side, fmt.text + bodySize, bodySize, bodySize * 1.38, `fill="${C.text}"`)}
${sourceLine ? `<text x="${side}" y="${footerY - 38 * unit}" font-size="${19 * unit}" fill="${C.muted}">${esc(sourceLine)}</text>` : ''}
<text x="${side}" y="${footerY}" font-size="${19 * unit}" fill="${C.muted}">${esc(footer)}</text>
${index + 1 < total ? `<text x="${fmt.w - side}" y="${footerY}" font-size="${19 * unit}" font-weight="600" fill="${C.link}" text-anchor="end">${esc(ui('next'))}</text>` : ''}
</svg>
`;
}

function mix(hex, base, t) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [a, b] = [p(hex), p(base)];
  return '#' + a.map((v, i) => Math.round(b[i] + (v - b[i]) * t).toString(16).padStart(2, '0')).join('');
}

/* ---------- Output ---------- */

function findChrome() {
  const candidates = [
    process.env.CHROME,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'
  ].filter(Boolean);
  return candidates.find(p => fs.existsSync(p)) || null;
}

function toPng(chrome, svgFile, pngFile, fmt) {
  const result = spawnSync(chrome, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--window-size=${fmt.w},${fmt.h}`, `--screenshot=${path.resolve(pngFile)}`,
    `file://${path.resolve(svgFile)}`
  ], { encoding: 'utf8' });
  if (result.status !== 0 || !fs.existsSync(pngFile)) throw new Error(`Chrome failed for ${svgFile}: ${result.stderr}`);
}

function main() {
  const args = parseArgs();
  if (!args.project) {
    console.error('Usage: npm run render:story -- --project <file.twr.json> [--out dir] [--formats 4x5,9x16] [--svg-only]');
    process.exit(1);
  }
  const project = loadProject(args.project);
  LANG = project.meta.language || 'en';
  if (!project.story?.steps?.length) throw new Error(`${args.project} has no story`);
  const name = path.basename(args.project).replace(/\.twr\.json$/, '');
  const outDir = args.out || path.join('exports', 'stories', name);
  const formats = String(args.formats || '4x5,9x16').split(',');
  const chrome = args['svg-only'] ? null : findChrome();
  if (!chrome && !args['svg-only']) console.warn('Google Chrome not found: writing SVG only (set CHROME=/path/to/chrome).');

  const countries = loadCountries();
  const states = stepStates(project);
  for (const f of formats) {
    const fmt = FORMATS[f];
    if (!fmt) throw new Error(`Unknown format ${f} (known: ${Object.keys(FORMATS).join(', ')})`);
    const dir = path.join(outDir, f);
    fs.mkdirSync(dir, { recursive: true });
    states.forEach((state, index) => {
      const base = path.join(dir, `${String(index + 1).padStart(2, '0')}-${state.step.id}`);
      fs.writeFileSync(`${base}.svg`, slideSvg({ project, countries, state, index, total: states.length, fmt }));
      if (chrome) toPng(chrome, `${base}.svg`, `${base}.png`, fmt);
    });
    console.log(`${f}: ${states.length} slides → ${dir}`);
  }
}

main();
