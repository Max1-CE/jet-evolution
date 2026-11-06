// SPDX-FileCopyrightText: 2026 Max Kravchenko
// SPDX-License-Identifier: MIT

// Рендерер двигуна в розрізі: задня половина (поверхні обертання й лопатки), площина розрізу, пілон.
import { k, G } from "./kit.mjs";
import { STAND } from "./stand.mjs";
import { READOUTS } from "./model.mjs";
import { GEOMETRY } from "./engines.mjs";
const THEME = process.argv.includes("--light") ? "light" : "dark";
const { P, M, F } = STAND;
const V = G.viewOf(P);
const TAU = Math.PI * 2;
const scr = (p) => k.iso(p, P);
const at = (s, r, phi) => G.pointOf(F, s * M, r * M, phi);
const f1 = (n) => (Math.round(n * 10) / 10).toFixed(1).replace(/\.0$/, "");
const pathOf = (pts, closed = true) => pts.map(([x, y], i) => `${i ? "L" : "M"}${f1(x)} ${f1(y)}`).join("") + (closed ? "Z" : "");
const area2 = (pts) => pts.reduce((a, [x, y], i) => { const [u, v] = pts[(i + 1) % pts.length]; return a + x * v - u * y; }, 0);
const oriented = (pts) => (area2(pts) < 0 ? [...pts].reverse() : pts);
const radial = (phi) => G.add3(G.mul3(F.u, Math.cos(phi)), G.mul3(F.v, Math.sin(phi)));
const tangent = (phi) => G.add3(G.mul3(F.u, -Math.sin(phi)), G.mul3(F.v, Math.cos(phi)));

// ---------------------------------------------------------------------------
// Задня половина: поверхні обертання, видимі крізь площину розрізу
const STEPS = 64;
const PHI0 = Math.PI / 2;
const PHI1 = (3 * Math.PI) / 2;

function backHalf(parts) {
  const inward = [];
  const outward = [];
  for (const part of parts) {
    const poly = part.poly;
    const n = poly.length;
    const ccw = area2(poly) > 0;
    for (let i = 0; i < n; i++) {
      const p = poly[i];
      const q = poly[(i + 1) % n];
      if (p[1] < 1e-4 && q[1] < 1e-4) continue;
      const ds = q[0] - p[0];
      const dr = q[1] - p[1];
      const len = Math.hypot(ds, dr);
      if (len < 1e-6) continue;
      const ns = ccw ? dr / len : -dr / len;
      const nr = ccw ? -ds / len : ds / len;
      const cls = nr > 0.35 ? "out" : nr < -0.35 ? "in" : part.kind === "case" ? "in" : "out";
      // кромка: чи гострий кут при вершині q (для лінії-ребра)
      const nxt = poly[(i + 2) % n];
      const e2 = [nxt[0] - q[0], nxt[1] - q[1]];
      const turn = Math.abs(Math.atan2(ds * e2[1] - dr * e2[0], ds * e2[0] + dr * e2[1]));
      const crease = turn > 0.45 && q[1] > 1e-4;
      const rMid = (p[1] + q[1]) / 2;
      let wasSeen = null;
      let band = null;
      const close = () => {
        if (!band) return;
        const ringP = [];
        const ringQ = [];
        for (let j = band.j0; j <= band.j1 + 1; j++) {
          const a = PHI0 + ((PHI1 - PHI0) * j) / STEPS;
          ringP.push(scr(at(p[0], p[1], a)));
          ringQ.push(scr(at(q[0], q[1], a)));
        }
        const am = PHI0 + ((PHI1 - PHI0) * (band.j0 + band.j1 + 1)) / 2 / STEPS;
        const centre = at((p[0] + q[0]) / 2, rMid, am);
        const facet = {
          d: pathOf(oriented([...ringP, ...ringQ.reverse()])),
          tone: band.tone,
          depth: G.dot3(centre, V),
          r: rMid,
          crease: crease ? pathOf(ringQ.reverse(), false) : "",
        };
        (cls === "in" ? inward : outward).push(facet);
        band = null;
      };
      for (let j = 0; j < STEPS; j++) {
        const a0 = PHI0 + ((PHI1 - PHI0) * j) / STEPS;
        const am = PHI0 + ((PHI1 - PHI0) * (j + 0.5)) / STEPS;
        const normal = G.add3(G.mul3(F.a, ns), G.mul3(radial(am), nr));
        const seen = G.dot3(normal, V) > 1e-4;
        // оболонки, близькі до циліндра, тонуємо за самим кутом: межі тонів ідуть твірними, без сходинок
        const shading = Math.abs(nr) > 0.5 ? radial(am).map((c) => c * Math.sign(nr)) : normal;
        if (cls === "out" && wasSeen !== null && seen !== wasSeen) {
          // силует: твірна, де поверхня відвертається
          outward.push({ line: pathOf([scr(at(p[0], p[1], a0)), scr(at(q[0], q[1], a0))], false), depth: G.dot3(at(p[0], p[1], a0), V) + 0.01, tone: "lo" });
        }
        wasSeen = seen;
        const tone = seen ? G.toneOf(shading, P) : -1;
        if (band && (tone !== band.tone || j - band.j1 > 1 || j - band.j0 >= 10)) close();
        if (!seen) continue;
        if (!band) band = { j0: j, j1: j, tone };
        else band.j1 = j;
      }
      close();
    }
  }
  inward.sort((a, b) => b.r - a.r || a.depth - b.depth);
  outward.sort((a, b) => a.depth - b.depth);
  return { inward, outward };
}

