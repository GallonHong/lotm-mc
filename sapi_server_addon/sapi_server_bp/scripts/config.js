/** SAPI 综合系统全局配置。经济商品和奖池分别由 data 文件集中维护。 */
import { BUILT_IN_LOTTERY_POOLS, LOTTERY_RARITIES } from "./data/lotteryPools.js";
import { MERCHANT_CATEGORIES, VANILLA_DAILY_SELL_CAP } from "./data/merchantConfig.js";

export const Config = {
    system: {
        serverName: "§l§ePixel§bWorld§r",
        version: "2.8.1",
        adminTag: "admin",
        menuItem: "minecraft:compass",
        menuItemName: "§r§l§6快捷导航菜单 §8(右键使用)",
        giveMenuItemOnJoin: true,
        chatPrefixes: ["!menu", "!cd", "!caidan", "！菜单", "!shop", "!land", "!lottery", "!market", "!ah", "!pay", "!money", "!warp", "!spawn", "!home", "!tpa", "!back", "!daily", "!dungeon", "!redeem", "!region", "!audit"],
    },
    teleport: {
        maxWarps: 50, cooldownSeconds: 2, safeSearchRadiusY: 16, safeSearchRadiusXZ: 4,
        maxHomes: 3, tpaExpirySeconds: 60, consumeDeathBack: true,
    },
    audit: { maxEntries: 200 },
    operations: {
        tpaEnabled: true, tpaToEnabled: true, tpaHereEnabled: true, dailyEnabled: true, redeemEnabled: true,
        timezoneOffsetMinutes: 480,
        dailyMoney: [200, 250, 300, 350, 400, 500, 800],
        daySevenItem: "minecraft:diamond", daySevenAmount: 1, maxCodes: 50,
    },
    regions: {
        maxRegions: 50, maxVolume: 4000000, defaultPriority: 100,
        defaultFlags: {
            allowBreak: false, allowPlace: false, allowBlockInteract: true, allowEntityInteract: true,
            allowPvp: false, allowExplosion: false, allowLandClaim: false,
        },
    },
    economy: {
        currencyName: "§6金币§r", currencySymbol: "§e⛁§r", scoreboardObjective: "money",
        initialBalance: 1000, minTransferAmount: 1, maxTransferAmount: 10000000,
    },
    market: { feeRate: 0.10, maxListings: 200, maxListingsPerPlayer: 10, maxUnitPrice: 100000000, maxListingNameLength: 32 },
    land: {
        pricePerChunk: 3000, sellRefundRate: 0.7, maxPlotsPerPlayer: 5, maxPlotsForAdmin: 999,
        particleBorderType: "minecraft:villager_happy", borderParticleSeconds: 8,
        defaultFlags: {
            allowBreak: false, allowPlace: false, allowInteract: false, allowAttackEntity: false, allowExplosion: false,
        },
    },
    shop: { categories: MERCHANT_CATEGORIES, vanillaDailySellCap: VANILLA_DAILY_SELL_CAP },
    weapon: {
        id: "lotm:death_knell", fallbackId: "minecraft:blaze_rod",
        name: "§l§6【2级封印物】§c丧钟左轮", damage: 48, maxRange: 55, cooldownMs: 350,
    },
    lottery: { pools: BUILT_IN_LOTTERY_POOLS, rarities: LOTTERY_RARITIES },
};
