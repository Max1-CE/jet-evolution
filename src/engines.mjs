// SPDX-FileCopyrightText: 2026 Max Kravchenko
// SPDX-License-Identifier: MIT

// Меридіональна геометрія чотирьох двигунів, у метрах, s — уздовж осі від передньої
// площини вентилятора (компресора), r — від осі. Усі в одному масштабі.
// Кожна деталь — замкнений багатокутник [s, r] (r ≥ 0) і тип:
//   case — нерухомі корпуси й обтічники, rotor — диски, барабани, вали, кок,
//   blade — робоча лопатка, vane — спрямний апарат / стійка, liner — жарова труба,
//   gear — редуктор, hot — гарячі деталі сопла.
// Ряди лопаток (rows) описують і перерізи в площині розрізу, і лопатки задньої половини.

import { ENGINES } from "./model.mjs";

const lerp = (a, b, t) => a + (b - a) * t;
/** Лінійна інтерполяція по таблиці [[s, r], ...]. */
export function table(points) {
  return (s) => {
    if (s <= points[0][0]) return points[0][1];
    for (let i = 1; i < points.length; i++) {
      if (s <= points[i][0]) {
        const [s0, r0] = points[i - 1];
        const [s1, r1] = points[i];
        return lerp(r0, r1, (s - s0) / (s1 - s0));
      }
    }
    return points[points.length - 1][1];
  };
}
const sample = (f, s0, s1, n = 12) => Array.from({ length: n + 1 }, (_, i) => {
  const s = lerp(s0, s1, i / n);
  return [s, f(s)];
});
/** Оболонка між двома кривими: зовнішня вперед, внутрішня назад. */
const shell = (outer, inner, s0, s1, n = 12) => [...sample(outer, s0, s1, n), ...sample(inner, s0, s1, n).reverse()];
/** Прямокутник у меридіані. */
const box = (s0, s1, r0, r1) => [[s0, r0], [s1, r0], [s1, r1], [s0, r1]];
/** Округлена губа: дуга від внутрішньої до зовнішньої кривої. */
function lipped(outer, inner, s0, s1, { n = 14, lip = 0.03, tail = 0 } = {}) {
  const ro = outer(s0 + lip);
  const ri = inner(s0 + lip);
  const mid = (ro + ri) / 2;
  const half = (ro - ri) / 2;
  const arc = Array.from({ length: 9 }, (_, i) => {
    const a = Math.PI / 2 + (Math.PI * i) / 8;
    return [s0 + lip + Math.cos(a) * lip, mid + Math.sin(a) * half];
  });
  const out = sample(outer, s0 + lip, s1, n);
  const inn = sample(inner, s0 + lip, s1 - tail, n).reverse();
  return [...out, ...(tail ? [[s1, inner(s1)]] : []), ...inn, ...arc.reverse().slice(1, -1)];
}

/** Робоча лопатка або лопатка апарата в площині розрізу: трапеція з хордою, що міняється по висоті. */
function bladeAt(row, hub, tip) {
  const { s, chord, kind } = row;
  const tipChord = row.tipChord ?? chord;
  const lean = row.lean ?? 0;
  const gap = kind === "blade" ? 0.006 : 0;
  const r0 = hub(s + chord / 2) + (kind === "vane" ? 0.004 : 0);
  const r1 = tip(s + chord / 2) - gap;
  const poly = [
    [s, r0],
    [s + chord, r0],
    [s + tipChord + lean, r1],
    [s + lean, r1],
  ];
  return { poly, r0, r1 };
}

// --- двигуни -----------------------------------------------------------------

