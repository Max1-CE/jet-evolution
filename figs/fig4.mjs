// SPDX-FileCopyrightText: 2026 Max Kravchenko
// SPDX-License-Identifier: MIT

// Рис. 4 — зірчастий редуктор вентилятора (як у PW1100G): водило нерухоме,
// сонячна шестерня на валу ТНТ, п'ять сателітів на нерухомих осях, епіцикл крутить вентилятор.
import { k, G } from "../src/kit.mjs";
import { figurePage, comma, YEAR_BUTTONS } from "../src/page.mjs";
import { EXPLODE_UI } from "../src/explode.mjs";
import { pts } from "../src/catalog.mjs";

const W = 920;
const H = 600;
const ZS = 32;
const ZP = 33;
const ZR = 98; // 98/32 = 3,0625
const N = 5; // (ZS + ZR) / N = 26 — сателіти рівномірно
const MOD = 1.2;
const RS = (MOD * ZS) / 2;
const RP = (MOD * ZP) / 2;
const RR = (MOD * ZR) / 2;
const A = RS + RP; // міжосьова відстань
const RING_OUT = RR + 9;
const Z_CAR = [14, 19];
const Z_GEAR = [20, 32];
const Z_RING = [18, 34];
const BASE = { x: -112, y: -112, w: 224, d: 196, r: 9 };
const DESK = { x: 60, y: -104, w: 44, d: 52, r: 3 };
const DESK_H = 22;
const DIALS = [{ x: 72, y: -64, r: 10 }, { x: 72, y: -90, r: 10 }];
const KNOB = { x: 94, y: -77, r: 5, z: DESK_H + 4.5 };
const RPM = [0, 3000, 6000, 9000];
const KNOB_ANGLES = [-62, -21, 21, 62].map((d) => (d * Math.PI) / 180);
const DIAL_MAX = 10000;
const FAN_D = 2.06;

const P = k.fitProjection([...k.boxCorners(BASE, -22, 0), [0, 0, 44], [-RING_OUT, RING_OUT, 40], [RING_OUT, -RING_OUT, 40], [-RING_OUT * 0.7, -RING_OUT * 0.7, Z_RING[1] + 64], [RING_OUT * 0.7, RING_OUT * 0.7, Z_RING[1] + 64]], W, H, { pad: 40, azimuth: 30, elevation: 32 });
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(k.pointsAt(pts, P), style);
const PSI = Array.from({ length: N }, (_, i) => Math.PI / 2 + (i * 2 * Math.PI) / N);

// фази зубів: сателіт k має западину там, де до нього торкається зуб сонячної шестерні
const frac = (x) => x - Math.floor(x);
const PLANET0 = PSI.map((psi) => {
  const ds = frac((psi * ZS) / (2 * Math.PI));
  return psi + Math.PI + ((ds + 0.5) * 2 * Math.PI) / ZP;
});
const RING0 = (() => {
  const psi = PSI[0];
  const gap = PLANET0[0] + Math.PI / ZP;
  let eta = (((gap - psi) % (2 * Math.PI / ZP)) + 2 * Math.PI / ZP) % (2 * Math.PI / ZP);
  if (eta > Math.PI / ZP) eta -= 2 * Math.PI / ZP;
  return psi + (eta * ZP) / ZR;
})();

