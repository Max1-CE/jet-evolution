// Спільна оболонка сторінок серії: навігація, картка, легенда, дані для живого скрипта.
import { k, kitScript } from "./kit.mjs";
import { READOUTS } from "./model.mjs";
import { GEOMETRY } from "./engines.mjs";
import { flowLanes } from "./flow.mjs";
import { CSS, CAVITY, SITE, GAUGE, EXPLODE_CSS, PARTS_CSS } from "./style.mjs";
import { VIEWER_CSS, viewerBlock } from "./viewer.mjs";

export const SERIES = [
  { slug: "fig-1-evolution", n: 1, title: "Еволюція реактивного двигуна", short: "Еволюція", about: "Чотири двигуни на одному стенді, в одному масштабі: від Jumo 004 до двигуна з редуктором. Ступінь двоконтурності, тиск, температура, витрата палива й обидва ККД." },
  { slug: "fig-2-cycle", n: 2, title: "Цикл Брайтона: тиск і температура", short: "Цикл", about: "Манометри й термометри під станціями проточної частини: що відбувається з повітрям від входу до турбіни і чому ступінь підвищення тиску визначає термічний ККД." },
  { slug: "fig-3-propulsive", n: 3, title: "Пропульсивний ККД: швидкість струменя", short: "Струмінь", about: "Приймачі повного тиску за соплом і швидкісна дошка: чому повільніший і масивніший струмінь витрачає менше палива на ту саму тягу." },
  { slug: "fig-4-gearbox", n: 4, title: "Редуктор вентилятора", short: "Редуктор", about: "Зірчастий планетарний редуктор PW1100G на стенді: п'ять сателітів, нерухоме водило, епіцикл крутить вентилятор утричі повільніше за турбіну." },
  { slug: "fig-5-hot-section", n: 5, title: "Гаряча частина: охолодження лопатки", short: "Лопатка", about: "Лопатка турбіни в розрізі: як охолодження дозволило піднімати температуру газу вище за точку плавлення металу." },
];

export const comma = (x, n) => x.toFixed(n).replace(".", ",");

/** Дані двигунів для живого скрипта. */
export function engineData() {
  return READOUTS.map((r, i) => ({
    year: r.year, era: r.era, name: r.name, aircraft: r.aircraft,
    bpr: r.bpr, opr: r.opr, fpr: r.fpr, t4: r.t4, t4est: !!r.t4est, thrust: r.thrustKN, gear: r.gear ?? 0,
    etaT: r.etaT, etaP: r.etaP, etaO: r.cruise.etaO, tsfc: r.tsfc, tsfcStatic: r.tsfcStatic, ref: r.ref,
    vj: r.cruise.vj, v0: r.cruise.v0, vCoreCr: r.cruise.vCore, vFanCr: r.cruise.vFan,
    vCore: r.static.vCore, vFan: r.static.vFan,
    st: { T2: r.static.T2, p2: r.static.p2, Tfan: r.static.Tfan, p13: r.static.p13, T3: r.static.T3, p3: r.static.p3, T4: r.static.T4, p4: r.static.p4, T5: r.static.T5, p5: r.static.p5 },
    lanes: flowLanes(GEOMETRY[i], r),
  }));
}

function nav(current) {
  return `<nav class="je-nav" aria-label="Серія фігур"><a href="index.html" class="je-home">Реактивний двигун</a>${SERIES.map((f) => `<a href="${f.slug}.html"${f.n === current ? ' aria-current="page"' : ""}>Рис. ${f.n} · ${f.short}</a>`).join("")}</nav>`;
}

function pager(current) {
  const prev = SERIES[current - 2];
  const next = SERIES[current];
  return `<nav class="je-pager" aria-label="Сусідні фігури">${prev ? `<a href="${prev.slug}.html">← Рис. ${prev.n}. ${prev.title}</a>` : "<span></span>"}${next ? `<a href="${next.slug}.html">Рис. ${next.n}. ${next.title} →</a>` : "<span></span>"}</nav>`;
}

const SWATCH = (flow, label) => `<span class="iso-key"><svg class="iso-swatch je-sw" data-flow="${flow}" viewBox="0 0 16 10" aria-hidden="true"><path d="M1.5 5h13"/></svg>${label}</span>`;
export const FLOW_KEYS = [SWATCH("bypass", "повітря зовнішнього контуру (через вентилятор)"), SWATCH("core", "повітря ядра (компресор → камера)"), SWATCH("hot", "гарячий газ (після камери згоряння)")].join("");
export const YEAR_BUTTONS = (labels) => `<span class="je-years" role="group" aria-label="Положення ручки">${labels.map((l, i) => `<button type="button" data-year="${i}">${l}</button>`).join("")}</span>`;

/** Повна сторінка однієї фігури. */
export function figurePage({ n, svg, hint, stageLabel, valuemax = 3, initial = 0, legend, script, intro = "", apps = null }) {
  const f = SERIES[n - 1];
  const body = `${nav(n)}
<header class="je-head"><p class="je-kicker">Рис. ${n} із ${SERIES.length}</p><h1>${f.title}</h1>${intro ? `<p class="je-intro">${intro}</p>` : ""}</header>
<figure class="iso-figure je-figure">
  <div class="iso-plate">
    <div class="iso-plate-corners" aria-hidden="true">
      <span class="iso-plate-corner" data-corner="fig">Рис. ${n}</span>
      <span class="iso-plate-corner" data-corner="title">${f.title}</span>
      <span class="iso-plate-corner" data-corner="hint">${hint}</span>
      <span class="iso-plate-corner je-readout" data-corner="readout" data-readout></span>
    </div>
    <div class="iso-stage" tabindex="0" role="slider" aria-label="${stageLabel}" aria-valuemin="0" aria-valuemax="${valuemax}" aria-valuenow="${initial}">${svg}</div>
    <div class="je-readout-m" aria-hidden="true"></div>
  </div>
  <figcaption class="iso-legend">${legend}</figcaption>
</figure>
${pager(n)}${apps ? viewerBlock(apps) : ""}`;
  return wrap(`Рис. ${n}. ${f.title}`, body, kitScript() + script);
}

export function wrap(title, body, script = "") {
  return k
    .pageHtml({ title, theme: "light", body, script, width: 960 })
    .replace('<html lang="en">', '<html lang="uk">')
    .replace("</style>", `${CSS}${CAVITY}${SITE}${GAUGE}${EXPLODE_CSS}${PARTS_CSS}${VIEWER_CSS}</style>`);
}
