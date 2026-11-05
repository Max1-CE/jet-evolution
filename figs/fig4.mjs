// Рис. 4 — зірчастий редуктор вентилятора (як у PW1100G): водило нерухоме,
// сонячна шестерня на валу ТНТ, п'ять сателітів на нерухомих осях, епіцикл крутить вентилятор.
import { k, G } from "../src/kit.mjs";
import { figurePage, comma, YEAR_BUTTONS } from "../src/page.mjs";

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

const P = k.fitProjection([...k.boxCorners(BASE, -22, 0), [0, 0, 44], [-RING_OUT, RING_OUT, 40], [RING_OUT, -RING_OUT, 40]], W, H, { pad: 40, azimuth: 30, elevation: 32 });
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
  out.push(S(k.cylinder(0, 0, 44, 0, 3, P, 96, 0.6), { tone: "mid" }));
  out.push(D(Array.from({ length: 10 }, (_, i) => [40 * Math.cos((i * Math.PI) / 5), 40 * Math.sin((i * Math.PI) / 5), 3]), { size: 0.55, tone: "mid" }));
  out.push(S(k.cylinder(0, 0, 30, 3, Z_CAR[0] - 3, P, 80, 0.6), { tone: "mid", inner: L(k.sideArc(0, 0, 30, 8, P, 60), { tone: "faint" }) }));
  // зірчасте водило: диск з п'ятьма проушинами
  out.push(S(k.cylinder(0, 0, A + 8, Z_CAR[0], Z_CAR[1] - Z_CAR[0], P, 120, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.ring(0, 0, A - 12, Z_CAR[1], P, 96), { tone: "faint" }));
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
  return `<path class="iso-shade je-ringwall" data-shade="1" d="${k.pathOf(pts, true)}"/>`;
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

export function build() {
  const INITIAL = 3;
  const svg = k.figureSvg({
    width: W,
    height: H,
    label: "Зірчастий планетарний редуктор на стенді, вісь вертикальна: у центрі сонячна шестерня на валу турбіни низького тиску, навколо п'ять сателітів на нерухомих осях водила, зовні епіцикл, з'єднаний з вентилятором. Два тахометри показують оберти турбіни й вентилятора; ручка задає режим.",
    body: [base(), ringWall(), `<g data-part="gears"></g>`, `<g data-part="ring"></g>`, console()],
  });
  const tip = (n) => (Math.PI * FAN_D * n) / 60;
  const captions = RPM.map((n) => {
    const f = n / (ZR / ZS);
    return n === 0
      ? "Редуктор стоїть. Водило з осями сателітів прикручене до корпусу, тож шестерні можуть лише обертатися на місці: сонячна — з валом турбіни, епіцикл — разом із вентилятором."
      : `Вал ТНТ — ${n.toLocaleString("uk")} об/хв, вентилятор — ${Math.round(f).toLocaleString("uk")} об/хв у протилежний бік (÷${comma(ZR / ZS, 4)}). Кінці лопатей вентилятора ∅ 2,06 м ідуть зі швидкістю ${Math.round(tip(f))} м/с; на прямому валу було б ${Math.round(tip(n))} м/с — утричі більше за швидкість звуку.`;
  });
  const note = ` Числа зубів ілюстративні (Zс = ${ZS}, Zсат = ${ZP}, Zеп = ${ZR}, п'ять сателітів: (${ZS} + ${ZR}) / 5 = 26 — умова складання); ${ZR}/${ZS} = 3,0625 ≈ 3:1, як у PW1100G. На фігурі обертання сповільнене, але співвідношення швидкостей справжнє. Масштаб — крупний план.`;
  const legend = `${YEAR_BUTTONS(RPM.map((n) => (n ? n.toLocaleString("uk") + " об/хв" : "стоп")))}<span class="iso-keys"><span class="iso-key"><svg class="iso-swatch" data-mark="lit" viewBox="0 0 16 10" aria-hidden="true"><path d="M1.5 5h13"/></svg>мітки на валу й епіциклі: видно напрям і швидкість</span></span><span class="iso-caption je-caption"></span><span class="je-sources">Співвідношення ≈3:1 (ТНТ ≈ 9 000 об/хв, вентилятор ≈ 3 000 об/хв) і зірчаста схема з п'ятьма сателітами — за відкритими описами PW1000G і патентами P&amp;W (<a href="https://en.wikipedia.org/wiki/Geared_turbofan">Geared turbofan</a>).</span>`;
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
let thS = 0, rpm = RPM[${INITIAL}], target = 3, knob = ANGLES[3], touring = !still.matches, tour = 0, idle = 0, visible = false, frame = 0, last = 0;
function draw() {
  const thP = PLANET0.map((p0) => p0 - thS * ZS / ZP), thR = RING0 - thS * ZS / ZR;
  const items = [];
  PSI.forEach((psi, i) => { const cx = A * Math.cos(psi), cy = A * Math.sin(psi); items.push({ d: cx * V[0] + cy * V[1], svg: gear(cx, cy, ZP, RP, thP[i], false) + solidSvg(cylinder(cx, cy, 6.5, ZG[1], 2.4, P, 28, 0.4), { tone: "mid" }) + dotsSvg([P2(cx, cy, ZG[1] + 2.4)], { size: 0.8, tone: "mid" }) }); });
  items.push({ d: 0, svg: gear(0, 0, ZS, RS, thS, false) + solidSvg(cylinder(0, 0, 8, ZG[1], 9, P, 40, 0.5), { tone: "hi", crease: "lo" }) + '<path class="iso-line" data-tone="lit" data-free="start" style="stroke-width:1.2" d="' + path([P2(Math.cos(thS) * 1.5, Math.sin(thS) * 1.5, ZG[1] + 9), P2(Math.cos(thS) * 8, Math.sin(thS) * 8, ZG[1] + 9)]) + '"/>' });
  items.sort((a, b) => a.d - b.d);
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
  if (!calm) thS += (rpm / 9000) * 0.55 * 2 * Math.PI * dt;
  draw();
  frame = visible && !(calm) && (rpm > 1 || Math.abs(want - rpm) > 1 || touring) ? requestAnimationFrame(tick) : 0;
}
function run() { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } }
function select(i, user) { target = Math.max(0, Math.min(3, i)); if (user) { touring = false; idle = 0; } say(); run(); }
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("click", () => select((target + 1) % 4, true));
stage.addEventListener("keydown", (e) => { let to = null; if (e.key === "ArrowRight" || e.key === "ArrowUp") to = target + 1; if (e.key === "ArrowLeft" || e.key === "ArrowDown") to = target - 1; if (e.key >= "1" && e.key <= "4") to = Number(e.key) - 1; if (to === null) return; e.preventDefault(); select(to, true); });
buttons.forEach((b, i) => b.addEventListener("click", () => select(i, true)));
still.addEventListener("change", () => { touring = !still.matches; draw(); run(); });
window.__gear = { select: (i) => select(i, true), set: (t) => { thS = t; draw(); } };
say(); draw();
`;
  return figurePage({
    n: 4,
    svg,
    hint: "Натисніть ручку або ← →",
    stageLabel: "Режим турбіни: стрілки змінюють оберти",
    initial: INITIAL,
    legend,
    intro: "Вентилятор великого діаметра мусить обертатися повільно, інакше кінці лопатей вийдуть далеко за швидкість звуку. Турбіна низького тиску, навпаки, найкраще працює швидко. Редуктор між ними дозволяє кожному обертатися зі своєю швидкістю.",
    script,
  });
}