function jumo() {
  // Jumo 004B: кок зі стартером Ріделя, 8-ступінчастий осьовий компресор,
  // шість трубчастих камер, одна ступінь турбіни, сопло з рухомим конусом («цибулина»).
  const skinOut = table([[-0.52, 0.31], [-0.4, 0.36], [-0.1, 0.38], [2.15, 0.38], [2.45, 0.33], [3.3, 0.235]]);
  const skinIn = table([[-0.52, 0.31], [-0.4, 0.31], [-0.1, 0.305], [0.0, 0.3], [0.92, 0.27], [0.98, 0.3], [1.0, 0.35], [2.1, 0.35], [2.3, 0.3], [3.3, 0.22]]);
  const caseIn = table([[-0.52, 0.31], [-0.4, 0.305], [-0.1, 0.3], [0.0, 0.3], [0.92, 0.27], [1.0, 0.27]]);
  const hub = table([[-0.6, 0.0], [-0.45, 0.13], [-0.25, 0.18], [0.0, 0.19], [0.92, 0.215], [1.0, 0.2]]);
  const ro = table([[-0.3, 0.3], [0.0, 0.3], [0.92, 0.27], [1.0, 0.27], [1.85, 0.3], [2.05, 0.31], [3.3, 0.22]]);
  const ri = table([[-0.3, 0.17], [0.0, 0.19], [0.92, 0.215], [1.0, 0.2], [1.8, 0.2], [1.85, 0.2], [2.05, 0.2], [2.2, 0.17], [2.7, 0.15], [3.05, 0.1], [3.25, 0.0]]);
  const parts = [];
  parts.push({ id: "skin", kind: "case", poly: lipped(skinOut, skinIn, -0.55, 3.3, { n: 30, lip: 0.035 }) });
  // кок (обтічник стартера) і барабан компресора
  parts.push({ id: "nose", kind: "rotor", poly: [[-0.62, 0], ...sample(table([[-0.62, 0.0], [-0.58, 0.07], [-0.5, 0.12], [-0.38, 0.16], [-0.2, 0.18], [0.0, 0.185]]), -0.62, 0.0, 10).slice(1), [0.0, 0.03], [-0.62, 0.0]] });
  parts.push({ id: "drum", kind: "rotor", poly: [[0.0, 0.03], ...sample(table([[0.0, 0.185], [0.92, 0.21]]), 0.0, 0.92, 4), [0.92, 0.03]] });
  parts.push({ id: "shaft", kind: "rotor", poly: box(0.0, 1.95, 0.0, 0.04) });
  // камери згоряння: зовнішній і внутрішній корпус, дві трубчасті камери в площині розрізу
  parts.push({ id: "comb-inner", kind: "case", poly: box(0.98, 1.84, 0.05, 0.085) });
  parts.push({ id: "comb-cone", kind: "case", poly: [[0.92, 0.2], [1.0, 0.2], [1.0, 0.085], [0.98, 0.085], [0.92, 0.17]] });
  parts.push({ id: "can", kind: "liner", poly: shell(table([[1.02, 0.25], [1.1, 0.33], [1.7, 0.33], [1.8, 0.3]]), table([[1.02, 0.235], [1.1, 0.12], [1.7, 0.12], [1.8, 0.2]]), 1.02, 1.8, 10) });
  // турбіна: диск
  parts.push({ id: "tdisc", kind: "rotor", poly: [[1.88, 0.03], [1.88, 0.18], [1.92, 0.2], [1.97, 0.2], [2.0, 0.18], [2.0, 0.03]] });
  parts.push({ id: "tail-hub", kind: "case", poly: [[2.04, 0.0], [2.04, 0.2], ...sample(ri, 2.05, 3.2, 12).slice(1), [3.25, 0.0]] });
  // корпус турбіни: зовнішнє кільце соплового апарата
  parts.push({ id: "turbine-case", kind: "case", poly: box(1.8, 2.08, 0.3, 0.35) });
  // «цибулина» — регульований конус сопла
  parts.push({ id: "zwiebel", kind: "hot", poly: [[2.75, 0.0], ...sample(table([[2.75, 0.06], [2.95, 0.135], [3.15, 0.12], [3.38, 0.0]]), 2.75, 3.38, 10).slice(0, -1), [3.38, 0.0]] });
  parts.push({ id: "zwiebel-rod", kind: "case", poly: box(2.3, 2.75, 0.0, 0.025) });
  // фланці корпусу
  for (const s of [0.94, 2.08]) parts.push({ id: `flange${s}`, kind: "case", poly: box(s, s + 0.04, 0.38, 0.4) });
  const rows = [];
  for (let i = 0; i < 8; i++) {
    const s = 0.04 + i * 0.112;
    rows.push({ kind: "blade", s, chord: 0.05, count: 27 - i, spool: "hp" });
    rows.push({ kind: "vane", s: s + 0.062, chord: 0.038, count: 30 - i });
  }
  rows.push({ kind: "vane", s: -0.3, chord: 0.12, count: 6, strut: true });
  rows.push({ kind: "vane", s: 1.84, chord: 0.035, count: 36 });
  rows.push({ kind: "blade", s: 1.925, chord: 0.04, count: 61, spool: "hp", hot: true });
  return { parts, rows, ro, ri, core: [-0.5, 3.3], bypass: null, hubFan: null, fuel: [1.06, 0.28], burner: [1.1, 1.75], hpc: [0.0, 0.92], hpt: [1.84, 2.0], lpt: null, nozzle: [2.1, 3.3], jetR: 0.22 };
}

