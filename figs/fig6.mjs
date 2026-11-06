// SPDX-FileCopyrightText: 2026 Max Kravchenko
// SPDX-License-Identifier: MIT

// Рис. 6 — F-35B: силова установка F135-PW-600 з підйомним вентилятором на стенді висіння.
// Той самий двигун F135, що й на Рис. 1, у розрізі; попереду — вал, муфта й підйомний вентилятор,
// позаду — поворотне сопло з трьох сегментів (3BSD), з боків — сопла крену. Ручка: політ → перехід → висіння.
import { k, G, T } from "../src/kit.mjs";
import { figurePage, comma, YEAR_BUTTONS } from "../src/page.mjs";
import { engineSvg, useView } from "../src/render.mjs";
import { STAND } from "../src/stand.mjs";
import { GEOMETRY, table } from "../src/engines.mjs";
import { READOUTS } from "../src/model.mjs";
import { engineApp } from "../src/catalog.mjs";

const W = 920;
const H = 600;
const M = 62; // одиниць світу на метр — як на стенді серії
const Y0 = 150; // площина вентилятора двигуна
const ZC = 112; // висота осі
const I = GEOMETRY.findIndex((g) => g.id === "f135");
const GEO = GEOMETRY[I];
// підйомний вентилятор: центр уздовж осі, внутрішній/зовнішній радіус, низ і верх відносно осі двигуна, м
const LF = { s: -2.8, rIn: 0.67, rOut: 0.72, z0: -0.5, z1: 0.42 };
// поворотне сопло: три сегменти [довжина, r на вході, r на виході]; частка повороту кожного сегмента
const SW = { s0: 4.72, segs: [[0.4, 0.52, 0.5], [0.4, 0.5, 0.47], [0.38, 0.46, 0.4]], tilt: [0.15, 0.55, 1] };
const ROLL = { s: 1.3, x: 2.3, z: -0.1, r: 0.09 };
const DOOR = { hinge: LF.s + 0.78, len: 1.55, half: 0.72, max: (65 * Math.PI) / 180 };
const NF = 10; // кадрів повороту сопла (0…90°)
const MODES = ["Політ", "Перехід", "Висіння"];
const KNOB_ANGLES = [-45, 0, 45].map((d) => (d * Math.PI) / 180);

const BASE = { x: -175, y: Y0 - 6.9 * M, w: 330, d: 10.9 * M, r: 9 };
const DESK = { x: 112, y: Y0 - 6.4 * M, w: 46, d: 54, r: 3 };
const DESK_H = 22;
const DIALS = [{ x: 124, y: DESK.y + 40, r: 10 }, { x: 124, y: DESK.y + 14, r: 10 }];
const KNOB = { x: 147, y: DESK.y + 27, r: 5, z: DESK_H + 4.5 };
const DIAL_MAX = 200;

const W3 = (s, x, z) => [x * M, Y0 - s * M, ZC + z * M];
const F6 = G.frameOf([0, Y0, ZC], [0, -1, 0], [1, 0, 0], [0, 0, 1]);
const P = k.fitProjection(
  [...k.boxCorners(BASE, -22, 0), W3(LF.s - 1.6, 0, 2.0), W3(LF.s, 0, 1.9), W3(6.1, 0, 0.8), W3(5.4, 0, -1.5), [ROLL.x * M + 8, Y0 - ROLL.s * M, 0], [-ROLL.x * M - 8, Y0 - ROLL.s * M, ZC + 40]],
  W, H, { pad: 26, azimuth: 30, elevation: 26 },
);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (p, style) => k.dotsSvg(k.pointsAt(p, P), style);
const f1 = (n) => (Math.round(n * 10) / 10).toFixed(1).replace(/\.0$/, "");
const poly = (list, close = true) => list.map(([x, y], i) => `${i ? "L" : "M"}${f1(x)} ${f1(y)}`).join("") + (close ? "Z" : "");
const depth = (p) => k.depthOf(p, P);

/** Ланцюжок сегментів сопла при повороті th: початок, вісь і довжина кожного сегмента (світові координати). */
function chainOf(th) {
  let o = W3(SW.s0, 0, 0);
  const segs = SW.segs.map(([len, r0, r1], i) => {
    const t = th * SW.tilt[i];
    const a = [0, -Math.cos(t), -Math.sin(t)];
    const seg = { o, a, len, r0, r1, t };
    o = G.add3(o, G.mul3(a, len * M));
    return seg;
  });
  return { segs, end: o, axis: segs[segs.length - 1].a };
}

