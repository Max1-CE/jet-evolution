// Рис. 5 — гаряча частина: лопатка турбіни ВТ, зрізана посередині висоти, у затискачі стенда.
// Чотири покоління охолодження; термометри: газ перед турбіною, охолоджувальне повітря, точка плавлення нікелю.
import { k } from "../src/kit.mjs";
import { figurePage, engineData, YEAR_BUTTONS } from "../src/page.mjs";

const W = 920;
const H = 600;
const BASE = { x: -84, y: -118, w: 168, d: 214, r: 9 };
const C = 92; // хорда
const Z_PLAT = 30;
const Z_CUT = 96;
const BOARD = { x: -60, y: -112, d: 40 };
const Z0 = 12;
const HMAX = 120;
const T_MAX = 2000;
const NI_MELT = 1728;

// профіль: середня лінія з вигином, товщина як у турбінної лопатки
const camber = (t) => 0.26 * C * Math.sin(Math.PI * t) * (1 - 0.25 * t);
const thick = (t) => 0.44 * C * (1.25 * Math.sqrt(t) - 0.1 * t - 1.3 * t * t + 0.9 * t ** 3 - 0.75 * t ** 4) + 0.012 * C;
const yOf = (t) => 60 - t * C; // хорда вздовж −y, вхідна кромка при y = 60
function surface(t, side, inset = 0) {
  const h = Math.max(0, thick(t) / 2 - inset);
  return [camber(t) + side * h - 6, yOf(t)];
}
function outline(inset = 0, t0 = 0, t1 = 1, n = 48) {
  const up = [];
  const lo = [];
  for (let i = 0; i <= n; i++) {
    const t = t0 + ((t1 - t0) * (1 - Math.cos((Math.PI * i) / n))) / 2;
    up.push(surface(t, 1, inset));
    lo.push(surface(t, -1, inset));
  }
  return [...up, ...lo.reverse()];
}
const VARIANTS = [
  { label: "1944 · порожниста лопатка з листа", cav: [[0.03, 0.92]], wall: 2.2 },
  { label: "1965 · лита, внутрішні канали", holes: [0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 0.83] },
  { label: "1970 · лита, вставка струминного обдуву", cav: [[0.04, 0.3], [0.34, 0.62], [0.66, 0.9]], wall: 3, insert: true },
  { label: "сьогодні · монокристал, плівкове охолодження, ТЗП", cav: [[0.04, 0.2], [0.24, 0.38], [0.42, 0.56], [0.6, 0.74], [0.78, 0.9]], wall: 2.6, film: true, tbc: true },
];

const P = k.fitProjection([...k.boxCorners(BASE, -22, 0), [0, 70, Z_CUT + 10], [0, -60, Z_CUT + 10], [BOARD.x, BOARD.y, Z0 + HMAX + 10]], W, H, { pad: 34, azimuth: 30, elevation: 40 });
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(k.pointsAt(pts, P), style);
const top = (pts, z = Z_CUT) => k.pathOf(pts.map(([x, y]) => k.iso([x, y, z], P)), true);

function bench() {
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
  return out.join("");
}

