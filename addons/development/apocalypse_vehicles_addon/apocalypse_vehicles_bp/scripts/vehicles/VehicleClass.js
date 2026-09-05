import { system, world } from "@minecraft/server";
import * as VC from "./VehicleConstants.js";
import { VehicleSpecificFunctions } from "./VehicleSpecificFunctions.js";
import { FuelManager } from "./FuelManager.js";

export class VehicleClass {
    static crackingTimers = new Map();
    static entityTickerSpeeds = new Map();

    static removeTimerForEntity(entityId) {
        if (VehicleClass.crackingTimers.has(entityId)) {
            system.clearJob(VehicleClass.crackingTimers.get(entityId));
            VehicleClass.crackingTimers.delete(entityId);
        }
    }

    static resetCracking(entity) {
        try {
            const entityId = entity.id;
            if (VehicleClass.crackingTimers.has(entityId)) {
                system.clearJob(VehicleClass.crackingTimers.get(entityId));
            }
            const timer = system.runTimeout(() => {
                try {
                    const crackingState = entity.getProperty("ab_ve:crack_state");
                    if (crackingState > 0) {
                        entity.setProperty("ab_ve:crack_state", 0);
                    }
                    VehicleClass.crackingTimers.delete(entityId);
                } catch {}
            }, 30);
            VehicleClass.crackingTimers.set(entityId, timer);
        } catch {}
    }

    /**
     * 更新陆地载具（皮卡、摩托、救护车）运动与物理效果
     */
    static updateCarsTickerSpeed(entity) {
        try {
            const entityId = entity.id;
            const type = entity.typeId;

            if (type === "ab_ve:truck") {
                VehicleSpecificFunctions.fixTruckInventory(entity);
            }

            const ridingComp = entity.getComponent("minecraft:rideable");
            if (!ridingComp) return;
            const riders = ridingComp.getRiders();
            const rider = riders.length > 0 ? riders[0] : null;

            if (entity.getDynamicProperty("honkCooldown") === undefined) {
                entity.setDynamicProperty("honkCooldown", 0);
            }
            let honkCooldown = entity.getDynamicProperty("honkCooldown");

            const velocity = entity.getVelocity();
            const viewDir = entity.getViewDirection();
            const dotProduct = velocity.x * viewDir.x + velocity.y * viewDir.y + velocity.z * viewDir.z;
            const isMoving = dotProduct > 0.06;

            let hasFuel = true;
            if (rider) {
                hasFuel = FuelManager.updateFuelAndHud(entity, rider, isMoving);

                const isJumping = rider.isJumping;
                if (type === "ab_ve:motorcycle") {
                    VehicleSpecificFunctions.tryWheely(entity, rider);
                } else if (isJumping && type === "ab_ve:ambulance") {
                    if (honkCooldown <= 0) {
                        VehicleSpecificFunctions.ambulanceAura(entity, rider);
                        entity.setDynamicProperty("honkCooldown", 100);
                    }
                } else if (isJumping) {
                    if (honkCooldown <= 0) {
                        entity.runCommandAsync("playsound ab_ve.cars.honk @a ^^^2 1 1 0.01");
                        entity.setDynamicProperty("honkCooldown", 10);
                    }
                }
            }

            if (honkCooldown > 0) {
                entity.setDynamicProperty("honkCooldown", honkCooldown - 1);
            }

            // 动力计算
            const maxSpeedLevel = entity.getProperty("ab_ve:max_speed") || 0;
            const accelerationLevel = entity.getProperty("ab_ve:acceleration") || 0;

            let tickerSpeed = VehicleClass.entityTickerSpeeds.get(entityId) || 0;
            const maxSpeedEntry = VC.maxSpeedUpgrades[type]?.find(u => u.level === maxSpeedLevel);
            const accelerationEntry = VC.accelerationUpgrades[type]?.find(u => u.level === accelerationLevel);

            if (!maxSpeedEntry || !accelerationEntry) return;

            const maxSpeed = maxSpeedEntry.max_speed;
            const acceleration = accelerationEntry.acceleration;

            if (hasFuel && isMoving) {
                tickerSpeed = Math.min(tickerSpeed + acceleration, maxSpeed * 200);
            } else {
                tickerSpeed = Math.max(tickerSpeed - 600, 0);
            }

            const effectLevel = Math.min(Math.floor(tickerSpeed / 200), maxSpeed);
            if (hasFuel && effectLevel > 0) {
                entity.addEffect("speed", 5, { amplifier: effectLevel, showParticles: false });
            }

            VehicleClass.entityTickerSpeeds.set(entityId, tickerSpeed);
        } catch {}
    }