/** Лопатки задньої половини: закручені пластини, кожна — свій елемент у порядку глибини. */
function backBlades(rows, id) {
  const out = [];
  const lines = [];
  for (const row of rows) {
    if (!row.poly) continue;
    if (!(row.fan || row.bypass || row.strut)) {
      // дрібні ряди — радіальні лінії лопаток по всьому колу задньої половини
      const step = TAU / row.count;
      const sMid = (row.s + row.chord / 2) * M;
      const d = G.spokesOf(F, sMid, (row.r0 - 0.006) * M, (row.r1 + 0.006) * M, Math.round(row.count / 2) - 1, P, { phase: 0, from: PHI0 + step, to: PHI1 });
      // кільця біля кореня й периферії: лопатки стоять на полицях, а не обриваються в повітрі
      const rings = G.arcOf(F, sMid, (row.r0 - 0.006) * M, P, { least: -1, from: PHI0, to: PHI1, trim: 0 }) + G.arcOf(F, sMid, (row.r1 + 0.006) * M, P, { least: -1, from: PHI0, to: PHI1, trim: 0 });
      lines.push(k.lineSvg(rings, { tone: "faint" }));
      lines.push(k.lineSvg(d, { tone: row.kind === "blade" ? "lo" : "faint", className: row.hot ? "je-hot-line" : undefined }));
      continue;
    }
    const [lead0, trail0, trail1, lead1] = row.poly;
    const step = TAU / row.count;
    const fan = row.fan;
    const hot = row.hot;
    const sign = row.kind === "vane" ? -1 : 1;
    const turbine = hot ? -1 : 1;
    const beta = (t) => sign * turbine * (fan ? 0.35 + 0.65 * t : 0.62 + 0.15 * t);
    const parts = row.fan ? 3 : 1;
    for (let b = 0; b < row.count; b++) {
      const phi = PHI0 + step * (b + 0.5);
      if (phi < PHI0 + step * 0.5 || phi > PHI1 - step * 0.5) continue;
      const facets = [];
      const rim = [];
      for (let m = 0; m <= parts; m++) {
        const t = m / parts;
        const sL = lead0[0] + (lead1[0] - lead0[0]) * t;
        const sT = trail0[0] + (trail1[0] - trail0[0]) * t;
        const r = lead0[1] + (lead1[1] - lead0[1]) * t;
        const c = ((sT - sL) / 2) * M;
        const sMid = ((sL + sT) / 2) * M;
        const bt = beta(t);
        const base = G.add3(F.o, G.add3(G.mul3(F.a, sMid), G.mul3(radial(phi), r * M)));
        const along = G.add3(G.mul3(F.a, Math.cos(bt)), G.mul3(tangent(phi), Math.sin(bt)));
        rim.push([G.add3(base, G.mul3(along, -c)), G.add3(base, G.mul3(along, c))]);
      }
      for (let m = 0; m < parts; m++) {
        const quad = [rim[m][0], rim[m][1], rim[m + 1][1], rim[m + 1][0]];
        const e1 = G.sub3(quad[1], quad[0]);
        const e2 = G.sub3(quad[3], quad[0]);
        let normal = G.unit3(G.cross3(e1, e2));
        if (G.dot3(normal, V) < 0) normal = G.mul3(normal, -1);
        const tn = G.toneOf(normal, P);
        facets.push(tn > 3 ? `<path class="iso-top" d="${pathOf(oriented(quad.map(scr)))}"/>` : `<path class="iso-shade" data-shade="${tn}" d="${pathOf(oriented(quad.map(scr)))}"/>`);
      }
      const outline = [...rim.map((p) => p[0]), ...rim.map((p) => p[1]).reverse()].map(scr);
      const centre = G.mul3(G.add3(rim[0][0], rim[parts][1]), 0.5);
      out.push({ depth: G.dot3(centre, V), svg: `<g class="je-fin${hot ? " je-hot-metal" : ""}">${facets.join("")}<path class="iso-line" data-tone="lo" d="${pathOf(outline)}"/></g>` });
    }
  }
  out.sort((a, b) => a.depth - b.depth);
  return lines.join("") + out.map((o) => o.svg).join("");
}

