// Рис. 1 — еволюція: чотири двигуни на стенді, потоки двох контурів, readout з моделі.
import { k } from "../src/kit.mjs";
import { STAND, stand, console as desk } from "../src/stand.mjs";
import { enginesSvg, EXPLODE } from "../src/render.mjs";
import { LIVE } from "../src/live.mjs";
import { SLOW } from "../src/flow.mjs";
import { figurePage, engineData, comma, FLOW_KEYS, YEAR_BUTTONS } from "../src/page.mjs";

export const SOURCES = `<span class="je-sources">Джерела даних: Jumo 004B — <a href="https://deutsches-museum.de/en/flugwerft-schleissheim/ausstellung/flugantriebe-und-raketen/jumo-004">Deutsches Museum</a> (π 3,1, 21,2 кг/с, 143 кг/(кН·год)), T<sub>г</sub> 1048 K — <a href="https://www.tfd.chalmers.se/~thgr/gasturbiner/Exam/Exam_2005.doc">Chalmers, MTF171</a>; JT8D-7 — <a href="https://engineering.purdue.edu/~propulsi/propulsion/jets/tfans/jt8d.html">Purdue AAE</a> (m 1,07, π 15,4, π<sub>в</sub> 1,93, ∅ 40,5″); крейсерські C<sub>уд</sub> JT8D-15A і JT9D-59A — <a href="https://www.fzt.haw-hamburg.de/pers/Scholz/links/Data_for_some_Civil_Gas_Turbine_Engines.html">HAW Hamburg / USAF Engine Handbook 1991</a>; JT9D і PW1100G — m, π, ∅ вентилятора з відкритих довідок. T<sub>г</sub> для JT8D, JT9D, PW1100G і C<sub>уд</sub> PW1100G — оцінки (*): виробники їх не публікують. Тяга на стрілочному індикаторі — злітна статична за даними (8,8 / 62 / 194 / 147 кН).</span>`;

export const NOTE = () =>
  ` Числа пораховано з моделі: ідеальний ηt = 1 − π^(−0,4/1,4); ηp = 2/(1 + vj/v0) при v0 = 236 м/с (M 0,8, 11 км), vj — еквівалентна швидкість струменя v0 + F/ṁ. Питому витрату палива рахує простий цикл з ККД вузлів своєї епохи; * — оцінка. Частинки рухаються в ${SLOW} разів повільніше, ніж повітря на стенді; їх кількість у кожному контурі пропорційна витраті.`;

export const DESK = () => desk();

export function build() {
  const INITIAL = 3;
  const DATA = engineData();
  const svg = k.figureSvg({
    width: STAND.W,
    height: STAND.H,
    label: "Випробувальний стенд з двигуном у розрізі: передня половина знята, видно проточну частину. Синім — повітря зовнішнього контуру, бурштиновим — повітря ядра, яке після камери згоряння стає гарячим газом. Ручка на пульті перемикає двигун: Jumo 004B (1944), JT8D (1965), JT9D (1970), PW1100G (сьогодні).",
    body: [stand(), enginesSvg(INITIAL), `<g class="je-flow" aria-hidden="true"></g>`, desk()],
  });
  const captions = [
    `Jumo 004B (1944): усе повітря йде крізь ядро. Восьмиступінчастий осьовий компресор стискає лише в 3,1 раза, тож термічний ККД малий, а струмінь швидкий (≈${Math.round(DATA[0].vj)} м/с на крейсері) — пропульсивний ККД теж низький.`,
    "JT8D (1965): два ступені вентилятора; приблизно стільки ж повітря обходить ядро, скільки проходить крізь нього (m ≈ 1). Потоки змішуються в спільному соплі; тиск у 5 разів вищий, ніж у 1944-му.",
    `JT9D (1970): величезний одноступінчастий вентилятор жене в обхід уп'ятеро більше повітря, ніж крізь ядро. Повільніший і масивніший струмінь піднімає пропульсивний ККД до ≈${comma(DATA[2].etaP, 2)}.`,
    `PW1100G (сьогодні): редуктор ≈3:1 дає вентилятору обертатися повільно, а турбіні й КНТ — швидко. m ≈ 12,5: ядро маленьке й гаряче, π ≈ 45, струмінь лише на ≈${Math.round(DATA[3].vj - DATA[3].v0)} м/с швидший за політ.`,
  ];
  const legend = `<span class="je-years">${YEAR_BUTTONS(DATA.map((d) => d.year)).replace(/^<span[^>]*>|<\/span>$/g, "")}<button type="button" class="je-explode" aria-pressed="false">Розібрати двигун (E)</button></span><span class="je-mods" role="group" aria-label="Модулі двигуна"></span><span class="iso-keys">${FLOW_KEYS}</span><span class="iso-caption je-caption"></span><span class="je-table-wrap"><table class="je-table"></table></span>${SOURCES}`;
  return figurePage({
    n: 1,
    svg,
    hint: "Ручка або ← → · E — розібрати",
    stageLabel: "Перемикач року: стрілки змінюють двигун",
    initial: INITIAL,
    legend,
    intro: "Той самий стенд, той самий масштаб, чотири покоління. Передню половину двигуна знято, щоб було видно, куди йде повітря: крізь вентилятор у зовнішній контур чи крізь ядро до камери згоряння.",
    script: LIVE({ P: STAND.P, DATA, INITIAL, STAND, captions, note: NOTE() }) + explodeScript(),
  });
}