function fanEngine(spec) {
  const parts = [];
  const rows = [];
  const { R, hubR, fan, split, ro, ri, cowlOut, cowlIn, coreOut, coreEnd, plugEnd, fanEnd, nacOut, nacIn, mixed } = spec;
  // гондола: обичайка вентилятора й капот, на стенді — з лемніскатним колектором попереду
  parts.push({ id: "nacelle", kind: "case", poly: lipped(nacOut, nacIn, spec.lip, fanEnd, { n: 28, lip: 0.04 }) });
  // кок
  parts.push({ id: "spinner", kind: "rotor", poly: [[spec.spinner[0], 0], ...sample(table([[spec.spinner[0], 0.0], [spec.spinner[0] + 0.04, hubR * 0.32], [spec.spinner[0] + 0.15, hubR * 0.66], [spec.spinner[1] - 0.05, hubR * 0.95], [spec.spinner[1], hubR]]), spec.spinner[0], spec.spinner[1], 10).slice(1), [spec.spinner[1], 0.05]] });
  // диск вентилятора
  parts.push({ id: "fan-disc", kind: "rotor", poly: spec.fanHub ? [[fan[0], 0.05], ...sample(spec.fanHub, fan[0], fan[1], 6).map(([s, r]) => [s, r - 0.004]), [fan[1], 0.05]] : [[fan[0], 0.05], [fan[0], hubR], [fan[1], hubR * 1.02], [fan[1], 0.05]] });
  // розділювач потоків і капот ядра (зовнішня стінка зовнішнього контуру зсередини)
  parts.push({ id: "splitter", kind: "case", poly: lipped(cowlOut, cowlIn, split, coreEnd, { n: 30, lip: 0.02 }) });
  // вали: НТ (тонкий, довгий) і ВТ (трубчастий)
  parts.push({ id: "lp-shaft", kind: "rotor", poly: box(fan[0], spec.lpt[1] + 0.05, 0.0, 0.035) });
  parts.push({ id: "hp-shaft", kind: "rotor", poly: box(spec.hpc[0], spec.hpt[1], 0.05, 0.075) });
  // барабани компресорів
  if (spec.lpc) parts.push({ id: "lpc-drum", kind: "rotor", poly: [[spec.lpc[0], 0.04], ...sample(ri, spec.lpc[0], spec.lpc[1], 4).map(([s, r]) => [s, r - 0.004]), [spec.lpc[1], 0.04]] });
  parts.push({ id: "hpc-drum", kind: "rotor", poly: [[spec.hpc[0], 0.078], ...sample(ri, spec.hpc[0], spec.hpc[1], 6).map(([s, r]) => [s, r - 0.004]), [spec.hpc[1], 0.078]] });
  // проміжний корпус (між КНТ і КВТ)
  if (spec.lpc) parts.push({ id: "int-case", kind: "case", poly: [[spec.lpc[1], ri(spec.lpc[1]) - 0.004], [spec.hpc[0], ri(spec.hpc[0]) - 0.004], [spec.hpc[0], 0.09], [spec.lpc[1] + 0.03, 0.09]] });
  // камера згоряння: дифузор, внутрішній корпус, жарова труба
  const b = spec.burner;
  parts.push({ id: "comb-inner", kind: "case", poly: [[spec.hpc[1], ri(spec.hpc[1]) - 0.004], [b[0], spec.combIn + 0.02], [b[1], spec.combIn + 0.02], [spec.hpt[0], ri(spec.hpt[0]) - 0.004], [spec.hpt[0], spec.combIn], [spec.hpc[1], spec.combIn]] });
  const lo = ri(spec.hpc[1]) - 0.004;
  const hiR = ro(spec.hpc[1]);
  const midR = (lo + hiR) / 2;
  parts.push({ id: "liner", kind: "liner", poly: shell(table([[b[0] + 0.04, midR + 0.02], [b[0] + 0.12, spec.combOut - 0.03], [b[1] - 0.06, spec.combOut - 0.03], [b[1], ro(spec.hpt[0]) - 0.005]]), table([[b[0] + 0.04, midR - 0.02], [b[0] + 0.12, spec.combIn + 0.05], [b[1] - 0.06, spec.combIn + 0.05], [b[1], ri(spec.hpt[0]) + 0.005]]), b[0] + 0.04, b[1], 12) });
  // диски турбін
  const discs = [];
  for (let i = 0; i < spec.hptN; i++) discs.push({ s: lerp(spec.hpt[0] + 0.05, spec.hpt[1] - 0.04, spec.hptN > 1 ? i / (spec.hptN - 1) : 0.5), r0: 0.078, spool: "hp" });
  for (let i = 0; i < spec.lptN; i++) discs.push({ s: lerp(spec.lpt[0] + 0.05, spec.lpt[1] - 0.04, spec.lptN > 1 ? i / (spec.lptN - 1) : 0.5), r0: 0.04, spool: "lp" });
  discs.forEach((d, i) => {
    const top = ri(d.s) - 0.006;
    parts.push({ id: `tdisc${i}`, kind: "rotor", poly: [[d.s - 0.018, d.r0], [d.s - 0.018, top * 0.55], [d.s - 0.03, top], [d.s + 0.03, top], [d.s + 0.018, top * 0.55], [d.s + 0.018, d.r0]] });
  });
  // корпус турбіни (задня опора) і хвостовий конус
  parts.push({ id: "tail", kind: "case", poly: [[spec.lpt[1], 0.04], [spec.lpt[1], ri(spec.lpt[1])], ...sample(ri, spec.lpt[1] + 0.01, plugEnd, 14).slice(1), [plugEnd, 0.0], [spec.lpt[1] + 0.12, 0.0], [spec.lpt[1] + 0.12, 0.04]] });
  // корпус газогенератора: внутрішня стінка капота = зовнішня стінка проточної частини ядра
  parts.push({ id: "core-case", kind: "case", poly: [...sample(coreOut, (spec.lpc ?? [split])[0] + 0.04, spec.coreEnd2, 30), ...sample(ro, (spec.lpc ?? [split])[0] + 0.04, spec.coreEnd2, 30).reverse()] });
  // редуктор (тільки для GTF): сонячна шестерня, сателіти, епіцикл
  if (spec.gear) {
    const [g0, g1] = spec.gear;
    parts.push({ id: "gear-case", kind: "case", poly: [[g0 - 0.02, 0.26], [g1 + 0.02, 0.26], [g1 + 0.02, 0.29], [g0 - 0.02, 0.29]] });
    parts.push({ id: "ring-gear", kind: "gear", poly: box(g0, g1, 0.215, 0.255) });
    parts.push({ id: "planet", kind: "gear", poly: box(g0 + 0.01, g1 - 0.01, 0.105, 0.21), planet: true });
    parts.push({ id: "sun", kind: "gear", poly: box(g0 + 0.005, g1 - 0.005, 0.04, 0.1) });
    parts.push({ id: "carrier", kind: "rotor", poly: [[fan[1], 0.05], [fan[1], 0.24], [g0 - 0.005, 0.24], [g0 - 0.005, 0.05]] });
  }
  // опорні стійки й фланці
  for (const s of spec.flanges) parts.push({ id: `flange${s}`, kind: "case", poly: box(s, s + 0.03, cowlIn(s + 0.015) - 0.03, cowlIn(s + 0.015) + 0.002) });
  // ряди лопаток
  const lpcN = spec.lpc ? spec.lpcN : 0;
  const hpcN = spec.hpcN;
  spec.fanRows.forEach((f) => rows.push({ ...f, spool: "lp", fan: true }));
  rows.push({ kind: "vane", s: spec.ogv[0], chord: spec.ogv[1], count: spec.ogvN, bypass: true });
  for (let i = 0; i < lpcN; i++) {
    const s = lerp(spec.lpc[0] + 0.05, spec.lpc[1] - 0.06, lpcN > 1 ? i / (lpcN - 1) : 0.5);
    rows.push({ kind: "blade", s, chord: 0.04, count: 50, spool: "lp" });
    rows.push({ kind: "vane", s: s + 0.048, chord: 0.03, count: 60 });
  }
  for (let i = 0; i < hpcN; i++) {
    const s = lerp(spec.hpc[0] + 0.02, spec.hpc[1] - 0.05, hpcN > 1 ? i / (hpcN - 1) : 0.5);
    const step = (spec.hpc[1] - spec.hpc[0] - 0.07) / Math.max(1, hpcN - 1);
    rows.push({ kind: "blade", s, chord: step * 0.45, count: 56 + i * 2, spool: "hp" });
    rows.push({ kind: "vane", s: s + step * 0.53, chord: step * 0.36, count: 70 + i * 2 });
  }
  discs.forEach((d, i) => {
    rows.push({ kind: "vane", s: d.s - 0.052, chord: 0.026, count: 50, hot: true });
    rows.push({ kind: "blade", s: d.s - 0.018, chord: 0.036, count: 70 + i * 6, spool: d.spool, hot: true });
  });
  return { parts, rows, ro, ri, core: [split, spec.coreEnd2], bypass: { out: nacIn, in: cowlOut, s0: split, s1: fanEnd }, mixed, fuel: [b[0] + 0.03, midR], burner: [b[0] + 0.1, b[1] - 0.04], hpc: spec.hpc, lpc: spec.lpc, hpt: spec.hpt, lpt: spec.lpt, nozzle: [spec.lpt[1], spec.coreEnd2], fanS: fan, R, hubR, fanHub: spec.fanHub, fanTip: spec.fanTip, jetR: ro(spec.coreEnd2), fanJet: [cowlOut(fanEnd), nacIn(fanEnd)] };
}

