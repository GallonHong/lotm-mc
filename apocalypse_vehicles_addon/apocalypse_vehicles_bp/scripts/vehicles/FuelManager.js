import { world, system, ItemStack, EquipmentSlot } from "@minecraft/server";
import { Config } from "../config.js";

/**
 * 载具动态燃油管理器
 */
export class FuelManager {
    /**
     * 发送 Action Bar 提示 (双重容错：支持 onScreenDisplay 与 title 命令)
     */
    static sendActionBar(player, text) {
        if (!player) return;
        try {
            if (player.onScreenDisplay && typeof player.onScreenDisplay.setActionBar === "function") {
                player.onScreenDisplay.setActionBar(text);
                return;
            }
        } catch {}
        try {
            player.runCommandAsync(`title @s actionbar ${text}`);
        } catch {}
    }

    /**
     * 获取载具当前燃油量 (0 ~ 100)
     */
    static getFuel(vehicle) {
        if (!vehicle || !vehicle.isValid()) return 0;
        try {
            const fuel = vehicle.getDynamicProperty("fuel");
            if (typeof fuel === "number") {
                return Math.max(0, Math.min(Config.fuel.maxFuel, fuel));
            }
        } catch {}
        // 未初始化则赋予默认满油
        const defaultFuel = Config.fuel.defaultSpawnFuel;
        try {
            vehicle.setDynamicProperty("fuel", defaultFuel);
        } catch {}
        return defaultFuel;
    }

    /**
     * 设置载具燃油量
     */
    static setFuel(vehicle, amount) {
        if (!vehicle || !vehicle.isValid()) return;
        const clamped = Math.max(0, Math.min(Config.fuel.maxFuel, amount));
        try {
            vehicle.setDynamicProperty("fuel", clamped);
        } catch {}
    }

    /**
     * 为载具加油 (手持满装汽油桶交互)
     */
    static tryRefuel(vehicle, player) {
        if (!vehicle || !vehicle.isValid() || !player) return false;

        const equippable = player.getComponent("minecraft:equippable");
        if (!equippable) return false;

        const mainhand = equippable.getEquipment(EquipmentSlot.Mainhand);
        if (!mainhand || mainhand.typeId !== "survival_vehicle:jerrycan_full") {
            return false;
        }

        const currentFuel = this.getFuel(vehicle);
        if (currentFuel >= Config.fuel.maxFuel) {
            this.sendActionBar(player, "§e⛽ [油量提示] 载具油箱已满 (100%)，无需加注！");
            player.runCommandAsync("playsound note.bell @s ~~~ 0.3");
            return true;
        }

        // 加注燃油
        this.setFuel(vehicle, Config.fuel.maxFuel);

        // 消耗 1 个满油桶，给予 1 个空油桶
        if (mainhand.amount > 1) {
            mainhand.amount -= 1;
            equippable.setEquipment(EquipmentSlot.Mainhand, mainhand);
            const emptyCan = new ItemStack("survival_vehicle:jerrycan_empty", 1);
            player.dimension.spawnItem(emptyCan, player.location);
        } else {
            const emptyCan = new ItemStack("survival_vehicle:jerrycan_empty", 1);
            equippable.setEquipment(EquipmentSlot.Mainhand, emptyCan);
        }

        // 播放音效与提示
        player.runCommandAsync("playsound bucket.empty_water @a ~~~ 0.8 1.2");
        this.sendActionBar(player, "§a⛽ [加注完成] 燃油已注满 (100%)！获得空汽油桶。");
        return true;
    }

    /**
     * 每 Tick 更新燃油消耗与驾驶舱 HUD 状态
     * @returns {boolean} 发动机是否正常运行 (true 为有油运行，false 为缺油熄火)
     */
    static updateFuelAndHud(vehicle, player, isMoving) {
        if (!vehicle || !vehicle.isValid() || !player) return false;

        let fuel = this.getFuel(vehicle);
        const typeId = vehicle.typeId;
        const isHelicopter = typeId === "ab_ve:helicopter";

        // 计算当前速度 (MC中 1格/tick = 72 km/h)
        const vel = vehicle.getVelocity();
        const speed = Math.round(Math.sqrt(vel.x * vel.x + vel.z * vel.z) * 72);

        // 燃油消耗逻辑：移动中消耗
        const burnRate = Config.fuel.consumptionRates[typeId] || 0.015;
        if (isMoving && fuel > 0) {
            fuel = Math.max(0, fuel - burnRate);
            this.setFuel(vehicle, fuel);
        }

        // 燃油耗尽处理
        if (fuel <= 0) {
            this.sendActionBar(player, "§c⛽ [燃油耗尽 Engine Stalled] §7请使用满装汽油桶加油！");

            // 直升机缺油保护：开启缓降避免从高空摔死
            if (isHelicopter) {
                try {
                    vehicle.addEffect("slow_falling", 20, { amplifier: 1, showParticles: false });
                } catch {}
            }
            return false;
        }

        // 绘制 10 格刻度条
        const percent = Math.floor(fuel);
        const filledSlots = Math.round((fuel / Config.fuel.maxFuel) * 10);
        let barColor = "§a";
        if (percent < 20) {
            barColor = "§c";
        } else if (percent < 50) {
            barColor = "§e";
        }

        // 获取真实血量
        let hpText = "";
        try {
            const healthComp = vehicle.getComponent("minecraft:health");
            if (healthComp) {
                const curHp = Math.ceil(healthComp.currentValue);
                const maxHp = Math.ceil(healthComp.effectiveMax);
                const hpRatio = curHp / maxHp;
                let hpColor = "§a";
                if (hpRatio < 0.3) {
                    hpColor = "§c";
                } else if (hpRatio < 0.6) {
                    hpColor = "§e";
                }
                hpText = `§c❤ ${hpColor}${curHp}§7/§c${maxHp} §7| `;
            }
        } catch {}

        const bar = barColor + "█".repeat(filledSlots) + "§8" + "░".repeat(Math.max(0, 10 - filledSlots));
        this.sendActionBar(player, `${hpText}§e⛽ [${bar}§e] ${percent}% §7| ⚡ 时速: §b${speed} km/h`);

        return true;
    }
}