    /**
     * 更新空中载具（军用直升机）
     */
    static updatePlanesTickerSpeed(entity) {
        try {
            const entityId = entity.id;
            const type = entity.typeId;

            const ridingComp = entity.getComponent("minecraft:rideable");
            if (!ridingComp) return;
            const riders = ridingComp.getRiders();
            const rider = riders.length > 0 ? riders[0] : null;

            if (!rider) {
                try {
                    entity.removeEffect("levitation");
                    entity.removeEffect("slow_falling");
                    entity.triggerEvent("gravity_true");
                } catch {}
                return;
            }

            const velocity = entity.getVelocity();
            const viewDir = entity.getViewDirection();
            const rot = rider.getRotation(); // { x: pitch, y: yaw }
            const pitch = rot.x;
            const isJumping = rider.isJumping;

            const dotProduct = velocity.x * viewDir.x + velocity.y * viewDir.y + velocity.z * viewDir.z;
            const isMoving = dotProduct > 0.04 || Math.abs(velocity.y) > 0.04;

            // 更新燃油与 HUD
            const hasFuel = FuelManager.updateFuelAndHud(entity, rider, isMoving);

            // 彻底清除任何残留的 levitation 药水效果，防止外界或旧动画指令残留
            try {
                entity.removeEffect("levitation");
            } catch {}

            if (!hasFuel) {
                try {
                    entity.triggerEvent("gravity_true");
                    entity.addEffect("slow_falling", 20, { amplifier: 1, showParticles: false });
                } catch {}
                return;
            }

            // 直升机垂直升降与稳定悬停控制系统：
            // 1. 爬升 (按住跳跃/空格键 或 明显仰头 pitch < -15)
            if (isJumping || pitch < -15) {
                // 向上升空：设定最大垂直爬升速度上限 0.28 (~5.6格/秒)，平滑到达后不再无限累加
                if (velocity.y < 0.28) {
                    const climbForce = isJumping ? 0.15 : Math.min(0.20, (Math.abs(pitch) - 15) * 0.005 + 0.10);
                    entity.applyImpulse({ x: 0, y: climbForce, z: 0 });
                }
            }
            // 2. 下降/着陆 (明显低头俯视 pitch > 15)
            else if (pitch > 15) {
                // 向下降落：设定平稳下沉速度上限 -0.22 (~4.4格/秒)，避免坠毁
                if (velocity.y > -0.22) {
                    const sinkForce = Math.max(-0.15, -((pitch - 15) * 0.005 + 0.08));
                    entity.applyImpulse({ x: 0, y: sinkForce, z: 0 });
                }
            }
            // 3. 悬停 / 水平巡航 (-15 <= pitch <= 15 且未按跳跃键)
            else {
                // 彻底解决“一直向上飞无法停止”：
                // 如果当前还有向上冲的惯性速度，主动施加反向阻尼，在 2-3 tick 内迅速刹车并悬停
                if (velocity.y > 0.02) {
                    entity.applyImpulse({ x: 0, y: -velocity.y * 0.5, z: 0 });
                } else if (velocity.y < -0.04) {
                    // 如果因为轻微重力有下坠趋势，施加微弱向上浮力托住
                    entity.applyImpulse({ x: 0, y: -velocity.y * 0.5, z: 0 });
                }
            }

            // 动力与前向巡航
            const maxSpeedLevel = entity.getProperty("ab_ve:max_speed") || 0;
            const accelerationLevel = entity.getProperty("ab_ve:acceleration") || 0;

            let tickerSpeed = VehicleClass.entityTickerSpeeds.get(entityId) || 0;
            const maxSpeedEntry = VC.maxSpeedUpgrades[type]?.find(u => u.level === maxSpeedLevel);
            const accelerationEntry = VC.accelerationUpgrades[type]?.find(u => u.level === accelerationLevel);

            if (maxSpeedEntry && accelerationEntry) {
                const maxSpeed = maxSpeedEntry.max_speed;
                const acceleration = accelerationEntry.acceleration;

                if (isMoving) {
                    tickerSpeed = Math.min(tickerSpeed + acceleration, maxSpeed * 200);
                } else {
                    tickerSpeed = Math.max(tickerSpeed - 600, 0);
                }

                const effectLevel = Math.min(Math.floor(tickerSpeed / 200), maxSpeed);
                if (effectLevel > 0) {
                    entity.addEffect("speed", 5, { amplifier: effectLevel, showParticles: false });
                }
                VehicleClass.entityTickerSpeeds.set(entityId, tickerSpeed);
            }
        } catch {}
    }

