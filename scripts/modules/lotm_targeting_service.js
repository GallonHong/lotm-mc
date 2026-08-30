import { world } from "@minecraft/server";
import { Utils } from "../utils.js";

/**
 * 《诡秘之主》目标检测与空间导航服务 (TargetingService)
 * 遵循 PRD 2.1 & 4.2 节：
 * 负责射线遇墙终止、扇形与圆形范围检索 (最多 8 目标)、双格防窒息安全落点搜索
 */
export class TargetingService {
    /**
     * 射线检测首个命中实体与方块阻挡点
     * @param {import("@minecraft/server").Player} player 
     * @param {number} maxDist 最大检测距离
     * @returns {{ entity: import("@minecraft/server").Entity|null, hitDist: number, hitLoc: object|null }}
     */
    static getRayTarget(player, maxDist = 30) {
        const dim = player.dimension;
        const headLoc = player.getHeadLocation();
        const viewDir = player.getViewDirection();

        let hitDist = maxDist;
        let hitLoc = null;
        let targetEntity = null;

        // 1. 方块绝对阻挡检测
        try {
            const blockHit = dim.getBlockFromRay(headLoc, viewDir, {
                maxDistance: maxDist,
                includePassableBlocks: false,
                includeLiquidBlocks: false,
            });
            if (blockHit && blockHit.block && !blockHit.block.isAir) {
                const face = blockHit.faceLocation;
                let bDist = maxDist;
                if (face) {
                    bDist = Math.hypot(face.x - headLoc.x, face.y - headLoc.y, face.z - headLoc.z);
                } else {
                    const b = blockHit.block.location;
                    bDist = Math.hypot(b.x + 0.5 - headLoc.x, b.y + 0.5 - headLoc.y, b.z + 0.5 - headLoc.z);
                }
                if (bDist > 0.2 && bDist < hitDist) {
                    hitDist = bDist;
                    hitLoc = face || {
                        x: headLoc.x + viewDir.x * bDist,
                        y: headLoc.y + viewDir.y * bDist,
                        z: headLoc.z + viewDir.z * bDist,
                    };
                }
            }
        } catch {}

        // 2. 实体射线命中 (仅在方块阻挡距离以内)
        try {
            const hits = dim.getEntitiesFromRay(headLoc, viewDir, { maxDistance: hitDist });
            for (const hit of hits) {
                const ent = hit.entity;
                if (ent && ent.id !== player.id && ent.typeId !== "minecraft:item") {
                    const dist = Math.hypot(ent.location.x - headLoc.x, ent.location.y - headLoc.y, ent.location.z - headLoc.z);
                    if (dist > 0.3 && dist <= hitDist) {
                        hitDist = dist;
                        hitLoc = {
                            x: headLoc.x + viewDir.x * dist,
                            y: headLoc.y + viewDir.y * dist,
                            z: headLoc.z + viewDir.z * dist,
                        };
                        targetEntity = ent;
                        break;
                    }
                }
            }
        } catch {}

        return { entity: targetEntity, hitDist, hitLoc };
    }

    /**
     * 扇形锥形范围实体检索 (如武器大师横扫、破晓重剑黎明斩)
     * @param {import("@minecraft/server").Player} player 
     * @param {number} range 半径
     * @param {number} angleDeg 扇形开角角度 (如 120°)
     * @param {number} maxTargets 最大命中目标数 (默认 8)
     * @returns {Array<import("@minecraft/server").Entity>}
     */
    static getConeTargets(player, range = 4.0, angleDeg = 120, maxTargets = 8) {
        const dim = player.dimension;
        const pLoc = player.location;
        const viewDir = player.getViewDirection();
        const viewAngle = Math.atan2(viewDir.z, viewDir.x);
        const halfAngle = (angleDeg * Math.PI) / 360;

        const results = [];
        try {
            const entities = dim.getEntities({ location: pLoc, maxDistance: range });
            for (const ent of entities) {
                if (results.length >= maxTargets) break;
                if (ent.id === player.id || ent.typeId === "minecraft:item") continue;

                const eLoc = ent.location;
                const dx = eLoc.x - pLoc.x;
                const dz = eLoc.z - pLoc.z;
                const dist = Math.hypot(dx, dz);
                if (dist > range || dist < 0.2) continue;

                const entAngle = Math.atan2(dz, dx);
                let diff = Math.abs(entAngle - viewAngle);
                if (diff > Math.PI) diff = 2 * Math.PI - diff;

                if (diff <= halfAngle) {
                    results.push(ent);
                }
            }
        } catch {}

        return results;
    }