function jt8d() {
  // JT8D-7: двоступінчастий вентилятор, повний канал зовнішнього контуру, змішування в спільному соплі.
  const R = 0.515;
  const hubR = 0.25;
  const fan = [0.0, 0.36];
  const ro = table([[0.4, 0.4], [0.86, 0.36], [0.93, 0.34], [1.5, 0.275], [1.56, 0.33], [2.06, 0.33], [2.1, 0.29], [2.22, 0.3], [2.62, 0.37], [2.8, 0.37], [3.0, 0.355]]);
  const ri = table([[0.4, 0.27], [0.86, 0.28], [0.93, 0.225], [1.5, 0.238], [1.56, 0.16], [2.06, 0.16], [2.1, 0.222], [2.22, 0.222], [2.62, 0.235], [2.8, 0.2], [3.1, 0.12], [3.25, 0.0]]);
  const nacOut = table([[-0.44, 0.52], [-0.3, 0.56], [0.2, 0.575], [2.6, 0.56], [3.45, 0.43]]);
  const nacIn = table([[-0.44, 0.52], [-0.3, 0.535], [-0.1, 0.52], [0.4, 0.518], [2.7, 0.47], [3.0, 0.43], [3.45, 0.38]]);
  const cowlOut = table([[0.4, 0.4], [0.5, 0.415], [2.4, 0.43], [2.85, 0.39], [3.0, 0.365]]);
  const cowlIn = table([[0.4, 0.4], [0.5, 0.405], [0.86, 0.395], [1.5, 0.39], [2.5, 0.405], [2.85, 0.38], [3.0, 0.36]]);
  const coreOut = table([[0.4, 0.4], [0.86, 0.375], [0.93, 0.355], [1.5, 0.29], [1.56, 0.355], [2.06, 0.355], [2.1, 0.31], [2.62, 0.385], [2.8, 0.385], [3.0, 0.36]]);
  return fanEngine({
    R, hubR, fan, split: 0.4, lip: -0.47, spinner: [-0.18, 0.0], ro, ri, nacOut, nacIn, cowlOut, cowlIn, coreOut,
    coreEnd: 3.0, coreEnd2: 3.0, fanEnd: 3.45, plugEnd: 3.25, mixed: true,
    lpc: [0.42, 0.86], lpcN: 4, hpc: [0.93, 1.5], hpcN: 7, burner: [1.56, 2.06], combIn: 0.16, combOut: 0.33,
    hpt: [2.1, 2.22], hptN: 1, lpt: [2.22, 2.62], lptN: 3, flanges: [0.9, 1.53, 2.08],
    fanRows: [
      { kind: "blade", s: 0.0, chord: 0.11, tipChord: 0.1, count: 27, lean: 0.01, shroud: 0.6 },
      { kind: "vane", s: 0.14, chord: 0.07, count: 40 },
      { kind: "blade", s: 0.24, chord: 0.1, tipChord: 0.09, count: 32, lean: 0.005 },
    ],
    ogv: [0.42, 0.08], ogvN: 40,
  });
}

