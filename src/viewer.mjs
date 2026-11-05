// Повноекранний 3D-переглядач деталей: розмітка, стилі, вбудовування скрипта й каталогу.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

export const VIEWER_CSS = `
.jv-lock,.jv-lock body{overflow:hidden}
.jv{position:fixed;inset:0;z-index:50;display:grid;grid-template-columns:minmax(0,1fr) 360px;grid-template-rows:auto minmax(0,1fr) auto;background:radial-gradient(120% 90% at 35% 40%,#fbfbf9 0%,#ecebe6 70%,#e2e1db 100%);color:var(--anatomy-text);font:14px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
.jv[hidden]{display:none}
.jv-top{grid-column:1/-1;display:flex;align-items:center;gap:12px;padding:10px 14px 10px 18px;border-bottom:1px solid var(--anatomy-faint);background:#f7f7f4e6;backdrop-filter:blur(6px)}
.jv-crumbs{display:flex;flex-wrap:wrap;align-items:center;gap:2px 6px;font-family:var(--anatomy-mono);font-size:12px;min-width:0}
.jv-crumbs button{font:inherit;color:var(--anatomy-muted);background:none;border:0;padding:2px 0;cursor:pointer;text-decoration:underline;text-decoration-color:var(--anatomy-faint);text-underline-offset:3px}
.jv-crumbs button:hover{color:var(--anatomy-strong)}
.jv-crumbs b{color:var(--anatomy-strong);font-weight:500}
.jv-crumbs span{color:var(--anatomy-lo)}
.jv-close{margin-left:auto;font:inherit;font-size:13px;color:var(--anatomy-strong);background:var(--anatomy-card);border:0;box-shadow:0 0 0 1px var(--anatomy-lo);padding:5px 12px;cursor:pointer;white-space:nowrap}
.jv-view{position:relative;grid-column:1;grid-row:2;min-height:0;overflow:hidden}
.jv-view canvas{display:block;width:100%;height:100%;cursor:grab;touch-action:none}
.jv-view canvas:active{cursor:grabbing}
.jv-panel{grid-column:2;grid-row:2/4;overflow:auto;padding:20px 22px 28px;background:#fbfbfaf2;border-left:1px solid var(--anatomy-faint)}
.jv-kicker{font-family:var(--anatomy-mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--anatomy-muted);margin:0 0 4px}
.jv-name{font-size:21px;line-height:1.25;color:var(--anatomy-strong);font-weight:600;margin:0 0 14px}
.jv-sec{margin:0 0 16px}
.jv-sec h3{font-family:var(--anatomy-mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--anatomy-muted);font-weight:500;margin:0 0 6px}
.jv-sec p{margin:0}
.jv-mat{margin:0;padding:0 0 0 16px}
.jv-mat li{margin:0 0 3px}
.jv-note{font-size:12.5px;color:var(--anatomy-muted);margin:6px 0 0!important}
.jv-facts{display:grid;grid-template-columns:auto 1fr;gap:3px 14px;margin:0;font-size:13px}
.jv-facts dt{color:var(--anatomy-muted)}
.jv-facts dd{margin:0;color:var(--anatomy-strong);font-variant-numeric:tabular-nums}
.jv-kids{display:flex;flex-direction:column;gap:4px}
.jv-kids button{display:flex;align-items:baseline;gap:8px;text-align:left;font:inherit;font-size:13px;color:var(--anatomy-text);background:var(--anatomy-card);border:0;box-shadow:0 0 0 1px var(--anatomy-faint);padding:6px 10px;cursor:pointer}
.jv-kids button b{font-family:var(--anatomy-mono);font-weight:500;font-size:11px;color:var(--anatomy-muted)}
.jv-kids button i{margin-left:auto;font-style:normal;color:var(--anatomy-muted)}
.jv-kids button:hover,.jv-kids button[data-on]{color:var(--anatomy-strong);box-shadow:0 0 0 1px #3e63dd}
.jv-small{font-size:12.5px;color:var(--anatomy-muted);margin:6px 0 0}
.jv-tools{grid-column:1;grid-row:3;display:flex;flex-wrap:wrap;gap:6px;padding:10px 14px;border-top:1px solid var(--anatomy-faint);background:#f7f7f4e6}
.jv-tools button{font:inherit;font-family:var(--anatomy-mono);font-size:12px;color:var(--anatomy-text);background:var(--anatomy-card);border:0;box-shadow:0 0 0 1px var(--anatomy-lo);padding:5px 11px;cursor:pointer}
.jv-tools button[aria-pressed="true"]{color:var(--anatomy-strong);box-shadow:0 0 0 1px var(--anatomy-hi)}
.jv-tools button:disabled{opacity:.4;cursor:default}
.jv-tools .jv-hint{margin-left:auto;align-self:center;font-size:11.5px;color:var(--anatomy-muted)}
.jv-tip{position:absolute;z-index:2;pointer-events:none;font-size:12px;color:#fff;background:#18181ae6;padding:3px 8px;white-space:nowrap}
.jv button:focus-visible{outline:2px solid #3e63dd;outline-offset:1px}
.je-open3d{font:inherit;font-family:var(--anatomy-mono);font-size:12px;color:var(--anatomy-strong);background:var(--anatomy-card);border:0;box-shadow:0 0 0 1px var(--anatomy-hi);padding:3px 10px;cursor:pointer}
.je-mods button i{font-style:normal;color:var(--anatomy-muted);margin-left:4px}
@media (max-width:760px){
  .jv{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr) auto minmax(0,38%)}
  .jv-panel{grid-column:1;grid-row:4;border-left:0;border-top:1px solid var(--anatomy-faint);padding:14px 16px 20px}
  .jv-tools{grid-row:3}
  .jv-tools .jv-hint,.jv-k{display:none}
  .jv-tools{gap:4px;padding:8px 10px}
  .jv-tools button{padding:4px 8px}
  .jv-name{font-size:18px;margin-bottom:8px}
}
`;

