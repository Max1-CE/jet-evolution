// SPDX-FileCopyrightText: 2026 Max Kravchenko
// SPDX-License-Identifier: MIT

// Розбирання двигуна на модулі (Рис. 1–3): модулі їдуть уздовж вала, список модулів у легенді.
import { EXPLODE, MODULE_ORDER } from "./render.mjs";
import { STAND } from "./stand.mjs";
import { YEAR_BUTTONS } from "./page.mjs";

export const EXPLODE_UI = (labels, what = "двигун") => `<span class="je-years">${YEAR_BUTTONS(labels).replace(/^<span[^>]*>|<\/span>$/g, "")}<button type="button" class="je-explode" aria-pressed="false" data-what="${what}">Розібрати ${what} (E)</button><button type="button" class="je-open3d" data-open-3d>3D · обертати й розібрати (R)</button></span><span class="je-mods" role="group" aria-label="Частини"></span>`;

export const MOD_TEXT = {
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

export function explodeScript() {
  return `
const EXPLODE = ${JSON.stringify(EXPLODE)};
const MOD_TEXT = ${JSON.stringify(MOD_TEXT)};
const MODS = ${JSON.stringify(MODULE_ORDER)};
const MPU = ${STAND.M};
const explodeBtn = document.querySelector(".je-explode");
const modsEl = document.querySelector(".je-mods");
const enginesEl = svg.querySelector(".je-engines");
let apart = false, focus = null, pinned = null, explodeShare = 0;
const ex = engines.map(() => ({}));
const textOf = (i, id) => { const t = MOD_TEXT[id]; return DATA[i].bpr === 0 && t.length > 2 ? [t[2], t[3]] : [t[0], t[1]]; };
function present(i) { return engines[i].dataset.mods.split(" "); }
function order(i) { return present(i).filter((id) => Math.abs(EXPLODE[i][id] ?? 0) > 0).sort((a, b) => Math.abs(EXPLODE[i][b]) - Math.abs(EXPLODE[i][a])); }
function listMods(i) {
  modsEl.innerHTML = present(i).map((id, n) => '<button type="button" data-mod-btn="' + id + '" title="Відкрити в 3D"><b>' + String(n + 1).padStart(2, "0") + "</b> " + textOf(i, id)[0] + '<i aria-hidden="true">↗</i></button>').join("");
  modsEl.querySelectorAll("[data-mod-btn]").forEach((b) => {
    const id = b.dataset.modBtn;
    b.addEventListener("pointerenter", () => setFocus(id));
    b.addEventListener("pointerleave", () => setFocus(null));
    b.addEventListener("focus", () => setFocus(id));
    b.addEventListener("blur", () => setFocus(null));
    b.addEventListener("click", () => window.__viewer?.open(current, [id]));
  });
}
window.addEventListener("jv-open", () => { touring = false; idle = -1e9; });
window.__viewerOpenCurrent = () => window.__viewer?.open(current, focus ? [focus] : []);
engines.forEach((e) => e.querySelectorAll("[data-mod]").forEach((g) => {
  g.addEventListener("click", (ev) => { if (!apart) return; ev.stopPropagation(); window.__viewer?.open(current, [g.dataset.mod]); });
}));

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
  explodeShare = sh;
  flow.setAttribute("opacity", (flowAlpha * Math.max(0, 1 - sh * 3)).toFixed(3));
  return moving;
});
explodeBtn.addEventListener("click", () => toggle());
stage.addEventListener("keydown", (e) => { if (e.key === "e" || e.key === "E" || e.key === "у" || e.key === "У") { e.preventDefault(); toggle(); } });
window.__jet.explode = (on) => toggle(on);
`;
}
