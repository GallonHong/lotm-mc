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
for (const route of ["!daily", "!dungeon", "!redeem", "!tpa", "!audit"]) assert.ok(main.includes(route), `missing route ${route}`);
assert.match(menu, /每日福利/);
assert.match(menu, /副本行动/);
assert.match(menu, /服务器运营管理/);
assert.match(menu, /发布联盟每日新闻/);
assert.match(menu, /Integration\.send\(player, "daily:news_admin"\)/);
assert.match(menu, /日常、新闻与事件完整管理/);
assert.match(menu, /新闻按钮仍保留/);
assert.match(build, /sapi_server_bp/);
assert.equal(manifest.header.version.join("."), "2.7.4");
assert.match(menu, /§l§2末日生存联盟§r/);
assert.match(menu, /openMoreMenu/);
assert.match(land, /isApocalypseSafeChunk/);
assert.match(integration, /apoc:zones:v1/);
assert.match(integration, /apoc:heartbeat/);
for (const source of [main, menu, integration]) {
  for (const removed of ["!disaster", "DisasterAdminManager", "isNaturalDisastersAvailable", "sendNaturalDisasterControl", "自然灾害联动", "自然灾害管理"]) {
    assert.equal(source.includes(removed), false, `SAPI disaster integration remains: ${removed}`);
  }
}
assert.match(menu, /give @s sando_standalone:disaster_controller 1/);
assert.match(menu, /\/give @p sando_standalone:disaster_controller/);
assert.match(menu, /Integration\.send\(player, "sando_standalone:menu"\)/);
assert.match(menu, /打开灾害控制器/);
for (const coordinate of [1949, 3035, 1463, 2469, 2352, 2585, 1942, 2087]) assert.ok(integration.includes(String(coordinate)), `missing safe-zone coordinate ${coordinate}`);
assert.match(market, /durability\?\.damage/);
assert.match(market, /仅允许上架耐久未损耗、尚未使用的武器/);
assert.doesNotMatch(market, /带耐久组件的装备暂不支持寄卖/);
assert.match(market, /sanitizeListingName/);
assert.match(market, /寄卖名称（可选/);
assert.match(market, /实际物品/);
assert.match(market, /listingName,/);
assert.match(main, /sapi:shop/);
assert.match(main, /requestCompassMenu/);
assert.match(main, /system\.currentTick - lastTick < 8/);
assert.match(integration, /system\.runTimeout/);
assert.match(integration, /daily:dungeon|Failed to send/);
assert.match(integration, /__sapi_player__/);
assert.match(integration, /encodeURIComponent\(player\.name\)/);
assert.match(integration, /openExtractionMenu/);
assert.match(integration, /interop:apoc_extraction_ack/);
assert.match(integration, /interop:apoc_extraction_menu_request:v1/);
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

assert(menu.includes("openExtractionMenu") && !menu.includes("if (!Integration.isExtractionAvailable())") && integration.includes("interop:apoc_extraction_heartbeat"), "acknowledged extraction menu bridge missing");
assert.match(integration, /仅导入 \.mcaddon 不会自动给已有世界启用行为包/);
console.log("SAPI Server v2.7.4 validation passed.");
