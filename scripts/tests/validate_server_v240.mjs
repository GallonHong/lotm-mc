import assert from "node:assert/strict";
import fs from "node:fs";

const read = path => fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const teleport = read("scripts/modules/teleport.js");
const operations = read("scripts/modules/operations.js");
const audit = read("scripts/modules/audit.js");
const main = read("scripts/server_main.js");
const menu = read("scripts/modules/server_menu.js");
const build = read("scripts/build-packages.sh");
const manifest = JSON.parse(read("server_manifest.json"));

assert.equal(/\b(EconomyManager|removeBalance|fee|cost|price)\b/.test(teleport), false, "personal teleport must remain free");
assert.match(teleport, /tpaEnabled/);
assert.match(teleport, /TPA_RECEIVE_KEY/);
assert.match(teleport, /openTpaAdminSettings/);
assert.match(operations, /claimDaily/);
assert.match(operations, /timezoneOffsetMinutes/);
assert.match(operations, /先锁定全服与个人次数/);
assert.match(operations, /deliverOrQueue/);
assert.match(operations, /maxUses/);
assert.match(operations, /perPlayer/);
assert.match(operations, /maskCode/);
assert.match(audit, /code_redeem/);
for (const route of ["!daily", "!redeem", "!tpa", "!audit"]) assert.ok(main.includes(route), `missing route ${route}`);
assert.match(menu, /每日福利/);
assert.match(menu, /服务器运营管理/);
assert.match(build, /teleport region audit operations/);
assert.equal(manifest.header.version.join("."), "2.4.0");

console.log("SAPI Server v2.4.0 operations validation passed.");
