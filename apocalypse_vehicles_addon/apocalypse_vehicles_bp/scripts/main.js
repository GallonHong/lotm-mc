import { system, world, EquipmentSlot, ItemStack } from "@minecraft/server";
import { VehicleClass } from "./vehicles/VehicleClass.js";
import { VehicleMenu } from "./vehicles/VehicleMenu.js";
import { FuelManager } from "./vehicles/FuelManager.js";
import { FoodManager } from "./food/FoodManager.js";
import { VendingMachine } from "./vending/VendingMachine.js";
import * as VC from "./vehicles/VehicleConstants.js";

console.warn("[ApocalypseVehicles] Addon initializing with Vehicles, Foods, Medics & Vending Machines...");

// 初始化食物与医疗品、自动售货机系统
FoodManager.init();
VendingMachine.init();

/**
 * 健壮的事件订阅方法 (遵循 for-gemini.md 规范)
 */
function subscribeAfterEvent(eventName, handler) {
    try {
        const events = world.afterEvents;
        const signal = events ? events[eventName] : undefined;
        if (!signal || typeof signal.subscribe !== "function") return false;
        signal.subscribe(handler);
        return true;
    } catch {
        return false;
    }
}

// 1. 载具生成蛋自定义组件
const EntitySpawner = {
    onUseOn(event) {
        const player = event.source;
        const block = event.block;
        const item = event.itemStack;

        if (!player || player.typeId !== "minecraft:player" || !item) return;

        const itemId = item.typeId;
        const entityType = itemId.replace("_spawner", "");

        if (!entityType.startsWith("ab_ve:")) {
            player.sendMessage("§c[载具系统] 非法载具生成物品。");
            return;
        }

        const lore = item.getLore();
        let properties = {};
        let savedFuel = Config.fuel.defaultSpawnFuel;

        lore.forEach(line => {
            if (line.startsWith("§eMax Speed: §f")) {
                properties["ab_ve:max_speed"] = parseInt(line.replace("§eMax Speed: §f", ""), 10);
            } else if (line.startsWith("§eAcceleration: §f")) {
                properties["ab_ve:acceleration"] = parseInt(line.replace("§eAcceleration: §f", ""), 10);
            } else if (line.startsWith("§eSpecial: §f")) {
                properties["ab_ve:special"] = parseInt(line.replace("§eSpecial: §f", ""), 10);
            } else if (line.startsWith("§eColor ID: §f")) {
                properties["ab_ve:color"] = parseInt(line.replace("§eColor ID: §f", ""), 10);
            } else if (line.startsWith("§eFuel: §f")) {
                savedFuel = parseInt(line.replace("§eFuel: §f", ""), 10);
            }
        });

        const location = {
            x: block.x + 0.5,
            y: block.y + 1,
            z: block.z + 0.5
        };

        try {
            const spawnedEntity = world.getDimension(player.dimension.id).spawnEntity(entityType, location);
            spawnedEntity.setRotation(player.getRotation());

            // 还原车辆属性
            for (const [key, value] of Object.entries(properties)) {
                try {
                    spawnedEntity.setProperty(key, value);
                } catch {}
            }

            // 还原燃油
            FuelManager.setFuel(spawnedEntity, savedFuel);

            // 扣除手持物品
            const equippable = player.getComponent("minecraft:equippable");
            if (equippable) {
                equippable.setEquipment(EquipmentSlot.Mainhand, null);
            }

            player.runCommandAsync("playsound random.pop @a ~~~ 0.8");
        } catch (e) {
            console.error(`[ApocalypseVehicles] Spawn error: ${e}`);
        }
    }
};

try {
    world.beforeEvents.worldInitialize.subscribe((event) => {
        event.itemComponentRegistry.registerCustomComponent(
            "ab_ve:entity_spawner",
            EntitySpawner
        );
    });
} catch {}

// 2. 载具右键加注燃油 (手持满装汽油桶)
subscribeAfterEvent("playerInteractWithEntity", (event) => {
    const { player, target } = event;
    if (!player || !target || !target.isValid()) return;

    // 加注燃油处理
    if (FuelManager.tryRefuel(target, player)) {
        return;
    }
});

