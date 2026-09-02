import { system, ItemStack, world } from "@minecraft/server";
import * as VC from "./VehicleConstants.js";

/**
 * 各款载具的专属技能与交互特权
 */
export class VehicleSpecificFunctions {
    /**
     * 救护车：战地群体回血光环 (跳跃激活)
     */
    static ambulanceAura(vehicle, player) {
        if (!vehicle || !player) return;

        const specialLevel = vehicle.getProperty("ab_ve:special") || 0;
        const specialEntry = VC.specialUpgrades[vehicle.typeId]?.find(u => u.level === specialLevel);
        const auraRange = specialEntry ? specialEntry.range_value : 4;
        const auraAmplifier = specialEntry ? specialEntry.amplifier : 0;

        try {
            vehicle.runCommand(`effect @e[r=${auraRange},family=player] regeneration 6 ${auraAmplifier} true`);
            vehicle.playAnimation(`animation.ab_ve.ambulance.heal_aura.${specialLevel}`);
        } catch {}

        player.onScreenDisplay.setActionBar(`§a➕ [战地医疗] 医疗光环已触发！(等级: ${specialLevel + 1}, 范围: ${auraRange}格)`);
        player.runCommandAsync("playsound note.bell @s ~~~ 0.8 1.4");
    }

    /**
     * 摩托车：抬前轮特技与爆发推进 (跳跃激活)
     */
    static tryWheely(vehicle, player) {
        if (!vehicle || !player) return;

        if (vehicle.wheelyCooldown === undefined) {
            vehicle.wheelyCooldown = 0;
        }

        if (vehicle.wheelyCooldown > 0) {
            vehicle.wheelyCooldown--;
            return;
        }

        if (player.isJumping && vehicle.wheelyCooldown === 0) {
            const rotation = vehicle.getRotation();
            const yaw = (rotation.y * Math.PI) / 180;
            const forwardX = -Math.sin(yaw);
            const forwardZ = Math.cos(yaw);
            const horizontalStrength = 1.8;

            vehicle.applyImpulse({
                x: forwardX * horizontalStrength,
                y: 0.1,
                z: forwardZ * horizontalStrength
            });

            try {
                player.playAnimation("animation.ab_ve.player.wheely_motorcycle");
                vehicle.playAnimation("animation.ab_ve.motorcycle.wheely");
                player.runCommandAsync("playsound ab_ve.cars.motorcycle_rev @a[r=8] ~~~ 0.8");
            } catch {}

            vehicle.wheelyCooldown = 25; // 冷却 1.25 秒
        }
    }

    /**
     * 皮卡：动态维护后备箱扩展容量
     */
    static fixTruckInventory(vehicle) {
        if (!vehicle || vehicle.typeId !== "ab_ve:truck") return;
        try {
            vehicle.triggerEvent("ab_ve:fix_inventory_size");
        } catch {}
    }
}
