// scripts/main.js
import { world as world20, system as system15 } from "@minecraft/server";

// scripts/config.js
var Config = {
  // -------------------------------------------------------------
  // 基础与系统配置
  // -------------------------------------------------------------
  system: {
    serverName: "\xA7l\xA7ePixel\xA7bWorld\xA7r",
    version: "1.1.1",
    adminTag: "admin",
    // 拥有此 tag 或 op 的玩家拥有管理员权限
    menuItem: "minecraft:compass",
    // 右键唤起主菜单的物品 ID
    menuItemName: "\xA7r\xA7l\xA76\u5FEB\u6377\u5BFC\u822A\u83DC\u5355 \xA77(\u53F3\u952E\u4F7F\u7528)",
    giveMenuItemOnJoin: true,
    // 新玩家加入时是否赠送菜单罗盘
    chatPrefixes: ["!menu", "!cd", "!caidan", "\uFF01\u83DC\u5355", "!shop", "!land", "!lottery", "!pay", "!money"]
  },
  // -------------------------------------------------------------
  // 经济系统配置
  // -------------------------------------------------------------
  economy: {
    currencyName: "\xA76\u91D1\u5E01\xA7r",
    currencySymbol: "\xA7e\u26C1\xA7r",
    scoreboardObjective: "money",
    // 绑定的原版计分板名称
    initialBalance: 1e3,
    // 新玩家初始金币
    minTransferAmount: 1,
    // 最低转账金额
    maxTransferAmount: 1e7
    // 单次最高转账金额
  },
  // -------------------------------------------------------------
  // 地皮/领地保护系统配置
  // -------------------------------------------------------------
  land: {
    pricePerChunk: 3e3,
    // 购买一个 16x16 区块地皮的价格
    sellRefundRate: 0.7,
    // 出售地皮返还金币比例 (0.7 = 70%)
    maxPlotsPerPlayer: 5,
    // 普通玩家最多拥有地皮数量
    maxPlotsForAdmin: 999,
    // 管理员最多拥有地皮数量
    particleBorderType: "minecraft:villager_happy",
    // 边界粒子效果类型
    borderParticleSeconds: 8,
    // 边界粒子持续显示秒数
    // 领地默认权限开关
    defaultFlags: {
      allowBreak: false,
      // 允许非主人破坏方块
      allowPlace: false,
      // 允许非主人放置方块
      allowInteract: false,
      // 允许非主人使用容器/门/开关
      allowAttackEntity: false,
      // 允许非主人攻击实体/动物
      allowExplosion: false
      // 允许领地内发生爆炸破坏方块
    }
  },
  // -------------------------------------------------------------
  // 商店系统商品配置
  // -------------------------------------------------------------
  shop: {
    categories: [
      {
        id: "building",
        name: "\xA7a\u5EFA\u7B51\u65B9\u5757",
        icon: "textures/blocks/stonebrick",
        description: "\u5404\u7C7B\u7CBE\u7F8E\u5EFA\u7B51\u6750\u6599\u4E0E\u88C5\u9970\u65B9\u5757",
        items: [
          { id: "minecraft:stone", name: "\xA77\u77F3\u5934", buyPrice: 2, sellPrice: 1, icon: "textures/blocks/stone" },
          { id: "minecraft:cobblestone", name: "\xA77\u5706\u77F3", buyPrice: 2, sellPrice: 1, icon: "textures/blocks/cobblestone" },
          { id: "minecraft:oak_log", name: "\xA76\u6A61\u6728\u539F\u6728", buyPrice: 8, sellPrice: 4, icon: "textures/blocks/log_oak" },
          { id: "minecraft:glass", name: "\xA7f\u73BB\u7483", buyPrice: 4, sellPrice: 2, icon: "textures/blocks/glass" },
          { id: "minecraft:stonebrick", name: "\xA77\u77F3\u7816", buyPrice: 4, sellPrice: 2, icon: "textures/blocks/stonebrick" },
          { id: "minecraft:sea_lantern", name: "\xA7b\u6D77\u6676\u706F", buyPrice: 40, sellPrice: 15, icon: "textures/blocks/sea_lantern" },
          { id: "minecraft:glowstone", name: "\xA7e\u8367\u77F3", buyPrice: 30, sellPrice: 10, icon: "textures/blocks/glowstone" },
          { id: "minecraft:obsidian", name: "\xA75\u9ED1\u66DC\u77F3", buyPrice: 80, sellPrice: 30, icon: "textures/blocks/obsidian" },
          { id: "minecraft:smooth_quartz", name: "\xA7f\u5E73\u6ED1\u77F3\u82F1\u5757", buyPrice: 25, sellPrice: 8, icon: "textures/blocks/quartz_block_bottom" }
        ]
      },
      {
        id: "minerals",
        name: "\xA7b\u77FF\u77F3\u8D44\u6E90",
        icon: "textures/items/diamond",
        description: "\u7528\u4E8E\u5408\u6210\u88C5\u5907\u4E0E\u673A\u68B0\u7684\u539F\u77FF\u91D1\u5C5E",
        items: [
          { id: "minecraft:coal", name: "\xA78\u7164\u70AD", buyPrice: 5, sellPrice: 2, icon: "textures/items/coal" },
          { id: "minecraft:copper_ingot", name: "\xA76\u94DC\u952D", buyPrice: 8, sellPrice: 3, icon: "textures/items/copper_ingot" },
          { id: "minecraft:iron_ingot", name: "\xA7f\u94C1\u952D", buyPrice: 20, sellPrice: 8, icon: "textures/items/iron_ingot" },
          { id: "minecraft:gold_ingot", name: "\xA7e\u91D1\u952D", buyPrice: 40, sellPrice: 18, icon: "textures/items/gold_ingot" },
          { id: "minecraft:redstone", name: "\xA7c\u7EA2\u77F3\u7C89", buyPrice: 8, sellPrice: 3, icon: "textures/items/redstone_dust" },
          { id: "minecraft:lapis_lazuli", name: "\xA79\u9752\u91D1\u77F3", buyPrice: 8, sellPrice: 3, icon: "textures/items/dye_powder_blue" },
          { id: "minecraft:emerald", name: "\xA7a\u7EFF\u5B9D\u77F3", buyPrice: 100, sellPrice: 45, icon: "textures/items/emerald" },
          { id: "minecraft:diamond", name: "\xA7b\u94BB\u77F3", buyPrice: 200, sellPrice: 90, icon: "textures/items/diamond" },
          { id: "minecraft:netherite_ingot", name: "\xA78\u4E0B\u754C\u5408\u91D1\u952D", buyPrice: 2500, sellPrice: 1e3, icon: "textures/items/netherite_ingot" }
        ]
      },
      {
        id: "food",
        name: "\xA7e\u519C\u7267\u98DF\u7269",
        icon: "textures/items/beef_cooked",
        description: "\u6062\u590D\u9965\u997F\u5EA6\u4E0E\u751F\u5B58\u8865\u7ED9\u54C1",
        items: [
          { id: "minecraft:bread", name: "\xA76\u9762\u5305", buyPrice: 5, sellPrice: 2, icon: "textures/items/bread" },
          { id: "minecraft:cooked_beef", name: "\xA7c\u719F\u725B\u8089", buyPrice: 12, sellPrice: 5, icon: "textures/items/beef_cooked" },
          { id: "minecraft:cooked_porkchop", name: "\xA76\u719F\u732A\u6392", buyPrice: 12, sellPrice: 5, icon: "textures/items/porkchop_cooked" },
          { id: "minecraft:golden_carrot", name: "\xA7e\u91D1\u80E1\u841D\u535C", buyPrice: 35, sellPrice: 12, icon: "textures/items/carrot_golden" },
          { id: "minecraft:golden_apple", name: "\xA76\u91D1\u82F9\u679C", buyPrice: 150, sellPrice: 60, icon: "textures/items/apple_golden" },
          { id: "minecraft:enchanted_golden_apple", name: "\xA7d\u9644\u9B54\u91D1\u82F9\u679C", buyPrice: 3e3, sellPrice: 1e3, icon: "textures/items/apple_golden" },
          { id: "minecraft:experience_bottle", name: "\xA7a\u9644\u9B54\u4E4B\u74F6", buyPrice: 25, sellPrice: 8, icon: "textures/items/experience_bottle" },
          { id: "minecraft:wheat", name: "\xA7e\u5C0F\u9EA6", buyPrice: 4, sellPrice: 2, icon: "textures/items/wheat" }
        ]
      },
      {
        id: "equipment",
        name: "\xA7c\u6218\u6597\u88C5\u5907",
        icon: "textures/items/diamond_sword",
        description: "\u6B66\u5668\u3001\u9632\u5177\u53CA\u5E38\u7528\u5192\u9669\u5DE5\u5177",
        items: [
          { id: "minecraft:diamond_sword", name: "\xA7b\u94BB\u77F3\u5251", buyPrice: 500, sellPrice: 150, icon: "textures/items/diamond_sword" },
          { id: "minecraft:diamond_pickaxe", name: "\xA7b\u94BB\u77F3\u9550", buyPrice: 700, sellPrice: 200, icon: "textures/items/diamond_pickaxe" },
          { id: "minecraft:diamond_helmet", name: "\xA7b\u94BB\u77F3\u5934\u76D4", buyPrice: 1e3, sellPrice: 300, icon: "textures/items/diamond_helmet" },
          { id: "minecraft:diamond_chestplate", name: "\xA7b\u94BB\u77F3\u80F8\u7532", buyPrice: 1600, sellPrice: 500, icon: "textures/items/diamond_chestplate" },
          { id: "minecraft:diamond_leggings", name: "\xA7b\u94BB\u77F3\u62A4\u817F", buyPrice: 1400, sellPrice: 450, icon: "textures/items/diamond_leggings" },
          { id: "minecraft:diamond_boots", name: "\xA7b\u94BB\u77F3\u9774\u5B50", buyPrice: 800, sellPrice: 250, icon: "textures/items/diamond_boots" },
          { id: "minecraft:bow", name: "\xA76\u5F13", buyPrice: 60, sellPrice: 15, icon: "textures/items/bow_standby" },
          { id: "minecraft:arrow", name: "\xA7f\u7BAD\u77E2", buyPrice: 2, sellPrice: 1, icon: "textures/items/arrow" },
          { id: "minecraft:shield", name: "\xA77\u76FE\u724C", buyPrice: 100, sellPrice: 30, icon: "textures/items/shield" }
        ]
      },
      {
        id: "special",
        name: "\xA7d\u73CD\u54C1\u4E13\u533A",
        icon: "textures/items/elytra",
        description: "\u6781\u5176\u7F55\u89C1\u7684\u7A00\u4E16\u73CD\u5B9D\u4E0E\u795E\u5668",
        items: [
          { id: "minecraft:totem_of_undying", name: "\xA76\u4E0D\u6B7B\u56FE\u817E", buyPrice: 4e3, sellPrice: 1200, icon: "textures/items/totem" },
          { id: "minecraft:elytra", name: "\xA7b\u9798\u7FC5", buyPrice: 15e3, sellPrice: 4500, icon: "textures/items/elytra" },
          { id: "minecraft:shulker_box", name: "\xA7d\u6F5C\u5F71\u76D2", buyPrice: 1800, sellPrice: 500, icon: "textures/items/shulker_top_purple" },
          { id: "minecraft:nether_star", name: "\xA7e\u4E0B\u754C\u4E4B\u661F", buyPrice: 1e4, sellPrice: 3e3, icon: "textures/items/nether_star" },
          { id: "minecraft:ender_pearl", name: "\xA73\u672B\u5F71\u73CD\u73E0", buyPrice: 30, sellPrice: 10, icon: "textures/items/ender_pearl" },
          { id: "minecraft:saddle", name: "\xA76\u978D", buyPrice: 120, sellPrice: 30, icon: "textures/items/saddle" },
          { id: "minecraft:name_tag", name: "\xA7e\u547D\u540D\u724C", buyPrice: 80, sellPrice: 20, icon: "textures/items/name_tag" }
        ]
      },
      {
        id: "lotm",
        name: "\xA75\u{1F52E} \u8BE1\u79D8\u8D85\u51E1\u4E13\u533A",
        icon: "textures/items/potion_seer",
        description: "\u5404\u5927\u9014\u5F84\u5E8F\u5217\u9B54\u836F\u3001\u4E13\u5C5E\u65BD\u6CD5\u5A92\u4ECB\u4E0E\u975E\u51E1\u6D88\u8017\u54C1",
        items: [
          { id: "lotm:potion_seer", name: "\xA79\u3010\u9B54\u836F\u3011\u5E8F\u52179: \u5360\u535C\u5BB6", buyPrice: 1500, sellPrice: 500, icon: "textures/items/potion_seer" },
          { id: "lotm:potion_clown", name: "\xA7c\u3010\u9B54\u836F\u3011\u5E8F\u52178: \u5C0F\u4E11", buyPrice: 5e3, sellPrice: 1500, icon: "textures/items/potion_clown" },
          { id: "lotm:potion_magician", name: "\xA75\u3010\u9B54\u836F\u3011\u5E8F\u52177: \u9B54\u672F\u5E08", buyPrice: 18e3, sellPrice: 5e3, icon: "textures/items/potion_magician" },
          { id: "lotm:spirit_cane", name: "\xA7e\u3010\u975E\u51E1\u6B66\u5668\u3011\u9B54\u672F\u5E08\u624B\u6756", buyPrice: 1200, sellPrice: 400, icon: "textures/items/spirit_cane" },
          { id: "lotm:paper_figurine", name: "\xA7f\u3010\u7B26\u5492\u5A92\u4ECB\u3011\u7B26\u5492\u7EB8\u4EBA\u66FF\u8EAB", buyPrice: 200, sellPrice: 60, icon: "textures/items/paper_figurine" },
          { id: "lotm:tarot_card", name: "\xA7e\u3010\u98DE\u63B7\u9053\u5177\u3011\u9B54\u672F\u7EB8\u724C", buyPrice: 30, sellPrice: 8, icon: "textures/items/tarot_card" },
          { id: "lotm:pyro_gauntlet", name: "\xA7c\u3010\u975E\u51E1\u5A92\u4ECB\u3011\u7EB5\u706B\u8005\u624B\u5957", buyPrice: 3500, sellPrice: 1e3, icon: "textures/items/pyro_gauntlet" },
          { id: "lotm:alchemical_molotov", name: "\xA76\u3010\u6D88\u8017\u54C1\u3011\u70BC\u91D1\u71C3\u70E7\u74F6", buyPrice: 150, sellPrice: 40, icon: "textures/items/alchemical_molotov" },
          { id: "lotm:nightmare_watch", name: "\xA79\u3010\u975E\u51E1\u5A92\u4ECB\u3011\u68A6\u9B47\u6000\u8868", buyPrice: 4e3, sellPrice: 1200, icon: "textures/items/nightmare_watch" },
          { id: "lotm:dream_dust", name: "\xA7d\u3010\u6D88\u8017\u54C1\u3011\u5B89\u9B42\u7C89", buyPrice: 120, sellPrice: 35, icon: "textures/items/dream_dust" },
          { id: "lotm:sun_emblem", name: "\xA7e\u3010\u975E\u51E1\u5A92\u4ECB\u3011\u592A\u9633\u5723\u5FBD", buyPrice: 3800, sellPrice: 1100, icon: "textures/items/sun_emblem" },
          { id: "lotm:holy_water_bottle", name: "\xA7b\u3010\u6D88\u8017\u54C1\u3011\u7EAF\u767D\u5723\u6C34\u74F6", buyPrice: 100, sellPrice: 30, icon: "textures/items/holy_water_bottle" },
          { id: "lotm:vampire_ring", name: "\xA74\u3010\u975E\u51E1\u5A92\u4ECB\u3011\u9C9C\u8840\u6307\u73AF", buyPrice: 4200, sellPrice: 1300, icon: "textures/items/vampire_ring" },
          { id: "lotm:sealed_blood_bottle", name: "\xA7c\u3010\u6D88\u8017\u54C1\u3011\u5C01\u5B58\u8840\u6DB2\u74F6", buyPrice: 80, sellPrice: 25, icon: "textures/items/sealed_blood_bottle" },
          { id: "lotm:witch_mirror_wand", name: "\xA7d\u3010\u975E\u51E1\u5A92\u4ECB\u3011\u66FF\u8EAB\u9B54\u955C\u624B\u6756", buyPrice: 4500, sellPrice: 1400, icon: "textures/items/witch_mirror_wand" },
          { id: "lotm:curse_doll", name: "\xA78\u3010\u6D88\u8017\u54C1\u3011\u8BC5\u5492\u66FF\u8EAB\u8349\u4EBA", buyPrice: 250, sellPrice: 75, icon: "textures/items/curse_doll" }
        ]
      },
      {
        id: "sealed_artifacts",
        name: "\xA76\u2694\uFE0F \u5C01\u5370\u7269\u4E0E\u795E\u5175\u519B\u706B\u5E93",
        icon: "textures/items/death_knell",
        description: "\u300A\u8BE1\u79D8\u4E4B\u4E3B\u300B2\u7EA7/3\u7EA7\u9AD8\u9636\u5C01\u5370\u7269\u4E0E\u6B66\u5668\u5927\u5E08\u5168\u5957\u6218\u672F\u795E\u5175",
        items: [
          { id: "lotm:death_knell", name: "\xA7l\xA76\u30102\u7EA7\u5C01\u5370\u7269\u3011\xA7c\u4E27\u949F\u77ED\u94F3", buyPrice: 88888, sellPrice: 3e4, icon: "textures/items/death_knell" },
          { id: "lotm:ashen_reaper", name: "\xA7l\xA7c\u30103\u7EA7\u5C01\u5370\u7269\u3011\xA7e\u7070\u70EC\u6536\u5272\u8005", buyPrice: 45e3, sellPrice: 15e3, icon: "textures/items/ashen_reaper" },
          { id: "lotm:dawn_greatsword", name: "\xA7l\xA7e\u30103\u7EA7\u5C01\u5370\u7269\u3011\xA7b\u6668\u66E6\u5723\u5251", buyPrice: 48e3, sellPrice: 16e3, icon: "textures/items/dawn_greatsword" },
          { id: "lotm:silent_pointer", name: "\xA7l\xA79\u30103\u7EA7\u5C01\u5370\u7269\u3011\xA77\u9759\u9ED8\u4E4B\u9488", buyPrice: 42e3, sellPrice: 14e3, icon: "textures/items/silent_pointer" },
          { id: "lotm:blood_moon_rapier", name: "\xA7l\xA74\u30103\u7EA7\u5C01\u5370\u7269\u3011\xA7d\u8840\u6708\u523A\u5251", buyPrice: 46e3, sellPrice: 15500, icon: "textures/items/blood_moon_rapier" },
          { id: "lotm:mirror_split_dagger", name: "\xA7l\xA7d\u30103\u7EA7\u5C01\u5370\u7269\u3011\xA7b\u955C\u9762\u88C2\u9B42\u77ED\u5315", buyPrice: 43e3, sellPrice: 14500, icon: "textures/items/mirror_split_dagger" },
          { id: "lotm:arsenal_box", name: "\xA7l\xA76\u30103\u7EA7\u5C01\u5370\u7269\u3011\xA7f\u4E07\u8C61\u519B\u5907\u5323", buyPrice: 52e3, sellPrice: 18e3, icon: "textures/items/arsenal_box" },
          { id: "lotm:tactical_sword", name: "\xA76\u3010\u6218\u672F\u6218\u5175\u3011\u7834\u7532\u957F\u5251", buyPrice: 2e3, sellPrice: 600, icon: "textures/items/tactical_sword" },
          { id: "lotm:tactical_axe", name: "\xA7c\u3010\u6218\u672F\u6218\u5175\u3011\u788E\u9885\u6218\u65A7", buyPrice: 2200, sellPrice: 700, icon: "textures/items/tactical_axe" },
          { id: "lotm:tactical_spear", name: "\xA7b\u3010\u6218\u672F\u6218\u5175\u3011\u8D2F\u7A7F\u957F\u77DB", buyPrice: 2400, sellPrice: 750, icon: "textures/items/tactical_spear" },
          { id: "lotm:tactical_bow", name: "\xA7a\u3010\u6218\u672F\u6218\u5175\u3011\u7CBE\u51C6\u6218\u5F13", buyPrice: 2500, sellPrice: 800, icon: "textures/items/tactical_bow" },
          { id: "lotm:blade_oil", name: "\xA7e\u3010\u9644\u9B54\u6D88\u8017\u54C1\u3011\u9644\u9B54\u5251\u6CB9", buyPrice: 180, sellPrice: 50, icon: "textures/items/blade_oil" }
        ]
      }
    ]
  },
  // -------------------------------------------------------------
  // 抽奖限定非凡神兵配置：【2级封印物：丧钟左轮】
  // -------------------------------------------------------------
  weapon: {
    id: "lotm:death_knell",
    fallbackId: "minecraft:blaze_rod",
    name: "\xA7l\xA76\u30102\u7EA7\u5C01\u5370\u7269\u3011\xA7c\u4E27\u949F\u5DE6\u8F6E",
    damage: 48,
    // 致命弱点伤害
    maxRange: 55,
    // 超远射程
    cooldownMs: 350
    // 射击冷却毫秒数 (0.35秒)
  },
  // -------------------------------------------------------------
  // 幸运抽奖系统配置
  // -------------------------------------------------------------
  lottery: {
    pools: [
      {
        id: "coin_pool",
        name: "\xA7e\u{1FA99} \u666E\u901A\u91D1\u5E01\u5956\u6C60",
        icon: "textures/items/gold_nugget",
        description: "\xA77\u6D88\u8017\u91D1\u5E01\u62BD\u53D6\u65E5\u5E38\u5B9E\u7528\u5EFA\u6750\u3001\u77FF\u7269\u4E0E\u98DF\u7269\u5956\u52B1\u3002",
        singleCost: 200,
        tenCost: 1800,
        // 9折
        items: [
          // weight 权重越大几率越高
          { id: "minecraft:coal", amount: 16, name: "\xA78\u7164\u70AD x16", weight: 30, rarity: "common" },
          { id: "minecraft:cooked_beef", amount: 16, name: "\xA7c\u719F\u725B\u8089 x16", weight: 25, rarity: "common" },
          { id: "minecraft:iron_ingot", amount: 8, name: "\xA7f\u94C1\u952D x8", weight: 20, rarity: "common" },
          { id: "minecraft:gold_ingot", amount: 6, name: "\xA7e\u91D1\u952D x6", weight: 15, rarity: "rare" },
          { id: "lotm:tarot_card", amount: 16, name: "\xA7e\u9B54\u672F\u7EB8\u724C x16", weight: 14, rarity: "rare" },
          { id: "minecraft:experience_bottle", amount: 16, name: "\xA7a\u9644\u9B54\u4E4B\u74F6 x16", weight: 12, rarity: "rare" },
          { id: "minecraft:emerald", amount: 4, name: "\xA7a\u7EFF\u5B9D\u77F3 x4", weight: 10, rarity: "rare" },
          { id: "lotm:paper_figurine", amount: 2, name: "\xA7f\u7EB8\u4EBA\u66FF\u8EAB x2", weight: 8, rarity: "epic" },
          { id: "minecraft:diamond", amount: 2, name: "\xA7b\u94BB\u77F3 x2", weight: 5, rarity: "epic" },
          { id: "minecraft:golden_apple", amount: 3, name: "\xA76\u91D1\u82F9\u679C x3", weight: 4, rarity: "epic" },
          { id: "lotm:potion_seer", amount: 1, name: "\xA7l\xA79\u3010\u9B54\u836F\u3011\u5E8F\u52179: \u5360\u535C\u5BB6", weight: 3, rarity: "legendary" },
          { id: "minecraft:totem_of_undying", amount: 1, name: "\xA76\u4E0D\u6B7B\u56FE\u817E x1", weight: 1, rarity: "legendary" }
        ]
      },
      {
        id: "vip_pool",
        name: "\xA76\u{1F451} \u9AD8\u7EA7\u6B27\u7687\u5956\u6C60",
        icon: "textures/items/nether_star",
        description: "\xA77\u9AD8\u989D\u91D1\u5E01\u5956\u6C60\uFF0C\u6781\u9AD8\u6982\u7387\u83B7\u5F97\u9650\u5B9A\u795E\u8BDD\u975E\u51E1\u795E\u5175\u3001\u6781\u54C1\u795E\u88C5\u4E0E\u4E0B\u754C\u5408\u91D1\uFF01",
        singleCost: 2e3,
        tenCost: 18e3,
        items: [
          { id: "minecraft:diamond", amount: 8, name: "\xA7b\u94BB\u77F3 x8", weight: 26, rarity: "rare" },
          { id: "minecraft:emerald_block", amount: 2, name: "\xA7a\u7EFF\u5B9D\u77F3\u5757 x2", weight: 22, rarity: "rare" },
          { id: "lotm:paper_figurine", amount: 8, name: "\xA7f\u7EB8\u4EBA\u66FF\u8EAB x8", weight: 16, rarity: "rare" },
          { id: "minecraft:experience_bottle", amount: 64, name: "\xA7a\u9644\u9B54\u4E4B\u74F6 x64", weight: 14, rarity: "rare" },
          { id: "lotm:spirit_cane", amount: 1, name: "\xA7l\xA7e\u3010\u975E\u51E1\u624B\u6756\u3011\u9B54\u672F\u5E08\u624B\u6756", weight: 12, rarity: "epic" },
          { id: "minecraft:netherite_ingot", amount: 1, name: "\xA78\u4E0B\u754C\u5408\u91D1\u952D x1", weight: 10, rarity: "epic" },
          { id: "minecraft:totem_of_undying", amount: 1, name: "\xA76\u4E0D\u6B7B\u56FE\u817E x1", weight: 8, rarity: "epic" },
          { id: "lotm:potion_clown", amount: 1, name: "\xA7l\xA7c\u3010\u9B54\u836F\u3011\u5E8F\u52178: \u5C0F\u4E11", weight: 6, rarity: "legendary" },
          { id: "lotm:potion_magician", amount: 1, name: "\xA7l\xA75\u3010\u9B54\u836F\u3011\u5E8F\u52177: \u9B54\u672F\u5E08", weight: 4, rarity: "legendary" },
          { id: "minecraft:shulker_box", amount: 1, name: "\xA7d\u6F5C\u5F71\u76D2 x1", weight: 4, rarity: "legendary" },
          { id: "minecraft:elytra", amount: 1, name: "\xA7b\u9798\u7FC5 x1", weight: 3, rarity: "legendary" },
          { id: "lotm:death_knell", amount: 1, name: "\xA7l\xA76\u30102\u7EA7\u5C01\u5370\u7269\u3011\xA7c\u4E27\u949F\u5DE6\u8F6E", weight: 2, rarity: "mythic", isWeapon: true }
        ]
      }
    ],
    rarities: {
      common: { name: "\xA77\u666E\u901A", color: "\xA77", broadcast: false },
      rare: { name: "\xA79\u7A00\u6709", color: "\xA79", broadcast: false },
      epic: { name: "\xA75\u53F2\u8BD7", color: "\xA75", broadcast: true },
      legendary: { name: "\xA76\u4F20\u8BF4", color: "\xA76", broadcast: true },
      mythic: { name: "\xA7l\xA7c\u795E\u8BDD\u9650\u5B9A", color: "\xA7c", broadcast: true }
    }
  }
};

// scripts/utils.js
import { world, system, ItemStack } from "@minecraft/server";
var Utils = class _Utils {
  /**
   * 向指定玩家发送带前缀的消息
   * @param {import("@minecraft/server").Player} player 
   * @param {string} text 
   */
  static tell(player, text) {
    if (!player) return;
    player.sendMessage(`\xA7l[\xA7e\u7CFB\u7EDF\xA7r\xA7l]\xA7r ${text}`);
  }
  /**
   * 安全展示 UI 界面，自动拦截并重试 UserBusy 状态
   * @param {import("@minecraft/server").Player} player
   * @param {object} form
   * @param {(response: any) => void} callback
   * @param {number} [maxRetries=5]
   */
  static showForm(player, form, callback, maxRetries = 5) {
    if (!player || !form) return;
    form.show(player).then((res) => {
      if (res.canceled) {
        if (res.cancelationReason === "UserBusy" && maxRetries > 0) {
          system.runTimeout(() => {
            _Utils.showForm(player, form, callback, maxRetries - 1);
          }, 3);
          return;
        }
        return;
      }
      try {
        callback(res);
      } catch (err) {
        console.error("[UI Callback Error]", err);
      }
    });
  }
  /**
   * 向指定玩家发送底部动作栏消息 (Actionbar)
   * @param {import("@minecraft/server").Player} player 
   * @param {string} text 
   */
  static actionbar(player, text) {
    if (!player) return;
    player.onScreenDisplay.setActionBar(text);
  }
  /**
   * 向全服所有玩家广播消息
   * @param {string} text 
   */
  static broadcast(text) {
    world.sendMessage(`\xA7l[\xA76\u516C\u544A\xA7r\xA7l]\xA7r ${text}`);
  }
  /**
   * 播放音效
   * @param {import("@minecraft/server").Player} player 
   * @param {string} soundName 
   * @param {number} pitch 
   * @param {number} volume 
   */
  static playSound(player, soundName, pitch = 1, volume = 1) {
    try {
      player.playSound(soundName, { pitch, volume });
    } catch (e) {
    }
  }
  /**
   * 常用提示音效集合
   */
  static sound = {
    success: (player) => _Utils.playSound(player, "random.orb", 1.2, 1),
    click: (player) => _Utils.playSound(player, "ui.button.click", 1, 0.8),
    fail: (player) => _Utils.playSound(player, "note.bass", 0.8, 1),
    buy: (player) => _Utils.playSound(player, "random.levelup", 1.5, 1),
    gachaRoll: (player) => _Utils.playSound(player, "random.fuse", 1.8, 1),
    rareWin: (player) => _Utils.playSound(player, "random.totem", 1, 1),
    warn: (player) => _Utils.playSound(player, "note.bassattack", 0.6, 1),
    teleport: (player) => _Utils.playSound(player, "mob.endermen.portal", 1, 1)
  };
  /**
   * 格式化货币数量
   * @param {number} amount 
   * @returns {string}
   */
  static formatCurrency(amount) {
    const num = Math.floor(amount || 0);
    return `\xA7e${num.toLocaleString()} \xA7r${Config.economy.currencyName}`;
  }
  /**
   * 安全检查实体/玩家是否有效 (兼容不同 SAPI 版本的属性与方法)
   * @param {import("@minecraft/server").Entity|import("@minecraft/server").Player} entity 
   * @returns {boolean}
   */
  static isValid(entity) {
    if (!entity) return false;
    try {
      if (typeof entity.isValid === "function") return entity.isValid();
      if (typeof entity.isValid === "boolean") return entity.isValid;
      return !!entity.id;
    } catch {
      return false;
    }
  }
  /**
   * 检查玩家是否具备管理员权限
   * @param {import("@minecraft/server").Player} player 
   * @returns {boolean}
   */
  static isAdmin(player) {
    if (!_Utils.isValid(player)) return false;
    try {
      const hasTag = typeof player.hasTag === "function" && player.hasTag(Config.system.adminTag);
      const isOp = typeof player.isOp === "function" && player.isOp();
      return !!(hasTag || isOp);
    } catch {
      return false;
    }
  }
  /**
   * 获取玩家背包中某物品的总数量
   * @param {import("@minecraft/server").Player} player 
   * @param {string} typeId 物品ID (如 "minecraft:diamond")
   * @returns {number}
   */
  static countItem(player, typeId) {
    const inventory = player.getComponent("inventory");
    if (!inventory || !inventory.container) return 0;
    let total = 0;
    const container = inventory.container;
    for (let i = 0; i < container.size; i++) {
      const item = container.getItem(i);
      if (item && item.typeId === typeId) {
        total += item.amount;
      }
    }
    return total;
  }
  /**
   * 从玩家背包扣除指定数量的物品
   * @param {import("@minecraft/server").Player} player 
   * @param {string} typeId 
   * @param {number} amount 
   * @returns {boolean} 是否成功扣除全部数量
   */
  static removeItem(player, typeId, amount) {
    const currentCount = _Utils.countItem(player, typeId);
    if (currentCount < amount) return false;
    const inventory = player.getComponent("inventory");
    if (!inventory || !inventory.container) return false;
    let remainingToRemove = amount;
    const container = inventory.container;
    for (let i = 0; i < container.size; i++) {
      if (remainingToRemove <= 0) break;
      const item = container.getItem(i);
      if (item && item.typeId === typeId) {
        if (item.amount <= remainingToRemove) {
          remainingToRemove -= item.amount;
          container.setItem(i, void 0);
        } else {
          item.amount -= remainingToRemove;
          container.setItem(i, item);
          remainingToRemove = 0;
        }
      }
    }
    return true;
  }
  /**
   * 向玩家发放物品（背包满了自动掉落在玩家脚下）
   * @param {import("@minecraft/server").Player} player 
   * @param {string} typeId 
   * @param {number} amount 
   * @param {string} [nameTag]
   * @param {string[]} [lore]
   */
  static giveItem(player, typeId, amount = 1, nameTag = null, lore = null) {
    const inventory = player.getComponent("inventory");
    if (!inventory || !inventory.container) return;
    const container = inventory.container;
    let leftAmount = amount;
    while (leftAmount > 0) {
      const batch = Math.min(leftAmount, 64);
      leftAmount -= batch;
      try {
        const item = new ItemStack(typeId, batch);
        if (nameTag) item.nameTag = nameTag;
        if (lore && Array.isArray(lore)) item.setLore(lore);
        const leftover = container.addItem(item);
        if (leftover) {
          player.dimension.spawnItem(leftover, player.location);
          _Utils.actionbar(player, "\xA76[\u63D0\u793A] \u80CC\u5305\u7A7A\u95F4\u4E0D\u8DB3\uFF0C\u90E8\u5206\u7269\u54C1\u5DF2\u6389\u843D\u5728\u5730\u9762\uFF01");
        }
      } catch (e) {
        console.warn(`[Utils] Failed to create or give item: ${typeId} - ${e}`);
      }
    }
  }
  /**
   * 获取指定坐标所在区块坐标 (16x16)
   * @param {import("@minecraft/server").Vector3} location 
   * @returns {{ chunkX: number, chunkZ: number }}
   */
  static getChunkCoords(location) {
    return {
      chunkX: Math.floor(location.x / 16),
      chunkZ: Math.floor(location.z / 16)
    };
  }
  /**
   * 生成区块的全局唯一存储键
   * @param {string} dimensionId 维度ID (如 "minecraft:overworld")
   * @param {number} chunkX 
   * @param {number} chunkZ 
   * @returns {string}
   */
  static getPlotKey(dimensionId, chunkX, chunkZ) {
    const dim = dimensionId.replace("minecraft:", "");
    return `plt_${dim}_${chunkX}_${chunkZ}`;
  }
  /**
   * 生成区块的世界边界盒坐标
   * @param {number} chunkX 
   * @param {number} chunkZ 
   * @returns {{ minX: number, maxX: number, minZ: number, maxZ: number }}
   */
  static getChunkBounds(chunkX, chunkZ) {
    const minX = chunkX * 16;
    const minZ = chunkZ * 16;
    return {
      minX,
      maxX: minX + 15,
      minZ,
      maxZ: minZ + 15
    };
  }
  /**
   * 读取实体动态属性 (Dynamic Property)
   * @param {import("@minecraft/server").Entity|import("@minecraft/server").Player} entity 
   * @param {string} key 
   * @param {any} [defaultValue=null] 
   * @returns {any}
   */
  static getProp(entity, key, defaultValue = null) {
    if (!entity || typeof entity.getDynamicProperty !== "function") return defaultValue;
    try {
      const val = entity.getDynamicProperty(key);
      return val !== void 0 && val !== null ? val : defaultValue;
    } catch {
      return defaultValue;
    }
  }
  /**
   * 写入实体动态属性 (Dynamic Property)
   * @param {import("@minecraft/server").Entity|import("@minecraft/server").Player} entity 
   * @param {string} key 
   * @param {any} value 
   */
  static setProp(entity, key, value) {
    if (!entity || typeof entity.setDynamicProperty !== "function") return;
    try {
      entity.setDynamicProperty(key, value);
    } catch (e) {
      console.warn(`[Utils] Failed to setDynamicProperty ${key}: ${e}`);
    }
  }
};

