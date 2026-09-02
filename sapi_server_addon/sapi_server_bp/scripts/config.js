/**
 * SAPI 综合系统 - 全局配置文件
 * 包含：经济、商店、地皮领地、幸运抽奖、基础交互配置
 */

export const Config = {
    // -------------------------------------------------------------
    // 基础与系统配置
    // -------------------------------------------------------------
    system: {
        serverName: "§l§ePixel§bWorld§r",
        version: "2.6.2",
        adminTag: "admin", // 拥有此 tag 或 op 的玩家拥有管理员权限
        menuItem: "minecraft:compass", // 右键唤起主菜单的物品 ID
        menuItemName: "§r§l§6快捷导航菜单 §8(右键使用)",
        giveMenuItemOnJoin: true, // 新玩家加入时是否赠送菜单罗盘
        chatPrefixes: ["!menu", "!cd", "!caidan", "！菜单", "!shop", "!land", "!lottery", "!market", "!ah", "!pay", "!money", "!warp", "!spawn", "!home", "!tpa", "!back", "!daily", "!dungeon", "!redeem", "!region", "!audit", "!disaster"],
    },

    // 公共传送点：不收费，仅设置短冷却防止误触刷屏
    teleport: {
        maxWarps: 50,
        cooldownSeconds: 2,
        safeSearchRadiusY: 16,
        safeSearchRadiusXZ: 4,
        maxHomes: 3,
        tpaExpirySeconds: 60,
        consumeDeathBack: true,
    },

    audit: {
        maxEntries: 200,
    },

    operations: {
        tpaEnabled: true,
        tpaToEnabled: true,
        tpaHereEnabled: true,
        dailyEnabled: true,
        redeemEnabled: true,
        timezoneOffsetMinutes: 480,
        dailyMoney: [200, 250, 300, 350, 400, 500, 800],
        daySevenItem: "minecraft:diamond",
        daySevenAmount: 1,
        maxCodes: 50,
    },

    // 管理员主城/区域保护，优先于玩家地皮
    regions: {
        maxRegions: 50,
        maxVolume: 4000000,
        defaultPriority: 100,
        defaultFlags: {
            allowBreak: false,
            allowPlace: false,
            allowBlockInteract: true,
            allowEntityInteract: true,
            allowPvp: false,
            allowExplosion: false,
            allowLandClaim: false,
        }
    },

    // -------------------------------------------------------------
    // 经济系统配置
    // -------------------------------------------------------------
    economy: {
        currencyName: "§6金币§r",
        currencySymbol: "§e⛁§r",
        scoreboardObjective: "money", // 绑定的原版计分板名称
        initialBalance: 1000, // 新玩家初始金币
        minTransferAmount: 1, // 最低转账金额
        maxTransferAmount: 10000000, // 单次最高转账金额
    },

    // -------------------------------------------------------------
    // 玩家寄卖行
    // -------------------------------------------------------------
    market: {
        feeRate: 0.10,
        maxListings: 200,
        maxListingsPerPlayer: 10,
        maxUnitPrice: 100000000,
        maxListingNameLength: 32,
    },

    // -------------------------------------------------------------
    // 地皮/领地保护系统配置
    // -------------------------------------------------------------
    land: {
        pricePerChunk: 3000, // 购买一个 16x16 区块地皮的价格
        sellRefundRate: 0.7, // 出售地皮返还金币比例 (0.7 = 70%)
        maxPlotsPerPlayer: 5, // 普通玩家最多拥有地皮数量
        maxPlotsForAdmin: 999, // 管理员最多拥有地皮数量
        particleBorderType: "minecraft:villager_happy", // 边界粒子效果类型
        borderParticleSeconds: 8, // 边界粒子持续显示秒数
        // 领地默认权限开关
        defaultFlags: {
            allowBreak: false,       // 允许非主人破坏方块
            allowPlace: false,       // 允许非主人放置方块
            allowInteract: false,    // 允许非主人使用容器/门/开关
            allowAttackEntity: false,// 允许非主人攻击实体/动物
            allowExplosion: false,   // 允许领地内发生爆炸破坏方块
        }
    },

    // -------------------------------------------------------------
    // 商店系统商品配置
    // -------------------------------------------------------------
    shop: {
        categories: [
            {
                id: "building",
                name: "§a建筑方块",
                icon: "textures/blocks/stonebrick",
                description: "各类精美建筑材料与装饰方块",
                items: [
                    { id: "minecraft:stone", name: "§8石头", buyPrice: 2, sellPrice: 1, icon: "textures/blocks/stone" },
                    { id: "minecraft:cobblestone", name: "§8圆石", buyPrice: 2, sellPrice: 1, icon: "textures/blocks/cobblestone" },
                    { id: "minecraft:oak_log", name: "§6橡木原木", buyPrice: 8, sellPrice: 4, icon: "textures/blocks/log_oak" },
                    { id: "minecraft:glass", name: "§0玻璃", buyPrice: 4, sellPrice: 2, icon: "textures/blocks/glass" },
                    { id: "minecraft:stonebrick", name: "§8石砖", buyPrice: 4, sellPrice: 2, icon: "textures/blocks/stonebrick" },
                    { id: "minecraft:sea_lantern", name: "§b海晶灯", buyPrice: 40, sellPrice: 15, icon: "textures/blocks/sea_lantern" },
                    { id: "minecraft:glowstone", name: "§e荧石", buyPrice: 30, sellPrice: 10, icon: "textures/blocks/glowstone" },
                    { id: "minecraft:obsidian", name: "§5黑曜石", buyPrice: 80, sellPrice: 30, icon: "textures/blocks/obsidian" },
                    { id: "minecraft:smooth_quartz", name: "§0平滑石英块", buyPrice: 25, sellPrice: 8, icon: "textures/blocks/quartz_block_bottom" },
                ]
            },
            {
                id: "minerals",
                name: "§b矿石资源",
                icon: "textures/items/diamond",
                description: "用于合成装备与机械的原矿金属",
                items: [
                    { id: "minecraft:coal", name: "§8煤炭", buyPrice: 5, sellPrice: 2, icon: "textures/items/coal" },
                    { id: "minecraft:copper_ingot", name: "§6铜锭", buyPrice: 8, sellPrice: 3, icon: "textures/items/copper_ingot" },
                    { id: "minecraft:iron_ingot", name: "§0铁锭", buyPrice: 20, sellPrice: 8, icon: "textures/items/iron_ingot" },
                    { id: "minecraft:gold_ingot", name: "§e金锭", buyPrice: 40, sellPrice: 18, icon: "textures/items/gold_ingot" },
                    { id: "minecraft:redstone", name: "§c红石粉", buyPrice: 8, sellPrice: 3, icon: "textures/items/redstone_dust" },
                    { id: "minecraft:lapis_lazuli", name: "§9青金石", buyPrice: 8, sellPrice: 3, icon: "textures/items/dye_powder_blue" },
                    { id: "minecraft:emerald", name: "§a绿宝石", buyPrice: 100, sellPrice: 45, icon: "textures/items/emerald" },
                    { id: "minecraft:diamond", name: "§b钻石", buyPrice: 200, sellPrice: 90, icon: "textures/items/diamond" },
                    { id: "minecraft:netherite_ingot", name: "§8下界合金锭", buyPrice: 2500, sellPrice: 1000, icon: "textures/items/netherite_ingot" },
                ]
            },
            {
                id: "food",
                name: "§e农牧食物",
                icon: "textures/items/beef_cooked",
                description: "恢复饥饿度与生存补给品",
                items: [
                    { id: "minecraft:bread", name: "§6面包", buyPrice: 5, sellPrice: 2, icon: "textures/items/bread" },
                    { id: "minecraft:cooked_beef", name: "§c熟牛肉", buyPrice: 12, sellPrice: 5, icon: "textures/items/beef_cooked" },
                    { id: "minecraft:cooked_porkchop", name: "§6熟猪排", buyPrice: 12, sellPrice: 5, icon: "textures/items/porkchop_cooked" },
                    { id: "minecraft:golden_carrot", name: "§e金胡萝卜", buyPrice: 35, sellPrice: 12, icon: "textures/items/carrot_golden" },
                    { id: "minecraft:golden_apple", name: "§6金苹果", buyPrice: 150, sellPrice: 60, icon: "textures/items/apple_golden" },
                    { id: "minecraft:enchanted_golden_apple", name: "§d附魔金苹果", buyPrice: 3000, sellPrice: 1000, icon: "textures/items/apple_golden" },
                    { id: "minecraft:experience_bottle", name: "§a附魔之瓶", buyPrice: 25, sellPrice: 8, icon: "textures/items/experience_bottle" },
                    { id: "minecraft:wheat", name: "§e小麦", buyPrice: 4, sellPrice: 2, icon: "textures/items/wheat" },
                ]
            },
            {
                id: "equipment",
                name: "§c战斗装备",
                icon: "textures/items/diamond_sword",
                description: "武器、防具及常用冒险工具",
                items: [
                    { id: "minecraft:diamond_sword", name: "§b钻石剑", buyPrice: 500, sellPrice: 150, icon: "textures/items/diamond_sword" },
                    { id: "minecraft:diamond_pickaxe", name: "§b钻石镐", buyPrice: 700, sellPrice: 200, icon: "textures/items/diamond_pickaxe" },
                    { id: "minecraft:diamond_helmet", name: "§b钻石头盔", buyPrice: 1000, sellPrice: 300, icon: "textures/items/diamond_helmet" },
                    { id: "minecraft:diamond_chestplate", name: "§b钻石胸甲", buyPrice: 1600, sellPrice: 500, icon: "textures/items/diamond_chestplate" },
                    { id: "minecraft:diamond_leggings", name: "§b钻石护腿", buyPrice: 1400, sellPrice: 450, icon: "textures/items/diamond_leggings" },
                    { id: "minecraft:diamond_boots", name: "§b钻石靴子", buyPrice: 800, sellPrice: 250, icon: "textures/items/diamond_boots" },
                    { id: "minecraft:bow", name: "§6弓", buyPrice: 60, sellPrice: 15, icon: "textures/items/bow_standby" },
                    { id: "minecraft:arrow", name: "§0箭矢", buyPrice: 2, sellPrice: 1, icon: "textures/items/arrow" },
                    { id: "minecraft:shield", name: "§8盾牌", buyPrice: 100, sellPrice: 30, icon: "textures/items/shield" },
                ]
            },
            {
                id: "special",
                name: "§d珍品专区",
                icon: "textures/items/elytra",
                description: "极其罕见的稀世珍宝与神器",
                items: [
                    { id: "minecraft:totem_of_undying", name: "§6不死图腾", buyPrice: 4000, sellPrice: 1200, icon: "textures/items/totem" },
                    { id: "minecraft:elytra", name: "§b鞘翅", buyPrice: 15000, sellPrice: 4500, icon: "textures/items/elytra" },
                    { id: "minecraft:shulker_box", name: "§d潜影盒", buyPrice: 1800, sellPrice: 500, icon: "textures/items/shulker_top_purple" },
                    { id: "minecraft:nether_star", name: "§e下界之星", buyPrice: 10000, sellPrice: 3000, icon: "textures/items/nether_star" },
                    { id: "minecraft:ender_pearl", name: "§3末影珍珠", buyPrice: 30, sellPrice: 10, icon: "textures/items/ender_pearl" },
                    { id: "minecraft:saddle", name: "§6鞍", buyPrice: 120, sellPrice: 30, icon: "textures/items/saddle" },
                    { id: "minecraft:name_tag", name: "§e命名牌", buyPrice: 80, sellPrice: 20, icon: "textures/items/name_tag" },
                ]
            },
            {
                id: "lotm",
                name: "§5🔮 诡秘超凡专区",
                icon: "textures/items/potion_seer",
                description: "各大途径序列魔药、专属施法媒介与非凡消耗品",
                items: [
                    { id: "lotm:potion_seer", name: "§9【魔药】序列9: 占卜家", buyPrice: 1500, sellPrice: 500, icon: "textures/items/potion_seer" },
                    { id: "lotm:potion_clown", name: "§c【魔药】序列8: 小丑", buyPrice: 5000, sellPrice: 1500, icon: "textures/items/potion_clown" },
                    { id: "lotm:potion_magician", name: "§5【魔药】序列7: 魔术师", buyPrice: 18000, sellPrice: 5000, icon: "textures/items/potion_magician" },
                    { id: "lotm:potion_hunter", name: "§2【魔药】序列9: 猎人", buyPrice: 1500, sellPrice: 500, icon: "textures/items/potion_hunter" },
                    { id: "lotm:potion_provoker", name: "§6【魔药】序列8: 挑衅者", buyPrice: 5000, sellPrice: 1500, icon: "textures/items/potion_provoker" },
                    { id: "lotm:potion_pyromaniac", name: "§c【魔药】序列7: 纵火家", buyPrice: 18000, sellPrice: 5000, icon: "textures/items/potion_pyromaniac" },
                    { id: "lotm:potion_warrior", name: "§8【魔药】序列9: 战士", buyPrice: 1500, sellPrice: 500, icon: "textures/items/potion_warrior" },
                    { id: "lotm:potion_pugilist", name: "§6【魔药】序列8: 格斗家", buyPrice: 5000, sellPrice: 1500, icon: "textures/items/potion_pugilist" },
                    { id: "lotm:potion_weapon_master", name: "§6【魔药】序列7: 武器大师", buyPrice: 18000, sellPrice: 5000, icon: "textures/items/potion_weapon_master" },
                    { id: "lotm:potion_sleepless", name: "§9【魔药】序列9: 不眠者", buyPrice: 1500, sellPrice: 500, icon: "textures/items/potion_sleepless" },
                    { id: "lotm:potion_midnight_poet", name: "§1【魔药】序列8: 午夜诗人", buyPrice: 5000, sellPrice: 1500, icon: "textures/items/potion_midnight_poet" },
                    { id: "lotm:potion_nightmare", name: "§5【魔药】序列7: 梦魇", buyPrice: 18000, sellPrice: 5000, icon: "textures/items/potion_nightmare" },
                    { id: "lotm:potion_bard", name: "§e【魔药】序列9: 歌颂者", buyPrice: 1500, sellPrice: 500, icon: "textures/items/potion_bard" },
                    { id: "lotm:potion_light_supplicant", name: "§e【魔药】序列8: 祈光人", buyPrice: 5000, sellPrice: 1500, icon: "textures/items/potion_light_supplicant" },
                    { id: "lotm:potion_solar_priest", name: "§6【魔药】序列7: 太阳神官", buyPrice: 18000, sellPrice: 5000, icon: "textures/items/potion_solar_priest" },
                    { id: "lotm:potion_apothecary", name: "§a【魔药】序列9: 药师", buyPrice: 1500, sellPrice: 500, icon: "textures/items/potion_apothecary" },
                    { id: "lotm:potion_beast_tamer", name: "§2【魔药】序列8: 驯兽师", buyPrice: 5000, sellPrice: 1500, icon: "textures/items/potion_beast_tamer" },
                    { id: "lotm:potion_vampire", name: "§4【魔药】序列7: 吸血鬼", buyPrice: 18000, sellPrice: 5000, icon: "textures/items/potion_vampire" },
                    { id: "lotm:potion_assassin", name: "§8【魔药】序列9: 刺客", buyPrice: 1500, sellPrice: 500, icon: "textures/items/potion_assassin" },
                    { id: "lotm:potion_instigator", name: "§5【魔药】序列8: 教唆者", buyPrice: 5000, sellPrice: 1500, icon: "textures/items/potion_instigator" },
                    { id: "lotm:potion_witch", name: "§d【魔药】序列7: 女巫", buyPrice: 18000, sellPrice: 5000, icon: "textures/items/potion_witch" },
                    { id: "lotm:potion_sailor", name: "§3【魔药】序列9: 水手", buyPrice: 1500, sellPrice: 500, icon: "textures/items/potion_sleepless" },
                    { id: "lotm:potion_folk_of_rage", name: "§9【魔药】序列8: 暴怒之民", buyPrice: 5000, sellPrice: 1500, icon: "textures/items/potion_midnight_poet" },
                    { id: "lotm:potion_seafarer", name: "§b【魔药】序列7: 航海家", buyPrice: 18000, sellPrice: 5000, icon: "textures/items/potion_nightmare" },
                    { id: "lotm:spirit_cane", name: "§e【非凡武器】魔术师手杖", buyPrice: 1200, sellPrice: 400, icon: "textures/items/spirit_cane" },
                    { id: "lotm:paper_figurine", name: "§0【符咒媒介】符咒纸人替身", buyPrice: 200, sellPrice: 60, icon: "textures/items/paper_figurine" },
                    { id: "lotm:tarot_card", name: "§e【飞掷道具】魔术纸牌", buyPrice: 30, sellPrice: 8, icon: "textures/items/tarot_card" },
                    { id: "lotm:pyro_gauntlet", name: "§c【非凡媒介】纵火者手套", buyPrice: 3500, sellPrice: 1000, icon: "textures/items/pyro_gauntlet" },
                    { id: "lotm:alchemical_molotov", name: "§6【消耗品】炼金燃烧瓶", buyPrice: 150, sellPrice: 40, icon: "textures/items/alchemical_molotov" },
                    { id: "lotm:nightmare_watch", name: "§9【非凡媒介】梦魇怀表", buyPrice: 4000, sellPrice: 1200, icon: "textures/items/nightmare_watch" },
                    { id: "lotm:dream_dust", name: "§d【消耗品】安魂粉", buyPrice: 120, sellPrice: 35, icon: "textures/items/dream_dust" },
                    { id: "lotm:sun_emblem", name: "§e【非凡媒介】太阳圣徽", buyPrice: 3800, sellPrice: 1100, icon: "textures/items/sun_emblem" },
                    { id: "lotm:holy_water_bottle", name: "§b【消耗品】纯白圣水瓶", buyPrice: 100, sellPrice: 30, icon: "textures/items/holy_water_bottle" },
                    { id: "lotm:vampire_ring", name: "§4【非凡媒介】鲜血指环", buyPrice: 4200, sellPrice: 1300, icon: "textures/items/vampire_ring" },
                    { id: "lotm:sealed_blood_bottle", name: "§c【消耗品】封存血液瓶", buyPrice: 80, sellPrice: 25, icon: "textures/items/sealed_blood_bottle" },
                    { id: "lotm:witch_mirror_wand", name: "§d【非凡媒介】替身魔镜手杖", buyPrice: 4500, sellPrice: 1400, icon: "textures/items/witch_mirror_wand" },
                    { id: "lotm:curse_doll", name: "§8【消耗品】诅咒替身草人", buyPrice: 250, sellPrice: 75, icon: "textures/items/curse_doll" },
                    { id: "lotm:storm_cutlass", name: "§b【非凡媒介】风暴弯刀", buyPrice: 3800, sellPrice: 1100, icon: "textures/items/tactical_sword" },
                ]
            },
            {
                id: "sealed_artifacts",
                name: "§6⚔️ 封印物与神兵军火库",
                icon: "textures/items/death_knell",
                description: "《诡秘之主》2级/3级高阶封印物与武器大师全套战术神兵",
                items: [
                    { id: "lotm:death_knell", name: "§l§6【2级封印物】§c丧钟短铳", buyPrice: 88888, sellPrice: 30000, icon: "textures/items/death_knell" },
                    { id: "lotm:ashen_reaper", name: "§l§c【3级封印物】§e灰烬收割者", buyPrice: 45000, sellPrice: 15000, icon: "textures/items/ashen_reaper" },
                    { id: "lotm:dawn_greatsword", name: "§l§e【3级封印物】§b晨曦圣剑", buyPrice: 48000, sellPrice: 16000, icon: "textures/items/dawn_greatsword" },
                    { id: "lotm:silent_pointer", name: "§l§9【3级封印物】§8静默之针", buyPrice: 42000, sellPrice: 14000, icon: "textures/items/silent_pointer" },
                    { id: "lotm:blood_moon_rapier", name: "§l§4【3级封印物】§d血月刺剑", buyPrice: 46000, sellPrice: 15500, icon: "textures/items/blood_moon_rapier" },
                    { id: "lotm:mirror_split_dagger", name: "§l§d【3级封印物】§b镜面裂魂短匕", buyPrice: 43000, sellPrice: 14500, icon: "textures/items/mirror_split_dagger" },
                    { id: "lotm:arsenal_box", name: "§l§6【3级封印物】§0万象军备匣", buyPrice: 52000, sellPrice: 18000, icon: "textures/items/arsenal_box" },
                    { id: "lotm:tactical_sword", name: "§6【战术战兵】破甲长剑", buyPrice: 2000, sellPrice: 600, icon: "textures/items/tactical_sword" },
                    { id: "lotm:tactical_axe", name: "§c【战术战兵】碎颅战斧", buyPrice: 2200, sellPrice: 700, icon: "textures/items/tactical_axe" },
                    { id: "lotm:tactical_spear", name: "§b【战术战兵】贯穿长矛", buyPrice: 2400, sellPrice: 750, icon: "textures/items/tactical_spear" },
                    { id: "lotm:tactical_bow", name: "§a【战术战兵】精准战弓", buyPrice: 2500, sellPrice: 800, icon: "textures/items/tactical_bow" },
                    { id: "lotm:blade_oil", name: "§e【附魔消耗品】附魔剑油", buyPrice: 180, sellPrice: 50, icon: "textures/items/blade_oil" },
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
        name: "§l§6【2级封印物】§c丧钟左轮",
        damage: 48, // 致命弱点伤害
        maxRange: 55, // 超远射程
        cooldownMs: 350, // 射击冷却毫秒数 (0.35秒)
    },

    // -------------------------------------------------------------
    // 幸运抽奖系统配置
    // -------------------------------------------------------------
    lottery: {
        pools: [
            {
                id: "coin_pool",
                name: "§e🪙 普通金币奖池",
                icon: "textures/items/gold_nugget",
                description: "§8消耗金币抽取日常实用建材、矿物与食物奖励。",
                singleCost: 200,
                tenCost: 1800, // 9折
                items: [
                    // weight 权重越大几率越高
                    { id: "minecraft:coal", amount: 16, name: "§8煤炭 x16", weight: 30, rarity: "common" },
                    { id: "minecraft:cooked_beef", amount: 16, name: "§c熟牛肉 x16", weight: 25, rarity: "common" },
                    { id: "minecraft:iron_ingot", amount: 8, name: "§0铁锭 x8", weight: 20, rarity: "common" },
                    { id: "minecraft:gold_ingot", amount: 6, name: "§e金锭 x6", weight: 15, rarity: "rare" },
                    { id: "lotm:tarot_card", amount: 16, name: "§e魔术纸牌 x16", weight: 14, rarity: "rare" },
                    { id: "minecraft:experience_bottle", amount: 16, name: "§a附魔之瓶 x16", weight: 12, rarity: "rare" },
                    { id: "minecraft:emerald", amount: 4, name: "§a绿宝石 x4", weight: 10, rarity: "rare" },
                    { id: "lotm:paper_figurine", amount: 2, name: "§0纸人替身 x2", weight: 8, rarity: "epic" },
                    { id: "minecraft:diamond", amount: 2, name: "§b钻石 x2", weight: 5, rarity: "epic" },
                    { id: "minecraft:golden_apple", amount: 3, name: "§6金苹果 x3", weight: 4, rarity: "epic" },
                    { id: "lotm:potion_seer", amount: 1, name: "§l§9【魔药】序列9: 占卜家", weight: 3, rarity: "legendary" },
                    { id: "minecraft:totem_of_undying", amount: 1, name: "§6不死图腾 x1", weight: 1, rarity: "legendary" },
                ]
            },
            {
                id: "vip_pool",
                name: "§6👑 高级欧皇奖池",
                icon: "textures/items/nether_star",
                description: "§8高额金币奖池，极高概率获得限定神话非凡神兵、极品神装与下界合金！",
                singleCost: 2000,
                tenCost: 18000,
                items: [
                    { id: "minecraft:diamond", amount: 8, name: "§b钻石 x8", weight: 26, rarity: "rare" },
                    { id: "minecraft:emerald_block", amount: 2, name: "§a绿宝石块 x2", weight: 22, rarity: "rare" },
                    { id: "lotm:paper_figurine", amount: 8, name: "§0纸人替身 x8", weight: 16, rarity: "rare" },
                    { id: "minecraft:experience_bottle", amount: 64, name: "§a附魔之瓶 x64", weight: 14, rarity: "rare" },
                    { id: "lotm:spirit_cane", amount: 1, name: "§l§e【非凡手杖】魔术师手杖", weight: 12, rarity: "epic" },
                    { id: "minecraft:netherite_ingot", amount: 1, name: "§8下界合金锭 x1", weight: 10, rarity: "epic" },
                    { id: "minecraft:totem_of_undying", amount: 1, name: "§6不死图腾 x1", weight: 8, rarity: "epic" },
                    { id: "lotm:potion_clown", amount: 1, name: "§l§c【魔药】序列8: 小丑", weight: 6, rarity: "legendary" },
                    { id: "lotm:potion_magician", amount: 1, name: "§l§5【魔药】序列7: 魔术师", weight: 4, rarity: "legendary" },
                    { id: "minecraft:shulker_box", amount: 1, name: "§d潜影盒 x1", weight: 4, rarity: "legendary" },
                    { id: "minecraft:elytra", amount: 1, name: "§b鞘翅 x1", weight: 3, rarity: "legendary" },
                    { id: "lotm:death_knell", amount: 1, name: "§l§6【2级封印物】§c丧钟左轮", weight: 2, rarity: "mythic", isWeapon: true },
                ]
            }
        ],
        rarities: {
            common: { name: "§8普通", color: "§8", broadcast: false },
            rare: { name: "§9稀有", color: "§9", broadcast: false },
            epic: { name: "§5史诗", color: "§5", broadcast: true },
            legendary: { name: "§6传说", color: "§6", broadcast: true },
            mythic: { name: "§l§c神话限定", color: "§c", broadcast: true },
        }
    }
};
