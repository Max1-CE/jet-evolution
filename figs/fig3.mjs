// Рис. 3 — пропульсивний ККД: гребінка приймачів тиску за соплом і швидкісна дошка.
import { k } from "../src/kit.mjs";
import { STAND, stand, console as desk } from "../src/stand.mjs";
import { enginesSvg } from "../src/render.mjs";
import { LIVE } from "../src/live.mjs";
import { GEOMETRY } from "../src/engines.mjs";
import { figurePage, engineData, comma, FLOW_KEYS, YEAR_BUTTONS } from "../src/page.mjs";
import { explodeScript, EXPLODE_UI } from "../src/explode.mjs";
import { engineApp } from "../src/catalog.mjs";

const { P, M, Y0, ZC } = STAND;
const BOARD = { x: -84, y: -150, w: 8, d: 46, r: 1.2 }; // дошка стоїть за струменем
const Z0 = 14;
const HMAX = 120;
const V_MAX = 700; // м/с на повну шкалу
const COLS = [-118, -127, -136, -145]; // y стовпчиків: v0, vвент, vядра, vj
const KINDS = ["v0", "fan", "core", "vj"];

function board() {
  const S = (paths, style) => k.solidSvg(paths, style);
  const L = (d, style) => k.lineSvg(d, style);
  const out = [];
  out.push(S(k.slabOf({ x: BOARD.x - 6, y: BOARD.y - 4, w: 20, d: BOARD.d + 8, r: 2 }, 0, 3, P, 3, 0.5), { tone: "mid" }));
  for (const y of [BOARD.y + 3, BOARD.y + BOARD.d - 3]) out.push(S(k.slabOf({ x: BOARD.x + 1, y: y - 2, w: 5, d: 4, r: 0.6 }, 3, 8, P, 2), { tone: "mid" }));
  const plate = { x: BOARD.x, y: BOARD.y, w: 2, d: BOARD.d, r: 0.4 };
  out.push(S(k.slabOf(plate, 8, Z0 + HMAX + 10 - 8, P, 1, 0.4), { tone: "hi", inner: L(k.sideSeam(plate, Z0 - 2, P, 1), { tone: "faint" }) }));
  // шкала: поділка 50 м/с, велика — 100 м/с; рейка шкали на лівому краї щита
  const fx = BOARD.x + 2;
  let minor = "";
  let major = "";
  for (let v = 0; v <= V_MAX; v += 50) {
    const z = Z0 + (v / V_MAX) * HMAX;
    const seg = k.segment([fx, BOARD.y, z], [fx, BOARD.y + (v % 100 ? 2 : 3.4), z], P);
    if (v % 100) minor += seg;
    else major += seg;
  }
  out.push(L(minor, { tone: "lo" }), L(major, { tone: "mid" }));
  out.push(`<path class="iso-line" data-tone="lit" data-part="v0line" style="stroke-width:.9" d=""/>`);
  COLS.forEach((y, i) => {
    out.push(`<g data-liq="${i}" class="je-liq je-liq-${KINDS[i]}"></g>`);
    out.push(S(k.cylinder(fx + 2.6, y, 2.1, Z0 - 1, HMAX + 2, P, 18), { tone: "lo", className: "je-glass", crease: "none" }));
    out.push(S(k.cylinder(fx + 2.6, y, 2.7, Z0 + HMAX + 1, 1.6, P, 18), { tone: "mid" }));
    out.push(S(k.cylinder(fx + 2.6, y, 2.7, Z0 - 2.6, 1.6, P, 18), { tone: "mid" }));
  });
  out.push(k.dotsSvg(k.pointsAt([[fx, BOARD.y + 2, Z0 + HMAX + 7], [fx, BOARD.y + BOARD.d - 2, Z0 + HMAX + 7]], P), { size: 0.5, tone: "mid" }));
  return out.join("");
}

/** Гребінка приймачів повного тиску, зібрана в y = 0; стоїть у площині розрізу за соплом. */
function rake() {
  const S = (paths, style) => k.solidSvg(paths, style);
  const out = [];
  out.push(S(k.slabOf({ x: 4, y: -6, w: 12, d: 12, r: 1.5 }, 0, 3, P, 3, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf({ x: 8.5, y: -1.6, w: 3.2, d: 3.2, r: 0.5 }, 3, ZC + 70 - 3, P, 2, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: 0, y: -1.4, w: 12, d: 2.8, r: 0.4 }, ZC + 66, 3, P, 2), { tone: "mid" }));
  out.push(S(k.slabOf({ x: 0, y: -1.4, w: 12, d: 2.8, r: 0.4 }, ZC - 72, 3, P, 2), { tone: "mid" }));
  out.push(S(k.slabOf({ x: -1, y: -1.2, w: 2, d: 2.4, r: 0.4 }, ZC - 72, 141, P, 1), { tone: "hi" }));
  let probes = "";
  const tips = [];
  for (let z = ZC - 66; z <= ZC + 66; z += 8) {
    probes += k.segment([0, 1.2, z], [0, 6, z], P);
    tips.push(k.iso([0, 6, z], P));
  }
  out.push(k.lineSvg(probes, { tone: "hi" }), k.dotsSvg(tips, { size: 0.7, tone: "hi" }));
  return `<g data-part="rake">${out.join("")}</g>`;
}