// scripts/modules/economy.js
import { world as world2, system as system2 } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";
var EconomyManager = class {
  /**
   * 获取或初始化绑定的原版计分板对象
   * @returns {import("@minecraft/server").ScoreboardObjective}
   */
  static getObjective() {
    const objName = Config.economy.scoreboardObjective;
    let objective = world2.scoreboard.getObjective(objName);
    if (!objective) {
      objective = world2.scoreboard.addObjective(objName, Config.economy.currencyName);
    }
    return objective;
  }
  /**
   * 获取玩家当前金币余额
   * @param {import("@minecraft/server").Player} player 
   * @returns {number}
   */
  static getBalance(player) {
    if (!player) return 0;
    const objective = this.getObjective();
    try {
      if (objective.hasParticipant(player)) {
        return objective.getScore(player) ?? 0;
      } else {
        const initScore = Config.economy.initialBalance;
        objective.setScore(player, initScore);
        return initScore;
      }
    } catch {
      return 0;
    }
  }
  /**
   * 设置玩家金币余额
   * @param {import("@minecraft/server").Player} player 
   * @param {number} amount 
   */
  static setBalance(player, amount) {
    if (!player) return;
    const objective = this.getObjective();
    const value = Math.max(0, Math.floor(amount));
    objective.setScore(player, value);
  }
  /**
   * 增加玩家金币余额
   * @param {import("@minecraft/server").Player} player 
   * @param {number} amount 
   * @returns {number} 增加后的最新余额
   */
  static addBalance(player, amount) {
    if (!player || amount <= 0) return this.getBalance(player);
    const current = this.getBalance(player);
    const newBalance = current + Math.floor(amount);
    this.setBalance(player, newBalance);
    return newBalance;
  }
  /**
   * 扣除玩家金币余额
   * @param {import("@minecraft/server").Player} player 
   * @param {number} amount 
   * @returns {boolean} 是否扣除成功
   */
  static removeBalance(player, amount) {
    if (!player || amount <= 0) return false;
    const current = this.getBalance(player);
    const val = Math.floor(amount);
    if (current < val) {
      return false;
    }
    this.setBalance(player, current - val);
    return true;
  }
  /**
   * 检查玩家是否有足够的金币
   * @param {import("@minecraft/server").Player} player 
   * @param {number} amount 
   * @returns {boolean}
   */
  static hasBalance(player, amount) {
    return this.getBalance(player) >= Math.floor(amount);
  }
  /**
   * 执行玩家之间的金币转账
   * @param {import("@minecraft/server").Player} fromPlayer 
   * @param {import("@minecraft/server").Player} toPlayer 
   * @param {number} amount 
   * @returns {{ success: boolean, message: string }}
   */
  static transfer(fromPlayer, toPlayer, amount) {
    const val = Math.floor(amount);
    if (val < Config.economy.minTransferAmount) {
      return { success: false, message: `\u8F6C\u8D26\u91D1\u989D\u4E0D\u80FD\u5C0F\u4E8E ${Config.economy.minTransferAmount}` };
    }
    if (val > Config.economy.maxTransferAmount) {
      return { success: false, message: `\u5355\u6B21\u8F6C\u8D26\u91D1\u989D\u4E0D\u80FD\u8D85\u8FC7 ${Config.economy.maxTransferAmount}` };
    }
    if (fromPlayer.id === toPlayer.id) {
      return { success: false, message: "\u4E0D\u80FD\u5411\u81EA\u5DF1\u8F6C\u8D26\uFF01" };
    }
    if (!this.hasBalance(fromPlayer, val)) {
      return { success: false, message: "\u60A8\u7684\u91D1\u5E01\u4F59\u989D\u4E0D\u8DB3\uFF01" };
    }
    const deducted = this.removeBalance(fromPlayer, val);
    if (!deducted) {
      return { success: false, message: "\u8F6C\u8D26\u6263\u6B3E\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\uFF01" };
    }
    this.addBalance(toPlayer, val);
    Utils.tell(fromPlayer, `\xA7a\u6210\u529F\u5411\u73A9\u5BB6 \xA7e${toPlayer.name} \xA7a\u8F6C\u8D26 ${Utils.formatCurrency(val)}`);
    Utils.sound.success(fromPlayer);
    Utils.tell(toPlayer, `\xA7e\u6536\u5230\u6765\u81EA\u73A9\u5BB6 \xA7a${fromPlayer.name} \xA7e\u7684\u8F6C\u8D26\uFF1A${Utils.formatCurrency(val)}`);
    Utils.sound.buy(toPlayer);
    return { success: true, message: "\u8F6C\u8D26\u6210\u529F\uFF01" };
  }
  /**
   * 打开个人银行与资产管理界面
   * @param {import("@minecraft/server").Player} player 
   * @param {Function} [onBack] 
   */
  static openBankUI(player, onBack = null) {
    const balance = this.getBalance(player);
    const form = new ActionFormData().title("\xA7l\xA76\u{1F3E6} \u4E2A\u4EBA\u94F6\u884C\u4E0E\u8D44\u4EA7").body(
      `\xA77\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
\xA7f\u73A9\u5BB6\u59D3\u540D: \xA7e${player.name}
\xA7f\u5F53\u524D\u8D44\u4EA7: ${Utils.formatCurrency(balance)}
\xA77\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
\xA77\u8BF7\u9009\u62E9\u4F60\u8981\u8FDB\u884C\u7684\u8D44\u91D1\u64CD\u4F5C\uFF1A`
    ).button("\xA7l\xA72\u{1F4B8} \u73A9\u5BB6\u8F6C\u8D26\n\xA7r\xA78\u5411\u5728\u7EBF\u73A9\u5BB6\u6C47\u6B3E", "textures/ui/Trade2").button("\xA7l\xA7e\u{1F3C6} \u8D22\u5BCC\u6392\u884C\u699C\n\xA7r\xA78\u67E5\u770B\u5168\u670D\u5BCC\u8C6A\u699C\u5355", "textures/ui/achievements");
    if (onBack) {
      form.button("\xA7l\xA7c\u{1F519} \u8FD4\u56DE\u4E0A\u7EA7\n\xA7r\xA78\u8FD4\u56DE\u4E3B\u83DC\u5355", "textures/ui/cancel");
    }
    Utils.showForm(player, form, (res) => {
      if (res.selection === 0) {
        this.openTransferUI(player, () => this.openBankUI(player, onBack));
      } else if (res.selection === 1) {
        this.openLeaderboardUI(player, () => this.openBankUI(player, onBack));
      } else if (res.selection === 2 && onBack) {
        onBack();
      }
    });
  }
  /**
   * 打开玩家转账输入弹窗
   * @param {import("@minecraft/server").Player} player 
   * @param {Function} [onBack] 
   */
  static openTransferUI(player, onBack = null) {
    const onlinePlayers = world2.getAllPlayers().filter((p) => p.id !== player.id);
    if (onlinePlayers.length === 0) {
      const form2 = new MessageFormData().title("\xA7l\xA7c\u8F6C\u8D26\u63D0\u793A").body("\u5F53\u524D\u670D\u52A1\u5668\u5185\u6CA1\u6709\u5176\u4ED6\u5728\u7EBF\u73A9\u5BB6\uFF0C\u65E0\u6CD5\u8FDB\u884C\u8F6C\u8D26\uFF01").button1("\xA7l\u786E\u5B9A").button2("\xA7l\u8FD4\u56DE");
      form2.show(player).then(() => {
        if (onBack) onBack();
      });
      return;
    }
    const playerNames = onlinePlayers.map((p) => p.name);
    const balance = this.getBalance(player);
    const form = new ModalFormData().title("\xA7l\xA72\u{1F4B8} \u73A9\u5BB6\u8F6C\u8D26").dropdown(`\xA7f\u9009\u62E9\u6536\u6B3E\u4EBA:
\xA77(\u4F60\u7684\u5F53\u524D\u4F59\u989D: ${Utils.formatCurrency(balance)})`, playerNames).textField("\xA7f\u8F6C\u8D26\u91D1\u989D:", "\u8BF7\u8F93\u5165\u8F6C\u8D26\u91D1\u5E01\u6570\u91CF (\u4F8B\u5982: 100)");
    Utils.showForm(player, form, (res) => {
      if (res.canceled) {
        if (onBack) onBack();
        return;
      }
      const [targetIndex, amountStr] = res.formValues;
      const targetPlayer = onlinePlayers[targetIndex];
      const amount = parseInt(amountStr);
      if (isNaN(amount) || amount <= 0) {
        Utils.tell(player, "\xA7c\u8F6C\u8D26\u91D1\u989D\u5FC5\u987B\u4E3A\u6709\u6548\u6B63\u6574\u6570\uFF01");
        Utils.sound.fail(player);
        return;
      }
      if (!Utils.isValid(targetPlayer)) {
        Utils.tell(player, "\xA7c\u76EE\u6807\u73A9\u5BB6\u5DF2\u79BB\u7EBF\u6216\u4E0D\u53EF\u7528\uFF01");
        Utils.sound.fail(player);
        return;
      }
      const result = this.transfer(player, targetPlayer, amount);
      if (!result.success) {
        Utils.tell(player, `\xA7c${result.message}`);
        Utils.sound.fail(player);
      }
    });
  }
  /**
   * 打开全服在线玩家财富排行榜
   * @param {import("@minecraft/server").Player} player 
   * @param {Function} [onBack] 
   */
  static openLeaderboardUI(player, onBack = null) {
    const allPlayers = world2.getAllPlayers();
    const playerStats = allPlayers.map((p) => ({
      name: p.name,
      balance: this.getBalance(p)
    })).sort((a, b) => b.balance - a.balance);
    let content = "\xA77\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 \u{1F3C6} \u8D22\u5BCC\u699C TOP 10 \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\n";
    const medals = ["\xA76\u{1F947} \u7B2C 1 \u540D", "\xA77\u{1F948} \u7B2C 2 \u540D", "\xA7c\u{1F949} \u7B2C 3 \u540D"];
    playerStats.slice(0, 10).forEach((item, index) => {
      const rankLabel = medals[index] || `\xA7f[\u7B2C ${index + 1} \u540D]`;
      content += `${rankLabel} \xA7e${item.name} \xA7r- ${Utils.formatCurrency(item.balance)}
`;
    });
    content += `
\xA77\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
`;
    content += `\xA7f\u4F60\u7684\u5F53\u524D\u8D44\u4EA7: ${Utils.formatCurrency(this.getBalance(player))}`;
    const form = new ActionFormData().title("\xA7l\xA7e\u{1F3C6} \u8D22\u5BCC\u6392\u884C\u699C").body(content).button("\xA7l\xA7a\u786E\u5B9A / \u5237\u65B0", "textures/ui/refresh").button("\xA7l\xA7c\u{1F519} \u8FD4\u56DE", "textures/ui/cancel");
    Utils.showForm(player, form, (res) => {
      if (res.selection === 0) {
        this.openLeaderboardUI(player, onBack);
      } else if (res.selection === 1 && onBack) {
        onBack();
      }
    });
  }
};

// scripts/modules/shop.js
import { world as world3 } from "@minecraft/server";
import { ActionFormData as ActionFormData2, ModalFormData as ModalFormData2 } from "@minecraft/server-ui";
var ShopManager = class {
  /**
   * 打开商店分类主界面
   * @param {import("@minecraft/server").Player} player 
   * @param {Function} [onBack] 
   */
  static openShopCategoryUI(player, onBack = null) {
    const balance = EconomyManager.getBalance(player);
    const form = new ActionFormData2().title("\xA7l\xA76\u{1F6D2} \u5168\u7403\u7EFC\u5408\u5546\u5E97").body(
      `\xA77\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
\xA7f\u5F53\u524D\u8D44\u4EA7: ${Utils.formatCurrency(balance)}
\xA77\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
\xA77\u8BF7\u9009\u62E9\u4F60\u8981\u6D4F\u89C8\u7684\u5546\u54C1\u5206\u7C7B\uFF1A`
    );
    const categories = Config.shop.categories;
    for (const cat of categories) {
      form.button(`${cat.name}
\xA7r\xA78${cat.description}`, cat.icon);
    }
    if (onBack) {
      form.button("\xA7l\xA7c\u{1F519} \u8FD4\u56DE\u4E0A\u7EA7\n\xA7r\xA78\u8FD4\u56DE\u4E3B\u83DC\u5355", "textures/ui/cancel");
    }
    Utils.showForm(player, form, (res) => {
      if (res.selection < categories.length) {
        const selectedCat = categories[res.selection];
        this.openCategoryItemsUI(player, selectedCat, () => this.openShopCategoryUI(player, onBack));
      } else if (onBack) {
        onBack();
      }
    });
  }
  /**
   * 打开特定分类下的商品列表
   * @param {import("@minecraft/server").Player} player 
   * @param {object} category 
   * @param {Function} [onBack] 
   */
  static openCategoryItemsUI(player, category, onBack = null) {
    const balance = EconomyManager.getBalance(player);
    const form = new ActionFormData2().title(`\xA7l${category.name}`).body(
      `\xA77\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
\xA7f\u5F53\u524D\u8D44\u4EA7: ${Utils.formatCurrency(balance)}
\xA77\u70B9\u51FB\u5546\u54C1\u5373\u53EF\u8FDB\u5165\u8D2D\u4E70\u6216\u51FA\u552E\u754C\u9762
\xA77\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`
    );
    const items = category.items;
    for (const item of items) {
      const buyText = item.buyPrice ? `\xA7a\u4E70: \xA7e${item.buyPrice}` : "\xA78\u4E0D\u53EF\u4E70";
      const sellText = item.sellPrice ? `\xA7c\u5356: \xA7e${item.sellPrice}` : "\xA78\u4E0D\u53EF\u5356";
      form.button(`${item.name}
${buyText} \xA77| ${sellText}`, item.icon);
    }
    form.button("\xA7l\xA7c\u{1F519} \u8FD4\u56DE\u5206\u7C7B\n\xA7r\xA78\u9009\u62E9\u5176\u4ED6\u5546\u54C1\u4E13\u533A", "textures/ui/cancel");
    Utils.showForm(player, form, (res) => {
      if (res.selection < items.length) {
        const item = items[res.selection];
        this.openItemTradeUI(player, item, () => this.openCategoryItemsUI(player, category, onBack));
      } else if (onBack) {
        onBack();
      }
    });
  }
  /**
   * 打开单个商品的买卖交互弹窗
   * @param {import("@minecraft/server").Player} player 
   * @param {object} item 
   * @param {Function} [onBack] 
   */
  static openItemTradeUI(player, item, onBack = null) {
    const balance = EconomyManager.getBalance(player);
    const bagCount = Utils.countItem(player, item.id);
    const tradeOptions = [];
    if (item.buyPrice) tradeOptions.push(`\xA7a\u8D2D\u4E70 (\u5355\u4EF7: ${item.buyPrice} \u91D1\u5E01)`);
    if (item.sellPrice) tradeOptions.push(`\xA7c\u51FA\u552E (\u5355\u4EF7: ${item.sellPrice} \u91D1\u5E01)`);
    if (tradeOptions.length === 0) {
      Utils.tell(player, "\xA7c\u6B64\u7269\u54C1\u6682\u4E0D\u652F\u6301\u4EA4\u6613\uFF01");
      if (onBack) onBack();
      return;
    }
    const form = new ModalFormData2().title(`\xA7l\u4EA4\u6613: ${item.name}`).dropdown(`\xA7f\u4F60\u7684\u91D1\u5E01: ${Utils.formatCurrency(balance)}
\xA7f\u80CC\u5305\u5E93\u5B58: \xA7b${bagCount} \xA7f\u4E2A

\xA77\u8BF7\u9009\u62E9\u4EA4\u6613\u7C7B\u578B:`, tradeOptions).slider("\xA7f\u4EA4\u6613\u6570\u91CF (1 - 64):", 1, 64, 1);
    Utils.showForm(player, form, (res) => {
      if (res.canceled) {
        if (onBack) onBack();
        return;
      }
      const [typeIndex, quantity] = res.formValues;
      const selectedText = tradeOptions[typeIndex];
      const isBuy = selectedText.includes("\u8D2D\u4E70");
      const count = Math.floor(quantity);
      if (count <= 0) return;
      if (isBuy) {
        const totalCost = (item.buyPrice || 0) * count;
        if (!EconomyManager.hasBalance(player, totalCost)) {
          Utils.tell(player, `\xA7c\u8D2D\u4E70\u5931\u8D25\uFF01\u4F60\u9700\u8981 ${Utils.formatCurrency(totalCost)}\uFF0C\u4F46\u53EA\u6709 ${Utils.formatCurrency(balance)}\u3002`);
          Utils.sound.fail(player);
          return;
        }
        EconomyManager.removeBalance(player, totalCost);
        Utils.giveItem(player, item.id, count);
        Utils.tell(player, `\xA7a\u6210\u529F\u8D2D\u4E70 \xA7e${item.name} \xA7ax${count}\uFF0C\u82B1\u8D39 ${Utils.formatCurrency(totalCost)}\uFF01`);
        Utils.sound.buy(player);
      } else {
        const actualInBag = Utils.countItem(player, item.id);
        if (actualInBag < count) {
          Utils.tell(player, `\xA7c\u51FA\u552E\u5931\u8D25\uFF01\u4F60\u80CC\u5305\u4E2D\u53EA\u6709 \xA7e${actualInBag} \xA7c\u4E2A ${item.name}\uFF0C\u4E0D\u8DB3\u4EE5\u51FA\u552E \xA7e${count} \xA7c\u4E2A\u3002`);
          Utils.sound.fail(player);
          return;
        }
        const totalEarn = (item.sellPrice || 0) * count;
        const removed = Utils.removeItem(player, item.id, count);
        if (!removed) {
          Utils.tell(player, "\xA7c\u6263\u9664\u80CC\u5305\u7269\u54C1\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5\uFF01");
          Utils.sound.fail(player);
          return;
        }
        EconomyManager.addBalance(player, totalEarn);
        Utils.tell(player, `\xA7a\u6210\u529F\u51FA\u552E \xA7e${item.name} \xA7ax${count}\uFF0C\u83B7\u5F97 ${Utils.formatCurrency(totalEarn)}\uFF01`);
        Utils.sound.success(player);
      }
      if (onBack) onBack();
    });
  }
};

// scripts/modules/land.js
import { world as world4, system as system3 } from "@minecraft/server";
import { ActionFormData as ActionFormData3, ModalFormData as ModalFormData3, MessageFormData as MessageFormData2 } from "@minecraft/server-ui";
var LandManager = class {
  /**
   * 获取指定位置所在的地皮数据
   * @param {string} dimensionId 
   * @param {number} chunkX 
   * @param {number} chunkZ 
   * @returns {object|null}
   */
  static getPlot(dimensionId, chunkX, chunkZ) {
    const key = Utils.getPlotKey(dimensionId, chunkX, chunkZ);
    try {
      const raw = world4.getDynamicProperty(key);
      if (!raw || typeof raw !== "string") return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn(`[LandManager] Error reading plot ${key}: ${e}`);
      return null;
    }
  }
  /**
   * 保存地皮数据
   * @param {object} plot 
   */
  static savePlot(plot) {
    const key = Utils.getPlotKey(plot.dimension, plot.chunkX, plot.chunkZ);
    world4.setDynamicProperty(key, JSON.stringify(plot));
  }
  /**
   * 删除地皮数据
   * @param {string} dimensionId 
   * @param {number} chunkX 
   * @param {number} chunkZ 
   */
  static deletePlot(dimensionId, chunkX, chunkZ) {
    const key = Utils.getPlotKey(dimensionId, chunkX, chunkZ);
    world4.setDynamicProperty(key, void 0);
  }
  /**
   * 获取玩家拥有的所有地皮 Key 列表
   * @param {import("@minecraft/server").Player} player 
   * @returns {string[]}
   */
  static getPlayerPlots(player) {
    try {
      const raw = player.getDynamicProperty("owned_plots");
      if (!raw || typeof raw !== "string") return [];
      return JSON.parse(raw) || [];
    } catch {
      return [];
    }
  }
  /**
   * 设置玩家拥有的地皮列表
   * @param {import("@minecraft/server").Player} player 
   * @param {string[]} plotKeys 
   */
  static setPlayerPlots(player, plotKeys) {
    player.setDynamicProperty("owned_plots", JSON.stringify(plotKeys));
  }
  /**
   * 检查玩家在某地皮内是否有完全控制权限（主人或信任成员或管理员）
   * @param {import("@minecraft/server").Player} player 
   * @param {object} plot 
   * @returns {boolean}
   */
  static hasPermission(player, plot) {
    if (!plot) return true;
    if (Utils.isAdmin(player)) return true;
    if (plot.ownerId === player.id || plot.ownerName === player.name) return true;
    if (plot.members && plot.members.includes(player.name)) return true;
    return false;
  }
  /**
   * 购买当前所在区块的地皮
   * @param {import("@minecraft/server").Player} player 
   */
  static claimCurrentChunk(player) {
    const loc = player.location;
    const { chunkX, chunkZ } = Utils.getChunkCoords(loc);
    const dimensionId = player.dimension.id;
    const existingPlot = this.getPlot(dimensionId, chunkX, chunkZ);
    if (existingPlot) {
      Utils.tell(player, `\xA7c\u6B64\u533A\u5757\u5DF2\u88AB\u73A9\u5BB6 \xA7e${existingPlot.ownerName} \xA7c\u8BA4\u9886\uFF0C\u65E0\u6CD5\u91CD\u590D\u8D2D\u4E70\uFF01`);
      Utils.sound.fail(player);
      return;
    }
    const playerPlots = this.getPlayerPlots(player);
    const maxPlots = Utils.isAdmin(player) ? Config.land.maxPlotsForAdmin : Config.land.maxPlotsPerPlayer;
    if (playerPlots.length >= maxPlots) {
      Utils.tell(player, `\xA7c\u4F60\u62E5\u6709\u7684\u5730\u76AE\u6570\u91CF\u5DF2\u8FBE\u4E0A\u9650 (\xA7e${playerPlots.length}/${maxPlots}\xA7c)\uFF01`);
      Utils.sound.fail(player);
      return;
    }
    const price = Config.land.pricePerChunk;
    if (!EconomyManager.hasBalance(player, price)) {
      Utils.tell(player, `\xA7c\u8D2D\u4E70\u5730\u76AE\u9700\u8981 ${Utils.formatCurrency(price)}\uFF0C\u4F60\u7684\u91D1\u5E01\u4E0D\u8DB3\uFF01`);
      Utils.sound.fail(player);
      return;
    }
    EconomyManager.removeBalance(player, price);
    const plotKey = Utils.getPlotKey(dimensionId, chunkX, chunkZ);
    const newPlot = {
      id: plotKey,
      dimension: dimensionId,
      chunkX,
      chunkZ,
      ownerId: player.id,
      ownerName: player.name,
      name: `${player.name}\u7684\u5730\u76AE #${playerPlots.length + 1}`,
      claimTime: Date.now(),
      members: [],
      flags: { ...Config.land.defaultFlags }
    };
    this.savePlot(newPlot);
    playerPlots.push(plotKey);
    this.setPlayerPlots(player, playerPlots);
    Utils.tell(player, `\xA7a\u{1F389} \u606D\u559C\uFF01\u6210\u529F\u8D2D\u4E70\u533A\u5757\u9886\u5730 [${chunkX}, ${chunkZ}]\uFF01\u82B1\u8D39 ${Utils.formatCurrency(price)}\u3002`);
    Utils.sound.rareWin(player);
    this.showPlotBoundary(player, chunkX, chunkZ);
  }
  /**
   * 出售并注销地皮
   * @param {import("@minecraft/server").Player} player 
   * @param {object} plot 
   */
  static sellPlot(player, plot) {
    if (!plot || plot.ownerId !== player.id && !Utils.isAdmin(player)) {
      Utils.tell(player, "\xA7c\u4F60\u4E0D\u662F\u8BE5\u5730\u76AE\u7684\u4E3B\u4EBA\uFF0C\u65E0\u6CD5\u51FA\u552E\uFF01");
      return;
    }
    const refund = Math.floor(Config.land.pricePerChunk * Config.land.sellRefundRate);
    EconomyManager.addBalance(player, refund);
    this.deletePlot(plot.dimension, plot.chunkX, plot.chunkZ);
    const playerPlots = this.getPlayerPlots(player).filter((k) => k !== plot.id);
    this.setPlayerPlots(player, playerPlots);
    Utils.tell(player, `\xA7a\u5DF2\u6210\u529F\u51FA\u552E\u5730\u76AE [${plot.name}]\uFF0C\u8FD4\u8FD8 ${Utils.formatCurrency(refund)}\uFF01`);
    Utils.sound.success(player);
  }
  /**
   * 高亮显示领地区块边界粒子 (沿 16x16 边界生成粒子)
   * @param {import("@minecraft/server").Player} player 
   * @param {number} chunkX 
   * @param {number} chunkZ 
   */
  static showPlotBoundary(player, chunkX, chunkZ) {
    const bounds = Utils.getChunkBounds(chunkX, chunkZ);
    const dimension = player.dimension;
    const particle = Config.land.particleBorderType;
    const baseY = Math.floor(player.location.y);
    let ticks = 0;
    const maxTicks = Config.land.borderParticleSeconds * 20;
    const runId = system3.runInterval(() => {
      ticks += 10;
      if (ticks > maxTicks || !Utils.isValid(player)) {
        system3.clearRun(runId);
        return;
      }
      for (let x = bounds.minX; x <= bounds.maxX + 1; x += 2) {
        try {
          dimension.spawnParticle(particle, { x, y: baseY + 0.2, z: bounds.minZ });
          dimension.spawnParticle(particle, { x, y: baseY + 0.2, z: bounds.maxZ + 1 });
        } catch {
        }
      }
      for (let z = bounds.minZ; z <= bounds.maxZ + 1; z += 2) {
        try {
          dimension.spawnParticle(particle, { x: bounds.minX, y: baseY + 0.2, z });
          dimension.spawnParticle(particle, { x: bounds.maxX + 1, y: baseY + 0.2, z });
        } catch {
        }
      }
    }, 10);
    Utils.actionbar(player, "\xA7a[\u9886\u5730] \u5DF2\u4E3A\u4F60\u9AD8\u4EAE\u663E\u793A\u5F53\u524D\u533A\u5757\u8FB9\u754C\u7C92\u5B50\uFF01");
  }
  /**
   * 打开领地系统主菜单
   * @param {import("@minecraft/server").Player} player 
   * @param {Function} [onBack] 
   */
  static openPlotMainUI(player, onBack = null) {
    const loc = player.location;
    const { chunkX, chunkZ } = Utils.getChunkCoords(loc);
    const currentPlot = this.getPlot(player.dimension.id, chunkX, chunkZ);
    const playerPlots = this.getPlayerPlots(player);
    let statusText = "";
    if (!currentPlot) {
      statusText = `\xA77\u5F53\u524D\u4F4D\u7F6E: \xA7f[${chunkX}, ${chunkZ}] \xA7a(\u672A\u8BA4\u9886\u8352\u5730)
\xA7f\u8BA4\u9886\u4EF7\u683C: ${Utils.formatCurrency(Config.land.pricePerChunk)}`;
    } else {
      const isOwner = currentPlot.ownerId === player.id || currentPlot.ownerName === player.name;
      const isMember = currentPlot.members && currentPlot.members.includes(player.name);
      const role = isOwner ? "\xA76[\u4E3B\u4EBA]" : isMember ? "\xA7a[\u4FE1\u4EFB\u6210\u5458]" : "\xA77[\u8BBF\u5BA2]";
      statusText = `\xA77\u5F53\u524D\u9886\u5730: \xA7e${currentPlot.name}
\xA77\u9886\u5730\u4E3B\u4EBA: \xA7b${currentPlot.ownerName} ${role}`;
    }
    const form = new ActionFormData3().title("\xA7l\xA72\u{1F6E1}\uFE0F \u5730\u76AE\u9886\u5730\u7CFB\u7EDF").body(
      `\xA77\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
${statusText}
\xA7f\u5DF2\u5360\u9886\u5730: \xA7e${playerPlots.length} \xA77/ \xA7f${Utils.isAdmin(player) ? Config.land.maxPlotsForAdmin : Config.land.maxPlotsPerPlayer}
\xA77\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`
    );
    if (!currentPlot) {
      form.button("\xA7l\xA72\u{1F4CD} \u8D2D\u4E70\u5F53\u524D\u533A\u5757\n\xA7r\xA78\u8BA4\u9886\u811A\u4E0B\u7684 16x16 \u533A\u57DF", "textures/ui/village_hero_effect");
    } else if (currentPlot.ownerId === player.id || Utils.isAdmin(player)) {
      form.button("\xA7l\xA73\u2699\uFE0F \u5F53\u524D\u9886\u5730\u8BBE\u7F6E\n\xA7r\xA78\u4FEE\u6539\u6743\u9650\u4E0E\u9886\u5730\u540D\u79F0", "textures/ui/gear");
      form.button("\xA7l\xA79\u{1F465} \u4FE1\u4EFB\u6210\u5458\u7BA1\u7406\n\xA7r\xA78\u6DFB\u52A0\u6216\u79FB\u9664\u597D\u53CB\u5171\u5EFA", "textures/ui/FriendsIcon");
      form.button("\xA7l\xA7c\u{1F4B0} \u51FA\u552E\u5F53\u524D\u9886\u5730\n\xA7r\xA78\u6309 70% \u6BD4\u4F8B\u8FD4\u8FD8\u91D1\u5E01", "textures/ui/trade_icon");
    }
    form.button("\xA7l\xA7e\u{1F4CB} \u6211\u7684\u9886\u5730\u5217\u8868\n\xA7r\xA78\u67E5\u770B\u5E76\u5FEB\u901F\u4F20\u9001", "textures/ui/map_icon");
    form.button("\xA7l\xA7b\u{1F441}\uFE0F \u663E\u793A\u9886\u5730\u8FB9\u754C\n\xA7r\xA78\u4EE5\u7EFF\u8272\u7C92\u5B50\u9AD8\u4EAE\u5F53\u524D\u533A\u5757", "textures/ui/visible");
    if (onBack) {
      form.button("\xA7l\xA7c\u{1F519} \u8FD4\u56DE\u4E0A\u7EA7\n\xA7r\xA78\u8FD4\u56DE\u4E3B\u83DC\u5355", "textures/ui/cancel");
    }
    Utils.showForm(player, form, (res) => {
      let btnIndex = 0;
      if (!currentPlot) {
        if (res.selection === btnIndex++) {
          this.claimCurrentChunk(player);
          return;
        }
      } else if (currentPlot.ownerId === player.id || Utils.isAdmin(player)) {
        if (res.selection === btnIndex++) {
          this.openPlotSettingsUI(player, currentPlot, () => this.openPlotMainUI(player, onBack));
          return;
        }
        if (res.selection === btnIndex++) {
          this.openPlotMembersUI(player, currentPlot, () => this.openPlotMainUI(player, onBack));
          return;
        }
        if (res.selection === btnIndex++) {
          this.openSellConfirmUI(player, currentPlot, () => this.openPlotMainUI(player, onBack));
          return;
        }
      }
      if (res.selection === btnIndex++) {
        this.openMyPlotsListUI(player, () => this.openPlotMainUI(player, onBack));
        return;
      }
      if (res.selection === btnIndex++) {
        this.showPlotBoundary(player, chunkX, chunkZ);
        return;
      }
      if (onBack) {
        onBack();
      }
    });
  }
  /**
   * 打开我的领地列表与传送
   * @param {import("@minecraft/server").Player} player 
   * @param {Function} [onBack] 
   */
  static openMyPlotsListUI(player, onBack = null) {
    const plotKeys = this.getPlayerPlots(player);
    const form = new ActionFormData3().title("\xA7l\xA7e\u{1F4CB} \u6211\u7684\u9886\u5730\u5217\u8868").body(`\xA77\u4F60\u5F53\u524D\u4E00\u5171\u62E5\u6709 \xA7e${plotKeys.length} \xA77\u5757\u5730\u76AE\uFF1A
\xA77\u70B9\u51FB\u5BF9\u5E94\u5730\u76AE\u5373\u53EF\u76F4\u63A5\u4F20\u9001\uFF01`);
    const validPlots = [];
    for (const key of plotKeys) {
      try {
        const raw = world4.getDynamicProperty(key);
        if (raw && typeof raw === "string") {
          const plot = JSON.parse(raw);
          validPlots.push(plot);
          form.button(`${plot.name}
\xA7r\xA78\u5750\u6807: [${plot.chunkX * 16}, ${plot.chunkZ * 16}]`, "textures/ui/compass_item");
        }
      } catch {
      }
    }
    if (validPlots.length === 0) {
      form.body("\xA77\u4F60\u76EE\u524D\u8FD8\u6CA1\u6709\u8D2D\u4E70\u4EFB\u4F55\u9886\u5730\u5730\u76AE\uFF01");
    }
    form.button("\xA7l\xA7c\u{1F519} \u8FD4\u56DE", "textures/ui/cancel");
    Utils.showForm(player, form, (res) => {
      if (res.selection < validPlots.length) {
        const plot = validPlots[res.selection];
        const targetX = plot.chunkX * 16 + 8;
        const targetZ = plot.chunkZ * 16 + 8;
        const targetDim = world4.getDimension(plot.dimension);
        if (targetDim) {
          player.teleport({ x: targetX, y: player.location.y, z: targetZ }, { dimension: targetDim });
          Utils.tell(player, `\xA7a\u5DF2\u6210\u529F\u4F20\u9001\u5230\u9886\u5730\uFF1A\xA7e${plot.name}`);
          Utils.sound.teleport(player);
          this.showPlotBoundary(player, plot.chunkX, plot.chunkZ);
        }
      } else if (onBack) {
        onBack();
      }
    });
  }
  /**
   * 打开领地权限与设置面板
   * @param {import("@minecraft/server").Player} player 
   * @param {object} plot 
   * @param {Function} [onBack] 
   */
  static openPlotSettingsUI(player, plot, onBack = null) {
    const flags = plot.flags || { ...Config.land.defaultFlags };
    const form = new ModalFormData3().title(`\xA7l\u9886\u5730\u8BBE\u7F6E: ${plot.name}`).textField(`\xA7f\u4FEE\u6539\u9886\u5730\u540D\u79F0 (\u5F53\u524D: ${plot.name}):`, "\u8F93\u5165\u5730\u76AE\u65B0\u540D\u79F0 (\u7559\u7A7A\u5219\u4E0D\u4FEE\u6539)").toggle("\xA7f\u5141\u8BB8\u8BBF\u5BA2\u7834\u574F\u65B9\u5757 (\u4E0D\u63A8\u8350):", flags.allowBreak ?? false).toggle("\xA7f\u5141\u8BB8\u8BBF\u5BA2\u653E\u7F6E\u65B9\u5757:", flags.allowPlace ?? false).toggle("\xA7f\u5141\u8BB8\u8BBF\u5BA2\u6253\u5F00\u7BB1\u5B50/\u95E8/\u62C9\u6746:", flags.allowInteract ?? false).toggle("\xA7f\u5141\u8BB8\u9886\u5730\u5185\u53D1\u751F\u7206\u70B8\u7834\u574F:", flags.allowExplosion ?? false).toggle("\xA7f\u5141\u8BB8\u8BBF\u5BA2\u653B\u51FB\u9886\u5730\u5185\u52A8\u7269/\u5B9E\u4F53:", flags.allowAttackEntity ?? false);
    Utils.showForm(player, form, (res) => {
      if (res.canceled) {
        if (onBack) onBack();
        return;
      }
      const [newName, allowBreak, allowPlace, allowInteract, allowExplosion, allowAttackEntity] = res.formValues;
      plot.name = newName && newName.trim().length > 0 ? newName.trim() : plot.name;
      plot.flags = {
        allowBreak: !!allowBreak,
        allowPlace: !!allowPlace,
        allowInteract: !!allowInteract,
        allowExplosion: !!allowExplosion,
        allowAttackEntity: !!allowAttackEntity
      };
      this.savePlot(plot);
      Utils.tell(player, `\xA7a\u9886\u5730 \xA7e${plot.name} \xA7a\u7684\u6743\u9650\u8BBE\u7F6E\u5DF2\u66F4\u65B0\uFF01`);
      Utils.sound.success(player);
      if (onBack) onBack();
    });
  }
  /**
   * 打开信任成员管理
   * @param {import("@minecraft/server").Player} player 
   * @param {object} plot 
   * @param {Function} [onBack] 
   */
  static openPlotMembersUI(player, plot, onBack = null) {
    const members = plot.members || [];
    const form = new ActionFormData3().title(`\xA7l\u{1F465} \u4FE1\u4EFB\u6210\u5458 - ${plot.name}`).body(`\xA77\u5F53\u524D\u4FE1\u4EFB\u6210\u5458\u5217\u8868 (${members.length} \u4EBA)\uFF1A
\xA7f${members.length > 0 ? members.join(", ") : "\xA78(\u6682\u65E0\u4FE1\u4EFB\u6210\u5458)"}`).button("\xA7l\xA7a\u2795 \u6DFB\u52A0\u5728\u7EBF\u73A9\u5BB6\u4E3A\u6210\u5458", "textures/ui/plus").button("\xA7l\xA7c\u2796 \u79FB\u9664\u5DF2\u6709\u4FE1\u4EFB\u6210\u5458", "textures/ui/minus").button("\xA7l\xA77\u{1F519} \u8FD4\u56DE", "textures/ui/cancel");
    Utils.showForm(player, form, (res) => {
      if (res.selection === 0) {
        const candidates = world4.getAllPlayers().filter((p) => p.name !== player.name && !members.includes(p.name));
        if (candidates.length === 0) {
          Utils.tell(player, "\xA7c\u6CA1\u6709\u53EF\u6DFB\u52A0\u7684\u5728\u7EBF\u73A9\u5BB6\uFF01");
          if (onBack) onBack();
          return;
        }
        const addForm = new ModalFormData3().title("\xA7l\u6DFB\u52A0\u4FE1\u4EFB\u6210\u5458").dropdown("\xA7f\u9009\u62E9\u8981\u6DFB\u52A0\u7684\u5728\u7EBF\u73A9\u5BB6:", candidates.map((p) => p.name));
        addForm.show(player).then((addRes) => {
          if (addRes.canceled) return;
          const selectedPlayer = candidates[addRes.formValues[0]];
          if (selectedPlayer) {
            if (!plot.members) plot.members = [];
            plot.members.push(selectedPlayer.name);
            this.savePlot(plot);
            Utils.tell(player, `\xA7a\u5DF2\u6210\u529F\u5C06 \xA7e${selectedPlayer.name} \xA7a\u52A0\u5165\u5730\u76AE\u4FE1\u4EFB\u6210\u5458\uFF01`);
            Utils.tell(selectedPlayer, `\xA7a\u73A9\u5BB6 \xA7e${player.name} \xA7a\u5DF2\u5C06\u4F60\u6DFB\u52A0\u4E3A\u5176\u9886\u5730 [${plot.name}] \u7684\u4FE1\u4EFB\u6210\u5458\uFF01`);
            Utils.sound.success(player);
          }
          if (onBack) onBack();
        });
      } else if (res.selection === 1) {
        if (members.length === 0) {
          Utils.tell(player, "\xA7c\u5F53\u524D\u6CA1\u6709\u6210\u5458\u53EF\u4F9B\u79FB\u9664\uFF01");
          if (onBack) onBack();
          return;
        }
        const removeForm = new ModalFormData3().title("\xA7l\u79FB\u9664\u4FE1\u4EFB\u6210\u5458").dropdown("\xA7f\u9009\u62E9\u8981\u79FB\u9664\u7684\u6210\u5458:", members);
        removeForm.show(player).then((remRes) => {
          if (remRes.canceled) return;
          const targetName = members[remRes.formValues[0]];
          plot.members = members.filter((m) => m !== targetName);
          this.savePlot(plot);
          Utils.tell(player, `\xA7a\u5DF2\u79FB\u9664\u4FE1\u4EFB\u6210\u5458: \xA7e${targetName}`);
          Utils.sound.success(player);
          if (onBack) onBack();
        });
      } else if (onBack) {
        onBack();
      }
    });
  }
  /**
   * 出售确认二次弹窗
   * @param {import("@minecraft/server").Player} player 
   * @param {object} plot 
   * @param {Function} [onBack] 
   */
  static openSellConfirmUI(player, plot, onBack = null) {
    const refund = Math.floor(Config.land.pricePerChunk * Config.land.sellRefundRate);
    const form = new MessageFormData2().title("\xA7l\xA7c\u26A0\uFE0F \u786E\u8BA4\u51FA\u552E\u5730\u76AE\uFF1F").body(`\xA7f\u786E\u5B9A\u8981\u51FA\u552E\u9886\u5730 \xA7e${plot.name} \xA7f\u5417\uFF1F

\xA77\u51FA\u552E\u540E\u5C06\u8FD4\u8FD8 \xA7e${Utils.formatCurrency(refund)}\xA77\uFF0C\u8BE5\u9886\u5730\u4FDD\u62A4\u5C06\u7ACB\u523B\u5931\u6548\uFF01`).button1("\xA7l\xA7c\u786E\u8BA4\u51FA\u552E").button2("\xA7l\xA7a\u53D6\u6D88\u8FD4\u56DE");
    Utils.showForm(player, form, (res) => {
      if (res.selection === 0) {
        this.sellPlot(player, plot);
      } else if (onBack) {
        onBack();
      }
    });
  }
  /**
   * 注册领地保护相关的核心事件拦截器
   */
  static registerProtectionEvents() {
    world4.beforeEvents.playerBreakBlock.subscribe((event) => {
      const { player, block, dimension } = event;
      const { chunkX, chunkZ } = Utils.getChunkCoords(block.location);
      const plot = this.getPlot(dimension.id, chunkX, chunkZ);
      if (!plot) return;
      if (this.hasPermission(player, plot) || plot.flags?.allowBreak) return;
      event.cancel = true;
      Utils.actionbar(player, `\xA7c[\u9886\u5730\u4FDD\u62A4] \u6B64\u533A\u57DF\u5C5E\u4E8E \xA7e${plot.ownerName}\xA7c\uFF0C\u7981\u6B62\u7834\u574F\uFF01`);
      Utils.sound.warn(player);
    });
    world4.beforeEvents.playerPlaceBlock.subscribe((event) => {
      const { player, block, dimension } = event;
      const { chunkX, chunkZ } = Utils.getChunkCoords(block.location);
      const plot = this.getPlot(dimension.id, chunkX, chunkZ);
      if (!plot) return;
      if (this.hasPermission(player, plot) || plot.flags?.allowPlace) return;
      event.cancel = true;
      Utils.actionbar(player, `\xA7c[\u9886\u5730\u4FDD\u62A4] \u6B64\u533A\u57DF\u5C5E\u4E8E \xA7e${plot.ownerName}\xA7c\uFF0C\u7981\u6B62\u653E\u7F6E\uFF01`);
      Utils.sound.warn(player);
    });
    world4.beforeEvents.playerInteractWithBlock.subscribe((event) => {
      const { player, block } = event;
      const dimension = player.dimension;
      const { chunkX, chunkZ } = Utils.getChunkCoords(block.location);
      const plot = this.getPlot(dimension.id, chunkX, chunkZ);
      if (!plot) return;
      if (this.hasPermission(player, plot) || plot.flags?.allowInteract) return;
      const typeId = block.typeId;
      const isProtectedBlock = typeId.includes("chest") || typeId.includes("barrel") || typeId.includes("shulker") || typeId.includes("door") || typeId.includes("trapdoor") || typeId.includes("furnace") || typeId.includes("hopper") || typeId.includes("button") || typeId.includes("lever") || typeId.includes("gate") || typeId.includes("anvil");
      if (isProtectedBlock) {
        event.cancel = true;
        Utils.actionbar(player, `\xA7c[\u9886\u5730\u4FDD\u62A4] \u6B64\u533A\u57DF\u5C5E\u4E8E \xA7e${plot.ownerName}\xA7c\uFF0C\u7981\u6B62\u4F7F\u7528\u6B64\u8BBE\u65BD\uFF01`);
        Utils.sound.warn(player);
      }
    });
    world4.beforeEvents.explosion.subscribe((event) => {
      const dimension = event.dimension;
      const impactedBlocks = event.getImpactedBlocks();
      if (!impactedBlocks || impactedBlocks.length === 0) return;
      const safeBlocks = [];
      for (const block of impactedBlocks) {
        const { chunkX, chunkZ } = Utils.getChunkCoords(block.location);
        const plot = this.getPlot(dimension.id, chunkX, chunkZ);
        if (plot && !plot.flags?.allowExplosion) {
          continue;
        }
        safeBlocks.push(block);
      }
      event.setImpactedBlocks(safeBlocks);
    });
    world4.beforeEvents.playerInteractWithEntity.subscribe((event) => {
      const { player, target } = event;
      const dimension = player.dimension;
      const { chunkX, chunkZ } = Utils.getChunkCoords(target.location);
      const plot = this.getPlot(dimension.id, chunkX, chunkZ);
      if (!plot) return;
      if (this.hasPermission(player, plot) || plot.flags?.allowInteract) return;
      if (target.typeId === "minecraft:item_frame" || target.typeId === "minecraft:armor_stand") {
        event.cancel = true;
        Utils.actionbar(player, `\xA7c[\u9886\u5730\u4FDD\u62A4] \u7981\u6B62\u89E6\u78B0 \xA7e${plot.ownerName} \xA7c\u9886\u5730\u5185\u7684\u7269\u54C1\u5C55\u793A\u8BBE\u65BD\uFF01`);
      }
    });
  }
};

