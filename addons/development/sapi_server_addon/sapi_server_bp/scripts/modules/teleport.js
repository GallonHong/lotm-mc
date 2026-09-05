import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { Config } from "../config.js";
import { Utils } from "../utils.js";
import { AuditManager } from "./audit.js";
import { OperationsManager } from "./operations.js";

const WARPS_KEY = "sapi:server:warps:v1";
const HOMES_KEY = "sapi:homes:v1";
const DEATH_KEY = "sapi:last_death:v1";
const TPA_RECEIVE_KEY = "sapi:tpa_receive:v1";

/**
 * 明日之后经典地图出生点预设（按区域难度从低到高排序）。
 * 格式严格遵循：地点--xx区
 */
export const DEFAULT_WARPS = Object.freeze([
    // [等级 0 · 安全生活区]
    {
        id: "spawn",
        isSpawn: true,
        name: "快乐101--安全区",
        icon: "textures/ui/icon_recipe_nature",
        dimension: "minecraft:overworld",
        x: 2423.49,
        y: 16.94,
        z: 2019.55,
        rotation: { x: 0, y: 0 },
        createdBy: "system",
        createdAt: 0
    },
    {
        id: "warp_101_dev",
        name: "101开发区--安全区",
        icon: "textures/ui/village_hero_effect",
        dimension: "minecraft:overworld",
        x: 2369.87,
        y: 33.00,
        z: 1259.69,
        rotation: { x: 0, y: 0 },
        createdBy: "system",
        createdAt: 0
    },
    {
        id: "warp_camp_dev",
        name: "营地开发区--安全区",
        icon: "textures/ui/village_hero_effect",
        dimension: "minecraft:overworld",
        x: 1989.54,
        y: 22.50,
        z: 1359.29,
        rotation: { x: 0, y: 0 },
        createdBy: "system",
        createdAt: 0
    },
    {
        id: "warp_tech_council",
        name: "科技会--安全区",
        icon: "textures/ui/icon_recipe_nature",
        dimension: "minecraft:overworld",
        x: 1275.00,
        y: 70.00,
        z: 1066.00,
        rotation: { x: 0, y: 0 },
        createdBy: "system",
        createdAt: 0
    },
    // [等级 1 · 初级协议资源区]
    {
        id: "warp_fall_forest",
        name: "秋日森林--协议区",
        icon: "textures/ui/World",
        dimension: "minecraft:overworld",
        x: 3641.00,
        y: 22.00,
        z: 2278.00,
        rotation: { x: 0, y: 0 },
        createdBy: "system",
        createdAt: 0
    },
    {
        id: "warp_sand_castle",
        name: "沙石堡--协议区",
        icon: "textures/ui/World",
        dimension: "minecraft:overworld",
        x: 1123.00,
        y: 31.00,
        z: 1462.00,
        rotation: { x: 0, y: 0 },
        createdBy: "system",
        createdAt: 0
    },
    // [等级 2 · 中高级协议资源区]
    {
        id: "warp_white_tree",
        name: "白树高地--协议区",
        icon: "textures/ui/World",
        dimension: "minecraft:overworld",
        x: 3310.00,
        y: 96.00,
        z: 429.00,
        rotation: { x: 0, y: 0 },
        createdBy: "system",
        createdAt: 0
    },
    {
        id: "warp_mouth_swamp",
        name: "茅斯沼泽--协议区",
        icon: "textures/ui/World",
        dimension: "minecraft:overworld",
        x: 2041.01,
        y: 17.50,
        z: 2888.44,
        rotation: { x: 0, y: 0 },
        createdBy: "system",
        createdAt: 0
    },
    {
        id: "warp_dobe_snow",
        name: "多贝雪山--协议区",
        icon: "textures/ui/World",
        dimension: "minecraft:overworld",
        x: 3373.00,
        y: 49.00,
        z: 1433.00,
        rotation: { x: 0, y: 0 },
        createdBy: "system",
        createdAt: 0
    },
    // [等级 3 · 感染团队副本重灾区]
    {
        id: "warp_miska_uni",
        name: "密斯卡大学--副本区",
        icon: "textures/ui/warning_alex",
        dimension: "minecraft:overworld",
        x: 2705.10,
        y: 25.00,
        z: 3688.32,
        rotation: { x: 0, y: 0 },
        createdBy: "system",
        createdAt: 0
    },
    // [等级 4 · 交火争夺与重度辐射危险区]
    {
        id: "warp_farstar_lighthouse",
        name: "远星城-灯塔--交火区",
        icon: "textures/items/iron_sword",
        dimension: "minecraft:overworld",
        x: 3149.00,
        y: 25.00,
        z: 4069.00,
        rotation: { x: 0, y: 0 },
        createdBy: "system",
        createdAt: 0
    },
    {
        id: "warp_charles_town",
        name: "夏尔镇--交火区",
        icon: "textures/items/iron_sword",
        dimension: "minecraft:overworld",
        x: 2470.29,
        y: 23.00,
        z: 4346.04,
        rotation: { x: 0, y: 0 },
        createdBy: "system",
        createdAt: 0
    },
    {
        id: "warp_charles_pier",
        name: "夏尔镇码头--交火区",
        icon: "textures/items/iron_sword",
        dimension: "minecraft:overworld",
        x: 1196.00,
        y: 18.00,
        z: 3705.00,
        rotation: { x: 0, y: 0 },
        createdBy: "system",
        createdAt: 0
    },
    {
        id: "warp_charles_powerplant",
        name: "夏尔镇核电站--交火区",
        icon: "textures/ui/warning_alex",
        dimension: "minecraft:overworld",
        x: 2024.00,
        y: 42.00,
        z: 4160.00,
        rotation: { x: 0, y: 0 },
        createdBy: "system",
        createdAt: 0
    },
]);

