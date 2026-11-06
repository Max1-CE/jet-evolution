// SPDX-FileCopyrightText: 2026 Max Kravchenko
// SPDX-License-Identifier: MIT

// Модель еволюції реактивного двигуна: дані двигунів + простий цикл Брайтона.
// Чистий модуль: без DOM, без побічних ефектів. Використовується і збіркою, і сторінкою.
//
// Що рахує:
//   η_t = 1 − π^(−(γ−1)/γ)        — ідеальний термічний ККД циклу Брайтона (γ = 1.4)
//   η_p = 2 / (1 + v_j / v_0)      — пропульсивний ККД; v_j — еквівалентна швидкість
//                                    струменя v_0 + F/ṁ_Σ (тяга на кг усього повітря)
//   TSFC (крейсер)                 — з реального циклу з ККД вузлів, щоб звірити з даними
//
// Крейсерські умови однакові для всіх епох, щоб порівняння було чесним:
//   H = 11 км (МСА: T = 216.65 K, p = 22.63 кПа), M = 0.80 → v_0 ≈ 236 м/с.

export const GAMMA = 1.4;
export const CP_COLD = 1005; // Дж/(кг·К)
export const CP_HOT = 1148;
export const G_HOT = 1.333;
export const LHV = 43.1e6; // гас, Дж/кг
export const G0 = 9.80665;

export const CRUISE = { T: 216.65, p: 22632, M: 0.8 };
export const STATIC = { T: 288.15, p: 101325, M: 0 };

// 1 кг/(кгс·год) = 1 lb/(lbf·h) = 28.33 г/(кН·с)
export const TSFC_UNIT = 1 / (G0 * 3600); // кг/(Н·с) в одиниці кг/(кгс·год)

// Дані. `src` — звідки число; `est: true` — оцінка (немає відкритого джерела).
// d — діаметр вентилятора (або компресора), L — довжина, м. Розміри — для креслення в масштабі.
export const ENGINES = [
  {
    id: "jumo",
    year: "~1944",
    era: "турбореактивний, осьовий компресор",
    name: "Junkers Jumo 004B",
    aircraft: "Me 262",
    bpr: 0,
    opr: 3.14,
    fpr: 1,
    t4: 1048,
    thrustKN: 8.8,
    massFlow: 21.2,
    stages: { fan: 0, lpc: 0, hpc: 8, hpt: 1, lpt: 0 },
    d: 0.76,
    L: 3.86,
    geared: false,
    // ККД вузлів епохи: перші осьові компресори, неохолоджена турбіна
    eff: { inlet: 0.95, ec: 0.81, et: 0.82, burner: 0.94, dpb: 0.06, nozzle: 0.95 },
    cruiseT4: 1.0,
    ref: { tsfcStatic: 1.4, src: "Deutsches Museum: 143 кг/(кН·год) при 8,9 кН; π 3,14; T4 1048 K; 21,2 кг/с" },
  },
  {
    id: "jt8d",
    year: "~1965",
    era: "мала двоконтурність",
    name: "Pratt & Whitney JT8D-7",
    aircraft: "Boeing 727, DC-9",
    bpr: 1.07,
    opr: 15.4,
    fpr: 1.93,
    t4: 1250,
    t4est: true,
    thrustKN: 62.3,
    stages: { fan: 2, lpc: 4, hpc: 7, hpt: 1, lpt: 3 },
    d: 1.03,
    L: 3.14,
    geared: false,
    eff: { inlet: 0.98, ec: 0.87, et: 0.88, burner: 0.98, dpb: 0.05, nozzle: 0.97 },
    cruiseT4: 0.9,
    ref: { tsfcCruise: 0.779, src: "Purdue: ступінь 1,07, π 15,4, π_в 1,93, ∅ 40,5″; TSFC 0,779 — JT8D-15A, M 0,8, 9,1 км (Engine Handbook, USAF 1991)" },
  },
  {
    id: "jt9d",
    year: "~1970",
    era: "перший з великою двоконтурністю",
    name: "Pratt & Whitney JT9D-3A",
    aircraft: "Boeing 747-100",
    bpr: 5.0,
    opr: 22,
    fpr: 1.6,
    t4: 1500,
    t4est: true,
    thrustKN: 193.5,
    stages: { fan: 1, lpc: 3, hpc: 11, hpt: 2, lpt: 4 },
    d: 2.34,
    L: 3.25,
    geared: false,
    eff: { inlet: 0.99, ec: 0.885, et: 0.895, burner: 0.99, dpb: 0.05, nozzle: 0.98 },
    cruiseT4: 0.88,
    ref: { tsfcCruise: 0.646, src: "Ступінь ≈5 (JT9D-59A: 4,9), π 21,5–24,5 по серії; TSFC 0,646 — JT9D-59A, M 0,85, 10,7 км" },
  },
  {
    id: "gtf",
    year: "сьогодні",
    era: "з редуктором вентилятора",
    name: "Pratt & Whitney PW1100G-JM",
    aircraft: "Airbus A320neo",
    bpr: 12.5,
    opr: 45,
    fpr: 1.42,
    t4: 1850,
    t4est: true,
    thrustKN: 147,
    stages: { fan: 1, lpc: 3, hpc: 8, hpt: 2, lpt: 3 },
    gear: 3.06,
    d: 2.06,
    L: 3.4,
    geared: true,
    eff: { inlet: 0.995, ec: 0.91, et: 0.91, burner: 0.995, dpb: 0.04, nozzle: 0.985, gear: 0.995 },
    cruiseT4: 0.86,
    ref: { tsfcCruise: 0.5, est: true, src: "Ступінь 12,5, π ≈40–47, ∅ 81″ (2,06 м), редуктор ≈3:1; TSFC — оцінка: на ~15 % нижче за V2500 (0,574)" },
  },
];