// scripts/modules/lottery.js
import { world as world18 } from "@minecraft/server";
import { ActionFormData as ActionFormData5, MessageFormData as MessageFormData4 } from "@minecraft/server-ui";

// scripts/modules/weapon.js
import { world as world17, system as system14 } from "@minecraft/server";

// scripts/modules/lotm.js
import { world as world16, system as system13, ItemStack as ItemStack2 } from "@minecraft/server";
import { ActionFormData as ActionFormData4, ModalFormData as ModalFormData4, MessageFormData as MessageFormData3 } from "@minecraft/server-ui";

// scripts/modules/lotm_profile_registry.js
var PATHWAY_PROFILES = {
  none: {
    id: "none",
    name: "\u666E\u901A\u4EBA",
    sequence: 0,
    sequenceName: "\u666E\u901A\u4EBA",
    title: "\xA77\u672A\u6D89\u8DB3\u975E\u51E1\u7684\u666E\u901A\u4EBA",
    maxHealth: 20,
    maxSpirituality: 0,
    regenOutOfCombat: 0,
    regenInCombat: 0,
    focusItemIds: [],
    passives: [],
    profileVersion: 1
  },
  seer: {
    id: "seer",
    name: "\u5360\u535C\u5BB6\u9014\u5F84",
    sequence: 7,
    sequenceName: "\u9B54\u672F\u5E08",
    title: "\xA75\u3010\u5360\u535C\u5BB6\u9014\u5F84\u3011\u5E8F\u52177: \u9B54\u672F\u5E08",
    maxHealth: 28,
    // 14 颗红心
    maxSpirituality: 500,
    regenOutOfCombat: 15,
    regenInCombat: 5,
    focusItemIds: ["lotm:spirit_cane"],
    consumableItemIds: ["lotm:tarot_card", "lotm:paper_figurine"],
    passives: [
      "speed_1",
      "jump_boost_1",
      "water_breathing",
      "fire_resistance",
      "paper_substitute",
      "clown_dodge"
    ],
    profileVersion: 1
  },
  hunter: {
    id: "hunter",
    name: "\u730E\u4EBA\u9014\u5F84",
    sequence: 7,
    sequenceName: "\u7EB5\u706B\u5BB6",
    title: "\xA7c\u3010\u730E\u4EBA\u9014\u5F84\u3011\u5E8F\u52177: \u7EB5\u706B\u5BB6",
    maxHealth: 32,
    // 16 颗红心
    maxSpirituality: 460,
    regenOutOfCombat: 12,
    regenInCombat: 4,
    focusItemIds: ["lotm:pyro_gauntlet"],
    consumableItemIds: ["lotm:alchemical_molotov"],
    passives: [
      "fire_immunity",
      "burning_target_boost",
      // 对燃烧目标伤害 +10%
      "fire_source_regen"
      // 靠近火源回灵 +2/s
    ],
    profileVersion: 1
  },
  warrior: {
    id: "warrior",
    name: "\u6218\u58EB\u9014\u5F84",
    sequence: 7,
    sequenceName: "\u6B66\u5668\u5927\u5E08",
    title: "\xA76\u3010\u6218\u58EB\u9014\u5F84\u3011\u5E8F\u52177: \u6B66\u5668\u5927\u5E08",
    maxHealth: 44,
    // 22 颗红心 (正面坦克)
    maxSpirituality: 360,
    regenOutOfCombat: 8,
    regenInCombat: 3,
    focusItemIds: [
      "lotm:tactical_sword",
      "lotm:tactical_axe",
      "lotm:tactical_spear",
      "lotm:tactical_bow"
    ],
    consumableItemIds: ["lotm:blade_oil"],
    passives: [
      "knockback_resistance_35",
      // 35% 击退抗性
      "weapon_damage_15",
      // 普通武器伤害 +15%
      "durability_save_30"
      // 耐久消耗 -30%
    ],
    profileVersion: 1
  },
  darkness: {
    id: "darkness",
    name: "\u4E0D\u7720\u8005\u9014\u5F84",
    sequence: 7,
    sequenceName: "\u68A6\u9B47",
    title: "\xA79\u3010\u4E0D\u7720\u8005\u9014\u5F84\u3011\u5E8F\u52177: \u68A6\u9B47",
    maxHealth: 30,
    // 15 颗红心
    maxSpirituality: 540,
    regenOutOfCombat: 14,
    regenInCombat: 5,
    focusItemIds: ["lotm:nightmare_watch"],
    consumableItemIds: ["lotm:dream_dust"],
    passives: [
      "night_vision",
      "night_spirit_boost",
      // 夜间回灵 +25%
      "mental_control_res_35",
      // 精神控制抗性 35%
      "spirit_perception"
      // 模糊感知隐身/灵体轮廓
    ],
    profileVersion: 1
  },
  sun: {
    id: "sun",
    name: "\u6B4C\u9882\u8005\u9014\u5F84",
    sequence: 7,
    sequenceName: "\u592A\u9633\u795E\u5B98",
    title: "\xA7e\u3010\u6B4C\u9882\u8005\u9014\u5F84\u3011\u5E8F\u52177: \u592A\u9633\u795E\u5B98",
    maxHealth: 36,
    // 18 颗红心
    maxSpirituality: 500,
    regenOutOfCombat: 13,
    regenInCombat: 4,
    focusItemIds: ["lotm:sun_emblem"],
    consumableItemIds: ["lotm:holy_water_bottle"],
    passives: [
      "corruption_reduce_30",
      // 污染获得 -30%
      "fear_immunity",
      // 免疫恐惧
      "undead_damage_25",
      // 对亡灵/污秽伤害 +25%
      "daylight_regen_20"
      // 白昼脱战回灵 +20%
    ],
    profileVersion: 1
  },
  moon: {
    id: "moon",
    name: "\u836F\u5E08\u9014\u5F84",
    sequence: 7,
    sequenceName: "\u5438\u8840\u9B3C",
    title: "\xA74\u3010\u836F\u5E08\u9014\u5F84\u3011\u5E8F\u52177: \u5438\u8840\u9B3C",
    maxHealth: 36,
    // 18 颗红心
    maxSpirituality: 460,
    // 白昼与黑夜回灵差异
    regenOutOfCombatDay: 6,
    regenInCombatDay: 2,
    regenOutOfCombatNight: 16,
    regenInCombatNight: 6,
    focusItemIds: ["lotm:vampire_ring"],
    consumableItemIds: ["lotm:sealed_blood_bottle"],
    passives: [
      "night_healing",
      // 夜间脱战每 3 秒恢复 1 HP
      "blood_thirst_sys"
      // 血渴机制
    ],
    profileVersion: 1
  },
  assassin: {
    id: "assassin",
    name: "\u523A\u5BA2\u9014\u5F84",
    sequence: 7,
    sequenceName: "\u5973\u5DEB",
    title: "\xA7d\u3010\u523A\u5BA2\u9014\u5F84\u3011\u5E8F\u52177: \u5973\u5DEB",
    maxHealth: 28,
    // 14 颗红心
    maxSpirituality: 560,
    regenOutOfCombat: 15,
    regenInCombat: 5,
    focusItemIds: ["lotm:witch_mirror_wand"],
    consumableItemIds: ["lotm:curse_doll"],
    passives: [
      "speed_boost_8",
      // 移速 +8%
      "poison_curse_res_25",
      // 毒素与诅咒抗性 25%
      "invis_first_strike_15"
      // 隐形后首次攻击 +15% (PvP +8%)
    ],
    profileVersion: 1
  }
};
var PathwayProfileRegistry = class {
  /**
   * 获取指定途径配置
   * @param {string} pathwayId 
   * @returns {object}
   */
  static getProfile(pathwayId) {
    return PATHWAY_PROFILES[pathwayId] || PATHWAY_PROFILES.none;
  }
  /**
   * 判断物品是否为指定途径的媒介
   * @param {string} pathwayId 
   * @param {string} itemId 
   * @returns {boolean}
   */
  static isFocusItem(pathwayId, itemId) {
    const profile = this.getProfile(pathwayId);
    return profile.focusItemIds && profile.focusItemIds.includes(itemId);
  }
  /**
   * 判断物品是否为指定途径的消耗品
   * @param {string} pathwayId 
   * @param {string} itemId 
   * @returns {boolean}
   */
  static isConsumableItem(pathwayId, itemId) {
    const profile = this.getProfile(pathwayId);
    return profile.consumableItemIds && profile.consumableItemIds.includes(itemId);
  }
};

// scripts/modules/lotm_status_manager.js
import { system as system4, world as world5 } from "@minecraft/server";
var StatusEffectManager = class {
  // 实体状态表: entityId -> Map<statusName, { expiresAtTick, value, sourceId }>
  static entityStatuses = /* @__PURE__ */ new Map();
  // 玩家控制递减历史记录: playerId -> Map<statusName, Array<receivedTick>>
  static ccHistory = /* @__PURE__ */ new Map();
  /**
   * 为实体施加非凡状态
   * @param {import("@minecraft/server").Entity} entity 目标实体
   * @param {string} statusName 状态名 (burning, sleep, drowsy, fear, silence, armor_break, heal_block, guard, etc.)
   * @param {number} durationTicks 持续 tick 数 (20 tick = 1 秒)
   * @param {number} [value=1] 强度/数值 (如破甲比例、阻疗比例)
   * @param {import("@minecraft/server").Player} [source=null] 施加来源玩家
   */
  static applyStatus(entity, statusName, durationTicks, value = 1, source = null) {
    if (!Utils.isValid(entity)) return;
    const currentTick = system4.currentTick;
    let finalDuration = durationTicks;
    if (entity.typeId === "minecraft:player" && ["sleep", "drowsy", "fear", "silence"].includes(statusName)) {
      const playerId = entity.id;
      if (!this.ccHistory.has(playerId)) {
        this.ccHistory.set(playerId, /* @__PURE__ */ new Map());
      }
      const pHistory = this.ccHistory.get(playerId);
      const historyList = pHistory.get(statusName) || [];
      const recent = historyList.filter((t) => currentTick - t < 160);
      if (recent.length === 1) {
        finalDuration = Math.floor(finalDuration * 0.5);
      } else if (recent.length >= 2) {
        finalDuration = Math.floor(finalDuration * 0.25);
      }
      recent.push(currentTick);
      pHistory.set(statusName, recent);
      if (statusName === "drowsy" || statusName === "sleep") finalDuration = Math.min(finalDuration, 30);
      if (statusName === "fear") finalDuration = Math.min(finalDuration, 24);
      if (statusName === "silence") finalDuration = Math.min(finalDuration, 20);
    }
    const isBoss = entity.typeId.includes("dragon") || entity.typeId.includes("wither") || entity.typeId.includes("warden");
    if (isBoss && ["sleep", "drowsy", "fear", "silence"].includes(statusName)) {
      finalDuration = Math.floor(finalDuration * 0.25);
      if (statusName === "sleep") {
        statusName = "drowsy";
      }
    }
    if (finalDuration <= 0) return;
    if (!this.entityStatuses.has(entity.id)) {
      this.entityStatuses.set(entity.id, /* @__PURE__ */ new Map());
    }
    const statuses = this.entityStatuses.get(entity.id);
    const expiresAtTick = currentTick + finalDuration;
    statuses.set(statusName, {
      expiresAtTick,
      value,
      sourceId: source ? source.id : null
    });
    try {
      if (statusName === "sleep" || statusName === "drowsy") {
        entity.addEffect("slowness", finalDuration, { amplifier: 4, showParticles: false });
        entity.addEffect("weakness", finalDuration, { amplifier: 2, showParticles: false });
      } else if (statusName === "fear") {
        entity.addEffect("slowness", finalDuration, { amplifier: 2, showParticles: false });
        entity.addEffect("weakness", finalDuration, { amplifier: 1, showParticles: false });
      } else if (statusName === "burning") {
        if (typeof entity.setOnFire === "function") {
          entity.setOnFire(Math.ceil(finalDuration / 20), true);
        }
      }
    } catch {
    }
  }
  /**
   * 判断实体是否拥有指定状态
   * @param {import("@minecraft/server").Entity} entity 
   * @param {string} statusName 
   * @returns {boolean}
   */
  static hasStatus(entity, statusName) {
    if (!Utils.isValid(entity) || !this.entityStatuses.has(entity.id)) return false;
    const statuses = this.entityStatuses.get(entity.id);
    const status = statuses.get(statusName);
    if (!status) return false;
    return system4.currentTick < status.expiresAtTick;
  }
  /**
   * 获取状态详情与数值
   * @param {import("@minecraft/server").Entity} entity 
   * @param {string} statusName 
   * @returns {object|null}
   */
  static getStatus(entity, statusName) {
    if (!this.hasStatus(entity, statusName)) return null;
    return this.entityStatuses.get(entity.id).get(statusName);
  }
  /**
   * 移除实体指定状态
   * @param {import("@minecraft/server").Entity} entity 
   * @param {string} statusName 
   */
  static removeStatus(entity, statusName) {
    if (!Utils.isValid(entity) || !this.entityStatuses.has(entity.id)) return;
    const statuses = this.entityStatuses.get(entity.id);
    statuses.delete(statusName);
    if (statusName === "sleep" || statusName === "drowsy") {
      try {
        entity.removeEffect("slowness");
        entity.removeEffect("weakness");
      } catch {
      }
    }
  }
  /**
   * 清除实体全部状态
   * @param {import("@minecraft/server").Entity} entity 
   */
  static clearAllStatuses(entity) {
    if (!Utils.isValid(entity)) return;
    this.entityStatuses.delete(entity.id);
  }
  /**
   * 5-Tick 批处理心跳引擎 (由主系统统一每 5 tick 调用一次)
   */
  static onTick() {
    const currentTick = system4.currentTick;
    for (const [entityId, statuses] of this.entityStatuses.entries()) {
      for (const [statusName, data] of statuses.entries()) {
        if (currentTick >= data.expiresAtTick) {
          statuses.delete(statusName);
        }
      }
      if (statuses.size === 0) {
        this.entityStatuses.delete(entityId);
      }
    }
  }
};

// scripts/modules/lotm_damage_resolver.js
import { world as world6 } from "@minecraft/server";
var DamageResolver = class {
  /**
   * 执行伤害与非凡属性结算
   * @param {import("@minecraft/server").Player|import("@minecraft/server").Entity} attacker 攻击者
   * @param {import("@minecraft/server").Entity} target 目标受击者
   * @param {object} options 
   * @param {number} options.pveDamage PvE 基础伤害
   * @param {number} [options.pvpDamage] PvP 基础伤害 (缺省则按 pveDamage * 0.5 保护)
   * @param {boolean} [options.ignoreArmor=false] 是否部分/全部无视护甲
   * @param {number} [options.armorPierceRatio=0] 破甲穿透比例 (0.0 ~ 1.0)
   * @param {boolean} [options.isUndeadBonus=false] 是否对亡灵生物具备神圣克制加成
   * @param {boolean} [options.isFireDamage=false] 是否属于火焰伤害
   * @param {string} [options.cause="entityAttack"] 伤害原因
   * @returns {number} 最终结算造成的实际伤害值
   */
  static applyDamage(attacker, target, options = {}) {
    if (!Utils.isValid(target) || target.id === (attacker ? attacker.id : null)) return 0;
    const isPvP = target.typeId === "minecraft:player";
    let baseDmg = isPvP ? options.pvpDamage ?? (options.pveDamage ? options.pveDamage * 0.5 : 10) : options.pveDamage ?? 15;
    if (attacker && attacker.typeId === "minecraft:player") {
      const { chunkX, chunkZ } = Utils.getChunkCoords(target.location);
      const plot = LandManager.getPlot(target.dimension.id, chunkX, chunkZ);
      if (plot && plot.ownerId !== attacker.id && !plot.members.includes(attacker.id)) {
        if (isPvP && !plot.flags.allowPvp) return 0;
        if (!isPvP && !plot.flags.allowAttackEntity) return 0;
      }
    }
    if (attacker && attacker.typeId === "minecraft:player") {
      const stance = Utils.getProp(attacker, "lotm:stance", "balanced");
      if (stance === "attack") baseDmg *= 1.08;
      else if (stance === "ranged" && !options.isRanged) baseDmg *= 0.92;
      const hasInvis = attacker.getEffect && attacker.getEffect("invisibility");
      if (hasInvis) {
        baseDmg *= isPvP ? 1.08 : 1.15;
      }
    }
    if (target && target.typeId === "minecraft:player") {
      const targetStance = Utils.getProp(target, "lotm:stance", "balanced");
      if (targetStance === "defense") baseDmg *= 0.92;
      else if (targetStance === "attack") baseDmg *= 1.05;
    }
    if (options.isFireDamage || StatusEffectManager.hasStatus(target, "burning") || target.getComponent && target.getComponent("onfire")) {
      baseDmg *= 1.1;
    }
    const isUndead = target.matches && (target.matches({ families: ["undead"] }) || target.matches({ families: ["zombie"] }) || target.matches({ families: ["skeleton"] }));
    if (isUndead && options.isUndeadBonus) {
      baseDmg *= 1.25;
    }
    if (StatusEffectManager.hasStatus(target, "armor_break")) {
      baseDmg *= 1.2;
    }
    if (StatusEffectManager.hasStatus(target, "guard")) {
      baseDmg *= 0.2;
      StatusEffectManager.removeStatus(target, "guard");
      Utils.playSound(target, "item.shield.block", 1.2, 1);
      if (attacker && Utils.isValid(attacker)) {
        const dist = Math.hypot(attacker.location.x - target.location.x, attacker.location.z - target.location.z);
        if (dist <= 4) {
          try {
            attacker.applyDamage(isPvP ? 7 : 14, { damagingEntity: target, cause: "entityAttack" });
            Utils.playSound(attacker, "random.break", 1.5, 1);
          } catch {
          }
        }
      }
    }
    if (StatusEffectManager.hasStatus(target, "sleep")) {
      StatusEffectManager.removeStatus(target, "sleep");
    }
    const finalDamage = Math.max(1, Math.round(baseDmg));
    try {
      if (attacker && Utils.isValid(attacker)) {
        target.applyDamage(finalDamage, { damagingEntity: attacker, cause: options.cause || "entityAttack" });
      } else {
        target.applyDamage(finalDamage);
      }
    } catch {
      try {
        target.applyDamage(finalDamage);
      } catch {
      }
    }
    return finalDamage;
  }
};

// scripts/modules/lotm_targeting_service.js
import { world as world7 } from "@minecraft/server";
var TargetingService = class {
  /**
   * 射线检测首个命中实体与方块阻挡点
   * @param {import("@minecraft/server").Player} player 
   * @param {number} maxDist 最大检测距离
   * @returns {{ entity: import("@minecraft/server").Entity|null, hitDist: number, hitLoc: object|null }}
   */
  static getRayTarget(player, maxDist = 30) {
    const dim = player.dimension;
    const headLoc = player.getHeadLocation();
    const viewDir = player.getViewDirection();
    let hitDist = maxDist;
    let hitLoc = null;
    let targetEntity = null;
    try {
      const blockHit = dim.getBlockFromRay(headLoc, viewDir, {
        maxDistance: maxDist,
        includePassableBlocks: false,
        includeLiquidBlocks: false
      });
      if (blockHit && blockHit.block && !blockHit.block.isAir) {
        const face = blockHit.faceLocation;
        let bDist = maxDist;
        if (face) {
          bDist = Math.hypot(face.x - headLoc.x, face.y - headLoc.y, face.z - headLoc.z);
        } else {
          const b = blockHit.block.location;
          bDist = Math.hypot(b.x + 0.5 - headLoc.x, b.y + 0.5 - headLoc.y, b.z + 0.5 - headLoc.z);
        }
        if (bDist > 0.2 && bDist < hitDist) {
          hitDist = bDist;
          hitLoc = face || {
            x: headLoc.x + viewDir.x * bDist,
            y: headLoc.y + viewDir.y * bDist,
            z: headLoc.z + viewDir.z * bDist
          };
        }
      }
    } catch {
    }
    try {
      const hits = dim.getEntitiesFromRay(headLoc, viewDir, { maxDistance: hitDist });
      for (const hit of hits) {
        const ent = hit.entity;
        if (ent && ent.id !== player.id && ent.typeId !== "minecraft:item") {
          const dist = Math.hypot(ent.location.x - headLoc.x, ent.location.y - headLoc.y, ent.location.z - headLoc.z);
          if (dist > 0.3 && dist <= hitDist) {
            hitDist = dist;
            hitLoc = {
              x: headLoc.x + viewDir.x * dist,
              y: headLoc.y + viewDir.y * dist,
              z: headLoc.z + viewDir.z * dist
            };
            targetEntity = ent;
            break;
          }
        }
      }
    } catch {
    }
    return { entity: targetEntity, hitDist, hitLoc };
  }
  /**
   * 扇形锥形范围实体检索 (如武器大师横扫、破晓重剑黎明斩)
   * @param {import("@minecraft/server").Player} player 
   * @param {number} range 半径
   * @param {number} angleDeg 扇形开角角度 (如 120°)
   * @param {number} maxTargets 最大命中目标数 (默认 8)
   * @returns {Array<import("@minecraft/server").Entity>}
   */
  static getConeTargets(player, range = 4, angleDeg = 120, maxTargets = 8) {
    const dim = player.dimension;
    const pLoc = player.location;
    const viewDir = player.getViewDirection();
    const viewAngle = Math.atan2(viewDir.z, viewDir.x);
    const halfAngle = angleDeg * Math.PI / 360;
    const results = [];
    try {
      const entities = dim.getEntities({ location: pLoc, maxDistance: range });
      for (const ent of entities) {
        if (results.length >= maxTargets) break;
        if (ent.id === player.id || ent.typeId === "minecraft:item") continue;
        const eLoc = ent.location;
        const dx = eLoc.x - pLoc.x;
        const dz = eLoc.z - pLoc.z;
        const dist = Math.hypot(dx, dz);
        if (dist > range || dist < 0.2) continue;
        const entAngle = Math.atan2(dz, dx);
        let diff = Math.abs(entAngle - viewAngle);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;
        if (diff <= halfAngle) {
          results.push(ent);
        }
      }
    } catch {
    }
    return results;
  }
  /**
   * 圆形区域范围实体检索 (如焰潮领域、太阳光环)
   * @param {import("@minecraft/server").Player} player 
   * @param {object} centerLoc 中心坐标
   * @param {number} radius 半径
   * @param {number} maxTargets 最大目标数
   * @returns {Array<import("@minecraft/server").Entity>}
   */
  static getAreaTargets(player, centerLoc, radius = 5, maxTargets = 8) {
    const dim = player.dimension;
    const results = [];
    try {
      const entities = dim.getEntities({ location: centerLoc, maxDistance: radius });
      for (const ent of entities) {
        if (results.length >= maxTargets) break;
        if (ent.id === player.id || ent.typeId === "minecraft:item") continue;
        results.push(ent);
      }
    } catch {
    }
    return results;
  }
  /**
   * 智能搜索安全立足点坐标 (用于火焰跳跃、镜面替身等位移能力，绝不卡进方块或回退出生点)
   * @param {import("@minecraft/server").Player} player 
   * @param {number} maxDist 位移距离
   * @returns {object} 安全落点坐标 { x, y, z }
   */
  static getSafeLandingLocation(player, maxDist = 20) {
    const dim = player.dimension;
    const headLoc = player.getHeadLocation();
    const viewDir = player.getViewDirection();
    const startLoc = { ...player.location };
    let targetX = headLoc.x + viewDir.x * maxDist;
    let targetY = headLoc.y + viewDir.y * maxDist;
    let targetZ = headLoc.z + viewDir.z * maxDist;
    try {
      const blockHit = dim.getBlockFromRay(headLoc, viewDir, {
        maxDistance: maxDist,
        includePassableBlocks: false,
        includeLiquidBlocks: false
      });
      if (blockHit && blockHit.block && !blockHit.block.isAir) {
        const face = blockHit.faceLocation;
        if (face) {
          targetX = face.x - viewDir.x * 0.8;
          targetY = face.y;
          targetZ = face.z - viewDir.z * 0.8;
        } else {
          const b = blockHit.block.location;
          targetX = b.x + 0.5 - viewDir.x * 0.8;
          targetY = b.y + 1;
          targetZ = b.z + 0.5 - viewDir.z * 0.8;
        }
      }
    } catch {
    }
    let safeY = Math.floor(targetY);
    let foundSafe = false;
    const checkX = Math.floor(targetX);
    const checkZ = Math.floor(targetZ);
    for (let dy = 2; dy >= -10; dy--) {
      const testY = Math.floor(targetY) + dy;
      if (testY < -64 || testY > 318) continue;
      try {
        const blockFeet = dim.getBlock({ x: checkX, y: testY, z: checkZ });
        const blockHead = dim.getBlock({ x: checkX, y: testY + 1, z: checkZ });
        const blockBelow = dim.getBlock({ x: checkX, y: testY - 1, z: checkZ });
        if (blockBelow && !blockBelow.isAir && blockFeet && (blockFeet.isAir || blockFeet.isLiquid) && blockHead && (blockHead.isAir || blockHead.isLiquid)) {
          safeY = testY;
          foundSafe = true;
          break;
        }
      } catch {
      }
    }
    const finalLoc = {
      x: checkX + 0.5,
      y: foundSafe ? safeY : Math.max(player.location.y, targetY + 0.5),
      z: checkZ + 0.5
    };
    if (isNaN(finalLoc.x) || isNaN(finalLoc.y) || isNaN(finalLoc.z)) {
      return { ...startLoc };
    }
    return finalLoc;
  }
};

