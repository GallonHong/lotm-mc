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
const shop = read("sapi_server_bp/scripts/modules/shop.js");
const safe = read("sapi_server_bp/scripts/modules/safe.js");
const itemCleanup = read("sapi_server_bp/scripts/modules/item_cleanup.js");
const social = read("sapi_server_bp/scripts/modules/social.js");
const socialStore = read("sapi_server_bp/scripts/data/socialStore.js");
const wanted = read("sapi_server_bp/scripts/modules/wanted.js");
const combat = read("sapi_server_bp/scripts/modules/combat.js");
const playerVending = read("sapi_server_bp/scripts/modules/player_vending.js");
const build = read("build.sh");
const manifest = JSON.parse(read("sapi_server_bp/manifest.json"));
const resourceManifest = JSON.parse(read("sapi_server_rp/manifest.json"));

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
assert.match(menu, /发布每日突发事件/);
assert.match(menu, /Integration\.send\(player, "daily:news_admin"\)/);
assert.match(menu, /日常、希望报与事件管理/);
assert.match(menu, /突发事件入口仍保留/);
assert.match(build, /sapi_server_bp/);
assert.equal(manifest.header.version.join("."), "2.11.1");
assert.equal(resourceManifest.header.version.join("."), "2.11.1");
assert.ok(manifest.dependencies.some(dependency => dependency.uuid === resourceManifest.header.uuid), "SAPI resource-pack dependency missing");
assert.match(menu, /§l§2幸存者联盟§r/);
assert.match(menu, /openMoreMenu/);
assert.match(menu, /SocialManager\.openSocialMenu/);
assert.match(menu, /好友、在线玩家、队伍与公会/);
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
assert.match(integration, /probeDailyEvents/);
assert.match(integration, /receiveDailyPong/);
assert.match(integration, /sapi:daily_probe/);
assert.match(main, /sapi:daily_pong/);
assert.match(integration, /openExtractionMenu/);
assert.match(integration, /interop:apoc_extraction_ack/);
assert.match(integration, /interop:apoc_extraction_menu_request:v1/);
assert.match(shop, /openCategoryById/);
assert.match(shop, /openCategoryUI/);
assert.match(shop, /openSubcategoryUI/);
const merchantConfig = await import(new URL("../sapi_server_bp/scripts/data/merchantConfig.js", import.meta.url));
const serverConfig = await import(new URL("../sapi_server_bp/scripts/config.js", import.meta.url));
const safeRules = await import(new URL("../sapi_server_bp/scripts/data/safeRules.js", import.meta.url));
assert.equal(serverConfig.Config.operations.dailyRewardRevision, 4);
assert.deepEqual(serverConfig.Config.operations.dailyMoney, [2000, 2500, 3000, 3500, 4000, 5000, 8000]);
assert.match(operations, /LEGACY_DAILY_MONEY/);
assert.match(operations, /INTERIM_DAILY_MONEY/);
assert.match(operations, /TENFOLD_DAILY_MONEY/);
assert.match(operations, /sameMoneySchedule/);
assert.match(menu, /textures\/items\/gold_ingot/);
assert.match(menu, /textures\/items\/emerald/);
assert.doesNotMatch(integration, /isApocalypseSafeChunk[\s\S]{0,200}isApocalypseAvailable/);
const supplies = merchantConfig.MERCHANT_CATEGORIES.find(category => category.id === "supplies");
assert.ok(supplies, "supplies merchant missing");
assert.ok(Array.isArray(supplies.subcategories) && supplies.subcategories.length >= 6, "supplies merchant must use nested categories");
const supplyItems = supplies.subcategories.flatMap(group => group.items);
for (const itemId of [
  "minecraft:paper",
  "minecraft:ink_sac",
  "minecraft:glass_bottle",
  "minecraft:iron_ingot",
  "minecraft:redstone",
  "minecraft:gunpowder",
  "minecraft:compass",
  "minecraft:sugar",
]) assert.ok(supplyItems.some(item => item.id === itemId), `missing supplies item ${itemId}`);
assert.equal(new Set(supplyItems.map(item => item.id)).size, supplyItems.length, "duplicate supplies item id");
const safeItem = supplyItems.find(item => item.id === "sapi:secure_safe_deployer");
assert.deepEqual([safeItem.buyPrice, safeItem.dailyLimit], [15000, 1]);
assert.deepEqual([serverConfig.Config.safe.maxDurability, serverConfig.Config.safe.normalDamageReduction], [2000, 0.90]);
assert.equal(serverConfig.Config.safe.nativeHealth, 1000000);
assert.equal(serverConfig.Config.safe.interactionDistance, 2);
assert.deepEqual(serverConfig.Config.safe.specialWeaponIds, ["test_gun:dbss"]);
assert.equal(safeRules.calculateSafeDamage(100, false, 0.90), 10);
assert.equal(safeRules.calculateSafeDamage(100, true, 0.90), 100);
for (const weaponId of serverConfig.Config.safe.specialWeaponIds) {
  const itemName = weaponId.split(":")[1];
  assert.ok(fs.existsSync(new URL(`../../test_guns_2d_addon/test_guns_bp/items/${itemName}.json`, import.meta.url)), `unknown special safe weapon ${weaponId}`);
}
assert.match(safe, /maxDurability \|\| 2000/);
assert.match(safe, /normalDamageReduction \?\? 0\.90/);
assert.match(safe, /safe\.remove\(\)/);
assert.match(safe, /再次放置时会恢复 2000 满耐久/);
assert.match(safe, /this\.isBreached\(safe\).*openSafeMenu/s);
assert.match(safe, /static watchdog\(\)/);
assert.match(safe, /restoreNativeHealth/);
assert.match(safe, /world\.afterEvents\?\.entityHurt/);
assert.match(safe, /allowUnknownSource/);
assert.match(safe, /static isWithinInteractionDistance\(player, safe\)/);
assert.match(safe, /static requireInteractionDistance\(player, safe\)/);
for (const method of ["requestAccess", "openSafeMenu", "openDepositMenu", "openWithdrawMenu", "transferStack", "openChangePassword", "confirmRecovery"]) {
  const start = safe.indexOf(`static ${method}(`);
  assert(start >= 0 && safe.slice(start, start + 500).includes("requireInteractionDistance"), `${method} must enforce the two-block safe distance`);
}
assert.match(main, /SafeManager\.registerEvents\(\)/);
assert.match(main, /ItemCleanupManager\.start\(\)/);
assert.match(main, /id === "system:cleanup"/);
assert.deepEqual(serverConfig.Config.itemCleanup, { enabled: true, intervalMinutes: 10, warningSeconds: [60, 30, 10] });
assert.match(itemCleanup, /getEntities\(\{ type: "minecraft:item" \}\)/);
assert.match(itemCleanup, /entity\.remove\(\)/);
assert.match(itemCleanup, /minecraft:overworld/);
assert.match(itemCleanup, /minecraft:nether/);
assert.match(itemCleanup, /minecraft:the_end/);
assert.match(itemCleanup, /\[60, 30, 10\]/);
assert.match(itemCleanup, /玩家死亡掉落、蓝图、武器和任务奖励/);
assert.match(menu, /ItemCleanupManager\.openAdminMenu/);
assert.deepEqual(serverConfig.Config.social, { maxFriends: 50, teamMaxPlayers: 4, guildCreateCost: 15000, guildMaxMembers: 30 });
for (const marker of [
  "openSocialMenu", "openFriends", "openFriendRequests", "openOnlinePlayers", "openPlayerCard",
  "openPrivateMessage", "openLandVisitInvite", "createTeam", "inviteToTeam", "teamMaxPlayers",
  "openTeamChat", "daily:dungeon_team", "openGuild", "openCreateGuild", "guildCreateCost",
  "guildMaxMembers", "baseLocation", "Leader", "Member"
]) assert.match(social, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing social behavior: ${marker}`);
for (const marker of ["DIRECTORY_KEY", "profilePropertyKey", "GUILD_DIRECTORY_KEY", "guildPropertyKey", "requestFriend", "acceptFriend", "saveGuild", "setPlayerGuild"]) {
  assert.match(socialStore, new RegExp(marker), `missing social persistence behavior: ${marker}`);
}
assert.match(main, /system:social/);
assert.match(main, /SocialManager\.initializePlayer/);
assert.match(main, /SocialManager\.onPlayerLeave/);
assert.match(land, /setVisitorPoint/);
assert.match(land, /visitorPoint/);
assert.match(social, /不会获得破坏、放置、容器、保险箱或载具权限/);
const safeEntity = JSON.parse(read("sapi_server_bp/entities/secure_safe.json"));
assert.equal(safeEntity["minecraft:entity"].description.identifier, "sapi:secure_safe");
assert.equal(safeEntity["minecraft:entity"].components["minecraft:inventory"].inventory_size, 27);
assert.equal(safeEntity["minecraft:entity"].components["minecraft:health"].max, 1000000);
assert.deepEqual(safeEntity["minecraft:entity"].components["minecraft:is_collidable"], {});
assert.deepEqual(safeEntity["minecraft:entity"].components["minecraft:collision_box"], { width: 1.0, height: 1.35 });
assert.equal(safeEntity["minecraft:entity"].component_groups["sapi:breached_visual"]["minecraft:nameable"].always_show, true);
assert(safeEntity["minecraft:entity"].events["sapi:breach"].add.component_groups.includes("sapi:breached_visual"));
const safeItemDefinition = JSON.parse(read("sapi_server_bp/items/secure_safe_deployer.json"));
assert.equal(safeItemDefinition["minecraft:item"].description.identifier, "sapi:secure_safe_deployer");
const lottery = read("sapi_server_bp/scripts/modules/lottery.js");
assert.match(lottery, /if \(res\.canceled\) return;/);
assert.match(lottery, /res\.selection === pools\.length/);
assert.match(lottery, /playDrawAnimation/);
assert.match(lottery, /spawnParticle/);
assert.match(lottery, /openFeaturedLegendaryAdmin/);
const lotteryPools = await import(new URL("../sapi_server_bp/scripts/data/lotteryPools.js", import.meta.url));
const epicPool = lotteryPools.BUILT_IN_LOTTERY_POOLS.find(pool => pool.id === "epic_armory");
const legendaryPool = lotteryPools.BUILT_IN_LOTTERY_POOLS.find(pool => pool.id === "legendary_featured");
assert.deepEqual([epicPool.singleCost, epicPool.tenCost, epicPool.pityThreshold], [1200, 12000, 20]);
assert.equal(epicPool.items.filter(item => item.isPityTarget).reduce((sum, item) => sum + item.weight, 0), 5);
assert.deepEqual([legendaryPool.singleCost, legendaryPool.tenCost, legendaryPool.pityThreshold], [2000, 20000, 30]);
assert.equal(legendaryPool.defaultFeaturedKey, "legendary_mp7");
assert.equal(legendaryPool.items.reduce((sum, item) => sum + item.weight, 0) + legendaryPool.featuredWeight, 100);
assert.match(shop, /vanillaDailySellCap/);
assert.match(shop, /dailyLimit/);
assert.match(combat, /areTeammates/);
assert.match(combat, /event\.cancel = true/);
assert.match(wanted, /tradeRestrictionPoints/);
assert.match(wanted, /一键拉黑高危玩家/);
assert.match(playerVending, /破坏玩家贩卖机/);
assert.match(playerVending, /dropRandomProduct/);
assert.match(playerVending, /buyInsurance/);
assert.match(playerVending, /queueInsuranceItems/);
assert.match(playerVending, /claimInsuranceCompensation/);
assert.doesNotMatch(playerVending, /insurancePayout/);
assert.match(social, /openGuildChat/);
assert.match(social, /recentMessages/);
assert.equal(JSON.parse(read("sapi_server_bp/blocks/player_vending_machine.json"))["minecraft:block"].components["minecraft:destructible_by_mining"].seconds_to_destroy, 100);

const uiSources = fs.readdirSync(new URL("../sapi_server_bp/scripts/", import.meta.url), { recursive: true })
  .filter(path => String(path).endsWith(".js"))
  .map(path => read(`sapi_server_bp/scripts/${path}`));
for (const source of uiSources) {
  assert.equal(source.includes("§f"), false, "white text color must not remain in SAPI UI");
  assert.equal(source.includes("§7"), false, "light-gray text color must not remain in SAPI UI");
}

assert(menu.includes("openExtractionMenu") && !menu.includes("if (!Integration.isExtractionAvailable())") && integration.includes("interop:apoc_extraction_heartbeat"), "acknowledged extraction menu bridge missing");
assert.match(integration, /仅导入 \.mcaddon 不会自动给已有世界启用行为包/);
console.log("SAPI Server v2.11.1 validation passed.");