/** 免费公共传送点与统一安全落点服务。 */
export class TeleportManager {
    static cooldowns = new Map();
    static requests = new Map();
    static pendingDeaths = new Map();
    static eventsRegistered = false;

    static getWarps() {
        try {
            const raw = world.getDynamicProperty(WARPS_KEY);
            if (typeof raw !== "string") {
                const defaults = DEFAULT_WARPS.map(warp => ({ ...warp }));
                this.saveWarps(defaults);
                return defaults;
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed) || parsed.length === 0) {
                const defaults = DEFAULT_WARPS.map(warp => ({ ...warp }));
                this.saveWarps(defaults);
                return defaults;
            }
            const valid = parsed.filter(warp => warp && warp.id && warp.dimension);
            const hasPreset = valid.some(warp => DEFAULT_WARPS.some(d => d.id === warp.id));
            if (!hasPreset) {
                const merged = [...DEFAULT_WARPS.map(warp => ({ ...warp })), ...valid];
                this.saveWarps(merged);
                return merged;
            }
            return valid;
        } catch (error) {
            console.warn(`[Teleport] Failed to read warps: ${error}`);
            return DEFAULT_WARPS.map(warp => ({ ...warp }));
        }
    }

    static saveWarps(warps) {
        try {
            const maxWarps = Math.max(DEFAULT_WARPS.length, Number(Config.teleport?.maxWarps) || 50);
            world.setDynamicProperty(WARPS_KEY, JSON.stringify(warps.slice(0, maxWarps)));
            return true;
        } catch (error) {
            console.warn(`[Teleport] Failed to save warps: ${error}`);
            return false;
        }
    }

    static restoreDefaultWarps(player = null) {
        const current = this.getWarps();
        const custom = current.filter(w => !DEFAULT_WARPS.some(d => d.id === w.id));
        const merged = [...DEFAULT_WARPS.map(warp => ({ ...warp })), ...custom];
        this.saveWarps(merged);
        if (player) AuditManager.log("warp_restore", player, "default_warps", `${DEFAULT_WARPS.length} preset warps restored`);
        return merged;
    }

    static getWarp(id) {
        return this.getWarps().find(warp => warp.id === id) || null;
    }

    static getSpawnWarp() {
        const warps = this.getWarps();
        return warps.find(warp => warp.id === "spawn") || warps.find(warp => warp.isSpawn) || warps[0] || null;
    }

    static sanitizeName(name) {
        return String(name || "").replace(/[\n\r§]/g, "").trim().slice(0, 24);
    }

    static createWarp(player, name, icon = "textures/ui/World") {
        if (!Utils.isAdmin(player)) return false;
        const safeName = this.sanitizeName(name);
        if (!safeName) return false;
        const warps = this.getWarps();
        if (warps.length >= (Config.teleport?.maxWarps ?? 50)) return false;
        const rotation = typeof player.getRotation === "function" ? player.getRotation() : { x: 0, y: 0 };
        warps.push({
            id: `warp_${Date.now().toString(36)}`,
            name: safeName,
            icon: String(icon || "textures/ui/World").trim().slice(0, 96),
            dimension: player.dimension.id,
            x: Number(player.location.x.toFixed(2)),
            y: Number(player.location.y.toFixed(2)),
            z: Number(player.location.z.toFixed(2)),
            rotation: { x: Number(rotation.x || 0), y: Number(rotation.y || 0) },
            createdBy: player.name,
            createdAt: Date.now()
        });
        const saved = this.saveWarps(warps);
        if (saved) AuditManager.log("warp_create", player, safeName, `${player.dimension.id} ${Math.floor(player.location.x)},${Math.floor(player.location.y)},${Math.floor(player.location.z)}`);
        return saved;
    }

    static setSpawnWarp(player) {
        if (!Utils.isAdmin(player)) return false;
        const warps = this.getWarps().filter(warp => warp.id !== "spawn");
        const rotation = typeof player.getRotation === "function" ? player.getRotation() : { x: 0, y: 0 };
        warps.unshift({
            id: "spawn",
            isSpawn: true,
            name: "快乐101--安全区",
            icon: "textures/ui/icon_recipe_nature",
            dimension: player.dimension.id,
            x: Number(player.location.x.toFixed(2)),
            y: Number(player.location.y.toFixed(2)),
            z: Number(player.location.z.toFixed(2)),
            rotation: { x: Number(rotation.x || 0), y: Number(rotation.y || 0) },
            createdBy: player.name,
            createdAt: Date.now()
        });
        const saved = this.saveWarps(warps);
        if (saved) AuditManager.log("spawn_set", player, "spawn", `${player.dimension.id} ${Math.floor(player.location.x)},${Math.floor(player.location.y)},${Math.floor(player.location.z)}`);
        return saved;
    }

    static deleteWarp(id, actor = "system") {
        const warps = this.getWarps();
        const removed = warps.find(warp => warp.id === id);
        const next = warps.filter(warp => warp.id !== id);
        const saved = next.length !== warps.length && this.saveWarps(next);
        if (saved) AuditManager.log("warp_delete", actor, removed?.name || id, id);
        return saved;
    }

    static isPassable(block) {
        if (!block) return false;
        const id = String(block.typeId || "");
        return id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air" ||
            id.includes("tallgrass") || id.includes("short_grass") || id.includes("snow_layer") ||
            id.includes("flower") || id.includes("torch");
    }

    static isLiquid(block) {
        const id = String(block?.typeId || "");
        return id.includes("water") || id.includes("lava");
    }

    static isSafeAt(dimension, x, y, z) {
        try {
            const below = dimension.getBlock({ x, y: y - 1, z });
            const feet = dimension.getBlock({ x, y, z });
            const head = dimension.getBlock({ x, y: y + 1, z });
            return !!below && !this.isPassable(below) && !this.isLiquid(below) &&
                this.isPassable(feet) && this.isPassable(head);
        } catch {
            return null;
        }
    }

    static findSafeLocation(dimension, location) {
        const x = Math.floor(Number(location.x)) + 0.5;
        const z = Math.floor(Number(location.z)) + 0.5;
        const baseY = Math.floor(Number(location.y));
        const radius = Math.max(1, Math.min(32, Number(Config.teleport?.safeSearchRadiusY) || 16));
        const offsets = [0];
        for (let step = 1; step <= radius; step++) offsets.push(step, -step);
        let readable = false;
        const horizontalRadius = Math.max(0, Math.min(8, Number(Config.teleport?.safeSearchRadiusXZ) || 4));
        for (let radiusXZ = 0; radiusXZ <= horizontalRadius; radiusXZ++) {
            for (let dx = -radiusXZ; dx <= radiusXZ; dx++) {
                for (let dz = -radiusXZ; dz <= radiusXZ; dz++) {
                    if (radiusXZ > 0 && Math.abs(dx) !== radiusXZ && Math.abs(dz) !== radiusXZ) continue;
                    const verticalOffsets = radiusXZ === 0 ? offsets : offsets.filter(offset => Math.abs(offset) <= 4);
                    for (const offset of verticalOffsets) {
                        const y = baseY + offset;
                        const safe = this.isSafeAt(dimension, Math.floor(x) + dx, y, Math.floor(z) + dz);
                        if (safe === true) return { x: x + dx, y, z: z + dz };
                        if (safe !== null) readable = true;
                    }
                }
            }
        }
        // 未加载区块无法预读方块时保留目标坐标；已加载但没有安全点时拒绝传送。
        return readable ? null : { x: Number(location.x), y: Number(location.y), z: Number(location.z) };
    }

    static snapshot(player, name = "位置") {
        const rotation = typeof player.getRotation === "function" ? player.getRotation() : { x: 0, y: 0 };
        return {
            name,
            dimension: player.dimension.id,
            x: Number(player.location.x.toFixed(2)),
            y: Number(player.location.y.toFixed(2)),
            z: Number(player.location.z.toFixed(2)),
            rotation: { x: Number(rotation.x || 0), y: Number(rotation.y || 0) }
        };
    }

    static getHomes(player) {
        try {
            const raw = player.getDynamicProperty(HOMES_KEY);
            const homes = typeof raw === "string" ? JSON.parse(raw) : [];
            return Array.isArray(homes) ? homes.filter(home => home?.name && home?.dimension) : [];
        } catch { return []; }
    }

    static saveHomes(player, homes) {
        try {
            const limit = Math.max(1, Math.min(10, Number(Config.teleport?.maxHomes) || 3));
            player.setDynamicProperty(HOMES_KEY, JSON.stringify(homes.slice(0, limit)));
            return true;
        } catch (error) {
            console.warn(`[Teleport] Failed to save homes for ${player.name}: ${error}`);
            return false;
        }
    }

    static setHome(player, rawName) {
        const name = this.sanitizeName(rawName || "Home");
        if (!name) return false;
        const homes = this.getHomes(player);
        const index = homes.findIndex(home => home.name.toLowerCase() === name.toLowerCase());
        if (index < 0 && homes.length >= (Config.teleport?.maxHomes ?? 3)) return false;
        const home = { ...this.snapshot(player, name), updatedAt: Date.now() };
        if (index >= 0) homes[index] = home;
        else homes.push(home);
        const saved = this.saveHomes(player, homes);
        if (saved) AuditManager.log("home_set", player, name, `${home.dimension} ${Math.floor(home.x)},${Math.floor(home.y)},${Math.floor(home.z)}`);
        return saved;
    }

    static deleteHome(player, index) {
        const homes = this.getHomes(player);
        const removed = homes[index];
        if (!removed) return false;
        homes.splice(index, 1);
        const saved = this.saveHomes(player, homes);
        if (saved) AuditManager.log("home_delete", player, removed.name);
        return saved;
    }

    static getDeathLocation(player) {
        try {
            const raw = player.getDynamicProperty(DEATH_KEY);
            return typeof raw === "string" ? JSON.parse(raw) : null;
        } catch { return null; }
    }

    static setDeathLocation(player, location) {
        try {
            player.setDynamicProperty(DEATH_KEY, location ? JSON.stringify(location) : undefined);
            return true;
        } catch { return false; }
    }

    static performTeleport(player, location, label, auditType = "warp_use", target = "") {
        if (!Utils.isValid(player) || !location) return false;
        const now = Date.now();
        const cooldownMs = Math.max(0, Number(Config.teleport?.cooldownSeconds || 0) * 1000);
        const readyAt = this.cooldowns.get(player.id) || 0;
        if (!Utils.isAdmin(player) && now < readyAt) {
            Utils.tell(player, `§e请等待 ${Math.ceil((readyAt - now) / 1000)} 秒后再次传送。`);
            return false;
        }
        try {
            const dimension = world.getDimension(location.dimension);
            const destination = this.findSafeLocation(dimension, location);
            if (!destination) {
                Utils.tell(player, "§c目标附近没有安全落点，传送已取消。");
                return false;
            }
            player.teleport(destination, { dimension, rotation: location.rotation || undefined });
            this.cooldowns.set(player.id, now + cooldownMs);
            Utils.sound.teleport(player);
            Utils.tell(player, `§a已免费传送至 §e${label}§a。`);
            AuditManager.log(auditType, player, target || label, `${location.dimension} ${Math.floor(destination.x)},${Math.floor(destination.y)},${Math.floor(destination.z)}`);
            return true;
        } catch (error) {
            console.warn(`[Teleport] Failed to teleport ${player.name} to ${label}: ${error}`);
            Utils.tell(player, "§c传送失败，目标区块暂时不可用。请稍后再试。");
            return false;
        }
    }

    static pruneRequests() {
        const now = Date.now();
        for (const [id, request] of this.requests) {
            if (request.expiresAt <= now) {
                this.requests.delete(id);
                AuditManager.log("tpa_expire", request.fromName, request.toName, request.direction);
            }
        }
    }

    static sendTpaRequest(from, to, direction = "to") {
        if (!Utils.isValid(from) || !Utils.isValid(to) || from.id === to.id) return false;
        const settings = OperationsManager.getSettings();
        if (!settings.tpaEnabled || (direction === "here" && !settings.tpaHereEnabled) || (direction !== "here" && !settings.tpaToEnabled)) {
            Utils.tell(from, "§8该类型的 TPA 已被管理员关闭。");
            return false;
        }
        if (to.getDynamicProperty(TPA_RECEIVE_KEY) === false && !Utils.isAdmin(from)) {
            Utils.tell(from, `§8${to.name} 当前拒绝接收 TPA 请求。`);
            return false;
        }
        this.pruneRequests();
        for (const [id, request] of this.requests) {
            if (request.fromId === from.id && request.toId === to.id) this.requests.delete(id);
        }
        const request = {
            id: `tpa_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
            fromId: from.id,
            fromName: from.name,
            toId: to.id,
            toName: to.name,
            direction: direction === "here" ? "here" : "to",
            expiresAt: Date.now() + Math.max(10, Number(Config.teleport?.tpaExpirySeconds) || 60) * 1000
        };
        this.requests.set(request.id, request);
        const description = request.direction === "here" ? `邀请你传送到 ${from.name}` : `请求传送到你身边`;
        Utils.tell(from, `§a已向 §e${to.name} §a发送请求，有效期 ${Config.teleport?.tpaExpirySeconds || 60} 秒。`);
        Utils.tell(to, `§e${from.name} §b${description}。请打开罗盘 → 个人传送 → TPA 处理。`);
        AuditManager.log("tpa_request", from, to.name, request.direction);
        return true;
    }

    static respondTpa(player, requestId, accept) {
        this.pruneRequests();
        const request = this.requests.get(requestId);
        if (!request || request.toId !== player.id) return false;
        const settings = OperationsManager.getSettings();
        if (!settings.tpaEnabled || (request.direction === "here" && !settings.tpaHereEnabled) || (request.direction !== "here" && !settings.tpaToEnabled)) {
            this.requests.delete(requestId);
            Utils.tell(player, "§8TPA 已被管理员关闭，该请求已取消。");
            return false;
        }
        this.requests.delete(requestId);
        const requester = world.getAllPlayers().find(other => other.id === request.fromId);
        if (!Utils.isValid(requester)) {
            Utils.tell(player, "§c请求方已经离线。");
            return false;
        }
        if (!accept) {
            Utils.tell(player, `§8已拒绝 ${request.fromName} 的传送请求。`);
            Utils.tell(requester, `§c${player.name} 拒绝了你的传送请求。`);
            AuditManager.log("tpa_reject", player, requester.name, request.direction);
            return true;
        }
        const mover = request.direction === "here" ? player : requester;
        const destinationPlayer = request.direction === "here" ? requester : player;
        const success = this.performTeleport(mover, this.snapshot(destinationPlayer, destinationPlayer.name), destinationPlayer.name, "tpa_accept", `${requester.name}->${player.name}`);
        if (success) {
            Utils.tell(requester, `§a${player.name} 已接受传送请求。`);
            if (mover.id !== player.id) Utils.tell(player, `§a已接受 ${requester.name} 的传送请求。`);
        }
        return success;
    }

    static returnToDeath(player) {
        const death = this.getDeathLocation(player);
        if (!death) {
            Utils.tell(player, "§8没有可用的死亡位置，或该位置已经返回过。");
            return false;
        }
        const success = this.performTeleport(player, death, "上次死亡位置", "death_back", death.cause || "death");
        if (success && Config.teleport?.consumeDeathBack !== false) this.setDeathLocation(player, null);
        return success;
    }

    static registerEvents() {
        if (this.eventsRegistered) return;
        this.eventsRegistered = true;
        const die = world.afterEvents?.entityDie;
        if (die && typeof die.subscribe === "function") {
            die.subscribe(event => {
                try {
                    const player = event.deadEntity;
                    if (player?.typeId !== "minecraft:player") return;
                    const death = { ...this.snapshot(player, "死亡位置"), cause: String(event.damageSource?.cause || "unknown"), time: Date.now() };
                    this.pendingDeaths.set(player.id, death);
                    this.setDeathLocation(player, death);
                    AuditManager.log("death_record", player, death.cause, `${death.dimension} ${Math.floor(death.x)},${Math.floor(death.y)},${Math.floor(death.z)}`);
                } catch (error) {
                    console.warn(`[Teleport] Failed to record death location: ${error}`);
                }
            });
        } else console.warn("[Teleport] entityDie event unavailable; death return disabled on this API version.");
        system.runInterval(() => this.pruneRequests(), 200);
    }

    static handlePlayerSpawn(player) {
        const pending = this.pendingDeaths.get(player.id);
        if (pending) {
            this.setDeathLocation(player, pending);
            this.pendingDeaths.delete(player.id);
        }
    }

    static teleportToWarp(player, warp) {
        return this.performTeleport(player, warp, warp?.name || "公共传送点", "warp_use", warp?.id || "warp");
    }

    static teleportToSpawn(player) {
        const spawn = this.getSpawnWarp();
        if (!spawn) {
            Utils.tell(player, "§8管理员尚未设置主城出生点。");
            return false;
        }
        return this.teleportToWarp(player, spawn);
    }

    static openPlayerMenu(player, onBack = null) {
        this.pruneRequests();
        const incoming = [...this.requests.values()].filter(request => request.toId === player.id).length;
        const actions = [];
        const form = new ActionFormData().title("§l§b🧭 个人传送").body(
            `§0Home: §e${this.getHomes(player).length}/${Config.teleport?.maxHomes || 3}\n§0待处理 TPA: §e${incoming}\n§0死亡返回: ${this.getDeathLocation(player) ? "§a可用" : "§8无"}\n§a全部传送免费`
        );
        const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
        add("§l§a🏠 Home 管理", "textures/ui/icon_recipe_nature", () => this.openHomeMenu(player, () => this.openPlayerMenu(player, onBack)));
        add(`§l§b👥 TPA 玩家传送\n§r§8${incoming ? `有 ${incoming} 条待处理请求` : "发送或处理传送请求"}`, "textures/ui/FriendsIcon", () => this.openTpaMenu(player, () => this.openPlayerMenu(player, onBack)));
        add("§l§c☠ 返回死亡位置\n§r§8免费，一次性返回", "textures/ui/World", () => {
            this.returnToDeath(player);
        });
        add("§l§8⬅ 返回", "textures/ui/undo", () => onBack?.());
        Utils.showForm(player, form, response => actions[response.selection]?.());
    }

    static openHomeMenu(player, onBack = null) {
        const homes = this.getHomes(player);
        const actions = [];
        const form = new ActionFormData().title("§l§a🏠 Home").body(`§8可设置 ${Config.teleport?.maxHomes || 3} 个私人传送点，全部免费。`);
        const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
        for (const home of homes) add(`§l§0${home.name}\n§r§8${home.dimension} · ${Math.floor(home.x)}, ${Math.floor(home.y)}, ${Math.floor(home.z)}`, "textures/ui/icon_recipe_nature", () => this.performTeleport(player, home, home.name, "home_use", home.name));
        add("§l§a➕ 设置/覆盖 Home", "textures/ui/plus", () => this.openSetHomeModal(player, onBack));
        add("§l§c🗑️ 删除 Home", "textures/ui/trash", () => this.openDeleteHomeMenu(player, onBack));
        add("§l§8⬅ 返回", "textures/ui/undo", () => onBack?.());
        Utils.showForm(player, form, response => actions[response.selection]?.());
    }

    static openSetHomeModal(player, onBack = null) {
        const form = new ModalFormData().title("§l设置 Home").textField("Home 名称（同名会覆盖）", "例如：基地");
        Utils.showForm(player, form, response => {
            if (!response.canceled) {
                const name = response.formValues?.[0];
                Utils.tell(player, this.setHome(player, name) ? `§aHome §e${this.sanitizeName(name || "Home")} §a已设置在当前位置。` : `§c设置失败：已达到 ${Config.teleport?.maxHomes || 3} 个上限或数据无法保存。`);
            }
            this.openHomeMenu(player, onBack);
        });
    }

    static openDeleteHomeMenu(player, onBack = null) {
        const homes = this.getHomes(player);
        const form = new ActionFormData().title("§l§c删除 Home").body("§8选择要删除的 Home。");
        for (const home of homes) form.button(home.name, "textures/ui/trash");
        form.button("§l§8⬅ 返回", "textures/ui/undo");
        Utils.showForm(player, form, response => {
            if (response.selection < homes.length) {
                const name = homes[response.selection].name;
                if (this.deleteHome(player, response.selection)) Utils.tell(player, `§a已删除 Home：§e${name}`);
            }
            this.openHomeMenu(player, onBack);
        });
    }

    static openTpaMenu(player, onBack = null) {
        this.pruneRequests();
        const settings = OperationsManager.getSettings();
        const receives = player.getDynamicProperty(TPA_RECEIVE_KEY) !== false;
        const incoming = [...this.requests.values()].filter(request => request.toId === player.id);
        const outgoing = [...this.requests.values()].filter(request => request.fromId === player.id);
        const actions = [];
        const form = new ActionFormData().title("§l§b👥 TPA 玩家传送").body(`§0全局状态: ${settings.tpaEnabled ? "§a开启" : "§c关闭"}\n§0接收请求: ${receives ? "§a开启" : "§8关闭"}\n§0收到: §e${incoming.length} §0| 已发送: §e${outgoing.length}\n§8请求必须由对方明确接受，过期时间 ${Config.teleport?.tpaExpirySeconds || 60} 秒。`);
        const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
        for (const request of incoming) {
            const label = request.direction === "here" ? `${request.fromName} 邀请你过去` : `${request.fromName} 请求过来`;
            add(`§l§e📨 ${label}\n§r§8点击处理`, "textures/ui/FriendsIcon", () => this.openTpaResponse(player, request, onBack));
        }
        if (settings.tpaEnabled && settings.tpaToEnabled) add("§l§a➡ 请求传送到玩家", "textures/ui/FriendsIcon", () => this.openTpaPlayerSelect(player, "to", onBack));
        if (settings.tpaEnabled && settings.tpaHereEnabled) add("§l§6⬅ 邀请玩家传送过来", "textures/ui/FriendsIcon", () => this.openTpaPlayerSelect(player, "here", onBack));
        add(receives ? "§l§8🔕 拒绝接收 TPA" : "§l§a🔔 允许接收 TPA", "textures/ui/cancel", () => {
            player.setDynamicProperty(TPA_RECEIVE_KEY, !receives);
            AuditManager.log("tpa_receive", player, player.name, `enabled=${!receives}`);
            this.openTpaMenu(player, onBack);
        });
        add("§l§c✖ 取消我发出的请求", "textures/ui/cancel", () => {
            let count = 0;
            for (const [id, request] of this.requests) if (request.fromId === player.id) { this.requests.delete(id); count++; }
            if (count) AuditManager.log("tpa_cancel", player, "outgoing", `${count} 条`);
            Utils.tell(player, `§8已取消 ${count} 条请求。`);
            this.openTpaMenu(player, onBack);
        });
        add("§l§8⬅ 返回", "textures/ui/undo", () => onBack?.());
        Utils.showForm(player, form, response => actions[response.selection]?.());
    }

    static openTpaPlayerSelect(player, direction, onBack = null) {
        const players = world.getAllPlayers().filter(target => target.id !== player.id);
        const form = new ActionFormData().title(direction === "here" ? "§l邀请玩家过来" : "§l请求传送到玩家").body(players.length ? "§8请选择在线玩家。" : "§8当前没有其他在线玩家。");
        for (const target of players) form.button(target.name, "textures/ui/FriendsIcon");
        form.button("§l§8⬅ 返回", "textures/ui/undo");
        Utils.showForm(player, form, response => {
            const target = players[response.selection];
            if (target) this.sendTpaRequest(player, target, direction);
            else this.openTpaMenu(player, onBack);
        });
    }

    static openTpaResponse(player, request, onBack = null) {
        const text = request.direction === "here" ? `§e${request.fromName} §0邀请你传送到其身边。` : `§e${request.fromName} §0请求传送到你身边。`;
        const form = new MessageFormData().title("§l§b处理 TPA").body(`${text}\n\n§8只有点击接受后才会执行免费传送。`).button1("§a接受").button2("§c拒绝");
        Utils.showForm(player, form, response => {
            if (!response.canceled) this.respondTpa(player, request.id, response.selection === 0);
            this.openTpaMenu(player, onBack);
        });
    }

    static openWarpMenu(player, onBack = null) {
        const warps = this.getWarps();
        const form = new ActionFormData()
            .title("§l§b🧭 公共传送点")
            .body(warps.length ? "§8全部公共传送均免费。已按区域危险程度由低到高排列：" : "§8管理员尚未创建公共传送点。");
        for (const warp of warps) {
            let subtitle = "§8免费传送";
            let color = "§0";
            if (warp.name.includes("--安全区")) {
                color = "§2";
                subtitle = "§8安全生活区 · 免费传送";
            } else if (warp.name.includes("--协议区")) {
                color = "§1";
                subtitle = "§8协议探索区 · 免费传送";
            } else if (warp.name.includes("--副本区")) {
                color = "§5";
                subtitle = "§8高危团队副本 · 免费传送";
            } else if (warp.name.includes("--交火区")) {
                color = "§c";
                subtitle = "§8交火危险区 · 免费传送";
            }
            form.button(`§l${color}${warp.name}\n${subtitle}`, warp.icon || "textures/ui/World");
        }
        form.button("§l§8⬅ 返回", "textures/ui/undo");
        Utils.showForm(player, form, (res) => {
            if (res.selection < warps.length) this.teleportToWarp(player, warps[res.selection]);
            else onBack?.();
        });
    }

    static openAdminMenu(player, onBack = null) {
        if (!Utils.isAdmin(player)) return;
        const actions = [];
        const form = new ActionFormData().title("§l§c🧭 传送点管理").body(`§0公共传送点: §e${this.getWarps().length}§0 个\n§a所有传送均免费`);
        const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
        add("§l§a➕ 在当前位置创建传送点", "textures/ui/plus", () => this.openCreateWarpModal(player, onBack));
        add("§l§6🏰 设置当前位置为主城出生点", "textures/ui/icon_recipe_nature", () => {
            if (this.setSpawnWarp(player)) Utils.tell(player, "§a主城出生点已更新。");
            this.openAdminMenu(player, onBack);
        });
        add("§l§b🔄 恢复默认明日之后出生点", "textures/ui/undo", () => {
            this.restoreDefaultWarps(player);
            Utils.tell(player, "§a已成功重置并补齐 14 个明日之后难度分区出生点！");
            this.openAdminMenu(player, onBack);
        });
        add("§l§c🗑️ 删除传送点", "textures/ui/trash", () => this.openDeleteWarpMenu(player, onBack));
        add("§l§b👁️ 预览玩家传送菜单", "textures/ui/World", () => this.openWarpMenu(player, () => this.openAdminMenu(player, onBack)));
        add("§l§e⚙ TPA 开关设置", "textures/ui/op", () => this.openTpaAdminSettings(player, onBack));
        add("§l§6🛠 玩家传送数据管理", "textures/ui/op", () => this.openPlayerDataAdmin(player, onBack));
        add("§l§c✖ 清空全部待处理 TPA", "textures/ui/cancel", () => {
            const count = this.requests.size;
            this.requests.clear();
            AuditManager.log("admin_clear", player, "tpa", `清空 ${count} 条待处理请求`);
            Utils.tell(player, `§a已清空 ${count} 条待处理 TPA 请求。`);
            this.openAdminMenu(player, onBack);
        });
        add("§l§e📋 查看传送审计", "textures/ui/achievements", () => AuditManager.openAdminUI(player, () => this.openAdminMenu(player, onBack)));
        add("§l§8⬅ 返回", "textures/ui/undo", () => onBack?.());
        Utils.showForm(player, form, (res) => actions[res.selection]?.());
    }

    static openCreateWarpModal(player, onBack = null) {
        const form = new ModalFormData()
            .title("§l创建公共传送点")
            .textField("传送点名称", "例如：资源世界")
            .textField("按钮图标（可留空）", "textures/ui/World");
        Utils.showForm(player, form, (res) => {
            if (!res.canceled) {
                const [name, icon] = res.formValues;
                if (this.createWarp(player, name, icon || "textures/ui/World")) Utils.tell(player, `§a已创建免费传送点：§e${this.sanitizeName(name)}`);
                else Utils.tell(player, "§c创建失败：名称为空、数量已达上限或数据无法保存。");
            }
            this.openAdminMenu(player, onBack);
        });
    }

    static openTpaAdminSettings(player, onBack = null) {
        const settings = OperationsManager.getSettings();
        const form = new ModalFormData().title("§lTPA 管理开关")
            .toggle("全局启用 TPA", settings.tpaEnabled)
            .toggle("允许请求传送到玩家", settings.tpaToEnabled)
            .toggle("允许邀请玩家传送过来", settings.tpaHereEnabled);
        Utils.showForm(player, form, response => {
            if (!response.canceled) {
                const [tpaEnabled, tpaToEnabled, tpaHereEnabled] = response.formValues;
                OperationsManager.saveSettings({ ...settings, tpaEnabled, tpaToEnabled, tpaHereEnabled }, player);
                let cleared = 0;
                for (const [id, request] of this.requests) {
                    if (!tpaEnabled || (request.direction === "here" && !tpaHereEnabled) || (request.direction !== "here" && !tpaToEnabled)) {
                        this.requests.delete(id);
                        cleared++;
                    }
                }
                AuditManager.log("tpa_admin", player, "TPA", `global=${tpaEnabled} to=${tpaToEnabled} here=${tpaHereEnabled} cleared=${cleared}`);
                Utils.tell(player, `§aTPA 设置已保存，清理了 ${cleared} 条不再允许的请求。`);
            }
            this.openAdminMenu(player, onBack);
        });
    }

    static openDeleteWarpMenu(player, onBack = null) {
        const warps = this.getWarps();
        const form = new ActionFormData().title("§l§c删除传送点").body("§8删除后玩家将无法使用该目的地。");
        for (const warp of warps) form.button(`${warp.name}\n§r§8${warp.dimension}`, warp.icon || "textures/ui/World");
        form.button("§l§8⬅ 返回", "textures/ui/undo");
        Utils.showForm(player, form, (res) => {
            const warp = warps[res.selection];
            if (!warp) return this.openAdminMenu(player, onBack);
            const confirm = new MessageFormData().title("§l§c确认删除").body(`§0确定删除传送点 §e${warp.name}§0？`).button1("§c删除").button2("§8取消");
            Utils.showForm(player, confirm, (result) => {
                if (result.selection === 0 && this.deleteWarp(warp.id, player)) Utils.tell(player, `§a已删除传送点：§e${warp.name}`);
                this.openAdminMenu(player, onBack);
            });
        });
    }

    static openPlayerDataAdmin(player, onBack = null) {
        const players = world.getAllPlayers();
        const form = new ActionFormData().title("§l§c玩家传送数据管理").body("§8选择在线玩家。管理员可清理 Home、死亡点和待处理请求。");
        for (const target of players) form.button(`${target.name}\n§r§8Home ${this.getHomes(target).length} · 死亡点 ${this.getDeathLocation(target) ? "有" : "无"}`, "textures/ui/FriendsIcon");
        form.button("§l§8⬅ 返回", "textures/ui/undo");
        Utils.showForm(player, form, response => {
            const target = players[response.selection];
            if (target) this.openPlayerDataActions(player, target, onBack);
            else this.openAdminMenu(player, onBack);
        });
    }

    static openPlayerDataActions(admin, target, onBack = null) {
        if (!Utils.isValid(target)) return this.openPlayerDataAdmin(admin, onBack);
        const actions = [];
        const form = new ActionFormData().title(`§l管理 ${target.name}`).body(`§0Home: §e${this.getHomes(target).length}\n§0死亡点: ${this.getDeathLocation(target) ? "§a有" : "§8无"}`);
        const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
        add("§l§b➡ 免费传送到该玩家", "textures/ui/World", () => {
            this.performTeleport(admin, this.snapshot(target, target.name), target.name, "warp_use", `admin->${target.name}`);
        });
        add("§l§c🗑️ 清空该玩家全部 Home", "textures/ui/trash", () => {
            const count = this.getHomes(target).length;
            this.saveHomes(target, []);
            AuditManager.log("admin_clear", admin, target.name, `清空 ${count} 个 Home`);
            Utils.tell(admin, `§a已清空 ${target.name} 的 ${count} 个 Home。`);
            this.openPlayerDataActions(admin, target, onBack);
        });
        add("§l§c☠ 清除该玩家死亡点", "textures/ui/trash", () => {
            this.setDeathLocation(target, null);
            AuditManager.log("admin_clear", admin, target.name, "清除死亡返回点");
            Utils.tell(admin, `§a已清除 ${target.name} 的死亡返回点。`);
            this.openPlayerDataActions(admin, target, onBack);
        });
        add("§l§c✖ 取消该玩家全部 TPA", "textures/ui/cancel", () => {
            let count = 0;
            for (const [id, request] of this.requests) if (request.fromId === target.id || request.toId === target.id) { this.requests.delete(id); count++; }
            AuditManager.log("admin_clear", admin, target.name, `取消 ${count} 条 TPA`);
            Utils.tell(admin, `§a已取消与 ${target.name} 有关的 ${count} 条 TPA。`);
            this.openPlayerDataActions(admin, target, onBack);
        });
        add("§l§8⬅ 返回", "textures/ui/undo", () => this.openPlayerDataAdmin(admin, onBack));
        Utils.showForm(admin, form, response => actions[response.selection]?.());
    }
}