// scripts/modules/lotm_artifact_manager.js
import { world as world9, system as system6 } from "@minecraft/server";

// scripts/modules/pathway_warrior.js
import { world as world8, system as system5 } from "@minecraft/server";
var PathwayWarrior = class {
  /**
   * 武器大师姿态管理 (PRD 5.2: 进攻/守御/远射/均衡)
   */
  static getStance(player) {
    return Utils.getProp(player, "lotm:stance", "balanced");
  }
  static setStance(player, stance) {
    Utils.setProp(player, "lotm:stance", stance);
    const stanceNames = {
      attack: "\xA7c\u3010\u8FDB\u653B\u59FF\u6001\u3011 \xA77(\u4F24\u5BB3+8%, \u53D7\u4F24+5%)",
      defense: "\xA79\u3010\u5B88\u5FA1\u59FF\u6001\u3011 \xA77(\u8FD1\u6218\u627F\u4F24-8%, \u79FB\u901F-5%)",
      ranged: "\xA7a\u3010\u8FDC\u5C04\u59FF\u6001\u3011 \xA77(\u6563\u5E03\u5F52\u96F6, \u8FD1\u6218\u4F24\u5BB3-8%)",
      balanced: "\xA7f\u3010\u5747\u8861\u59FF\u6001\u3011 \xA77(\u6807\u51C6\u6218\u6597\u72B6\u6001)"
    };
    Utils.playSound(player, "random.anvil_use", 1.5, 1);
    Utils.tell(player, `\xA76[\u6B66\u5668\u5927\u5E08] \u5DF2\u5207\u6362\u81F3 ${stanceNames[stance] || stanceNames.balanced}\uFF01`);
  }
  /**
   * 武器大师战技分发入口
   */
  static executeWeaponSkill(player, heldItemId, isSneaking, lotmManager) {
    if (isSneaking) {
      this.performMasterGuard(player, lotmManager);
      return;
    }
    if (heldItemId === "lotm:tactical_sword" || heldItemId.includes("sword")) {
      this.swordThrust(player, lotmManager);
    } else if (heldItemId === "lotm:tactical_axe" || heldItemId.includes("axe")) {
      this.axeCleave(player, lotmManager);
    } else if (heldItemId === "lotm:tactical_spear") {
      this.spearPierce(player, lotmManager);
    } else if (heldItemId === "lotm:tactical_bow" || heldItemId.includes("bow")) {
      this.bowFocus(player, lotmManager);
    }
  }
  /**
   * 1. 长剑·穿刺突进 (Sword Thrust)
   */
  static swordThrust(player, lotmManager) {
    if (!lotmManager.modifySpirituality(player, -25)) return;
    const dim = player.dimension;
    const viewDir = player.getViewDirection();
    const startLoc = { ...player.location };
    Utils.playSound(player, "item.trident.riptide_1", 1.8, 1);
    lotmManager.addDigestion(player, 2);
    const targetLoc = {
      x: startLoc.x + viewDir.x * 4,
      y: startLoc.y,
      z: startLoc.z + viewDir.z * 4
    };
    try {
      player.teleport(targetLoc, { dimension: dim });
    } catch {
    }
    const { entity } = TargetingService.getRayTarget(player, 3.5);
    if (entity) {
      DamageResolver.applyDamage(player, entity, {
        pveDamage: 24,
        pvpDamage: 12,
        ignoreArmor: true,
        armorPierceRatio: 0.25
      });
      StatusEffectManager.applyStatus(entity, "armor_break", 100, 0.2, player);
      Utils.playSound(player, "random.break", 1.6, 1);
    }
    Utils.actionbar(player, "\xA76\u{1F5E1}\uFE0F [\u957F\u5251\xB7\u7A7F\u523A] \u7A81\u8FDB\u7834\u7532\u523A\u6740\uFF01");
  }
  /**
   * 2. 战斧·横扫处决 (Axe Cleave)
   */
  static axeCleave(player, lotmManager) {
    if (!lotmManager.modifySpirituality(player, -30)) return;
    const dim = player.dimension;
    Utils.playSound(player, "item.trident.throw", 1.2, 1);
    Utils.playSound(player, "random.explode", 1.6, 0.8);
    lotmManager.addDigestion(player, 2);
    const targets = TargetingService.getConeTargets(player, 3.5, 120, 5);
    for (const target of targets) {
      let dmg = 28;
      const healthComp = target.getComponent && target.getComponent("health");
      if (healthComp && healthComp.currentValue / healthComp.effectiveMax < 0.3) {
        dmg *= 1.25;
      }
      DamageResolver.applyDamage(player, target, {
        pveDamage: dmg,
        pvpDamage: 14
      });
    }
    Utils.actionbar(player, "\xA76\u{1FA93} [\u6218\u65A7\xB7\u6A2A\u626B] 120\xB0\u5F3A\u529B\u5904\u51B3\u98CE\u66B4\uFF01");
  }
  /**
   * 3. 长枪·贯线刺击 (Spear Pierce)
   */
  static spearPierce(player, lotmManager) {
    if (!lotmManager.modifySpirituality(player, -25)) return;
    const dim = player.dimension;
    const headLoc = player.getHeadLocation();
    const viewDir = player.getViewDirection();
    Utils.playSound(player, "random.bow", 1.8, 1);
    lotmManager.addDigestion(player, 2);
    const { entity } = TargetingService.getRayTarget(player, 6);
    if (entity) {
      DamageResolver.applyDamage(player, entity, {
        pveDamage: 26,
        pvpDamage: 13
      });
      Utils.playSound(player, "random.break", 1.5, 1);
    }
    for (let d = 0.5; d < 6; d += 0.8) {
      try {
        dim.spawnParticle("minecraft:crit", {
          x: headLoc.x + viewDir.x * d,
          y: headLoc.y + viewDir.y * d,
          z: headLoc.z + viewDir.z * d
        });
      } catch {
      }
    }
    Utils.actionbar(player, "\xA76\u{1F531} [\u957F\u67AA\xB7\u8D2F\u7EBF] 6\u683C\u76F4\u7EBF\u8D2F\u7A7F\u523A\u51FB\uFF01");
  }
  /**
   * 4. 战弓·专注射击 (Bow Focus)
   */
  static bowFocus(player, lotmManager) {
    if (!lotmManager.modifySpirituality(player, -30)) return;
    Utils.playSound(player, "random.orb", 1.5, 1);
    lotmManager.addDigestion(player, 2);
    try {
      player.addEffect("strength", 100, { amplifier: 1, showParticles: false });
    } catch {
    }
    Utils.actionbar(player, "\xA76\u{1F3F9} [\u6218\u5F13\xB7\u4E13\u6CE8] \u51DD\u795E\u805A\u6C14\uFF0C\u4E0B\u4E00\u6B21\u5C04\u51FB\u4F24\u5BB3+50%\uFF01");
  }
  /**
   * 副技能：【大师格挡 (Master Guard)】 (潜行右键)
   */
  static performMasterGuard(player, lotmManager) {
    if (!lotmManager.modifySpirituality(player, -45)) return;
    Utils.playSound(player, "item.shield.block", 1.5, 1);
    lotmManager.addDigestion(player, 3);
    StatusEffectManager.applyStatus(player, "guard", 20, 0.8, player);
    Utils.actionbar(player, "\xA7e\u{1F6E1}\uFE0F [\u5927\u5E08\u683C\u6321] 1\u79D2\u683C\u6321\u67B6\u52BF\uFF01\u53D7\u51FB\u51CF\u4F2480%\u5E76\u53CD\u51FB\uFF01");
  }
  /**
   * 消耗品：【磨刃油 (Blade Oil)】
   */
  static applyBladeOil(player, lotmManager) {
    if (Utils.countItem(player, "lotm:blade_oil") <= 0) {
      Utils.tell(player, "\xA7c\u80CC\u5305\u4E2D\u6CA1\u6709\u3010\u78E8\u5203\u6CB9\u3011\uFF01");
      Utils.sound.fail(player);
      return;
    }
    Utils.removeItem(player, "lotm:blade_oil", 1);
    Utils.playSound(player, "random.anvil_use", 1.2, 1);
    lotmManager.addDigestion(player, 1);
    try {
      player.addEffect("strength", 1200, { amplifier: 0, showParticles: false });
    } catch {
    }
    Utils.tell(player, "\xA7a\u{1F5E1}\uFE0F [\u78E8\u5203\u6CB9] \u5175\u5203\u6253\u78E8\u5B8C\u6BD5\uFF0160\u79D2\u5185\u6B66\u5668\u4F24\u5BB3+8%\uFF0C\u8010\u4E45\u635F\u8017-20%\uFF01");
  }
};

// scripts/modules/lotm_artifact_manager.js
var ArtifactManager = class {
  // 玩家武器状态追踪: playerId -> { overheat, bloodThirst, identityFracture, weaponMemory, lockedForm, mirrorMarker, hitCount, silentUses, combatLog }
  static playerArtifactState = /* @__PURE__ */ new Map();
  static combatLogEnabled = /* @__PURE__ */ new Map();
  // playerId -> boolean
  static getState(player) {
    if (!this.playerArtifactState.has(player.id)) {
      this.playerArtifactState.set(player.id, {
        overheat: 0,
        bloodThirst: 0,
        identityFracture: 0,
        weaponMemory: 0,
        arsenalForm: "sword",
        // sword, axe, spear, bow
        lockedUntilTick: 0,
        mirrorMarker: null,
        // { loc, expiresAtTick }
        hitCount: 0,
        silentUses: 0,
        deathKnellThirst: 0
      });
    }
    return this.playerArtifactState.get(player.id);
  }
  /**
   * 判断物品是否为非凡武器/封印物
   * @param {string} itemId 
   * @returns {boolean}
   */
  static isArtifact(itemId) {
    return [
      "lotm:ashen_reaper",
      "lotm:dawn_greatsword",
      "lotm:silent_pointer",
      "lotm:blood_moon_rapier",
      "lotm:mirror_split_dagger",
      "lotm:arsenal_box",
      "lotm:death_knell"
    ].includes(itemId);
  }
  /**
   * 处理非凡武器主动技能触发
   */
  static handleArtifactUse(player, itemId, isSneaking, lotmManager) {
    const isMortal = lotmManager.getSequence(player) === 0;
    switch (itemId) {
      case "lotm:ashen_reaper":
        this.useAshenReaper(player, lotmManager, isMortal);
        break;
      case "lotm:dawn_greatsword":
        this.useDawnGreatsword(player, lotmManager, isMortal);
        break;
      case "lotm:silent_pointer":
        this.useSilentPointer(player, isSneaking, lotmManager, isMortal);
        break;
      case "lotm:blood_moon_rapier":
        this.useBloodMoonRapier(player, lotmManager, isMortal);
        break;
      case "lotm:mirror_split_dagger":
        this.useMirrorSplitDagger(player, lotmManager, isMortal);
        break;
      case "lotm:arsenal_box":
        this.useArsenalBox(player, isSneaking, lotmManager, isMortal);
        break;
      case "lotm:death_knell":
        this.useDeathKnell(player, isSneaking, lotmManager, isMortal);
        break;
    }
  }
  // =========================================================================
  // 1. 【3级非凡武器 · 灰烬收割者 (Ashen Reaper)】 (焦黑单刃军刀)
  // =========================================================================
  static useAshenReaper(player, lotmManager, isMortal) {
    const state = this.getState(player);
    if (state.overheat >= 3) {
      Utils.playSound(player, "fire.ignite", 1.8, 1);
      Utils.actionbar(player, "\xA7c\u{1F525} [\u7070\u70EC\u6536\u5272\u8005\xB7\u8FC7\u70ED\u81EA\u71C3] \u5200\u8EAB\u70BD\u70C8\u6EDA\u70EB\uFF01\u5904\u4E8E\u8FC7\u70ED\u9501\u5B9A\u72B6\u6001\u4E2D\uFF01");
      return;
    }
    const cost = isMortal ? 60 : 40;
    if (!lotmManager.modifySpirituality(player, -cost)) return;
    state.overheat += 1;
    if (state.overheat >= 3) {
      try {
        player.setOnFire(4, true);
      } catch {
      }
      Utils.tell(player, "\xA7c\xA7l[\u6B66\u5668\u8D1F\u9762] \xA7e\u7070\u70EC\u6536\u5272\u8005\u8FBE\u5230 3 \u5C42\u8FC7\u70ED\uFF01\u4F60\u9677\u5165 4 \u79D2\u81EA\u71C3\uFF0C\u6B66\u5668\u4E3B\u52A8\u9501\u5B9A 10 \u79D2\uFF01");
    }
    const dim = player.dimension;
    Utils.playSound(player, "fire.ignite", 1.8, 0.8);
    Utils.playSound(player, "random.explode", 1.2, 1);
    const { entity, hitLoc } = TargetingService.getRayTarget(player, 8);
    if (entity) {
      DamageResolver.applyDamage(player, entity, {
        pveDamage: 26,
        pvpDamage: 13,
        isFireDamage: true
      });
      StatusEffectManager.applyStatus(entity, "burning", 120, 1, player);
      const aoeTargets = TargetingService.getAreaTargets(player, entity.location, 2.5, 5);
      for (const t of aoeTargets) {
        if (t.id !== entity.id) {
          DamageResolver.applyDamage(player, t, { pveDamage: 13, pvpDamage: 6, isFireDamage: true });
        }
      }
    }
    if (hitLoc) {
      try {
        dim.spawnParticle("minecraft:flame_particle", hitLoc);
      } catch {
      }
    }
    Utils.actionbar(player, `\xA7c\u{1F5E1}\uFE0F [\u7206\u71C3\u6536\u5272] \u5F15\u7206\u4F59\u70EC\uFF01(\u5F53\u524D\u8FC7\u70ED: ${state.overheat}/3)`);
  }
  // =========================================================================
  // 2. 【3级非凡武器 · 破晓重剑 (Dawn Greatsword)】 (双手重剑)
  // =========================================================================
  static useDawnGreatsword(player, lotmManager, isMortal) {
    const cost = isMortal ? 75 : 50;
    if (!lotmManager.modifySpirituality(player, -cost)) return;
    const dim = player.dimension;
    Utils.playSound(player, "beacon.activate", 1.5, 1);
    Utils.playSound(player, "item.trident.thunder", 1.2, 1);
    const targets = TargetingService.getConeTargets(player, 6, 120, 8);
    for (const t of targets) {
      DamageResolver.applyDamage(player, t, {
        pveDamage: 24,
        pvpDamage: 12,
        isUndeadBonus: true
      });
      StatusEffectManager.applyStatus(t, "silence", 20, 1, player);
    }
    try {
      player.addEffect("slowness", 400, { amplifier: 0, showParticles: false });
      player.addEffect("glowing", 400, { amplifier: 0, showParticles: false });
    } catch {
    }
    Utils.actionbar(player, "\xA7e\u2694\uFE0F [\u7834\u6653\xB7\u9ECE\u660E\u65A9] \u8000\u9633\u4E4B\u5203\u6A2A\u626B\uFF01\u9644\u5E26 20 \u79D2\u53D1\u5149\u4E0E\u79FB\u901F\u51CF\u76CA\uFF01");
  }
  // =========================================================================
  // 3. 【3级非凡武器 · 无声教鞭 (Silent Pointer)】 (黑木短杖)
  // =========================================================================
  static useSilentPointer(player, isSneaking, lotmManager, isMortal) {
    const state = this.getState(player);
    if (!isSneaking) {
      if (!lotmManager.modifySpirituality(player, isMortal ? 65 : 45)) return;
      state.silentUses += 1;
      if (state.silentUses >= 3) {
        state.silentUses = 0;
        StatusEffectManager.applyStatus(player, "drowsy", 20, 1, player);
        Utils.tell(player, "\xA78\xA7l[\u6559\u97AD\u53CD\u566C] \xA7c\u8FDE\u7EED\u65BD\u5C55\u5B89\u7720\u6307\u4EE4\uFF0C\u7CBE\u795E\u75B2\u60EB\u9677\u5165 1 \u79D2\u56F0\u5026\uFF01");
      }
      const { entity } = TargetingService.getRayTarget(player, 18);
      if (entity) {
        StatusEffectManager.applyStatus(entity, entity.typeId === "minecraft:player" ? "drowsy" : "sleep", 100, 1, player);
        Utils.playSound(entity, "random.orb", 1.2, 1);
      }
      Utils.actionbar(player, "\xA78\u{1FA84} [\u65E0\u58F0\u6559\u97AD\xB7\u5B89\u7720] \u76EE\u6807\u610F\u5FD7\u9677\u5165\u6C89\u7720\uFF01");
    } else {
      if (!lotmManager.modifySpirituality(player, isMortal ? 50 : 35)) return;
      const { entity } = TargetingService.getRayTarget(player, 18);
      if (entity) {
        const isSleeping = StatusEffectManager.hasStatus(entity, "sleep") || StatusEffectManager.hasStatus(entity, "drowsy");
        const dealt = DamageResolver.applyDamage(player, entity, {
          pveDamage: isSleeping ? 26 : 8,
          pvpDamage: isSleeping ? 13 : 4
        });
        StatusEffectManager.removeStatus(entity, "sleep");
        Utils.playSound(player, "random.break", 1.8, 1);
        Utils.actionbar(player, `\xA78\u{1F4A5} [\u65E0\u58F0\u6559\u97AD\xB7\u60CA\u9192] \u60CA\u9192\u6253\u51FB\u9020\u6210 ${dealt} \u4F24\u5BB3\uFF01`);
      }
    }
  }
  // =========================================================================
  // 4. 【2级非凡武器 · 血月刺剑 (Blood Moon Rapier)】 (暗红细长刺剑)
  // =========================================================================
  static useBloodMoonRapier(player, lotmManager, isMortal) {
    if (isMortal) {
      try {
        const hp = player.getComponent("health");
        if (hp) hp.setCurrentValue(Math.max(1, hp.currentValue - 8));
      } catch {
      }
      Utils.tell(player, "\xA74\xA7l[\u5C01\u5370\u7269\u53CD\u566C] \xA7c\u51E1\u4EBA\u65E0\u6CD5\u9A7E\u9A6D2\u7EA7\u5C01\u5370\u7269\u3010\u8840\u6708\u523A\u5251\u3011\uFF01\u53D7\u5230\u5438\u8840\u53CD\u566C\u6263\u9664 8 HP\uFF01");
      Utils.playSound(player, "random.hurt", 1.5, 0.8);
      return;
    }
    if (!lotmManager.modifySpirituality(player, -65)) return;
    const state = this.getState(player);
    state.bloodThirst = Math.min(100, state.bloodThirst + 25);
    const dim = player.dimension;
    const viewDir = player.getViewDirection();
    const startLoc = { ...player.location };
    Utils.playSound(player, "item.trident.riptide_2", 1.8, 0.8);
    const targetLoc = {
      x: startLoc.x + viewDir.x * 8,
      y: startLoc.y,
      z: startLoc.z + viewDir.z * 8
    };
    try {
      player.teleport(targetLoc, { dimension: dim });
    } catch {
    }
    const { entity } = TargetingService.getRayTarget(player, 4);
    if (entity) {
      const dealt = DamageResolver.applyDamage(player, entity, {
        pveDamage: 30,
        pvpDamage: 15,
        ignoreArmor: true,
        armorPierceRatio: 0.25
      });
      const heal = Math.min(8, Math.max(1, Math.round(dealt * 0.3)));
      try {
        const hp = player.getComponent("health");
        if (hp) hp.setCurrentValue(Math.min(hp.effectiveMax, hp.currentValue + heal));
      } catch {
      }
    }
    Utils.actionbar(player, `\xA74\u{1FA78} [\u8840\u5F71\u8D2F\u6740] \u7A7F\u900F\u8840\u5F71\u7A81\u523A\uFF01(\u5F53\u524D\u8840\u6E34: ${state.bloodThirst}/100)`);
  }
  // =========================================================================
  // 5. 【2级非凡武器 · 镜裂短刃 (Mirror Split Dagger)】 (镜面碎片匕首)
  // =========================================================================
  static useMirrorSplitDagger(player, lotmManager, isMortal) {
    if (isMortal) {
      Utils.tell(player, "\xA74\xA7l[\u5C01\u5370\u7269\u53CD\u566C] \xA7c\u51E1\u4EBA\u89E6\u78B0\u955C\u88C2\u77ED\u5203\uFF0C\u955C\u4E2D\u6076\u5FF5\u5206\u8EAB\u88AB\u5524\u9192\uFF01");
      Utils.playSound(player, "random.glass", 1.8, 1);
      return;
    }
    const state = this.getState(player);
    const currentTick = system6.currentTick;
    if (state.mirrorMarker && currentTick < state.mirrorMarker.expiresAtTick) {
      const destLoc = state.mirrorMarker.loc;
      state.mirrorMarker = null;
      Utils.playSound(player, "random.glass", 1.8, 1);
      Utils.playSound(player, "mob.endermen.portal", 1.8, 1);
      try {
        player.teleport(destLoc, { dimension: player.dimension });
      } catch {
      }
      Utils.actionbar(player, "\xA7d\u{1FA9E} [\u955C\u50CF\u7F6E\u6362] \u77AC\u79FB\u81F3\u955C\u50CF\u6807\u8BB0\u5750\u6807\uFF01");
      return;
    }
    if (!lotmManager.modifySpirituality(player, -70)) return;
    state.identityFracture = Math.min(100, state.identityFracture + 20);
    if (state.identityFracture >= 100) {
      state.identityFracture = 40;
      Utils.tell(player, "\xA7d\xA7l[\u8EAB\u4EFD\u88C2\u75D5\u7206\u53D1] \xA7c100 \u88C2\u75D5\u5BFC\u81F4\u81EA\u6211\u8BA4\u77E5\u7834\u788E\uFF01\u751F\u6210\u654C\u5BF9\u955C\u50CF\u5E76\u56DE\u843D\u81F3 40\uFF01");
    }
    const markerLoc = TargetingService.getSafeLandingLocation(player, 10);
    state.mirrorMarker = { loc: markerLoc, expiresAtTick: currentTick + 80 };
    try {
      player.dimension.spawnParticle("minecraft:crit", markerLoc);
    } catch {
    }
    Utils.playSound(player, "random.glass", 1.5, 1);
    Utils.actionbar(player, "\xA7d\u{1FA9E} [\u955C\u5F71\u6807\u8BB0] 10\u683C\u5B89\u5168\u70B9\u5DF2\u653E\u7F6E\u955C\u50CF\uFF014\u79D2\u5185\u518D\u6B21\u53F3\u952E\u7F6E\u6362\uFF01");
  }
  // =========================================================================
  // 6. 【2级非凡武器 · 百兵匣 (Arsenal Box)】 (黑铁武器机匣)
  // =========================================================================
  static useArsenalBox(player, isSneaking, lotmManager, isMortal) {
    const state = this.getState(player);
    const forms = ["sword", "axe", "spear", "bow"];
    if (isSneaking) {
      if (!lotmManager.modifySpirituality(player, -25)) return;
      const nextIndex = (forms.indexOf(state.arsenalForm) + 1) % forms.length;
      state.arsenalForm = forms[nextIndex];
      state.weaponMemory += 1;
      const formNames = {
        sword: "\xA7f\u957F\u5251\u5F62\u6001 (\u7A7F\u523A\u7A81\u8FDB)",
        axe: "\xA76\u6218\u65A7\u5F62\u6001 (120\xB0\u6A2A\u626B\u5904\u51B3)",
        spear: "\xA7e\u957F\u67AA\u5F62\u6001 (6\u683C\u8D2F\u7EBF\u523A\u51FB)",
        bow: "\xA7a\u6218\u5F13\u5F62\u6001 (\u4E13\u6CE8\u5C04\u51FB)"
      };
      Utils.playSound(player, "random.anvil_use", 1.5, 1);
      Utils.actionbar(player, `\xA76\u{1F4E6} [\u767E\u5175\u5323\xB7\u5F62\u6001\u8F6C\u6362] \u5207\u6362\u4E3A ${formNames[state.arsenalForm]}\uFF01`);
      return;
    }
    if (!lotmManager.modifySpirituality(player, -35)) return;
    switch (state.arsenalForm) {
      case "sword":
        PathwayWarrior.swordThrust(player, lotmManager);
        break;
      case "axe":
        PathwayWarrior.axeCleave(player, lotmManager);
        break;
      case "spear":
        PathwayWarrior.spearPierce(player, lotmManager);
        break;
      case "bow":
        PathwayWarrior.bowFocus(player, lotmManager);
        break;
    }
  }
  // =========================================================================
  // 7. 【2级封印物 · 丧钟左轮 (Death Knell 改版)】
  // =========================================================================
  static useDeathKnell(player, isSneaking, lotmManager, isMortal) {
    if (isMortal) {
      Utils.tell(player, "\xA7c\u666E\u901A\u4EBA\u7684\u8089\u8EAB\u4E0E\u7CBE\u795E\u65E0\u6CD5\u627F\u53D72\u7EA7\u5C01\u5370\u7269\u7684\u5E9E\u5927\u7075\u6027\u8D1F\u8377\uFF01\u5F3A\u884C\u5F00\u706B\u5C06\u906D\u53D7\u7CBE\u795E\u6C61\u67D3\u53CD\u566C\uFF01");
      Utils.playSound(player, "random.break", 1.5, 0.8);
      return;
    }
    const requiredSP = isSneaking ? 150 : 80;
    if (!lotmManager.modifySpirituality(player, -requiredSP)) {
      Utils.actionbar(player, `\xA7c\u2727 \u7075\u6027\u4E0D\u8DB3 (\u9700 ${requiredSP} \u70B9) \u65E0\u6CD5\u9A71\u52A8\u3010\u4E27\u949F\u5DE6\u8F6E\u3011\uFF01`);
      return;
    }
    const dim = player.dimension;
    const headLoc = player.getHeadLocation();
    const viewDir = player.getViewDirection();
    Utils.playSound(player, "random.explode", 1.8, 1);
    Utils.playSound(player, "firework.launch", 1.6, 0.8);
    Utils.playSound(player, "random.totem", 1.5, 0.9);
    if (isSneaking) {
      const offsets = [-0.1, 0, 0.1];
      for (const off of offsets) {
        const spreadDir = {
          x: viewDir.x + off * -viewDir.z,
          y: viewDir.y,
          z: viewDir.z + off * viewDir.x
        };
        const targets = TargetingService.getConeTargets(player, 35, 30, 8);
        for (const t of targets) {
          DamageResolver.applyDamage(player, t, {
            pveDamage: 30,
            pvpDamage: 12
          });
        }
      }
      Utils.actionbar(player, "\xA74\u{1F525} [\u4E27\u949F\xB7\u5C60\u6740\u6A21\u5F0F] \u6D88\u8017150\u7075\u6027\u6FC0\u53D1\u6247\u5F62\u7075\u6027\u98CE\u66B4\uFF01");
    } else {
      const { entity, hitLoc } = TargetingService.getRayTarget(player, 55);
      if (entity) {
        DamageResolver.applyDamage(player, entity, {
          pveDamage: 48,
          pvpDamage: 22,
          ignoreArmor: true,
          armorPierceRatio: 0.5
        });
        Utils.playSound(player, "random.break", 1.8, 1);
      }
      if (hitLoc) {
        try {
          dim.spawnParticle("minecraft:large_explosion", hitLoc);
          dim.spawnParticle("minecraft:sonic_explosion", hitLoc);
        } catch {
        }
      }
      Utils.actionbar(player, "\xA7c\u2620 [\u4E27\u949F\u5DE6\u8F6E] \u5F31\u70B9\u770B\u7834\uFF01\u6D88\u801780\u7075\u6027\u4E3A\u654C\u4EBA\u6572\u54CD\u4E27\u949F\uFF01");
    }
  }
  // =========================================================================
  // 被动攻击命中钩子 (在 entityHurt 中触发非凡武器被动)
  // =========================================================================
  static handleAttackHit(attacker, target) {
    if (!attacker || attacker.typeId !== "minecraft:player") return;
    const mainhand = attacker.getComponent && attacker.getComponent("inventory")?.container?.getItem(attacker.selectedSlotIndex);
    if (!mainhand || !mainhand.typeId) return;
    const itemId = mainhand.typeId;
    const state = this.getState(attacker);
    if (itemId === "lotm:ashen_reaper") {
      StatusEffectManager.applyStatus(target, "burning", 160, 1, attacker);
    }
    if (itemId === "lotm:dawn_greatsword") {
      const isUndead = target.matches && target.matches({ families: ["undead", "zombie", "skeleton"] });
      if (isUndead) {
        try {
          target.applyDamage(4);
        } catch {
        }
      }
    }
    if (itemId === "lotm:blood_moon_rapier") {
      state.hitCount += 1;
      if (state.hitCount % 3 === 0) {
        try {
          const hp = attacker.getComponent("health");
          if (hp) hp.setCurrentValue(Math.min(hp.effectiveMax, hp.currentValue + 3));
        } catch {
        }
        Utils.playSound(attacker, "random.orb", 1.5, 1);
        Utils.actionbar(attacker, "\xA74\u{1FA78} [\u8840\u6708\u4E4B\u5951] \u7B2C\u4E09\u51FB\u547D\u4E2D\uFF01\u6062\u590D 3 HP \u4E0E 20 \u7075\u6027\uFF01");
      }
    }
  }
  /**
   * 查看非凡武器实例与收容信息 (!artifact inspect)
   */
  static inspect(player) {
    const mainhand = player.getComponent && player.getComponent("inventory")?.container?.getItem(player.selectedSlotIndex);
    if (!mainhand || !this.isArtifact(mainhand.typeId)) {
      Utils.tell(player, "\xA7c\u8BF7\u624B\u6301\u4E00\u4EF6\u975E\u51E1\u6B66\u5668\u6216\u5C01\u5370\u7269\u6267\u884C\u68C0\u67E5\uFF01");
      return;
    }
    const state = this.getState(player);
    const descriptions = {
      "lotm:ashen_reaper": `\xA7c\u30103\u7EA7\xB7\u7070\u70EC\u6536\u5272\u8005\u3011
\xA77\u5F53\u524D\u8FC7\u70ED\u5C42\u6570: ${state.overheat}/3
\xA77\u6536\u5BB9\u8981\u6C42: \u7BB1\u5185\u5FC5\u987B\u5E38\u5907\u6C34\u6876\u6216 3 \u74F6\u6C34\u3002`,
      "lotm:dawn_greatsword": `\xA7e\u30103\u7EA7\xB7\u7834\u6653\u91CD\u5251\u3011
\xA77\u8D1F\u9762\u72B6\u6001: \u79FB\u901F-10%\uFF0C\u4E3B\u52A8\u540E\u53D1\u5149 20 \u79D2
\xA77\u6536\u5BB9\u8981\u6C42: \u6BCF\u65E5\u5FC5\u987B\u5728\u65E5\u5149\u4E0B\u5145\u80FD 30 \u79D2\u3002`,
      "lotm:silent_pointer": `\xA78\u30103\u7EA7\xB7\u65E0\u58F0\u6559\u97AD\u3011
\xA77\u5F53\u524D\u8FDE\u7EED\u4F7F\u7528: ${state.silentUses}/3
\xA77\u6536\u5BB9\u8981\u6C42: \u5FC5\u987B\u4E0E\u65F6\u949F (Clock) \u7F6E\u4E8E\u540C\u4E00\u5BB9\u5668\u3002`,
      "lotm:blood_moon_rapier": `\xA74\u30102\u7EA7\xB7\u8840\u6708\u523A\u5251\u3011
\xA77\u5F53\u524D\u8840\u6E34\u79EF\u7D2F: ${state.bloodThirst}/100
\xA77\u6536\u5BB9\u8981\u6C42: \u5BB9\u5668\u4E2D\u5FC5\u987B\u5B58\u653E\u5BC6\u5C01\u8840\u6DB2\u74F6\u3002`,
      "lotm:mirror_split_dagger": `\xA7d\u30102\u7EA7\xB7\u955C\u88C2\u77ED\u5203\u3011
\xA77\u8EAB\u4EFD\u88C2\u75D5: ${state.identityFracture}/100
\xA77\u6536\u5BB9\u8981\u6C42: \u4E0D\u900F\u660E\u5305\u88F9\uFF0C\u4E25\u7981\u4E0E\u955C\u9762/\u73BB\u7483\u540C\u7BB1\u3002`,
      "lotm:arsenal_box": `\xA76\u30102\u7EA7\xB7\u767E\u5175\u5323\u3011
\xA77\u5F53\u524D\u5F62\u6001: ${state.arsenalForm}
\xA77\u6536\u5BB9\u8981\u6C42: \u5165\u7BB1\u524D\u5FC5\u987B\u91CD\u7F6E\u4E3A\u7A7A\u5323\u72B6\u6001\u3002`,
      "lotm:death_knell": `\xA7c\u30102\u7EA7\u5C01\u5370\u7269\xB7\u4E27\u949F\u5DE6\u8F6E\u3011
\xA77\u8D1F\u9762\u4EE3\u4EF7: \u7D2F\u79EF\u5E72\u6E34\u4E0E\u968F\u673A\u5F31\u70B9
\xA77\u6536\u5BB9\u8981\u6C42: \u5378\u4E0B\u5F39\u836F\u4E0E\u5B50\u5F39\u5206\u5F00\u653E\u7F6E\u4E8E\u9ED1\u8272\u5BB9\u5668\u3002`
    };
    Utils.tell(
      player,
      `\xA76\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u3010\u5C01\u5370\u7269\u9274\u8BC6\u62A5\u544A\u3011\u2550\u2550\u2550\u2550\u2550\u2550\u2550
${descriptions[mainhand.typeId] || "\u672A\u77E5\u975E\u51E1\u7269\u54C1"}
\xA76\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`
    );
  }
};

