// Набір anatomy (MIT, © 2026 Ryan) — копія в vendor/anatomy
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
export * as k from "../vendor/anatomy/iso-kit.mjs";
export * as G from "../vendor/anatomy/lathe.mjs";
export * as T from "../vendor/anatomy/tube.mjs";
const VENDOR = join(dirname(fileURLToPath(import.meta.url)), "..", "vendor", "anatomy");
export const kitScript = () => readFileSync(join(VENDOR, "iso-kit.mjs"), "utf8").replace(/^export /gm, "");