function base() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(BASE, -22, 12, P)}"/>`);
  for (const [x, y] of k.corners(BASE, 16).sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))) {
    out.push(S(k.cylinder(x, y, 9, -22, 2, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 6.5, -20, 8, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(BASE, -12, 12, P, 8, 1.4), { tone: "mid", inner: L(k.sideSeam(BASE, -8, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(BASE, 5), 0, P), { tone: "faint" }));
  out.push(D(k.corners(BASE, 10).map(([x, y]) => [x, y, 0]), { size: 0.55, tone: "mid" }));
  for (const [x, y] of k.corners(BASE, 10)) out.push(L(k.ring(x, y, 2.4, 0, P, 16), { tone: "lo" }));
  // опора й нерухоме водило
  out.push(`<g data-mod="carrier">`);
  out.push(S(k.cylinder(0, 0, 44, 0, 3, P, 96, 0.6), { tone: "mid" }));
  out.push(D(Array.from({ length: 10 }, (_, i) => [40 * Math.cos((i * Math.PI) / 5), 40 * Math.sin((i * Math.PI) / 5), 3]), { size: 0.55, tone: "mid" }));
  out.push(S(k.cylinder(0, 0, 30, 3, Z_CAR[0] - 3, P, 80, 0.6), { tone: "mid", inner: L(k.sideArc(0, 0, 30, 8, P, 60), { tone: "faint" }) }));
  // зірчасте водило: диск з п'ятьма проушинами
  out.push(S(k.cylinder(0, 0, A + 8, Z_CAR[0], Z_CAR[1] - Z_CAR[0], P, 120, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.ring(0, 0, A - 12, Z_CAR[1], P, 96), { tone: "faint" }));
  out.push(`</g>`);
  // кільцева канавка під епіцикл і його опорний бурт
  out.push(S(k.cylinder(0, 0, RING_OUT + 3, 3, Z_RING[0] - 3, P, 140), { tone: "lo" }));
  return out.join("");
}

/** Внутрішня стіна епіциклу на дальньому боці (видно крізь отвір). */
function ringWall() {
  const V = G.viewOf(P);
  const top = [];
  const bot = [];
  const ac = Math.atan2(-V[1], -V[0]);
  for (let i = 0; i <= 60; i++) {
    const a = ac - Math.PI / 2 + (i / 60) * Math.PI;
    top.push(k.iso([RR * Math.cos(a), RR * Math.sin(a), Z_RING[1]], P));
    bot.push(k.iso([RR * Math.cos(a), RR * Math.sin(a), Z_CAR[1]], P));
  }
  const pts = [...top, ...bot.reverse()];
  return `<g data-part="ringwall" data-mod="ring"><path class="iso-shade je-ringwall" data-shade="1" d="${k.pathOf(pts, true)}"/></g>`;
}

function console() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(DESK, 0, DESK_H, P)}"/>`);
  out.push(S(k.slabOf(DESK, 0, DESK_H, P, 4, 1), { tone: "mid", inner: L(k.sideSeam(DESK, 6, P, 4), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(DESK, 3), DESK_H, P, 4), { tone: "faint" }));
  out.push(D(k.corners(DESK, 5.5).map(([x, y]) => [x, y, DESK_H]), { size: 0.45, tone: "mid" }));
  DIALS.forEach(({ x, y, r }, i) => {
    const z = DESK_H + 5;
    out.push(S(k.cylinder(x, y, r + 1.5, DESK_H, 2, P, 48), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, r, DESK_H + 2, 3, P, 64, 0.6), { tone: "hi", crease: "lo" }));
    out.push(L(k.knurl(x, y, r, z - 2.4, z, 70, P, 0.3), { tone: "lo" }));
    out.push(L(k.ring(x, y, r - 1.8, z, P, 64), { tone: "lo" }));
    const t = k.radialTicks(x, y, r - 2.4, 20, 2, z, [1, 2.2], P, -0.75 * Math.PI, 1.5 * Math.PI + (1.5 * Math.PI) / 20);
    out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
    out.push(`<path class="iso-line" data-tone="lit" data-part="needle${i}" data-free="start" style="stroke-width:1" d=""/>`);
    out.push(L(k.ring(x, y, 0.7, z + 0.2, P, 12), { tone: "hi" }));
  });
  out.push(k.faceTextSvg(k.topMatrix([DIALS[0].x - 3.5, DIALS[0].y + 5], DESK_H + 5, P, "x"), "ТНТ", { size: 2, tone: "lo" }));
  out.push(S(k.cylinder(KNOB.x, KNOB.y, KNOB.r + 3, DESK_H, 1.2, P, 40), { tone: "lo" }));
  KNOB_ANGLES.forEach((a) => out.push(L(k.lineOnTop([KNOB.x + Math.sin(a) * (KNOB.r + 1.3), KNOB.y - Math.cos(a) * (KNOB.r + 1.3)], [KNOB.x + Math.sin(a) * (KNOB.r + 2.8), KNOB.y - Math.cos(a) * (KNOB.r + 2.8)], DESK_H + 1.2, P), { tone: "mid" })));
  out.push(S(k.cylinder(KNOB.x, KNOB.y, KNOB.r, DESK_H + 1.2, KNOB.z - DESK_H - 1.2, P, 40, 0.5), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(KNOB.x, KNOB.y, KNOB.r, DESK_H + 1.2, KNOB.z, 28, P), { tone: "lo" }));
  out.push(`<path class="iso-line" data-tone="lit" data-part="pointer" data-free="" style="stroke-width:1.2" d=""/>`);
  return out.join("");
}


// --- 3D-перегляд: редуктор як дерево деталей ------------------------------------------------------
function teethRing(cx, cy, n, pitch, phase, inward) {
  const w = (2 * Math.PI) / n, add = MOD, ded = 1.25 * MOD;
  const r0 = inward ? pitch + ded : pitch - ded, r1 = inward ? pitch - add : pitch + add;
  const ring = [];
  for (let i = 0; i < n; i++) {
    const c = phase + i * w;
    for (const [da, r] of [[-0.3, r0], [-0.15, r1], [0.15, r1], [0.3, r0]]) ring.push([cx + r * Math.cos(c + da * w), cy + r * Math.sin(c + da * w)]);
  }
  return pts(ring);
}
const circle = (cx, cy, r, n = 64) => pts(Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * 2 * Math.PI), cy + r * Math.sin((i / n) * 2 * Math.PI)]));
const tubeZ = (cx, cy, rIn, rOut, z0, z1, m) => ({ t: "lathe", ax: "z", poly: rIn > 0 ? [[z0, rIn], [z1, rIn], [z1, rOut], [z0, rOut]] : [[z0, 0], [z1, 0], [z1, rOut], [z0, rOut]], m, at: [[cx, cy]], seg: 64 });
const r2 = (x) => Math.round(x * 100) / 100;
const STEEL = ["цементована легована сталь: поверхня зубів тверда, серцевина в'язка"];