// 3. 机械改装菜单 (手持扳手交互)
subscribeAfterEvent("playerInteractWithEntity", (event) => {
    const { player, target } = event;
    if (!player || !target || !target.isValid()) return;

    const equippable = player.getComponent("minecraft:equippable");
    if (!equippable) return;

    const heldItem = equippable.getEquipment(EquipmentSlot.Mainhand);
    if (!heldItem) return;

    if (heldItem.typeId === "ab_ve:wrench") {
        VehicleMenu.openMenu(target, player);
        return;
    }
});

const allVehicleTypeIds = [
    "ab_ve:truck",
    "ab_ve:motorcycle",
    "ab_ve:ambulance",
    "ab_ve:speedboat",
    "ab_ve:helicopter"
];

/**
 * 载具自毁大爆炸执行函数 (清空背包 + 真实爆炸 + 零掉落)
 */
function explodeVehicle(vehicle) {
    if (!vehicle || !vehicle.isValid()) return;
    try {
        const loc = vehicle.location;
        const dim = vehicle.dimension;

        // 彻底清空后备箱物品，杜绝任何掉落物残留
        try {
            const inventory = vehicle.getComponent("minecraft:inventory")?.container;
            if (inventory) {
                for (let i = 0; i < inventory.size; i++) {
                    inventory.setItem(i, null);
                }
            }
        } catch {}

        // 立即从世界中移除载具，杜绝任何残骸掉落
        try {
            vehicle.remove();
        } catch {}

        // 触发剧烈真实爆炸冲击波 (威力 4.5，带烈火与震荡伤害)
        dim.createExplosion(loc, 4.5, {
            breaksBlocks: false,
            causesFire: true
        });

        // 播放震天巨响与超级巨型爆炸蘑菇云粒子
        try {
            world.playSound("random.explode", loc, { volume: 2.5, pitch: 0.8 });
        } catch {
            try {
                dim.runCommand(`playsound random.explode @a ${loc.x} ${loc.y} ${loc.z} 2.5 0.8`);
            } catch {}
        }
        try {
            dim.spawnParticle("minecraft:huge_explosion_emitter", loc);
        } catch {
            try {
                dim.runCommand(`particle minecraft:huge_explosion_emitter ${loc.x} ${loc.y + 0.5} ${loc.z}`);
            } catch {}
        }

        console.warn(`[ApocalypseVehicles] Vehicle ${vehicle.typeId} exploded into ash at ${Math.round(loc.x)}, ${Math.round(loc.y)}, ${Math.round(loc.z)}!`);
    } catch (err) {
        console.error(`[ApocalypseVehicles] Explosion error: ${err}`);
    }
}

/**
 * 载具受损后动态呈现血条与车身破损
 */
function syncVehicleDamage(vehicle, newHp, maxHp) {
    if (!vehicle || !vehicle.isValid()) return;
    try {
        // 车身开裂贴图同步
        const ratio = newHp / maxHp;
        let crackState = 0;
        if (ratio <= 0.33) {
            crackState = 2; // 严重损坏，冒出黑烟粒子
            try {
                vehicle.runCommandAsync("particle minecraft:basic_smoke_particle ~~~");
            } catch {}
        } else if (ratio <= 0.66) {
            crackState = 1; // 轻度破损
        }
        try {
            vehicle.setProperty("ab_ve:crack_state", crackState);
        } catch {}
    } catch {}
}