    /**
     * 更新水上载具（快艇）
     */
    static updateBoatsTickerSpeed(entity) {
        try {
            const entityId = entity.id;
            const type = entity.typeId;

            const ridingComp = entity.getComponent("minecraft:rideable");
            if (!ridingComp) return;
            const riders = ridingComp.getRiders();
            const rider = riders.length > 0 ? riders[0] : null;

            const velocity = entity.getVelocity();
            const viewDir = entity.getViewDirection();
            const dotProduct = velocity.x * viewDir.x + velocity.y * viewDir.y + velocity.z * viewDir.z;
            const isMoving = dotProduct > 0.04;

            let hasFuel = true;
            if (rider) {
                hasFuel = FuelManager.updateFuelAndHud(entity, rider, isMoving);
            }

            const maxSpeedLevel = entity.getProperty("ab_ve:max_speed") || 0;
            const accelerationLevel = entity.getProperty("ab_ve:acceleration") || 0;

            let tickerSpeed = VehicleClass.entityTickerSpeeds.get(entityId) || 0;
            const maxSpeedEntry = VC.maxSpeedUpgrades[type]?.find(u => u.level === maxSpeedLevel);
            const accelerationEntry = VC.accelerationUpgrades[type]?.find(u => u.level === accelerationLevel);

            if (!maxSpeedEntry || !accelerationEntry) return;

            const maxSpeed = maxSpeedEntry.max_speed;
            const acceleration = accelerationEntry.acceleration;

            if (hasFuel && isMoving) {
                tickerSpeed = Math.min(tickerSpeed + acceleration, maxSpeed * 200);
            } else {
                tickerSpeed = Math.max(tickerSpeed - 600, 0);
            }

            const effectLevel = Math.min(Math.floor(tickerSpeed / 200), maxSpeed);
            entity.setProperty("ab_ve:current_speed", effectLevel);
            entity.triggerEvent("ab_ve:update_speed_group");

            VehicleClass.entityTickerSpeeds.set(entityId, tickerSpeed);
        } catch {}
    }

    /**
     * 载具自毁大殉爆 (清空物品 + 彻底移除 + 威力 4.5 真实烈火大爆炸 + 零掉落)
     */
    static explodeVehicle(vehicle) {
        if (!vehicle || !vehicle.isValid()) return;
        try {
            const loc = vehicle.location;
            const dim = vehicle.dimension;

            // 清空后备箱物品，确保零掉落
            try {
                const inv = vehicle.getComponent("minecraft:inventory")?.container;
                if (inv) {
                    for (let i = 0; i < inv.size; i++) inv.setItem(i, null);
                }
            } catch {}

            // 立即移除载具实体，不残留原版死亡状态
            try {
                vehicle.remove();
            } catch {}

            // 原地生成威力 4.5 的烈火震荡大爆炸
            dim.createExplosion(loc, 4.5, { breaksBlocks: false, causesFire: true });

            // 播放爆炸音效与巨型烈焰爆炸粒子
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
        } catch (err) {
            console.error(`[ApocalypseVehicles] Explosion error: ${err}`);
        }
    }

    /**
     * 20 TPS 主循环驱动全部载具物理与生命值监测
     */
    static updateAllVehicles() {
        const dimensions = ["overworld", "nether", "the_end"];
        const carTypeIds = VC.vehicles.cars.map(c => c.name);
        const planeTypeIds = VC.vehicles.planes.map(p => p.name);
        const boatTypeIds = VC.vehicles.boats.map(b => b.name);
        const allTypeIds = [...carTypeIds, ...planeTypeIds, ...boatTypeIds];

        for (const dimName of dimensions) {
            let dim;
            try {
                dim = world.getDimension(dimName);
            } catch {
                continue;
            }
            if (!dim) continue;

            let allEntities;
            try {
                allEntities = dim.getEntities();
            } catch {
                continue;
            }

            for (const entity of allEntities) {
                try {
                    const type = entity.typeId;
                    if (!allTypeIds.includes(type)) continue;

                    // 💥 全局生命值监测：如果载具生命值 <= 0，无论车上有没有人，立刻大爆炸！
                    const healthComp = entity.getComponent("minecraft:health");
                    if (healthComp && healthComp.currentValue <= 0) {
                        VehicleClass.explodeVehicle(entity);
                        continue;
                    }

                    if (carTypeIds.includes(type)) {
                        VehicleClass.updateCarsTickerSpeed(entity);
                    } else if (planeTypeIds.includes(type)) {
                        VehicleClass.updatePlanesTickerSpeed(entity);
                    } else if (boatTypeIds.includes(type)) {
                        VehicleClass.updateBoatsTickerSpeed(entity);
                    }
                } catch {}
            }
        }
    }
}