const ram = (M, g = GAMMA) => 1 + ((g - 1) / 2) * M * M;
const k = (g) => (g - 1) / g;

/** Повний розрахунок однієї точки циклу. Потоки — на 1 кг/с повітря ядра. */
export function cycleOf(engine, flight = CRUISE) {
  const e = engine.eff;
  const a0 = Math.sqrt(GAMMA * 287 * flight.T);
  const v0 = flight.M * a0;
  const T02 = flight.T * ram(flight.M);
  const p02 = flight.p * ram(flight.M) ** (GAMMA / (GAMMA - 1)) * e.inlet;
  const fpr = engine.bpr > 0 ? engine.fpr : 1;
  // вентилятор (на весь потік) і компресор ядра; політропні ККД
  const Tfan = T02 * fpr ** (k(GAMMA) / e.ec);
  const p13 = p02 * fpr;
  const T3 = Tfan * (engine.opr / fpr) ** (k(GAMMA) / e.ec);
  const p3 = p02 * engine.opr;
  const T4 = engine.t4 * (flight === STATIC ? 1 : engine.cruiseT4);
  // середня cp у камері (відповідає діаграмам підвищення температури при згорянні)
  const f = (CP_HOT * (T4 - T3)) / (e.burner * LHV - CP_HOT * T4);
  const p4 = p3 * (1 - e.dpb);
  // турбіни: ВТ крутить компресор ядра, НТ — вентилятор (на 1 + m усього повітря)
  const wHpc = CP_COLD * (T3 - Tfan);
  const wFan = (1 + engine.bpr) * CP_COLD * (Tfan - T02) / (e.gear ?? 1);
  const T5 = T4 - (wHpc + wFan) / (0.99 * (1 + f) * CP_HOT);
  const p5 = p4 * (T5 / T4) ** (G_HOT / (G_HOT - 1) / e.et);
  // повне розширення в соплах до p0
  const vCore = Math.sqrt(Math.max(0, 2 * CP_HOT * T5 * e.nozzle * (1 - (flight.p / p5) ** k(G_HOT))));
  const vFan = engine.bpr > 0 ? Math.sqrt(Math.max(0, 2 * CP_COLD * Tfan * e.nozzle * (1 - (flight.p / p13) ** k(GAMMA)))) : 0;
  const F = (1 + f) * vCore + engine.bpr * vFan - (1 + engine.bpr) * v0; // Н на кг/с ядра
  const total = 1 + engine.bpr;
  const specific = F / total; // Н·с/кг усього повітря
  const vj = v0 + specific;
  const tsfc = f / F / TSFC_UNIT; // кг/(кгс·год)
  const etaT = 1 - engine.opr ** (-(GAMMA - 1) / GAMMA);
  const etaP = v0 > 0 ? 2 / (1 + vj / v0) : 0;
  const etaO = v0 > 0 ? (F * v0) / (f * LHV) : 0; // повний ККД з самого циклу
  return { v0, vCore, vFan, vj, F, specific, f, tsfc, T2: T02, p2: p02, p13, T3, p3, T4, p4, T5, p5, p0: flight.p, etaT, etaP, etaO, Tfan };
}

/** Усе, що показує фігура для одного положення ручки. */
export function readoutOf(engine) {
  const c = cycleOf(engine, CRUISE);
  const s = cycleOf(engine, STATIC);
  return {
    ...engine,
    cruise: c,
    static: s,
    etaT: c.etaT,
    etaP: c.etaP,
    tsfc: c.tsfc,
    tsfcStatic: s.tsfc,
  };
}

export const READOUTS = ENGINES.map(readoutOf);

// Найбільший діаметр серед усіх двигунів — спільний масштаб серії фігур.
export const SCALE_REF = { d: Math.max(...ENGINES.map((e) => e.d)), L: Math.max(...ENGINES.map((e) => e.L)) };