function jt9d() {
  // JT9D-3A: перший двигун із великою двоконтурністю для широкофюзеляжного літака (Boeing 747).
  const R = 1.17;
  const hubR = 0.42;
  const fan = [0.0, 0.5];
  const ro = table([[0.6, 0.6], [1.08, 0.56], [1.15, 0.52], [2.05, 0.4], [2.1, 0.47], [2.5, 0.47], [2.55, 0.42], [2.75, 0.46], [3.25, 0.6], [3.35, 0.6], [3.62, 0.52]]);
  const ri = table([[0.6, 0.46], [1.08, 0.47], [1.15, 0.33], [2.05, 0.35], [2.1, 0.24], [2.5, 0.24], [2.55, 0.34], [2.75, 0.34], [3.25, 0.37], [3.35, 0.36], [3.62, 0.3], [3.95, 0.08], [4.0, 0.0]]);
  const nacOut = table([[-0.62, 1.19], [-0.5, 1.27], [0.1, 1.3], [0.9, 1.29], [1.75, 1.12]]);
  const nacIn = table([[-0.62, 1.19], [-0.5, 1.2], [-0.2, 1.18], [0.55, 1.175], [1.0, 1.12], [1.75, 1.0]]);
  const cowlOut = table([[0.55, 0.6], [0.7, 0.66], [1.3, 0.8], [1.9, 0.82], [2.7, 0.76], [3.62, 0.62]]);
  const cowlIn = table([[0.55, 0.6], [0.7, 0.62], [1.1, 0.6], [1.6, 0.58], [2.7, 0.66], [3.62, 0.6]]);
  const coreOut = table([[0.6, 0.6], [1.08, 0.58], [1.15, 0.55], [2.05, 0.43], [2.1, 0.5], [2.5, 0.5], [2.55, 0.45], [2.75, 0.49], [3.25, 0.63], [3.35, 0.63], [3.62, 0.6]]);
  return fanEngine({
    R, hubR, fan, split: 0.55, lip: -0.65, spinner: [-0.42, 0.0], ro, ri, nacOut, nacIn, cowlOut, cowlIn, coreOut,
    coreEnd: 3.62, coreEnd2: 3.62, fanEnd: 1.75, plugEnd: 4.0, mixed: false,
    lpc: [0.6, 1.08], lpcN: 3, hpc: [1.15, 2.05], hpcN: 11, burner: [2.1, 2.5], combIn: 0.24, combOut: 0.47,
    hpt: [2.55, 2.75], hptN: 2, lpt: [2.75, 3.25], lptN: 4, flanges: [1.12, 2.08, 2.52, 3.28],
    fanRows: [{ kind: "blade", s: 0.0, chord: 0.36, tipChord: 0.3, count: 46, lean: 0.06, shroud: 0.62 }],
    ogv: [0.86, 0.16], ogvN: 60,
  });
}

