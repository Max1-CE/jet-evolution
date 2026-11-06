// SPDX-FileCopyrightText: 2026 Max Kravchenko
// SPDX-License-Identifier: MIT

// Живий скрипт сторінки (рядок, вбудовується після kitScript()).
import { SLOW, DT } from "./flow.mjs";

export const LIVE = ({ P, DATA, INITIAL, STAND, captions, note }) => `
const P = ${JSON.stringify(P)};
const DATA = ${JSON.stringify(DATA)};
const DIAL = ${JSON.stringify(STAND.DIAL)}, KNOB = ${JSON.stringify(STAND.KNOB)}, ANGLES = ${JSON.stringify(STAND.KNOB_ANGLES)}, DIAL_MAX = ${STAND.DIAL_MAX};
const DT = ${DT}, SLOW = ${SLOW};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const engines = [...svg.querySelectorAll(".je-engine")];
const flow = svg.querySelector(".je-flow");
const pointer = svg.querySelector('[data-part="pointer"]');
const needle = svg.querySelector('[data-part="needle"]');
const readout = document.querySelector("[data-readout]");
const caption = document.querySelector(".je-caption");
const readoutM = document.querySelector(".je-readout-m");
const tableEl = document.querySelector(".je-table");
const buttons = [...document.querySelectorAll("[data-year]")];
const still = matchMedia("(prefers-reduced-motion: reduce)");
const comma = (x, n) => x.toFixed(n).replace(".", ",");

// --- таблиця даних (статична) ---
if (tableEl) tableEl.innerHTML = "<thead><tr><th>Рік</th><th>Двигун</th><th>m</th><th>π</th><th>T<sub>г</sub>, K</th><th>C<sub>уд</sub> крейсер<br>модель / дані</th><th>C<sub>уд</sub> стенд<br>модель</th><th>η<sub>t</sub></th><th>η<sub>p</sub></th><th>η<sub>t</sub>·η<sub>p</sub> / η<sub>0</sub></th></tr></thead><tbody>" +
  DATA.map((d, i) => "<tr data-row='" + i + "'><td>" + d.year + "</td><td>" + d.name + "<small>" + d.aircraft + "</small></td><td>" + comma(d.bpr, d.bpr ? 1 : 0) + "</td><td>" + comma(d.opr, d.opr < 10 ? 2 : 1).replace(/,0$/, "") + "</td><td>" + d.t4 + (d.t4est ? "*" : "") + "</td><td>" + comma(d.tsfc, 2) + " / " + (d.ref.tsfcCruise ? comma(d.ref.tsfcCruise, 2) + (d.ref.est ? "*" : "") : "—") + "</td><td>" + comma(d.tsfcStatic, 2) + (d.ref.tsfcStatic ? " / " + comma(d.ref.tsfcStatic, 2) : "") + "</td><td>" + comma(d.etaT, 2) + "</td><td>" + comma(d.etaP, 2) + "</td><td>" + comma(d.etaT * d.etaP, 2) + " / " + comma(d.etaO, 2) + "</td></tr>").join("") +
  "</tbody>";

const CAPTIONS = ${JSON.stringify(captions)};
const NOTE = ${JSON.stringify(note)};
const HOOKS = { tick: [], say: [] };
window.__hooks = HOOKS;

// --- стан ---
let current = ${INITIAL};
let knob = ANGLES[current];
let dial = { at: DATA[current].thrust, rate: 0 };
let flowAlpha = 1;
let pending = -1;
let touring = !still.matches;
let tourClock = 0;
let idle = 0;
let visible = false;
let frame = 0;
let last = 0;
let clock = 0;

function say() {
  const d = DATA[current];
  const head = d.year + " · " + d.name + " · " + d.era;
  const line = "m " + comma(d.bpr, d.bpr ? 1 : 0) + " · π " + comma(d.opr, d.opr < 10 ? 2 : 0) + " · Tг " + d.t4 + " K · Cуд " + comma(d.tsfc, 2) + " кг/(кгс·год) · ηt " + comma(d.etaT, 2) + " · ηp " + comma(d.etaP, 2);
  readout.textContent = head + "\\n" + line;
  readoutM.textContent = head + "\\n" + line;
  caption.textContent = CAPTIONS[current] + NOTE;
  buttons.forEach((b, i) => b.toggleAttribute("aria-pressed", false) || b.setAttribute("aria-pressed", String(i === current)));
  if (tableEl) tableEl.querySelectorAll("tr[data-row]").forEach((tr) => tr.toggleAttribute("data-on", Number(tr.dataset.row) === current));
  stage.setAttribute("aria-valuenow", String(current));
  HOOKS.say.forEach((f) => f(current));
  stage.setAttribute("aria-valuetext", head);
}

// --- частинки ---
const CLASSES = ["bypass", "core", "hot"];
const ALPHAS = [1, 0.66, 0.36, 0.14];
const paths = [];
for (const c of CLASSES) for (const a of ALPHAS) {
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("class", "je-streak");
  p.dataset.flow = c;
  p.setAttribute("opacity", a);
  flow.appendChild(p);
  paths.push(p);
}
function particles(t) {
  const out = paths.map(() => "");
  const lanes = DATA[current].lanes;
  const tail = 0.14;
  for (let li = 0; li < lanes.length; li++) {
    const lane = lanes[li];
    const n = Math.max(1, Math.round(Math.min(lane.rate, 4) * lane.period));
    const pts = lane.pts;
    const span = lane.period;
    for (let i = 0; i < n; i++) {
      let u = (t + (i / n) * span + span * ((li * 0.618034) % 1)) % span;
      const head = u / DT;
      const tl = Math.max(0, (u - tail) / DT);
      const h0 = Math.min(pts.length - 1, Math.floor(head));
      const hf = head - h0;
      const a = pts[h0], b = pts[Math.min(pts.length - 1, h0 + 1)];
      const hx = a[0] + (b[0] - a[0]) * hf, hy = a[1] + (b[1] - a[1]) * hf;
      const t0 = Math.min(pts.length - 1, Math.floor(tl));
      const tf = tl - t0;
      const c = pts[t0], e = pts[Math.min(pts.length - 1, t0 + 1)];
      let tx = c[0] + (e[0] - c[0]) * tf, ty = c[1] + (e[1] - c[1]) * tf;
      if (Math.hypot(hx - tx, hy - ty) < 0.6) { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; tx = hx - dx / l * 0.6; ty = hy - dy / l * 0.6; }
      const alpha = a[3];
      const ai = alpha > 0.83 ? 0 : alpha > 0.5 ? 1 : alpha > 0.25 ? 2 : 3;
      if (alpha < 0.08) continue;
      const fade = Math.min(1, u / 0.8);
      const aj = fade < 0.5 ? Math.max(ai, 2) : ai;
      out[a[2] * ALPHAS.length + aj] += "M" + tx.toFixed(1) + " " + ty.toFixed(1) + "L" + hx.toFixed(1) + " " + hy.toFixed(1);
    }
  }
  paths.forEach((p, i) => p.setAttribute("d", out[i]));
}

function pointerAt(angle) {
  const r = KNOB.r - 0.9;
  return lineOnTop([KNOB.x - Math.sin(angle) * 1.2, KNOB.y + Math.cos(angle) * 1.2], [KNOB.x + Math.sin(angle) * r, KNOB.y - Math.cos(angle) * r], KNOB.z + 0.1, P);
}
function needleAt(kn) {
  const a = -0.75 * Math.PI + 1.5 * Math.PI * Math.min(1.04, Math.max(-0.02, kn / DIAL_MAX));
  const r = DIAL.r - 2.8;
  return lineOnTop([DIAL.x - Math.sin(a) * 2.2, DIAL.y + Math.cos(a) * 2.2], [DIAL.x + Math.sin(a) * r, DIAL.y - Math.cos(a) * r], DIAL.z + 0.15, P);
}

function select(i, byUser) {
  i = (i + DATA.length) % DATA.length;
  if (byUser) { touring = false; idle = 0; }
  if (i === current && pending < 0) return;
  pending = i;
  run();
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  const calm = still.matches;
  clock += dt;
  if (!touring && !calm) { idle += dt; if (idle > 14) { touring = true; tourClock = 0; } }
  if (touring) { tourClock += dt; if (tourClock > 7.5) { tourClock = 0; select(current + 1, false); } }
  // перемикання: спершу гасимо потік, тоді міняємо двигун
  if (pending >= 0) {
    flowAlpha = calm ? 0 : Math.max(0, flowAlpha - dt / 0.25);
    if (flowAlpha === 0) {
      engines[current].setAttribute("data-off", "");
      current = pending; pending = -1;
      engines[current].removeAttribute("data-off");
      say();
    }
  } else flowAlpha = calm ? 1 : Math.min(1, flowAlpha + dt / 0.6);
  flow.setAttribute("opacity", flowAlpha.toFixed(3));
  const target = ANGLES[pending >= 0 ? pending : current];
  knob = calm ? target : knob + (target - knob) * (1 - Math.exp(-dt / 0.12));
  pointer.setAttribute("d", pointerAt(knob));
  const want = DATA[current].thrust;
  if (calm) { dial.at = want; dial.rate = 0; }
  else for (let s = 0; s < 4; s++) { dial.rate += ((want - dial.at) * 60 - dial.rate * 9) * dt / 4; dial.at += dial.rate * dt / 4; }
  needle.setAttribute("d", needleAt(dial.at));
  let busy = false;
  HOOKS.tick.forEach((f) => { if (f(dt, calm, current)) busy = true; });
  if (!calm) particles(clock); else if (!paths[0].dataset.done) { particles(3.3); paths[0].dataset.done = "1"; }
  frame = visible && !(calm && pending < 0 && !busy) ? requestAnimationFrame(tick) : 0;
}
function run() { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } }
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("click", () => select((pending >= 0 ? pending : current) + 1, true));
stage.addEventListener("keydown", (e) => {
  const here = pending >= 0 ? pending : current;
  let to = null;
  if (e.key === "ArrowRight" || e.key === "ArrowUp") to = here + 1;
  if (e.key === "ArrowLeft" || e.key === "ArrowDown") to = here - 1;
  if (e.key >= "1" && e.key <= "4") to = Number(e.key) - 1;
  if (e.key === "Home") to = 0;
  if (e.key === "End") to = DATA.length - 1;
  if (to === null) return;
  e.preventDefault();
  if (to < 0 || to >= DATA.length) to = Math.max(0, Math.min(DATA.length - 1, to));
  select(to, true);
});
buttons.forEach((b, i) => b.addEventListener("click", () => select(i, true)));
still.addEventListener("change", () => { touring = !still.matches; delete paths[0].dataset.done; run(); });
window.__run = run;
window.__jet = { select: (i) => select(i, true), get current() { return current; }, data: DATA };
queueMicrotask(() => { say(); run(); });
pointer.setAttribute("d", pointerAt(knob));
needle.setAttribute("d", needleAt(dial.at));
particles(3.3);
`;