// 4. 枪械弹药/抛射物直接命中判定 (Projectile Hit)
subscribeAfterEvent("projectileHitEntity", (event) => {
    try {
        const hitResult = event.getEntityHit();
        const vehicle = hitResult?.entity;
        if (!vehicle || !vehicle.isValid() || !allVehicleTypeIds.includes(vehicle.typeId)) return;

        const projectile = event.projectile;
        const projType = projectile?.typeId || "";

        // 根据投射物类型结算真实破甲伤害
        let damage = 18; // 普通子弹标准伤害
        if (projType.includes("rocket") || projType.includes("grenade") || projType.includes("missile") || projType.includes("bomb")) {
            damage = 70; // 火箭弹/手雷高爆破片，一击重创或秒杀
        } else if (projType.includes("sniper") || projType.includes("heavy")) {
            damage = 35; // 重型狙击弹
        }

        const healthComp = vehicle.getComponent("minecraft:health");
        if (healthComp) {
            const newHp = Math.max(0, healthComp.currentValue - damage);
            try {
                healthComp.setCurrentValue(newHp);
            } catch {}

            if (newHp <= 0) {
                VehicleClass.explodeVehicle(vehicle);
            } else {
                syncVehicleDamage(vehicle, newHp, healthComp.effectiveMax);
            }
        }
    } catch (err) {
        console.error(`[ApocalypseVehicles] Projectile hit error: ${err}`);
    }
});

// 5. 外部近战/拳击/刀砍实体命中判定 (Melee Hit)
subscribeAfterEvent("entityHitEntity", (event) => {
    try {
        const vehicle = event.hitEntity;
        const attacker = event.damagingEntity;
        if (!vehicle || !vehicle.isValid() || !allVehicleTypeIds.includes(vehicle.typeId)) return;

        // 如果攻击者正在车上（驾驶员本人），属于开灯操作，不扣血
        const ridingComp = vehicle.getComponent("minecraft:rideable");
        if (ridingComp && ridingComp.getRiders().some(r => r.id === attacker.id)) {
            return;
        }

        // 外部攻击（刀砍、僵尸拍击、徒手砸车）扣除真实血量
        const healthComp = vehicle.getComponent("minecraft:health");
        if (healthComp) {
            const newHp = Math.max(0, healthComp.currentValue - 8);
            try {
                healthComp.setCurrentValue(newHp);
            } catch {}

            if (newHp <= 0) {
                VehicleClass.explodeVehicle(vehicle);
            } else {
                syncVehicleDamage(vehicle, newHp, healthComp.effectiveMax);
            }
        }
    } catch (err) {
        console.error(`[ApocalypseVehicles] Entity hit error: ${err}`);
    }
});

// 6. 原版伤害管线监听 (TNT爆炸、枪械脚本applyDamage、点火灼烧)
subscribeAfterEvent("entityHurt", (event) => {
    const entity = event.hurtEntity;
    if (!entity || !entity.isValid() || !allVehicleTypeIds.includes(entity.typeId)) return;

    try {
        const healthComp = entity.getComponent("minecraft:health");
        if (!healthComp) return;

        const damage = event.damage || 0;
        const cause = event.damageSource?.cause || "";

        // 爆炸致命加成：TNT、炸弹命中造成额外巨量伤害
        let extraDamage = 0;
        if (cause && (cause.toLowerCase().includes("explosion") || cause.toLowerCase().includes("firework"))) {
            extraDamage = Math.max(40, damage * 2);
        }

        let newHp = healthComp.currentValue;
        if (extraDamage > 0) {
            newHp = Math.max(0, newHp - extraDamage);
            try {
                healthComp.setCurrentValue(newHp);
            } catch {}
        }

        if (newHp <= 0) {
            VehicleClass.explodeVehicle(entity);
        } else {
            syncVehicleDamage(entity, newHp, healthComp.effectiveMax);
        }
    } catch (err) {
        console.error(`[ApocalypseVehicles] Hurt error: ${err}`);
    }
});

// 7. 载具死亡兜底：触发剧烈殉爆，彻底消除零掉落物
subscribeAfterEvent("entityDie", (event) => {
    const deadEntity = event.deadEntity;
    if (!deadEntity || !allVehicleTypeIds.includes(deadEntity.typeId)) return;
    VehicleClass.explodeVehicle(deadEntity);
});

// 6. 20 TPS 物理与动力主循环驱动
system.runInterval(() => {
    VehicleClass.updateAllVehicles();
}, 1);