function gtf() {
  // PW1100G-JM: вентилятор через планетарний редуктор ≈3:1, швидкий КНТ і ТНТ, мале ядро.
  const R = 1.03;
  const hubR = 0.3;
  const fan = [0.0, 0.52];
  const ro = table([[0.62, 0.42], [0.98, 0.37], [1.06, 0.34], [1.62, 0.27], [1.67, 0.34], [1.97, 0.34], [2.02, 0.29], [2.2, 0.31], [2.6, 0.4], [2.68, 0.4], [2.95, 0.34]]);
  const ri = table([[0.62, 0.3], [0.98, 0.31], [1.06, 0.225], [1.62, 0.235], [1.67, 0.15], [1.97, 0.15], [2.02, 0.23], [2.2, 0.23], [2.6, 0.25], [2.68, 0.245], [2.95, 0.2], [3.25, 0.05], [3.3, 0.0]]);
  const nacOut = table([[-0.42, 1.06], [-0.3, 1.11], [0.2, 1.135], [1.2, 1.1], [2.15, 0.86]]);
  const nacIn = table([[-0.42, 1.06], [-0.3, 1.065], [-0.1, 1.04], [0.6, 1.035], [1.3, 0.96], [2.15, 0.8]]);
  const cowlOut = table([[0.6, 0.42], [0.75, 0.47], [1.4, 0.6], [2.0, 0.6], [2.6, 0.52], [2.95, 0.43]]);
  const cowlIn = table([[0.6, 0.42], [0.75, 0.43], [1.1, 0.42], [1.6, 0.42], [2.6, 0.48], [2.95, 0.41]]);
  const coreOut = table([[0.62, 0.42], [0.98, 0.39], [1.06, 0.37], [1.62, 0.3], [1.67, 0.37], [1.97, 0.37], [2.02, 0.32], [2.2, 0.34], [2.6, 0.43], [2.68, 0.43], [2.95, 0.4]]);
  return fanEngine({
    R, hubR, fan, split: 0.6, lip: -0.45, spinner: [-0.3, 0.0], ro, ri, nacOut, nacIn, cowlOut, cowlIn, coreOut,
    coreEnd: 2.95, coreEnd2: 2.95, fanEnd: 2.15, plugEnd: 3.3, mixed: false,
    lpc: [0.64, 0.98], lpcN: 3, hpc: [1.06, 1.62], hpcN: 8, burner: [1.67, 1.97], combIn: 0.15, combOut: 0.34,
    hpt: [2.02, 2.2], hptN: 2, lpt: [2.2, 2.6], lptN: 3, flanges: [1.03, 1.64, 2.0, 2.63],
    gear: [0.6, 0.86],
    fanRows: [{ kind: "blade", s: 0.0, chord: 0.42, tipChord: 0.34, count: 20, lean: 0.09 }],
    ogv: [0.9, 0.18], ogvN: 40,
  });
}

