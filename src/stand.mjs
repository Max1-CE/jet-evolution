// Випробувальний стенд: плита, станина з консолями, силова балка, рухома рама на пружних
// пластинах, тензодатчик тяги й пульт з ручкою року та манометром тяги.
import { k, G, T } from "./kit.mjs";

export const M = 62; // одиниць світу на метр
const Y0 = 150; // площина вентилятора (s = 0)
const ZC = 100; // висота осі
export const W = 920;
export const H = 600;
const AZ = 30;
const EL = 26;

const BASE = { x: -122, y: -150, w: 172, d: 356, r: 9 };
const BASE_H = 12;
const FOOT_H = 10;
const COL = 12;
const COLS = [168, -40]; // y колон
const COL_X = -110;
const ZT = 212; // низ поздовжньої балки
const BEAM_H = 11;
const ZL = 194; // низ рухомої рами
const LIVE_H = 5;
const DESK = { x: 2, y: -104, w: 40, d: 46, r: 3 };
const DESK_H = 24;
export const DIAL = { x: 17, y: -88, r: 10.5, z: DESK_H + 5 };
export const KNOB = { x: 31, y: -68, r: 5.4, z: DESK_H + 4.5 };
export const KNOB_ANGLES = [-62, -21, 21, 62].map((d) => (d * Math.PI) / 180);
export const DIAL_MAX = 200; // кН на повну шкалу (270°)

const P = k.fitProjection(
  [
    ...k.boxCorners(BASE, -BASE_H - FOOT_H, 0),
    [COL_X, COLS[0], ZT + BEAM_H + 2],
    [COL_X, COLS[1], ZT + BEAM_H + 2],
    [8, COLS[0] + 14, ZT + BEAM_H],
    [0, Y0 - 5.6 * M, ZC + 30],
    [0, Y0 + 1.6 * M, ZC - 60],
  ],
  W,
  H,
  { pad: 30, azimuth: AZ, elevation: EL },
);
export const F = G.frameOf([0, Y0, ZC], [0, -1, 0], [1, 0, 0], [0, 0, 1]);
export const STAND = { P, M, F, W, H, ZL, ZC, Y0, DIAL, KNOB, KNOB_ANGLES, DIAL_MAX };

