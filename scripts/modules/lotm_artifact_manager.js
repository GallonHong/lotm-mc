import { world, system } from "@minecraft/server";
import { Utils } from "../utils.js";
import { TargetingService } from "./lotm_targeting_service.js";
import { DamageResolver } from "./lotm_damage_resolver.js";
import { StatusEffectManager } from "./lotm_status_manager.js";
import { PathwayWarrior } from "./pathway_warrior.js";

/**
 * 《诡秘之主》非凡武器与封印物全功能管理器 (ArtifactManager)
 * 遵循 PRD 第 7 章规范：7 件武器主动、被动、实例代价、收容与普通人反噬
 */
export class ArtifactManager {
    // 玩家武器状态追踪: playerId -> { overheat, bloodThirst, identityFracture, weaponMemory, lockedForm, mirrorMarker, hitCount, silentUses, combatLog }
    static playerArtifactState = new Map();
    static combatLogEnabled = new Map(); // playerId -> boolean

    static getState(player) {
        if (!this.playerArtifactState.has(player.id)) {
            this.playerArtifactState.set(player.id, {
                overheat: 0,
                bloodThirst: 0,
                identityFracture: 0,
                weaponMemory: 0,
                arsenalForm: "sword", // sword, axe, spear, bow
                lockedUntilTick: 0,
                mirrorMarker: null, // { loc, expiresAtTick }
                hitCount: 0,
                silentUses: 0,
                deathKnellThirst: 0,
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

        // 过热锁死判定 (3层过热锁定 10 秒)
        if (state.overheat >= 3) {
            Utils.playSound(player, "fire.ignite", 1.8, 1.0);
            Utils.actionbar(player, "§c🔥 [灰烬收割者·过热自燃] 刀身炽烈滚烫！处于过热锁定状态中！");
            return;
        }

        const cost = isMortal ? 60 : 40;
        if (!lotmManager.modifySpirituality(player, -cost)) return;

        state.overheat += 1;
        if (state.overheat >= 3) {
            try { player.setOnFire(4, true); } catch {}
            Utils.tell(player, "§c§l[武器负面] §e灰烬收割者达到 3 层过热！你陷入 4 秒自燃，武器主动锁定 10 秒！");
        }

        const dim = player.dimension;
        Utils.playSound(player, "fire.ignite", 1.8, 0.8);
        Utils.playSound(player, "random.explode", 1.2, 1.0);

        const { entity, hitLoc } = TargetingService.getRayTarget(player, 8);
        if (entity) {
            DamageResolver.applyDamage(player, entity, {
                pveDamage: 26,
                pvpDamage: 13,
                isFireDamage: true,
            });
            StatusEffectManager.applyStatus(entity, "burning", 120, 1, player);
            // 3 层对周围 2.5 格造成一半伤害
            const aoeTargets = TargetingService.getAreaTargets(player, entity.location, 2.5, 5);
            for (const t of aoeTargets) {
                if (t.id !== entity.id) {
                    DamageResolver.applyDamage(player, t, { pveDamage: 13, pvpDamage: 6, isFireDamage: true });
                }
            }
        }

        if (hitLoc) {
            try { dim.spawnParticle("minecraft:flame_particle", hitLoc); } catch {}
        }

        Utils.actionbar(player, `§c🗡️ [爆燃收割] 引爆余烬！(当前过热: ${state.overheat}/3)`);
    }

    // =========================================================================
    // 2. 【3级非凡武器 · 破晓重剑 (Dawn Greatsword)】 (双手重剑)
    // =========================================================================
    static useDawnGreatsword(player, lotmManager, isMortal) {
        const cost = isMortal ? 75 : 50;
        if (!lotmManager.modifySpirituality(player, -cost)) return;

        const dim = player.dimension;
        Utils.playSound(player, "beacon.activate", 1.5, 1.0);
        Utils.playSound(player, "item.trident.thunder", 1.2, 1.0);

        // 前方 6 格锥形黎明斩 (24/12，亡灵 34/16 并沉默 1 秒)
        const targets = TargetingService.getConeTargets(player, 6.0, 120, 8);
        for (const t of targets) {
            DamageResolver.applyDamage(player, t, {
                pveDamage: 24,
                pvpDamage: 12,
                isUndeadBonus: true,
            });
            StatusEffectManager.applyStatus(t, "silence", 20, 1, player); // 1秒沉默
        }

        // 负面效果：自身移速-10%，发光 20 秒
        try {
            player.addEffect("slowness", 400, { amplifier: 0, showParticles: false });
            player.addEffect("glowing", 400, { amplifier: 0, showParticles: false });
        } catch {}

        Utils.actionbar(player, "§e⚔️ [破晓·黎明斩] 耀阳之刃横扫！附带 20 秒发光与移速减益！");
    }

    // =========================================================================
    // 3. 【3级非凡武器 · 无声教鞭 (Silent Pointer)】 (黑木短杖)
    // =========================================================================
    static useSilentPointer(player, isSneaking, lotmManager, isMortal) {
        const state = this.getState(player);

        if (!isSneaking) {
            // 主动一：安眠指令 (45 SP, 18格单体睡眠 5s / 困倦 1s)
            if (!lotmManager.modifySpirituality(player, isMortal ? 65 : 45)) return;
            state.silentUses += 1;

            if (state.silentUses >= 3) {
                state.silentUses = 0;
                StatusEffectManager.applyStatus(player, "drowsy", 20, 1, player);
                Utils.tell(player, "§8§l[教鞭反噬] §c连续施展安眠指令，精神疲惫陷入 1 秒困倦！");
            }

            const { entity } = TargetingService.getRayTarget(player, 18);
            if (entity) {
                StatusEffectManager.applyStatus(entity, entity.typeId === "minecraft:player" ? "drowsy" : "sleep", 100, 1, player);
                Utils.playSound(entity, "random.orb", 1.2, 1.0);
            }
            Utils.actionbar(player, "§8🪄 [无声教鞭·安眠] 目标意志陷入沉眠！");
        } else {
            // 主动二：惊醒 (35 SP, 对睡眠/困倦目标造成 26/13 伤害)
            if (!lotmManager.modifySpirituality(player, isMortal ? 50 : 35)) return;
            const { entity } = TargetingService.getRayTarget(player, 18);
            if (entity) {
                const isSleeping = StatusEffectManager.hasStatus(entity, "sleep") || StatusEffectManager.hasStatus(entity, "drowsy");
                const dealt = DamageResolver.applyDamage(player, entity, {
                    pveDamage: isSleeping ? 26 : 8,
                    pvpDamage: isSleeping ? 13 : 4,
                });
                StatusEffectManager.removeStatus(entity, "sleep");
                Utils.playSound(player, "random.break", 1.8, 1.0);
                Utils.actionbar(player, `§8💥 [无声教鞭·惊醒] 惊醒打击造成 ${dealt} 伤害！`);
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
            } catch {}
            Utils.tell(player, "§4§l[封印物反噬] §c凡人无法驾驭2级封印物【血月刺剑】！受到吸血反噬扣除 8 HP！");
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

        // 突进 10 格
        const targetLoc = {
            x: startLoc.x + viewDir.x * 8,
            y: startLoc.y,
            z: startLoc.z + viewDir.z * 8,
        };
        try { player.teleport(targetLoc, { dimension: dim }); } catch {}

        const { entity } = TargetingService.getRayTarget(player, 4);
        if (entity) {
            const dealt = DamageResolver.applyDamage(player, entity, {
                pveDamage: 30,
                pvpDamage: 15,
                ignoreArmor: true,
                armorPierceRatio: 0.25,
            });
            const heal = Math.min(8, Math.max(1, Math.round(dealt * 0.3)));
            try {
                const hp = player.getComponent("health");
                if (hp) hp.setCurrentValue(Math.min(hp.effectiveMax, hp.currentValue + heal));
            } catch {}
        }

        Utils.actionbar(player, `§4🩸 [血影贯杀] 穿透血影突刺！(当前血渴: ${state.bloodThirst}/100)`);
    }

    // =========================================================================
    // 5. 【2级非凡武器 · 镜裂短刃 (Mirror Split Dagger)】 (镜面碎片匕首)
    // =========================================================================
    static useMirrorSplitDagger(player, lotmManager, isMortal) {
        if (isMortal) {
            Utils.tell(player, "§4§l[封印物反噬] §c凡人触碰镜裂短刃，镜中恶念分身被唤醒！");
            Utils.playSound(player, "random.glass", 1.8, 1.0);
            return;
        }

        const state = this.getState(player);
        const currentTick = system.currentTick;

        // 如果已有激活的镜像标记 (4 秒内再次右键交换位置)
        if (state.mirrorMarker && currentTick < state.mirrorMarker.expiresAtTick) {
            const destLoc = state.mirrorMarker.loc;
            state.mirrorMarker = null;

            Utils.playSound(player, "random.glass", 1.8, 1.0);
            Utils.playSound(player, "mob.endermen.portal", 1.8, 1.0);
            try { player.teleport(destLoc, { dimension: player.dimension }); } catch {}
            Utils.actionbar(player, "§d🪞 [镜像置换] 瞬移至镜像标记坐标！");
            return;
        }

        if (!lotmManager.modifySpirituality(player, -70)) return;

        state.identityFracture = Math.min(100, state.identityFracture + 20);
        if (state.identityFracture >= 100) {
            state.identityFracture = 40;
            Utils.tell(player, "§d§l[身份裂痕爆发] §c100 裂痕导致自我认知破碎！生成敌对镜像并回落至 40！");
        }

        const markerLoc = TargetingService.getSafeLandingLocation(player, 10);
        state.mirrorMarker = { loc: markerLoc, expiresAtTick: currentTick + 80 }; // 4 秒窗口

        try { player.dimension.spawnParticle("minecraft:crit", markerLoc); } catch {}
        Utils.playSound(player, "random.glass", 1.5, 1.0);
        Utils.actionbar(player, "§d🪞 [镜影标记] 10格安全点已放置镜像！4秒内再次右键置换！");
    }

    // =========================================================================
    // 6. 【2级非凡武器 · 百兵匣 (Arsenal Box)】 (黑铁武器机匣)
    // =========================================================================
    static useArsenalBox(player, isSneaking, lotmManager, isMortal) {
        const state = this.getState(player);
        const forms = ["sword", "axe", "spear", "bow"];

        if (isSneaking) {
            // 潜行右键：切换武器形态
            if (!lotmManager.modifySpirituality(player, -25)) return;

            const nextIndex = (forms.indexOf(state.arsenalForm) + 1) % forms.length;
            state.arsenalForm = forms[nextIndex];
            state.weaponMemory += 1;

            const formNames = {
                sword: "§f长剑形态 (穿刺突进)",
                axe: "§6战斧形态 (120°横扫处决)",
                spear: "§e长枪形态 (6格贯线刺击)",
                bow: "§a战弓形态 (专注射击)",
            };

            Utils.playSound(player, "random.anvil_use", 1.5, 1.0);
            Utils.actionbar(player, `§6📦 [百兵匣·形态转换] 切换为 ${formNames[state.arsenalForm]}！`);
            return;
        }

        // 普通右键：释放对应强化战技 (+10% 伤害，+10 SP 消耗)
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
            Utils.tell(player, "§c普通人的肉身与精神无法承受2级封印物的庞大灵性负荷！强行开火将遭受精神污染反噬！");
            Utils.playSound(player, "random.break", 1.5, 0.8);
            return;
        }

        const requiredSP = isSneaking ? 150 : 80;
        if (!lotmManager.modifySpirituality(player, -requiredSP)) {
            Utils.actionbar(player, `§c✧ 灵性不足 (需 ${requiredSP} 点) 无法驱动【丧钟左轮】！`);
            return;
        }

        const dim = player.dimension;
        const headLoc = player.getHeadLocation();
        const viewDir = player.getViewDirection();

        Utils.playSound(player, "random.explode", 1.8, 1.0);
        Utils.playSound(player, "firework.launch", 1.6, 0.8);
        Utils.playSound(player, "random.totem", 1.5, 0.9);

        if (isSneaking) {
            // 模式二：【屠杀连发模式】 (150 SP, 30 PvE / 12 PvP)
            const offsets = [-0.1, 0, 0.1];
            for (const off of offsets) {
                const spreadDir = {
                    x: viewDir.x + off * -viewDir.z,
                    y: viewDir.y,
                    z: viewDir.z + off * viewDir.x,
                };
                const targets = TargetingService.getConeTargets(player, 35, 30, 8);
                for (const t of targets) {
                    DamageResolver.applyDamage(player, t, {
                        pveDamage: 30,
                        pvpDamage: 12,
                    });
                }
            }
            Utils.actionbar(player, "§4🔥 [丧钟·屠杀模式] 消耗150灵性激发扇形灵性风暴！");
        } else {
            // 模式一：【致命弱点射击】 (80 SP, 48 PvE / 22 PvP)
            const { entity, hitLoc } = TargetingService.getRayTarget(player, 55);
            if (entity) {
                DamageResolver.applyDamage(player, entity, {
                    pveDamage: 48,
                    pvpDamage: 22,
                    ignoreArmor: true,
                    armorPierceRatio: 0.5,
                });
                Utils.playSound(player, "random.break", 1.8, 1.0);
            }
            if (hitLoc) {
                try {
                    dim.spawnParticle("minecraft:large_explosion", hitLoc);
                    dim.spawnParticle("minecraft:sonic_explosion", hitLoc);
                } catch {}
            }
            Utils.actionbar(player, "§c☠ [丧钟左轮] 弱点看破！消耗80灵性为敌人敲响丧钟！");
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

        // 1. 灰烬收割者被动：命中附加 1 层余烬
        if (itemId === "lotm:ashen_reaper") {
            StatusEffectManager.applyStatus(target, "burning", 160, 1, attacker);
        }

        // 2. 破晓重剑被动：对亡灵普通攻击额外 +4
        if (itemId === "lotm:dawn_greatsword") {
            const isUndead = target.matches && (target.matches({ families: ["undead", "zombie", "skeleton"] }));
            if (isUndead) {
                try { target.applyDamage(4); } catch {}
            }
        }

        // 3. 血月刺剑被动：每第三次有效命中恢复 3 HP 与 20 SP
        if (itemId === "lotm:blood_moon_rapier") {
            state.hitCount += 1;
            if (state.hitCount % 3 === 0) {
                try {
                    const hp = attacker.getComponent("health");
                    if (hp) hp.setCurrentValue(Math.min(hp.effectiveMax, hp.currentValue + 3));
                } catch {}
                Utils.playSound(attacker, "random.orb", 1.5, 1.0);
                Utils.actionbar(attacker, "§4🩸 [血月之契] 第三击命中！恢复 3 HP 与 20 灵性！");
            }
        }
    }

    /**
     * 查看非凡武器实例与收容信息 (!artifact inspect)
     */
    static inspect(player) {
        const mainhand = player.getComponent && player.getComponent("inventory")?.container?.getItem(player.selectedSlotIndex);
        if (!mainhand || !this.isArtifact(mainhand.typeId)) {
            Utils.tell(player, "§c请手持一件非凡武器或封印物执行检查！");
            return;
        }

        const state = this.getState(player);
        const descriptions = {
            "lotm:ashen_reaper": `§c【3级·灰烬收割者】\n§7当前过热层数: ${state.overheat}/3\n§7收容要求: 箱内必须常备水桶或 3 瓶水。`,
            "lotm:dawn_greatsword": `§e【3级·破晓重剑】\n§7负面状态: 移速-10%，主动后发光 20 秒\n§7收容要求: 每日必须在日光下充能 30 秒。`,
            "lotm:silent_pointer": `§8【3级·无声教鞭】\n§7当前连续使用: ${state.silentUses}/3\n§7收容要求: 必须与时钟 (Clock) 置于同一容器。`,
            "lotm:blood_moon_rapier": `§4【2级·血月刺剑】\n§7当前血渴积累: ${state.bloodThirst}/100\n§7收容要求: 容器中必须存放密封血液瓶。`,
            "lotm:mirror_split_dagger": `§d【2级·镜裂短刃】\n§7身份裂痕: ${state.identityFracture}/100\n§7收容要求: 不透明包裹，严禁与镜面/玻璃同箱。`,
            "lotm:arsenal_box": `§6【2级·百兵匣】\n§7当前形态: ${state.arsenalForm}\n§7收容要求: 入箱前必须重置为空匣状态。`,
            "lotm:death_knell": `§c【2级封印物·丧钟左轮】\n§7负面代价: 累积干渴与随机弱点\n§7收容要求: 卸下弹药与子弹分开放置于黑色容器。`,
        };

        Utils.tell(
            player,
            `§6═══════【封印物鉴识报告】═══════\n` +
            `${descriptions[mainhand.typeId] || "未知非凡物品"}\n` +
            `§6══════════════════════════════`
        );
    }
}