function f135() {
  // F135-PW-100: триступінчастий вентилятор без підпірних ступенів, 6 ступенів КВТ, 1 ступінь ТВТ, 2 ступені ТНТ.
  // Потоки змішуються за турбіною, далі — форсажна камера й регульоване надзвукове сопло. ∅ 1,17 м, довжина 5,59 м.
  const R = 0.545;
  const hubR = 0.19;
  const fan = [0.0, 0.55];
  const ro = table([[0.62, 0.4], [0.7, 0.39], [1.4, 0.335], [1.45, 0.375], [1.85, 0.375], [1.88, 0.345], [2.0, 0.35], [2.32, 0.4], [2.55, 0.4]]);
  const ri = table([[0.62, 0.31], [0.7, 0.29], [1.4, 0.3], [1.45, 0.2], [1.85, 0.2], [1.88, 0.29], [2.0, 0.285], [2.32, 0.27], [2.55, 0.22], [2.85, 0.08], [2.95, 0.0]]);
  const nacOut = table([[-0.2, 0.565], [-0.1, 0.585], [2.55, 0.585]]);
  const nacIn = table([[-0.2, 0.565], [-0.12, 0.549], [0.0, 0.545], [0.62, 0.505], [0.9, 0.505], [2.3, 0.51], [2.55, 0.5]]);
  const cowlOut = table([[0.62, 0.41], [0.75, 0.43], [1.4, 0.44], [2.3, 0.44], [2.55, 0.415]]);
  const cowlIn = table([[0.62, 0.41], [0.75, 0.415], [1.4, 0.425], [2.3, 0.425], [2.55, 0.405]]);
  const coreOut = table([[0.62, 0.41], [0.7, 0.4], [1.4, 0.35], [1.45, 0.39], [1.85, 0.39], [1.88, 0.36], [2.0, 0.365], [2.32, 0.41], [2.55, 0.405]]);
  const g = fanEngine({
    R, hubR, fan, split: 0.62, lip: -0.2, spinner: [-0.3, 0.0], ro, ri, nacOut, nacIn, cowlOut, cowlIn, coreOut,
    fanHub: table([[0.0, 0.19], [0.55, 0.3], [0.62, 0.31]]), fanTip: table([[0.0, 0.545], [0.62, 0.505]]),
    coreEnd: 2.55, coreEnd2: 2.55, fanEnd: 2.55, plugEnd: 2.95, mixed: true,
    lpc: null, lpcN: 0, hpc: [0.7, 1.4], hpcN: 6, burner: [1.45, 1.85], combIn: 0.2, combOut: 0.375,
    hpt: [1.88, 2.0], hptN: 1, lpt: [2.0, 2.32], lptN: 2, flanges: [0.66, 1.42, 1.86, 2.34],
    fanRows: [
      { kind: "blade", s: 0.0, chord: 0.13, tipChord: 0.11, count: 22, lean: 0.02 },
      { kind: "vane", s: 0.165, chord: 0.055, count: 34 },
      { kind: "blade", s: 0.25, chord: 0.1, tipChord: 0.09, count: 34, lean: 0.01 },
      { kind: "vane", s: 0.38, chord: 0.045, count: 44 },
      { kind: "blade", s: 0.45, chord: 0.08, tipChord: 0.07, count: 42 },
    ],
    ogv: [0.72, 0.07], ogvN: 40,
  });
  // форсажна камера: корпус, антивібраційний екран, колектори форсунок, V-подібні стабілізатори полумʼя
  const wall = table([[2.55, 0.5], [2.85, 0.462], [4.7, 0.462], [4.75, 0.46], [5.05, 0.355], [5.4, 0.41]]);
  g.parts.push({ id: "ab-case", kind: "case", poly: shell(table([[2.55, 0.585], [4.55, 0.585], [4.75, 0.56]]), table([[2.55, 0.5], [4.75, 0.5]]), 2.55, 4.75, 16) });
  g.parts.push({ id: "ab-liner", kind: "liner", poly: shell(table([[2.85, 0.472], [4.7, 0.472]]), table([[2.85, 0.462], [4.7, 0.462]]), 2.85, 4.7, 8) });
  for (const [k, r] of [[1, 0.31], [2, 0.43]]) g.parts.push({ id: `spray${k}`, kind: "case", poly: box(2.9, 2.93, r - 0.01, r + 0.01) });
  for (const [k, r] of [[1, 0.25], [2, 0.38]]) g.parts.push({ id: `holder${k}`, kind: "hot", poly: [[3.0, r], [3.1, r - 0.035], [3.1, r - 0.025], [3.015, r], [3.1, r + 0.025], [3.1, r + 0.035]] });
  // регульоване сопло: збіжні й розбіжні стулки, зовнішні стулки, гідроциліндри приводу
  g.parts.push({ id: "noz-conv", kind: "hot", poly: shell(table([[4.72, 0.5], [5.05, 0.385]]), table([[4.72, 0.47], [5.05, 0.355]]), 4.72, 5.05, 8) });
  g.parts.push({ id: "noz-div", kind: "hot", poly: shell(table([[5.05, 0.385], [5.4, 0.425]]), table([[5.05, 0.355], [5.4, 0.41]]), 5.05, 5.4, 8) });
  g.parts.push({ id: "noz-ext", kind: "case", poly: shell(table([[4.75, 0.56], [5.4, 0.445]]), table([[4.75, 0.545], [5.4, 0.432]]), 4.75, 5.4, 8) });
  g.parts.push({ id: "noz-act", kind: "case", poly: box(4.5, 4.72, 0.585, 0.612) });
  g.ab = { mix: 2.55, fh: 3.05, wall, exit: 5.4, throat: 5.05 };
  g.exitS = 5.4;
  g.jetR = 0.41;
  return g;
}

const BUILDERS = { jumo, jt8d, jt9d, f135, gtf };

/** Геометрія всіх двигунів + розраховані перерізи лопаток. */
export const GEOMETRY = ENGINES.map((engine) => {
  const g = BUILDERS[engine.id]();
  for (const row of g.rows) {
    const inBypass = row.bypass;
    const inFan = row.fan;
    let hub;
    let tip;
    if (inFan) {
      hub = g.fanHub ?? (() => g.hubR);
      tip = g.fanTip ? (s) => g.fanTip(s) - 0.004 : () => g.R - 0.004;
    } else if (inBypass) {
      hub = g.bypass.in;
      tip = g.bypass.out;
    } else {
      hub = g.ri;
      tip = g.ro;
    }
    if (row.strut && engine.id === "jumo") {
      hub = table([[-0.4, 0.15], [-0.2, 0.18]]);
      tip = table([[-0.4, 0.31], [-0.2, 0.3]]);
    }
    Object.assign(row, bladeAt(row, hub, tip));
  }
  return { id: engine.id, ...g };
});