    /**
     * 圆形区域范围实体检索 (如焰潮领域、太阳光环)
     * @param {import("@minecraft/server").Player} player 
     * @param {object} centerLoc 中心坐标
     * @param {number} radius 半径
     * @param {number} maxTargets 最大目标数
     * @returns {Array<import("@minecraft/server").Entity>}
     */
    static getAreaTargets(player, centerLoc, radius = 5.0, maxTargets = 8) {
        const dim = player.dimension;
        const results = [];
        try {
            const entities = dim.getEntities({ location: centerLoc, maxDistance: radius });
            for (const ent of entities) {
                if (results.length >= maxTargets) break;
                if (ent.id === player.id || ent.typeId === "minecraft:item") continue;
                results.push(ent);
            }
        } catch {}
        return results;
    }

    /**
     * 智能搜索安全立足点坐标 (用于火焰跳跃、镜面替身等位移能力，绝不卡进方块或回退出生点)
     * @param {import("@minecraft/server").Player} player 
     * @param {number} maxDist 位移距离
     * @returns {object} 安全落点坐标 { x, y, z }
     */
    static getSafeLandingLocation(player, maxDist = 20) {
        const dim = player.dimension;
        const headLoc = player.getHeadLocation();
        const viewDir = player.getViewDirection();
        const startLoc = { ...player.location };

        let targetX = headLoc.x + viewDir.x * maxDist;
        let targetY = headLoc.y + viewDir.y * maxDist;
        let targetZ = headLoc.z + viewDir.z * maxDist;

        // 1. 射线阻挡
        try {
            const blockHit = dim.getBlockFromRay(headLoc, viewDir, {
                maxDistance: maxDist,
                includePassableBlocks: false,
                includeLiquidBlocks: false,
            });
            if (blockHit && blockHit.block && !blockHit.block.isAir) {
                const face = blockHit.faceLocation;
                if (face) {
                    targetX = face.x - viewDir.x * 0.8;
                    targetY = face.y;
                    targetZ = face.z - viewDir.z * 0.8;
                } else {
                    const b = blockHit.block.location;
                    targetX = b.x + 0.5 - viewDir.x * 0.8;
                    targetY = b.y + 1.0;
                    targetZ = b.z + 0.5 - viewDir.z * 0.8;
                }
            }
        } catch {}

        // 2. 双格空间与坚实地面扫描
        let safeY = Math.floor(targetY);
        let foundSafe = false;
        const checkX = Math.floor(targetX);
        const checkZ = Math.floor(targetZ);

        for (let dy = 2; dy >= -10; dy--) {
            const testY = Math.floor(targetY) + dy;
            if (testY < -64 || testY > 318) continue;
            try {
                const blockFeet = dim.getBlock({ x: checkX, y: testY, z: checkZ });
                const blockHead = dim.getBlock({ x: checkX, y: testY + 1, z: checkZ });
                const blockBelow = dim.getBlock({ x: checkX, y: testY - 1, z: checkZ });

                if (
                    blockBelow && !blockBelow.isAir &&
                    blockFeet && (blockFeet.isAir || blockFeet.isLiquid) &&
                    blockHead && (blockHead.isAir || blockHead.isLiquid)
                ) {
                    safeY = testY;
                    foundSafe = true;
                    break;
                }
            } catch {}
        }

        const finalLoc = {
            x: checkX + 0.5,
            y: foundSafe ? safeY : Math.max(player.location.y, targetY + 0.5),
            z: checkZ + 0.5,
        };

        if (isNaN(finalLoc.x) || isNaN(finalLoc.y) || isNaN(finalLoc.z)) {
            return { ...startLoc };
        }

        return finalLoc;
    }
}