// scripts/modules/pathway_seer.js
import { world as world10, system as system7 } from "@minecraft/server";
var PathwaySeer = class {
  static spiritVisionActive = /* @__PURE__ */ new Map();
  /**
   * 主技能：【空气弹 (Air Bullet)】 (普通右键)
   */
  static fireAirBullet(player, lotmManager) {
    if (!lotmManager.modifySpirituality(player, -30)) return;
    const dim = player.dimension;
    const headLoc = player.getHeadLocation();
    const viewDir = player.getViewDirection();
    Utils.playSound(player, "random.explode", 1.8, 1);
    Utils.playSound(player, "firework.launch", 1.5, 0.9);
    lotmManager.addDigestion(player, 2);
    const muzzleLoc = {
      x: headLoc.x + viewDir.x * 1,
      y: headLoc.y + viewDir.y * 1 - 0.1,
      z: headLoc.z + viewDir.z * 1
    };
    try {
      dim.spawnParticle("minecraft:sonic_explosion", muzzleLoc);
    } catch {
    }
    const { entity, hitLoc } = TargetingService.getRayTarget(player, 35);
    if (entity) {
      DamageResolver.applyDamage(player, entity, {
        pveDamage: 35,
        pvpDamage: 18,
        cause: "entityAttack"
      });
      try {
        if (typeof entity.applyKnockback === "function") {
          try {
            entity.applyKnockback({ x: viewDir.x, y: 0.3, z: viewDir.z }, 3);
          } catch {
            entity.applyKnockback(viewDir.x, viewDir.z, 3, 0.5);
          }
        }
      } catch {
      }
    }
    const impactLoc = hitLoc || {
      x: headLoc.x + viewDir.x * 25,
      y: headLoc.y + viewDir.y * 25,
      z: headLoc.z + viewDir.z * 25
    };
    try {
      dim.spawnParticle("minecraft:large_explosion", impactLoc);
    } catch {
    }
    Utils.actionbar(player, "\xA7b\u{1F4A8} [\u7A7A\u6C14\u5F39] \u54CD\u6307\u8F7B\u5F39\uFF0C\u65E0\u5F62\u7A7A\u6C14\u70AE\u8F70\u51FA\uFF01");
  }
  /**
   * 副技能：【火焰跳跃 (Flame Jump)】 (潜行右键)
   */
  static performFlameJump(player, lotmManager) {
    if (!lotmManager.modifySpirituality(player, -45)) return;
    const dim = player.dimension;
    const startLoc = { ...player.location };
    const finalLoc = TargetingService.getSafeLandingLocation(player, 20);
    try {
      dim.spawnParticle("minecraft:flame_particle", startLoc);
      dim.spawnParticle("minecraft:large_explosion", startLoc);
    } catch {
    }
    Utils.playSound(player, "fire.ignite", 1.2, 1);
    Utils.playSound(player, "mob.endermen.portal", 1.5, 1);
    try {
      player.teleport(finalLoc, { dimension: dim });
    } catch {
      try {
        player.teleport(finalLoc);
      } catch {
      }
    }
    try {
      dim.spawnParticle("minecraft:flame_particle", finalLoc);
      dim.spawnParticle("minecraft:large_explosion", finalLoc);
    } catch {
    }
    Utils.playSound(player, "fire.ignite", 1.5, 1);
    Utils.playSound(player, "mob.endermen.portal", 1.8, 1);
    try {
      const block = dim.getBlock({
        x: Math.floor(finalLoc.x),
        y: Math.floor(finalLoc.y),
        z: Math.floor(finalLoc.z)
      });
      if (block && block.isAir) {
        try {
          block.setType("minecraft:fire");
        } catch {
          try {
            dim.runCommand(`setblock ${Math.floor(finalLoc.x)} ${Math.floor(finalLoc.y)} ${Math.floor(finalLoc.z)} fire keep`);
          } catch {
          }
        }
      }
    } catch {
    }
    const nearby = TargetingService.getAreaTargets(player, finalLoc, 2.5, 8);
    for (const ent of nearby) {
      try {
        if (typeof ent.setOnFire === "function") ent.setOnFire(5, true);
      } catch {
      }
    }
    lotmManager.addDigestion(player, 3);
    Utils.actionbar(player, "\xA76\u{1F525} [\u706B\u7130\u8DF3\u8DC3] \u706B\u5149\u51B2\u5929\uFF0C\u5F15\u71C3\u843D\u70B9\u70C8\u7130\uFF01");
  }
  /**
   * 消耗品：【魔术纸牌飞掷 (Tarot Card Throw)】
   */
  static throwTarotCard(player, lotmManager) {
    if (Utils.countItem(player, "lotm:tarot_card") <= 0) {
      Utils.tell(player, "\xA7c\u80CC\u5305\u4E2D\u6CA1\u6709\u3010\u9B54\u672F\u7EB8\u724C\u3011\u5A92\u4ECB\uFF0C\u65E0\u6CD5\u63B7\u51FA\uFF01");
      Utils.sound.fail(player);
      return;
    }
    if (!lotmManager.modifySpirituality(player, -15)) return;
    Utils.removeItem(player, "lotm:tarot_card", 1);
    const dim = player.dimension;
    const headLoc = player.getHeadLocation();
    const viewDir = player.getViewDirection();
    Utils.playSound(player, "random.bow", 2, 1);
    Utils.playSound(player, "random.pop", 1.8, 1);
    lotmManager.addDigestion(player, 1);
    const { entity, hitDist, hitLoc } = TargetingService.getRayTarget(player, 32);
    if (entity) {
      DamageResolver.applyDamage(player, entity, {
        pveDamage: 22,
        pvpDamage: 12,
        cause: "entityAttack"
      });
      Utils.playSound(player, "random.anvil_land", 2, 0.7);
      Utils.playSound(player, "random.break", 1.8, 1);
    }
    const maxDraw = Math.max(1, hitDist);
    for (let d = 0.5; d < maxDraw; d += 0.5) {
      try {
        dim.spawnParticle("minecraft:crit", {
          x: headLoc.x + viewDir.x * d,
          y: headLoc.y + viewDir.y * d,
          z: headLoc.z + viewDir.z * d
        });
      } catch {
      }
    }
    if (hitLoc) {
      try {
        dim.spawnParticle("minecraft:crit", hitLoc);
      } catch {
      }
    }
    Utils.actionbar(player, "\xA7e\u{1F0CF} [\u9B54\u672F\u7EB8\u724C] \u7834\u7A7A\u98DE\u63B7\uFF01");
  }
  /**
   * 自动触发：【纸人替身 (Paper Figurine)】
   */
  static triggerPaperSubstitute(player, lotmManager) {
    if (Utils.countItem(player, "lotm:paper_figurine") <= 0) return false;
    if (!lotmManager.modifySpirituality(player, -40)) return false;
    Utils.removeItem(player, "lotm:paper_figurine", 1);
    const dim = player.dimension;
    const oldLoc = { ...player.location };
    try {
      dim.spawnParticle("minecraft:flame_particle", oldLoc);
      dim.spawnParticle("minecraft:smoke_particle", oldLoc);
      dim.spawnParticle("minecraft:large_explosion", oldLoc);
    } catch {
    }
    Utils.playSound(player, "random.totem", 1.2, 1);
    const offsetAngle = Math.random() * Math.PI * 2;
    const safeLoc = {
      x: oldLoc.x + Math.cos(offsetAngle) * 4,
      y: oldLoc.y + 0.2,
      z: oldLoc.z + Math.sin(offsetAngle) * 4
    };
    try {
      player.teleport(safeLoc, { dimension: dim });
    } catch {
    }
    lotmManager.addDigestion(player, 3);
    Utils.tell(player, "\xA7c\xA7l[\u66FF\u8EAB\u751F\u6548] \xA7e\u7B26\u5492\u7EB8\u4EBA\u81EA\u71C3\u66FF\u6B7B\uFF01\u4F60\u5DF2\u91D1\u8749\u8131\u58F3\uFF01");
    return true;
  }
};

// scripts/modules/pathway_hunter.js
import { world as world11, system as system8 } from "@minecraft/server";
var PathwayHunter = class {
  /**
   * 主技能：【火焰长枪 (Flame Spear)】 (普通右键)
   */
  static fireFlameSpear(player, lotmManager) {
    if (!lotmManager.modifySpirituality(player, -35)) return;
    const dim = player.dimension;
    const headLoc = player.getHeadLocation();
    const viewDir = player.getViewDirection();
    const maxDist = 28;
    Utils.playSound(player, "fire.ignite", 1.8, 1);
    Utils.playSound(player, "firework.launch", 1.6, 0.8);
    lotmManager.addDigestion(player, 2);
    const { entity, hitDist, hitLoc } = TargetingService.getRayTarget(player, maxDist);
    if (entity) {
      DamageResolver.applyDamage(player, entity, {
        pveDamage: 26,
        pvpDamage: 13,
        isFireDamage: true,
        cause: "entityAttack"
      });
      StatusEffectManager.applyStatus(entity, "burning", 80, 1, player);
      Utils.playSound(player, "random.explode", 1.5, 1);
    }
    const maxDraw = Math.max(1, hitDist);
    for (let d = 0.5; d < maxDraw; d += 0.8) {
      try {
        dim.spawnParticle("minecraft:flame_particle", {
          x: headLoc.x + viewDir.x * d,
          y: headLoc.y + viewDir.y * d,
          z: headLoc.z + viewDir.z * d
        });
      } catch {
      }
    }
    if (hitLoc) {
      try {
        dim.spawnParticle("minecraft:large_explosion", hitLoc);
        dim.spawnParticle("minecraft:flame_particle", hitLoc);
      } catch {
      }
    }
    Utils.actionbar(player, "\xA7c\u{1F531} [\u706B\u7130\u957F\u67AA] \u70C8\u7130\u957F\u77DB\u8D2F\u7A7F\u7834\u7A7A\uFF01");
  }
  /**
   * 副技能：【焰潮领域 (Flame Tide)】 (潜行右键)
   */
  static triggerFlameTide(player, lotmManager) {
    if (!lotmManager.modifySpirituality(player, -75)) return;
    const dim = player.dimension;
    const headLoc = player.getHeadLocation();
    const viewDir = player.getViewDirection();
    const centerLoc = {
      x: headLoc.x + viewDir.x * 8,
      y: player.location.y,
      z: headLoc.z + viewDir.z * 8
    };
    Utils.playSound(player, "mob.ghast.fireball", 1.2, 1);
    Utils.playSound(player, "fire.ignite", 1.5, 1);
    lotmManager.addDigestion(player, 3);
    let elapsedTicks = 0;
    const maxTicks = 100;
    const intervalId = system8.runInterval(() => {
      elapsedTicks += 10;
      if (elapsedTicks > maxTicks || !Utils.isValid(player)) {
        system8.clearRun(intervalId);
        return;
      }
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
        try {
          dim.spawnParticle("minecraft:flame_particle", {
            x: centerLoc.x + Math.cos(angle) * 4.5,
            y: centerLoc.y + 0.3,
            z: centerLoc.z + Math.sin(angle) * 4.5
          });
        } catch {
        }
      }
      const targets = TargetingService.getAreaTargets(player, centerLoc, 4.5, 8);
      for (const target of targets) {
        DamageResolver.applyDamage(player, target, {
          pveDamage: elapsedTicks === 10 ? 16 : 3,
          pvpDamage: elapsedTicks === 10 ? 8 : 1,
          isFireDamage: true,
          cause: "fire"
        });
        StatusEffectManager.applyStatus(target, "burning", 60, 1, player);
      }
    }, 10);
    Utils.actionbar(player, "\xA7c\u{1F30B} [\u7130\u6F6E\u9886\u57DF] 4.5\u683C\u70C8\u7130\u706B\u573A\u7206\u53D1\uFF01");
  }
  /**
   * 消耗品：【炼金燃烧瓶 (Alchemical Molotov)】
   */
  static throwMolotov(player, lotmManager) {
    if (Utils.countItem(player, "lotm:alchemical_molotov") <= 0) {
      Utils.tell(player, "\xA7c\u80CC\u5305\u4E2D\u6CA1\u6709\u3010\u70BC\u91D1\u71C3\u70E7\u74F6\u3011\uFF01");
      Utils.sound.fail(player);
      return;
    }
    if (!lotmManager.modifySpirituality(player, -25)) return;
    Utils.removeItem(player, "lotm:alchemical_molotov", 1);
    const dim = player.dimension;
    const headLoc = player.getHeadLocation();
    const viewDir = player.getViewDirection();
    const maxDist = 20;
    Utils.playSound(player, "random.bow", 1.5, 1);
    lotmManager.addDigestion(player, 2);
    const { hitLoc } = TargetingService.getRayTarget(player, maxDist);
    const center = hitLoc || {
      x: headLoc.x + viewDir.x * 12,
      y: player.location.y,
      z: headLoc.z + viewDir.z * 12
    };
    Utils.playSound(player, "random.glass", 1.2, 1);
    Utils.playSound(player, "fire.ignite", 1.5, 1);
    try {
      dim.spawnParticle("minecraft:large_explosion", center);
      dim.spawnParticle("minecraft:flame_particle", center);
    } catch {
    }
    const targets = TargetingService.getAreaTargets(player, center, 3, 8);
    for (const t of targets) {
      DamageResolver.applyDamage(player, t, {
        pveDamage: 12,
        pvpDamage: 6,
        isFireDamage: true
      });
      StatusEffectManager.applyStatus(t, "burning", 80, 1, player);
    }
    Utils.actionbar(player, "\xA7c\u{1F525} [\u70BC\u91D1\u71C3\u70E7\u74F6] \u7206\u88C2\u706B\u6CB9\u5F15\u71C3\u5927\u7247\u533A\u57DF\uFF01");
  }
};

// scripts/modules/pathway_darkness.js
import { world as world12, system as system9 } from "@minecraft/server";
var PathwayDarkness = class {
  /**
   * 主技能：【强制入梦 (Force Sleep)】 (普通右键)
   */
  static forceSleep(player, lotmManager) {
    if (!lotmManager.modifySpirituality(player, -45)) return;
    const dim = player.dimension;
    Utils.playSound(player, "beacon.power", 1.8, 0.9);
    Utils.playSound(player, "mob.endermen.portal", 1.2, 1);
    lotmManager.addDigestion(player, 2);
    const { entity, hitLoc } = TargetingService.getRayTarget(player, 18);
    if (entity) {
      const isPvP = entity.typeId === "minecraft:player";
      if (isPvP) {
        StatusEffectManager.applyStatus(entity, "drowsy", 30, 1, player);
        Utils.tell(entity, "\xA79\u{1F441}\uFE0F [\u68A6\u9B47\u4FB5\u88AD] \u6000\u8868\u6EF4\u7B54\u4F5C\u54CD\uFF0C\u4F60\u9677\u5165\u4E86\u5F3A\u70C8\u7684\u56F0\u5026\u4E0E\u8FDF\u6EDE\uFF01");
      } else {
        StatusEffectManager.applyStatus(entity, "sleep", 120, 1, player);
      }
      Utils.playSound(entity, "random.orb", 1.2, 1);
      try {
        dim.spawnParticle("minecraft:crit", entity.location);
      } catch {
      }
    }
    Utils.actionbar(player, "\xA79\u{1F441}\uFE0F [\u5F3A\u5236\u5165\u68A6] \u6000\u8868\u6307\u9488\u5FAE\u8F6C\uFF0C\u76EE\u6807\u610F\u5FD7\u9677\u5165\u6C89\u7720\uFF01");
  }
  /**
   * 副技能：【梦魇领域 (Nightmare Domain)】 (潜行右键)
   */
  static triggerNightmareDomain(player, lotmManager) {
    if (!lotmManager.modifySpirituality(player, -80)) return;
    const dim = player.dimension;
    const pLoc = player.location;
    Utils.playSound(player, "mob.endermen.portal", 1, 1);
    Utils.playSound(player, "beacon.deactivate", 1.5, 0.8);
    lotmManager.addDigestion(player, 3);
    let elapsedTicks = 0;
    const maxTicks = 120;
    const intervalId = system9.runInterval(() => {
      elapsedTicks += 10;
      if (elapsedTicks > maxTicks || !Utils.isValid(player)) {
        system9.clearRun(intervalId);
        return;
      }
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
        try {
          dim.spawnParticle("minecraft:crit", {
            x: player.location.x + Math.cos(a) * 6,
            y: player.location.y + 0.2,
            z: player.location.z + Math.sin(a) * 6
          });
        } catch {
        }
      }
      const targets = TargetingService.getAreaTargets(player, player.location, 6, 8);
      for (const t of targets) {
        const isPvP = t.typeId === "minecraft:player";
        if (isPvP) {
          StatusEffectManager.applyStatus(t, "drowsy", 20, 1, player);
        } else {
          StatusEffectManager.applyStatus(t, "sleep", 80, 1, player);
        }
      }
    }, 10);
    Utils.actionbar(player, "\xA79\u{1F30C} [\u68A6\u9B47\u9886\u57DF] \u65B9\u57066\u683C\u5316\u4F5C\u591C\u4E4B\u5E7B\u68A6\uFF01");
  }
  /**
   * 消耗品：【梦境粉尘 (Dream Dust)】
   */
  static throwDreamDust(player, lotmManager) {
    if (Utils.countItem(player, "lotm:dream_dust") <= 0) {
      Utils.tell(player, "\xA7c\u80CC\u5305\u4E2D\u6CA1\u6709\u3010\u68A6\u5883\u7C89\u5C18\u3011\uFF01");
      Utils.sound.fail(player);
      return;
    }
    if (!lotmManager.modifySpirituality(player, -20)) return;
    Utils.removeItem(player, "lotm:dream_dust", 1);
    const dim = player.dimension;
    const headLoc = player.getHeadLocation();
    const viewDir = player.getViewDirection();
    Utils.playSound(player, "random.pop", 1.5, 1);
    lotmManager.addDigestion(player, 1);
    const { hitLoc } = TargetingService.getRayTarget(player, 16);
    const center = hitLoc || {
      x: headLoc.x + viewDir.x * 10,
      y: player.location.y,
      z: headLoc.z + viewDir.z * 10
    };
    const targets = TargetingService.getAreaTargets(player, center, 3, 8);
    for (const t of targets) {
      StatusEffectManager.applyStatus(t, "drowsy", 80, 1, player);
    }
    Utils.actionbar(player, "\xA79\u2728 [\u68A6\u5883\u7C89\u5C18] \u8367\u5149\u96FE\u972D\u6563\u843D\uFF0C\u654C\u7FA4\u610F\u5FD7\u6DA3\u6563\uFF01");
  }
};

// scripts/modules/pathway_sun.js
import { world as world13, system as system10 } from "@minecraft/server";
var PathwaySun = class {
  /**
   * 主技能：【神圣之光 (Holy Light)】 (普通右键)
   */
  static castHolyLight(player, lotmManager) {
    const { entity } = TargetingService.getRayTarget(player, 24);
    if (!lotmManager.modifySpirituality(player, -35)) return;
    const dim = player.dimension;
    const headLoc = player.getHeadLocation();
    const viewDir = player.getViewDirection();
    Utils.playSound(player, "beacon.activate", 1.8, 1);
    lotmManager.addDigestion(player, 2);
    for (let d = 0.5; d < 24; d += 0.8) {
      try {
        dim.spawnParticle("minecraft:crit", {
          x: headLoc.x + viewDir.x * d,
          y: headLoc.y + viewDir.y * d,
          z: headLoc.z + viewDir.z * d
        });
      } catch {
      }
    }
    if (entity) {
      const isAlly = entity.typeId === "minecraft:player" && entity.id !== player.id;
      if (isAlly) {
        try {
          const hpComp = entity.getComponent("health");
          if (hpComp) {
            hpComp.setCurrentValue(Math.min(hpComp.effectiveMax, hpComp.currentValue + 6));
          }
        } catch {
        }
        StatusEffectManager.removeStatus(entity, "drowsy");
        StatusEffectManager.removeStatus(entity, "fear");
        StatusEffectManager.removeStatus(entity, "burning");
        Utils.playSound(entity, "random.levelup", 1.5, 1);
        Utils.tell(entity, "\xA7e\u2600\uFE0F [\u592A\u9633\u51C0\u5316] \u7EAF\u51C0\u5723\u5149\u7B3C\u7F69\uFF0C\u6062\u590D 6 HP \u5E76\u51C0\u5316\u8D1F\u9762\u7CBE\u795E\u72B6\u6001\uFF01");
      } else {
        DamageResolver.applyDamage(player, entity, {
          pveDamage: 34,
          pvpDamage: 16,
          isUndeadBonus: true,
          cause: "magic"
        });
        Utils.playSound(player, "random.explode", 1.5, 1);
      }
    }
    Utils.actionbar(player, "\xA7e\u2600\uFE0F [\u795E\u5723\u4E4B\u5149] \u70BD\u70C8\u5723\u5149\u964D\u4E34\uFF01");
  }
  /**
   * 副技能：【太阳光环 (Sun Halo)】 (潜行右键)
   */
  static triggerSunHalo(player, lotmManager) {
    if (!lotmManager.modifySpirituality(player, -70)) return;
    const dim = player.dimension;
    Utils.playSound(player, "beacon.power", 1.2, 1);
    lotmManager.addDigestion(player, 3);
    let elapsed = 0;
    const maxTicks = 160;
    const intervalId = system10.runInterval(() => {
      elapsed += 20;
      if (elapsed > maxTicks || !Utils.isValid(player)) {
        system10.clearRun(intervalId);
        return;
      }
      const pLoc = player.location;
      const entities = TargetingService.getAreaTargets(player, pLoc, 6, 8);
      for (const ent of entities) {
        if (ent.typeId === "minecraft:player") {
          try {
            const hpComp = ent.getComponent("health");
            if (hpComp) {
              hpComp.setCurrentValue(Math.min(hpComp.effectiveMax, hpComp.currentValue + 2));
            }
          } catch {
          }
        } else {
          DamageResolver.applyDamage(player, ent, {
            pveDamage: 4,
            pvpDamage: 2,
            isUndeadBonus: true
          });
        }
      }
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        try {
          dim.spawnParticle("minecraft:crit", {
            x: pLoc.x + Math.cos(a) * 6,
            y: pLoc.y + 0.2,
            z: pLoc.z + Math.sin(a) * 6
          });
        } catch {
        }
      }
    }, 20);
    Utils.actionbar(player, "\xA7e\u{1F31F} [\u592A\u9633\u5149\u73AF] \u9A71\u90AA\u5149\u73AF\u5C55\u5F00\uFF0C\u5B88\u62A4\u8EAB\u4FA7\uFF01");
  }
  /**
   * 消耗品：【圣水瓶 (Holy Water Bottle)】
   */
  static throwHolyWater(player, lotmManager) {
    if (Utils.countItem(player, "lotm:holy_water_bottle") <= 0) {
      Utils.tell(player, "\xA7c\u80CC\u5305\u4E2D\u6CA1\u6709\u3010\u5723\u6C34\u74F6\u3011\uFF01");
      Utils.sound.fail(player);
      return;
    }
    if (!lotmManager.modifySpirituality(player, -20)) return;
    Utils.removeItem(player, "lotm:holy_water_bottle", 1);
    const dim = player.dimension;
    const headLoc = player.getHeadLocation();
    const viewDir = player.getViewDirection();
    Utils.playSound(player, "random.glass", 1.2, 1);
    lotmManager.addDigestion(player, 1);
    const { hitLoc } = TargetingService.getRayTarget(player, 18);
    const center = hitLoc || {
      x: headLoc.x + viewDir.x * 10,
      y: player.location.y,
      z: headLoc.z + viewDir.z * 10
    };
    const targets = TargetingService.getAreaTargets(player, center, 3, 8);
    for (const t of targets) {
      if (t.typeId === "minecraft:player") {
        StatusEffectManager.removeStatus(t, "burning");
      } else {
        DamageResolver.applyDamage(player, t, {
          pveDamage: 20,
          pvpDamage: 10,
          isUndeadBonus: true
        });
      }
    }
    Utils.actionbar(player, "\xA7e\u{1F4A7} [\u5723\u6C34\u74F6] \u5723\u6D01\u96E8\u9732\u6D12\u843D\uFF0C\u9A71\u6563\u6C61\u79FD\u4E0E\u706B\u707E\uFF01");
  }
};

// scripts/modules/pathway_moon.js
import { world as world14, system as system11 } from "@minecraft/server";
var PathwayMoon = class {
  /**
   * 血渴资源读写 (PRD 5.5: 0-100 长期资源)
   */
  static getBloodThirst(player) {
    return Utils.getProp(player, "lotm:bloodThirst", 0);
  }
  static modifyBloodThirst(player, amount) {
    const cur = this.getBloodThirst(player);
    const next = Math.min(100, Math.max(0, cur + amount));
    Utils.setProp(player, "lotm:bloodThirst", next);
    return next;
  }
  /**
   * 吸血鬼血渴心跳处理 (每秒/每2秒检测)
   */
  static handleThirstTick(player) {
    const thirst = this.getBloodThirst(player);
    if (thirst >= 100) {
      try {
        const hp = player.getComponent("health");
        if (hp && hp.currentValue > 1) {
          hp.setCurrentValue(hp.currentValue - 1);
          Utils.actionbar(player, "\xA74\u{1FA78} [\u6781\u7AEF\u8840\u6E34] \u5589\u5499\u5E72\u6E34\u5982\u711A\uFF01\u751F\u547D\u503C\u6B63\u5728\u6D41\u5931\uFF01\u8BF7\u5C3D\u5FEB\u996E\u8840\uFF01");
        }
      } catch {
      }
    }
  }
  /**
   * 主技能：【腐蚀之爪 (Corrosive Claws)】 (普通右键)
   */
  static corrosiveClaws(player, lotmManager) {
    const { entity } = TargetingService.getRayTarget(player, 8);
    if (!entity) {
      Utils.actionbar(player, "\xA7c[\u8150\u8680\u4E4B\u722A] 8\u683C\u5916\u65E0\u6709\u6548\u76EE\u6807\uFF01");
      return;
    }
    const thirst = this.getBloodThirst(player);
    const extraCost = thirst >= 80 ? 40 : 35;
    if (!lotmManager.modifySpirituality(player, -extraCost)) return;
    const dim = player.dimension;
    Utils.playSound(player, "mob.wither.shoot", 1.8, 1);
    lotmManager.addDigestion(player, 2);
    const eLoc = entity.location;
    const dashLoc = {
      x: eLoc.x + (player.location.x - eLoc.x) * 0.3,
      y: eLoc.y,
      z: eLoc.z + (player.location.z - eLoc.z) * 0.3
    };
    try {
      player.teleport(dashLoc, { dimension: dim });
    } catch {
    }
    const dealt = DamageResolver.applyDamage(player, entity, {
      pveDamage: 24,
      pvpDamage: 12,
      armorPierceRatio: 0.15
    });
    StatusEffectManager.applyStatus(entity, "armor_break", 100, 0.15, player);
    const heal = Math.min(6, Math.max(1, Math.round(dealt * 0.25)));
    try {
      const hp = player.getComponent("health");
      if (hp) hp.setCurrentValue(Math.min(hp.effectiveMax, hp.currentValue + heal));
    } catch {
    }
    this.modifyBloodThirst(player, -15);
    Utils.playSound(player, "random.break", 1.8, 1);
    Utils.actionbar(player, `\xA74\u{1FA78} [\u8150\u8680\u4E4B\u722A] \u6697\u7EA2\u722A\u5149\u6495\u88C2\uFF0C\u6C72\u53D6\u4E86 ${heal} HP (\u8840\u6E34-15)\uFF01`);
  }
  /**
   * 副技能：【黑暗之翼 (Dark Wings)】 (潜行右键)
   */
  static triggerDarkWings(player, lotmManager) {
    if (!lotmManager.modifySpirituality(player, -70)) return;
    const dim = player.dimension;
    Utils.playSound(player, "mob.bat.takeoff", 1.2, 1);
    Utils.playSound(player, "mob.enderdragon.flap", 1.5, 0.8);
    lotmManager.addDigestion(player, 3);
    try {
      player.addEffect("speed", 120, { amplifier: 3, showParticles: false });
      player.addEffect("slow_falling", 120, { amplifier: 0, showParticles: false });
      player.addEffect("jump_boost", 120, { amplifier: 2, showParticles: false });
    } catch {
    }
    try {
      dim.spawnParticle("minecraft:crit", player.location);
    } catch {
    }
    Utils.actionbar(player, "\xA74\u{1F987} [\u9ED1\u6697\u4E4B\u7FFC] \u8840\u8760\u5E7B\u7FFC\u5C55\u5F00\uFF0C\u83B7\u5F97 6 \u79D2\u6781\u901F\u4E0E\u8F7B\u76C8\u51B2\u523A\uFF01");
  }
  /**
   * 消耗品：【密封血液瓶 (Sealed Blood Bottle)】
   */
  static drinkBloodBottle(player, lotmManager) {
    if (Utils.countItem(player, "lotm:sealed_blood_bottle") <= 0) {
      Utils.tell(player, "\xA7c\u80CC\u5305\u4E2D\u6CA1\u6709\u3010\u5BC6\u5C01\u8840\u6DB2\u74F6\u3011\uFF01");
      Utils.sound.fail(player);
      return;
    }
    Utils.removeItem(player, "lotm:sealed_blood_bottle", 1);
    Utils.playSound(player, "random.drink", 1.2, 1);
    lotmManager.addDigestion(player, 1);
    lotmManager.modifySpirituality(player, 80);
    this.modifyBloodThirst(player, -25);
    try {
      const hp = player.getComponent("health");
      if (hp) hp.setCurrentValue(Math.min(hp.effectiveMax, hp.currentValue + 8));
    } catch {
    }
    Utils.tell(player, "\xA74\u{1FA78} [\u996E\u7528\u8840\u74F6] \u9C9C\u6D3B\u8840\u6DB2\u6D78\u6DA6\u54BD\u5589\uFF0C\u6062\u590D 8 HP \u4E0E 80 \u7075\u6027 (\u8840\u6E34-25)\uFF01");
  }
};

// scripts/modules/pathway_assassin.js
import { world as world15, system as system12 } from "@minecraft/server";
var PathwayAssassin = class {
  /**
   * 主技能：【黑焰 (Black Flame)】 (普通右键)
   */
  static castBlackFlame(player, lotmManager) {
    if (!lotmManager.modifySpirituality(player, -35)) return;
    const dim = player.dimension;
    const headLoc = player.getHeadLocation();
    const viewDir = player.getViewDirection();
    const maxDist = 24;
    Utils.playSound(player, "fire.ignite", 1.8, 0.7);
    Utils.playSound(player, "mob.wither.shoot", 1.2, 1);
    lotmManager.addDigestion(player, 2);
    const { entity, hitDist, hitLoc } = TargetingService.getRayTarget(player, maxDist);
    if (entity) {
      DamageResolver.applyDamage(player, entity, {
        pveDamage: 22,
        pvpDamage: 11,
        isFireDamage: true,
        cause: "magic"
      });
      StatusEffectManager.applyStatus(entity, "heal_block", 100, 0.4, player);
      StatusEffectManager.applyStatus(entity, "burning", 100, 1, player);
      Utils.playSound(entity, "random.break", 1.8, 1);
    }
    const maxDraw = Math.max(1, hitDist);
    for (let d = 0.5; d < maxDraw; d += 0.7) {
      try {
        dim.spawnParticle("minecraft:smoke_particle", {
          x: headLoc.x + viewDir.x * d,
          y: headLoc.y + viewDir.y * d,
          z: headLoc.z + viewDir.z * d
        });
      } catch {
      }
    }
    if (hitLoc) {
      try {
        dim.spawnParticle("minecraft:large_explosion", hitLoc);
      } catch {
      }
    }
    Utils.actionbar(player, "\xA7d\u{1F5A4} [\u9ED1\u7130] \u9634\u51B7\u5E7D\u9083\u9ED1\u7130\u8F70\u51FB\uFF0C\u7981\u9522\u76EE\u6807\u751F\u673A\uFF01");
  }
  /**
   * 副技能：【镜面替身 (Mirror Substitute)】 (潜行右键)
   */
  static performMirrorSubstitute(player, lotmManager) {
    if (!lotmManager.modifySpirituality(player, -65)) return;
    const dim = player.dimension;
    const oldLoc = { ...player.location };
    const safeLoc = TargetingService.getSafeLandingLocation(player, 7);
    Utils.playSound(player, "random.glass", 1.5, 1);
    Utils.playSound(player, "mob.endermen.portal", 1.8, 1);
    lotmManager.addDigestion(player, 3);
    try {
      dim.spawnParticle("minecraft:smoke_particle", oldLoc);
      dim.spawnParticle("minecraft:crit", oldLoc);
    } catch {
    }
    try {
      player.teleport(safeLoc, { dimension: dim });
      player.addEffect("invisibility", 60, { amplifier: 0, showParticles: false });
      player.addEffect("speed", 60, { amplifier: 1, showParticles: false });
    } catch {
    }
    Utils.actionbar(player, "\xA7d\u{1FA9E} [\u955C\u9762\u66FF\u8EAB] \u955C\u5149\u788E\u88C2\uFF0C\u8FDB\u5165 3 \u79D2\u5B8C\u5168\u9690\u5F62\uFF01");
  }
  /**
   * 消耗品：【诅咒娃娃 (Curse Doll)】
   */
  static useCurseDoll(player, lotmManager) {
    if (Utils.countItem(player, "lotm:curse_doll") <= 0) {
      Utils.tell(player, "\xA7c\u80CC\u5305\u4E2D\u6CA1\u6709\u3010\u8BC5\u5492\u5A03\u5A03\u3011\uFF01");
      Utils.sound.fail(player);
      return;
    }
    const { entity } = TargetingService.getRayTarget(player, 16);
    if (!entity) {
      Utils.tell(player, "\xA7c\u51C6\u661F\u672A\u9501\u5B9A 16 \u683C\u5185\u76EE\u6807\uFF0C\u65E0\u6CD5\u65BD\u52A0\u5A03\u5A03\u8BC5\u5492\uFF01");
      return;
    }
    if (!lotmManager.modifySpirituality(player, -50)) return;
    Utils.removeItem(player, "lotm:curse_doll", 1);
    Utils.playSound(player, "mob.witch.throw", 1.5, 1);
    Utils.playSound(player, "mob.witch.ambient", 1.2, 0.9);
    lotmManager.addDigestion(player, 2);
    StatusEffectManager.applyStatus(entity, "armor_break", 160, 0.2, player);
    StatusEffectManager.applyStatus(entity, "drowsy", 160, 1, player);
    Utils.tell(player, "\xA7d\u{1FAA1} [\u8BC5\u5492\u5A03\u5A03] \u9488\u624E\u8840\u5076\uFF0C\u76EE\u6807\u53D7\u5230\u6C89\u91CD\u8BC5\u5492\u4E0E\u865A\u5F31\uFF01");
  }
};

