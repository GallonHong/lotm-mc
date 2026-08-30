import { world, system } from "@minecraft/server";
import { Config } from "../config.js";
import { Utils } from "../utils.js";
import { LotmManager } from "./lotm.js";

// 玩家射击冷却记录
const playerCooldowns = new Map();

/**
 * 抽奖限定非凡神兵管理器：【2级封印物 · 丧钟左轮】
 */
export class WeaponManager {
    /**
     * 判断物品是否为非凡神兵 / 丧钟左轮
     * @param {import("@minecraft/server").ItemStack} itemStack 
     * @returns {boolean}
     */
    static isGun(itemStack) {
        if (!itemStack) return false;
        if (itemStack.typeId === "lotm:death_knell" || itemStack.typeId === "custom:thunder_blaster") return true;
        // 兼容原版替代物 (附带特定名称)
        if (itemStack.nameTag && (itemStack.nameTag.includes("丧钟") || itemStack.nameTag.includes("雷霆聚能炮"))) {
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

        // 1. 凡人使用封印物：触发失控反噬
        if (seq === 0) {
            LotmManager.triggerMadness(player, "凡人强行驱使2级封印物【丧钟】遭到精神污染");
            Utils.tell(player, "§c普通人的肉身与精神无法承受2级封印物的庞大灵性负荷！必须服食魔药踏入序列！");
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

        // 2. 消耗大量灵性
        if (!LotmManager.modifySpirituality(player, -requiredSpirituality)) {
            Utils.playSound(player, "random.click", 1.8, 1.0);
            Utils.actionbar(player, `§c✧ 灵性枯竭 (需 ${requiredSpirituality} 点)！无法驱动2级封印物【丧钟】！`);
            return;
        }

        playerCooldowns.set(player.id, now);
        LotmManager.addDigestion(player, 2);

        if (isSneaking) {
            // 模式二：【屠杀连发模式 (Slaughter Burst)】
            this.fireSlaughterBurst(player);
        } else {
            // 模式一：【致命弱点射击 (Weakness Strike)】
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

        // 1. 枪声轰鸣与悠扬丧钟钟鸣
        Utils.playSound(player, "random.explode", 1.8, 1.0);
        Utils.playSound(player, "firework.launch", 1.6, 0.8);
        Utils.playSound(player, "random.totem", 1.5, 0.9);

        // 枪口处火焰激波
        const muzzleLoc = {
            x: headLoc.x + viewDir.x * 1.0,
            y: headLoc.y + viewDir.y * 1.0 - 0.2,
            z: headLoc.z + viewDir.z * 1.0,
        };
        try {
            dimension.spawnParticle("minecraft:flame_particle", muzzleLoc);
            dimension.spawnParticle("minecraft:sonic_explosion", muzzleLoc);
        } catch {}

        // 2. 射线碰撞检测
        let hitDistance = maxRange;
        let hitLocation = {
            x: headLoc.x + viewDir.x * maxRange,
            y: headLoc.y + viewDir.y * maxRange,
            z: headLoc.z + viewDir.z * maxRange,
        };

        // 方块碰撞
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
                        z: headLoc.z + viewDir.z * dist,
                    };
                }
            }
        } catch {}

