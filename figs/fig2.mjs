// Рис. 2 — цикл Брайтона: манометр і термометр під кожною станцією проточної частини.
import { k } from "../src/kit.mjs";
import { STAND, stand, console as desk } from "../src/stand.mjs";
import { enginesSvg } from "../src/render.mjs";
import { LIVE } from "../src/live.mjs";
import { GEOMETRY } from "../src/engines.mjs";
import { figurePage, engineData, comma, FLOW_KEYS, YEAR_BUTTONS } from "../src/page.mjs";
import { explodeScript, EXPLODE_UI } from "../src/explode.mjs";
import { engineApp } from "../src/catalog.mjs";

const { P, M, Y0, ZC } = STAND;
const RAIL_X = 40;
const Z0 = 5; // низ шкали
const HMAX = 62; // висота шкали
const P_MAX = 50; // бар на повну шкалу
const T_MAX = 2000; // K на повну шкалу
const NAMES = ["2", "13", "3", "4", "5"];

/** Станції: s уздовж осі, радіус відбору й параметри зі статичного циклу. */
function stationsOf(geo, d) {
  const st = d.st;
  const fan = !!geo.bypass;
  const out = [
    { s: 0.02, r: fan ? geo.bypass.out(0.05) + 0.02 : geo.ro(0.02) + 0.02, p: st.p2, T: st.T2 },
    fan ? { s: geo.rows.find((r) => r.bypass).s + 0.05, r: geo.bypass.out(geo.rows.find((r) => r.bypass).s + 0.05) + 0.02, p: st.p13, T: st.Tfan } : null,
    { s: geo.hpc[1] - 0.02, r: geo.ro(geo.hpc[1] - 0.02) + 0.03, p: st.p3, T: st.T3 },
    { s: geo.hpt[0] + 0.01, r: geo.ro(geo.hpt[0] + 0.01) + 0.03, p: st.p4, T: st.T4 },
    { s: (geo.lpt ?? geo.hpt)[1] + 0.02, r: geo.ro((geo.lpt ?? geo.hpt)[1] + 0.02) + 0.03, p: st.p5, T: st.T5 },
  ];
  return out.map((o, i) => (o ? { name: NAMES[i], y: Y0 - o.s * M, tapZ: ZC - o.r * M, hp: (o.p / 1e5 / P_MAX) * HMAX, ht: (o.T / T_MAX) * HMAX, p: o.p / 1e5, T: o.T } : { name: NAMES[i], y: null }));
}

/** Один прилад, зібраний у y = 0: каретка, щиток зі шкалою, дві скляні трубки. */
function gauge(i) {
  const S = (paths, style) => k.solidSvg(paths, style);
  const L = (d, style) => k.lineSvg(d, style);
  const out = [];
  const x0 = RAIL_X - 6;
  out.push(S(k.slabOf({ x: x0, y: -6, w: 12, d: 12, r: 1.2 }, 2.4, 2.6, P, 2, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: x0, y: -6, w: 1.6, d: 12, r: 0.3 }, Z0 - 0.6, HMAX + 3.6, P, 1), { tone: "mid" }));
  // шкала на щитку: поділка 1/10, велика — половина
  let minor = "";
  let major = "";
  for (let j = 0; j <= 10; j++) {
    const z = Z0 + (HMAX * j) / 10;
    const seg = k.segment([x0 + 1.6, -6, z], [x0 + 1.6, j % 5 ? -4.4 : -3.2, z], P);
    if (j % 5) minor += seg;
    else major += seg;
  }
  out.push(L(minor, { tone: "lo" }), L(major, { tone: "mid" }));
  out.push(k.dotsSvg(k.pointsAt([[x0 + 1.6, 4.6, Z0 + HMAX + 1.8], [x0 + 1.6, 4.6, Z0 + 1]], P), { size: 0.45, tone: "mid" }));
  // рідина (перебудовується в сторінці) і скло
  out.push(`<g data-liq="p${i}" class="je-liq je-liq-p"></g><g data-liq="t${i}" class="je-liq je-liq-t"></g>`);
  for (const dy of [-2.2, 2.6]) {
    out.push(S(k.cylinder(x0 + 4.2, dy, 1.6, Z0 - 0.6, HMAX + 1.6, P, 18), { tone: "lo", className: "je-glass", crease: "none" }));
    out.push(S(k.cylinder(x0 + 4.2, dy, 2.1, Z0 + HMAX + 1, 1.4, P, 18), { tone: "mid" }));
  }
  return `<g class="je-gauge" data-gauge="${i}">${out.join("")}</g>`;
}

