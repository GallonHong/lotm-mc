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
import { PathwayTyrant } from "./pathway_tyrant.js";
import { PathwayLowSequence } from "./pathway_low_sequence.js";
import { getPotionData, getAllPotionIds } from "./lotm_progression_registry.js";
import { getAbilityGuide } from "./lotm_ability_guide.js";

/**
 * 《诡秘之主》多途径非凡核心调度器 (LotmManager)
 * 遵循 PRD v1.0 架构标准
 */
export class LotmManager {
    static playerInCombat = new Map(); // playerId -> lastCombatTick
    static potionUseTicks = new Map();

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
    static PathwayTyrant = PathwayTyrant;
    static PathwayLowSequence = PathwayLowSequence;

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
     * 普通人强行使用高阶封印物时触发精神污染。
     */
    static triggerMadness(player, reason = "高阶封印物造成精神污染") {
        if (!Utils.isValid(player)) return;
        Utils.tell(player, `§4§l[失控反噬] §c${reason}`);
        Utils.actionbar(player, "§4精神遭受重创，必须先踏入非凡序列！");
        Utils.playSound(player, "mob.wither.spawn", 0.7, 0.8);
        try {
            player.addEffect("nausea", 200, { amplifier: 1, showParticles: true });
            player.addEffect("weakness", 200, { amplifier: 1, showParticles: true });
            player.applyDamage(4);
        } catch (error) {
            console.warn(`[LOTM] Failed to apply madness backlash to ${player.name}: ${error}`);
        }
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

    static setPathway(player, pathwayId, sequence = 7) {
        this.setProgression(player, pathwayId, sequence, 100);
    }

    static setProgression(player, pathwayId, sequence, digestion = 0) {
        Utils.setProp(player, "lotm:pathway", pathwayId);
        const normalizedSequence = pathwayId === "none" ? 0 : Number(sequence);
        const profile = PathwayProfileRegistry.getProfile(pathwayId, normalizedSequence);
        Utils.setProp(player, "lotm:sequence", normalizedSequence);
        Utils.setProp(player, "lotm:sp", profile.maxSpirituality);
        Utils.setProp(player, "lotm:digestion", pathwayId === "none" ? 0 : digestion);
        this.applyHealthProfile(player);
    }

    static setSequence(player, seq) {
        Utils.setProp(player, "lotm:sequence", seq);
        if (seq === 0) {
            this.setProgression(player, "none", 0, 0);
        } else if (seq === 7 || seq === 8 || seq === 9) {
            const pathway = this.getPathway(player) === "none" ? "seer" : this.getPathway(player);
            this.setProgression(player, pathway, seq, 100);
        }
    }

    static getSequence(player) {
        return Utils.getProp(player, "lotm:sequence", 0);
    }

    static getSpirituality(player) {
        return Utils.getProp(player, "lotm:sp", 0);
    }

    static getMaxSpirituality(player) {
        const pathway = this.getPathway(player);
        const profile = PathwayProfileRegistry.getProfile(pathway, this.getSequence(player));
        return profile.maxSpirituality || 0;
    }

    static consumePotion(player, itemId) {
        const potion = getPotionData(itemId);
        if (!potion) return false;

        // itemUse 与 interact 可能在同一次右键中同时上报；服务器按玩家+物品去重。
        const useKey = `${player.id}:${itemId}`;
        const now = system.currentTick;
        if (now - (this.potionUseTicks.get(useKey) || -100) <= 2) return true;
        this.potionUseTicks.set(useKey, now);

        const currentPathway = this.getPathway(player);
        const currentSequence = this.getSequence(player);
        const digestion = this.getDigestion(player);
        let allowed = false;

        if (potion.sequence === 9) {
            allowed = currentPathway === "none" || currentSequence === 0;
        } else {
            allowed = currentPathway === potion.pathwayId && currentSequence === potion.sequence + 1 && digestion >= 100;
        }

        if (!allowed) {
            const requirement = potion.sequence === 9
                ? "只有普通人可以服用序列 9 魔药"
                : `需要先成为同途径序列 ${potion.sequence + 1}，并将魔药完全消化`;
            Utils.tell(player, `§c§l[晋升失败] §7${requirement}。异途径或越级服用会导致失控。`);
            Utils.sound.warn(player);
            return true;
        }

        if (!Utils.removeItem(player, itemId, 1)) return true;
        this.setProgression(player, potion.pathwayId, potion.sequence, 0);
        const profile = PathwayProfileRegistry.getProfile(potion.pathwayId, potion.sequence);
        Utils.broadcast(`§5§l[序列晋升] §e${player.name} 已晋升为 ${profile.title}§e！`);
        Utils.tell(player, "§a使用对应低序列能力可推进消化；完全消化后方可继续晋升。");
        Utils.playSound(player, "random.levelup", 0.9, 1.0);
        return true;
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
        const profile = PathwayProfileRegistry.getProfile(pathway, this.getSequence(player));
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
        const sequence = this.getSequence(player);

        try {
            switch (pathway) {
                case "seer":
                    if (sequence <= 8) player.addEffect("speed", 140, { amplifier: 0, showParticles: false });
                    if (sequence <= 8) player.addEffect("jump_boost", 140, { amplifier: 0, showParticles: false });
                    if (sequence <= 7) player.addEffect("water_breathing", 140, { amplifier: 0, showParticles: false });
                    if (sequence <= 7) player.addEffect("fire_resistance", 140, { amplifier: 0, showParticles: false });
                    break;
                case "hunter":
                    if (sequence <= 7) player.addEffect("fire_resistance", 140, { amplifier: 0, showParticles: false });
                    break;
                case "warrior":
                    player.addEffect("resistance", 140, { amplifier: sequence <= 7 ? 1 : 0, showParticles: false });
                    break;
                case "darkness":
                    player.addEffect("night_vision", 300, { amplifier: 0, showParticles: false });
                    break;
                case "sun":
                    if (sequence <= 7) player.addEffect("regeneration", 140, { amplifier: 0, showParticles: false });
                    break;
                case "moon":
                    player.addEffect("night_vision", 300, { amplifier: 0, showParticles: false });
                    break;
                case "assassin":
                    player.addEffect("speed", 140, { amplifier: sequence <= 7 ? 1 : 0, showParticles: false });
                    break;
                case "tyrant":
                    player.addEffect("water_breathing", 140, { amplifier: 0, showParticles: false });
                    if (sequence <= 8) player.addEffect("strength", 140, { amplifier: 0, showParticles: false });
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

        const profile = PathwayProfileRegistry.getProfile(pathway, this.getSequence(player));
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
        const sequence = this.getSequence(player);
        if (pathway === "moon" && sequence === 7) {
            regen = isNight ? (isOutOfCombat ? 16 : 6) : (isOutOfCombat ? 6 : 2);
        } else if (pathway === "darkness" && isNight) {
            regen = Math.round(regen * 1.25);
        } else if (pathway === "sun" && !isNight) {
            regen = Math.round(regen * 1.2);
        } else if (pathway === "tyrant" && PathwayTyrant.isWet(player)) {
            regen = Math.round(regen * 1.25);
        }

        if (curSP < maxSP) {
            this.modifySpirituality(player, regen);
        }

        // 吸血鬼血渴心跳处理
        if (pathway === "moon" && sequence === 7) {
            PathwayMoon.handleThirstTick(player);
        }

        // 2. Actionbar HUD 渲染
        const sp = this.getSpirituality(player);
        const digestion = this.getDigestion(player);
        const seqName = profile.sequenceName || "魔术师";

        let extraHUD = "";
        if (pathway === "moon" && sequence === 7) {
            const thirst = PathwayMoon.getBloodThirst(player);
            extraHUD = ` §8| §4血渴: ${thirst}/100`;
        } else if (pathway === "warrior" && sequence === 7) {
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
        if (this.consumePotion(player, item?.typeId)) return true;
        return AbilityRouter.routeItemUse(player, item, this);
    }

    static handleEmptyHandUse(player) {
        const sequence = this.getSequence(player);
        const pathway = this.getPathway(player);
        if (sequence === 8 || sequence === 9) {
            return PathwayLowSequence.use(player, pathway, sequence, player.isSneaking, this);
        }
        if (sequence !== 7) return false;
        switch (pathway) {
            case "seer": player.isSneaking ? PathwaySeer.performFlameJump(player, this) : PathwaySeer.fireAirBullet(player, this); return true;
            case "hunter": player.isSneaking ? PathwayHunter.triggerFlameArmor(player, this) : PathwayHunter.fireFlameSpear(player, this); return true;
            case "sun": player.isSneaking ? PathwaySun.triggerSunHalo(player, this) : PathwaySun.castHolyLight(player, this); return true;
            case "moon": player.isSneaking ? PathwayMoon.triggerDarkWings(player, this) : PathwayMoon.corrosiveClaws(player, this); return true;
            case "assassin": player.isSneaking ? PathwayAssassin.performMirrorSubstitute(player, this) : PathwayAssassin.castBlackFlame(player, this); return true;
            default: return false;
        }
    }

    // ==========================================
    // 超凡综合菜单 GUI
    // ==========================================

    static openAbilityMenu(player) {
        const pathway = this.getPathway(player);
        const sequence = this.getSequence(player);
        const profile = PathwayProfileRegistry.getProfile(pathway, sequence);
        const currentGuide = getAbilityGuide(pathway, sequence);
        const sp = this.getSpirituality(player);
        const digestion = this.getDigestion(player);

        const form = new ActionFormData()
            .title(`§l§5🔮 诡秘之主 · 超凡体系`)
            .body(
                `§7══════════════════════════════\n` +
                `§f当前途径: §6${profile.name}\n` +
                `§f当前序列: §d${sequence === 0 ? "普通人" : `序列 ${sequence} · ${profile.sequenceName}`}\n` +
                `§f当前灵性: §d${sp} §7/ §e${profile.maxSpirituality} ✧\n` +
                `§f魔药消化: §a${digestion}%\n` +
                `§f最大生命: §c${profile.maxHealth} HP §7(${profile.maxHealth / 2} 颗心)\n` +
                `§7途径一经选择不可更换；完全消化后仅可沿当前途径晋升。\n` +
                `§7══════════════════════════════`
            )
            .button("§l§b📖 查看当前序列能力说明\n§r§8操作方式、媒介与消耗品", "textures/items/book_enchanted")
            .button(sequence === 7 ? "§l§6🎁 领取当前途径专属媒介" : "§l§7🔒 序列7媒介尚未解锁", "textures/items/diamond_sword");

        // 依据当前途径动态添加专属操作按钮
        if (sequence < 7 || sequence > 9) {
            form.button("§l§7普通人暂无非凡能力", "textures/items/book_normal");
        } else if (sequence > 7) {
            form.button(currentGuide?.secondary ? "§l§d空手普通/潜行右键\n§r§8使用当前序列主、副能力" : "§l§b普通右键：当前基础能力\n§r§8潜行能力尚未解锁", "textures/items/experience_bottle");
        } else if (pathway === "warrior") {
            form.button("§l§6⚔️ 切换战术战斗姿态", "textures/items/iron_sword");
        } else if (pathway === "sun") {
            form.button("§l§e💧 凝聚制作【圣水瓶】", "textures/items/gold_ingot");
        } else if (pathway === "hunter") {
            form.button("§l§c🔥 调配【炼金燃烧瓶】", "textures/items/blaze_powder");
        } else if (pathway === "tyrant") {
            form.button("§l§b🌊 查看水域共鸣状态", "textures/items/trident");
        } else {
            form.button("§l§9👁️ 开启以太灵视", "textures/items/ender_eye");
        }

        form.button("§l§b💎 灵摆占卜探针", "textures/items/compass_item");

        Utils.showForm(player, form, (res) => {
            switch (res.selection) {
                case 0:
                    this.openAbilityGuideMenu(player);
                    break;
                case 1:
                    if (sequence === 7) this.giveFocusKit(player);
                    else Utils.tell(player, "§7专属媒介与消耗品将在晋升序列 7 后解锁。当前请空手右键使用低序列能力。");
                    break;
                case 2:
                    if (sequence > 7) {
                        Utils.tell(player, currentGuide?.secondary
                            ? `§b空手普通右键使用【${currentGuide.primary[0]}】，潜行右键使用【${currentGuide.secondary[0]}】。`
                            : "§b空手普通右键使用当前能力；完全消化魔药后可沿当前途径晋升。");
                    } else if (pathway === "warrior") {
                        this.openWarriorStanceMenu(player);
                    } else if (pathway === "sun") {
                        this.craftHolyWater(player);
                    } else if (pathway === "hunter") {
                        this.craftMolotov(player);
                    } else if (pathway === "tyrant") {
                        Utils.tell(player, PathwayTyrant.isWet(player) ? "§b[水域共鸣] 当前处于水中，航海家回灵提高25%，水之长矛消耗降低。" : "§7[水域共鸣] 当前处于干燥环境，进入水中可提高回灵并降低水之长矛消耗。");
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

    static openAbilityGuideMenu(player) {
        const pathway = this.getPathway(player);
        const sequence = this.getSequence(player);
        const profile = PathwayProfileRegistry.getProfile(pathway, sequence);
        const guide = getAbilityGuide(pathway, sequence);

        let body = `§7══════════════════════════════\n`;
        body += sequence === 0
            ? "§7你目前是普通人，尚未获得非凡能力。服用任一途径的序列 9 魔药后，途径将永久确定。\n"
            : `§f${profile.name} §8| §d序列 ${sequence} · ${profile.sequenceName}\n\n`;

        if (guide) {
            const rows = [guide.primary, guide.secondary, guide.consumable].filter(Boolean);
            for (const [name, input, effect] of rows) {
                body += `§l§6【${name}】§r\n§e操作：§f${input}\n§7${effect}\n\n`;
            }
            if (sequence === 9 && !guide.secondary) body += "§8潜行能力将在后续开发或晋升序列 8 后解锁。\n";
            if (sequence > 7) body += "§8序列 7 专属媒介与消耗品尚未解锁。\n";
        }
        body += "§7施法失败时请检查灵性、冷却、目标与阶位。\n§7══════════════════════════════";

        const form = new ActionFormData()
            .title("§l§b📖 当前序列能力说明")
            .body(body)
            .button("§l§7⬅ 返回非凡秘典", "textures/ui/undo");

        Utils.showForm(player, form, (res) => {
            if (!res.canceled && res.selection === 0) this.openAbilityMenu(player);
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
     * 发放当前途径全套专属媒介与消耗品
     */
    static giveFocusKit(player) {
        const pathway = this.getPathway(player);
        if (this.getSequence(player) !== 7) {
            Utils.tell(player, "§7序列 7 专属媒介尚未解锁。低序列能力使用空手普通/潜行右键触发。");
            return;
        }
        this.giveFocusKitForPathway(player, pathway);
    }

    static giveAllPotionKit(player) {
        for (const potionId of getAllPotionIds()) {
            Utils.giveItem(player, potionId, 1);
        }
        Utils.tell(player, `§a已发放当前已实现途径序列 9、8、7 的全部魔药（共 ${getAllPotionIds().length} 瓶）。晋升仍会严格校验当前途径、序列与消化度。`);
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
                Utils.giveItem(player, "lotm:pyro_gauntlet", 1, "§l§c【非凡媒介】§6赤焰手套", ["§7右键释放火焰长枪，潜行右键开启火焰铠甲"]);
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
            case "tyrant":
                Utils.giveItem(player, "lotm:storm_cutlass", 1, "§l§b【非凡媒介】§3风暴弯刀", ["§7普通右键释放水之长矛", "§7潜行右键释放潮汐冲击", "§b水中回灵提高且主技能消耗降低"]);
                break;
        }
        Utils.tell(player, `§a已发放【${PathwayProfileRegistry.getProfile(pathway).name}】全套专属媒介与物资！`);
    }
}