        // 实体命中
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
                            z: headLoc.z + viewDir.z * dist,
                        };

                        // 造成 48 点穿透弱点毁灭伤害
                        try {
                            target.applyDamage(damage, { damagingEntity: player, cause: "entityAttack" });
                        } catch {
                            try { target.applyDamage(damage); } catch {}
                        }

                        // 强力击退
                        try {
                            if (typeof target.applyKnockback === "function") {
                                try { target.applyKnockback({ x: viewDir.x, y: 0.25, z: viewDir.z }, 2.5); }
                                catch { target.applyKnockback(viewDir.x, viewDir.z, 2.5, 0.4); }
                            }
                        } catch {}

                        // 命中丧钟受击特效
                        Utils.playSound(player, "random.break", 1.8, 1.0);
                        try {
                            dimension.spawnParticle("minecraft:large_explosion", hitLocation);
                            dimension.spawnParticle("minecraft:sonic_explosion", hitLocation);
                        } catch {}
                        break;
                    }
                }
            }
        } catch {}

        // 3. 绘制幽蓝灵性符文弹道粒子 (从枪口0.6格延伸至命中点)
        const maxDraw = Math.max(3.0, hitDistance);
        for (let d = 0.6; d < maxDraw; d += 0.7) {
            const px = headLoc.x + viewDir.x * d;
            const py = headLoc.y + viewDir.y * d;
            const pz = headLoc.z + viewDir.z * d;

            try {
                dimension.spawnParticle("minecraft:crit", { x: px, y: py, z: pz });
            } catch {}
        }

        // 终点碰撞光斑
        try {
            dimension.spawnParticle("minecraft:large_explosion", hitLocation);
        } catch {}

        Utils.actionbar(player, "§c☠ [丧钟左轮] 弱点看破！消耗80灵性为敌人敲响丧钟！");
    }

    /**
     * 模式二：【屠杀连发模式】（潜行开火，3连发扇形激波爆破，消耗 150 灵性）
     */
    static fireSlaughterBurst(player) {
        const dimension = player.dimension;
        const headLoc = player.getHeadLocation();
        const viewDir = player.getViewDirection();

        Utils.playSound(player, "random.explode", 2.0, 1.0);
        Utils.playSound(player, "firework.launch", 1.8, 0.8);
        Utils.playSound(player, "random.totem", 1.6, 1.0);

        // 3发连射激波
        const offsets = [-0.1, 0, 0.1];
        for (const off of offsets) {
            const spreadDir = {
                x: viewDir.x + off * -viewDir.z,
                y: viewDir.y,
                z: viewDir.z + off * viewDir.x,
            };

            try {
                const hits = dimension.getEntitiesFromRay(headLoc, spreadDir, { maxDistance: 40 });
                for (const hit of hits) {
                    const target = hit.entity;
                    if (target && target.id !== player.id && target.typeId !== "minecraft:item") {
                        try {
                            target.applyDamage(30, { damagingEntity: player, cause: "entityAttack" });
                        } catch {
                            try { target.applyDamage(30); } catch {}
                        }
                    }
                }
            } catch {}

            // 绘制瞬间消散的激波弹道 (0.15秒瞬逝)
            for (let d = 1.0; d < 35; d += 1.5) {
                try {
                    dimension.spawnParticle("minecraft:crit", {
                        x: headLoc.x + spreadDir.x * d,
                        y: headLoc.y + spreadDir.y * d,
                        z: headLoc.z + spreadDir.z * d,
                    });
                } catch {}
            }
        }

        Utils.actionbar(player, "§4🔥 [丧钟·屠杀模式] 消耗150灵性激发扇形灵性风暴！");
    }

    /**
     * 发放限定非凡神兵【丧钟左轮】给玩家
     * @param {import("@minecraft/server").Player} player 
     */
    static giveGun(player) {
        const typeId = "lotm:death_knell";
        const nameTag = "§l§6【2级封印物】§c丧钟左轮";
        const lore = [
            "§7══════════════════════════════",
            "§e品级: §62级封印物 §7(Grade 2 Sealed Artifact)",
            "§f类型: §c非凡左轮手枪",
            "§f威力: §c48 点弱点伤害 §7(附带穿透爆头)",
            "§f射程: §b55 格超视距狙击",
            "§7──────────────────────────────",
            "§e[常规射击] §f右键消耗 §d80 灵性§f，弱点必杀并敲响丧钟",
            "§e[屠杀模式] §f潜行+右键消耗 §d150 灵性§f，触发3发连射爆破",
            "§c[封印负面] §4凡人强行开火将遭受精神污染与失控反噬",
            "§7══════════════════════════════",
            "§8\"当钟声响起时，命运的子弹已穿透敌人的心脏。\""
        ];

        try {
            Utils.giveItem(player, typeId, 1, nameTag, lore);
        } catch {
            Utils.giveItem(player, "minecraft:blaze_rod", 1, nameTag, lore);
        }
    }
}