export function build() {
  const INITIAL = 3;
  const DATA = engineData();
  const STATIONS = GEOMETRY.map((geo, i) => stationsOf(geo, DATA[i]));
  const rail = [
    k.solidSvg(k.slabOf({ x: RAIL_X - 3, y: -56, w: 6, d: 232, r: 1 }, 0, 2.4, P, 2, 0.4), { tone: "mid" }),
    k.lineSvg(k.planOutline({ x: RAIL_X - 1, y: -54, w: 2, d: 228, r: 1 }, 2.4, P, 2), { tone: "faint" }),
    k.dotsSvg(k.pointsAt([[RAIL_X, -53, 2.4], [RAIL_X, 173, 2.4]], P), { size: 0.5, tone: "mid" }),
  ].join("");
  // прилади, від дальнього до ближнього (за y)
  const gauges = [4, 3, 2, 1, 0].map(gauge).join("");
  const svg = k.figureSvg({
    width: STAND.W,
    height: STAND.H,
    label: "Двигун у розрізі на стенді; під ним на рейці п'ять приладів, кожен під своєю станцією проточної частини: манометр (темний стовпчик) і термометр (червоний). Ручка перемикає двигун, прилади переїжджають до нових станцій.",
    body: [stand(), enginesSvg(INITIAL), `<g class="je-flow" aria-hidden="true"></g>`, rail, `<g class="je-taps"></g>`, gauges, desk()],
  });
  const captions = DATA.map((d, i) => {
    const s = STATIONS[i];
    return `${d.name}: компресор стискає повітря з ${comma(s[0].p, 2)} до ${comma(s[2].p, 1)} бар, і воно нагрівається до ${Math.round(s[2].T)} K ще до камери. Камера додає тепло майже без зміни тиску — до ${Math.round(s[3].T)} K; турбіна забирає частину енергії на привід компресора${d.bpr ? " і вентилятора" : ""}, решта розганяє струмінь. Ідеальний ηt = 1 − π^(−0,4/1,4) = ${comma(d.etaT, 2)} залежить лише від π.`;
  });
  const note = " Значення — з тієї самої моделі циклу, що й на Рис. 1, для стенда (M = 0, 288 K, 1 атм): повний тиск і температура в станціях 2 (вхід), 13 (за вентилятором), 3 (за компресором), 4 (перед турбіною), 5 (за турбіною). Шкали лінійні: 0–50 бар і 0–2000 K. У Jumo 004 немає вентилятора, тож прилад 13 стоїть на кінці рейки й показує атмосферу.";
  const legend = `${EXPLODE_UI(DATA.map((d) => d.year))}<span class="iso-keys"><span class="iso-key"><svg class="iso-swatch je-sw" data-flow="press" viewBox="0 0 16 10" aria-hidden="true"><path d="M1.5 5h13"/></svg>манометр: повний тиск, бар</span><span class="iso-key"><svg class="iso-swatch je-sw" data-flow="hot" viewBox="0 0 16 10" aria-hidden="true"><path d="M1.5 5h13"/></svg>термометр: повна температура, K</span>${FLOW_KEYS}</span><span class="iso-caption je-caption"></span><span class="je-table-wrap"><table class="je-table je-stations"></table></span>`;
  const extra = `
const ST = ${JSON.stringify(STATIONS)};
const RAIL_X = ${RAIL_X}, Z0 = ${Z0};
const gaugeEls = [...svg.querySelectorAll("[data-gauge]")].sort((a, b) => a.dataset.gauge - b.dataset.gauge);
const taps = svg.querySelector(".je-taps");
const stTable = document.querySelector(".je-stations");
const PARK = [-48, -40, -32, -24, -16];
const gs = ST[current].map((g, i) => ({ y: g.y ?? PARK[i], hp: g.y === null ? 0 : g.hp, ht: g.y === null ? 0 : g.ht, tz: g.tapZ ?? 0 }));
function liquid(i, which, h) {
  const el = svg.querySelector('[data-liq="' + which + i + '"]');
  const dy = which === "p" ? -2.2 : 2.6;
  const x = RAIL_X - 6 + 4.2;
  el.innerHTML = h > 0.05 ? solidSvg(cylinder(x, dy, 1.05, Z0, h, P, 14), { tone: "mid", crease: "none" }) : "";
}
function drawGauges() {
  let lines = "", dots = [];
  gs.forEach((g, i) => {
    gaugeEls[i].setAttribute("transform", translateAlong(P, [0, g.y, 0]));
    liquid(i, "p", g.hp); liquid(i, "t", g.ht);
    if (ST[current][i].y !== null) {
      const a = iso([RAIL_X - 5.2, g.y, Math.min(Z0 + 64.6, g.tz - 6)], P), b = iso([0, g.y, g.tz], P);
      lines += "M" + a[0].toFixed(1) + " " + a[1].toFixed(1) + "L" + b[0].toFixed(1) + " " + b[1].toFixed(1);
      dots.push(a, b);
    }
  });
  taps.innerHTML = '<path class="iso-line" data-tone="mid" d="' + lines + '"/>' + dotsSvg(dots, { size: 0.9, tone: "hi" });
}
function fillStations(i) {
  const s = ST[i];
  stTable.innerHTML = "<thead><tr><th>Станція</th>" + s.map((g) => "<th>" + g.name + "</th>").join("") + "</tr></thead><tbody><tr><td>p, бар</td>" + s.map((g) => "<td>" + (g.y === null ? "—" : g.p.toFixed(g.p < 10 ? 2 : 1).replace(".", ",")) + "</td>").join("") + "</tr><tr><td>T, K</td>" + s.map((g) => "<td>" + (g.y === null ? "—" : Math.round(g.T)) + "</td>").join("") + "</tr></tbody>";
}
HOOKS.say.push((i) => {
  fillStations(i);
  const d = DATA[i], s = ST[i];
  const line = "π " + comma(d.opr, d.opr < 10 ? 2 : 0) + " · T3 " + Math.round(s[2].T) + " K · T4 " + Math.round(s[3].T) + " K · ηt " + comma(d.etaT, 2);
  readout.textContent = d.year + " · " + d.name + "\\n" + line;
  readoutM.textContent = readout.textContent;
});
HOOKS.tick.push((dt, calm, cur) => {
  let moving = false;
  ST[cur].forEach((g, i) => {
    const t = { y: g.y ?? PARK[i], hp: g.y === null ? 0 : g.hp, ht: g.y === null ? 0 : g.ht, tz: g.tapZ ?? gs[i].tz };
    const e = calm ? 1 : 1 - Math.exp(-dt / 0.35);
    for (const key of ["y", "hp", "ht", "tz"]) { const d = t[key] - gs[i][key]; if (Math.abs(d) > 0.02) { gs[i][key] += d * e; moving = true; } else gs[i][key] = t[key]; }
  });
  drawGauges();
  taps.style.opacity = String(Math.max(0, 1 - explodeShare * 4));
  return moving;
});
drawGauges();
`;
  return figurePage({
    apps: [0, 1, 2, 3].map(engineApp),
    n: 2,
    svg,
    hint: "Ручка або ← → · E — розібрати · R — 3D",
    stageLabel: "Перемикач року: стрілки змінюють двигун",
    initial: INITIAL,
    legend,
    intro: "Під двигуном на рейці стоять п'ять приладів — кожен навпроти своєї станції. Манометр показує, наскільки стиснуте повітря, термометр — наскільки воно гаряче. Що вищий тиск за компресором, то більшу частку тепла цикл перетворює на роботу.",
    script: LIVE({ P, DATA, INITIAL, STAND, captions, note }) + explodeScript() + extra,
  });
}
