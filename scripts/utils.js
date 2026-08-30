import { world, system, ItemStack } from "@minecraft/server";
import { Config } from "./config.js";

/**
 * 工具函数集合
 */
export class Utils {
    /**
     * 向指定玩家发送带前缀的消息
     * @param {import("@minecraft/server").Player} player 
     * @param {string} text 
     */
    static tell(player, text) {
        if (!player) return;
        player.sendMessage(`§l[§e系统§r§l]§r ${text}`);
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
            const invokeCallback = () => {
                try {
                    callback(res);
                } catch (err) {
                    const details = err?.stack || String(err);
                    console.error(`[UI Callback Error] selection=${res.selection}: ${details}`);
                    Utils.tell(player, "§c菜单操作执行失败，错误详情已写入内容日志。请将新的完整日志反馈给开发者。");
                }
            };

            if (res.canceled) {
                const reason = String(res.cancelationReason || "");
                if (reason.includes("UserBusy") && maxRetries > 0) {
                    system.runTimeout(() => {
                        Utils.showForm(player, form, callback, maxRetries - 1);
                    }, 3);
                    return;
                }
                // 让各菜单有机会在玩家主动关闭时执行返回逻辑。
                invokeCallback();
                return;
            }
            invokeCallback();
        }).catch((err) => {
            const details = err?.stack || String(err);
            console.error(`[UI Form Error] ${details}`);
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
        world.sendMessage(`§l[§6公告§r§l]§r ${text}`);
    }

    /**
     * 播放音效
     * @param {import("@minecraft/server").Player} player 
     * @param {string} soundName 
     * @param {number} pitch 
     * @param {number} volume 
     */
    static playSound(player, soundName, pitch = 1.0, volume = 1.0) {
        try {
            player.playSound(soundName, { pitch, volume });
        } catch (e) {
            // 容错处理
        }
    }

    /**
     * 常用提示音效集合
     */
    static sound = {
        success: (player) => Utils.playSound(player, "random.orb", 1.2, 1.0),
        click: (player) => Utils.playSound(player, "ui.button.click", 1.0, 0.8),
        fail: (player) => Utils.playSound(player, "note.bass", 0.8, 1.0),
        buy: (player) => Utils.playSound(player, "random.levelup", 1.5, 1.0),
        gachaRoll: (player) => Utils.playSound(player, "random.fuse", 1.8, 1.0),
        rareWin: (player) => Utils.playSound(player, "random.totem", 1.0, 1.0),
        warn: (player) => Utils.playSound(player, "note.bassattack", 0.6, 1.0),
        teleport: (player) => Utils.playSound(player, "mob.endermen.portal", 1.0, 1.0),
    };

    /**
     * 格式化货币数量
     * @param {number} amount 
     * @returns {string}
     */
    static formatCurrency(amount) {
        const num = Math.floor(amount || 0);
        return `§e${num.toLocaleString()} §r${Config.economy.currencyName}`;
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
        if (!Utils.isValid(player)) return false;
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
        const currentCount = Utils.countItem(player, typeId);
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
                    container.setItem(i, undefined);
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

                // 尝试放入背包
                const leftover = container.addItem(item);
                if (leftover) {
                    // 背包已满，掉落至世界
                    player.dimension.spawnItem(leftover, player.location);
                    Utils.actionbar(player, "§6[提示] 背包空间不足，部分物品已掉落在地面！");
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
            minX: minX,
            maxX: minX + 15,
            minZ: minZ,
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
            return val !== undefined && val !== null ? val : defaultValue;
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
}
