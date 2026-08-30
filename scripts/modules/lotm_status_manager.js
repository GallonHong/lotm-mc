import { system, world } from "@minecraft/server";
import { Utils } from "../utils.js";

/**
 * 《诡秘之主》统一状态效果管理器 (StatusEffectManager)
 * 遵循 PRD 4.1 & 4.2 节：
 * 统一基于 expiresAtTick 批处理心跳，内置递减抗性与 Boss 韧性
 */
export class StatusEffectManager {
    // 实体状态表: entityId -> Map<statusName, { expiresAtTick, value, sourceId }>
    static entityStatuses = new Map();

    // 玩家控制递减历史记录: playerId -> Map<statusName, Array<receivedTick>>
    static ccHistory = new Map();

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

        const currentTick = system.currentTick;
        let finalDuration = durationTicks;

        // 1. 玩家控制递减规则 (PRD 4.2: 8秒内第二次-50%，第三次及以上-75%)
        if (entity.typeId === "minecraft:player" && ["sleep", "drowsy", "fear", "silence"].includes(statusName)) {
            const playerId = entity.id;
            if (!this.ccHistory.has(playerId)) {
                this.ccHistory.set(playerId, new Map());
            }
            const pHistory = this.ccHistory.get(playerId);
            const historyList = pHistory.get(statusName) || [];
            
            // 清理 160 tick (8秒) 之前的过期记录
            const recent = historyList.filter(t => currentTick - t < 160);
            
            if (recent.length === 1) {
                finalDuration = Math.floor(finalDuration * 0.5);
            } else if (recent.length >= 2) {
                finalDuration = Math.floor(finalDuration * 0.25);
            }
            
            recent.push(currentTick);
            pHistory.set(statusName, recent);

            // PvP 封顶限制
            if (statusName === "drowsy" || statusName === "sleep") finalDuration = Math.min(finalDuration, 30); // <= 1.5s
            if (statusName === "fear") finalDuration = Math.min(finalDuration, 24); // <= 1.2s
            if (statusName === "silence") finalDuration = Math.min(finalDuration, 20); // <= 1.0s
        }

        // 2. Boss 实体控制韧性 (Boss 默认控制时长为 0.25 倍)
        const isBoss = entity.typeId.includes("dragon") || entity.typeId.includes("wither") || entity.typeId.includes("warden");
        if (isBoss && ["sleep", "drowsy", "fear", "silence"].includes(statusName)) {
            finalDuration = Math.floor(finalDuration * 0.25);
            if (statusName === "sleep") {
                // Boss 免疫深度沉睡，转化为减速
                statusName = "drowsy";
            }
        }

        if (finalDuration <= 0) return;

        // 3. 写入状态映射表
        if (!this.entityStatuses.has(entity.id)) {
            this.entityStatuses.set(entity.id, new Map());
        }
        const statuses = this.entityStatuses.get(entity.id);
        const expiresAtTick = currentTick + finalDuration;

        statuses.set(statusName, {
            expiresAtTick,
            value,
            sourceId: source ? source.id : null,
        });

        // 4. 施加即时原版状态适配 (视觉与物理效果)
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
        } catch {}
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
        return system.currentTick < status.expiresAtTick;
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
            } catch {}
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
        const currentTick = system.currentTick;
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
}