function runs(facets) {
  const out = [];
  let tone = -1;
  let d = "";
  let lines = "";
  const flush = () => {
    if (d) out.push(tone > 3 ? `<path class="iso-top" d="${d}"/>` : `<path class="iso-shade" data-shade="${tone}" d="${d}"/>`);
    if (lines) out.push(`<path class="iso-line" data-tone="faint" d="${lines}"/>`);
    d = "";
    lines = "";
  };
  for (const f of facets) {
    if (f.line) {
      flush();
      out.push(`<path class="iso-line" data-tone="${f.tone}" d="${f.line}"/>`);
      continue;
    }
    if (f.tone !== tone) {
      flush();
      tone = f.tone;
    }
    d += f.d;
    if (f.crease) lines += f.crease;
  }
  flush();
  return out.join("");
}

// ---------------------------------------------------------------------------
// Площина розрізу: перерізи деталей у вертикальній площині через вісь
function cut(poly, half) {
  const phi = half > 0 ? PHI0 : PHI1;
  return pathOf(poly.map(([s, r]) => scr(at(s, r, phi))));
}
const CUT_CLASS = { case: "je-cut-case", rotor: "je-cut-rotor", liner: "je-cut-liner", gear: "je-cut-gear", hot: "je-cut-hot" };
const CUT_TONE = { case: "mid", rotor: "hi", liner: "mid", gear: "hi", hot: "mid" };

function section(geo) {
  const out = [];
  const order = ["case", "liner", "rotor", "gear", "hot"];
  for (const kind of order) {
    for (const part of geo.parts.filter((p) => p.kind === kind)) {
      for (const half of [1, -1]) {
        const d = cut(part.poly, half);
        out.push(`<path class="${CUT_CLASS[kind]}" d="${d}"/><path class="iso-line" data-tone="${CUT_TONE[kind]}" d="${d}"/>`);
      }
    }
  }
  for (const row of geo.rows) {
    for (const half of [1, -1]) {
      const d = cut(row.poly, half);
      const cls = row.kind === "blade" ? (row.hot ? "je-cut-blade je-hot-metal" : "je-cut-blade") : row.hot ? "je-cut-vane je-hot-metal" : "je-cut-vane";
      out.push(`<path class="${cls}" d="${d}"/><path class="iso-line" data-tone="${row.kind === "blade" ? "hi" : "mid"}" d="${d}"/>`);
      if (row.shroud) {
        // антивібраційна полиця посередині лопатки вентилятора
        const t = row.shroud;
        const [a, b, c, e] = row.poly;
        const sL = a[0] + (e[0] - a[0]) * t;
        const sT = b[0] + (c[0] - b[0]) * t;
        const r = a[1] + (e[1] - a[1]) * t;
        const pad = [[sL - 0.03, r - 0.012], [sT + 0.03, r - 0.012], [sT + 0.03, r + 0.012], [sL - 0.03, r + 0.012]];
        const pd = cut(pad, half);
        out.push(`<path class="je-cut-blade" d="${pd}"/><path class="iso-line" data-tone="hi" d="${pd}"/>`);
      }
    }
  }
  return out.join("");
}

