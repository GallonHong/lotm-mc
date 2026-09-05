/** SAPI 综合系统全局配置。经济商品和奖池分别由 data 文件集中维护。 */
import { BUILT_IN_LOTTERY_POOLS, LOTTERY_RARITIES } from "./data/lotteryPools.js";
import { MERCHANT_CATEGORIES, VANILLA_DAILY_SELL_CAP } from "./data/merchantConfig.js";

export const Config = {
    system: {
        serverName: "§l§ePixel§bWorld§r",
        version: "2.11.4",
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
    itemCleanup: { enabled: true, intervalMinutes: 10, warningSeconds: [60, 30, 10] },
    social: { maxFriends: 50, teamMaxPlayers: 4, guildCreateCost: 15000, guildMaxMembers: 30 },
    operations: {
        tpaEnabled: true, tpaToEnabled: true, tpaHereEnabled: true, dailyEnabled: true, redeemEnabled: true,
        timezoneOffsetMinutes: 480,
        dailyRewardRevision: 4,
        dailyMoney: [2000, 2500, 3000, 3500, 4000, 5000, 8000],
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
    wanted: { tradeRestrictionPoints: 20, blacklistThreshold: 50, decayMinutes: 10, bailPerPoint: 3000, minimumBail: 60000 },
    vending: { buyPrice: 15000, cityPlacementFee: 5000, maxMachinesPerPlayer: 2, maxListings: 9, maxUnitPrice: 100000000, insurancePrice: 10000 },
    land: {
        pricePerChunk: 3000, sellRefundRate: 0.7, maxPlotsPerPlayer: 5, maxPlotsForAdmin: 999,
        particleBorderType: "minecraft:villager_happy", borderParticleSeconds: 8,
        defaultFlags: {
            allowBreak: false, allowPlace: false, allowInteract: false, allowAttackEntity: false, allowExplosion: false,
        },
    },
    shop: { categories: MERCHANT_CATEGORIES, vanillaDailySellCap: VANILLA_DAILY_SELL_CAP },
    safe: {
        maxDurability: 2000,
        nativeHealth: 1000000,
        interactionDistance: 2,
        watchdogTicks: 1,
        normalDamageReduction: 0.90,
        passwordMinLength: 4,
        passwordMaxLength: 8,
        maxPasswordAttempts: 3,
        passwordLockSeconds: 30,
        // 特殊枪械穿透保险箱减伤白名单：DBSS 裁决者无视 90% 减伤，造成 100% 满额真实伤害
        specialWeaponIds: ["test_gun:dbss"],
    },
    weapon: {
        id: "lotm:death_knell", fallbackId: "minecraft:blaze_rod",
        name: "§l§6【2级封印物】§c丧钟左轮", damage: 48, maxRange: 55, cooldownMs: 350,
    },
    lottery: { pools: BUILT_IN_LOTTERY_POOLS, rarities: LOTTERY_RARITIES },
};
