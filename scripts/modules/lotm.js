import { world, system, ItemStack } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { Utils } from "../utils.js";
import { Config } from "../config.js";
import { PathwayProfileRegistry, PATHWAY_PROFILES } from "./lotm_profile_registry.js";
import { StatusEffectManager } from "./lotm_status_manager.js";
import { DamageResolver } from "./lotm_damage_resolver.js";
import { TargetingService } from "./lotm_targeting_service.js";
import { ArtifactManager } from "./lotm_artifact_manager.js";
import { AbilityRouter } from "./lotm_ability_router.js";
import { PathwaySeer } from "./pathway_seer.js";
import { PathwayHunter } from "./pathway_hunter.js";
import { PathwayWarrior } from "./pathway_warrior.js";
import { PathwayDarkness } from "./pathway_darkness.js";
import { PathwaySun } from "./pathway_sun.js";
import { PathwayMoon } from "./pathway_moon.js";
import { PathwayAssassin } from "./pathway_assassin.js";

/**
 * 《诡秘之主》多途径非凡核心调度器 (LotmManager)
 * 遵循 PRD v1.0 架构标准
 */
export class LotmManager {
    static playerInCombat = new Map(); // playerId -> lastCombatTick

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

        // 1. 启动全局 5-Tick 状态批处理循环
        system.runInterval(() => {
            StatusEffectManager.onTick();
        }, 5);

        // 2. 启动全局每秒 (20-Tick) 灵性回灵、被动刷新与 HUD 渲染循环
        system.runInterval(() => {
            const players = world.getAllPlayers();
            for (const player of players) {
                try {
                    this.onPlayerTick(player);
                } catch {}
            }
        }, 20);