/** Деталі на площині розрізу: форсунки, свічка, болти фланців. */
function details(geo, fuel = true) {
  const out = [];
  const [fs, fr] = geo.fuel;
  for (const half of fuel ? [1, -1] : []) {
    const phi = half > 0 ? PHI0 : PHI1;
    const outer = geo.ro(fs) + 0.035;
    const p0 = scr(at(fs - 0.02, outer, phi));
    const p1 = scr(at(fs + 0.01, fr, phi));
    out.push(`<path class="iso-line je-nozzle" data-tone="hi" d="${pathOf([p0, p1], false)}"/>`);
    out.push(k.dotsSvg([p1], { size: 1.1, tone: "hi" }));
    out.push(k.dotsSvg([p0], { size: 0.9, tone: "mid" }));
  }
  // зуби шестерень редуктора і вісь сателіта
  for (const part of geo.parts.filter((p) => p.kind === "gear")) {
    const [s0, r0] = part.poly[0];
    const [s1, , r1] = [part.poly[2][0], 0, part.poly[2][1]];
    const edges = part.id === "planet" ? [[r1, -1], [r0, 1]] : part.id === "sun" ? [[r1, -1]] : [[r0, 1]];
    for (const half of [1, -1]) {
      const phi = half > 0 ? PHI0 : PHI1;
      let d = "";
      for (const [r, dir] of edges) for (let s = s0 + 0.008; s < s1 - 0.004; s += 0.014) d += pathOf([scr(at(s, r, phi)), scr(at(s, r + dir * 0.012, phi))], false);
      out.push(`<path class="iso-line" data-tone="mid" d="${d}"/>`);
      if (part.id === "planet") {
        const pin = [[s0 + 0.04, (r0 + r1) / 2 - 0.018], [s1 - 0.04, (r0 + r1) / 2 - 0.018], [s1 - 0.04, (r0 + r1) / 2 + 0.018], [s0 + 0.04, (r0 + r1) / 2 + 0.018]];
        const pd = cut(pin, half);
        out.push(`<path class="je-cut-case" d="${pd}"/><path class="iso-line" data-tone="mid" d="${pd}"/>`);
      }
    }
  }
  return out.join("");
}

// ---------------------------------------------------------------------------
// Пілон: дві стійки від рухомої рами до верхніх точок підвіски двигуна
function pylon(geo, engine) {
  const top = geo.parts.find((p) => p.id === "nacelle" || p.id === "skin");
  const outerAt = (s) => {
    let best = 0;
    const poly = top.poly;
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i];
      const q = poly[(i + 1) % poly.length];
      if ((p[0] - s) * (q[0] - s) <= 0 && p[0] !== q[0]) best = Math.max(best, p[1] + ((q[1] - p[1]) * (s - p[0])) / (q[0] - p[0]));
    }
    return best;
  };
  const mounts = engine.id === "jumo" ? [0.5, 1.95] : engine.id === "jt8d" ? [0.6, 2.4] : engine.id === "f135" ? [0.6, 2.25] : [0.55, geo.bypass && geo.bypass.s1 < 2.3 ? geo.bypass.s1 - 0.3 : 1.6];
  const out = [];
  for (const s of mounts) {
    const r = outerAt(s);
    const y = F.o[1] - s * M;
    const zTop = STAND.ZL;
    const xr = -4;
    const zEng = F.o[2] + Math.sqrt(Math.max(0, (r * M) ** 2 - xr * xr));
    // стійка і башмак
    const plan = { x: -7, y: y - 4, w: 6, d: 8, r: 1 };
    out.push(k.solidSvg(k.slabOf(plan, zEng - 1, zTop - zEng + 1, P, 2, 0.4), { tone: "mid" }));
    out.push(k.solidSvg(k.slabOf({ x: -8.5, y: y - 7, w: 8, d: 14, r: 1.5 }, zEng - 1.5, 3, P, 3, 0.4), { tone: "mid" }));
    out.push(k.dotsSvg(k.pointsAt([[-4.5, y - 5, zEng + 1.5], [-4.5, y + 5, zEng + 1.5]], P), { size: 0.5, tone: "mid" }));
  }
  return out.join("");
}

