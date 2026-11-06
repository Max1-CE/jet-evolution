// SPDX-FileCopyrightText: 2026 Max Kravchenko
// SPDX-License-Identifier: MIT

// Лінії течії в площині розрізу. Кожна лінія — послідовність екранних точок через рівні
// проміжки часу, тож частинка рухається з місцевою швидкістю повітря (уповільнено в SLOW разів).
// Вихідні швидкості струменів — з моделі (стенд, M = 0), решта — типові осьові швидкості.
import { k, G } from "./kit.mjs";
import { STAND } from "./stand.mjs";
import { table } from "./engines.mjs";

export const SLOW = 220; // уповільнення анімації
export const DT = 0.05; // с між точками лінії (екранний час)
const { P, M, F } = STAND;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** Лінія течії: r(s), v(s) у м/с, тип (0 — зовнішній контур, 1 — ядро, 2 — гарячий газ), прозорість. */
function laneOf({ r, v, s0, s1, kind, alpha, half }) {
  const phi = half > 0 ? Math.PI / 2 : (3 * Math.PI) / 2;
  const pts = [];
  let s = s0;
  let t = 0;
  const dtWorld = DT / SLOW; // реальний час між точками
  while (s < s1) {
    const p = k.iso(G.pointOf(F, s * M, r(s) * M, phi), P);
    pts.push([Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10, kind(s), Math.round(alpha(s) * 20) / 20]);
    s += v(s) * dtWorld;
    t += DT;
  }
  return { pts, period: t };
}