export function build() {
  const INITIAL = 3;
  const DATA = engineData();
  const RAKE_Y = GEOMETRY.map((g) => Y0 - (Math.max(g.core[1], g.bypass ? g.bypass.s1 : 0) + 0.5) * M);
  const svg = k.figureSvg({
    width: STAND.W,
    height: STAND.H,
    label: "Двигун у розрізі на стенді; за соплом стоїть гребінка приймачів повного тиску, а за струменем — дошка з чотирма скляними стовпчиками: швидкість польоту, швидкість струменя зовнішнього контуру, струменя ядра й еквівалентна швидкість. Ручка перемикає двигун.",
    body: [stand(), board(), enginesSvg(INITIAL), `<g class="je-flow" aria-hidden="true"></g>`, rake(), desk()],
  });
  const VAL = DATA.map((d) => [d.v0, d.bpr ? d.vFanCr : 0, d.vCoreCr, d.vj]);
  const captions = DATA.map((d) => {
    const ex = d.vj - d.v0;
    return `${d.name}: на крейсері (M 0,8, 11 км) кожен кілограм повітря виходить у середньому на ${Math.round(ex)} м/с швидшим, ніж летить літак. Тяга пропорційна (vj − v0), а втрачена кінетична енергія — (vj − v0)²: чим менша різниця при тій самій тязі, тим менше енергії зникає в слідові. ηp = 2/(1 + vj/v0) = ${comma(d.etaP, 2)}.`;
  });
  const note = " Швидкості пораховано моделлю циклу на крейсері; vj — еквівалентна швидкість v0 + F/ṁ усього повітря. На стенді літак не летить (v0 = 0), тож дошка показує крейсерські значення, а частинки в струмені — стендові.";
  const legend = `${EXPLODE_UI(DATA.map((d) => d.year))}<span class="iso-keys"><span class="iso-key"><svg class="iso-swatch je-sw" data-flow="press" viewBox="0 0 16 10" aria-hidden="true"><path d="M1.5 5h13"/></svg>v0 — швидкість польоту</span><span class="iso-key"><svg class="iso-swatch je-sw" data-flow="bypass" viewBox="0 0 16 10" aria-hidden="true"><path d="M1.5 5h13"/></svg>струмінь зовнішнього контуру</span><span class="iso-key"><svg class="iso-swatch je-sw" data-flow="hot" viewBox="0 0 16 10" aria-hidden="true"><path d="M1.5 5h13"/></svg>струмінь ядра</span><span class="iso-key"><svg class="iso-swatch je-sw" data-flow="vj" viewBox="0 0 16 10" aria-hidden="true"><path d="M1.5 5h13"/></svg>vj — еквівалентна, по всьому повітрю</span></span><span class="iso-caption je-caption"></span>`;
  const extra = `
const VAL = ${JSON.stringify(VAL)};
const RAKE_Y = ${JSON.stringify(RAKE_Y)};
const COLS = ${JSON.stringify(COLS)};
const FX = ${BOARD.x + 2 + 2.6}, Z0 = ${Z0}, HMAX = ${HMAX}, VMAX = ${V_MAX}, BX = ${BOARD.x + 2}, BY = ${BOARD.y}, BD = ${BOARD.d};
const rakeEl = svg.querySelector('[data-part="rake"]');
const v0line = svg.querySelector('[data-part="v0line"]');
const cols = VAL[current].map((v) => v);
let ry = RAKE_Y[current];
function drawBoard() {
  cols.forEach((v, i) => {
    const h = (v / VMAX) * HMAX;
    svg.querySelector('[data-liq="' + i + '"]').innerHTML = h > 0.1 ? solidSvg(cylinder(FX, COLS[i], 1.4, Z0, h, P, 14), { tone: "mid", crease: "none" }) : "";
  });
  const z = Z0 + (cols[0] / VMAX) * HMAX;
  const a = iso([BX + 0.05, BY, z], P), b = iso([BX + 0.05, BY + BD + 0.02, z], P), c = iso([BX - 2, BY + BD + 0.02, z], P);
  v0line.setAttribute("d", "M" + a[0].toFixed(1) + " " + a[1].toFixed(1) + "L" + b[0].toFixed(1) + " " + b[1].toFixed(1) + "L" + c[0].toFixed(1) + " " + c[1].toFixed(1));
  rakeEl.setAttribute("transform", translateAlong(P, [0, ry, 0]));
}
HOOKS.say.push((i) => {
  const d = DATA[i], v = VAL[i];
  readout.textContent = d.year + " · " + d.name + "\\nv0 " + Math.round(v[0]) + (d.bpr ? " · vвент " + Math.round(v[1]) : "") + " · vядра " + Math.round(v[2]) + " · vj " + Math.round(v[3]) + " м/с · ηp " + comma(d.etaP, 2);
  readoutM.textContent = readout.textContent;
});
HOOKS.tick.push((dt, calm, cur) => {
  let moving = false;
  const e = calm ? 1 : 1 - Math.exp(-dt / 0.4);
  VAL[cur].forEach((v, i) => { const d = v - cols[i]; if (Math.abs(d) > 0.5) { cols[i] += d * e; moving = true; } else cols[i] = v; });
  const d = RAKE_Y[cur] - ry; if (Math.abs(d) > 0.05) { ry += d * e; moving = true; } else ry = RAKE_Y[cur];
  drawBoard();
  return moving;
});
drawBoard();
`;
  return figurePage({
    apps: [0, 1, 2, 3].map(engineApp),
    n: 3,
    svg,
    hint: "Ручка або ← → · E — розібрати · R — 3D",
    stageLabel: "Перемикач року: стрілки змінюють двигун",
    initial: INITIAL,
    legend,
    intro: "Тягу дає різниця швидкостей: повітря виходить швидше, ніж увійшло. Ту саму тягу можна отримати, розігнавши мало повітря дуже сильно або багато — трохи. Другий шлях втрачає менше енергії, і саме туди вела вся еволюція двигуна.",
    script: LIVE({ P, DATA, INITIAL, STAND, captions, note }) + explodeScript() + extra,
  });
}
