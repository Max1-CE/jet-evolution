// SPDX-FileCopyrightText: 2026 Max Kravchenko
// SPDX-License-Identifier: MIT

// Рис. 5 — гаряча частина: лопатка турбіни ВТ, зрізана посередині висоти, у затискачі стенда.
// Чотири покоління охолодження; термометри: газ перед турбіною, охолоджувальне повітря, точка плавлення нікелю.
import { k } from "../src/kit.mjs";
import { figurePage, engineData, YEAR_BUTTONS } from "../src/page.mjs";
import { EXPLODE_UI } from "../src/explode.mjs";
import { pts } from "../src/catalog.mjs";

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

const P = k.fitProjection([...k.boxCorners(BASE, -22, 0), [0, 70, Z_CUT + 10], [0, -60, Z_CUT + 10], [0, 70, Z_CUT + 66], [0, -60, Z_CUT + 66], [BOARD.x, BOARD.y, Z0 + HMAX + 10]], W, H, { pad: 34, azimuth: 30, elevation: 40 });
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

/** Затискач: плита, дві щоки; хвостовик і полиця належать лопатці. */
function holder() {
  const plate = [];
  plate.push(S(k.slabOf({ x: -38, y: -52, w: 64, d: 124, r: 3 }, 0, 6, P, 4, 0.6), { tone: "mid" }));
  plate.push(S(k.cylinder(18, 62, 4, 6, 6, P, 24), { tone: "mid" }));
  const jaw = (x) => S(k.slabOf({ x, y: -44, w: 14, d: 108, r: 2 }, 6, Z_PLAT - 10, P, 3, 0.6), { tone: "mid", inner: L(k.sideSeam({ x, y: -44, w: 14, d: 108, r: 2 }, 12, P, 3), { tone: "faint" }) }) + D([[x + 7, -34, Z_PLAT - 4], [x + 7, 0, Z_PLAT - 4], [x + 7, 34, Z_PLAT - 4], [x + 7, 56, Z_PLAT - 4]], { size: 0.6, tone: "mid" });
  const root = [];
  root.push(S(k.slabOf({ x: -20, y: -42, w: 30, d: 104, r: 1 }, 10, Z_PLAT - 14, P, 2), { tone: "hi" }));
  for (const z of [13, 17, 21]) root.push(L(k.sideSeam({ x: -20, y: -42, w: 30, d: 104, r: 1 }, z, P, 2), { tone: "lo" }));
  root.push(S(k.slabOf({ x: -30, y: -46, w: 48, d: 112, r: 2 }, Z_PLAT - 4, 4, P, 3, 0.6), { tone: "hi", crease: "lo" }));
  return { plate: `<g data-mod="plate">${plate.join("")}</g>`, back: `<g data-mod="back" data-part="back">${jaw(-34)}</g>`, front: `<g data-mod="front" data-part="front">${jaw(10)}</g>`, root: root.join("") };
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


// --- 3D-перегляд: лопатка в затискачі як дерево деталей -------------------------------------------
const Z_TIP = 162;
const AIR_MAT = [
  ["лист хромомарганцевої сталі Cromadur, зігнутий і зварений по задній кромці"],
  ["литий нікелевий жароміцний сплав (рівноосні зерна)"],
  ["литий нікелевий сплав; пізніші серії — спрямована кристалізація (зерна вздовж лопатки)"],
  ["монокристал нікелевого сплаву з ≈3 % ренію: без меж зерен, тому не повзе при ≈1 300 K"],
];
const AIR_FUNC = [
  "Порожнисте перо: повітря з компресора проходить усередині від хвостовика до кінця й забирає тепло зі стінок.",
  "Лите перо з рядом круглих каналів уздовж висоти: повітря з-за компресора проходить ними й виходить на кінці лопатки.",
  "Лите перо з трьома порожнинами; у передній стоїть вставка, з якої повітря б'є струменями в гарячу стінку зсередини.",
  "Звивисті канали всередині, ряди отворів плівкового охолодження зовні: повітря виходить на поверхню й укриває її шаром, холоднішим за газ.",
];
/** Потік для 3D: газ обтікає перо на кількох висотах, охолоджувальне повітря йде вгору каналами. */
function bladeFlow(v) {
  const r1 = (x) => Math.round(x * 10) / 10;
  const gasXY = (x0, sign) => {
    const out = [];
    for (let y = 140; y >= -70; y -= 4) {
      const t = (60 - y) / C;
      let x = x0;
      if (t > -0.6 && t < 1.6) {
        const tt = Math.min(1, Math.max(0, t));
        x = x0 + camber(tt) * Math.exp(-((t - 0.5) ** 2) / 0.6) + (t > 1 ? (t - 1) * -26 : 0);
        const [sx] = surface(tt, sign, -4);
        if (t >= 0 && t <= 1 && sign * (x - sx) < 0) x = sx;
      } else if (t >= 1.6) x = x0 - 15.6;
      out.push([x, y]);
    }
    return out;
  };
  const paths = [];
  for (const z of [42, 60, 78, 94, 116, 136, 154])
    for (const [x0, sg] of [[-52, -1], [-40, -1], [-28, -1], [-18, -1], [26, 1], [38, 1], [50, 1], [62, 1]])
      paths.push({ kind: "hot", speed: 130, n: 24, pts: gasXY(x0, sg).map(([x, y]) => [r1(x), y, z]) });
  // охолоджувальне повітря: з плити крізь хвостовик угору кожним каналом
  const up = (x, y, z1, tail) => {
    const pts = [[-5, y, 0], [-5, y, 12], [x, y, Z_PLAT], [x, y, z1]];
    return { kind: "cool", speed: 70, n: 22, pts: pts.concat(tail ?? [[x, y, z1 + 18]]).map((p) => p.map(r1)) };
  };
  const chans = [];
  for (const [t0, t1] of v.cav ?? []) {
    const k = t1 - t0 > 0.5 ? 4 : 1;
    for (let j = 0; j < k; j++) chans.push(t0 + ((j + 0.5) / k) * (t1 - t0));
  }
  for (const t of v.holes ?? []) chans.push(t);
  for (const t of chans) { const [x, y] = surface(t, 0); paths.push(up(x, y, Z_TIP)); }
  if (v.film) {
    // плівка: з каналу крізь отвір на поверхню й далі вздовж неї за потоком
    for (const side of [1, -1]) for (const t of side > 0 ? [0.02, 0.08, 0.3, 0.5] : [0.02, 0.12, 0.4]) for (const z of [52, 80, 108, 136]) {
      const [cx, cy] = surface(t, 0);
      const pts = [[cx, cy, z - 6]];
      for (let u = t; u <= 1.001; u += 0.06) { const [x, y] = surface(Math.min(1, u), side, -1.6); pts.push([x, y, z]); }
      const [ex, ey] = surface(1, side, -1.6);
      pts.push([ex - 6, ey - 20, z]);
      paths.push({ kind: "cool", speed: 90, n: 6, pts: pts.map((p) => p.map(r1)) });
    }
  }
  return { paths };
}

function bladeApp(v, i, DATA, TEMPS) {
  const metal = v.tbc ? 1.4 : 0;
  const holes = [];
  for (const [t0, t1] of v.cav ?? []) holes.push(pts(outline(v.wall + metal, t0, t1, 20)));
  for (const t of v.holes ?? []) {
    const [cx, cy] = surface(t, 0);
    const r = Math.min(2.6, thick(t) / 4);
    holes.push(pts(Array.from({ length: 20 }, (_, k) => [cx + r * Math.cos((k / 20) * 2 * Math.PI), cy + r * Math.sin((k / 20) * 2 * Math.PI)])));
  }
  const airfoil = { t: "ext", shape: pts(outline(metal)), holes, z0: Z_PLAT, z1: Z_TIP, m: "hot" };
  const film = [];
  if (v.film) for (const side of [1, -1]) for (const t of side > 0 ? [0.02, 0.08, 0.3, 0.5] : [0.02, 0.12, 0.4]) for (let z = Z_PLAT + 8; z < Z_TIP - 4; z += 7) { const [x, y] = surface(t, side, -0.15); film.push([Math.round(x * 100) / 100, Math.round(y * 100) / 100, z]); }
  // ялинковий хвостовик у площині (x, z), видавлений уздовж y
  const fir = [];
  const xc = -5, top = Z_PLAT - 4, bot = 10, step = (top - bot) / 3.4;
  fir.push([xc - 7, top]);
  for (let k = 0; k < 3; k++) { const z = top - step * (k + 0.55); fir.push([xc - (13 - 2 * k), z], [xc - (8 - 1.5 * k), z - step * 0.5]); }
  fir.push([xc - 4.5, bot], [xc + 4.5, bot]);
  for (let k = 2; k >= 0; k--) { const z = top - step * (k + 0.55); fir.push([xc + (8 - 1.5 * k), z - step * 0.5], [xc + (13 - 2 * k), z]); }
  fir.push([xc + 7, top]);
  const bladeKids = [
    { id: "airfoil", name: "Перо", func: AIR_FUNC[i], mat: AIR_MAT[i], geo: [airfoil, ...(film.length ? [{ t: "dots", pts: film, r: 0.75, m: "hole" }] : [])], ex: [0, 0, 46], facts: [["Хорда", `${C} од.`], ...(v.cav ? [["Порожнин", String(v.cav.length)]] : []), ...(v.holes ? [["Каналів", String(v.holes.length)]] : []), ...(film.length ? [["Отворів плівкового охолодження (на моделі)", String(film.length)]] : [])] },
  ];
  if (v.tbc) bladeKids.push({ id: "tbc", name: "Теплозахисне покриття", func: "Керамічний шар 0,1–0,3 мм на металевому підшарі. Кераміка погано проводить тепло, тож метал під нею на 100–150 K холодніший за поверхню.", mat: ["ZrO₂ із 7–8 % Y₂O₃ (YSZ), напилене електронним променем стовпчиками — щоб не тріскалося від нагрівання", "підшар MCrAlY: тримає кераміку й захищає метал від окислення"], geo: [{ t: "ext", shape: pts(outline(0)), holes: [pts(outline(1.4))], z0: Z_PLAT, z1: Z_TIP, m: "tbc" }], ex: [0, 0, 104] });
  if (v.insert) {
    const [t0, t1] = v.cav[0];
    const ins = pts(outline(v.wall + 3.2, t0 + 0.02, t1 - 0.02, 16));
    const insIn = pts(outline(v.wall + 4.1, t0 + 0.03, t1 - 0.03, 16));
    const jets = [];
    for (let z = Z_PLAT + 6; z < Z_TIP - 8; z += 6) for (const t of [t0 + 0.05, (t0 + t1) / 2]) { const [x, y] = surface(t, 1, v.wall + 3.25); jets.push([Math.round(x * 100) / 100, Math.round(y * 100) / 100, z]); }
    bladeKids.push({ id: "insert", name: "Вставка струминного обдуву", func: "Тонкостінна трубка з рядами дрібних отворів: повітря з неї б'є струменями в гарячу стінку зсередини й знімає тепло в кілька разів краще, ніж простий протік.", mat: ["тонкий лист нікелевого сплаву"], geo: [{ t: "ext", shape: ins, holes: [insIn], z0: Z_PLAT - 10, z1: Z_TIP - 3, m: "insert" }, { t: "dots", pts: jets, r: 0.55, m: "hole" }], ex: [0, 0, 150] });
  }
  bladeKids.push(
    { id: "platform", name: "Полиця", func: "Полиці сусідніх лопаток змикаються у внутрішню стінку газового каналу й не пускають гарячий газ до диска.", mat: AIR_MAT[i], geo: [{ t: "box", min: [-30, -46, Z_PLAT - 4], max: [18, 66, Z_PLAT], m: "hot" }], ex: [0, 0, 8] },
    { id: "root", name: "Ялинковий хвостовик", func: "Хвостовик входить у паз диска; три пари зубців ділять між собою відцентрову силу лопатки (тонни при ≈10 000 об/хв). Знизу крізь нього заходить охолоджувальне повітря.", mat: AIR_MAT[i], geo: [{ t: "ext", shape: pts(fir), z0: -62, z1: 42, ax: "y", m: "hot" }], ex: [0, 0, -22] },
  );
  const jaw = (id, name, x, ex) => ({ id, name, func: "Щока затискача: разом із другою стискає ялинковий хвостовик, як паз диска турбіни.", mat: ["конструкційна сталь"], geo: [{ t: "box", min: [x, -44, 6], max: [x + 14, 64, Z_PLAT - 4], m: "fixture" }, { t: "dots", pts: [-34, 0, 34, 56].map((y) => [x + 7, y, Z_PLAT - 4]), r: 1.6, m: "hole" }], ex });
  return {
    frame: "z", cutSingle: true,
    cut: [[0, 0, -1, Z_CUT]],
    runLabel: "Подати газ",
    spools: [{ id: "gas", rpm: 1, tau: 0.7, text: `газ ${TEMPS[i].gas} K · охолоджувальне повітря ${Math.round(TEMPS[i].cool)} K` }],
    flow: bladeFlow(v),
    view: [0.85, 1.35, 1.15],
    root: {
      id: "rig", name: "Лопатка турбіни ВТ на стенді", kicker: v.label,
    sound: { roar: 0.6, hiss: 0.6 },
      func: "Робоча лопатка першого ступеня турбіни високого тиску в затискачі стенда. Площина розрізу — посередині висоти пера: видно стінки й канали охолодження.",
      mat: AIR_MAT[i],
      facts: [["Двигун", DATA[i].name], ["Газ перед турбіною", `${TEMPS[i].gas} K${TEMPS[i].est ? " (оцінка)" : ""}`], ["Охолоджувальне повітря", `${Math.round(TEMPS[i].cool)} K`], ["Плавлення нікелю", `${NI_MELT} K`]],
      kids: [
        { id: "blade", name: "Лопатка", func: "Перо, полиця й ялинковий хвостовик — одна відливка (у 1944 р. — зварена з листа). Повітря на охолодження заходить знизу крізь хвостовик.", mat: AIR_MAT[i], kids: bladeKids, ex: [0, 0, 74] },
        jaw("front", "Передня щока затискача", 10, [40, 0, 0]),
        jaw("back", "Задня щока затискача", -34, [-40, 0, 0]),
        { id: "plate", name: "Плита з підводом повітря", func: "Основа затискача: крізь неї до хвостовика підходить охолоджувальне повітря.", mat: ["конструкційна сталь"], geo: [{ t: "box", min: [-38, -52, 0], max: [26, 72, 6], m: "fixture" }, { t: "lathe", ax: "z", poly: [[6, 0], [12, 0], [12, 4], [6, 4]], m: "brass", at: [[18, 62]], seg: 24 }], ex: [0, 0, -16] },
      ],
    },
  };
}

export function build() {
  const DATA = engineData();
  const H5 = holder();
  const LANES = lanes().map((pts) => pts.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]));
  const TEMPS = DATA.map((d) => ({ gas: d.t4, cool: d.st.T3, est: d.t4est }));
  const svg = k.figureSvg({
    width: W,
    height: H,
    label: "Лопатка турбіни високого тиску в затискачі стенда, зрізана посередині висоти: видно стінки й канали охолодження. Поруч — шкала з двома термометрами: газ перед турбіною й охолоджувальне повітря, світла риска — температура плавлення нікелю.",
    body: [bench(), `<g class="je-flow je-flow-back" aria-hidden="true"></g>`, `<g class="je-parts">`, `<g data-mod="board">${board()}</g>`, H5.plate, H5.back, `<g data-mod="blade" data-part="blade">${H5.root}${VARIANTS.map(bladeSvg).join("")}</g>`, H5.front, `</g>`, `<g class="je-flow" aria-hidden="true"></g>`],
  });
  const captions = [
    "Jumo 004B: лопатки зігнуті з листа хромомарганцевої сталі (Cromadur) і зварені; всередину йде повітря з компресора. Газ перед турбіною — лише ≈1050 K, і все одно лопатки м'якли при різкому збільшенні газу.",
    "JT8D: лита лопатка з нікелевого сплаву; частину повітря з-за компресора, минаючи камеру, подають на охолодження першого ступеня турбіни.",
    "JT9D: всередині порожнини стоїть тонкостінна вставка з отворами — струмені повітря б'ють у гарячу стінку зсередини (струминне охолодження).",
    "Сучасна лопатка ВТ: монокристал, звивисті канали, ряди отворів плівкового охолодження, що вкривають поверхню шаром холоднішого повітря, і керамічне теплозахисне покриття (ТЗП). Газ гарячіший за точку плавлення самого металу.",
  ];
  const note = " Температура газу — та сама, що в таблиці на Рис. 1 (для JT8D, JT9D, PW1100G — оцінки), охолоджувального повітря — температура за компресором з моделі. Перерізи лопаток схематичні: показано принцип, а не креслення конкретної деталі.";
  const legend = `${EXPLODE_UI(DATA.map((d) => d.year), "затискач")}<span class="iso-keys"><span class="iso-key"><svg class="iso-swatch je-sw" data-flow="hot" viewBox="0 0 16 10" aria-hidden="true"><path d="M1.5 5h13"/></svg>газ перед турбіною</span><span class="iso-key"><svg class="iso-swatch je-sw" data-flow="bypass" viewBox="0 0 16 10" aria-hidden="true"><path d="M1.5 5h13"/></svg>охолоджувальне повітря (з-за компресора)</span><span class="iso-key"><svg class="iso-swatch" data-mark="lit" viewBox="0 0 16 10" aria-hidden="true"><path d="M1.5 5h13"/></svg>1728 K — плавиться чистий нікель</span></span><span class="iso-caption je-caption"></span><span class="je-sources">Джерела: порожнисті охолоджувані лопатки Jumo 004 з Cromadur — <a href="https://en.wikipedia.org/wiki/Junkers_Jumo_004">Junkers Jumo 004</a>; повітря на охолодження першого ступеня JT8D — <a href="https://en.wikipedia.org/wiki/Pratt_%26_Whitney_JT8D">Pratt &amp; Whitney JT8D</a>; струминні вставки в лопатках JT9D — дослідження NASA (<a href="https://www.science.gov/topicpages/j/jt9d+jet+engine">science.gov</a>).</span>`;
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
const OFF = { blade: [0, 0, 58], front: [34, 0, 0], back: [-30, 0, 0] };
const PART_TEXT = { blade: ["Лопатка", "перо, полиця й ялинковий хвостовик; хвостовик тримає лопатку в диску проти відцентрової сили"], front: ["Передня щока затискача", "разом із задньою стискає хвостовик, як паз диска турбіни"], back: ["Задня щока затискача", "друга половина паза під хвостовик"], plate: ["Плита з підводом повітря", "крізь неї до хвостовика підходить охолоджувальне повітря"], board: ["Шкала з термометрами", "газ перед турбіною, повітря на охолодження і риска плавлення нікелю"] };
const st5 = { blade: { x: 0, v: 0, delay: 0 }, front: { x: 0, v: 0, delay: 0 }, back: { x: 0, v: 0, delay: 0 } };
const partsEl = svg.querySelector(".je-parts"), explodeBtn = document.querySelector(".je-explode"), modsEl = document.querySelector(".je-mods");
let apart = false, focus = null, pinned = null;
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
  let share = 0;
  for (const id of ["blade", "front", "back"]) {
    const s = st5[id], want = apart ? 1 : 0;
    if (s.delay > 0) { s.delay -= dt; moving = true; }
    else if (calm) { s.x = want; s.v = 0; }
    else {
      for (let k = 0; k < 4; k++) { s.v += ((want - s.x) * 70 - s.v * 15) * dt / 4; s.x += s.v * dt / 4; }
      if (Math.abs(want - s.x) < 1e-3 && Math.abs(s.v) < 1e-3) { s.x = want; s.v = 0; } else moving = true;
    }
    svg.querySelector('[data-part="' + id + '"]').setAttribute("transform", translateAlong(P, OFF[id].map((c) => c * s.x)));
    share = Math.max(share, Math.abs(s.x));
  }
  const fo = String(Math.max(0, 1 - share * 3));
  flow.setAttribute("opacity", fo); flowBack.setAttribute("opacity", fo);
  if (!calm) streaks(clock);
  frame = visible && (!calm || moving) ? requestAnimationFrame(tick) : 0;
}
function run() { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } }
function select(i, user) { current = (i + 4) % 4; if (user) { touring = false; idle = 0; } say(); run(); }
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("click", () => select(current + 1, true));
stage.addEventListener("keydown", (e) => { let to = null; if (e.key === "ArrowRight" || e.key === "ArrowUp") to = Math.min(3, current + 1); if (e.key === "ArrowLeft" || e.key === "ArrowDown") to = Math.max(0, current - 1); if (e.key >= "1" && e.key <= "4") to = Number(e.key) - 1; if (to === null) return; e.preventDefault(); select(to, true); });
buttons.forEach((b, i) => b.addEventListener("click", () => select(i, true)));
still.addEventListener("change", () => { touring = !still.matches; run(); });
function setFocus(id, pin) {
  if (pin) pinned = pinned === id ? null : id;
  focus = id ?? pinned;
  partsEl.querySelectorAll("[data-mod]").forEach((g) => g.toggleAttribute("data-on", g.dataset.mod === focus));
  partsEl.toggleAttribute("data-focus", !!focus);
  modsEl.querySelectorAll("[data-mod-btn]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.modBtn === focus)));
  if (focus) { readout.textContent = PART_TEXT[focus][0] + "\\n" + PART_TEXT[focus][1]; readoutM.textContent = readout.textContent; } else say();
}
function toggle(on) {
  apart = on ?? !apart;
  touring = false; idle = 0;
  explodeBtn.setAttribute("aria-pressed", String(apart));
  explodeBtn.textContent = apart ? "Зібрати затискач (E)" : "Розібрати затискач (E)";
  const seq = apart ? ["blade", "front", "back"] : ["front", "back", "blade"];
  seq.forEach((id, n) => { st5[id].delay = n * 0.12; });
  run();
}
modsEl.innerHTML = ["blade", "front", "back", "plate", "board"].map((id, n) => '<button type="button" data-mod-btn="' + id + '"><b>0' + (n + 1) + "</b> " + PART_TEXT[id][0] + (id === "board" ? "" : '<i aria-hidden="true">↗</i>') + "</button>").join("");
modsEl.querySelectorAll("[data-mod-btn]").forEach((b) => {
  const id = b.dataset.modBtn;
  b.addEventListener("pointerenter", () => setFocus(id)); b.addEventListener("pointerleave", () => setFocus(null));
  b.addEventListener("focus", () => setFocus(id)); b.addEventListener("blur", () => setFocus(null));
  b.addEventListener("click", () => window.__viewer?.open(current, [id]));
});
window.addEventListener("jv-open", () => { touring = false; idle = -1e9; });
window.__viewerOpenCurrent = () => window.__viewer?.open(current, focus ? [focus] : []);
explodeBtn.addEventListener("click", () => toggle());
stage.addEventListener("keydown", (e) => { if (e.key === "e" || e.key === "E" || e.key === "у" || e.key === "У") { e.preventDefault(); toggle(); } });
window.__blade = { explode: (on) => toggle(on), select: (i) => select(i, true) };
say(); liquids(); streaks(1.7);
`;
  return figurePage({
    apps: VARIANTS.map((v, i) => bladeApp(v, i, DATA, TEMPS)),
    n: 5,
    svg,
    hint: "Клік або ← → · E — розібрати · R — 3D",
    stageLabel: "Покоління лопатки: стрілки змінюють рік",
    initial: 3,
    legend,
    intro: "Вищий тиск і вища температура перед турбіною — це і вищий ККД, і менший двигун на ту саму тягу. Межу ставить метал лопатки. Інженери обходять її повітрям, яке забирають із-за компресора й проганяють крізь лопатку.",
    script,
  });
}