const MOD_TEXT = {
  nac: ["Гондола й обичайка вентилятора", "тримає вентилятор у каналі; задня кромка — сопло зовнішнього контуру", "Корпус двигуна", "зовнішня обшивка, вхідні стійки й корпус компресора"],
  cowl: ["Розділювач і капот ядра", "тут потік ділиться на зовнішній контур і ядро; всередині — корпус газогенератора"],
  fan: ["Кок і вентилятор", "з напрямним апаратом за ним; дає більшу частину тяги", "Кок", "обтічник, усередині якого стоїть пусковий двигун Ріделя"],
  gear: ["Редуктор", "зірчаста передача ≈3:1 між валом ТНТ і вентилятором"],
  lpc: ["Компресор низького тиску", "на одному валу з вентилятором і турбіною низького тиску"],
  hpc: ["Компресор високого тиску", "найбільше підвищення тиску; на валу турбіни ВТ", "Осьовий компресор", "вісім ступенів, π ≈ 3,1"],
  comb: ["Камера згоряння", "форсунки, жарова труба; тепло додається майже без зміни тиску", "Камери згоряння", "шість трубчастих камер навколо вала"],
  turb: ["Турбіни", "ВТ крутить компресор ВТ, НТ — вентилятор і КНТ", "Турбіна", "один ступінь з порожнистими лопатками, які охолоджує повітря"],
  noz: ["Сопло й хвостовий конус", "розганяють газ ядра до швидкості струменя", "Сопло з рухомим конусом", "«цибулина» зсувається й змінює площу виходу"],
  shaft: ["Вали", "лишаються на місці: модулі знімають з них"],
};