export function flowLanes(geo, data) {
  const lanes = [];
  const bpr = data.bpr;
  const vCore = data.static.vCore;
  const vFan = data.static.vFan;
  const Va = 165; // осьова швидкість перед вентилятором / компресором
  const up = -1.6; // звідки починаються лінії
  const burner = geo.burner;
  const coreEnd = geo.core[1];
  const jetLen = 1.6;
  const fade = (end) => (s) => 1 - smooth((s - end) / jetLen) * 0.95;
  const hotOf = (s) => (s >= burner[0] ? 2 : 1);
  // швидкість у ядрі: розгін на вході, компресор, камера, турбіна, сопло, струмінь
  const coreV = table([
    [up, 0.22 * Va],
    [-0.4, 0.7 * Va],
    [0, Va],
    [(geo.hpc ?? geo.lpc)[0], 0.92 * Va],
    [geo.hpc[1], 0.72 * Va],
    [burner[0], 45],
    [burner[1], 70],
    [(geo.hpt ?? burner)[0] + 0.05, 180],
    [geo.nozzle[0], 260],
    [coreEnd, vCore],
    [coreEnd + 0.6, vCore * 0.98],
    [coreEnd + jetLen, vCore * 0.55],
  ]);
  const total = 28; // частинок на секунду реального... (екранного) часу на весь двигун
  const shareCore = 1 / (1 + bpr);
  if (!geo.bypass) {
    // турбореактивний: усе повітря — через ядро
    const fs = [0.22, 0.5, 0.78];
    for (const half of [1, -1]) {
      for (const f of fs) {
        const r = (s) => {
          if (s < -0.3) return lerp(0.17, 0.3, f) * (1 + 0.6 * smooth((-0.3 - s) / 1.2));
          if (s > coreEnd) return f * geo.jetR * (1 - 0.08 * smooth((s - coreEnd) / 1.5)) + 0.004;
          return geo.ri(s) + f * (geo.ro(s) - geo.ri(s));
        };
        const lane = laneOf({ r, v: coreV, s0: up, s1: coreEnd + jetLen, kind: hotOf, alpha: fade(coreEnd + 0.2), half });
        lanes.push({ ...lane, rate: (total * shareCore) / (fs.length * 2) });
      }
    }
    return lanes;
  }
  const { hubR, R } = geo;
  const split = geo.core[0];
  const rSp = geo.bypass.in(split);
  const fanEnd = geo.bypass.s1;
  const fanExitIn = geo.bypass.in(fanEnd);
  const fanExitOut = geo.bypass.out(fanEnd);
  const fan1 = geo.fanS[1];
  // ядро
  const coreFs = [0.3, 0.7];
  for (const half of [1, -1]) {
    for (const f of coreFs) {
      const rFace = Math.sqrt(hubR ** 2 + f * (rSp ** 2 - hubR ** 2));
      const r = (s) => {
        if (s <= fan1) return rFace * (1 + 0.25 * smooth((-0.2 - s) / 1.2));
        if (s < split + 0.05) return lerp(rFace, geo.ri(split + 0.05) + f * (geo.ro(split + 0.05) - geo.ri(split + 0.05)), smooth((s - fan1) / (split + 0.05 - fan1)));
        if (s <= coreEnd) {
          if (geo.mixed && s > coreEnd - 0.01) return geo.ri(s) + f * (geo.ro(s) - geo.ri(s));
          return geo.ri(s) + f * (geo.ro(s) - geo.ri(s));
        }
        if (geo.mixed) {
          // змішування в спільній трубі: ядро займає внутрішню частку площі
          const inner = geo.ri(Math.min(s, 3.25));
          const outer = geo.bypass.out(Math.min(s, fanEnd));
          const ff = Math.sqrt(f * shareCore);
          const target = Math.sqrt(inner ** 2 + ff ** 2 * (outer ** 2 - inner ** 2));
          const at = geo.ri(coreEnd) + f * (geo.ro(coreEnd) - geo.ri(coreEnd));
          return lerp(at, target, smooth((s - coreEnd) / 0.3));
        }
        return f * geo.jetR * (1 - 0.06 * smooth((s - coreEnd) / 1.5)) + 0.004;
      };
      const end = geo.mixed ? fanEnd : coreEnd;
      const vMixed = (vCore * 1 + vFan * bpr) / (1 + bpr);
      const v = geo.mixed
        ? (s) => (s <= coreEnd ? coreV(Math.min(s, coreEnd - 0.01)) : lerp(vCore, vMixed, smooth((s - coreEnd) / 0.4)) * (s > fanEnd + 0.6 ? 1 - 0.45 * smooth((s - fanEnd - 0.6) / (jetLen - 0.6)) : 1))
        : coreV;
      const lane = laneOf({ r, v, s0: up, s1: end + jetLen, kind: hotOf, alpha: fade(end + 0.2), half });
      lanes.push({ ...lane, rate: (total * shareCore) / (coreFs.length * 2) });
    }
  }
  // зовнішній контур
  const fanV = table([
    [up, 0.22 * Va],
    [-0.4, 0.7 * Va],
    [0, Va],
    [split, 0.95 * Va],
    [fanEnd - 0.3, 0.9 * Va],
    [fanEnd, vFan],
    [fanEnd + 0.6, vFan * 0.98],
    [fanEnd + jetLen, vFan * 0.55],
  ]);
  const bypassFs = [0.14, 0.38, 0.62, 0.86];
  for (const half of [1, -1]) {
    for (const f of bypassFs) {
      const rFace = Math.sqrt(rSp ** 2 + f * (R ** 2 - rSp ** 2));
      const exit = lerp(fanExitIn, fanExitOut, f);
      const r = (s) => {
        if (s <= fan1) return rFace * (1 + 0.18 * smooth((-0.2 - s) / 1.2));
        if (s < split + 0.12) return lerp(rFace, geo.bypass.in(split + 0.12) + f * (geo.bypass.out(split + 0.12) - geo.bypass.in(split + 0.12)), smooth((s - fan1) / (split + 0.12 - fan1)));
        if (s <= fanEnd) {
          if (geo.mixed && s > coreEnd) {
            const inner = geo.ri(Math.min(s, 3.25));
            const outer = geo.bypass.out(s);
            const ff = Math.sqrt(shareCore + f * (1 - shareCore));
            const target = Math.sqrt(inner ** 2 + ff ** 2 * (outer ** 2 - inner ** 2));
            const at = geo.bypass.in(coreEnd) + f * (geo.bypass.out(coreEnd) - geo.bypass.in(coreEnd));
            return lerp(at, target, smooth((s - coreEnd) / 0.3));
          }
          return geo.bypass.in(s) + f * (geo.bypass.out(s) - geo.bypass.in(s));
        }
        if (geo.mixed) {
          const inner = geo.ri(3.25);
          const outer = geo.bypass.out(fanEnd);
          const ff = Math.sqrt(shareCore + f * (1 - shareCore));
          return Math.sqrt(inner ** 2 + ff ** 2 * (outer ** 2 - inner ** 2)) * (1 - 0.06 * smooth((s - fanEnd) / 1.5));
        }
        // окреме сопло: струмінь ковзає по капоту ядра, далі охоплює гарячий струмінь
        const inner = s < coreEnd ? geo.bypass.in(s) : geo.jetR * 1.02;
        const width = exit - fanExitIn;
        return inner + (exit - fanExitIn) * (1 + 0.04 * smooth((s - fanEnd) / 1.5)) * 1 + 0 * width;
      };
      const vMixed = (vCore + vFan * bpr) / (1 + bpr);
      const v = geo.mixed ? (s) => (s <= coreEnd ? fanV(Math.min(s, fanEnd - 0.31)) : lerp(0.9 * Va, vMixed, smooth((s - coreEnd) / 0.45)) * (s > fanEnd + 0.6 ? 1 - 0.45 * smooth((s - fanEnd - 0.6) / (jetLen - 0.6)) : 1)) : fanV;
      const lane = laneOf({ r, v, s0: up, s1: fanEnd + jetLen, kind: () => 0, alpha: fade(fanEnd + 0.2), half });
      lanes.push({ ...lane, rate: (total * (1 - shareCore)) / (bypassFs.length * 2) });
    }
  }
  return lanes;
}
