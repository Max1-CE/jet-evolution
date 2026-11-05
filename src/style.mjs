// Стилі фігури: усі кольори — токени, світла тема й темна.
export const CSS = `
.je-figure{--je-bypass:#2f6fd6;--je-core:#c98a12;--je-hot:#d9481c;--je-hot-ink:#f3d9c9;--je-liner:#f6eee6}
.iso[data-theme="dark"] .je-figure,.iso:not([data-theme="light"]) .je-figure{--je-bypass:#6ea2ff;--je-core:#e5b04a;--je-hot:#ff7a45;--je-hot-ink:#3a2117;--je-liner:#22201e}
.iso[data-theme="light"] .je-figure{--je-bypass:#2f6fd6;--je-core:#c98a12;--je-hot:#d9481c;--je-hot-ink:#f3d9c9;--je-liner:#f6eee6}
.je-cut-case{fill:var(--anatomy-face)}
.je-cut-rotor,.je-cut-gear{fill:var(--anatomy-top)}
.je-cut-blade{fill:var(--anatomy-top)}
.je-cut-vane{fill:var(--anatomy-shade-3)}
.je-cut-liner{fill:var(--je-liner)}
.je-cut-hot{fill:var(--je-hot-ink)}
.je-engine{transition:opacity .45s var(--anatomy-ease)}
.je-engine[data-off]{opacity:0;visibility:hidden;transition:opacity .25s ease,visibility 0s .25s}
.je-streak{fill:none;stroke-width:1.15;stroke-linecap:round;vector-effect:non-scaling-stroke}
.je-streak[data-flow="bypass"]{stroke:var(--je-bypass)}
.je-streak[data-flow="core"]{stroke:var(--je-core)}
.je-streak[data-flow="hot"]{stroke:var(--je-hot)}
.je-sw[data-flow="bypass"] path{stroke:var(--je-bypass);stroke-width:2}
.je-sw[data-flow="core"] path{stroke:var(--je-core);stroke-width:2}
.je-sw[data-flow="hot"] path{stroke:var(--je-hot);stroke-width:2}
.iso-stage{cursor:pointer;outline:none}
.iso-stage:focus-visible{box-shadow:0 0 0 1px var(--anatomy-mid)}
.je-readout{white-space:pre;text-align:right;line-height:1.55}
.je-figure .iso-plate{padding:56px 24px 64px}
.je-years{display:flex;gap:6px;flex-wrap:wrap}
.je-years button{font:inherit;font-family:var(--anatomy-mono);font-size:12px;color:var(--anatomy-text);background:transparent;border:0;box-shadow:0 0 0 1px var(--anatomy-lo);padding:4px 10px;cursor:pointer}
.je-years button[aria-pressed="true"]{color:var(--anatomy-strong);box-shadow:0 0 0 1px var(--anatomy-hi)}
.je-table{border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums;width:100%;margin-top:6px}
.je-table th,.je-table td{text-align:right;padding:4px 6px;border-bottom:1px solid var(--anatomy-faint);vertical-align:top}
.je-table th:nth-child(2),.je-table td:nth-child(2),.je-table th:first-child,.je-table td:first-child{text-align:left}
.je-table th{font-weight:500;color:var(--anatomy-muted);font-size:11px}
.je-table td small{display:block;color:var(--anatomy-muted);font-size:11px}
.je-table tr[data-on] td{color:var(--anatomy-strong)}
.je-sources{font-size:12px;color:var(--anatomy-muted)}
.je-readout-m{display:none}
.je-table-wrap{display:block;overflow-x:auto;max-width:100%}
.je-caption{overflow-wrap:anywhere}
.je-sources a{color:inherit}
@media (max-width:560px){.je-figure .iso-plate{padding:44px 10px 16px;overflow:hidden}.je-figure .iso-svg{width:122%;margin:0 -11%}.je-readout,.je-figure [data-corner="hint"]{display:none}.je-readout-m{display:block;white-space:pre-line;font-family:var(--anatomy-mono);font-size:10.5px;line-height:1.5;color:var(--anatomy-text);margin-top:6px}.je-table{font-size:10.5px}.je-table th:nth-child(7),.je-table td:nth-child(7){display:none}.je-readout{font-size:9px!important;white-space:pre-wrap;max-width:92%}}
`;
export const CAVITY = `
.je-back,.je-fins{--anatomy-shade-0:#b4b6ba;--anatomy-shade-1:#c3c5c9;--anatomy-shade-2:#d0d2d5;--anatomy-shade-3:#dcdde0;--anatomy-top:#e6e7e9;--anatomy-lo:#9a9ca1;--anatomy-faint:#aeb0b4}
.iso:not([data-theme="light"]) .je-back,.iso:not([data-theme="light"]) .je-fins{--anatomy-shade-0:#0b0c0d;--anatomy-shade-1:#0e0f11;--anatomy-shade-2:#121315;--anatomy-shade-3:#16171a;--anatomy-top:#1a1b1e;--anatomy-lo:#34363a;--anatomy-faint:#26282b}
.je-hot-metal.je-cut-blade,.je-hot-metal.je-cut-vane{fill:var(--je-hot-ink)}
`;
export const SITE = `
.je-nav{display:flex;flex-wrap:wrap;gap:4px 16px;font-family:var(--anatomy-mono);font-size:12px;margin:-32px 0 28px;padding-bottom:12px;border-bottom:1px solid var(--anatomy-faint)}
.je-nav a{color:var(--anatomy-muted);text-decoration:none}
.je-nav a[aria-current]{color:var(--anatomy-strong)}
.je-nav .je-home{color:var(--anatomy-text);margin-right:auto}
.je-head h1{font-size:26px;line-height:1.25;color:var(--anatomy-strong);font-weight:600;margin:0 0 8px}
.je-kicker{font-family:var(--anatomy-mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--anatomy-muted);margin:0 0 6px}
.je-intro{max-width:720px;margin:0;color:var(--anatomy-text)}
.je-pager{display:flex;justify-content:space-between;gap:16px;margin-top:28px;font-size:13px}
.je-pager a{color:var(--anatomy-text)}
.je-cards{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));margin-top:24px}
.je-card{display:block;padding:16px 18px;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-faint);color:var(--anatomy-text);text-decoration:none}
.je-card:hover{box-shadow:0 0 0 1px var(--anatomy-mid)}
.je-card b{display:block;color:var(--anatomy-strong);margin:4px 0 6px;font-weight:600}
.je-card span{font-family:var(--anatomy-mono);font-size:11px;color:var(--anatomy-muted);letter-spacing:.08em;text-transform:uppercase}
.je-card p{margin:0;font-size:13px;line-height:1.5}
`;
export const GAUGE = `
.je-figure{--je-press:#2b2f36}
.iso:not([data-theme="light"]) .je-figure{--je-press:#d8dde6}
.je-liq-p .iso-fill,.je-liq-p .iso-shade,.je-liq-p .iso-top{fill:var(--je-press);stroke:none}
.je-liq-t .iso-fill,.je-liq-t .iso-shade,.je-liq-t .iso-top{fill:var(--je-hot);stroke:none}
.je-liq .iso-edge{stroke:none}
.je-glass .iso-fill{fill:none}
.je-glass .iso-shade{fill-opacity:.22}
.je-glass .iso-top{fill-opacity:.5}
.je-sw[data-flow="press"] path{stroke:var(--je-press);stroke-width:2}
.je-liq-v0 .iso-fill,.je-liq-v0 .iso-shade,.je-liq-v0 .iso-top{fill:var(--je-press);stroke:none}
.je-liq-fan .iso-fill,.je-liq-fan .iso-shade,.je-liq-fan .iso-top{fill:var(--je-bypass);stroke:none}
.je-liq-core .iso-fill,.je-liq-core .iso-shade,.je-liq-core .iso-top{fill:var(--je-hot);stroke:none}
.je-liq-vj .iso-fill,.je-liq-vj .iso-shade,.je-liq-vj .iso-top{fill:var(--je-core);stroke:none}
.je-blade[data-off]{display:none}
.je-cavity{fill:var(--je-cool-cav)}
.je-tbc{fill:var(--je-tbc)}
.je-figure{--je-cool-cav:#cfdcf2;--je-tbc:#eadfc4}
.iso:not([data-theme="light"]) .je-figure{--je-cool-cav:#1b2433;--je-tbc:#3a3426}
.je-liq-cool .iso-fill,.je-liq-cool .iso-shade,.je-liq-cool .iso-top{fill:var(--je-bypass);stroke:none}
.je-sw[data-flow="vj"] path{stroke:var(--je-core);stroke-width:2}
`;
export const EXPLODE_CSS = `
.je-engine [data-mod]{transition:opacity .25s ease}
.je-engines[data-focus] .je-engine [data-mod]:not([data-on]){opacity:.22}
.je-engine .je-mod-cut[data-on] .iso-line{stroke:var(--anatomy-lit)}
.je-mods{display:flex;flex-wrap:wrap;gap:6px}
.je-mods button,.je-explode{font:inherit;font-size:12px;color:var(--anatomy-text);background:transparent;border:0;box-shadow:0 0 0 1px var(--anatomy-faint);padding:3px 9px;cursor:pointer}
.je-mods button b{font-family:var(--anatomy-mono);font-weight:500;color:var(--anatomy-muted);margin-right:4px}
.je-mods button[aria-pressed="true"],.je-explode[aria-pressed="true"]{color:var(--anatomy-strong);box-shadow:0 0 0 1px var(--anatomy-hi)}
.je-explode{margin-left:auto;font-family:var(--anatomy-mono);box-shadow:0 0 0 1px var(--anatomy-mid)}
`;
