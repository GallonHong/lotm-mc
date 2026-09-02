import assert from "node:assert/strict";
import fs from "node:fs";

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const teleport = read("sapi_server_bp/scripts/modules/teleport.js");
const operations = read("sapi_server_bp/scripts/modules/operations.js");
const audit = read("sapi_server_bp/scripts/modules/audit.js");
const main = read("sapi_server_bp/scripts/main.js");
const menu = read("sapi_server_bp/scripts/modules/server_menu.js");
const build = read("build.sh");
const manifest = JSON.parse(read("sapi_server_bp/manifest.json"));

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
assert.match(build, /sapi_server_bp/);
assert.equal(manifest.header.version.join("."), "2.5.2");
assert.match(main, /sapi:shop/);
assert.match(main, /requestCompassMenu/);
assert.match(main, /system\.currentTick - lastTick < 8/);
assert.match(read("sapi_server_bp/scripts/modules/shop.js"), /openCategoryById/);
const lottery = read("sapi_server_bp/scripts/modules/lottery.js");
assert.match(lottery, /if \(res\.canceled\) return;/);
assert.match(lottery, /res\.selection === pools\.length/);

console.log("SAPI Server v2.5.2 menu and lottery navigation validation passed.");