/** Масло: опора водила → канали плити → порожнисті осі → підшипники ковзання; форсунки — у зачеплення; злив. */
function oilFlow() {
  const r1 = (x) => Math.round(x * 10) / 10;
  const P3 = (r, a, z) => [r * Math.cos(a), r * Math.sin(a), z];
  const paths = [];
  const add = (pts, n, speed = 34) => paths.push({ kind: "oil", speed, n, pts: pts.map((p) => p.map(r1)) });
  const zp = (Z_CAR[0] + Z_CAR[1]) / 2;
  PSI.forEach((psi) => {
    const supply = [P3(26, psi - 0.35, -4), P3(26, psi - 0.35, zp), P3(A, psi, zp), P3(A, psi, (Z_GEAR[0] + Z_GEAR[1]) / 2)];
    const [cx, cy] = [A * Math.cos(psi), A * Math.sin(psi)];
    // з осі радіально в зазор підшипника, далі вгору по зазору й назовні
    for (const b of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
      const gap = (z) => [cx + 4.95 * Math.cos(b), cy + 4.95 * Math.sin(b), z];
      add([...supply, gap((Z_GEAR[0] + Z_GEAR[1]) / 2), gap(Z_GEAR[1] - 0.6), [cx + 9 * Math.cos(b), cy + 9 * Math.sin(b), Z_GEAR[1] + 1.5], [cx + 16 * Math.cos(b), cy + 16 * Math.sin(b), Z_GEAR[1] - 3]], 11);
    }
    // форсунки: від осі до зачеплень «сонце — сателіт» і «сателіт — епіцикл», потім злив униз
    const top = Z_GEAR[1] + 4;
    add([...supply.slice(0, 3), P3(A, psi, top), P3(RS + 1.5, psi, top), P3(RS + 1.5, psi, Z_GEAR[0] + 3), P3(RS + 1.5, psi, Z_CAR[1] + 1), P3(RS - 6, psi + 0.2, 4)], 14, 40);
    add([...supply.slice(0, 3), P3(A, psi, top), P3(RR - 1.5, psi, top), P3(RR - 1.5, psi, Z_GEAR[0] + 3), P3(RR + 4, psi + 0.05, Z_RING[0] - 1), P3(RING_OUT + 14, psi + 0.12, -6)], 14, 40);
  });
  // злив з епіцикла: відцентрова сила відкидає масло назовні, у жолоб корпусу
  for (let k = 0; k < 12; k++) { const a = (k / 12) * 2 * Math.PI + 0.2; add([P3(RR - 0.5, a, (Z_RING[0] + Z_RING[1]) / 2), P3(RING_OUT + 1, a + 0.05, (Z_RING[0] + Z_RING[1]) / 2), P3(RING_OUT + 16, a + 0.15, 10), P3(RING_OUT + 18, a + 0.2, -8)], 4, 30); }
  return { paths, xray: true };
}