const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(k.pointsAt(pts, P), style);
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function base() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_H - FOOT_H, BASE_H, P)}"/>`);
  const feet = [...k.corners(BASE, 16), [BASE.x + 16, -20], [BASE.x + BASE.w - 16, -20]];
  for (const [x, y] of byDepth(feet)) {
    out.push(S(k.cylinder(x, y, 9, -BASE_H - FOOT_H, 2, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 6.5, -BASE_H - FOOT_H + 2, FOOT_H - 2, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(BASE, -BASE_H, BASE_H, P, 8, 1.4), { tone: "mid", inner: L(k.sideSeam(BASE, -BASE_H + 4, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(BASE, 5), 0, P), { tone: "faint" }));
  out.push(D(k.corners(BASE, 10).map(([x, y]) => [x, y, 0]), { size: 0.55, tone: "mid" }));
  for (const [x, y] of k.corners(BASE, 10)) out.push(L(k.ring(x, y, 2.4, 0, P, 16), { tone: "lo" }));
  // Т-пази плити під кріплення
  for (const x of [-70, -35, 0]) out.push(L(k.planOutline({ x: x - 1.5, y: BASE.y + 14, w: 3, d: BASE.d - 28, r: 1.5 }, 0, P, 3), { tone: "faint" }));
  // лінійка в метрах уздовж передньої кромки: поділка 0,1 м, велика — 0,5 м
  const strip = { x: BASE.x + BASE.w - 12, y: BASE.y + 20, w: 7, d: BASE.d - 40, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(Y0 - 4 * M, Y0 + 0.5 * M, M / 10, 5, strip.x + 0.8, 0.6, [2, 4], P, "y");
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(L(k.lineOnTop([strip.x + 0.8, Y0], [strip.x + 6.2, Y0], 0.6, P), { tone: "hi" }));
  // табличка стенда
  const plate = { x: BASE.x + 12, y: BASE.y + BASE.d - 54, w: 22, d: 34, r: 1.5 };
  out.push(S(k.slabOf(plate, 0, 0.8, P, 3), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(plate, 1.6), 0.8, P, 3), { tone: "faint" }));
  [[6, 24], [10, 18], [14, 26]].forEach(([dx, len]) => out.push(L(k.lineOnTop([plate.x + dx, plate.y + 4], [plate.x + dx, plate.y + 4 + len], 0.8, P), { tone: "lo", free: true })));
  out.push(D([[plate.x + 18, plate.y + 3, 0.8], [plate.x + 18, plate.y + plate.d - 3, 0.8]], { size: 0.45, tone: "mid" }));
  return out.join("");
}

function column(y) {
  const out = [];
  const x = COL_X;
  // опорна плита, косинки, колона, консоль
  out.push(S(k.slabOf({ x: x - 11, y: y - 11, w: 22, d: 22, r: 2 }, 0, 3, P, 3, 0.5), { tone: "mid" }));
  out.push(D([[x - 7.5, y - 7.5, 3], [x + 7.5, y - 7.5, 3], [x - 7.5, y + 7.5, 3], [x + 7.5, y + 7.5, 3]], { size: 0.5, tone: "mid" }));
  out.push(S(k.slabOf({ x: x - COL / 2, y: y - COL / 2, w: COL, d: COL, r: 1 }, 3, ZT - 3, P, 2, 0.6), { tone: "mid", inner: L(k.sideSeam({ x: x - COL / 2, y: y - COL / 2, w: COL, d: COL, r: 1 }, ZT - 40, P, 2), { tone: "faint" }) }));
  out.push(S(k.slabOf({ x: x + COL / 2, y: y - 1, w: 9, d: 2, r: 0.4 }, 3, 18, P, 1), { tone: "mid" }));
  // консоль до поздовжньої балки
  out.push(S(k.slabOf({ x: x - COL / 2, y: y - 6, w: -x + COL / 2 + 9, d: 12, r: 1 }, ZT - 12, 12, P, 2, 0.6), { tone: "mid" }));
  out.push(D([[2, y - 3, ZT], [2, y + 3, ZT], [-4, y - 3, ZT], [-4, y + 3, ZT]], { size: 0.45, tone: "mid" }));
  return out.join("");
}

function frame() {
  const out = [];
  // поздовжня балка
  const beam = { x: -9, y: COLS[1] - 8, w: 18, d: COLS[0] - COLS[1] + 16, r: 1.5 };
  out.push(S(k.slabOf(beam, ZT, BEAM_H, P, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(beam, ZT + 4, P, 3), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(beam, 3), ZT + BEAM_H, P, 3), { tone: "faint" }));
  for (const y of COLS) out.push(D([[-5, y - 4, ZT + BEAM_H], [-5, y + 4, ZT + BEAM_H], [5, y - 4, ZT + BEAM_H], [5, y + 4, ZT + BEAM_H]], { size: 0.5, tone: "mid" }));
  // пружні пластини (підвіска рухомої рами)
  for (const y of [-2, 130]) {
    out.push(S(k.slabOf({ x: -10, y: y - 2.5, w: 12, d: 5, r: 0.6 }, ZT - 3, 3, P, 2), { tone: "mid" }));
    out.push(S(k.slabOf({ x: -8, y: y - 0.6, w: 8, d: 1.2, r: 0.2 }, ZL + LIVE_H, ZT - 3 - ZL - LIVE_H, P, 1), { tone: "hi" }));
  }
  // рухома рама
  const live = { x: -11, y: -10, w: 14, d: 152, r: 1.5 };
  out.push(S(k.slabOf(live, ZL, LIVE_H, P, 3, 0.6), { tone: "hi", inner: L(k.sideSeam(live, ZL + 2.5, P, 3), { tone: "faint" }) }));
  out.push(D([[-4, -6, ZL + LIVE_H], [-4, 138, ZL + LIVE_H]], { size: 0.5, tone: "mid" }));
  // кронштейн датчика і тензодатчик тяги (вісь уздовж y)
  out.push(S(k.slabOf({ x: -9, y: 154, w: 10, d: 6, r: 0.8 }, ZL - 4, ZT - ZL + 4, P, 2, 0.4), { tone: "mid" }));
  const cell = G.frameOf([-4, 142, ZL + 2.5], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  out.push(S(G.disc(0, 3, 2.2, cell, P), { tone: "mid" }));
  out.push(S(G.disc(3, 9, 4.2, cell, P), { tone: "hi", inner: L(G.arcOf(cell, 6, 4.2, P), { tone: "faint" }) }));
  out.push(S(G.disc(9, 12, 2.2, cell, P), { tone: "mid" }));
  return out.join("");
}

export function stand() {
  return [base(), column(COLS[0]), column(COLS[1]), frame(), cable()].join("");
}

// кабель датчика: уздовж балки, вниз по колоні, по плиті до пульта
function cable() {
  const r = 0.8;
  const route = G.fillet([
    [-4, 154, ZL - 4],
    [-4, 154, ZL - 10],
    [-14, 154, ZL - 10],
    [-14, COLS[1] + 9, ZL - 10],
    [COL_X + 7, COLS[1] + 9, ZL - 10],
    [COL_X + 7, COLS[1] + 9, 1],
    [COL_X + 7, DESK.y - 4, 1],
    [DESK.x + 20, DESK.y - 4, 1],
    [DESK.x + 20, DESK.y - 0.2, 1],
  ], 4, 8);
  const pieces = T.tubePieces(route, r, P, { maxLength: 400 });
  const ends = [k.iso(route[0], P), k.iso(route[route.length - 1], P)];
  return pieces.map((piece) => T.tubeSvg(piece, { tone: "mid" })).join("") + k.dotsSvg(ends, { size: 1.1, tone: "mid" });
}

/** Пульт: ручка року (перемикач на 4 положення) і стрілочний індикатор тяги. */
export function console() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(DESK, 0, DESK_H, P)}"/>`);
  out.push(S(k.slabOf(DESK, 0, DESK_H, P, 4, 1), { tone: "mid", inner: L(k.sideSeam(DESK, 6, P, 4), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(DESK, 3), DESK_H, P, 4), { tone: "faint" }));
  out.push(D(k.corners(DESK, 5.5).map(([x, y]) => [x, y, DESK_H]), { size: 0.45, tone: "mid" }));
  // індикатор тяги, лицем догори
  const { x, y, r, z } = DIAL;
  out.push(S(k.cylinder(x, y, r + 1.5, DESK_H, 2, P, 48), { tone: "lo" }));
  out.push(S(k.cylinder(x, y, r, DESK_H + 2, z - DESK_H - 2, P, 64, 0.6), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, y, r, z - 2.4, z, 70, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(x, y, r, z - 2.4, P, 40), { tone: "faint" }));
  out.push(L(k.ring(x, y, r - 1.8, z, P, 64), { tone: "lo" }));
  const span = 1.5 * Math.PI;
  const from = -0.75 * Math.PI;
  const ticks = k.radialTicks(x, y, r - 2.4, 20, 5, z, [1.1, 2.4], P, from, span + span / 20);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.ring(x, y, 1.2, z, P, 16), { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([x - 2.4, y + 5.5], z, P, "x"), "кН", { size: 2.2, tone: "lo" }));
  // ручка року: основа з позначками фіксованих положень
  const kn = KNOB;
  out.push(S(k.cylinder(kn.x, kn.y, kn.r + 3.2, DESK_H, 1.2, P, 40), { tone: "lo" }));
  KNOB_ANGLES.forEach((a) => {
    const c = [kn.x + Math.sin(a) * (kn.r + 1.4), kn.y - Math.cos(a) * (kn.r + 1.4)];
    const e = [kn.x + Math.sin(a) * (kn.r + 3), kn.y - Math.cos(a) * (kn.r + 3)];
    out.push(L(k.lineOnTop(c, e, DESK_H + 1.2, P), { tone: "mid" }));
  });
  out.push(`<g class="je-knob" data-part="knob">`);
  out.push(S(k.cylinder(kn.x, kn.y, kn.r, DESK_H + 1.2, kn.z - DESK_H - 1.2, P, 40, 0.5), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(kn.x, kn.y, kn.r, DESK_H + 1.6, kn.z - 0.4, 30, P), { tone: "lo" }));
  out.push(`</g>`);
  out.push(`<path class="iso-line" data-tone="lit" data-part="pointer" data-free="start" style="stroke-width:1.2" d=""/>`);
  out.push(`<path class="iso-line" data-tone="lit" data-part="needle" data-free="start" style="stroke-width:1" d=""/>`);
  out.push(L(k.ring(x, y, 0.7, z + 0.2, P, 12), { tone: "hi" }));
  return out.join("");
}