function board() {
  const out = [];
  const { x, y, d } = BOARD;
  out.push(S(k.slabOf({ x: x - 6, y: y - 4, w: 20, d: d + 8, r: 2 }, 0, 3, P, 3, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf({ x, y, w: 2, d, r: 0.4 }, 3, Z0 + HMAX + 8 - 3, P, 1, 0.4), { tone: "hi" }));
  let minor = "";
  let major = "";
  for (let t = 0; t <= T_MAX; t += 100) {
    const z = Z0 + (t / T_MAX) * HMAX;
    const seg = k.segment([x + 2, y, z], [x + 2, y + (t % 500 ? 2 : 3.4), z], P);
    if (t % 500) minor += seg;
    else major += seg;
  }
  out.push(L(minor, { tone: "lo" }), L(major, { tone: "mid" }));
  const zm = Z0 + (NI_MELT / T_MAX) * HMAX;
  out.push(L(k.segment([x + 2.05, y, zm], [x + 2.05, y + d, zm], P) + k.segment([x + 2.05, y + d + 0.02, zm], [x, y + d + 0.02, zm], P), { tone: "lit" }));
  [y + 14, y + 27].forEach((cy, i) => {
    out.push(`<g data-liq="${i}" class="je-liq ${i ? "je-liq-t" : "je-liq-cool"}"></g>`);
    out.push(S(k.cylinder(x + 4.6, cy, 2.1, Z0 - 1, HMAX + 2, P, 18), { tone: "lo", className: "je-glass", crease: "none" }));
    out.push(S(k.cylinder(x + 4.6, cy, 2.7, Z0 + HMAX + 1, 1.6, P, 18), { tone: "mid" }));
    out.push(S(k.cylinder(x + 4.6, cy, 2.7, Z0 - 2.6, 1.6, P, 18), { tone: "mid" }));
  });
  return out.join("");
}

/** Затискач і полиця лопатки. */
function holder() {
  const out = [];
  out.push(S(k.slabOf({ x: -38, y: -52, w: 64, d: 124, r: 3 }, 0, 6, P, 4, 0.6), { tone: "mid" }));
  for (const x of [-34, 10]) {
    out.push(S(k.slabOf({ x, y: -44, w: 14, d: 108, r: 2 }, 6, Z_PLAT - 10, P, 3, 0.6), { tone: "mid", inner: L(k.sideSeam({ x, y: -44, w: 14, d: 108, r: 2 }, 12, P, 3), { tone: "faint" }) }));
    out.push(D([[x + 7, -34, Z_PLAT - 4], [x + 7, 0, Z_PLAT - 4], [x + 7, 34, Z_PLAT - 4], [x + 7, 56, Z_PLAT - 4]], { size: 0.6, tone: "mid" }));
  }
  // ялинковий хвостовик між щоками
  out.push(S(k.slabOf({ x: -20, y: -42, w: 30, d: 104, r: 1 }, 10, Z_PLAT - 14, P, 2), { tone: "hi" }));
  for (const z of [13, 17, 21]) out.push(L(k.sideSeam({ x: -20, y: -42, w: 30, d: 104, r: 1 }, z, P, 2), { tone: "lo" }));
  out.push(S(k.slabOf({ x: -30, y: -46, w: 48, d: 112, r: 2 }, Z_PLAT - 4, 4, P, 3, 0.6), { tone: "hi", crease: "lo" }));
  // підвід охолоджувального повітря
  out.push(S(k.cylinder(18, 62, 4, 6, 6, P, 24), { tone: "mid" }));
  return out.join("");
}

function bladeSvg(v, i) {
  const out = [];
  const ring = outline(0).map(([x, y]) => [x, y]);
  const paths = k.extrude(ring, Z_PLAT, Z_CUT - Z_PLAT, P, { convex: false });
  // верх — площина розрізу: метал, порожнини, отвори
  out.push(S({ ...paths, top: "" }, { tone: "hi", crease: "none" }));
  if (v.tbc) {
    out.push(`<path class="je-tbc" d="${top(outline(0))}"/>`);
    out.push(`<path class="je-cut-blade" d="${top(outline(1.4))}"/>`);
    out.push(L(top(outline(1.4)), { tone: "mid" }));
  } else out.push(`<path class="je-cut-blade" d="${top(outline(0))}"/>`);
  for (const [t0, t1] of v.cav ?? []) {
    const cav = outline(v.wall + (v.tbc ? 1.4 : 0), t0, t1, 20);
    out.push(`<path class="je-cavity" d="${top(cav)}"/>`, L(top(cav), { tone: "mid" }));
    if (v.insert && t0 < 0.1) {
      const ins = outline(v.wall + 3.2, t0 + 0.02, t1 - 0.02, 16);
      out.push(L(top(ins), { tone: "hi" }));
    }
  }
  for (const t of v.holes ?? []) {
    const [cx, cy] = surface(t, 0);
    const r = Math.min(2.6, thick(t) / 4);
    out.push(`<path class="je-cavity" d="${k.ring(cx, cy, r, Z_CUT, P, 20)}"/>`, L(k.ring(cx, cy, r, Z_CUT, P, 20), { tone: "mid" }));
  }
  if (v.film) {
    // ряди отворів плівкового охолодження на боковій поверхні (видимий бік)
    const dots = [];
    for (const t of [0.02, 0.08, 0.3, 0.5]) for (let z = Z_PLAT + 8; z < Z_CUT - 4; z += 7) { const [x, y] = surface(t, 1, -0.2); dots.push([x, y, z]); }
    out.push(D(dots, { size: 0.7, tone: "hi" }));
  }
  out.push(L(top(outline(0)), { tone: "hi" }));
  return `<g class="je-blade" data-engine="${i}"${i === 3 ? "" : ' data-off=""'}>${out.join("")}</g>`;
}

/** Лінії течії гарячого газу в площині розрізу та струмені охолоджувального повітря. */
function lanes() {
  const out = [];
  const pass = (x0, sign) => {
    const pts = [];
    for (let y = 140; y >= -66; y -= 1.5) {
      const t = (60 - y) / C;
      let x = x0;
      if (t > -0.6 && t < 1.6) {
        const tt = Math.min(1, Math.max(0, t));
        const bend = camber(tt) * Math.exp(-((t - 0.5) ** 2) / 0.6);
        x = x0 + bend + (t > 1 ? (t - 1) * -26 : 0) + (t < 0 ? 0 : 0);
        const [sx] = surface(tt, sign, -4);
        if (t >= 0 && t <= 1 && sign * (x - sx) < 0) x = sx;
      } else if (t >= 1.6) x = x0 + 0.6 * -26 + camber(1) * 0;
      pts.push(k.iso([x, y, Z_CUT + 0.3], P));
    }
    return pts;
  };
  for (const [x0, s] of [[-52, -1], [-42, -1], [-32, -1], [-22, -1], [24, 1], [34, 1], [44, 1], [54, 1], [64, 1]]) out.push(pass(x0, s));
  return out;
}

export function build() {
  const DATA = engineData();
  const LANES = lanes().map((pts) => pts.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]));
  const TEMPS = DATA.map((d) => ({ gas: d.t4, cool: d.st.T3, est: d.t4est }));
  const svg = k.figureSvg({
    width: W,
    height: H,
    label: "Лопатка турбіни високого тиску в затискачі стенда, зрізана посередині висоти: видно стінки й канали охолодження. Поруч — шкала з двома термометрами: газ перед турбіною й охолоджувальне повітря, світла риска — температура плавлення нікелю.",
    body: [bench(), `<g class="je-flow je-flow-back" aria-hidden="true"></g>`, board(), holder(), VARIANTS.map(bladeSvg).join(""), `<g class="je-flow" aria-hidden="true"></g>`],
  });
  const captions = [
    "Jumo 004B: лопатки зігнуті з листа хромомарганцевої сталі (Cromadur) і зварені; всередину йде повітря з компресора. Газ перед турбіною — лише ≈1050 K, і все одно лопатки м'якли при різкому збільшенні газу.",
    "JT8D: лита лопатка з нікелевого сплаву; частину повітря з-за компресора, минаючи камеру, подають на охолодження першого ступеня турбіни.",
    "JT9D: всередині порожнини стоїть тонкостінна вставка з отворами — струмені повітря б'ють у гарячу стінку зсередини (струминне охолодження).",
    "Сучасна лопатка ВТ: монокристал, звивисті канали, ряди отворів плівкового охолодження, що вкривають поверхню шаром холоднішого повітря, і керамічне теплозахисне покриття (ТЗП). Газ гарячіший за точку плавлення самого металу.",
  ];
  const note = " Температура газу — та сама, що в таблиці на Рис. 1 (для JT8D, JT9D, PW1100G — оцінки), охолоджувального повітря — температура за компресором з моделі. Перерізи лопаток схематичні: показано принцип, а не креслення конкретної деталі.";
  const legend = `${YEAR_BUTTONS(DATA.map((d) => d.year))}<span class="iso-keys"><span class="iso-key"><svg class="iso-swatch je-sw" data-flow="hot" viewBox="0 0 16 10" aria-hidden="true"><path d="M1.5 5h13"/></svg>газ перед турбіною</span><span class="iso-key"><svg class="iso-swatch je-sw" data-flow="bypass" viewBox="0 0 16 10" aria-hidden="true"><path d="M1.5 5h13"/></svg>охолоджувальне повітря (з-за компресора)</span><span class="iso-key"><svg class="iso-swatch" data-mark="lit" viewBox="0 0 16 10" aria-hidden="true"><path d="M1.5 5h13"/></svg>1728 K — плавиться чистий нікель</span></span><span class="iso-caption je-caption"></span><span class="je-sources">Джерела: порожнисті охолоджувані лопатки Jumo 004 з Cromadur — <a href="https://en.wikipedia.org/wiki/Junkers_Jumo_004">Junkers Jumo 004</a>; повітря на охолодження першого ступеня JT8D — <a href="https://en.wikipedia.org/wiki/Pratt_%26_Whitney_JT8D">Pratt &amp; Whitney JT8D</a>; струминні вставки в лопатках JT9D — дослідження NASA (<a href="https://www.science.gov/topicpages/j/jt9d+jet+engine">science.gov</a>).</span>`;
  const script = `
const P = ${JSON.stringify(P)};
const DATA = ${JSON.stringify(DATA.map((d) => ({ year: d.year, name: d.name })))};
const TEMPS = ${JSON.stringify(TEMPS)}, LANES = ${JSON.stringify(LANES)}, LABELS = ${JSON.stringify(VARIANTS.map((v) => v.label))};
const CAPTIONS = ${JSON.stringify(captions)}, NOTE = ${JSON.stringify(note)};
const BX = ${BOARD.x}, BY = ${BOARD.y}, Z0 = ${Z0}, HMAX = ${HMAX}, TMAX = ${T_MAX};
const stage = document.querySelector(".iso-stage"), svg = stage.querySelector("svg");
const blades = [...svg.querySelectorAll(".je-blade")], flow = svg.querySelector(".je-flow:not(.je-flow-back)"), flowBack = svg.querySelector(".je-flow-back");
const readout = document.querySelector("[data-readout]"), readoutM = document.querySelector(".je-readout-m"), caption = document.querySelector(".je-caption");
const buttons = [...document.querySelectorAll("[data-year]")];
const still = matchMedia("(prefers-reduced-motion: reduce)");
let current = 3, temps = [TEMPS[3].cool, TEMPS[3].gas], touring = !still.matches, tour = 0, idle = 0, visible = false, frame = 0, last = 0, clock = 0;
const mk = (parent) => { const p = document.createElementNS("http://www.w3.org/2000/svg", "path"); p.setAttribute("class", "je-streak"); p.dataset.flow = "hot"; parent.appendChild(p); return p; };
const hot = mk(flow), hotBack = mk(flowBack);
function liquids() {
  [temps[0], temps[1]].forEach((t, i) => {
    const h = (t / TMAX) * HMAX;
    svg.querySelector('[data-liq="' + i + '"]').innerHTML = solidSvg(cylinder(BX + 4.6, BY + 14 + 13 * i, 1.4, Z0, h, P, 14), { tone: "mid", crease: "none" });
  });
}
function streaks(t) {
  let d = "", db = "";
  LANES.forEach((pts, li) => {
    const n = 8, span = pts.length;
    for (let i = 0; i < n; i++) {
      const u = ((t * 46 + (i / n) * span + li * 11.3) % span);
      const a = Math.floor(u), b = Math.max(0, a - 7);
      const seg = "M" + pts[b][0] + " " + pts[b][1] + "L" + pts[a][0] + " " + pts[a][1];
      db += seg;
    }
  });
  hot.setAttribute("d", d); hotBack.setAttribute("d", db);
}
function say() {
  const g = TEMPS[current];
  readout.textContent = DATA[current].year + " · " + LABELS[current].split(" · ")[1] + "\\nгаз " + g.gas + " K" + (g.est ? "*" : "") + " · повітря на охолодження " + Math.round(g.cool) + " K · Ni плавиться 1728 K";
  readoutM.textContent = readout.textContent;
  caption.textContent = CAPTIONS[current] + NOTE;
  buttons.forEach((b, i) => b.setAttribute("aria-pressed", String(i === current)));
  blades.forEach((b, i) => b.toggleAttribute("data-off", i !== current));
  stage.setAttribute("aria-valuenow", String(current)); stage.setAttribute("aria-valuetext", readout.textContent);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60; last = now; clock += dt;
  const calm = still.matches;
  if (!touring && !calm) { idle += dt; if (idle > 14) { touring = true; tour = 0; } }
  if (touring) { tour += dt; if (tour > 6.5) { tour = 0; select(current + 1, false); } }
  const want = [TEMPS[current].cool, TEMPS[current].gas];
  let moving = false;
  temps = temps.map((t, i) => { const d = want[i] - t; if (Math.abs(d) > 0.5 && !calm) { moving = true; return t + d * (1 - Math.exp(-dt / 0.4)); } return want[i]; });
  liquids();
  if (!calm) streaks(clock);
  frame = visible && !calm ? requestAnimationFrame(tick) : 0;
}
function run() { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } }
function select(i, user) { current = (i + 4) % 4; if (user) { touring = false; idle = 0; } say(); run(); }
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("click", () => select(current + 1, true));
stage.addEventListener("keydown", (e) => { let to = null; if (e.key === "ArrowRight" || e.key === "ArrowUp") to = Math.min(3, current + 1); if (e.key === "ArrowLeft" || e.key === "ArrowDown") to = Math.max(0, current - 1); if (e.key >= "1" && e.key <= "4") to = Number(e.key) - 1; if (to === null) return; e.preventDefault(); select(to, true); });
buttons.forEach((b, i) => b.addEventListener("click", () => select(i, true)));
still.addEventListener("change", () => { touring = !still.matches; run(); });
window.__blade = { select: (i) => select(i, true) };
say(); liquids(); streaks(1.7);
`;
  return figurePage({
    n: 5,
    svg,
    hint: "Натисніть фігуру або ← →",
    stageLabel: "Покоління лопатки: стрілки змінюють рік",
    initial: 3,
    legend,
    intro: "Вищий тиск і вища температура перед турбіною — це і вищий ККД, і менший двигун на ту саму тягу. Межу ставить метал лопатки. Інженери обходять її повітрям, яке забирають із-за компресора й проганяють крізь лопатку.",
    script,
  });
}