function gearApp() {
  const ZG = Z_GEAR, ZRg = Z_RING;
  const top = ZG[1] + 2.4;
  const planets = PSI.map((psi, i) => {
    const cx = A * Math.cos(psi), cy = A * Math.sin(psi);
    return {
      id: `planet${i + 1}`, name: `Сателіт ${i + 1}`,
      func: "Обертається на нерухомій осі водила: зуби сонячної шестерні штовхають його з одного боку, а він — епіцикл з другого. П'ять сателітів ділять між собою момент турбіни НТ.",
      mat: [...STEEL, "підшипник ковзання: масляна плівка між віссю й сателітом"],
      ex: [r2(Math.cos(psi) * 24), r2(Math.sin(psi) * 24), 12],
      facts: [["Зубів", String(ZP)]],
      kids: [
        { id: "gear", name: "Зубчаста шестерня", func: "Зовнішні зуби одночасно зачіпляються із сонячною шестернею і з епіциклом.", mat: STEEL, geo: [{ t: "ext", shape: teethRing(cx, cy, ZP, RP, PLANET0[i], false), holes: [circle(cx, cy, 5.6, 40)], z0: ZG[0], z1: ZG[1], m: "gear" }], ex: [0, 0, 16], spin: { s: "sun", k: -ZS / ZP, axis: "z", c: [r2(cx), r2(cy)] } },
        { id: "bearing", name: "Підшипник ковзання", func: "Втулка між сателітом і віссю. Під тиском подається масло, і сателіт «пливе» на масляній плівці без тертя метал об метал — так редуктор обходиться без роликових підшипників.", mat: ["сталева втулка з антифрикційним шаром"], geo: [tubeZ(cx, cy, 4.3, 5.6, ZG[0] + 0.5, ZG[1] - 0.5, "brass")], ex: [0, 0, 6] },
      ],
    };
  });
  const pins = PSI.map((psi) => [r2(A * Math.cos(psi)), r2(A * Math.sin(psi))]);
  const boltR = (RR + 2 + RING_OUT + 7) / 2;
  const bolts = Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * 2 * Math.PI + 0.13; return [r2(boltR * Math.cos(a)), r2(boltR * Math.sin(a))]; });
  return {
    frame: "z", cutSingle: true,
    cut: [[-1, 0, 0, 0], [0, 1, 0, 0]],
    spools: [{ id: "sun", name: "вал ТНТ", rpm: 9000, tau: 1.6 }, { id: "ring", name: "вентилятор", rpm: -9000 * ZS / ZR, tau: 1.6 }, { id: "oil", rpm: 1, tau: 0.9, text: "масло під тиском — до підшипників і зачеплень" }],
    flow: oilFlow(),
    sound: { roar: 0.12, hiss: 0.05 },
    view: [1, 0.85, 1.25],
    root: {
      id: "gearbox", name: "Редуктор вентилятора", kicker: "PW1100G · зірчаста планетарна передача",
      func: "Передає момент від вала турбіни НТ до вентилятора й знижує оберти ≈3:1. Водило нерухоме, тому сонячна шестерня й епіцикл обертаються в різні боки. Через редуктор іде близько 25 МВт.",
      mat: ["цементовані сталі — шестерні", "сталь — водило й корпус", "масло під тиском — змащення й охолодження"],
      facts: [["Передаточне число", `${ZR}/${ZS} = ${comma(ZR / ZS, 4)}`], ["Зубів: сонячна / сателіт / епіцикл", `${ZS} / ${ZP} / ${ZR}`], ["Сателітів", String(N)], ["Умова складання", `(${ZS} + ${ZR}) / ${N} = ${(ZS + ZR) / N}`]],
      kids: [
        {
          id: "ring", name: "Епіцикл", func: "Вінець із внутрішніми зубами. Через фланець кріпиться до вала вентилятора й крутить його втричі повільніше за вал турбіни — і в протилежний бік.", mat: STEEL, ex: [0, 0, 66],
          facts: [["Зубів", String(ZR)]],
          kids: [
            { id: "rim", name: "Зубчастий вінець", func: "Кільце з внутрішніми зубами, у які входять усі п'ять сателітів. У справжньому редукторі зуби шевронні (дві косі половини, без осьової сили); тут для наочності — прямі.", mat: STEEL, geo: [{ t: "ext", shape: circle(0, 0, RING_OUT, 128), holes: [teethRing(0, 0, ZR, RR, RING0, true)], z0: ZRg[0], z1: ZRg[1], m: "gear" }], ex: [0, 0, 0], spin: { s: "sun", k: -ZS / ZR, axis: "z" } },
            { id: "flange", name: "Фланець вала вентилятора", func: "З'єднує епіцикл з валом вентилятора; трохи пружний, щоб вирівнювати навантаження між сателітами.", mat: ["високоміцна сталь"], geo: [tubeZ(0, 0, RR + 2, RING_OUT + 7, ZRg[1], ZRg[1] + 3.5, "rotor")], ex: [0, 0, 16], spin: { s: "sun", k: -ZS / ZR, axis: "z" } },
            { id: "bolts", name: "Болти ×12", func: "Стягують фланець з вінцем; момент передається тертям у стику й самими болтами.", mat: ["легована сталь"], geo: [{ t: "lathe", ax: "z", poly: [[ZRg[1] - 6, 0], [ZRg[1] + 6.5, 0], [ZRg[1] + 6.5, 1.9], [ZRg[1] + 5, 1.9], [ZRg[1] + 5, 1.1], [ZRg[1] - 6, 1.1]], m: "fixture", seg: 6, at: bolts }], ex: [0, 0, 32], spin: { s: "sun", k: -ZS / ZR, axis: "z" } },
          ],
        },
        {
          id: "sun", name: "Сонячна шестерня", func: "Найшвидша деталь редуктора: сидить на шліцах вала турбіни НТ (≈9 000 об/хв) і крутить усі п'ять сателітів.", mat: STEEL, ex: [0, 0, 40],
          facts: [["Зубів", String(ZS)]],
          kids: [
            { id: "sun-gear", name: "Зубчастий вінець", func: "Зовнішні зуби, що зачіпляються з п'ятьма сателітами одночасно.", mat: STEEL, geo: [{ t: "ext", shape: teethRing(0, 0, ZS, RS, 0, false), holes: [circle(0, 0, 6.2, 48)], z0: ZG[0], z1: ZG[1], m: "gear" }, tubeZ(0, 0, 6.2, 8, ZG[1], ZG[1] + 9, "gear")], ex: [0, 0, 16], spin: { s: "sun", axis: "z" } },
            { id: "sun-shaft", name: "Шліцьовий вал ТНТ", func: "Кінець вала турбіни НТ зі шліцами: передає момент і дає шестерні трохи самовстановлюватися між сателітами.", mat: ["високоміцна сталь"], geo: [tubeZ(0, 0, 0, 6, -10, ZG[1] + 6, "shaft")], ex: [0, 0, -30], spin: { s: "sun", axis: "z" } },
          ],
        },
        { id: "planets", name: `Сателіти ×${N}`, func: "Сателіти сидять на нерухомих осях і лише обертаються на місці — це «зірчаста» схема (у звичайній планетарній передачі водило з осями оберталося б).", mat: STEEL, ex: [0, 0, 22], kids: planets, facts: [["Зубів у кожного", String(ZP)]] },
        {
          id: "carrier", name: "Водило з осями", func: "Нерухома рама: прикручена до корпусу двигуна, несе осі сателітів і крізь них подає масло до підшипників.", mat: ["сталь"], ex: [0, 0, -18],
          kids: [
            { id: "plate", name: "Плита водила", func: "Тримає п'ять осей на однаковій відстані від центру, щоб зуби всіх сателітів навантажувались рівно.", mat: ["сталь"], geo: [{ t: "ext", shape: circle(0, 0, A + 8, 120), holes: [circle(0, 0, 9, 40)], z0: Z_CAR[0], z1: Z_CAR[1], m: "rotor" }], ex: [0, 0, 0] },
            { id: "pins", name: `Осі сателітів ×${N}`, func: "Порожнисті осі: усередині — канали, якими масло йде до підшипників ковзання.", mat: ["цементована сталь"], geo: [{ t: "lathe", ax: "z", poly: [[Z_CAR[1], 0], [top, 0], [top, 6.5], [ZG[1], 6.5], [ZG[1], 4.2], [Z_CAR[1], 4.2]], m: "shaft", seg: 40, at: pins }], ex: [0, 0, 26] },
            { id: "mount", name: "Опора на корпус", func: "Через неї водило кріпиться до нерухомого корпусу; пружні елементи гасять перекоси від прогину двигуна.", mat: ["сталь / титан"], geo: [tubeZ(0, 0, 22, 30, 3, Z_CAR[0], "case")], ex: [0, 0, -14] },
          ],
        },
      ],
    },
  };
}

