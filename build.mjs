// SPDX-FileCopyrightText: 2026 Max Kravchenko
// SPDX-License-Identifier: MIT

// Збирає сайт серії в docs/: node build.mjs [номери фігур]
import { writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SERIES, wrap } from "./src/page.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "docs");
mkdirSync(join(OUT, "vendor"), { recursive: true });
copyFileSync(join(HERE, "vendor", "three", "three.min.js"), join(OUT, "vendor", "three.min.js"));
copyFileSync(join(HERE, "vendor", "three", "LICENSE"), join(OUT, "vendor", "three-LICENSE.txt"));
const only = process.argv.slice(2).map(Number).filter(Boolean);

for (const f of SERIES) {
  if (only.length && !only.includes(f.n)) continue;
  let mod;
  try { mod = await import(`./figs/fig${f.n}.mjs`); } catch (e) { if (e.code === "ERR_MODULE_NOT_FOUND") { console.log("skip", f.slug); continue; } throw e; }
  const html = mod.build();
  writeFileSync(join(OUT, `${f.slug}.html`), html);
  console.log("wrote", f.slug, Math.round(html.length / 1024), "KB");
}

const index = wrap("Реактивний двигун: серія фігур", `
<header class="je-head"><p class="je-kicker">Серія з ${SERIES.length} фігур · один стенд, один масштаб</p><h1>Як еволюціонував реактивний двигун</h1>
<p class="je-intro">Ознайомчі інтерактивні фігури: двигуни 1944, 1965, 1970 років і сучасний двигун з редуктором на однаковому випробувальному стенді. Числа на фігурах пораховано з однієї моделі циклу й звірено з опублікованими даними. На кожній сторінці апарат можна відкрити в 3D (кнопка «3D» або клавіша R): обертати, запускати (ротори крутяться зі своїми обертами, крізь двигун тече повітря), вмикати й вимикати розріз, розбирати на модулі, вузли й окремі деталі — з функцією і матеріалами кожної.</p></header>
<div class="je-cards">${SERIES.map((f) => `<a class="je-card" href="${f.slug}.html"><span>Рис. ${f.n}</span><b>${f.title}</b><p>${f.about}</p></a>`).join("")}</div>
<p class="je-sources" style="margin-top:28px">Фігури побудовано набором <a href="https://github.com/wheresryan22/anatomy">anatomy</a> (MIT). Код моделі й геометрії — у репозиторії.</p>`);
writeFileSync(join(OUT, "index.html"), index);
writeFileSync(join(OUT, ".nojekyll"), "");
console.log("wrote index");
