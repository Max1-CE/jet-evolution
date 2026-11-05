// Звірка моделі з опублікованими даними: node check.mjs (exit 1, якщо розбіжність > 8 %)
import { READOUTS } from "./model.mjs";
const f = (x, n = 2) => x.toFixed(n);
let bad = 0;
for (const r of READOUTS) {
  const c = r.cruise;
  const [model, ref, where] = r.ref.tsfcCruise ? [c.tsfc, r.ref.tsfcCruise, "крейсер"] : [r.tsfcStatic, r.ref.tsfcStatic, "стенд"];
  const err = model / ref - 1;
  if (Math.abs(err) > 0.08) bad++;
  console.log(`${r.name.padEnd(28)} TSFC ${where} модель ${f(model, 3)} / дані ${ref}${r.ref.est ? " (оцінка)" : ""} → ${(err * 100).toFixed(1)} %   ηt ${f(c.etaT, 3)} ηp ${f(c.etaP, 3)} ηo ${f(c.etaO, 3)}  vj ${f(c.vj, 0)} м/с  крейсер TSFC ${f(c.tsfc, 3)}`);
}
if (bad) { console.log(`${bad} розбіжностей > 8 %`); process.exitCode = 1; } else console.log("модель узгоджена з даними");
