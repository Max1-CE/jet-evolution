// SPDX-FileCopyrightText: 2026 Max Kravchenko
// SPDX-License-Identifier: MIT

// Рис. 1 — еволюція: чотири двигуни на стенді, потоки двох контурів, readout з моделі.
import { k } from "../src/kit.mjs";
import { STAND, stand, console as desk } from "../src/stand.mjs";
import { enginesSvg } from "../src/render.mjs";
import { explodeScript, EXPLODE_UI } from "../src/explode.mjs";
import { engineApp } from "../src/catalog.mjs";
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
  const legend = `${EXPLODE_UI(DATA.map((d) => d.year))}<span class="iso-keys">${FLOW_KEYS}</span><span class="iso-caption je-caption"></span><span class="je-table-wrap"><table class="je-table"></table></span>${SOURCES}`;
  return figurePage({
    apps: [0, 1, 2, 3].map(engineApp),
    n: 1,
    svg,
    hint: "Ручка або ← → · E — розібрати · R — 3D",
    stageLabel: "Перемикач року: стрілки змінюють двигун",
    initial: INITIAL,
    legend,
    intro: "Той самий стенд, той самий масштаб, чотири покоління. Передню половину двигуна знято, щоб було видно, куди йде повітря: крізь вентилятор у зовнішній контур чи крізь ядро до камери згоряння.",
    script: LIVE({ P: STAND.P, DATA, INITIAL, STAND, captions, note: NOTE() }) + explodeScript(),
  });
}

