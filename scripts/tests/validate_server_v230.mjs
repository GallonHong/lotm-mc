import assert from "node:assert/strict";
import fs from "node:fs";

const read = path => fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const teleport = read("scripts/modules/teleport.js");
const audit = read("scripts/modules/audit.js");
const main = read("scripts/server_main.js");
const menu = read("scripts/modules/server_menu.js");
const build = read("scripts/build-packages.sh");
const manifest = JSON.parse(read("server_manifest.json"));

assert.equal(/\b(EconomyManager|removeBalance|fee|cost|price)\b/.test(teleport), false, "personal teleport must remain free");
assert.match(teleport, /sapi:homes:v1/);
assert.match(teleport, /sendTpaRequest/);
assert.match(teleport, /respondTpa/);
assert.match(teleport, /entityDie/);
assert.match(teleport, /consumeDeathBack/);
assert.match(audit, /encoded\.length > 30000/);
assert.match(audit, /admin_clear/);
for (const route of ["!home", "!tpa", "!back", "!audit"]) assert.ok(main.includes(route), `missing route ${route}`);
assert.match(menu, /Home、TPA 与死亡返回/);
assert.match(menu, /管理与审计日志/);
assert.match(build, /teleport region audit/);
assert.equal(manifest.header.version.join("."), "2.3.0");

console.log("SAPI Server v2.3.0 teleport and audit validation passed.");
