import { world, system } from "@minecraft/server";
import { Integration } from "./integration.js";

/**
 * 原版生物生成拦截体系（纯事件驱动高性能版）
 * 1. 纯事件触发，彻底移除每秒实体轮询巡检，保证零常驻性能开销
 * 2. 仅拦截自然生成的原版敌对生物与安全区自然刷怪
 * 3. 允许玩家在安全区手动放置生物（刷怪蛋、提桶、繁殖、指令等）
 * 4. 界面与日志规范：严格规范去除任何灰色代码及任何Emoji图标
 */

const GLOBALLY_BLOCKED_MOBS = new Set([
	"minecraft:zombie",
	"minecraft:zombie_villager",
	"minecraft:skeleton",
	"minecraft:stray",
	"minecraft:husk",
	"minecraft:drowned"
]);

const SAFE_WHITELIST_TYPES = new Set([
	"minecraft:player",
	"minecraft:npc",
	"minecraft:item",
	"minecraft:xp_orb",
	"minecraft:xp_bottle",
	"minecraft:armor_stand",
	"minecraft:arrow",
	"minecraft:splash_potion",
	"minecraft:lingering_potion",
	"minecraft:snowball",
	"minecraft:egg",
	"minecraft:ender_pearl",
	"minecraft:lightning_bolt",
	"minecraft:area_effect_cloud",
	"minecraft:fishing_hook",
	"minecraft:boat",
	"minecraft:chest_boat",
	"minecraft:minecart",
	"minecraft:hopper_minecart",
	"minecraft:chest_minecart",
	"minecraft:tnt_minecart",
	"minecraft:command_block_minecart"
]);

const VANILLA_HOSTILE_MOBS = new Set([
	"minecraft:creeper",
	"minecraft:spider",
	"minecraft:cave_spider",
	"minecraft:enderman",
	"minecraft:witch",
	"minecraft:slime",
	"minecraft:magma_cube",
	"minecraft:phantom",
	"minecraft:silverfish",
	"minecraft:endermite",
	"minecraft:pillager",
	"minecraft:vindicator",
	"minecraft:evoker",
	"minecraft:evocation_illager",
	"minecraft:ravager",
	"minecraft:vex",
	"minecraft:blaze",
	"minecraft:ghast",
	"minecraft:guardian",
	"minecraft:elder_guardian",
	"minecraft:shulker",
	"minecraft:warden",
	"minecraft:piglin_brute",
	"minecraft:zombified_piglin",
	"minecraft:hoglin",
	"minecraft:zoglin",
	"minecraft:breeze",
	"minecraft:bogged",
	"minecraft:zombie",
	"minecraft:zombie_villager",
	"minecraft:skeleton",
	"minecraft:stray",
	"minecraft:husk",
	"minecraft:drowned"
]);

// 记录玩家手动使用刷怪蛋/生物桶等放置行为的临时时间窗口
const manualPlacementLocations = new Map();

function recordManualPlacement(dimensionId, loc) {
	const key = `${dimensionId}:${Math.floor(loc.x)}:${Math.floor(loc.y)}:${Math.floor(loc.z)}`;
	manualPlacementLocations.set(key, system.currentTick + 25);
	if (manualPlacementLocations.size > 200) {
		const now = system.currentTick;
		for (const [k, exp] of manualPlacementLocations) {
			if (now > exp) manualPlacementLocations.delete(k);
		}
	}
}

function isManuallySpawned(entity, cause) {
	if (!entity) return false;
	try {
		if (entity.hasTag("manual_placed")) return true;
		if (entity.hasTag("daily_event_entity") || entity.hasTag("sapi_npc") || entity.hasTag("vendor")) return true;
	} catch {}

	// 1. 如果带有原生初始化原因（非自然刷怪）
	if (cause) {
		const c = String(cause);
		if (c === "Born" || c === "Event" || c === "Transformed") {
			try { entity.addTag("manual_placed"); } catch {}
			return true;
		}
	}

	// 2. 检查是否有玩家在近距离右键放置生物物品
	try {
		const loc = entity.location;
		const dim = entity.dimension.id;
		const bx = Math.floor(loc.x);
		const by = Math.floor(loc.y);
		const bz = Math.floor(loc.z);
		const now = system.currentTick;

		for (let dx = -3; dx <= 3; dx++) {
			for (let dy = -3; dy <= 3; dy++) {
				for (let dz = -3; dz <= 3; dz++) {
					const key = `${dim}:${bx + dx}:${by + dy}:${bz + dz}`;
					const exp = manualPlacementLocations.get(key);
					if (exp && now <= exp) {
						entity.addTag("manual_placed");
						return true;
					}
				}
			}
		}
	} catch {}

	return false;
}

function isBlockedInSafeZone(entity) {
	if (!entity || !entity.typeId) return false;
	const id = entity.typeId;

	if (VANILLA_HOSTILE_MOBS.has(id)) return true;
	if (id.startsWith("minecraft:") && !SAFE_WHITELIST_TYPES.has(id)) {
		return true;
	}

	return false;
}

export class SafeZoneMobSuppression {
	static init() {
		this.registerListeners();
		console.warn("[SafeZoneMobSuppression] Initialized event-driven vanilla mob suppression.");
	}

	static registerListeners() {
		// 监听玩家右键方块使用刷怪蛋、生物桶等物品
		try {
			world.afterEvents?.itemUseOn?.subscribe((event) => {
				const item = event.itemStack;
				if (!item) return;
				const id = item.typeId;
				if (id.includes("spawn_egg") || id.includes("bucket") || id.includes("spawner")) {
					recordManualPlacement(event.block.dimension.id, event.block.location);
				}
			});
		} catch {}

		// 纯事件驱动：仅监听 entitySpawn，不进行任何周期性遍历
		const spawnSignal = world.afterEvents?.entitySpawn;
		if (!spawnSignal?.subscribe) return;

		spawnSignal.subscribe((event) => {
			const entity = event.entity;
			if (!entity) return;
			const typeId = entity.typeId;
			const dimension = entity.dimension;
			if (!dimension) return;

			// 若判定为玩家手动放置、繁殖或脚本事件生成，直接放行
			if (isManuallySpawned(entity, event.cause)) return;

			// 1. 全局彻底禁止原版僵尸/小白自然生成
			if (GLOBALLY_BLOCKED_MOBS.has(typeId)) {
				system.run(() => {
					try {
						if (entity.isValid() && !entity.hasTag("manual_placed")) {
							entity.remove();
						}
					} catch {}
				});
				return;
			}

			// 2. 安全区范围内禁止原版生物与敌对怪自然生成
			if (isBlockedInSafeZone(entity)) {
				system.run(() => {
					try {
						if (!entity.isValid() || entity.hasTag("manual_placed")) return;
						const zone = Integration.resolveCurrentZone(dimension.id, entity.location);
						if (zone.type === "safe") {
							entity.remove();
						}
					} catch {}
				});
			}
		});
	}
}