// scripts/modules/lotm_ability_router.js
var AbilityRouter = class {
  /**
   * 统一分发右键使用事件
   * @param {import("@minecraft/server").Player} player 
   * @param {import("@minecraft/server").ItemStack} item 
   * @param {object} lotmManager 
   * @returns {boolean} 是否被非凡能力消费拦截
   */
  static routeItemUse(player, item, lotmManager) {
    if (!item || !item.typeId) return false;
    const itemId = item.typeId;
    const isSneaking = player.isSneaking;
    const pathway = lotmManager.getPathway(player);
    if (ArtifactManager.isArtifact(itemId)) {
      ArtifactManager.handleArtifactUse(player, itemId, isSneaking, lotmManager);
      return true;
    }
    const isSeerFocus = itemId === "lotm:spirit_cane";
    const isHunterFocus = itemId === "lotm:pyro_gauntlet";
    const isWarriorFocus = itemId === "lotm:tactical_sword" || itemId === "lotm:tactical_axe" || itemId === "lotm:tactical_spear" || itemId === "lotm:tactical_bow";
    const isDarknessFocus = itemId === "lotm:nightmare_watch";
    const isSunFocus = itemId === "lotm:sun_emblem";
    const isMoonFocus = itemId === "lotm:vampire_ring";
    const isAssassinFocus = itemId === "lotm:witch_mirror_wand";
    if (isSeerFocus || isHunterFocus || isWarriorFocus || isDarknessFocus || isSunFocus || isMoonFocus || isAssassinFocus) {
      if (pathway === "seer" && isSeerFocus) {
        if (isSneaking) PathwaySeer.performFlameJump(player, lotmManager);
        else PathwaySeer.fireAirBullet(player, lotmManager);
        return true;
      } else if (pathway === "hunter" && isHunterFocus) {
        if (isSneaking) PathwayHunter.triggerFlameTide(player, lotmManager);
        else PathwayHunter.fireFlameSpear(player, lotmManager);
        return true;
      } else if (pathway === "warrior" && isWarriorFocus) {
        PathwayWarrior.executeWeaponSkill(player, itemId, isSneaking, lotmManager);
        return true;
      } else if (pathway === "darkness" && isDarknessFocus) {
        if (isSneaking) PathwayDarkness.triggerNightmareDomain(player, lotmManager);
        else PathwayDarkness.forceSleep(player, lotmManager);
        return true;
      } else if (pathway === "sun" && isSunFocus) {
        if (isSneaking) PathwaySun.triggerSunHalo(player, lotmManager);
        else PathwaySun.castHolyLight(player, lotmManager);
        return true;
      } else if (pathway === "moon" && isMoonFocus) {
        if (isSneaking) PathwayMoon.triggerDarkWings(player, lotmManager);
        else PathwayMoon.corrosiveClaws(player, lotmManager);
        return true;
      } else if (pathway === "assassin" && isAssassinFocus) {
        if (isSneaking) PathwayAssassin.performMirrorSubstitute(player, lotmManager);
        else PathwayAssassin.castBlackFlame(player, lotmManager);
        return true;
      } else {
        const currentProfile = PathwayProfileRegistry.getProfile(pathway);
        Utils.tell(player, `\xA7c\xA7l[\u975E\u51E1\u6392\u65A5] \xA77\u4F60\u5F53\u524D\u4E3A \xA7e${currentProfile.title || currentProfile.name}\xA77\uFF0C\u65E0\u6CD5\u50AC\u52A8\u5F02\u9014\u5F84\u4E13\u5C5E\u5A92\u4ECB\uFF01`);
        Utils.sound.warn(player);
        return true;
      }
    }
    switch (itemId) {
      case "lotm:tarot_card":
        if (pathway !== "seer") {
          Utils.tell(player, "\xA7c\xA7l[\u975E\u51E1\u6392\u65A5] \xA77\u4EC5\u3010\u5360\u535C\u5BB6/\u9B54\u672F\u5E08\u3011\u7CBE\u901A\u9B54\u672F\u7EB8\u724C\u98DE\u63B7\u79D8\u672F\uFF01");
          Utils.sound.warn(player);
          return true;
        }
        PathwaySeer.throwTarotCard(player, lotmManager);
        return true;
      case "lotm:paper_figurine":
        if (pathway !== "seer") {
          Utils.tell(player, "\xA7c\xA7l[\u975E\u51E1\u6392\u65A5] \xA77\u4EC5\u3010\u5360\u535C\u5BB6/\u9B54\u672F\u5E08\u3011\u53EF\u9A71\u52A8\u7EB8\u4EBA\u66FF\u8EAB\uFF01");
          Utils.sound.warn(player);
          return true;
        }
        PathwaySeer.triggerPaperSubstitute(player, lotmManager);
        return true;
      case "lotm:alchemical_molotov":
        PathwayHunter.throwMolotov(player, lotmManager);
        return true;
      case "lotm:blade_oil":
        if (pathway !== "warrior") {
          Utils.tell(player, "\xA7c\xA7l[\u975E\u51E1\u6392\u65A5] \xA77\u4EC5\u3010\u6218\u58EB/\u6B66\u5668\u5927\u5E08\u3011\u7CBE\u901A\u78E8\u5203\u6CB9\u9644\u9B54\u79D8\u672F\uFF01");
          Utils.sound.warn(player);
          return true;
        }
        PathwayWarrior.applyBladeOil(player, lotmManager);
        return true;
      case "lotm:dream_dust":
        if (pathway !== "darkness") {
          Utils.tell(player, "\xA7c\xA7l[\u975E\u51E1\u6392\u65A5] \xA77\u4EC5\u3010\u4E0D\u7720\u8005/\u68A6\u9B47\u3011\u53EF\u5F15\u5BFC\u5B89\u9B42\u68A6\u5883\u7C89\u5C18\uFF01");
          Utils.sound.warn(player);
          return true;
        }
        PathwayDarkness.throwDreamDust(player, lotmManager);
        return true;
      case "lotm:holy_water_bottle":
        if (pathway !== "sun") {
          Utils.tell(player, "\xA7c\xA7l[\u975E\u51E1\u6392\u65A5] \xA77\u4EC5\u3010\u6B4C\u9882\u8005/\u592A\u9633\u795E\u5B98\u3011\u53EF\u6FC0\u6D3B\u7EAF\u767D\u5723\u6C34\uFF01");
          Utils.sound.warn(player);
          return true;
        }
        PathwaySun.throwHolyWater(player, lotmManager);
        return true;
      case "lotm:sealed_blood_bottle":
        if (pathway !== "moon") {
          Utils.tell(player, "\xA7c\xA7l[\u975E\u51E1\u6392\u65A5] \xA77\u4EC5\u3010\u836F\u5E08/\u5438\u8840\u9B3C\u3011\u53EF\u5438\u6536\u5BC6\u5C01\u8840\u6DB2\u7CBE\u534E\uFF01");
          Utils.sound.warn(player);
          return true;
        }
        PathwayMoon.drinkBloodBottle(player, lotmManager);
        return true;
      case "lotm:curse_doll":
        if (pathway !== "assassin") {
          Utils.tell(player, "\xA7c\xA7l[\u975E\u51E1\u6392\u65A5] \xA77\u4EC5\u3010\u523A\u5BA2/\u5973\u5DEB\u3011\u53EF\u65BD\u5C55\u8BC5\u5492\u8349\u4EBA\u79D8\u672F\uFF01");
          Utils.sound.warn(player);
          return true;
        }
        PathwayAssassin.useCurseDoll(player, lotmManager);
        return true;
    }
    return false;
  }
};

// scripts/modules/lotm.js
var LotmManager = class {
  static playerInCombat = /* @__PURE__ */ new Map();
  // playerId -> lastCombatTick
  // 静态挂载子系统以便外界统一调用
  static PathwayProfileRegistry = PathwayProfileRegistry;
  static StatusEffectManager = StatusEffectManager;
  static DamageResolver = DamageResolver;
  static TargetingService = TargetingService;
  static ArtifactManager = ArtifactManager;
  static PathwaySeer = PathwaySeer;
  static PathwayHunter = PathwayHunter;
  static PathwayWarrior = PathwayWarrior;
  static PathwayDarkness = PathwayDarkness;
  static PathwaySun = PathwaySun;
  static PathwayMoon = PathwayMoon;
  static PathwayAssassin = PathwayAssassin;
  /**
   * 系统初始化
   */
  static init() {
    console.warn("[LOTM] Initializing Multi-Pathway Sequence 7 & Artifact Engine (PRD v1.0)...");
    system13.runInterval(() => {
      StatusEffectManager.onTick();
    }, 5);
    system13.runInterval(() => {
      const players = world16.getAllPlayers();
      for (const player of players) {
        try {
          this.onPlayerTick(player);
        } catch {
        }
      }
    }, 20);
    system13.runInterval(() => {
      const players = world16.getAllPlayers();
      for (const player of players) {
        try {
          this.applyPassiveBuffs(player);
        } catch {
        }
      }
    }, 100);
    console.warn("[LOTM] Multi-Pathway Engine initialized successfully!");
  }
  /**
   * 空手发射空气弹快捷门面
   */
  static fireAirBullet(player) {
    PathwaySeer.fireAirBullet(player, this);
  }
  /**
   * 致命伤害触发纸人替身快捷门面
   */
  static triggerFatalSubstitute(player) {
    PathwaySeer.triggerPaperSubstitute(player, this);
  }
  /**
   * 攻击命中被动触发快捷门面
   */
  static handleAttackHit(attacker, target) {
    ArtifactManager.handleAttackHit(attacker, target);
  }
  // ==========================================
  // 玩家数据读写 (Dynamic Properties)
  // ==========================================
  static getPathway(player) {
    let pathway = Utils.getProp(player, "lotm:pathway", "none");
    if (pathway === "none") {
      const seq = Utils.getProp(player, "lotm:sequence", 0);
      if (seq === 7 || seq === 8 || seq === 9) {
        pathway = "seer";
        Utils.setProp(player, "lotm:pathway", "seer");
      }
    }
    return pathway;
  }
  static setPathway(player, pathwayId) {
    Utils.setProp(player, "lotm:pathway", pathwayId);
    const profile = PathwayProfileRegistry.getProfile(pathwayId);
    Utils.setProp(player, "lotm:sequence", profile.sequence);
    Utils.setProp(player, "lotm:sp", profile.maxSpirituality);
    Utils.setProp(player, "lotm:digestion", 100);
    this.applyHealthProfile(player);
  }
  static setSequence(player, seq) {
    Utils.setProp(player, "lotm:sequence", seq);
    if (seq === 0) {
      Utils.setProp(player, "lotm:pathway", "none");
      Utils.setProp(player, "lotm:sp", 0);
      Utils.setProp(player, "lotm:digestion", 0);
    } else if (seq === 7 || seq === 8 || seq === 9) {
      Utils.setProp(player, "lotm:pathway", "seer");
      const spMap = { 7: 500, 8: 260, 9: 120 };
      Utils.setProp(player, "lotm:sp", spMap[seq] || 500);
      Utils.setProp(player, "lotm:digestion", 100);
    }
    this.applyHealthProfile(player);
  }
  static getSequence(player) {
    return Utils.getProp(player, "lotm:sequence", 0);
  }
  static getSpirituality(player) {
    return Utils.getProp(player, "lotm:sp", 0);
  }
  static getMaxSpirituality(player) {
    const pathway = this.getPathway(player);
    const profile = PathwayProfileRegistry.getProfile(pathway);
    return profile.maxSpirituality || 0;
  }
  static modifySpirituality(player, amount) {
    const max = this.getMaxSpirituality(player);
    if (max <= 0) return false;
    const current = this.getSpirituality(player);
    if (amount < 0 && current < Math.abs(amount)) {
      Utils.playSound(player, "random.click", 1.8, 1);
      Utils.actionbar(player, `\xA7c\u2727 \u7075\u6027\u4E0D\u8DB3\uFF01(\u5F53\u524D: ${current} / \u9700: ${Math.abs(amount)})`);
      return false;
    }
    const next = Math.min(max, Math.max(0, current + amount));
    Utils.setProp(player, "lotm:sp", next);
    return true;
  }
  static getDigestion(player) {
    return Utils.getProp(player, "lotm:digestion", 0);
  }
  static addDigestion(player, amount) {
    const cur = this.getDigestion(player);
    if (cur >= 100) return;
    const next = Math.min(100, cur + amount);
    Utils.setProp(player, "lotm:digestion", next);
    if (next === 100) {
      Utils.playSound(player, "random.levelup", 1.5, 1);
      Utils.tell(player, "\xA7a\xA7l[\u9B54\u836F\u6D88\u5316] \xA7e\u4F60\u5DF2\u5B8C\u5168\u6D88\u5316\u5F53\u524D\u5E8F\u5217\u9B54\u836F\uFF01\u8EAB\u5FC3\u4E0E\u975E\u51E1\u529B\u91CF\u5F7B\u5E95\u4EA4\u878D\uFF01");
    }
  }
  // ==========================================
  // 差异化生命体质自适应 (HealthProfileAdapter)
  // ==========================================
  static applyHealthProfile(player) {
    if (!Utils.isValid(player)) return;
    const pathway = this.getPathway(player);
    const profile = PathwayProfileRegistry.getProfile(pathway);
    const maxHP = profile.maxHealth || 20;
    const bonusHP = maxHP - 20;
    try {
      player.removeEffect("health_boost");
      if (bonusHP > 0) {
        const amp = Math.floor(bonusHP / 4) - 1;
        if (amp >= 0) {
          player.addEffect("health_boost", 2e7, { amplifier: amp, showParticles: false });
        }
      }
    } catch {
    }
  }
  // ==========================================
  // 常驻被动与环境增益刷新
  // ==========================================
  static applyPassiveBuffs(player) {
    if (!Utils.isValid(player)) return;
    const pathway = this.getPathway(player);
    try {
      switch (pathway) {
        case "seer":
          player.addEffect("speed", 140, { amplifier: 0, showParticles: false });
          player.addEffect("jump_boost", 140, { amplifier: 0, showParticles: false });
          player.addEffect("water_breathing", 140, { amplifier: 0, showParticles: false });
          player.addEffect("fire_resistance", 140, { amplifier: 0, showParticles: false });
          break;
        case "hunter":
          player.addEffect("fire_resistance", 140, { amplifier: 0, showParticles: false });
          break;
        case "warrior":
          player.addEffect("resistance", 140, { amplifier: 0, showParticles: false });
          break;
        case "darkness":
          player.addEffect("night_vision", 300, { amplifier: 0, showParticles: false });
          break;
        case "sun":
          player.addEffect("regeneration", 140, { amplifier: 0, showParticles: false });
          break;
        case "moon":
          player.addEffect("night_vision", 300, { amplifier: 0, showParticles: false });
          break;
        case "assassin":
          player.addEffect("speed", 140, { amplifier: 1, showParticles: false });
          break;
      }
    } catch {
    }
  }
  // ==========================================
  // 每秒心跳处理与 HUD 渲染
  // ==========================================
  static onPlayerTick(player) {
    if (!Utils.isValid(player)) return;
    const pathway = this.getPathway(player);
    if (pathway === "none") return;
    const profile = PathwayProfileRegistry.getProfile(pathway);
    const maxSP = profile.maxSpirituality || 0;
    const curSP = this.getSpirituality(player);
    const currentTick = system13.currentTick;
    const lastCombat = this.playerInCombat.get(player.id) || 0;
    const isOutOfCombat = currentTick - lastCombat > 120;
    let regen = isOutOfCombat ? profile.regenOutOfCombat || 10 : profile.regenInCombat || 4;
    const timeOfDay = world16.getTimeOfDay();
    const isNight = timeOfDay > 13e3 && timeOfDay < 23e3;
    if (pathway === "moon") {
      regen = isNight ? isOutOfCombat ? 16 : 6 : isOutOfCombat ? 6 : 2;
    } else if (pathway === "darkness" && isNight) {
      regen = Math.round(regen * 1.25);
    } else if (pathway === "sun" && !isNight) {
      regen = Math.round(regen * 1.2);
    }
    if (curSP < maxSP) {
      this.modifySpirituality(player, regen);
    }
    if (pathway === "moon") {
      PathwayMoon.handleThirstTick(player);
    }
    const sp = this.getSpirituality(player);
    const digestion = this.getDigestion(player);
    const seqName = profile.sequenceName || "\u9B54\u672F\u5E08";
    let extraHUD = "";
    if (pathway === "moon") {
      const thirst = PathwayMoon.getBloodThirst(player);
      extraHUD = ` \xA78| \xA74\u8840\u6E34: ${thirst}/100`;
    } else if (pathway === "warrior") {
      const stance = PathwayWarrior.getStance(player);
      const stanceMap = { attack: "\xA7c\u8FDB\u653B", defense: "\xA79\u5B88\u5FA1", ranged: "\xA7a\u8FDC\u5C04", balanced: "\xA7f\u5747\u8861" };
      extraHUD = ` \xA78| \u59FF\u6001: ${stanceMap[stance] || "\xA7f\u5747\u8861"}`;
    }
    Utils.actionbar(
      player,
      `\xA7d\u2727 \u7075\u6027: \xA7f${sp}\xA77/\xA7e${maxSP} \xA78| \xA7b${profile.name} \xB7 \xA76${seqName} \xA78| \xA7a\u6D88\u5316: ${digestion}%${extraHUD}`
    );
  }
  // ==========================================
  // 统一能力路由挂载
  // ==========================================
  static handleItemUse(player, item) {
    return AbilityRouter.routeItemUse(player, item, this);
  }
  // ==========================================
  // 超凡综合菜单 GUI
  // ==========================================
  static openAbilityMenu(player) {
    const pathway = this.getPathway(player);
    const profile = PathwayProfileRegistry.getProfile(pathway);
    const sp = this.getSpirituality(player);
    const digestion = this.getDigestion(player);
    const form = new ActionFormData4().title(`\xA7l\xA75\u{1F52E} \u8BE1\u79D8\u4E4B\u4E3B \xB7 \u8D85\u51E1\u4F53\u7CFB`).body(
      `\xA77\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
\xA7f\u5F53\u524D\u9014\u5F84: \xA76${profile.name} (${profile.sequenceName})
\xA7f\u5F53\u524D\u7075\u6027: \xA7d${sp} \xA77/ \xA7e${profile.maxSpirituality} \u2727
\xA7f\u9B54\u836F\u6D88\u5316: \xA7a${digestion}%
\xA7f\u6700\u5927\u751F\u547D: \xA7c${profile.maxHealth} HP \xA77(${profile.maxHealth / 2} \u9897\u5FC3)
\xA77\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`
    ).button("\xA7l\xA76\u{1F381} \u9886\u53D6\u5F53\u524D\u9014\u5F84\u4E13\u5C5E\u5A92\u4ECB", "textures/items/diamond_sword").button("\xA7l\xA7e\u{1F9EA} \u9014\u5F84\u8F6C\u6362\u4E0E\u664B\u5347\u901A\u9053", "textures/items/potion_bottle_heal");
    if (pathway === "warrior") {
      form.button("\xA7l\xA76\u2694\uFE0F \u5207\u6362\u6218\u672F\u6218\u6597\u59FF\u6001", "textures/items/iron_sword");
    } else if (pathway === "sun") {
      form.button("\xA7l\xA7e\u{1F4A7} \u51DD\u805A\u5236\u4F5C\u3010\u5723\u6C34\u74F6\u3011", "textures/items/gold_ingot");
    } else if (pathway === "hunter") {
      form.button("\xA7l\xA7c\u{1F525} \u8C03\u914D\u3010\u70BC\u91D1\u71C3\u70E7\u74F6\u3011", "textures/items/blaze_powder");
    } else {
      form.button("\xA7l\xA79\u{1F441}\uFE0F \u5F00\u542F\u4EE5\u592A\u7075\u89C6", "textures/items/ender_eye");
    }
    form.button("\xA7l\xA7b\u{1F48E} \u7075\u6446\u5360\u535C\u63A2\u9488", "textures/items/compass_item");
    Utils.showForm(player, form, (res) => {
      switch (res.selection) {
        case 0:
          this.giveFocusKit(player);
          break;
        case 1:
          this.openPathwaySelectMenu(player);
          break;
        case 2:
          if (pathway === "warrior") {
            this.openWarriorStanceMenu(player);
          } else if (pathway === "sun") {
            this.craftHolyWater(player);
          } else if (pathway === "hunter") {
            this.craftMolotov(player);
          } else {
            Utils.tell(player, "\xA79[\u7075\u89C6] \u4EE5\u592A\u4F53\u7075\u6027\u89C6\u91CE\u5DF2\u6FC0\u6D3B\uFF01");
          }
          break;
        case 3:
          Utils.tell(player, "\xA7b[\u7075\u6446] \u7075\u6446\u8F7B\u65CB\uFF0C\u5DF2\u611F\u5E94\u65B9\u5706\u77FF\u8109\u4E0E\u5371\u673A\uFF01");
          break;
      }
    });
  }
  /**
   * 战士姿态选择菜单
   */
  static openWarriorStanceMenu(player) {
    const form = new ActionFormData4().title("\xA7l\xA76\u2694\uFE0F \u6B66\u5668\u5927\u5E08\u6218\u6597\u59FF\u6001").body("\xA77\u8BF7\u9009\u62E9\u4F60\u5E0C\u671B\u6FC0\u6D3B\u7684\u6B66\u5668\u5927\u5E08\u59FF\u6001\uFF1A").button("\xA7l\xA7c\u3010\u8FDB\u653B\u59FF\u6001\u3011\n\xA77\u6B66\u5668\u4F24\u5BB3 +8%\uFF0C\u53D7\u5230\u7684\u4F24\u5BB3 +5%", "textures/items/iron_sword").button("\xA7l\xA79\u3010\u5B88\u5FA1\u59FF\u6001\u3011\n\xA77\u8FD1\u6218\u627F\u4F24 -8%\uFF0C\u79FB\u52A8\u901F\u5EA6 -5%", "textures/items/iron_helmet").button("\xA7l\xA7a\u3010\u8FDC\u5C04\u59FF\u6001\u3011\n\xA77\u5F39\u9053\u6563\u5E03\u5F52\u96F6\uFF0C\u8FD1\u6218\u4F24\u5BB3 -8%", "textures/items/bow_standby").button("\xA7l\xA7f\u3010\u5747\u8861\u59FF\u6001\u3011\n\xA77\u6062\u590D\u6807\u51C6\u6218\u6597\u72B6\u6001", "textures/items/shield");
    Utils.showForm(player, form, (res) => {
      const stances = ["attack", "defense", "ranged", "balanced"];
      const selected = stances[res.selection];
      if (selected) {
        PathwayWarrior.setStance(player, selected);
      }
    });
  }
  /**
   * 太阳神官凝聚圣水
   */
  static craftHolyWater(player) {
    if (!this.modifySpirituality(player, -50)) return;
    Utils.giveItem(player, "lotm:holy_water_bottle", 2, "\xA7l\xA7e\u3010\u975E\u51E1\u6D88\u8017\u54C1\u3011\xA7b\u5723\u6C34\u74F6", ["\xA77\u6295\u63B7\u9A71\u6563\u6C61\u79FD\u4E0E\u706B\u707E"]);
    Utils.playSound(player, "random.levelup", 1.5, 1);
    Utils.tell(player, "\xA7e\u2600\uFE0F [\u7EAF\u767D\u5723\u6C34] \u6D88\u8017 50 \u7075\u6027\u6210\u529F\u51DD\u805A 2 \u74F6\u3010\u5723\u6C34\u74F6\u3011\uFF01");
  }
  /**
   * 纵火家调配炼金燃烧瓶
   */
  static craftMolotov(player) {
    if (!this.modifySpirituality(player, -40)) return;
    Utils.giveItem(player, "lotm:alchemical_molotov", 2, "\xA7l\xA7c\u3010\u975E\u51E1\u6D88\u8017\u54C1\u3011\xA7e\u70BC\u91D1\u71C3\u70E7\u74F6", ["\xA77\u6295\u63B7\u4EA7\u751F 3 \u683C\u70C8\u7130\u706B\u533A"]);
    Utils.playSound(player, "fire.ignite", 1.5, 1);
    Utils.tell(player, "\xA7c\u{1F525} [\u70C8\u706B\u70BC\u91D1] \u6D88\u8017 40 \u7075\u6027\u6210\u529F\u8C03\u914D 2 \u74F6\u3010\u70BC\u91D1\u71C3\u70E7\u74F6\u3011\uFF01");
  }
  /**
   * 途径选择与转换菜单
   */
  static openPathwaySelectMenu(player) {
    const form = new ActionFormData4().title("\xA7l\xA7e\u{1F52E} \u9009\u62E9\u5E8F\u5217 7 \u9014\u5F84").body("\xA77\u8BF7\u9009\u62E9\u4F60\u60F3\u8E0F\u5165\u7684\u975E\u51E1\u9014\u5F84\uFF08\u81EA\u52A8\u914D\u7F6E\u4E13\u5C5E\u4F53\u8D28\u3001\u7075\u6027\u6C60\u4E0E\u5168\u5957\u6280\u80FD\uFF09\uFF1A").button("\xA7l\xA75\u3010\u5360\u535C\u5BB6\u3011\u9B54\u672F\u5E08\n\xA7728 HP | \u7A7A\u6C14\u5F39\xB7\u706B\u7130\u8DF3\u8DC3", "textures/items/stick").button("\xA7l\xA7c\u3010\u730E\u4EBA\u3011\u7EB5\u706B\u5BB6\n\xA7732 HP | \u706B\u7130\u957F\u67AA\xB7\u7130\u6F6E\u9886\u57DF", "textures/items/blaze_powder").button("\xA7l\xA76\u3010\u6218\u58EB\u3011\u6B66\u5668\u5927\u5E08\n\xA7744 HP | \u56DB\u5927\u6218\u6280\xB7\u5927\u5E08\u683C\u6321", "textures/items/iron_sword").button("\xA7l\xA79\u3010\u4E0D\u7720\u8005\u3011\u68A6\u9B47\n\xA7730 HP | \u5F3A\u5236\u5165\u68A6\xB7\u591C\u4E4B\u7737\u5C5E", "textures/items/clock_item").button("\xA7l\xA7e\u3010\u6B4C\u9882\u8005\u3011\u592A\u9633\u795E\u5B98\n\xA7736 HP | \u795E\u5723\u4E4B\u5149\xB7\u592A\u9633\u5149\u73AF", "textures/items/gold_ingot").button("\xA7l\xA74\u3010\u836F\u5E08\u3011\u5438\u8840\u9B3C\n\xA7736 HP | \u8150\u8680\u4E4B\u722A\xB7\u9ED1\u6697\u4E4B\u7FFC", "textures/items/redstone_dust").button("\xA7l\xA7d\u3010\u523A\u5BA2\u3011\u5973\u5DEB\n\xA7728 HP | \u9ED1\u7130\u7981\u7597\xB7\u955C\u9762\u66FF\u8EAB", "textures/items/amethyst_shard");
    Utils.showForm(player, form, (res) => {
      const pathways = ["seer", "hunter", "warrior", "darkness", "sun", "moon", "assassin"];
      const selected = pathways[res.selection];
      if (selected) {
        this.setPathway(player, selected);
        this.giveFocusKit(player);
        Utils.playSound(player, "random.levelup", 1.5, 1);
        Utils.tell(player, `\xA7a\xA7l[\u664B\u5347\u6210\u529F] \xA7f\u4F60\u5DF2\u6B63\u5F0F\u6210\u4E3A \xA76${PathwayProfileRegistry.getProfile(selected).title}\xA7f\uFF01`);
      }
    });
  }
  /**
   * 发放当前途径全套专属媒介与消耗品
   */
  static giveFocusKit(player) {
    const pathway = this.getPathway(player);
    this.giveFocusKitForPathway(player, pathway);
  }
  /**
   * 发放指定途径全套专属媒介与消耗品
   */
  static giveFocusKitForPathway(player, pathway) {
    switch (pathway) {
      case "seer":
        Utils.giveItem(player, "lotm:spirit_cane", 1, "\xA7l\xA7e\u3010\u975E\u51E1\u6B66\u5668\u3011\xA76\u9B54\u672F\u5E08\u624B\u6756", ["\xA77\u53F3\u952E\u91CA\u653E\u7A7A\u6C14\u5F39\uFF0C\u6F5C\u884C\u53F3\u952E\u706B\u7130\u8DF3\u8DC3"]);
        Utils.giveItem(player, "lotm:tarot_card", 64, "\xA7l\xA7e\u3010\u975E\u51E1\u5A92\u4ECB\u3011\xA7b\u9B54\u672F\u7EB8\u724C", ["\xA77\u53F3\u952E\u9AD8\u901F\u7834\u7532\u98DE\u63B7"]);
        Utils.giveItem(player, "lotm:paper_figurine", 16, "\xA7l\xA7f\u3010\u975E\u51E1\u5A92\u4ECB\u3011\xA7c\u7B26\u5492\u7EB8\u4EBA\u66FF\u8EAB", ["\xA77\u80CC\u5305\u643A\u5E26\uFF0C\u81F4\u547D\u4F24\u81EA\u52A8\u66FF\u6B7B"]);
        break;
      case "hunter":
        Utils.giveItem(player, "lotm:pyro_gauntlet", 1, "\xA7l\xA7c\u3010\u975E\u51E1\u5A92\u4ECB\u3011\xA76\u8D64\u7130\u624B\u5957", ["\xA77\u53F3\u952E\u91CA\u653E\u706B\u7130\u957F\u67AA\uFF0C\u6F5C\u884C\u53F3\u952E\u7130\u6F6E\u9886\u57DF"]);
        Utils.giveItem(player, "lotm:alchemical_molotov", 16, "\xA7l\xA7c\u3010\u975E\u51E1\u6D88\u8017\u54C1\u3011\xA7e\u70BC\u91D1\u71C3\u70E7\u74F6", ["\xA77\u6295\u63B7\u4EA7\u751F 3 \u683C\u70C8\u7130\u706B\u533A"]);
        break;
      case "warrior":
        Utils.giveItem(player, "lotm:tactical_sword", 1, "\xA7l\xA76\u3010\u6218\u672F\u6B66\u5668\u3011\xA7f\u6218\u672F\u957F\u5251", ["\xA77\u53F3\u952E\u7A7F\u523A\u7A81\u8FDB\u7834\u7532"]);
        Utils.giveItem(player, "lotm:tactical_axe", 1, "\xA7l\xA76\u3010\u6218\u672F\u6B66\u5668\u3011\xA7f\u6218\u672F\u6218\u65A7", ["\xA77\u53F3\u952E 120\xB0 \u6A2A\u626B\u5904\u51B3"]);
        Utils.giveItem(player, "lotm:tactical_spear", 1, "\xA7l\xA76\u3010\u6218\u672F\u6B66\u5668\u3011\xA7f\u6218\u672F\u957F\u67AA", ["\xA77\u53F3\u952E 6 \u683C\u8D2F\u7EBF\u523A\u51FB"]);
        Utils.giveItem(player, "lotm:tactical_bow", 1, "\xA7l\xA76\u3010\u6218\u672F\u6B66\u5668\u3011\xA7f\u6218\u672F\u6218\u5F13", ["\xA77\u53F3\u952E\u4E13\u6CE8\u5C04\u51FB\u589E\u4F24 50%"]);
        Utils.giveItem(player, "lotm:blade_oil", 16, "\xA7l\xA7e\u3010\u975E\u51E1\u6D88\u8017\u54C1\u3011\xA76\u78E8\u5203\u6CB9", ["\xA77\u4F7F\u7528\u540E 60 \u79D2\u6B66\u5668\u589E\u4F24 8%"]);
        break;
      case "darkness":
        Utils.giveItem(player, "lotm:nightmare_watch", 1, "\xA7l\xA79\u3010\u975E\u51E1\u5A92\u4ECB\u3011\xA7b\u5348\u591C\u6000\u8868", ["\xA77\u53F3\u952E\u5F3A\u5236\u5165\u68A6\uFF0C\u6F5C\u884C\u53F3\u952E\u68A6\u9B47\u9886\u57DF"]);
        Utils.giveItem(player, "lotm:dream_dust", 16, "\xA7l\xA79\u3010\u975E\u51E1\u6D88\u8017\u54C1\u3011\xA7f\u68A6\u5883\u7C89\u5C18", ["\xA77\u6295\u63B7\u6563\u5E03 3 \u683C\u56F0\u5026\u96FE\u972D"]);
        break;
      case "sun":
        Utils.giveItem(player, "lotm:sun_emblem", 1, "\xA7l\xA7e\u3010\u975E\u51E1\u5A92\u4ECB\u3011\xA76\u592A\u9633\u5723\u5FBD", ["\xA77\u53F3\u952E\u795E\u5723\u4E4B\u5149\uFF0C\u6F5C\u884C\u53F3\u952E\u592A\u9633\u5149\u73AF"]);
        Utils.giveItem(player, "lotm:holy_water_bottle", 16, "\xA7l\xA7e\u3010\u975E\u51E1\u6D88\u8017\u54C1\u3011\xA7b\u5723\u6C34\u74F6", ["\xA77\u6295\u63B7\u9A71\u6563\u6C61\u79FD\u4E0E\u706B\u707E"]);
        break;
      case "moon":
        Utils.giveItem(player, "lotm:vampire_ring", 1, "\xA7l\xA74\u3010\u975E\u51E1\u5A92\u4ECB\u3011\xA7c\u8840\u65CF\u6307\u73AF", ["\xA77\u53F3\u952E\u8150\u8680\u4E4B\u722A\u7A81\u8FDB\u5438\u8840\uFF0C\u6F5C\u884C\u53F3\u952E\u9ED1\u6697\u4E4B\u7FFC"]);
        Utils.giveItem(player, "lotm:sealed_blood_bottle", 16, "\xA7l\xA74\u3010\u975E\u51E1\u6D88\u8017\u54C1\u3011\xA7c\u5BC6\u5C01\u8840\u6DB2\u74F6", ["\xA77\u996E\u7528\u6062\u590D 8 HP \u4E0E 80 \u7075\u6027"]);
        break;
      case "assassin":
        Utils.giveItem(player, "lotm:witch_mirror_wand", 1, "\xA7l\xA7d\u3010\u975E\u51E1\u5A92\u4ECB\u3011\xA75\u9ED1\u66DC\u955C\u6756", ["\xA77\u53F3\u952E\u9ED1\u7130\u7981\u7597\uFF0C\u6F5C\u884C\u53F3\u952E\u955C\u9762\u66FF\u8EAB\u9690\u5F62"]);
        Utils.giveItem(player, "lotm:curse_doll", 16, "\xA7l\xA7d\u3010\u975E\u51E1\u6D88\u8017\u54C1\u3011\xA74\u8BC5\u5492\u5A03\u5A03", ["\xA77\u53F3\u952E\u9501\u5B9A\u65BD\u52A0\u6C89\u91CD\u8BC5\u5492"]);
        break;
    }
    Utils.tell(player, `\xA7a\u5DF2\u53D1\u653E\u3010${PathwayProfileRegistry.getProfile(pathway).name}\u3011\u5168\u5957\u4E13\u5C5E\u5A92\u4ECB\u4E0E\u7269\u8D44\uFF01`);
  }
};