        // 3. 启动全局 5 秒 (100-Tick) 低频被动刷新
        system.runInterval(() => {
            const players = world.getAllPlayers();
            for (const player of players) {
                try {
                    this.applyPassiveBuffs(player);
                } catch {}
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
            Utils.playSound(player, "random.click", 1.8, 1.0);
            Utils.actionbar(player, `§c✧ 灵性不足！(当前: ${current} / 需: ${Math.abs(amount)})`);
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
            Utils.playSound(player, "random.levelup", 1.5, 1.0);
            Utils.tell(player, "§a§l[魔药消化] §e你已完全消化当前序列魔药！身心与非凡力量彻底交融！");
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

        // 计算所需的 health_boost amplifier
        // amplifier 0 = +4 HP (24 HP), amplifier 1 = +8 HP (28 HP), amplifier 2 = +12 HP (32 HP), amplifier 3 = +16 HP (36 HP), amplifier 5 = +24 HP (44 HP)
        const bonusHP = maxHP - 20;
        try {
            player.removeEffect("health_boost");
            if (bonusHP > 0) {
                const amp = Math.floor(bonusHP / 4) - 1;
                if (amp >= 0) {
                    player.addEffect("health_boost", 20000000, { amplifier: amp, showParticles: false });
                }
            }
        } catch {}
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
        } catch {}
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

        // 1. 灵性自然恢复
        const currentTick = system.currentTick;
        const lastCombat = this.playerInCombat.get(player.id) || 0;
        const isOutOfCombat = currentTick - lastCombat > 120; // 6 秒脱战

        let regen = isOutOfCombat ? (profile.regenOutOfCombat || 10) : (profile.regenInCombat || 4);

        // 吸血鬼/梦魇夜间增益
        const timeOfDay = world.getTimeOfDay();
        const isNight = timeOfDay > 13000 && timeOfDay < 23000;
        if (pathway === "moon") {
            regen = isNight ? (isOutOfCombat ? 16 : 6) : (isOutOfCombat ? 6 : 2);
        } else if (pathway === "darkness" && isNight) {
            regen = Math.round(regen * 1.25);
        } else if (pathway === "sun" && !isNight) {
            regen = Math.round(regen * 1.2);
        }

        if (curSP < maxSP) {
            this.modifySpirituality(player, regen);
        }

        // 吸血鬼血渴心跳处理
        if (pathway === "moon") {
            PathwayMoon.handleThirstTick(player);
        }

        // 2. Actionbar HUD 渲染
        const sp = this.getSpirituality(player);
        const digestion = this.getDigestion(player);
        const seqName = profile.sequenceName || "魔术师";

        let extraHUD = "";
        if (pathway === "moon") {
            const thirst = PathwayMoon.getBloodThirst(player);
            extraHUD = ` §8| §4血渴: ${thirst}/100`;
        } else if (pathway === "warrior") {
            const stance = PathwayWarrior.getStance(player);
            const stanceMap = { attack: "§c进攻", defense: "§9守御", ranged: "§a远射", balanced: "§f均衡" };
            extraHUD = ` §8| 姿态: ${stanceMap[stance] || "§f均衡"}`;
        }

        Utils.actionbar(
            player,
            `§d✧ 灵性: §f${sp}§7/§e${maxSP} §8| §b${profile.name} · §6${seqName} §8| §a消化: ${digestion}%${extraHUD}`
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

        const form = new ActionFormData()
            .title(`§l§5🔮 诡秘之主 · 超凡体系`)
            .body(
                `§7══════════════════════════════\n` +
                `§f当前途径: §6${profile.name} (${profile.sequenceName})\n` +
                `§f当前灵性: §d${sp} §7/ §e${profile.maxSpirituality} ✧\n` +
                `§f魔药消化: §a${digestion}%\n` +
                `§f最大生命: §c${profile.maxHealth} HP §7(${profile.maxHealth / 2} 颗心)\n` +
                `§7══════════════════════════════`
            )
            .button("§l§6🎁 领取当前途径专属媒介", "textures/items/diamond_sword")
            .button("§l§e🧪 途径转换与晋升通道", "textures/items/potion_bottle_heal");

        // 依据当前途径动态添加专属操作按钮
        if (pathway === "warrior") {
            form.button("§l§6⚔️ 切换战术战斗姿态", "textures/items/iron_sword");
        } else if (pathway === "sun") {
            form.button("§l§e💧 凝聚制作【圣水瓶】", "textures/items/gold_ingot");
        } else if (pathway === "hunter") {
            form.button("§l§c🔥 调配【炼金燃烧瓶】", "textures/items/blaze_powder");
        } else {
            form.button("§l§9👁️ 开启以太灵视", "textures/items/ender_eye");
        }

        form.button("§l§b💎 灵摆占卜探针", "textures/items/compass_item");

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
                        Utils.tell(player, "§9[灵视] 以太体灵性视野已激活！");
                    }
                    break;
                case 3:
                    Utils.tell(player, "§b[灵摆] 灵摆轻旋，已感应方圆矿脉与危机！");
                    break;
            }
        });
    }

    /**
     * 战士姿态选择菜单
     */
    static openWarriorStanceMenu(player) {
        const form = new ActionFormData()
            .title("§l§6⚔️ 武器大师战斗姿态")
            .body("§7请选择你希望激活的武器大师姿态：")
            .button("§l§c【进攻姿态】\n§7武器伤害 +8%，受到的伤害 +5%", "textures/items/iron_sword")
            .button("§l§9【守御姿态】\n§7近战承伤 -8%，移动速度 -5%", "textures/items/iron_helmet")
            .button("§l§a【远射姿态】\n§7弹道散布归零，近战伤害 -8%", "textures/items/bow_standby")
            .button("§l§f【均衡姿态】\n§7恢复标准战斗状态", "textures/items/shield");

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
        Utils.giveItem(player, "lotm:holy_water_bottle", 2, "§l§e【非凡消耗品】§b圣水瓶", ["§7投掷驱散污秽与火灾"]);
        Utils.playSound(player, "random.levelup", 1.5, 1.0);
        Utils.tell(player, "§e☀️ [纯白圣水] 消耗 50 灵性成功凝聚 2 瓶【圣水瓶】！");
    }

    /**
     * 纵火家调配炼金燃烧瓶
     */
    static craftMolotov(player) {
        if (!this.modifySpirituality(player, -40)) return;
        Utils.giveItem(player, "lotm:alchemical_molotov", 2, "§l§c【非凡消耗品】§e炼金燃烧瓶", ["§7投掷产生 3 格烈焰火区"]);
        Utils.playSound(player, "fire.ignite", 1.5, 1.0);
        Utils.tell(player, "§c🔥 [烈火炼金] 消耗 40 灵性成功调配 2 瓶【炼金燃烧瓶】！");
    }

    /**
     * 途径选择与转换菜单
     */
    static openPathwaySelectMenu(player) {
        const form = new ActionFormData()
            .title("§l§e🔮 选择序列 7 途径")
            .body("§7请选择你想踏入的非凡途径（自动配置专属体质、灵性池与全套技能）：")
            .button("§l§5【占卜家】魔术师\n§728 HP | 空气弹·火焰跳跃", "textures/items/stick")
            .button("§l§c【猎人】纵火家\n§732 HP | 火焰长枪·焰潮领域", "textures/items/blaze_powder")
            .button("§l§6【战士】武器大师\n§744 HP | 四大战技·大师格挡", "textures/items/iron_sword")
            .button("§l§9【不眠者】梦魇\n§730 HP | 强制入梦·夜之眷属", "textures/items/clock_item")
            .button("§l§e【歌颂者】太阳神官\n§736 HP | 神圣之光·太阳光环", "textures/items/gold_ingot")
            .button("§l§4【药师】吸血鬼\n§736 HP | 腐蚀之爪·黑暗之翼", "textures/items/redstone_dust")
            .button("§l§d【刺客】女巫\n§728 HP | 黑焰禁疗·镜面替身", "textures/items/amethyst_shard");

        Utils.showForm(player, form, (res) => {
            const pathways = ["seer", "hunter", "warrior", "darkness", "sun", "moon", "assassin"];
            const selected = pathways[res.selection];
            if (selected) {
                this.setPathway(player, selected);
                this.giveFocusKit(player);
                Utils.playSound(player, "random.levelup", 1.5, 1.0);
                Utils.tell(player, `§a§l[晋升成功] §f你已正式成为 §6${PathwayProfileRegistry.getProfile(selected).title}§f！`);
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
                Utils.giveItem(player, "lotm:spirit_cane", 1, "§l§e【非凡武器】§6魔术师手杖", ["§7右键释放空气弹，潜行右键火焰跳跃"]);
                Utils.giveItem(player, "lotm:tarot_card", 64, "§l§e【非凡媒介】§b魔术纸牌", ["§7右键高速破甲飞掷"]);
                Utils.giveItem(player, "lotm:paper_figurine", 16, "§l§f【非凡媒介】§c符咒纸人替身", ["§7背包携带，致命伤自动替死"]);
                break;
            case "hunter":
                Utils.giveItem(player, "lotm:pyro_gauntlet", 1, "§l§c【非凡媒介】§6赤焰手套", ["§7右键释放火焰长枪，潜行右键焰潮领域"]);
                Utils.giveItem(player, "lotm:alchemical_molotov", 16, "§l§c【非凡消耗品】§e炼金燃烧瓶", ["§7投掷产生 3 格烈焰火区"]);
                break;
            case "warrior":
                Utils.giveItem(player, "lotm:tactical_sword", 1, "§l§6【战术武器】§f战术长剑", ["§7右键穿刺突进破甲"]);
                Utils.giveItem(player, "lotm:tactical_axe", 1, "§l§6【战术武器】§f战术战斧", ["§7右键 120° 横扫处决"]);
                Utils.giveItem(player, "lotm:tactical_spear", 1, "§l§6【战术武器】§f战术长枪", ["§7右键 6 格贯线刺击"]);
                Utils.giveItem(player, "lotm:tactical_bow", 1, "§l§6【战术武器】§f战术战弓", ["§7右键专注射击增伤 50%"]);
                Utils.giveItem(player, "lotm:blade_oil", 16, "§l§e【非凡消耗品】§6磨刃油", ["§7使用后 60 秒武器增伤 8%"]);
                break;
            case "darkness":
                Utils.giveItem(player, "lotm:nightmare_watch", 1, "§l§9【非凡媒介】§b午夜怀表", ["§7右键强制入梦，潜行右键梦魇领域"]);
                Utils.giveItem(player, "lotm:dream_dust", 16, "§l§9【非凡消耗品】§f梦境粉尘", ["§7投掷散布 3 格困倦雾霭"]);
                break;
            case "sun":
                Utils.giveItem(player, "lotm:sun_emblem", 1, "§l§e【非凡媒介】§6太阳圣徽", ["§7右键神圣之光，潜行右键太阳光环"]);
                Utils.giveItem(player, "lotm:holy_water_bottle", 16, "§l§e【非凡消耗品】§b圣水瓶", ["§7投掷驱散污秽与火灾"]);
                break;
            case "moon":
                Utils.giveItem(player, "lotm:vampire_ring", 1, "§l§4【非凡媒介】§c血族指环", ["§7右键腐蚀之爪突进吸血，潜行右键黑暗之翼"]);
                Utils.giveItem(player, "lotm:sealed_blood_bottle", 16, "§l§4【非凡消耗品】§c密封血液瓶", ["§7饮用恢复 8 HP 与 80 灵性"]);
                break;
            case "assassin":
                Utils.giveItem(player, "lotm:witch_mirror_wand", 1, "§l§d【非凡媒介】§5黑曜镜杖", ["§7右键黑焰禁疗，潜行右键镜面替身隐形"]);
                Utils.giveItem(player, "lotm:curse_doll", 16, "§l§d【非凡消耗品】§4诅咒娃娃", ["§7右键锁定施加沉重诅咒"]);
                break;
        }
        Utils.tell(player, `§a已发放【${PathwayProfileRegistry.getProfile(pathway).name}】全套专属媒介与物资！`);
    }
}