const MARKUP = `<div class="jv" hidden role="dialog" aria-modal="true" aria-label="3D-перегляд деталей">
<header class="jv-top"><nav class="jv-crumbs" aria-label="Рівень розбирання"></nav><button type="button" class="jv-close">Закрити · Esc</button></header>
<div class="jv-view"><div class="jv-tip" hidden></div></div>
<div class="jv-tools" role="toolbar" aria-label="Керування 3D">
<button type="button" data-act="up">↑ Вище <span class="jv-k">(Backspace)</span></button>
<button type="button" data-act="explode" aria-pressed="false">Розібрати <span class="jv-k">(E)</span></button>
<button type="button" data-act="explode-all">Розібрати все <span class="jv-k">(Shift+E)</span></button>
<button type="button" data-act="cut" aria-pressed="true">Розріз: так <span class="jv-k">(C)</span></button>
<button type="button" data-act="spin" aria-pressed="false">Обертання <span class="jv-k">(A)</span></button>
<button type="button" data-act="reset">Вид <span class="jv-k">(R)</span></button>
<span class="jv-hint">тягніть — обертати · колесо — масштаб · права кнопка — зсув · клік по деталі — відкрити</span>
</div>
<aside class="jv-panel" aria-live="polite">
<p class="jv-kicker"></p><h2 class="jv-name"></h2>
<div class="jv-sec"><h3>Функція</h3><p class="jv-func"></p></div>
<div class="jv-sec"><h3>Матеріали</h3><ul class="jv-mat"></ul><p class="jv-note" hidden></p></div>
<div class="jv-sec jv-facts-wrap"><h3>Дані</h3><dl class="jv-facts"></dl></div>
<div class="jv-sec"><h3 class="jv-kids-h">Складові</h3><div class="jv-kids"></div></div>
<p class="jv-small">Матеріали — типові для класу й покоління двигуна; геометрія спрощена.</p>
</aside>
</div>`;

/** Розмітка й скрипт переглядача; apps — масив застосунків (src/catalog.mjs). */
export function viewerBlock(apps) {
  const code = readFileSync(join(HERE, "viewer-app.js"), "utf8");
  const json = JSON.stringify(apps).replace(/</g, "\\u003c");
  return `${MARKUP}<script type="application/json" id="je-apps">${json}</script><script type="module">${code.replace(/<\/(script)/gi, "<\\/$1")}</script>`;
}
