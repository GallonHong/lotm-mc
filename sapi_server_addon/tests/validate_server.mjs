import assert from "node:assert/strict";
import fs from "node:fs";

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const teleport = read("sapi_server_bp/scripts/modules/teleport.js");
const operations = read("sapi_server_bp/scripts/modules/operations.js");
const audit = read("sapi_server_bp/scripts/modules/audit.js");
const main = read("sapi_server_bp/scripts/main.js");
const menu = read("sapi_server_bp/scripts/modules/server_menu.js");
const land = read("sapi_server_bp/scripts/modules/land.js");
const market = read("sapi_server_bp/scripts/modules/market.js");
const integration = read("sapi_server_bp/scripts/modules/integration.js");
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
assert.equal(manifest.header.version.join("."), "2.5.4");
assert.match(land, /isApocalypseSafeChunk/);
assert.match(integration, /apoc:zones:v1/);
assert.match(integration, /apoc:heartbeat/);
for (const coordinate of [2349, 2635, 2352, 2585, 1942, 2087]) assert.ok(integration.includes(String(coordinate)), `missing safe-zone coordinate ${coordinate}`);
assert.match(market, /durability\?\.damage/);
assert.match(market, /仅允许上架耐久未损耗、尚未使用的武器/);
assert.doesNotMatch(market, /带耐久组件的装备暂不支持寄卖/);
assert.match(main, /sapi:shop/);
assert.match(main, /requestCompassMenu/);
assert.match(main, /system\.currentTick - lastTick < 8/);
assert.match(read("sapi_server_bp/scripts/modules/shop.js"), /openCategoryById/);
const lottery = read("sapi_server_bp/scripts/modules/lottery.js");
assert.match(lottery, /if \(res\.canceled\) return;/);
assert.match(lottery, /res\.selection === pools\.length/);

const uiSources = fs.readdirSync(new URL("../sapi_server_bp/scripts/", import.meta.url), { recursive: true })
  .filter(path => String(path).endsWith(".js"))
  .map(path => read(`sapi_server_bp/scripts/${path}`));
for (const source of uiSources) {
  assert.equal(source.includes("§f"), false, "white text color must not remain in SAPI UI");
  assert.equal(source.includes("§7"), false, "light-gray text color must not remain in SAPI UI");
}

console.log("SAPI Server v2.5.4 validation passed.");