// ---------------------------------------------------------------------------
// Модулі для розбирання: кожна деталь і ряд лопаток належать одному модулю.
// Усі модулі рухаються лише вздовж осі, тож радіальне вкладення (а з ним і порядок малювання) зберігається.
export const MODULE_ORDER = ["nac", "cowl", "fan", "gear", "lpc", "hpc", "comb", "turb", "ab", "noz", "shaft"];
const PART_MODULE = {
  nacelle: "nac", skin: "nac", splitter: "cowl", "core-case": "cowl",
  spinner: "fan", "fan-disc": "fan", nose: "fan",
  "gear-case": "gear", "ring-gear": "gear", planet: "gear", sun: "gear", carrier: "gear",
  "lp-shaft": "shaft", "hp-shaft": "shaft", shaft: "shaft",
  "lpc-drum": "lpc", "int-case": "lpc", drum: "hpc", "hpc-drum": "hpc",
  "comb-inner": "comb", liner: "comb", can: "comb", "comb-cone": "comb",
  "turbine-case": "turb", tail: "noz", "tail-hub": "noz", zwiebel: "noz", "zwiebel-rod": "noz",
  "ab-case": "ab", "ab-liner": "ab", spray1: "ab", spray2: "ab", holder1: "ab", holder2: "ab",
  "noz-conv": "noz", "noz-div": "noz", "noz-ext": "noz", "noz-act": "noz",
};
function moduleOfPart(geo, part) {
  if (geo.ab && part.id === "tail") return "ab";
  if (PART_MODULE[part.id]) return PART_MODULE[part.id];
  if (part.id.startsWith("tdisc")) return "turb";
  if (part.id.startsWith("flange")) return geo.bypass ? "cowl" : "nac";
  return "cowl";
}
function moduleOfRow(geo, row) {
  if (row.fan || row.bypass) return "fan";
  if (row.strut) return "nac";
  if (row.hot) return "turb";
  if (geo.lpc && row.s < geo.lpc[1]) return "lpc";
  return "hpc";
}
/** Зсув модуля вздовж осі (м, + — проти потоку) у розібраному стані. */
export function explodeOf(geo) {
  const fanEngine = !!geo.bypass;
  const seq = fanEngine ? ["gear", "lpc", "hpc", "comb", "turb", "ab", "noz"] : ["hpc", "comb", "turb", "noz"];
  const out = { nac: fanEngine ? 1.0 : 0.75, cowl: 0.5, fan: 0, shaft: 0 };
  let k = 0;
  for (const id of seq) {
    if (id === "gear" && !geo.parts.some((p) => p.kind === "gear")) continue;
    if ((id === "lpc" && !geo.lpc) || (id === "ab" && !geo.ab)) continue;
    k += 1;
    out[id] = -(geo.ab ? 0.27 : 0.36) * k;
  }
  return out;
}

function engineSvg(geo, engine, index, initial) {
  const mods = {};
  for (const id of MODULE_ORDER) mods[id] = { parts: [], rows: [] };
  for (const part of geo.parts) mods[moduleOfPart(geo, part)].parts.push(part);
  for (const row of geo.rows) mods[moduleOfRow(geo, row)].rows.push(row);
  const present = MODULE_ORDER.filter((id) => mods[id].parts.length || mods[id].rows.length);
  const layers = { inward: [], fins: [], outward: [], section: [] };
  for (const id of present) {
    const m = mods[id];
    const sub = { ...geo, parts: m.parts, rows: m.rows };
    const half = backHalf(m.parts);
    const g = (body, cls = "") => `<g data-mod="${id}"${cls ? ` class="${cls}"` : ""}>${body}</g>`;
    const seam = (body) => `<g data-mod="${id}" class="iso-solid" data-seamless>${body}</g>`;
    layers.inward.push(seam(runs(half.inward)));
    layers.fins.push(g(backBlades(m.rows, geo.id)));
    layers.outward.push(seam(runs(half.outward)));
    layers.section.push(g(section(sub) + details(sub, id === "comb") + (id === "nac" ? "" : ""), "je-mod-cut"));
  }
  // зовнішні поверхні: спершу внутрішні тіла, наостанок оболонки
  layers.outward.reverse();
  const parts = [
    `<g class="iso-solid je-back" data-seamless>${layers.inward.join("")}</g>`,
    `<g class="iso-solid je-fins">${layers.fins.join("")}</g>`,
    `<g class="iso-solid je-back" data-seamless>${layers.outward.join("")}</g>`,
    `<g data-mod="nac">${pylon(geo, engine)}</g>`,
    `<g class="je-section">${layers.section.join("")}</g>`,
  ];
  return `<g class="je-engine" data-engine="${index}" data-mods="${present.join(" ")}"${index === initial ? "" : ' data-off=""'}>${parts.join("")}</g>`;
}

/** Усі двигуни серії; видимий — `initial`. */
export const enginesSvg = (initial) => `<g class="je-engines">${READOUTS.map((engine, i) => engineSvg(GEOMETRY[i], engine, i, initial)).join("")}</g>`;
export { scr, at, cut, pathOf, PHI0, PHI1 };
export const EXPLODE = GEOMETRY.map(explodeOf);