function explodeScript() {
  return `
const EXPLODE = ${JSON.stringify(EXPLODE)};
const MOD_TEXT = ${JSON.stringify(MOD_TEXT)};
const MODS = ${JSON.stringify(["nac", "cowl", "fan", "gear", "lpc", "hpc", "comb", "turb", "noz", "shaft"])};
const MPU = ${STAND.M};
const explodeBtn = document.querySelector(".je-explode");
const modsEl = document.querySelector(".je-mods");
const enginesEl = svg.querySelector(".je-engines");
let apart = false, focus = null, pinned = null;
const ex = engines.map(() => ({}));
const textOf = (i, id) => { const t = MOD_TEXT[id]; return DATA[i].bpr === 0 && t.length > 2 ? [t[2], t[3]] : [t[0], t[1]]; };
function present(i) { return engines[i].dataset.mods.split(" "); }
function order(i) { return present(i).filter((id) => Math.abs(EXPLODE[i][id] ?? 0) > 0).sort((a, b) => Math.abs(EXPLODE[i][b]) - Math.abs(EXPLODE[i][a])); }
function listMods(i) {
  modsEl.innerHTML = present(i).map((id, n) => '<button type="button" data-mod-btn="' + id + '"><b>' + String(n + 1).padStart(2, "0") + "</b> " + textOf(i, id)[0] + "</button>").join("");
  modsEl.querySelectorAll("[data-mod-btn]").forEach((b) => {
    const id = b.dataset.modBtn;
    b.addEventListener("pointerenter", () => setFocus(id));
    b.addEventListener("pointerleave", () => setFocus(null));
    b.addEventListener("focus", () => setFocus(id));
    b.addEventListener("blur", () => setFocus(null));
    b.addEventListener("click", () => { if (!apart) toggle(true); setFocus(id, true); });
  });
}

function setFocus(id, pin) {
  if (pin) pinned = pinned === id ? null : id;
  focus = id ?? pinned;
  engines.forEach((e) => e.querySelectorAll("[data-mod]").forEach((g) => g.toggleAttribute("data-on", g.dataset.mod === focus)));
  enginesEl.toggleAttribute("data-focus", !!focus);
  modsEl.querySelectorAll("[data-mod-btn]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.modBtn === focus)));
  if (focus) {
    const t = textOf(current, focus);
    readout.textContent = DATA[current].name + " · " + t[0] + "\\n" + t[1];
    readoutM.textContent = readout.textContent;
  } else reSay();
}
function reSay() {
  const d = DATA[current];
  const line = "m " + comma(d.bpr, d.bpr ? 1 : 0) + " · π " + comma(d.opr, d.opr < 10 ? 2 : 0) + " · Tг " + d.t4 + " K · Cуд " + comma(d.tsfc, 2) + " кг/(кгс·год) · ηt " + comma(d.etaT, 2) + " · ηp " + comma(d.etaP, 2);
  readout.textContent = (apart ? "розібрано · " : "") + d.year + " · " + d.name + " · " + d.era + "\\n" + line;
  readoutM.textContent = readout.textContent;
}
function toggle(on) {
  apart = on ?? !apart;
  explodeBtn.setAttribute("aria-pressed", String(apart));
  explodeBtn.textContent = apart ? "Зібрати двигун (E)" : "Розібрати двигун (E)";
  touring = false; idle = 0;
  engines.forEach((e, i) => {
    const seq = order(i);
    const list = apart ? seq.slice().reverse() : seq;
    list.forEach((id, n) => { ex[i][id] = ex[i][id] || { x: 0, v: 0 }; ex[i][id].delay = n * 0.07; });
  });
  if (!focus) reSay();
  run();
}
HOOKS.say.push((i) => { listMods(i); pinned = null; setFocus(null); });
HOOKS.tick.push((dt, calm) => {
  let moving = false, share = 0, count = 0;
  engines.forEach((e, i) => {
    for (const id of present(i)) {
      const off = EXPLODE[i][id] ?? 0;
      if (!off) continue;
      const st = ex[i][id] = ex[i][id] || { x: 0, v: 0, delay: 0 };
      const want = apart ? 1 : 0;
      if (st.delay > 0) { st.delay -= dt; moving = true; }
      else if (calm) { st.x = want; st.v = 0; }
      else {
        for (let k = 0; k < 4; k++) { st.v += ((want - st.x) * 70 - st.v * 15) * dt / 4; st.x += st.v * dt / 4; }
        if (Math.abs(want - st.x) < 1e-3 && Math.abs(st.v) < 1e-3) { st.x = want; st.v = 0; } else moving = true;
      }
      const tr = translateAlong(P, [0, off * MPU * st.x, 0]);
      e.querySelectorAll('[data-mod="' + id + '"]').forEach((g) => g.setAttribute("transform", tr));
      if (i === current) { share += Math.min(1, Math.abs(st.x)); count++; }
    }
  });
  const sh = count ? share / count : 0;
  flow.setAttribute("opacity", (flowAlpha * Math.max(0, 1 - sh * 3)).toFixed(3));
  return moving;
});
explodeBtn.addEventListener("click", () => toggle());
stage.addEventListener("keydown", (e) => { if (e.key === "e" || e.key === "E" || e.key === "у" || e.key === "У") { e.preventDefault(); toggle(); } });
window.__jet.explode = (on) => toggle(on);
`;
}