// scripts/modules/weapon.js
var playerCooldowns = /* @__PURE__ */ new Map();
var WeaponManager = class {
  /**
   * 判断物品是否为非凡神兵 / 丧钟左轮
   * @param {import("@minecraft/server").ItemStack} itemStack 
   * @returns {boolean}
   */
  static isGun(itemStack) {
    if (!itemStack) return false;
    if (itemStack.typeId === "lotm:death_knell" || itemStack.typeId === "custom:thunder_blaster") return true;
    if (itemStack.nameTag && (itemStack.nameTag.includes("\u4E27\u949F") || itemStack.nameTag.includes("\u96F7\u9706\u805A\u80FD\u70AE"))) {
      return true;
    }
    return false;
  }
  /**
   * 执行丧钟开火射击 (严格消耗灵性与封印物反噬校验)
   * @param {import("@minecraft/server").Player} player 
   */
  static shoot(player) {
    if (!Utils.isValid(player)) return;
    const seq = LotmManager.getSequence(player);
    if (seq === 0) {
      LotmManager.triggerMadness(player, "\u51E1\u4EBA\u5F3A\u884C\u9A71\u4F7F2\u7EA7\u5C01\u5370\u7269\u3010\u4E27\u949F\u3011\u906D\u5230\u7CBE\u795E\u6C61\u67D3");
      Utils.tell(player, "\xA7c\u666E\u901A\u4EBA\u7684\u8089\u8EAB\u4E0E\u7CBE\u795E\u65E0\u6CD5\u627F\u53D72\u7EA7\u5C01\u5370\u7269\u7684\u5E9E\u5927\u7075\u6027\u8D1F\u8377\uFF01\u5FC5\u987B\u670D\u98DF\u9B54\u836F\u8E0F\u5165\u5E8F\u5217\uFF01");
      return;
    }
    const now = Date.now();
    const lastShoot = playerCooldowns.get(player.id) || 0;
    const cooldown = Config.weapon.cooldownMs || 300;
    if (now - lastShoot < cooldown) {
      return;
    }
    const isSneaking = player.isSneaking;
    const requiredSpirituality = isSneaking ? 150 : 80;
    if (!LotmManager.modifySpirituality(player, -requiredSpirituality)) {
      Utils.playSound(player, "random.click", 1.8, 1);
      Utils.actionbar(player, `\xA7c\u2727 \u7075\u6027\u67AF\u7AED (\u9700 ${requiredSpirituality} \u70B9)\uFF01\u65E0\u6CD5\u9A71\u52A82\u7EA7\u5C01\u5370\u7269\u3010\u4E27\u949F\u3011\uFF01`);
      return;
    }
    playerCooldowns.set(player.id, now);
    LotmManager.addDigestion(player, 2);
    if (isSneaking) {
      this.fireSlaughterBurst(player);
    } else {
      this.fireWeaknessShot(player);
    }
  }
  /**
   * 模式一：【致命弱点射击】（单发超高穿透爆头，消耗 80 灵性）
   */
  static fireWeaknessShot(player) {
    const dimension = player.dimension;
    const headLoc = player.getHeadLocation();
    const viewDir = player.getViewDirection();
    const maxRange = Config.weapon.maxRange || 55;
    const damage = Config.weapon.damage || 48;
    Utils.playSound(player, "random.explode", 1.8, 1);
    Utils.playSound(player, "firework.launch", 1.6, 0.8);
    Utils.playSound(player, "random.totem", 1.5, 0.9);
    const muzzleLoc = {
      x: headLoc.x + viewDir.x * 1,
      y: headLoc.y + viewDir.y * 1 - 0.2,
      z: headLoc.z + viewDir.z * 1
    };
    try {
      dimension.spawnParticle("minecraft:flame_particle", muzzleLoc);
      dimension.spawnParticle("minecraft:sonic_explosion", muzzleLoc);
    } catch {
    }
    let hitDistance = maxRange;
    let hitLocation = {
      x: headLoc.x + viewDir.x * maxRange,
      y: headLoc.y + viewDir.y * maxRange,
      z: headLoc.z + viewDir.z * maxRange
    };
    try {
      const blockHit = dimension.getBlockFromRay(headLoc, viewDir, { maxDistance: maxRange });
      if (blockHit) {
        const bLoc = blockHit.faceLocation || blockHit.block.location;
        const dist = Math.hypot(bLoc.x - headLoc.x, bLoc.y - headLoc.y, bLoc.z - headLoc.z);
        if (dist > 1.5 && dist < hitDistance) {
          hitDistance = dist;
          hitLocation = {
            x: headLoc.x + viewDir.x * dist,
            y: headLoc.y + viewDir.y * dist,
            z: headLoc.z + viewDir.z * dist
          };
        }
      }
    } catch {
    }
    try {
      const entityHits = dimension.getEntitiesFromRay(headLoc, viewDir, { maxDistance: hitDistance });
      for (const hit of entityHits) {
        const target = hit.entity;
        if (target && target.id !== player.id && target.typeId !== "minecraft:item") {
          const dist = Math.hypot(target.location.x - headLoc.x, target.location.y - headLoc.y, target.location.z - headLoc.z);
          if (dist > 0.5 && dist <= hitDistance) {
            hitDistance = dist;
            hitLocation = {
              x: headLoc.x + viewDir.x * dist,
              y: headLoc.y + viewDir.y * dist,
              z: headLoc.z + viewDir.z * dist
            };
            try {
              target.applyDamage(damage, { damagingEntity: player, cause: "entityAttack" });
            } catch {
              try {
                target.applyDamage(damage);
              } catch {
              }
            }
            try {
              if (typeof target.applyKnockback === "function") {
                try {
                  target.applyKnockback({ x: viewDir.x, y: 0.25, z: viewDir.z }, 2.5);
                } catch {
                  target.applyKnockback(viewDir.x, viewDir.z, 2.5, 0.4);
                }
              }
            } catch {
            }
            Utils.playSound(player, "random.break", 1.8, 1);
            try {
              dimension.spawnParticle("minecraft:large_explosion", hitLocation);
              dimension.spawnParticle("minecraft:sonic_explosion", hitLocation);
            } catch {
            }
            break;
          }
        }
      }
    } catch {
    }
    const maxDraw = Math.max(3, hitDistance);
    for (let d = 0.6; d < maxDraw; d += 0.7) {
      const px = headLoc.x + viewDir.x * d;
      const py = headLoc.y + viewDir.y * d;
      const pz = headLoc.z + viewDir.z * d;
      try {
        dimension.spawnParticle("minecraft:crit", { x: px, y: py, z: pz });
      } catch {
      }
    }
    try {
      dimension.spawnParticle("minecraft:large_explosion", hitLocation);
    } catch {
    }
    Utils.actionbar(player, "\xA7c\u2620 [\u4E27\u949F\u5DE6\u8F6E] \u5F31\u70B9\u770B\u7834\uFF01\u6D88\u801780\u7075\u6027\u4E3A\u654C\u4EBA\u6572\u54CD\u4E27\u949F\uFF01");
  }
  /**
   * 模式二：【屠杀连发模式】（潜行开火，3连发扇形激波爆破，消耗 150 灵性）
   */
  static fireSlaughterBurst(player) {
    const dimension = player.dimension;
    const headLoc = player.getHeadLocation();
    const viewDir = player.getViewDirection();
    Utils.playSound(player, "random.explode", 2, 1);
    Utils.playSound(player, "firework.launch", 1.8, 0.8);
    Utils.playSound(player, "random.totem", 1.6, 1);
    const offsets = [-0.1, 0, 0.1];
    for (const off of offsets) {
      const spreadDir = {
        x: viewDir.x + off * -viewDir.z,
        y: viewDir.y,
        z: viewDir.z + off * viewDir.x
      };
      try {
        const hits = dimension.getEntitiesFromRay(headLoc, spreadDir, { maxDistance: 40 });
        for (const hit of hits) {
          const target = hit.entity;
          if (target && target.id !== player.id && target.typeId !== "minecraft:item") {
            try {
              target.applyDamage(30, { damagingEntity: player, cause: "entityAttack" });
            } catch {
              try {
                target.applyDamage(30);
              } catch {
              }
            }
          }
        }
      } catch {
      }
      for (let d = 1; d < 35; d += 1.5) {
        try {
          dimension.spawnParticle("minecraft:crit", {
            x: headLoc.x + spreadDir.x * d,
            y: headLoc.y + spreadDir.y * d,
            z: headLoc.z + spreadDir.z * d
          });
        } catch {
        }
      }
    }
    Utils.actionbar(player, "\xA74\u{1F525} [\u4E27\u949F\xB7\u5C60\u6740\u6A21\u5F0F] \u6D88\u8017150\u7075\u6027\u6FC0\u53D1\u6247\u5F62\u7075\u6027\u98CE\u66B4\uFF01");
  }
  /**
   * 发放限定非凡神兵【丧钟左轮】给玩家
   * @param {import("@minecraft/server").Player} player 
   */
  static giveGun(player) {
    const typeId = "lotm:death_knell";
    const nameTag = "\xA7l\xA76\u30102\u7EA7\u5C01\u5370\u7269\u3011\xA7c\u4E27\u949F\u5DE6\u8F6E";
    const lore = [
      "\xA77\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550",
      "\xA7e\u54C1\u7EA7: \xA762\u7EA7\u5C01\u5370\u7269 \xA77(Grade 2 Sealed Artifact)",
      "\xA7f\u7C7B\u578B: \xA7c\u975E\u51E1\u5DE6\u8F6E\u624B\u67AA",
      "\xA7f\u5A01\u529B: \xA7c48 \u70B9\u5F31\u70B9\u4F24\u5BB3 \xA77(\u9644\u5E26\u7A7F\u900F\u7206\u5934)",
      "\xA7f\u5C04\u7A0B: \xA7b55 \u683C\u8D85\u89C6\u8DDD\u72D9\u51FB",
      "\xA77\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500",
      "\xA7e[\u5E38\u89C4\u5C04\u51FB] \xA7f\u53F3\u952E\u6D88\u8017 \xA7d80 \u7075\u6027\xA7f\uFF0C\u5F31\u70B9\u5FC5\u6740\u5E76\u6572\u54CD\u4E27\u949F",
      "\xA7e[\u5C60\u6740\u6A21\u5F0F] \xA7f\u6F5C\u884C+\u53F3\u952E\u6D88\u8017 \xA7d150 \u7075\u6027\xA7f\uFF0C\u89E6\u53D13\u53D1\u8FDE\u5C04\u7206\u7834",
      "\xA7c[\u5C01\u5370\u8D1F\u9762] \xA74\u51E1\u4EBA\u5F3A\u884C\u5F00\u706B\u5C06\u906D\u53D7\u7CBE\u795E\u6C61\u67D3\u4E0E\u5931\u63A7\u53CD\u566C",
      "\xA77\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550",
      '\xA78"\u5F53\u949F\u58F0\u54CD\u8D77\u65F6\uFF0C\u547D\u8FD0\u7684\u5B50\u5F39\u5DF2\u7A7F\u900F\u654C\u4EBA\u7684\u5FC3\u810F\u3002"'
    ];
    try {
      Utils.giveItem(player, typeId, 1, nameTag, lore);
    } catch {
      Utils.giveItem(player, "minecraft:blaze_rod", 1, nameTag, lore);
    }
  }
};

// scripts/modules/lottery.js
var LotteryManager = class {
  /**
   * 打开抽奖大厅（奖池列表）
   * @param {import("@minecraft/server").Player} player 
   * @param {Function} [onBack] 
   */
  static openLotteryMainUI(player, onBack = null) {
    const balance = EconomyManager.getBalance(player);
    const form = new ActionFormData5().title("\xA7l\xA7d\u{1F381} \u5E78\u8FD0\u62BD\u5956\u5927\u5385").body(
      `\xA77\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
\xA7f\u5F53\u524D\u8D44\u4EA7: ${Utils.formatCurrency(balance)}
\xA77\u9009\u62E9\u4F60\u611F\u5174\u8DA3\u7684\u795E\u79D8\u5956\u6C60\uFF0C\u6D4B\u6D4B\u4ECA\u65E5\u6B27\u6C14\uFF01
\xA77\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`
    );
    const pools = Config.lottery.pools;
    for (const pool of pools) {
      form.button(`${pool.name}
\xA7r\xA78\u5355\u62BD: ${pool.singleCost} | \u5341\u8FDE: ${pool.tenCost}`, pool.icon);
    }
    if (onBack) {
      form.button("\xA7l\xA7c\u{1F519} \u8FD4\u56DE\u4E0A\u7EA7\n\xA7r\xA78\u8FD4\u56DE\u4E3B\u83DC\u5355", "textures/ui/cancel");
    }
    Utils.showForm(player, form, (res) => {
      if (res.selection < pools.length) {
        const selectedPool = pools[res.selection];
        this.openPoolActionUI(player, selectedPool, () => this.openLotteryMainUI(player, onBack));
      } else if (onBack) {
        onBack();
      }
    });
  }
  /**
   * 打开特定奖池的抽奖界面
   * @param {import("@minecraft/server").Player} player 
   * @param {object} pool 
   * @param {Function} [onBack] 
   */
  static openPoolActionUI(player, pool, onBack = null) {
    const balance = EconomyManager.getBalance(player);
    const form = new ActionFormData5().title(`\xA7l${pool.name}`).body(
      `\xA77\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
\xA7f\u5F53\u524D\u8D44\u4EA7: ${Utils.formatCurrency(balance)}
\xA77\u5956\u6C60\u8BF4\u660E: \xA7f${pool.description}
\xA77\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`
    ).button(`\xA7l\xA7a\u{1F3AF} \u5355\u62BD 1 \u6B21
\xA7r\xA78\u6D88\u8017 ${pool.singleCost} \u91D1\u5E01`, "textures/ui/generic_single_coin").button(`\xA7l\xA76\u{1F31F} \u5341\u8FDE\u62BD\u53D6
\xA7r\xA78\u6D88\u8017 ${pool.tenCost} \u91D1\u5E01 (\u7279\u60E0)`, "textures/ui/generic_ten_coins").button(`\xA7l\xA7b\u{1F4DC} \u5956\u6C60\u5185\u5BB9\u4E0E\u6982\u7387
\xA7r\xA78\u67E5\u770B\u5168\u90E8\u53EF\u62BD\u53D6\u7269\u54C1`, "textures/ui/book_metas_default");
    if (onBack) {
      form.button("\xA7l\xA7c\u{1F519} \u8FD4\u56DE\u5956\u6C60\u5217\u8868\n\xA7r\xA78\u9009\u62E9\u5176\u4ED6\u5956\u6C60", "textures/ui/cancel");
    }
    Utils.showForm(player, form, (res) => {
      if (res.selection === 0) {
        this.executeDraw(player, pool, 1, () => this.openPoolActionUI(player, pool, onBack));
      } else if (res.selection === 1) {
        this.executeDraw(player, pool, 10, () => this.openPoolActionUI(player, pool, onBack));
      } else if (res.selection === 2) {
        this.openPoolPrizesPreviewUI(player, pool, () => this.openPoolActionUI(player, pool, onBack));
      } else if (onBack) {
        onBack();
      }
    });
  }
  /**
   * 执行抽奖逻辑
   * @param {import("@minecraft/server").Player} player 
   * @param {object} pool 
   * @param {number} count 抽取次数 (1 或 10)
   * @param {Function} [onComplete] 
   */
  static executeDraw(player, pool, count = 1, onComplete = null) {
    const cost = count === 1 ? pool.singleCost : pool.tenCost;
    if (!EconomyManager.hasBalance(player, cost)) {
      Utils.tell(player, `\xA7c\u91D1\u5E01\u4E0D\u8DB3\uFF01\u62BD\u5956\u9700\u8981 ${Utils.formatCurrency(cost)}\u3002`);
      Utils.sound.fail(player);
      if (onComplete) onComplete();
      return;
    }
    EconomyManager.removeBalance(player, cost);
    const items = pool.items;
    const totalWeight = items.reduce((sum, it) => sum + it.weight, 0);
    const results = [];
    let hasRareOrAbove = false;
    for (let i = 0; i < count; i++) {
      let rnd = Math.random() * totalWeight;
      let chosen = items[0];
      for (const item of items) {
        if (rnd < item.weight) {
          chosen = item;
          break;
        }
        rnd -= item.weight;
      }
      results.push(chosen);
      if (chosen.isWeapon) {
        WeaponManager.giveGun(player);
      } else {
        Utils.giveItem(player, chosen.id, chosen.amount);
      }
      const rarityInfo = Config.lottery.rarities[chosen.rarity] || { name: "\u666E\u901A", broadcast: false };
      if (rarityInfo.broadcast) {
        hasRareOrAbove = true;
        if (chosen.rarity === "mythic") {
          Utils.broadcast(`\xA7l\xA76[\u{1F525} \u795E\u8BDD\u6B27\u7687\u964D\u4E34 \u{1F525}] \xA7e\u73A9\u5BB6 \xA7b${player.name} \xA7e\u4E00\u53D1\u5165\u9B42\u62BD\u4E2D\u4E86\u9650\u5B9A\u795E\u8BDD\u6B66\u5668\uFF1A${chosen.name} \xA7e\uFF01\uFF01\uFF01`);
        } else {
          Utils.broadcast(`\xA7e\u{1F389} \u73A9\u5BB6 \xA7b${player.name} \xA7e\u5728\u3010${pool.name}\u3011\u4E2D\u6B27\u6C14\u7206\u53D1\uFF0C\u62BD\u4E2D\u4E86 ${rarityInfo.name} \xA7e\u5956\u54C1\uFF1A${chosen.name}\uFF01`);
        }
      }
    }
    if (hasRareOrAbove) {
      Utils.sound.rareWin(player);
    } else {
      Utils.sound.buy(player);
    }
    let resultText = `\xA77\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 \u62BD\u5956\u7ED3\u679C (${count} \u8FDE\u62BD) \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

`;
    for (let i = 0; i < results.length; i++) {
      const it = results[i];
      const rarityInfo = Config.lottery.rarities[it.rarity] || { name: "\u666E\u901A", color: "\xA77" };
      resultText += `\xA7f[${i + 1}] [${rarityInfo.color}${rarityInfo.name}\xA7f] ${it.name}
`;
    }
    resultText += `
\xA77\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
`;
    resultText += `\xA7a\u5DF2\u81EA\u52A8\u5C06\u83B7\u5F97\u7684\u7269\u54C1\u53D1\u653E\u81F3\u4F60\u7684\u80CC\u5305\uFF01`;
    const form = new ActionFormData5().title("\xA7l\xA76\u{1F381} \u62BD\u5956\u7ED3\u679C\u63ED\u6653\uFF01").body(resultText).button("\xA7l\xA7a\u518D\u6765\u4E00\u6B21", "textures/ui/refresh").button("\xA7l\xA7e\u8FD4\u56DE\u5956\u6C60", "textures/ui/cancel");
    Utils.showForm(player, form, (res) => {
      if (res.selection === 0) {
        this.executeDraw(player, pool, count, onComplete);
      } else if (onComplete) {
        onComplete();
      }
    });
  }
  /**
   * 查看奖池全部可抽取物品与概率公示
   * @param {import("@minecraft/server").Player} player 
   * @param {object} pool 
   * @param {Function} [onBack] 
   */
  static openPoolPrizesPreviewUI(player, pool, onBack = null) {
    const totalWeight = pool.items.reduce((sum, it) => sum + it.weight, 0);
    let content = `\xA77\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 \u5956\u6C60\u6982\u7387\u516C\u793A \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

`;
    for (const it of pool.items) {
      const rarityInfo = Config.lottery.rarities[it.rarity] || { name: "\u666E\u901A", color: "\xA77" };
      const chance = (it.weight / totalWeight * 100).toFixed(1);
      content += `[${rarityInfo.color}${rarityInfo.name}\xA7r] ${it.name} \xA77- \u6982\u7387: \xA7e${chance}%
`;
    }
    content += `
\xA77\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`;
    const form = new ActionFormData5().title(`\xA7l\u5956\u6C60\u6982\u7387: ${pool.name}`).body(content).button("\xA7l\xA7a\u786E\u5B9A\u5E76\u8FD4\u56DE", "textures/ui/confirm");
    form.show(player).then(() => {
      if (onBack) onBack();
    });
  }
};