// --- стенд -------------------------------------------------------------------------------------
function base() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(BASE, -22, 12, P)}"/>`);
  for (const [x, y] of k.corners(BASE, 16).sort((a, b) => depth([a[0], a[1], 0]) - depth([b[0], b[1], 0]))) {
    out.push(S(k.cylinder(x, y, 9, -22, 2, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 6.5, -20, 8, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(BASE, -12, 12, P, 8, 1.4), { tone: "mid", inner: L(k.sideSeam(BASE, -8, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(BASE, 5), 0, P), { tone: "faint" }));
  out.push(D(k.corners(BASE, 10).map(([x, y]) => [x, y, 0]), { size: 0.55, tone: "mid" }));
  // решітки над газовідвідними приямками: під підйомним вентилятором, під соплом і під соплами крену
  const grate = (cx, cy, w, d) => {
    const g = { x: cx - w / 2, y: cy - d / 2, w, d, r: 2 };
    out.push(S(k.slabOf(g, -1.2, 1.2, P, 3), { tone: "lo", crease: "none" }));
    let lines = "";
    for (let x = g.x + 5; x < g.x + w - 2; x += 5) lines += k.lineOnTop([x, g.y], [x, g.y + d], 0, P);
    out.push(L(lines, { tone: "faint" }), L(k.planOutline(g, 0, P, 3), { tone: "lo" }));
  };
  grate(0, Y0 - LF.s * M, 1.7 * M, 1.7 * M);
  grate(0, Y0 - 5.55 * M, 1.5 * M, 1.6 * M);
  for (const sx of [-1, 1]) grate(sx * ROLL.x * M, Y0 - ROLL.s * M, 0.6 * M, 0.6 * M);
  return out.join("");
}

/** Стійки: дві під двигуном, дві під підйомним вентилятором. */
function supports(side) {
  const out = [];
  const post = (x, y, zTop) => {
    out.push(S(k.slabOf({ x: x - 4, y: y - 6, w: 8, d: 12, r: 1 }, 0, zTop, P, 2, 0.5), { tone: "mid" }));
    out.push(S(k.slabOf({ x: x - 7, y: y - 9, w: 14, d: 18, r: 1.5 }, 0, 3, P, 3, 0.5), { tone: "mid" }));
  };
  if (side < 0) {
    for (const s of [0.9, 2.3]) post(0, Y0 - s * M, ZC - 0.6 * M);
    post(-0.95 * M, Y0 - LF.s * M, ZC + LF.z0 * M + 6);
  } else post(0.95 * M, Y0 - LF.s * M, ZC + LF.z0 * M + 6);
  return out.join("");
}

/** Корпус підйомного вентилятора й нижній жалюзійний пристрій. */
function liftFan() {
  const FL = G.frameOf(W3(LF.s, 0, 0), [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  const out = [];
  // жалюзі під вентилятором
  const box = { x: -0.6 * M, y: Y0 - (LF.s + 0.6) * M, w: 1.2 * M, d: 1.2 * M, r: 2 };
  const zb = ZC + LF.z0 * M;
  out.push(S(k.slabOf(box, zb - 14, 14, P, 3, 0.6), { tone: "mid", inner: L(Array.from({ length: 6 }, (_, i) => k.sideSeam(box, zb - 12 + i * 2.2, P, 3)).join(""), { tone: "lo" }) }));
  out.push(S(G.ringBand(LF.z0 * M, LF.z1 * M, LF.rIn * M, LF.rOut * M, FL, P), { tone: "hi", crease: "lo" }));
  // кільце-фланець зверху під дверима
  out.push(S(G.ringBand(LF.z1 * M - 3, LF.z1 * M, LF.rIn * M, (LF.rOut + 0.06) * M, FL, P), { tone: "mid" }));
  return out.join("");
}

/** Отвір зверху підйомного вентилятора — кліп для лопатей, що обертаються. */
function liftClip() {
  const z = ZC + LF.z1 * M;
  const ring = Array.from({ length: 64 }, (_, i) => {
    const a = (i / 64) * Math.PI * 2;
    return k.iso([LF.rIn * M * Math.cos(a), Y0 - LF.s * M + LF.rIn * M * Math.sin(a), z], P);
  });
  return `<clipPath id="lf-clip"><path d="${poly(ring)}"/></clipPath>`;
}

/** Вал від вентилятора двигуна до редуктора підйомного вентилятора й муфта на ньому. */
function shaft() {
  return S(G.disc((LF.s + LF.rOut) * M, -0.28 * M, 0.06 * M, F6, P), { tone: "hi" }) + S(G.disc(-0.95 * M, -0.8 * M, 0.18 * M, F6, P), { tone: "mid", crease: "lo" }) + S(G.disc(-0.8 * M, -0.74 * M, 0.13 * M, F6, P), { tone: "hi" });
}

/** Повітропроводи й сопла крену з одного боку. */
function rollPost(sx) {
  const y = Y0 - ROLL.s * M;
  const z = ZC + ROLL.z * M;
  const route = G.fillet([[sx * 0.35 * M, y, z], [sx * (ROLL.x - 0.15) * M, y, z], [sx * ROLL.x * M, y, z - 8], [sx * ROLL.x * M, y, z - 0.3 * M]], 6, 8);
  const tube = T.tubePieces(route, ROLL.r * M, P, { maxLength: 400 }).map((p) => T.tubeSvg(p, { tone: "mid" })).join("");
  const nz = S(k.cylinder(sx * ROLL.x * M, y, 0.12 * M, z - 0.42 * M, 0.14 * M, P, 32), { tone: "lo", crease: "lo" });
  return tube + nz;
}

/** Двері підйомного вентилятора при куті phi: тонка плита на шарнірі ззаду. */
function door(phi) {
  const zh = ZC + (LF.z1 + 0.05) * M;
  const yh = Y0 - DOOR.hinge * M;
  const dy = DOOR.len * M * Math.cos(phi), dz = DOOR.len * M * Math.sin(phi);
  const th = 2.2;
  const nrm = [0, -Math.sin(phi), Math.cos(phi)];
  const a = [-DOOR.half * M, yh, zh], b = [DOOR.half * M, yh, zh];
  const c = [DOOR.half * M, yh + dy, zh + dz], d = [-DOOR.half * M, yh + dy, zh + dz];
  const up = (p) => G.add3(p, G.mul3(nrm, th));
  const faces = [
    { q: [up(a), up(b), up(c), up(d)], n: nrm },
    { q: [a, b, c, d], n: G.mul3(nrm, -1) },
    { q: [c, d, up(d), up(c)], n: [0, Math.cos(phi), Math.sin(phi)] },
    { q: [b, c, up(c), up(b)], n: [1, 0, 0] },
    { q: [a, d, up(d), up(a)], n: [-1, 0, 0] },
  ];
  const V = G.viewOf(P);
  let svg = "";
  for (const f of faces) {
    if (G.dot3(f.n, V) <= 0) continue;
    const t = G.toneOf(f.n, P);
    const d2 = poly(f.q.map((p) => k.iso(p, P)));
    svg += (t > 3 ? `<path class="iso-top" d="${d2}"/>` : `<path class="iso-shade" data-shade="${t}" d="${d2}"/>`) + `<path class="iso-line" data-tone="mid" d="${d2}"/>`;
  }
  // шарнір
  svg += D([[-DOOR.half * M * 0.6, yh, zh], [DOOR.half * M * 0.6, yh, zh]], { size: 0.8, tone: "mid" });
  return svg;
}

/** Сегменти поворотного сопла при куті th. */
function swivel(th) {
  const { segs } = chainOf(th);
  const parts = segs.map((sg, i) => {
    const Fk = G.frameAlong(sg.o, sg.a);
    // сегменти трохи заходять один в один, щоб коліно читалося суцільним
    const solid = G.lathe([[-0.06 * M, 0], [-0.06 * M, sg.r0 * M], [sg.len * M, sg.r1 * M], [sg.len * M, 0]], Fk, P);
    const centre = G.add3(sg.o, G.mul3(sg.a, (sg.len * M) / 2));
    return { d: depth(centre), svg: S(solid, { tone: i === 2 ? "lo" : "mid", crease: "lo" }) };
  });
  parts.sort((a, b) => a.d - b.d);
  return parts.map((p) => p.svg).join("");
}

// --- частинки -----------------------------------------------------------------------------------
const SLOW = 220;
const DT = 0.05;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
/** Траса частинки: pos(l) — світова точка, v(l) — м/с, kind(l) — 0/1/2; кроки через рівний екранний час. */
function trace(pos, v, kind, l0, l1, alpha = () => 1) {
  const out = [];
  let l = l0;
  while (l < l1 && out.length < 900) {
    const p = k.iso(pos(l), P);
    out.push([Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10, kind(l), Math.round(alpha(l) * 20) / 20]);
    l += Math.max(8, v(l)) * (DT / SLOW);
  }
  return out;
}
const share = 1 / (1 + 0.51); // частка ядра при висінні (m 0,51)

/** Радіус лінії течії всередині двигуна (у площині розрізу), f — частка висоти каналу. */
function radiusIn(kind, f) {
  const { ri, ro, bypass, ab } = GEO;
  const wall = ab.wall;
  const duct = (s, ff) => { const i = Math.max(0, ri(Math.min(s, 2.95))), o = wall(Math.min(s, SW.s0)); return Math.sqrt(i * i + ff * (o * o - i * i)); };
  return (s) => {
    if (kind === "core") {
      const face = Math.sqrt(0.19 ** 2 + f * (0.41 ** 2 - 0.19 ** 2));
      if (s < 0.62) return s < 0 ? face * (1 + 0.25 * smooth((-0.2 - s) / 1.2)) : lerp(face, ri(0.62) + f * (ro(0.62) - ri(0.62)), smooth(s / 0.62));
      if (s <= 2.55) return ri(s) + f * (ro(s) - ri(s));
      return lerp(ri(2.55) + f * (ro(2.55) - ri(2.55)), duct(s, f * share), smooth((s - 2.55) / 0.3));
    }
    const face = Math.sqrt(0.41 ** 2 + f * (0.545 ** 2 - 0.41 ** 2));
    if (s < 0.7) return s < 0 ? face * (1 + 0.18 * smooth((-0.2 - s) / 1.2)) : lerp(face, bypass.in(0.7) + f * (bypass.out(0.7) - bypass.in(0.7)), smooth(s / 0.7));
    if (s <= 2.55) return bypass.in(s) + f * (bypass.out(s) - bypass.in(s));
    return lerp(bypass.in(2.55) + f * (bypass.out(2.55) - bypass.in(2.55)), duct(s, share + f * (1 - share)), smooth((s - 2.55) / 0.3));
  };
}

/** Лінії течії двигуна: однакова «голова» до сопла й «хвости» для кожного кадру повороту. */
function engineLanes() {
  const vCore = table([[-1.6, 40], [-0.4, 115], [0, 165], [1.4, 120], [1.45, 45], [1.85, 70], [1.92, 180], [2.32, 260], [2.55, 200], [SW.s0, 190]]);
  const vByp = table([[-1.6, 40], [-0.4, 115], [0, 165], [2.55, 150], [SW.s0, 190]]);
  const VJ = 620; // вихід сопла без форсажу, оцінка для анімації
  const lanes = [];
  const spec = [["core", 0.3], ["core", 0.7], ["bypass", 0.35], ["bypass", 0.75]];
  for (const half of [1, -1]) {
    for (const [kind, f] of spec) {
      const r = radiusIn(kind, f);
      const rEnd = r(SW.s0);
      const wallEnd = GEO.ab.wall(SW.s0);
      const kindOf = kind === "core" ? (s) => (s >= 1.5 ? 2 : 1) : () => 0;
      const headPos = (s) => W3(s, 0, half * r(s));
      const head = trace(headPos, kind === "core" ? vCore : vByp, kindOf, -1.6, SW.s0);
      const tails = [];
      for (let fr = 0; fr < NF; fr++) {
        const th = ((Math.PI / 2) * fr) / (NF - 1);
        const { segs } = chainOf(th);
        const total = segs.reduce((a, sg) => a + sg.len, 0);
        const pos = (l) => {
          let left = l;
          for (const sg of segs) {
            if (left <= sg.len || sg === segs[segs.length - 1]) {
              const at = Math.min(left, sg.len);
              const rr = lerp(sg.r0, sg.r1, at / sg.len) * (rEnd / wallEnd);
              const n = [0, -Math.sin(sg.t), Math.cos(sg.t)];
              let p = G.add3(sg.o, G.mul3(sg.a, at * M));
              if (left > sg.len) p = G.add3(p, G.mul3(sg.a, (left - sg.len) * M));
              const spread = left > total ? 1 + 0.08 * (left - total) : 1;
              return G.add3(p, G.mul3(n, half * rr * spread * M));
            }
            left -= sg.len;
          }
          return null;
        };
        const v = (l) => (l < total * 0.6 ? 200 : l < total ? lerp(200, VJ, (l - total * 0.6) / (total * 0.4)) : VJ * (1 - 0.45 * smooth((l - total - 0.4) / 1.2)));
        tails.push(trace(pos, v, kind === "core" ? () => 2 : () => 0, 0, total + 1.6, (l) => 1 - smooth((l - total - 0.2) / 1.4) * 0.95));
      }
      lanes.push({ head, tails, rate: kind === "core" ? 2.6 : 2.2, group: 0 });
    }
  }
  return lanes;
}

/** Повітря підйомного вентилятора: зверху крізь двері, вниз крізь жалюзі; і струмені сопел крену. */
function liftLanes() {
  const lanes = [];
  // l — шлях униз; висота над віссю двигуна h = −l: від 2 м над віссю до приямка під стендом
  for (const [dx, ds] of [[-0.42, 0.25], [-0.14, -0.3], [0.14, 0.3], [0.42, -0.2], [-0.3, -0.05], [0.3, 0.05]]) {
    const pos = (l) => {
      const h = -l;
      const s = LF.s + ds * (h < LF.z0 ? 1 + 0.15 * (LF.z0 - h) : 1);
      const x = dx * (h > LF.z1 ? 1 + 0.5 * (h - LF.z1) : 1);
      return W3(s, x, h);
    };
    const v = (l) => (-l > LF.z1 ? 70 : -l > LF.z0 ? 140 : 160);
    const p = trace(pos, v, () => 0, -2.0, 1.75, (l) => (l > 1.0 ? 1 - smooth((l - 1.0) / 0.75) * 0.9 : 1));
    lanes.push({ head: p, tails: null, rate: 2.2, group: 1 });
  }
  for (const sx of [-1, 1]) for (const dx of [-0.05, 0.05]) {
    const p = trace((l) => W3(ROLL.s + dx, sx * ROLL.x, ROLL.z - 0.42 - l), () => 260, () => 0, 0, 1.4, (l) => 1 - smooth((l - 0.3) / 1.1) * 0.9);
    lanes.push({ head: p, tails: null, rate: 1.6, group: 2 });
  }
  return lanes;
}

// --- пульт ---------------------------------------------------------------------------------------
function console() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(DESK, 0, DESK_H, P)}"/>`);
  out.push(S(k.slabOf(DESK, 0, DESK_H, P, 4, 1), { tone: "mid", inner: L(k.sideSeam(DESK, 6, P, 4), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(DESK, 3), DESK_H, P, 4), { tone: "faint" }));
  DIALS.forEach(({ x, y, r }, i) => {
    const z = DESK_H + 5;
    out.push(S(k.cylinder(x, y, r + 1.5, DESK_H, 2, P, 48), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, r, DESK_H + 2, 3, P, 64, 0.6), { tone: "hi", crease: "lo" }));
    out.push(L(k.ring(x, y, r - 1.8, z, P, 64), { tone: "lo" }));
    const t = k.radialTicks(x, y, r - 2.4, 20, 5, z, [1, 2.2], P, -0.75 * Math.PI, 1.5 * Math.PI + (1.5 * Math.PI) / 20);
    out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
    out.push(`<path class="iso-line" data-tone="lit" data-part="needle${i}" data-free="start" style="stroke-width:1" d=""/>`);
    out.push(L(k.ring(x, y, 0.7, z + 0.2, P, 12), { tone: "hi" }));
  });
  out.push(k.faceTextSvg(k.topMatrix([DIALS[0].x - 3, DIALS[0].y + 5.2], DESK_H + 5, P, "x"), "↑ кН", { size: 2, tone: "lo" }));
  out.push(k.faceTextSvg(k.topMatrix([DIALS[1].x - 3, DIALS[1].y + 5.2], DESK_H + 5, P, "x"), "→ кН", { size: 2, tone: "lo" }));
  out.push(S(k.cylinder(KNOB.x, KNOB.y, KNOB.r + 3, DESK_H, 1.2, P, 40), { tone: "lo" }));
  KNOB_ANGLES.forEach((a) => out.push(L(k.lineOnTop([KNOB.x + Math.sin(a) * (KNOB.r + 1.3), KNOB.y - Math.cos(a) * (KNOB.r + 1.3)], [KNOB.x + Math.sin(a) * (KNOB.r + 2.8), KNOB.y - Math.cos(a) * (KNOB.r + 2.8)], DESK_H + 1.2, P), { tone: "mid" })));
  out.push(S(k.cylinder(KNOB.x, KNOB.y, KNOB.r, DESK_H + 1.2, KNOB.z - DESK_H - 1.2, P, 40, 0.5), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(KNOB.x, KNOB.y, KNOB.r, DESK_H + 1.2, KNOB.z, 28, P), { tone: "lo" }));
  out.push(`<path class="iso-line" data-tone="lit" data-part="pointer" data-free="" style="stroke-width:1.2" d=""/>`);
  return out.join("");
}

// --- 3D ------------------------------------------------------------------------------------------
const r3 = (x) => Math.round(x * 1000) / 1000;
function star(cx, cz, n, rHub, rTip, w) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    for (const [da, r] of [[-0.5, rHub], [-w / 2, rHub], [-w / 2 + 0.06, rTip], [w / 2 + 0.06, rTip], [w / 2, rHub]]) {
      const b = a + (da * 2 * Math.PI) / n;
      out.push([r3(cx + r * Math.cos(b)), r3(cz + r * Math.sin(b))]);
    }
  }
  return out;
}
function stovlApp() {
  const eng = engineApp(I).root;
  const tilt = Math.PI / 2;
  // сегменти сопла в положенні висіння: вісь x — уздовж двигуна, y — угору
  let o = [SW.s0, 0, 0];
  const segs = SW.segs.map(([len, r0, r1], i) => {
    const t = tilt * SW.tilt[i];
    const g = { t: "lathe", poly: [[0, 0], [len, 0], [len, r1], [0, r0]], m: i === 2 ? "hot" : "case", place: { rz: -t, to: o.map(r3) } };
    o = [o[0] + Math.cos(t) * len, o[1] - Math.sin(t) * len, 0];
    return g;
  });
  const phi = DOOR.max;
  const h = [DOOR.hinge, LF.z1 + 0.05];
  const f = [h[0] - DOOR.len * Math.cos(phi), h[1] + DOOR.len * Math.sin(phi)];
  const n = [-Math.sin(phi) * 0.03, -Math.cos(phi) * 0.03];
  const doorShape = [h, f, [f[0] + n[0], f[1] + n[1]], [h[0] + n[0], h[1] + n[1]]].map((p) => p.map(r3));
  const C = [LF.s, 0];
  const paths = [];
  const add = (kind, speed, nn, list) => paths.push({ kind, speed, n: nn, pts: list.map((p) => p.map(r3)) });
  // повітря підйомного вентилятора
  for (const [dx, dz] of [[0, 0], [0.35, 0], [-0.35, 0], [0, 0.35], [0, -0.35], [0.25, 0.25], [-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25]]) add("cool", 1.3, 22, [[LF.s + dx, 1.9, dz], [LF.s + dx, LF.z1, dz], [LF.s + dx, LF.z0 - 0.3, dz], [LF.s + dx * 1.3, -2.2, dz * 1.3]]);
  // двигун: вхід → ядро (холодне, потім гаряче) і зовнішній контур → сопло вниз
  const nozzle = (r) => {
    const out = [];
    let p = [SW.s0, 0, 0];
    SW.segs.forEach(([len], i) => { const t = tilt * SW.tilt[i]; p = [p[0] + Math.cos(t) * len, p[1] - Math.sin(t) * len, 0]; out.push([p[0], p[1], 0]); });
    const last = out[out.length - 1];
    return [...out.map((q) => [q[0], q[1], r]), [last[0], last[1] - 1.6, r * 1.2]];
  };
  for (let j = 0; j < 8; j++) {
    const a = (j / 8) * Math.PI * 2;
    const cy = Math.cos(a), cz = Math.sin(a);
    add("core", 1.6, 22, [[-1.6, 0.25 * cy, 0.25 * cz], [0, 0.3 * cy, 0.3 * cz], [1.4, 0.32 * cy, 0.32 * cz], [1.5, 0.3 * cy, 0.3 * cz]]);
    add("hot", 2.2, 34, [[1.5, 0.3 * cy, 0.3 * cz], [2.3, 0.33 * cy, 0.33 * cz], [3.5, 0.25 * cy, 0.25 * cz], [SW.s0, 0.22 * cy, 0.22 * cz], ...nozzle(0.2 * cz)]);
    add("bypass", 1.8, 30, [[-1.6, 0.45 * cy, 0.45 * cz], [0.6, 0.47 * cy, 0.47 * cz], [2.5, 0.47 * cy, 0.47 * cz], [SW.s0, 0.4 * cy, 0.4 * cz], ...nozzle(0.36 * cz)]);
  }
  for (const sz of [-1, 1]) add("cool", 1.8, 18, [[ROLL.s, ROLL.z, sz * 0.55], [ROLL.s, ROLL.z, sz * ROLL.x], [ROLL.s, ROLL.z - 0.4, sz * ROLL.x], [ROLL.s, -1.8, sz * ROLL.x]]);
  const lift = {
    id: "liftfan", name: "Підйомний вентилятор", ex: [-0.7, 0.9, 0],
    func: "Дві ступені вентилятора, що обертаються в протилежні боки, на вертикальній осі перед двигуном. Його крутить вал від турбіни низького тиску (≈22 МВт). Повітря заходить зверху крізь відкриті двері й виходить униз крізь жалюзі — холодним стовпом, як у гелікоптера.",
    mat: ["титанові ротори-блиски", "алюмінієвий і композитний корпус"],
    facts: [["Тяга при висінні", "≈83 кН (46 %)"], ["Діаметр входу", "1,35 м"], ["Потужність на валу", "≈22 МВт (30 000 к. с.)"], ["Ступенів", "2, протилежне обертання"]],
    kids: [
      { id: "housing", name: "Корпус", func: "Кільцевий канал навколо роторів; тримає зазори над кінцями лопатей.", mat: ["алюмінієві сплави й композит"], geo: [{ t: "lathe", ax: "y", poly: [[LF.z0, LF.rIn], [LF.z1, LF.rIn], [LF.z1, LF.rOut], [LF.z0, LF.rOut]], m: "case", at: [C] }], role: "outer" },
      { id: "stage1", name: "Верхній ротор", func: "Перша ступінь: засмоктує повітря зверху й стискає його.", mat: ["титановий блиск"], geo: [{ t: "ext", ax: "y", shape: star(C[0], C[1], 24, 0.22, LF.rIn - 0.02, 0.5), z0: -0.26, z1: -0.1, m: "blade" }], spin: { s: "lp", k: 0.45, axis: "y", c: C } },
      { id: "stage2", name: "Нижній ротор", func: "Друга ступінь обертається в протилежний бік: знімає закрутку першої, тож повітря виходить униз без закручування.", mat: ["титановий блиск"], geo: [{ t: "ext", ax: "y", shape: star(C[0], C[1], 26, 0.22, LF.rIn - 0.02, 0.5), z0: 0.06, z1: 0.22, m: "blade" }], spin: { s: "lp", k: -0.45, axis: "y", c: C } },
      { id: "hub", name: "Маточина з кутовим редуктором", func: "Конічні шестерні повертають обертання горизонтального вала на вертикальну вісь вентилятора й ділять його між двома роторами.", mat: ["цементована сталь"], geo: [{ t: "lathe", ax: "y", poly: [[-0.35, 0], [0.32, 0], [0.32, 0.21], [-0.35, 0.21]], m: "gear", at: [C] }], role: "inner" },
      { id: "door", name: "Двері вентилятора", func: "Великі двері на шарнірі ззаду: на висінні відкриті вперед-угору й ведуть повітря до вентилятора, у польоті закриті врівень з обшивкою.", mat: ["композит"], geo: [{ t: "ext", shape: doorShape, z0: -DOOR.half, z1: DOOR.half, m: "case" }] },
      { id: "vanes", name: "Жалюзі на виході", func: "Поворотні лопатки під вентилятором відхиляють струмінь уперед-назад: так льотчик керує літаком на висінні й плавно переходить до польоту.", mat: ["титан / сталь"], geo: [{ t: "box", min: [LF.s - 0.6, LF.z0 - 0.22, -0.6], max: [LF.s + 0.6, LF.z0, 0.6], m: "vane" }] },
    ],
  };
  return {
    frame: "x", unit: 1,
    cut: [[0, -1, 0, 0], [0, 0, -1, 0]],
    view: [-0.75, 0.55, 1],
    spools: [{ id: "lp", name: "N1", rpm: 10000, tau: 1.5 }, { id: "hp", name: "N2", rpm: 14000, tau: 1.1 }],
    sound: { roar: 1.0, hiss: 0.5 },
    flow: { paths },
    root: {
      id: "stovl", name: "Силова установка F-35B", kicker: "F135-PW-600 · LiftSystem Rolls-Royce",
      func: "Двигун F135 з підйомною системою для вертикальної посадки. На висінні тягу дають три джерела: підйомний вентилятор попереду, поворотне сопло позаду (повернуте вниз) і два сопла крену в крилах — тож літак стоїть на трьох «ногах» повітря й не перекидається. Модель показано в положенні висіння.",
      mat: ["двигун — як F135 на Рис. 1", "підйомна система Rolls-Royce LiftSystem: вентилятор, вал, муфта, поворотне сопло, сопла крену"],
      facts: [["Тяга при висінні", "≈181 кН"], ["Підйомний вентилятор", "≈83 кН (46 %)"], ["Поворотне сопло", "≈83 кН (46 %)"], ["Сопла крену", "≈15 кН (8 %)"], ["Тяга в польоті", "120 кН, з форсажем 182 кН"], ["Довжина з вентилятором", "9,37 м"]],
      kids: [
        { id: "engine", name: "Двигун F135-PW-600", ex: [0, 0, 0], func: "Той самий F135, що й у F-35A, але турбіна низького тиску крутить ще й вал до підйомного вентилятора. Ступінь двоконтурності — 0,56 у польоті й 0,51 на висінні.", mat: eng.mat, facts: eng.facts.filter(([k2]) => k2 !== "Літак" && k2 !== "Тяга на стенді"), kids: eng.kids.filter((m) => m.id !== "noz") },
        { id: "shaft", name: "Вал і муфта", ex: [-0.4, 0.5, 0], func: "Вал іде від вентилятора двигуна вперед до підйомного вентилятора. Муфта зчеплення зʼєднує його лише на висінні; у польоті вентилятор стоїть, а двигун працює як звичайний.", mat: ["високоміцна сталь", "муфта — багатодискова, з вуглецевими дисками"], kids: [
          { id: "drive", name: "Вал приводу", func: "Передає ≈22 МВт від турбіни низького тиску до редуктора підйомного вентилятора.", mat: ["високоміцна сталь"], geo: [{ t: "lathe", poly: [[LF.s + LF.rOut, 0], [-0.28, 0], [-0.28, 0.06], [LF.s + LF.rOut, 0.06]], m: "rotor" }], spin: { s: "lp" } },
          { id: "clutch", name: "Муфта зчеплення", func: "Багатодискова муфта: стискається, і вал підхоплює підйомний вентилятор без ривка за кілька секунд.", mat: ["вуглецеві диски", "сталевий корпус"], geo: [{ t: "lathe", poly: [[-0.95, 0], [-0.74, 0], [-0.74, 0.18], [-0.95, 0.18]], m: "gear" }], spin: { s: "lp" } },
        ] },
        lift,
        { id: "swivel", name: "Поворотне сопло (3BSD)", ex: [0.6, -0.3, 0], func: "Три сегменти з косими торцями на трьох підшипниках. Коли сегменти повертаються один відносно одного, сопло згинається з прямого положення вниз приблизно на 90°.", mat: ["титан і нікелеві сплави", "частину стінок охолоджує повітря зовнішнього контуру"], kids: segs.map((g, i) => ({ id: `seg${i + 1}`, name: `Сегмент ${i + 1}`, func: i === 2 ? "Останній сегмент з регульованим соплом: на висінні дивиться прямо вниз." : "Сегмент з косим торцем: повертається на своєму підшипнику, і канал згинається.", mat: ["титан / нікелевий сплав"], geo: [g], ex: [0.12 * (i + 1), -0.12 * (i + 1), 0] })) },
        { id: "roll", name: "Сопла крену", ex: [0, 0, 0.6], func: "З каналу зовнішнього контуру повітря по трубах іде в крила й виходить униз. Ліве й праве сопла відкриваються по-різному й утримують літак від нахилу вбік.", mat: ["титанові труби", "клапани з приводом"], facts: [["Тяга", "≈15 кН разом (8 %)"]], geo: [
          { t: "lathe", ax: "z", poly: [[0.5, 0], [ROLL.x, 0], [ROLL.x, ROLL.r], [0.5, ROLL.r]], m: "case", at: [[ROLL.s, ROLL.z]] },
          { t: "lathe", ax: "z", poly: [[-ROLL.x, 0], [-0.5, 0], [-0.5, ROLL.r], [-ROLL.x, ROLL.r]], m: "case", at: [[ROLL.s, ROLL.z]] },
          { t: "lathe", ax: "y", poly: [[ROLL.z - 0.42, 0], [ROLL.z, 0], [ROLL.z, 0.12], [ROLL.z - 0.42, 0.12]], m: "hot", at: [[ROLL.s, ROLL.x], [ROLL.s, -ROLL.x]] },
        ] },
      ],
    },
  };
}

export function build() {
  useView({ P, M, F: F6 });
  const engine = engineSvg(GEO, READOUTS[I], 0, 0, { skip: ["noz"], pylon: false });
  useView(STAND);
  const frames = Array.from({ length: NF }, (_, f) => {
    const th = ((Math.PI / 2) * f) / (NF - 1);
    const phi = DOOR.max * Math.min(1, (2 * f) / (NF - 1));
    return { noz: swivel(th), door: door(phi) };
  });
  const svg = k.figureSvg({
    width: W,
    height: H,
    label: "Стенд висіння F-35B: двигун F135 у розрізі; попереду на валу з муфтою — підйомний вентилятор з дверима зверху й жалюзі знизу, позаду — поворотне сопло з трьох сегментів, з боків — труби й сопла крену. Ручка на пульті перемикає режим: політ, перехід, висіння.",
    body: [
      `<defs>${liftClip()}</defs>`,
      base(), supports(-1), rollPost(-1), liftFan(),
      `<g class="je-lift-rotor" clip-path="url(#lf-clip)"></g>`,
      `<g class="je-door"></g>`,
      engine.replace('data-off=""', ""), shaft(),
      `<g class="je-noz"></g>`,
      supports(1), rollPost(1),
      `<g class="je-flow" aria-hidden="true"></g>`,
      console(),
    ],
  });
  const LANES = [...engineLanes(), ...liftLanes()];
  const DATA = [
    { mode: "Політ", up: 0, fwd: 120, lift: 0, roll: 0, line: "сопло прямо · підйомний вентилятор стоїть · тяга 120 кН уперед (з форсажем 182)" },
    { mode: "Перехід", up: 105, fwd: 60, lift: 0.5, roll: 0.5, line: "сопло ≈45° · муфта зчеплена, вентилятор розкручується · тяга ділиться між «угору» й «уперед»" },
    { mode: "Висіння", up: 181, fwd: 0, lift: 1, roll: 1, line: "вентилятор ≈83 кН · сопло ≈83 кН · сопла крену ≈15 кН — разом ≈181 кН угору" },
  ];
  const captions = [
    "Політ. Двигун працює як звичайний F135: усе повітря йде крізь двигун і виходить назад крізь пряме сопло. Підйомний вентилятор відʼєднаний муфтою й стоїть, його двері закриті — літак летить, як будь-який винищувач.",
    "Перехід. Льотчик натискає кнопку, і далі все робить автоматика: відкриваються двері, муфта підхоплює вентилятор, сопло починає згинатися вниз. Частина тяги вже піднімає літак, частина ще штовхає вперед — літак сповільнюється й «сідає» на струмені. Числа на приладах для цього режиму — приблизні, для наочності.",
    "Висіння. Літак стоїть у повітрі на трьох струменях: холодний стовп від підйомного вентилятора попереду (≈46 % тяги), гарячий струмінь з повернутого сопла позаду (≈46 %) і два маленьких струмені крену в крилах (≈8 %). Передній і задній струмені однакові, тож літак не перекидається ні носом, ні хвостом.",
  ];
  const note = " Розподіл тяги на висінні — за Wikipedia (Pratt & Whitney F135, F135-PW-600): 83,1 + 83,1 + 14,6 кН. На моделі сопло й двері показано спрощено; частинки рухаються в 220 разів повільніше, ніж повітря.";
  const legend = `${YEAR_BUTTONS(MODES)}<span class="je-years"><button type="button" class="je-open3d" data-open-3d>3D · обертати й розібрати (R)</button></span><span class="iso-keys"><span class="iso-key"><svg class="iso-swatch je-sw" data-flow="bypass" viewBox="0 0 16 10" aria-hidden="true"><path d="M1.5 5h13"/></svg>холодне повітря: зовнішній контур, підйомний вентилятор, сопла крену</span><span class="iso-key"><svg class="iso-swatch je-sw" data-flow="core" viewBox="0 0 16 10" aria-hidden="true"><path d="M1.5 5h13"/></svg>повітря ядра</span><span class="iso-key"><svg class="iso-swatch je-sw" data-flow="hot" viewBox="0 0 16 10" aria-hidden="true"><path d="M1.5 5h13"/></svg>гарячий газ</span></span><span class="iso-caption je-caption"></span><span class="je-sources">Джерела: <a href="https://en.wikipedia.org/wiki/Pratt_%26_Whitney_F135">Pratt &amp; Whitney F135</a> (F135-PW-600: тяга 120 / 182 кН, при висінні 181 кН; m 0,56 / 0,51; довжина 9,37 м; вхід вентилятора ∅ 1,35 м; ≈22 МВт на вал; розподіл тяги 46 / 46 / 8 %), <a href="https://en.wikipedia.org/wiki/Rolls-Royce_LiftSystem">Rolls-Royce LiftSystem</a>. Оберти, тиск вентилятора й числа для перехідного режиму — оцінки.</span>`;
  const script = `
const P = ${JSON.stringify(P)};
const FRAMES = ${JSON.stringify(frames)};
const LANES = ${JSON.stringify(LANES)};
const DATA = ${JSON.stringify(DATA)}, CAPTIONS = ${JSON.stringify(captions)}, NOTE = ${JSON.stringify(note)};
const ANGLES = ${JSON.stringify(KNOB_ANGLES)}, KNOB = ${JSON.stringify(KNOB)}, DIALS = ${JSON.stringify(DIALS)}, DESK_H = ${DESK_H}, DIAL_MAX = ${DIAL_MAX};
const LF = ${JSON.stringify({ x: 0, y: Y0 - LF.s * M, z: ZC + (LF.z1 - 0.06) * M, r: LF.rIn * M })};
const NF = ${NF}, DT = ${DT};
const stage = document.querySelector(".iso-stage"), svg = stage.querySelector("svg");
const nozEl = svg.querySelector(".je-noz"), doorEl = svg.querySelector(".je-door"), rotorEl = svg.querySelector(".je-lift-rotor"), flow = svg.querySelector(".je-flow");
const pointer = svg.querySelector('[data-part="pointer"]');
const needles = [svg.querySelector('[data-part="needle0"]'), svg.querySelector('[data-part="needle1"]')];
const readout = document.querySelector("[data-readout]"), readoutM = document.querySelector(".je-readout-m"), caption = document.querySelector(".je-caption");
const buttons = [...document.querySelectorAll("[data-year]")];
const still = matchMedia("(prefers-reduced-motion: reduce)");
const lanes = LANES.map((l) => ({ ...l, frames: l.tails ? l.tails.map((t) => l.head.concat(t)) : [l.head] }));
const CLASSES = ["bypass", "core", "hot"], ALPHAS = [1, 0.66, 0.36, 0.14];
const paths = [];
for (const c of CLASSES) for (const a of ALPHAS) { const p = document.createElementNS("http://www.w3.org/2000/svg", "path"); p.setAttribute("class", "je-streak"); p.dataset.flow = c; p.setAttribute("opacity", a); flow.appendChild(p); paths.push(p); }
let target = 2, m = 2, shown = -1, knob = ANGLES[2], spin = 0, liftW = 1, dial = [DATA[2].up, DATA[2].fwd], clock = 0;
let touring = !still.matches, tour = 0, idle = 0, visible = false, frame = 0, last = 0;
const frameOf = (mm) => Math.round(Math.min(1, mm / 2) * (NF - 1));
function particles(t) {
  const out = paths.map(() => "");
  const f = frameOf(m);
  const weight = [1, liftW, liftW];
  lanes.forEach((lane, li) => {
    const w = weight[lane.group];
    if (w < 0.03) return;
    const pts = lane.frames[lane.tails ? f : 0];
    const span = pts.length * DT;
    const n = Math.max(1, Math.round(lane.rate * span * w));
    for (let i = 0; i < n; i++) {
      const u = (t + (i / n) * span + span * ((li * 0.618034) % 1)) % span;
      const h = u / DT, h0 = Math.min(pts.length - 2, Math.floor(h)), hf = h - h0;
      const tl = Math.max(0, h - 2.8), t0 = Math.min(pts.length - 2, Math.floor(tl)), tf = tl - t0;
      const a = pts[h0], b = pts[h0 + 1], c = pts[t0], e = pts[t0 + 1];
      const hx = a[0] + (b[0] - a[0]) * hf, hy = a[1] + (b[1] - a[1]) * hf, tx = c[0] + (e[0] - c[0]) * tf, ty = c[1] + (e[1] - c[1]) * tf;
      const al = a[3] * Math.min(1, w * 1.4);
      if (al < 0.08) continue;
      const ai = al > 0.83 ? 0 : al > 0.5 ? 1 : al > 0.25 ? 2 : 3;
      out[a[2] * 4 + ai] += "M" + tx.toFixed(1) + " " + ty.toFixed(1) + "L" + hx.toFixed(1) + " " + hy.toFixed(1);
    }
  });
  paths.forEach((p, i) => p.setAttribute("d", out[i]));
}
function rotor() {
  let d = "";
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = spin + i * 2 * Math.PI / n;
    const p0 = iso([LF.x + LF.r * 0.3 * Math.cos(a), LF.y + LF.r * 0.3 * Math.sin(a), LF.z], P), p1 = iso([LF.x + LF.r * Math.cos(a + 0.18), LF.y + LF.r * Math.sin(a + 0.18), LF.z], P);
    d += "M" + p0[0].toFixed(1) + " " + p0[1].toFixed(1) + "L" + p1[0].toFixed(1) + " " + p1[1].toFixed(1);
  }
  // обід ротора: кінці лопатей упираються в нього
  const rim = [];
  for (let i = 0; i <= 64; i++) { const a = i / 64 * 2 * Math.PI; rim.push(iso([LF.x + LF.r * Math.cos(a), LF.y + LF.r * Math.sin(a), LF.z], P)); }
  const rimD = rim.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join("");
  rotorEl.innerHTML = solidSvg(cylinder(LF.x, LF.y, LF.r * 0.3, LF.z - 4, 4, P, 40), { tone: "mid" }) + '<path class="iso-line" data-tone="lo" d="' + d + rimD + '"/>';
}
function draw() {
  const f = frameOf(m);
  if (f !== shown) { nozEl.innerHTML = FRAMES[f].noz; doorEl.innerHTML = FRAMES[f].door; shown = f; }
  rotor();
  pointer.setAttribute("d", lineOnTop([KNOB.x - Math.sin(knob) * 1.2, KNOB.y + Math.cos(knob) * 1.2], [KNOB.x + Math.sin(knob) * (KNOB.r - 0.9), KNOB.y - Math.cos(knob) * (KNOB.r - 0.9)], KNOB.z + 0.1, P));
  dial.forEach((v, i) => {
    const a = -0.75 * Math.PI + 1.5 * Math.PI * Math.min(1, v / DIAL_MAX), d = DIALS[i], r = d.r - 2.6, z = DESK_H + 5.15;
    needles[i].setAttribute("d", lineOnTop([d.x - Math.sin(a) * 2, d.y + Math.cos(a) * 2], [d.x + Math.sin(a) * r, d.y - Math.cos(a) * r], z, P));
  });
}
function say() {
  const d = DATA[target];
  readout.textContent = "F-35B · F135-PW-600 · " + d.mode.toLowerCase() + "\\n" + d.line;
  readoutM.textContent = readout.textContent;
  caption.textContent = CAPTIONS[target] + NOTE;
  buttons.forEach((b, i) => b.setAttribute("aria-pressed", String(i === target)));
  stage.setAttribute("aria-valuenow", String(target)); stage.setAttribute("aria-valuetext", readout.textContent);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60; last = now; clock += dt;
  const calm = still.matches;
  if (!touring && !calm) { idle += dt; if (idle > 14) { touring = true; tour = 0; } }
  if (touring) { tour += dt; if (tour > 7) { tour = 0; select((target + 1) % 3, false); } }
  const e = calm ? 1 : 1 - Math.exp(-dt / 0.8);
  m += (target - m) * e;
  if (Math.abs(target - m) < 0.003) m = target;
  knob = calm ? ANGLES[target] : knob + (ANGLES[target] - knob) * (1 - Math.exp(-dt / 0.12));
  liftW += (DATA[target].lift - liftW) * (calm ? 1 : 1 - Math.exp(-dt / 1.2));
  dial = dial.map((v, i) => v + ([DATA[target].up, DATA[target].fwd][i] - v) * (calm ? 1 : 1 - Math.exp(-dt / 0.6)));
  if (!calm) spin += liftW * 9 * dt;
  draw();
  if (!calm) particles(clock); else particles(3.3);
  frame = visible && (!calm || Math.abs(target - m) > 0) ? requestAnimationFrame(tick) : 0;
}
function run() { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } }
function select(i, user) { target = Math.max(0, Math.min(2, i)); if (user) { touring = false; idle = 0; } say(); run(); }
new IntersectionObserver((en) => { visible = en[en.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("click", () => select((target + 1) % 3, true));
stage.addEventListener("keydown", (e) => { let to = null; if (e.key === "ArrowRight" || e.key === "ArrowUp") to = target + 1; if (e.key === "ArrowLeft" || e.key === "ArrowDown") to = target - 1; if (e.key >= "1" && e.key <= "3") to = Number(e.key) - 1; if (to === null) return; e.preventDefault(); select(to, true); });
buttons.forEach((b, i) => b.addEventListener("click", () => select(i, true)));
still.addEventListener("change", () => { touring = !still.matches; run(); });
window.addEventListener("jv-open", () => { touring = false; idle = -1e9; });
window.__viewerOpenCurrent = () => window.__viewer?.open(0, []);
window.__stovl = { select: (i) => select(i, true), get mode() { return target; } };
say(); draw(); particles(3.3);
`;
  return figurePage({
    apps: [stovlApp()],
    n: 6,
    svg,
    hint: "Ручка або ← → · R — 3D",
    stageLabel: "Режим F-35B: стрілки змінюють режим",
    initial: 2,
    valuemax: 2,
    legend,
    intro: "F-35B уміє сідати вертикально, як гелікоптер. Для цього той самий двигун F135 крутить ще й вентилятор у носовій частині літака, а сопло двигуна згинається вниз. Перемкніть ручку: «політ» — звичайний літак, «висіння» — літак стоїть у повітрі на трьох струменях.",
    script,
  });
}