export function build() {
  const INITIAL = 3;
  const svg = k.figureSvg({
    width: W,
    height: H,
    label: "Зірчастий планетарний редуктор на стенді, вісь вертикальна: у центрі сонячна шестерня на валу турбіни низького тиску, навколо п'ять сателітів на нерухомих осях водила, зовні епіцикл, з'єднаний з вентилятором. Два тахометри показують оберти турбіни й вентилятора; ручка задає режим.",
    body: [`<g class="je-parts">`, base(), ringWall(), `<g data-part="gears"></g>`, `<g data-part="ring" data-mod="ring"></g>`, `</g>`, console()],
  });
  const tip = (n) => (Math.PI * FAN_D * n) / 60;
  const captions = RPM.map((n) => {
    const f = n / (ZR / ZS);
    return n === 0
      ? "Редуктор стоїть. Водило з осями сателітів прикручене до корпусу, тож шестерні можуть лише обертатися на місці: сонячна — з валом турбіни, епіцикл — разом із вентилятором."
      : `Вал ТНТ — ${n.toLocaleString("uk")} об/хв, вентилятор — ${Math.round(f).toLocaleString("uk")} об/хв у протилежний бік (÷${comma(ZR / ZS, 4)}). Кінці лопатей вентилятора ∅ 2,06 м ідуть зі швидкістю ${Math.round(tip(f))} м/с; на прямому валу було б ${Math.round(tip(n))} м/с — утричі більше за швидкість звуку.`;
  });
  const note = ` Числа зубів ілюстративні (Zс = ${ZS}, Zсат = ${ZP}, Zеп = ${ZR}, п'ять сателітів: (${ZS} + ${ZR}) / 5 = 26 — умова складання); ${ZR}/${ZS} = 3,0625 ≈ 3:1, як у PW1100G. На фігурі обертання сповільнене, але співвідношення швидкостей справжнє. Масштаб — крупний план.`;
  const legend = `${EXPLODE_UI(RPM.map((n) => (n ? n.toLocaleString("uk") + " об/хв" : "стоп")), "редуктор")}<span class="iso-keys"><span class="iso-key"><svg class="iso-swatch" data-mark="lit" viewBox="0 0 16 10" aria-hidden="true"><path d="M1.5 5h13"/></svg>мітки на валу й епіциклі: видно напрям і швидкість</span></span><span class="iso-caption je-caption"></span><span class="je-sources">Співвідношення ≈3:1 (ТНТ ≈ 9 000 об/хв, вентилятор ≈ 3 000 об/хв) і зірчаста схема з п'ятьма сателітами — за відкритими описами PW1000G і патентами P&amp;W (<a href="https://en.wikipedia.org/wiki/Geared_turbofan">Geared turbofan</a>).</span>`;
  const script = `
const P = ${JSON.stringify(P)};
const ZS = ${ZS}, ZP = ${ZP}, ZR = ${ZR}, MOD = ${MOD}, RS = ${RS}, RP = ${RP}, RR = ${RR}, A = ${A}, RING_OUT = ${RING_OUT};
const PSI = ${JSON.stringify(PSI)}, PLANET0 = ${JSON.stringify(PLANET0)}, RING0 = ${RING0};
const ZG = ${JSON.stringify(Z_GEAR)}, ZRG = ${JSON.stringify(Z_RING)};
const RPM = ${JSON.stringify(RPM)}, ANGLES = ${JSON.stringify(KNOB_ANGLES)}, KNOB = ${JSON.stringify(KNOB)}, DIALS = ${JSON.stringify(DIALS)}, DESK_H = ${DESK_H}, DIAL_MAX = ${DIAL_MAX};
const CAPTIONS = ${JSON.stringify(captions)}, NOTE = ${JSON.stringify(note)};
const V = [Math.cos(30 * Math.PI / 180) * Math.cos(32 * Math.PI / 180), Math.sin(30 * Math.PI / 180) * Math.cos(32 * Math.PI / 180)];
const stage = document.querySelector(".iso-stage"), svg = stage.querySelector("svg");
const gearsEl = svg.querySelector('[data-part="gears"]'), ringEl = svg.querySelector('[data-part="ring"]');
const pointer = svg.querySelector('[data-part="pointer"]');
const needles = [svg.querySelector('[data-part="needle0"]'), svg.querySelector('[data-part="needle1"]')];
const readout = document.querySelector("[data-readout]"), readoutM = document.querySelector(".je-readout-m"), caption = document.querySelector(".je-caption");
const buttons = [...document.querySelectorAll("[data-year]")];
const still = matchMedia("(prefers-reduced-motion: reduce)");
const P2 = (x, y, z) => iso([x, y, z], P);
const path = (pts, close) => pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join("") + (close ? "Z" : "");
function teeth(cx, cy, z, n, pitch, phase, inward) {
  const w = 2 * Math.PI / n, add = MOD, ded = 1.25 * MOD;
  const r0 = inward ? pitch + ded : pitch - ded, r1 = inward ? pitch - add : pitch + add;
  const ring = [];
  for (let i = 0; i < n; i++) {
    const c = phase + i * w;
    for (const [da, r] of [[-0.3, r0], [-0.15, r1], [0.15, r1], [0.3, r0]]) ring.push([cx + r * Math.cos(c + da * w), cy + r * Math.sin(c + da * w)]);
  }
  return ring;
}
function gear(cx, cy, n, pitch, phase, marker) {
  const w = 2 * Math.PI / n, rr = pitch - 1.25 * MOD, ra = pitch + MOD;
  let out = solidSvg(cylinder(cx, cy, rr, ZG[0], ZG[1] - ZG[0], P, 72), { tone: "hi", crease: "none" });
  const blocks = [];
  for (let i = 0; i < n; i++) {
    const c = phase + i * w;
    if (Math.cos(c) * V[0] + Math.sin(c) * V[1] < -0.15) continue;
    const q = [[-0.32, rr - 0.6], [-0.15, ra], [0.15, ra], [0.32, rr - 0.6]].map(([da, r]) => [cx + r * Math.cos(c + da * w), cy + r * Math.sin(c + da * w)]);
    blocks.push({ d: Math.cos(c) * V[0] + Math.sin(c) * V[1], svg: solidSvg(extrude(q, ZG[0], ZG[1] - ZG[0], P, { convex: true }), { tone: "hi", crease: "none" }) });
  }
  blocks.sort((a, b) => a.d - b.d);
  out += blocks.map((b) => b.svg).join("");
  const top = teeth(cx, cy, 0, n, pitch, phase, false).map(([x, y]) => P2(x, y, ZG[1]));
  out += '<path class="iso-top" d="' + path(top, true) + '"/><path class="iso-line" data-tone="hi" d="' + path(top, true) + '"/>';
  out += lineSvg(ring_(cx, cy, rr - 2.2, ZG[1]), { tone: "faint" });
  return out;
}
function ring_(cx, cy, r, z) { const pts = []; for (let i = 0; i <= 48; i++) { const a = i / 48 * 2 * Math.PI; pts.push(P2(cx + r * Math.cos(a), cy + r * Math.sin(a), z)); } return path(pts, true); }
const ZC1 = ${Z_CAR[1]};
const LIFT = { ring: 62, sun: 40, planets: 20 };
const PART_TEXT = { ring: ["Епіцикл", "зубчастий вінець з внутрішніми зубами; через фланець крутить вал вентилятора"], sun: ["Сонячна шестерня", "сидить на шліцах вала турбіни низького тиску"], planets: ["Сателіти ×5", "обертаються на нерухомих осях і передають момент від сонячної шестерні до епіцикла"], carrier: ["Водило з осями", "прикручене до корпусу двигуна, тому не обертається (зірчаста схема)"] };
const lift = { ring: { x: 0, v: 0, delay: 0 }, sun: { x: 0, v: 0, delay: 0 }, planets: { x: 0, v: 0, delay: 0 } };
const ringWallEl = svg.querySelector('[data-part="ringwall"]'), partsEl = svg.querySelector(".je-parts");
const explodeBtn = document.querySelector(".je-explode"), modsEl = document.querySelector(".je-mods");
let apart = false, focus = null, pinned = null;
let thS = 0, rpm = RPM[${INITIAL}], target = 3, knob = ANGLES[3], touring = !still.matches, tour = 0, idle = 0, visible = false, frame = 0, last = 0;
function draw() {
  const thP = PLANET0.map((p0) => p0 - thS * ZS / ZP), thR = RING0 - thS * ZS / ZR;
  const items = [];
  const lp = lift.planets.x * LIFT.planets, ls = lift.sun.x * LIFT.sun, lr = lift.ring.x * LIFT.ring;
  const up = (dz) => ' transform="' + translateAlong(P, [0, 0, dz]) + '"';
  PSI.forEach((psi, i) => {
    const cx = A * Math.cos(psi), cy = A * Math.sin(psi);
    const shaft = solidSvg(cylinder(cx, cy, 4.2, ZC1, ZG[1] + 2.4 - ZC1, P, 24, 0.3), { tone: "mid" });
    const head = solidSvg(cylinder(cx, cy, 6.5, ZG[1], 2.4, P, 28, 0.4), { tone: "mid" }) + dotsSvg([P2(cx, cy, ZG[1] + 2.4)], { size: 0.8, tone: "mid" });
    const planet = '<g data-mod="planets"' + up(lp) + '>' + gear(cx, cy, ZP, RP, thP[i], false) + '</g>';
    const pin = '<g data-mod="carrier">';
    const svgItem = lp < 2.4 ? pin + (lp > 0.05 ? shaft : "") + '</g>' + planet + pin + head + '</g>' : pin + shaft + head + '</g>' + planet;
    items.push({ d: cx * V[0] + cy * V[1] + (26 + lp) * 0.53, svg: svgItem });
  });
  const spline = solidSvg(cylinder(0, 0, 6, ZC1, ZG[1] - ZC1 + 0.5, P, 32, 0.3), { tone: "mid" }) + lineSvg(knurl(0, 0, 6, ZC1 + 1, ZG[1], 18, P), { tone: "lo" });
  items.push({ d: (26 + ls) * 0.53, svg: (ls > 0.05 ? '<g data-mod="carrier">' + spline + '</g>' : "") + '<g data-mod="sun"' + up(ls) + '>' + gear(0, 0, ZS, RS, thS, false) + solidSvg(cylinder(0, 0, 8, ZG[1], 9, P, 40, 0.5), { tone: "hi", crease: "lo" }) + '<path class="iso-line" data-tone="lit" data-free="start" style="stroke-width:1.2" d="' + path([P2(Math.cos(thS) * 1.5, Math.sin(thS) * 1.5, ZG[1] + 9), P2(Math.cos(thS) * 8, Math.sin(thS) * 8, ZG[1] + 9)]) + '"/></g>' });
  items.sort((a, b) => a.d - b.d);
  ringEl.setAttribute("transform", translateAlong(P, [0, 0, lr]));
  ringWallEl.setAttribute("transform", translateAlong(P, [0, 0, lr]));
  gearsEl.innerHTML = items.map((i) => i.svg).join("");
  // епіцикл: ближня зовнішня стінка, верхнє кільце з внутрішніми зубами, болти й мітка
  const outer = circleRing(0, 0, RING_OUT, 120);
  const wall = extrude(outer, ZRG[0], ZRG[1] - ZRG[0], P, { convex: true });
  const inner = teeth(0, 0, 0, ZR, RR, thR, true).map(([x, y]) => P2(x, y, ZRG[1]));
  const outerTop = outer.map(([x, y]) => P2(x, y, ZRG[1]));
  let s = wall.shades.map((d, i) => d ? '<path class="iso-shade" data-shade="' + i + '" d="' + d + '"/>' : "").join("");
  s += '<path class="iso-top" fill-rule="evenodd" d="' + path(outerTop, true) + path(inner, true) + '"/>';
  s += '<path class="iso-line" data-tone="hi" d="' + wall.outline + '"/><path class="iso-line" data-tone="mid" d="' + path(inner, true) + '"/>';
  const bolts = []; for (let i = 0; i < 24; i++) { const a = thR + i * Math.PI / 12; bolts.push(P2((RING_OUT - 4) * Math.cos(a), (RING_OUT - 4) * Math.sin(a), ZRG[1])); }
  s += dotsSvg(bolts, { size: 0.6, tone: "mid" });
  s += '<path class="iso-line" data-tone="lit" style="stroke-width:1.2" d="' + path([P2((RR - MOD) * Math.cos(thR), (RR - MOD) * Math.sin(thR), ZRG[1]), P2(RING_OUT * Math.cos(thR), RING_OUT * Math.sin(thR), ZRG[1])]) + '"/>';
  ringEl.innerHTML = s;
  pointer.setAttribute("d", lineOnTop([KNOB.x - Math.sin(knob) * 1.2, KNOB.y + Math.cos(knob) * 1.2], [KNOB.x + Math.sin(knob) * (KNOB.r - 0.9), KNOB.y - Math.cos(knob) * (KNOB.r - 0.9)], KNOB.z + 0.1, P));
  [rpm, rpm * ZS / ZR].forEach((v, i) => {
    const a = -0.75 * Math.PI + 1.5 * Math.PI * Math.min(1, v / DIAL_MAX), d = DIALS[i], r = d.r - 2.6, z = DESK_H + 5.15;
    needles[i].setAttribute("d", lineOnTop([d.x - Math.sin(a) * 2, d.y + Math.cos(a) * 2], [d.x + Math.sin(a) * r, d.y - Math.cos(a) * r], z, P));
  });
}
function say() {
  const n = RPM[target], f = n * ZS / ZR;
  readout.textContent = "Зірчастий редуктор · " + ZR + "/" + ZS + " = " + (ZR / ZS).toFixed(4).replace(".", ",") + "\\nТНТ " + n.toLocaleString("uk") + " об/хв → вентилятор " + Math.round(f).toLocaleString("uk") + " об/хв, у протилежний бік";
  readoutM.textContent = readout.textContent;
  caption.textContent = CAPTIONS[target] + NOTE;
  buttons.forEach((b, i) => b.setAttribute("aria-pressed", String(i === target)));
  stage.setAttribute("aria-valuenow", String(target)); stage.setAttribute("aria-valuetext", readout.textContent);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60; last = now;
  const calm = still.matches;
  if (!touring && !calm) { idle += dt; if (idle > 14) { touring = true; tour = 0; } }
  if (touring) { tour += dt; if (tour > 6) { tour = 0; select(target === 3 ? 1 : target + 1, false); } }
  const want = RPM[target];
  rpm = calm ? want : rpm + (want - rpm) * (1 - Math.exp(-dt / 0.9));
  knob = calm ? ANGLES[target] : knob + (ANGLES[target] - knob) * (1 - Math.exp(-dt / 0.12));
  let moving = false;
  for (const id of ["ring", "sun", "planets"]) {
    const st = lift[id], want = apart ? 1 : 0;
    if (st.delay > 0) { st.delay -= dt; moving = true; continue; }
    if (calm) { st.x = want; st.v = 0; continue; }
    for (let k = 0; k < 4; k++) { st.v += ((want - st.x) * 70 - st.v * 15) * dt / 4; st.x += st.v * dt / 4; }
    if (Math.abs(want - st.x) < 1e-3 && Math.abs(st.v) < 1e-3) { st.x = want; st.v = 0; } else moving = true;
  }
  const engaged = lift.planets.x < 0.02 && lift.sun.x < 0.02 && lift.ring.x < 0.02;
  if (!calm && engaged) thS += (rpm / 9000) * 0.55 * 2 * Math.PI * dt;
  draw();
  applyFocus();
  frame = visible && (moving || (!calm && (rpm > 1 || Math.abs(want - rpm) > 1 || touring))) ? requestAnimationFrame(tick) : 0;
}
function run() { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } }
function select(i, user) { target = Math.max(0, Math.min(3, i)); if (user) { touring = false; idle = 0; } say(); run(); }
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("click", () => select((target + 1) % 4, true));
stage.addEventListener("keydown", (e) => { let to = null; if (e.key === "ArrowRight" || e.key === "ArrowUp") to = target + 1; if (e.key === "ArrowLeft" || e.key === "ArrowDown") to = target - 1; if (e.key >= "1" && e.key <= "4") to = Number(e.key) - 1; if (to === null) return; e.preventDefault(); select(to, true); });
buttons.forEach((b, i) => b.addEventListener("click", () => select(i, true)));
still.addEventListener("change", () => { touring = !still.matches; draw(); run(); });
function applyFocus() { partsEl.querySelectorAll("[data-mod]").forEach((g) => g.toggleAttribute("data-on", g.dataset.mod === focus)); partsEl.toggleAttribute("data-focus", !!focus); }
function setFocus(id, pin) {
  if (pin) pinned = pinned === id ? null : id;
  focus = id ?? pinned;
  applyFocus();
  modsEl.querySelectorAll("[data-mod-btn]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.modBtn === focus)));
  if (focus) { readout.textContent = PART_TEXT[focus][0] + "\\n" + PART_TEXT[focus][1]; readoutM.textContent = readout.textContent; } else say();
}
function toggle(on) {
  apart = on ?? !apart;
  touring = false; idle = 0;
  explodeBtn.setAttribute("aria-pressed", String(apart));
  explodeBtn.textContent = apart ? "Зібрати редуктор (E)" : "Розібрати редуктор (E)";
  const seq = apart ? ["ring", "sun", "planets"] : ["planets", "sun", "ring"];
  seq.forEach((id, n) => { lift[id].delay = n * 0.12; });
  run();
}
modsEl.innerHTML = ["ring", "sun", "planets", "carrier"].map((id, n) => '<button type="button" data-mod-btn="' + id + '"><b>0' + (n + 1) + "</b> " + PART_TEXT[id][0] + '<i aria-hidden="true">↗</i></button>').join("");
modsEl.querySelectorAll("[data-mod-btn]").forEach((b) => {
  const id = b.dataset.modBtn;
  b.addEventListener("pointerenter", () => setFocus(id)); b.addEventListener("pointerleave", () => setFocus(null));
  b.addEventListener("focus", () => setFocus(id)); b.addEventListener("blur", () => setFocus(null));
  b.addEventListener("click", () => window.__viewer?.open(0, [id]));
});
window.addEventListener("jv-open", () => { touring = false; idle = -1e9; });
window.__viewerOpenCurrent = () => window.__viewer?.open(0, focus ? [focus] : []);
explodeBtn.addEventListener("click", () => toggle());
stage.addEventListener("keydown", (e) => { if (e.key === "e" || e.key === "E" || e.key === "у" || e.key === "У") { e.preventDefault(); toggle(); } });
window.__gear = { explode: (on) => toggle(on), select: (i) => select(i, true), set: (t) => { thS = t; draw(); } };
say(); draw();
`;
  return figurePage({
    apps: [gearApp()],
    n: 4,
    svg,
    hint: "Ручка або ← → · E — розібрати · R — 3D",
    stageLabel: "Режим турбіни: стрілки змінюють оберти",
    initial: INITIAL,
    legend,
    intro: "Вентилятор великого діаметра мусить обертатися повільно, інакше кінці лопатей вийдуть далеко за швидкість звуку. Турбіна низького тиску, навпаки, найкраще працює швидко. Редуктор між ними дозволяє кожному обертатися зі своєю швидкістю.",
    script,
  });
}