// scripts/modules/menu.js
import { world as world19 } from "@minecraft/server";
import { ActionFormData as ActionFormData6, ModalFormData as ModalFormData5, MessageFormData as MessageFormData5 } from "@minecraft/server-ui";
var MenuManager = class {
  /**
   * 打开综合系统主菜单
   * @param {import("@minecraft/server").Player} player 
   */
  static openMainMenu(player) {
    if (!Utils.isValid(player)) return;
    try {
      const balance = EconomyManager.getBalance(player);
      const { chunkX, chunkZ } = Utils.getChunkCoords(player.location);
      const isAdmin = Utils.isAdmin(player);
      const seq = LotmManager.getSequence(player);
      const sp = LotmManager.getSpirituality(player);
      const form = new ActionFormData6().title(`\xA7l${Config.system.serverName} \xA7r\xA78- \u4E3B\u83DC\u5355`).body(
        `\xA77\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
\xA7f\u6B22\u8FCE\u56DE\u6765\uFF0C\xA7e${player.name} \xA7f\uFF01
\xA7f\u5F53\u524D\u8D44\u4EA7: ${Utils.formatCurrency(balance)}
\xA7f\u975E\u51E1\u9636\u4F4D: \xA7d[\u5E8F\u5217${seq}] \xA7f\u7075\u6027: \xA7d${sp}
\xA7f\u5F53\u524D\u4F4D\u7F6E: \xA77[${Math.floor(player.location.x)}, ${Math.floor(player.location.y)}, ${Math.floor(player.location.z)}] \xA78(\u533A\u5757 ${chunkX}, ${chunkZ})
\xA77\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
\xA77\u8BF7\u9009\u62E9\u4F60\u8981\u6253\u5F00\u7684\u529F\u80FD\uFF1A`
      ).button("\xA7l\xA76\u{1F3E6} \u4E2A\u4EBA\u94F6\u884C\n\xA7r\xA78\u8D44\u4EA7\u67E5\u8BE2\u4E0E\u73A9\u5BB6\u8F6C\u8D26", "textures/ui/Trade2").button("\xA7l\xA7a\u{1F6D2} \u5168\u7403\u5546\u5E97\n\xA7r\xA78\u5EFA\u6750\u77FF\u7269\u4E0E\u975E\u51E1\u9B54\u836F\u6750\u6599", "textures/ui/MCStore_Gold_large").button("\xA7l\xA72\u{1F6E1}\uFE0F \u5730\u76AE\u9886\u5730\n\xA7r\xA78\u8D2D\u4E70\u9632\u7206\u9632\u718A\u4E13\u5C5E\u5730\u76AE", "textures/ui/village_hero_effect").button("\xA7l\xA7d\u{1F381} \u5E78\u8FD0\u62BD\u5956\n\xA7r\xA78\u795E\u79D8\u5956\u6C60\u62BD\u53D6\u9650\u5B9A\u6B66\u5668", "textures/ui/gift_square").button("\xA7l\xA75\u{1F52E} \u8BE1\u79D8\u975E\u51E1\u79D8\u5178\n\xA7r\xA78\u8D85\u51E1\u4F53\u7CFB\u4E0E\u5E8F\u5217\u80FD\u529B", "textures/items/potion_seer").button("\xA7l\xA7e\u{1F3C6} \u8D22\u5BCC\u6392\u884C\n\xA7r\xA78\u67E5\u770B\u670D\u52A1\u5668\u5BCC\u8C6A\u6392\u884C\u699C", "textures/ui/achievements");
      if (isAdmin) {
        form.button("\xA7l\xA7c\u2699\uFE0F \u7BA1\u7406\u5458\u63A7\u5236\u53F0\n\xA7r\xA78\u91D1\u5E01\u8C03\u63A7\u4E0E\u975E\u51E1\u7269\u54C1\u53D1\u653E", "textures/ui/op");
      }
      form.button("\xA7l\xA77\u2716 \u5173\u95ED\u83DC\u5355", "textures/ui/cancel");
      Utils.showForm(player, form, (res) => {
        switch (res.selection) {
          case 0:
            EconomyManager.openBankUI(player, () => this.openMainMenu(player));
            break;
          case 1:
            ShopManager.openShopCategoryUI(player, () => this.openMainMenu(player));
            break;
          case 2:
            LandManager.openPlotMainUI(player, () => this.openMainMenu(player));
            break;
          case 3:
            LotteryManager.openLotteryMainUI(player, () => this.openMainMenu(player));
            break;
          case 4:
            LotmManager.openAbilityMenu(player);
            break;
          case 5:
            EconomyManager.openLeaderboardUI(player, () => this.openMainMenu(player));
            break;
          case 6:
            if (isAdmin) {
              this.openAdminPanel(player, () => this.openMainMenu(player));
            }
            break;
        }
      });
    } catch (err) {
      console.error("[MenuManager] Error in openMainMenu:", err);
    }
  }
  /**
   * 打开管理员控制台
   * @param {import("@minecraft/server").Player} player 
   * @param {Function} [onBack] 
   */
  static openAdminPanel(player, onBack = null) {
    if (!Utils.isAdmin(player)) {
      Utils.tell(player, "\xA7c\u4F60\u6CA1\u6709\u6743\u9650\u8BBF\u95EE\u7BA1\u7406\u5458\u63A7\u5236\u53F0\uFF01");
      return;
    }
    const onlinePlayers = world19.getAllPlayers();
    const form = new ActionFormData6().title("\xA7l\xA7c\u2699\uFE0F \u7BA1\u7406\u5458\u63A7\u5236\u53F0").body(
      `\xA77\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
\xA7f\u5728\u7EBF\u73A9\u5BB6\u4EBA\u6570: \xA7e${onlinePlayers.length}
\xA77\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
\xA77\u8BF7\u9009\u62E9\u7BA1\u7406\u529F\u80FD\uFF1A`
    ).button("\xA7l\xA76\u{1F4B5} \u73A9\u5BB6\u91D1\u5E01\u7BA1\u7406\n\xA7r\xA78\u4FEE\u6539/\u589E\u51CF\u6307\u5B9A\u73A9\u5BB6\u4F59\u989D", "textures/ui/Trade2").button("\xA7l\xA74\u{1F5D1}\uFE0F \u5F3A\u5236\u5220\u9664\u5F53\u524D\u5730\u76AE\n\xA7r\xA78\u6E05\u9664\u5F53\u524D\u533A\u5757\u7684\u9886\u5730\u4FDD\u62A4", "textures/ui/trash").button("\xA7l\xA7e\u{1F4E2} \u53D1\u5E03\u5168\u670D\u516C\u544A\n\xA7r\xA78\u5411\u6240\u6709\u73A9\u5BB6\u5E7F\u64AD\u91CD\u8981\u901A\u77E5", "textures/ui/accessibility_glyph_color").button("\xA7l\xA7a\u{1F381} \u5168\u670D\u53D1\u653E\u798F\u5229\u91D1\u5E01\n\xA7r\xA78\u4E3A\u6240\u6709\u5728\u7EBF\u73A9\u5BB6\u53D1\u653E\u91D1\u5E01", "textures/ui/gift_square").button("\xA7l\xA76\u2694\uFE0F 7\u5927\u9AD8\u9636\u5C01\u5370\u7269\u795E\u5175\u5E93\n\xA7r\xA78\u4E00\u952E\u9886\u53D6\u539F\u8457\u5168\u90E82\u7EA7/3\u7EA7\u5C01\u5370\u7269", "textures/items/death_knell").button("\xA7l\xA75\u{1F52E} \u5F00\u53D1\u8005\xB7\u975E\u51E1\u9636\u4F4D\u8C03\u8BD5\n\xA7r\xA78\u4E00\u952E\u5347\u5E8F/\u6EE1\u6D88\u5316/\u56DE\u6EE1\u7075\u6027", "textures/items/potion_magician").button("\xA7l\xA7e\u{1F9EA} \u83B7\u53D6\u5168\u9014\u5F84\u975E\u51E1\u7269\u8D44\u793C\u5305\n\xA7r\xA78\u83B7\u53D67\u5927\u9014\u5F84\u6240\u6709\u5A92\u4ECB\u4E0E\u6D88\u8017\u54C1", "textures/items/potion_seer").button("\xA7l\xA77\u2B05 \u8FD4\u56DE\u4E0A\u4E00\u7EA7", "textures/ui/undo");
    Utils.showForm(player, form, (res) => {
      switch (res.selection) {
        case 0:
          this.openPlayerMoneyAdmin(player, onBack);
          break;
        case 1:
          this.forceDeleteCurrentPlot(player, onBack);
          break;
        case 2:
          this.openBroadcastModal(player, onBack);
          break;
        case 3:
          this.openGiftAllModal(player, onBack);
          break;
        case 4:
          this.openArtifactVaultUI(player, onBack);
          break;
        case 5:
          this.openLotmDevPanel(player, onBack);
          break;
        case 6:
          const allPathways = ["seer", "hunter", "warrior", "darkness", "sun", "moon", "assassin"];
          for (const p of allPathways) {
            LotmManager.giveFocusKitForPathway(player, p);
          }
          Utils.tell(player, "\xA75\xA7l[\u7269\u8D44\u53D1\u653E] \xA7a\u5DF2\u6210\u529F\u5C06\u5168\u90E8 7 \u5927\u9014\u5F84\u7684\u4E13\u5C5E\u975E\u51E1\u6B66\u5668\u3001\u65BD\u6CD5\u5A92\u4ECB\u4E0E\u6D88\u8017\u54C1\u53D1\u653E\u81F3\u4F60\u7684\u80CC\u5305\uFF01");
          Utils.sound.success(player);
          if (onBack) onBack();
          break;
        case 7:
          if (onBack) onBack();
          break;
      }
    });
  }
  /**
   * 打开高阶封印物神兵军火库
   */
  static openArtifactVaultUI(player, onBack = null) {
    const form = new ActionFormData6().title("\xA7l\xA76\u2694\uFE0F 7\u5927\u9AD8\u9636\u5C01\u5370\u7269\u795E\u5175\u5E93").body("\xA77\u8BF7\u9009\u62E9\u4F60\u60F3\u76F4\u63A5\u9886\u53D6\u7684\u539F\u8457\u9AD8\u9636\u5C01\u5370\u7269\uFF1A").button("\xA7l\xA76\u30102\u7EA7\u5C01\u5370\u7269\u3011\u4E27\u949F\u77ED\u94F3\n\xA77\u5F31\u70B9\u5C04\u51FB / \u81F4\u547D\u4E00\u51FB / \u6B7B\u9E23\u53CD\u566C", "textures/items/death_knell").button("\xA7l\xA7c\u30103\u7EA7\u5C01\u5370\u7269\u3011\u7070\u70EC\u6536\u5272\u8005\n\xA77\u65A9\u51FB\u7834\u7532 / \u8303\u56F4\u7206\u70B8 / \u5F15\u71C3\u53CD\u566C", "textures/items/ashen_reaper").button("\xA7l\xA7e\u30103\u7EA7\u5C01\u5370\u7269\u3011\u6668\u66E6\u5723\u5251\n\xA77\u5149\u4E4B\u98CE\u66B4 / \u771F\u5B9E\u7834\u9632 / \u7729\u76EE\u53CD\u566C", "textures/items/dawn_greatsword").button("\xA7l\xA79\u30103\u7EA7\u5C01\u5370\u7269\u3011\u9759\u9ED8\u4E4B\u9488\n\xA77\u7EDD\u5BF9\u9759\u97F3 / \u9759\u9ED8\u7ACB\u573A / \u5931\u8BED\u53CD\u566C", "textures/items/silent_pointer").button("\xA7l\xA74\u30103\u7EA7\u5C01\u5370\u7269\u3011\u8840\u6708\u523A\u5251\n\xA77\u6495\u88C2\u6D41\u8840 / \u5438\u8840\u6062\u590D / \u55DC\u8840\u53CD\u566C", "textures/items/blood_moon_rapier").button("\xA7l\xA7d\u30103\u7EA7\u5C01\u5370\u7269\u3011\u955C\u9762\u88C2\u9B42\u77ED\u5315\n\xA77\u7A7A\u95F4\u6298\u8DC3 / \u955C\u50CF\u80CC\u523A / \u8106\u5F31\u53CD\u566C", "textures/items/mirror_split_dagger").button("\xA7l\xA7f\u30103\u7EA7\u5C01\u5370\u7269\u3011\u4E07\u8C61\u519B\u5907\u5323\n\xA77\u5175\u5203\u5171\u9E23 / \u5F39\u836F\u70BC\u6210 / \u6C89\u91CD\u53CD\u566C", "textures/items/arsenal_box").button("\xA7l\xA7a\u{1F381} \u4E00\u952E\u9886\u53D6\u5168\u90E8 7 \u5927\u5C01\u5370\u7269", "textures/ui/gift_square").button("\xA7l\xA77\u2B05 \u8FD4\u56DE\u4E0A\u7EA7", "textures/ui/undo");
    Utils.showForm(player, form, (res) => {
      const artifacts = [
        "lotm:death_knell",
        "lotm:ashen_reaper",
        "lotm:dawn_greatsword",
        "lotm:silent_pointer",
        "lotm:blood_moon_rapier",
        "lotm:mirror_split_dagger",
        "lotm:arsenal_box"
      ];
      if (res.selection < 7) {
        const id = artifacts[res.selection];
        LotmManager.ArtifactManager.giveArtifact(player, id);
        Utils.sound.success(player);
      } else if (res.selection === 7) {
        for (const id of artifacts) {
          LotmManager.ArtifactManager.giveArtifact(player, id);
        }
        Utils.tell(player, "\xA76\xA7l[\u519B\u706B\u5E93] \xA7a\u5DF2\u6210\u529F\u5C06 7 \u5927\u9AD8\u9636\u5C01\u5370\u7269\u5168\u90E8\u53D1\u653E\u81F3\u4F60\u7684\u80CC\u5305\uFF01");
        Utils.sound.rareWin(player);
      }
      if (onBack) onBack();
    });
  }
  /**
   * 开发者非凡阶位与调试通道面板
   */
  static openLotmDevPanel(player, onBack = null) {
    const currSeq = LotmManager.getSequence(player);
    const currDig = LotmManager.getDigestion(player);
    const currSp = LotmManager.getSpirituality(player);
    const form = new ActionFormData6().title("\xA7l\xA75\u{1F52E} \u5F00\u53D1\u8005\xB7\u975E\u51E1\u9636\u4F4D\u8C03\u8BD5\u901A\u9053").body(
      `\xA77\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
\xA7f\u5F53\u524D\u9636\u4F4D: \xA7e${currSeq === 0 ? "\u666E\u901A\u4EBA" : "\u5E8F\u5217 " + currSeq}
\xA7d\u2727 \u5F53\u524D\u7075\u6027: \xA7f${currSp}
\xA7a\u{1F4DC} \u5F53\u524D\u6D88\u5316\u5EA6: \xA7f${currDig}%
\xA77\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
\xA77\u8BF7\u9009\u62E9\u4E00\u952E\u8C03\u8BD5\u64CD\u4F5C\uFF1A`
    ).button("\xA7l\xA75\u{1F31F} \u4E00\u952E\u664B\u5347\u4E3A\u3010\u5E8F\u52177 \u9B54\u672F\u5E08\u3011\n\xA7r\xA78\u81EA\u52A8\u62C9\u6EE1500\u7075\u6027\u4E0E100%\u6D88\u5316", "textures/items/potion_magician").button("\xA7l\xA7c\u{1F3AD} \u4E00\u952E\u664B\u5347\u4E3A\u3010\u5E8F\u52178 \u5C0F\u4E11\u3011\n\xA7r\xA78\u81EA\u52A8\u62C9\u6EE1260\u7075\u6027\u4E0E100%\u6D88\u5316", "textures/items/potion_clown").button("\xA7l\xA79\u{1F52E} \u4E00\u952E\u664B\u5347\u4E3A\u3010\u5E8F\u52179 \u5360\u535C\u5BB6\u3011\n\xA7r\xA78\u81EA\u52A8\u62C9\u6EE1120\u7075\u6027\u4E0E100%\u6D88\u5316", "textures/items/potion_seer").button("\xA7l\xA7a\u{1F4DC} \u4E00\u952E\u62C9\u6EE1\u5F53\u524D\u9B54\u836F\u6D88\u5316\u5EA6 (100%)\n\xA7r\xA78\u8FBE\u6210\u5B89\u5168\u664B\u5347\u6761\u4EF6", "textures/items/book_enchanted").button("\xA7l\xA7b\u26A1 \u4E00\u952E\u77AC\u95F4\u56DE\u6EE1\u5F53\u524D\u7075\u6027\u503C\n\xA7r\xA78\u65E0\u9700\u7B49\u5F85\u81EA\u52A8\u51A5\u60F3\u56DE\u590D", "textures/items/experience_bottle").button("\xA7l\xA74\u{1F504} \u91CD\u7F6E\u4E3A\u3010\u666E\u901A\u4EBA (\u5E8F\u52170)\u3011\n\xA7r\xA78\u6E05\u9664\u5168\u90E8\u975E\u51E1\u5C5E\u6027\u4E0E\u4F4D\u9636", "textures/ui/trash").button("\xA7l\xA77\u2B05 \u8FD4\u56DE\u7BA1\u7406\u5458\u83DC\u5355", "textures/ui/undo");
    form.show(player).then((res) => {
      if (res.canceled) {
        if (onBack) onBack();
        return;
      }
      switch (res.selection) {
        case 0:
          LotmManager.setPathway(player, "seer");
          Utils.broadcast(`\xA75\xA7l[\u5F00\u53D1\u8005\u8C03\u8BD5] \xA7e\u7BA1\u7406\u5458 \xA7f${player.name} \xA7e\u4E00\u952E\u664B\u5347\u4E3A \xA75\u3010\u5E8F\u52177: \u9B54\u672F\u5E08\u3011\xA7e\uFF01`);
          Utils.sound.success(player);
          break;
        case 1:
          LotmManager.setSequence(player, 8);
          Utils.broadcast(`\xA7c\xA7l[\u5F00\u53D1\u8005\u8C03\u8BD5] \xA7e\u7BA1\u7406\u5458 \xA7f${player.name} \xA7e\u4E00\u952E\u664B\u5347\u4E3A \xA7c\u3010\u5E8F\u52178: \u5C0F\u4E11\u3011\xA7e\uFF01`);
          Utils.sound.success(player);
          break;
        case 2:
          LotmManager.setSequence(player, 9);
          Utils.broadcast(`\xA79\xA7l[\u5F00\u53D1\u8005\u8C03\u8BD5] \xA7e\u7BA1\u7406\u5458 \xA7f${player.name} \xA7e\u4E00\u952E\u664B\u5347\u4E3A \xA79\u3010\u5E8F\u52179: \u5360\u535C\u5BB6\u3011\xA7e\uFF01`);
          Utils.sound.success(player);
          break;
        case 3:
          Utils.setProp(player, "lotm:digestion", 100);
          Utils.tell(player, "\xA7a\xA7l[\u8C03\u8BD5\u6210\u529F] \xA7e\u5F53\u524D\u5E8F\u5217\u9B54\u836F\u6D88\u5316\u5EA6\u5DF2\u6210\u529F\u8BBE\u4E3A \xA7a100%\xA7e\uFF01");
          Utils.sound.success(player);
          break;
        case 4:
          const maxSp = LotmManager.getMaxSpirituality(player);
          Utils.setProp(player, "lotm:sp", maxSp);
          Utils.tell(player, `\xA7b\xA7l[\u8C03\u8BD5\u6210\u529F] \xA7e\u7075\u6027\u503C\u5DF2\u77AC\u95F4\u56DE\u6EE1\u81F3 \xA7b${maxSp} \u70B9\xA7e\uFF01`);
          Utils.sound.success(player);
          break;
        case 5:
          LotmManager.setPathway(player, "none");
          Utils.tell(player, "\xA7e\xA7l[\u91CD\u7F6E\u6210\u529F] \xA77\u4F60\u5DF2\u91CD\u7F6E\u4E3A\u666E\u901A\u4EBA\u8EAB\u4EFD\u3002");
          Utils.sound.warn(player);
          break;
        case 6:
          if (onBack) onBack();
          return;
      }
      if (onBack) onBack();
    });
  }
  /**
   * 管理员修改指定玩家金币
   */
  static openPlayerMoneyAdmin(player, onBack = null) {
    const onlinePlayers = world19.getAllPlayers();
    const playerNames = onlinePlayers.map((p) => p.name);
    const form = new ModalFormData5().title("\xA7l\xA76\u{1F4B5} \u73A9\u5BB6\u91D1\u5E01\u8C03\u63A7").dropdown("\u9009\u62E9\u76EE\u6807\u73A9\u5BB6", playerNames).dropdown("\u64CD\u4F5C\u7C7B\u578B", ["\u589E\u52A0\u91D1\u5E01 (+)", "\u6263\u9664\u91D1\u5E01 (-)", "\u76F4\u63A5\u8BBE\u5B9A (=)"]).textField("\u8F93\u5165\u53D8\u52A8\u91D1\u5E01\u6570\u503C", "\u4F8B\u5982: 10000");
    Utils.showForm(player, form, (res) => {
      if (res.canceled) {
        if (onBack) onBack();
        return;
      }
      const [pIndex, opIndex, amountStr] = res.formValues;
      const targetPlayer = onlinePlayers[pIndex];
      const amount = parseInt(amountStr);
      if (isNaN(amount) || amount <= 0) {
        Utils.tell(player, "\xA7c\u8BF7\u8F93\u5165\u6709\u6548\u7684\u6570\u5B57\uFF01");
        if (onBack) onBack();
        return;
      }
      if (!Utils.isValid(targetPlayer)) {
        Utils.tell(player, "\xA7c\u76EE\u6807\u73A9\u5BB6\u5DF2\u65E0\u6548\uFF01");
        if (onBack) onBack();
        return;
      }
      if (opIndex === 0) {
        EconomyManager.addBalance(targetPlayer, amount);
        Utils.tell(player, `\xA7a\u5DF2\u4E3A\u73A9\u5BB6 \xA7e${targetPlayer.name} \xA7a\u589E\u52A0 ${Utils.formatCurrency(amount)}`);
        Utils.tell(targetPlayer, `\xA7a\u7BA1\u7406\u5458\u4E3A\u4F60\u53D1\u653E\u4E86 ${Utils.formatCurrency(amount)}\uFF01`);
      } else if (opIndex === 1) {
        EconomyManager.removeBalance(targetPlayer, amount);
        Utils.tell(player, `\xA7a\u5DF2\u6263\u9664\u73A9\u5BB6 \xA7e${targetPlayer.name} \xA7a\u7684 ${Utils.formatCurrency(amount)}`);
      } else if (opIndex === 2) {
        EconomyManager.setBalance(targetPlayer, amount);
        Utils.tell(player, `\xA7a\u5DF2\u5C06\u73A9\u5BB6 \xA7e${targetPlayer.name} \xA7a\u7684\u91D1\u5E01\u8BBE\u7F6E\u4E3A ${Utils.formatCurrency(amount)}`);
      }
      Utils.sound.success(player);
      if (onBack) onBack();
    });
  }
  /**
   * 强制删除当前所处地皮
   */
  static forceDeleteCurrentPlot(player, onBack = null) {
    const { chunkX, chunkZ } = Utils.getChunkCoords(player.location);
    const dimension = player.dimension.id;
    const plot = LandManager.getPlot(dimension, chunkX, chunkZ);
    if (!plot) {
      Utils.tell(player, `\xA7c\u5F53\u524D\u533A\u5757 [${chunkX}, ${chunkZ}] \u6682\u65E0\u5730\u76AE\u9886\u5730\uFF01\u65E0\u9700\u5220\u9664\u3002`);
      if (onBack) onBack();
      return;
    }
    new MessageFormData5().title("\xA7l\xA74\u26A0\uFE0F \u786E\u8BA4\u5F3A\u62C6\u5730\u76AE").body(`\xA7c\u786E\u5B9A\u8981\u5F3A\u5236\u6E05\u9664\u5730\u76AE \xA7e${plot.name} \xA7c\u5417\uFF1F
\xA7f\u6240\u5C5E\u73A9\u5BB6: \xA7e${plot.ownerName}
\xA7f\u533A\u5757\u5750\u6807: \xA77[${chunkX}, ${chunkZ}]
\xA7c\u6B64\u64CD\u4F5C\u4E0D\u53EF\u64A4\u9500\uFF01`).button1("\xA7l\xA74\u786E\u8BA4\u5220\u9664").button2("\xA7l\xA77\u53D6\u6D88").show(player).then((res) => {
      if (res.selection === 0) {
        LandManager.deletePlot(dimension, chunkX, chunkZ);
        Utils.tell(player, `\xA7a\u5DF2\u6210\u529F\u5F3A\u884C\u5220\u9664\u8BE5\u5730\u76AE\uFF01`);
        Utils.sound.success(player);
      }
      if (onBack) onBack();
    });
  }
  /**
   * 发布全服公告
   */
  static openBroadcastModal(player, onBack = null) {
    new ModalFormData5().title("\xA7l\xA7e\u{1F4E2} \u53D1\u5E03\u5168\u670D\u516C\u544A").textField("\u516C\u544A\u5185\u5BB9", "\u8F93\u5165\u4F60\u8981\u5E7F\u64AD\u7684\u6D88\u606F...").show(player).then((res) => {
      if (res.canceled) {
        if (onBack) onBack();
        return;
      }
      const [content] = res.formValues;
      if (!content || content.trim().length === 0) {
        Utils.tell(player, "\xA7c\u516C\u544A\u5185\u5BB9\u4E0D\u80FD\u4E3A\u7A7A\uFF01");
      } else {
        Utils.broadcast(`\xA7e[\u7BA1\u7406\u5458 ${player.name}] \xA7f${content}`);
        Utils.sound.success(player);
      }
      if (onBack) onBack();
    });
  }
  /**
   * 全服在线玩家发放福利金币
   */
  static openGiftAllModal(player, onBack = null) {
    new ModalFormData5().title("\xA7l\xA7a\u{1F381} \u5168\u670D\u53D1\u653E\u798F\u5229\u91D1\u5E01").textField("\u6BCF\u4EBA\u53D1\u653E\u91D1\u989D", "\u4F8B\u5982: 5000").show(player).then((res) => {
      if (res.canceled) {
        if (onBack) onBack();
        return;
      }
      const [amountStr] = res.formValues;
      const amount = parseInt(amountStr);
      if (isNaN(amount) || amount <= 0) {
        Utils.tell(player, "\xA7c\u8BF7\u8F93\u5165\u6709\u6548\u7684\u6570\u5B57\uFF01");
      } else {
        const players = world19.getAllPlayers();
        for (const p of players) {
          if (Utils.isValid(p)) {
            EconomyManager.addBalance(p, amount);
            Utils.tell(p, `\xA76\u{1F389} \u7BA1\u7406\u5458\u5411\u5168\u670D\u53D1\u653E\u4E86\u798F\u5229\uFF01\u4F60\u83B7\u5F97\u4E86 ${Utils.formatCurrency(amount)}\uFF01`);
          }
        }
        Utils.broadcast(`\xA7a\u7BA1\u7406\u5458 \xA7e${player.name} \xA7a\u5411\u5168\u670D\u5728\u7EBF\u73A9\u5BB6\u53D1\u653E\u4E86\u6BCF\u4EBA ${Utils.formatCurrency(amount)} \u7684\u798F\u5229\u793C\u91D1\uFF01`);
        Utils.sound.success(player);
      }
      if (onBack) onBack();
    });
  }
};

// scripts/main.js
function initSystem() {
  console.warn(`[SAPI System] Initializing ${Config.system.serverName} v${Config.system.version}...`);
  try {
    EconomyManager.getObjective();
  } catch (e) {
    console.warn(`[Economy] Scoreboard init warning: ${e}`);
  }
  LandManager.registerProtectionEvents();
  LotmManager.init();
  console.warn(`[SAPI System] All modules (Economy, Shop, Land, Lottery, LOTM) initialized successfully!`);
}
system15.run(() => {
  initSystem();
});
world20.afterEvents.playerSpawn.subscribe((event) => {
  const { player, initialSpawn } = event;
  if (!Utils.isValid(player)) return;
  EconomyManager.getBalance(player);
  LotmManager.applyHealthProfile(player);
  if (initialSpawn) {
    Utils.tell(player, `\xA7a\u6B22\u8FCE\u6765\u5230 ${Config.system.serverName} \xA7a\u670D\u52A1\u5668\uFF01`);
    Utils.tell(player, `\xA77\u63D0\u793A\uFF1A\u8F93\u5165 \xA7e!menu \xA77\u6216\u624B\u6301\u7F57\u76D8\u53F3\u952E\u53EF\u968F\u65F6\u6253\u5F00\u7CFB\u7EDF\u83DC\u5355\u3002`);
    Utils.tell(player, `\xA75\u63D0\u793A\uFF1A\u8F93\u5165 \xA7d!lotm \xA75\u53EF\u63A2\u7D22\u300A\u8BE1\u79D8\u4E4B\u4E3B\u300B\u591A\u9014\u5F84\u8D85\u51E1\u79D8\u5178\uFF01`);
    if (Config.system.giveMenuItemOnJoin) {
      const hasCompass = Utils.countItem(player, Config.system.menuItem) > 0;
      if (!hasCompass) {
        Utils.giveItem(
          player,
          Config.system.menuItem,
          1,
          Config.system.menuItemName,
          ["\xA77\u53F3\u952E\u4F7F\u7528\u53EF\u5FEB\u901F\u6253\u5F00\u7EFC\u5408\u83DC\u5355", "\xA77\u5305\u542B\uFF1A\u5546\u5E97\u3001\u94F6\u884C\u3001\u5730\u76AE\u3001\u62BD\u5956\u3001\u975E\u51E1"]
        );
      }
    }
  }
});
world20.afterEvents.itemUse.subscribe((event) => {
  const { source: player, itemStack } = event;
  if (!Utils.isValid(player) || !itemStack) return;
  const typeId = itemStack.typeId;
  if (typeId === "minecraft:compass" || typeId === Config.system.menuItem) {
    system15.run(() => {
      MenuManager.openMainMenu(player);
    });
    return;
  }
  system15.run(() => {
    LotmManager.handleItemUse(player, itemStack);
  });
});
world20.beforeEvents.playerInteractWithBlock.subscribe((event) => {
  const { player, itemStack } = event;
  if (!Utils.isValid(player)) return;
  if (itemStack && (itemStack.typeId === "minecraft:compass" || itemStack.typeId === Config.system.menuItem)) {
    event.cancel = true;
    system15.run(() => {
      MenuManager.openMainMenu(player);
    });
    return;
  }
  if (!itemStack) {
    const pathway = LotmManager.getPathway(player);
    if (pathway === "seer") {
      event.cancel = true;
      system15.run(() => {
        LotmManager.fireAirBullet(player);
      });
      return;
    } else if (pathway === "hunter") {
      event.cancel = true;
      system15.run(() => {
        if (player.isSneaking) LotmManager.PathwayHunter.triggerFlameTide(player, LotmManager);
        else LotmManager.PathwayHunter.fireFlameSpear(player, LotmManager);
      });
      return;
    } else if (pathway === "sun") {
      event.cancel = true;
      system15.run(() => {
        if (player.isSneaking) LotmManager.PathwaySun.triggerSunHalo(player, LotmManager);
        else LotmManager.PathwaySun.castHolyLight(player, LotmManager);
      });
      return;
    } else if (pathway === "moon") {
      event.cancel = true;
      system15.run(() => {
        if (player.isSneaking) LotmManager.PathwayMoon.triggerDarkWings(player, LotmManager);
        else LotmManager.PathwayMoon.corrosiveClaws(player, LotmManager);
      });
      return;
    } else if (pathway === "assassin") {
      event.cancel = true;
      system15.run(() => {
        if (player.isSneaking) LotmManager.PathwayAssassin.performMirrorSubstitute(player, LotmManager);
        else LotmManager.PathwayAssassin.castBlackFlame(player, LotmManager);
      });
      return;
    }
  }
  if (itemStack && itemStack.typeId && itemStack.typeId.startsWith("lotm:")) {
    event.cancel = true;
    system15.run(() => {
      LotmManager.handleItemUse(player, itemStack);
    });
    return;
  }
});
world20.beforeEvents.playerInteractWithEntity.subscribe((event) => {
  const { player, itemStack } = event;
  if (!Utils.isValid(player)) return;
  if (itemStack && (itemStack.typeId === "minecraft:compass" || itemStack.typeId === Config.system.menuItem)) {
    event.cancel = true;
    system15.run(() => {
      MenuManager.openMainMenu(player);
    });
    return;
  }
  if (!itemStack) {
    const pathway = LotmManager.getPathway(player);
    if (pathway === "seer") {
      event.cancel = true;
      system15.run(() => {
        LotmManager.fireAirBullet(player);
      });
      return;
    } else if (pathway === "hunter") {
      event.cancel = true;
      system15.run(() => {
        if (player.isSneaking) LotmManager.PathwayHunter.triggerFlameTide(player, LotmManager);
        else LotmManager.PathwayHunter.fireFlameSpear(player, LotmManager);
      });
      return;
    } else if (pathway === "sun") {
      event.cancel = true;
      system15.run(() => {
        if (player.isSneaking) LotmManager.PathwaySun.triggerSunHalo(player, LotmManager);
        else LotmManager.PathwaySun.castHolyLight(player, LotmManager);
      });
      return;
    } else if (pathway === "moon") {
      event.cancel = true;
      system15.run(() => {
        if (player.isSneaking) LotmManager.PathwayMoon.triggerDarkWings(player, LotmManager);
        else LotmManager.PathwayMoon.corrosiveClaws(player, LotmManager);
      });
      return;
    } else if (pathway === "assassin") {
      event.cancel = true;
      system15.run(() => {
        if (player.isSneaking) LotmManager.PathwayAssassin.performMirrorSubstitute(player, LotmManager);
        else LotmManager.PathwayAssassin.castBlackFlame(player, LotmManager);
      });
      return;
    }
  }
  if (itemStack && itemStack.typeId && itemStack.typeId.startsWith("lotm:")) {
    event.cancel = true;
    system15.run(() => {
      LotmManager.handleItemUse(player, itemStack);
    });
    return;
  }
});
world20.afterEvents.entityHurt.subscribe((event) => {
  const { hurtEntity, damage, damageSource } = event;
  const attacker = damageSource && damageSource.damagingEntity;
  if (attacker && attacker.typeId === "minecraft:player" && hurtEntity) {
    LotmManager.handleAttackHit(attacker, hurtEntity);
  }
  if (!hurtEntity || hurtEntity.typeId !== "minecraft:player") return;
  const player = (
    /** @type {import("@minecraft/server").Player} */
    hurtEntity
  );
  if (!Utils.isValid(player)) return;
  LotmManager.playerInCombat.set(player.id, system15.currentTick);
  try {
    const hp = player.getComponent("health");
    if (hp && hp.currentValue <= damage + 2) {
      LotmManager.triggerFatalSubstitute(player);
    }
  } catch {
  }
});
world20.beforeEvents.chatSend.subscribe((event) => {
  const { sender: player, message } = event;
  const msg = message.trim().toLowerCase();
  if (msg === "!menu" || msg === "!cd" || msg === "!caidan" || msg === "\uFF01\u83DC\u5355" || msg === "!\u83DC\u5355") {
    event.cancel = true;
    system15.run(() => MenuManager.openMainMenu(player));
    return;
  }
  if (msg === "!lotm" || msg === "!guimi" || msg === "!\u975E\u51E1" || msg === "!\u9014\u5F84") {
    event.cancel = true;
    system15.run(() => LotmManager.openAbilityMenu(player));
    return;
  }
  if (msg === "!shop" || msg === "!\u5546\u5E97" || msg === "!sd") {
    event.cancel = true;
    system15.run(() => ShopManager.openShopCategoryUI(player));
    return;
  }
  if (msg === "!land" || msg === "!plot" || msg === "!\u5730\u76AE" || msg === "!\u9886\u5730") {
    event.cancel = true;
    system15.run(() => LandManager.openPlotMainUI(player));
    return;
  }
  if (msg === "!lottery" || msg === "!choujiang" || msg === "!\u62BD\u5956" || msg === "!cj") {
    event.cancel = true;
    system15.run(() => LotteryManager.openLotteryMainUI(player));
    return;
  }
  if (msg === "!pay" || msg === "!\u8F6C\u8D26" || msg === "!zz") {
    event.cancel = true;
    system15.run(() => EconomyManager.openTransferUI(player));
    return;
  }
  if (msg === "!money" || msg === "!balance" || msg === "!\u91D1\u5E01" || msg === "!qb") {
    event.cancel = true;
    system15.run(() => EconomyManager.openBankUI(player));
    return;
  }
  if (msg === "!admin" || msg === "!gm" || msg === "!op") {
    event.cancel = true;
    system15.run(() => MenuManager.openAdminConsole(player));
    return;
  }
  if (msg.startsWith("!seq7 ") || msg.startsWith("!seq ")) {
    event.cancel = true;
    const arg = msg.split(" ")[1];
    const aliasMap = {
      magician: "seer",
      seer: "seer",
      \u9B54\u672F\u5E08: "seer",
      \u5360\u535C\u5BB6: "seer",
      pyro: "hunter",
      hunter: "hunter",
      \u7EB5\u706B\u5BB6: "hunter",
      \u730E\u4EBA: "hunter",
      weapon: "warrior",
      warrior: "warrior",
      \u6B66\u5668\u5927\u5E08: "warrior",
      \u6218\u58EB: "warrior",
      nightmare: "darkness",
      darkness: "darkness",
      \u68A6\u9B47: "darkness",
      \u4E0D\u7720\u8005: "darkness",
      sun: "sun",
      \u592A\u9633\u795E\u5B98: "sun",
      \u592A\u9633: "sun",
      vampire: "moon",
      moon: "moon",
      \u5438\u8840\u9B3C: "moon",
      \u836F\u5E08: "moon",
      witch: "assassin",
      assassin: "assassin",
      \u5973\u5DEB: "assassin",
      \u523A\u5BA2: "assassin",
      none: "none",
      "0": "none",
      \u666E\u901A\u4EBA: "none"
    };
    const targetPathway = aliasMap[arg];
    if (targetPathway) {
      system15.run(() => {
        LotmManager.setPathway(player, targetPathway);
        LotmManager.giveFocusKit(player);
        const profile = LotmManager.PathwayProfileRegistry.getProfile(targetPathway);
        Utils.broadcast(`\xA75\xA7l[\u5E8F\u5217\u664B\u5347] \xA7e\u73A9\u5BB6 \xA7f${player.name} \xA7e\u664B\u5347\u4E3A \xA76${profile.title} \xA7e(\u8840\u91CF: ${profile.maxHealth} HP, \u7075\u6027: ${profile.maxSpirituality})\uFF01`);
        Utils.sound.success(player);
      });
    } else {
      Utils.tell(player, "\xA7c\u53EF\u7528\u5E8F\u52177\u9014\u5F84\uFF1Amagician (\u9B54\u672F\u5E08), pyro (\u7EB5\u706B\u5BB6), weapon (\u6B66\u5668\u5927\u5E08), nightmare (\u68A6\u9B47), sun (\u592A\u9633\u795E\u5B98), vampire (\u5438\u8840\u9B3C), witch (\u5973\u5DEB), none (\u666E\u901A\u4EBA)");
    }
    return;
  }
  if (msg.startsWith("!artifact give ")) {
    event.cancel = true;
    const artId = msg.replace("!artifact give ", "").trim();
    const fullId = artId.startsWith("lotm:") ? artId : `lotm:${artId}`;
    system15.run(() => {
      if (LotmManager.ArtifactManager.isArtifact(fullId)) {
        Utils.giveItem(player, fullId, 1, `\xA7l\xA76\u3010\u975E\u51E1\u5C01\u5370\u7269\u3011\xA7c${artId}`, ["\xA77\u7531\u5F00\u53D1\u8005\u63A7\u5236\u53F0\u9881\u53D1", "\xA7c\u6CE8\u610F\uFF1A\u5177\u6709\u8D1F\u9762\u4EE3\u4EF7\u4E0E\u6536\u5BB9\u8981\u6C42"]);
        Utils.tell(player, `\xA7a\u5DF2\u751F\u6210\u975E\u51E1\u6B66\u5668\u3010${fullId}\u3011\uFF01\u8F93\u5165 !artifact inspect \u53EF\u67E5\u770B\u5176\u4EE3\u4EF7\u4E0E\u6536\u5BB9\u8981\u6C42\u3002`);
        Utils.sound.success(player);
      } else {
        Utils.tell(player, "\xA7c\u65E0\u6548\u7684\u975E\u51E1\u6B66\u5668ID\uFF01\u53EF\u9009: ashen_reaper, dawn_greatsword, silent_pointer, blood_moon_rapier, mirror_split_dagger, arsenal_box, death_knell");
      }
    });
    return;
  }
  if (msg === "!artifact inspect" || msg === "!artifact" || msg === "!\u5C01\u5370\u7269") {
    event.cancel = true;
    system15.run(() => {
      LotmManager.ArtifactManager.inspect(player);
    });
    return;
  }
  if (msg === "!profile" || msg === "!\u5C5E\u6027") {
    event.cancel = true;
    system15.run(() => {
      const pathway = LotmManager.getPathway(player);
      const profile = LotmManager.PathwayProfileRegistry.getProfile(pathway);
      const sp = LotmManager.getSpirituality(player);
      Utils.tell(
        player,
        `\xA76\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u3010\u975E\u51E1\u4F53\u8D28\u6863\u6848\u3011\u2550\u2550\u2550\u2550\u2550\u2550\u2550
\xA7f\u9014\u5F84\u540D\u79F0: \xA7e${profile.name} (${profile.sequenceName})
\xA7f\u6700\u5927\u751F\u547D: \xA7c${profile.maxHealth} HP \xA77(${profile.maxHealth / 2} \u9897\u5FC3)
\xA7f\u5F53\u524D\u7075\u6027: \xA7d${sp} \xA77/ \xA7e${profile.maxSpirituality} \u2727
\xA7f\u8131\u6218\u56DE\u7075: \xA7a+${profile.regenOutOfCombat}/s \xA78| \xA7f\u6218\u6597\u56DE\u7075: \xA7a+${profile.regenInCombat}/s
\xA76\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`
      );
    });
    return;
  }
  if (msg === "!givefocus" || msg === "!\u5A92\u4ECB") {
    event.cancel = true;
    system15.run(() => {
      LotmManager.giveFocusKit(player);
      Utils.sound.success(player);
    });
    return;
  }
  if (msg === "!sp" || msg === "!\u7075\u6027") {
    event.cancel = true;
    system15.run(() => {
      const max = LotmManager.getMaxSpirituality(player);
      Utils.setProp(player, "lotm:sp", max);
      Utils.tell(player, `\xA7b\xA7l[\u7075\u6027\u5145\u76C8] \xA7e\u7075\u6027\u503C\u5DF2\u77AC\u95F4\u56DE\u6EE1\u81F3 \xA7b${max} \u70B9\xA7e\uFF01`);
      Utils.sound.success(player);
    });
    return;
  }
  if (msg === "!status list" || msg === "!\u72B6\u6001") {
    event.cancel = true;
    system15.run(() => {
      const statuses = LotmManager.StatusEffectManager.entityStatuses.get(player.id);
      if (!statuses || statuses.size === 0) {
        Utils.tell(player, "\xA7a\u5F53\u524D\u8EAB\u4E0A\u6CA1\u6709\u4EFB\u4F55\u8D1F\u9762\u6216\u63A7\u5236\u975E\u51E1\u72B6\u6001\uFF01");
      } else {
        let text = "\xA76\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u3010\u5F53\u524D\u975E\u51E1\u72B6\u6001\u3011\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n";
        for (const [sName, sData] of statuses.entries()) {
          const remainSec = Math.max(0, Math.ceil((sData.expiresAtTick - system15.currentTick) / 20));
          text += `\xA7e\u2022 ${sName}: \xA7f\u5269\u4F59 ${remainSec} \u79D2 (\u5F3A\u5EA6: ${sData.value})
`;
        }
        text += "\xA76\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550";
        Utils.tell(player, text);
      }
    });
    return;
  }
  if (msg === "!status clear" || msg === "!\u6E05\u9664\u72B6\u6001") {
    event.cancel = true;
    system15.run(() => {
      LotmManager.StatusEffectManager.clearAllStatuses(player);
      Utils.tell(player, "\xA7a\u6240\u6709\u975E\u51E1\u72B6\u6001\u5DF2\u5168\u90E8\u6E05\u9664\uFF01");
      Utils.sound.success(player);
    });
    return;
  }
  if (msg === "!combatlog" || msg === "!\u65E5\u5FD7") {
    event.cancel = true;
    system15.run(() => {
      const cur = LotmManager.ArtifactManager.combatLogEnabled.get(player.id) || false;
      LotmManager.ArtifactManager.combatLogEnabled.set(player.id, !cur);
      Utils.tell(player, `\xA7e[\u6218\u6597\u65E5\u5FD7] \u5DF2${!cur ? "\xA7a\u5F00\u542F" : "\xA7c\u5173\u95ED"}\u8BE6\u7EC6\u975E\u51E1\u6218\u6597\u7ED3\u7B97\u65E5\u5FD7\uFF01`);
    });
    return;
  }
});
system15.afterEvents.scriptEventReceive.subscribe((event) => {
  const { id, sourceEntity } = event;
  if (!sourceEntity || sourceEntity.typeId !== "minecraft:player") return;
  const player = (
    /** @type {import("@minecraft/server").Player} */
    sourceEntity
  );
  if (id === "system:menu" || id === "gui:menu" || id === "menu:open") {
    MenuManager.openMainMenu(player);
  } else if (id === "system:lotm" || id === "gui:lotm" || id === "lotm:open") {
    LotmManager.openAbilityMenu(player);
  } else if (id === "system:shop" || id === "gui:shop" || id === "shop:open") {
    ShopManager.openShopCategoryUI(player);
  } else if (id === "system:land" || id === "gui:land" || id === "land:open") {
    LandManager.openPlotMainUI(player);
  } else if (id === "system:lottery" || id === "gui:lottery" || id === "lottery:open") {
    LotteryManager.openLotteryMainUI(player);
  } else if (id === "system:bank" || id === "gui:bank" || id === "bank:open") {
    EconomyManager.openBankUI(player);
  }
});
