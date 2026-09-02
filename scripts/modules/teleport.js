import { world } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { Config } from "../config.js";
import { Utils } from "../utils.js";

const WARPS_KEY = "sapi:server:warps:v1";

/** 免费公共传送点与统一安全落点服务。 */
export class TeleportManager {
    static cooldowns = new Map();

    static getWarps() {
        try {
            const raw = world.getDynamicProperty(WARPS_KEY);
            const parsed = typeof raw === "string" ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed.filter(warp => warp && warp.id && warp.dimension) : [];
        } catch (error) {
            console.warn(`[Teleport] Failed to read warps: ${error}`);
            return [];
        }
    }

    static saveWarps(warps) {
        try {
            const maxWarps = Math.max(1, Number(Config.teleport?.maxWarps) || 50);
            world.setDynamicProperty(WARPS_KEY, JSON.stringify(warps.slice(0, maxWarps)));
            return true;
        } catch (error) {
            console.warn(`[Teleport] Failed to save warps: ${error}`);
            return false;
        }
    }

    static getWarp(id) {
        return this.getWarps().find(warp => warp.id === id) || null;
    }

    static getSpawnWarp() {
        const warps = this.getWarps();
        return warps.find(warp => warp.id === "spawn") || warps.find(warp => warp.isSpawn) || null;
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
        return this.saveWarps(warps);
    }

    static setSpawnWarp(player) {
        if (!Utils.isAdmin(player)) return false;
        const warps = this.getWarps().filter(warp => warp.id !== "spawn");
        const rotation = typeof player.getRotation === "function" ? player.getRotation() : { x: 0, y: 0 };
        warps.unshift({
            id: "spawn",
            isSpawn: true,
            name: "主城出生点",
            icon: "textures/ui/icon_recipe_nature",
            dimension: player.dimension.id,
            x: Number(player.location.x.toFixed(2)),
            y: Number(player.location.y.toFixed(2)),
            z: Number(player.location.z.toFixed(2)),
            rotation: { x: Number(rotation.x || 0), y: Number(rotation.y || 0) },
            createdBy: player.name,
            createdAt: Date.now()
        });
        return this.saveWarps(warps);
    }

    static deleteWarp(id) {
        const warps = this.getWarps();
        const next = warps.filter(warp => warp.id !== id);
        return next.length !== warps.length && this.saveWarps(next);
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
            return false;
        }
    }

    static findSafeLocation(dimension, location) {
        const x = Math.floor(Number(location.x)) + 0.5;
        const z = Math.floor(Number(location.z)) + 0.5;
        const baseY = Math.floor(Number(location.y));
        const radius = Math.max(1, Math.min(32, Number(Config.teleport?.safeSearchRadiusY) || 16));
        const offsets = [0];
        for (let step = 1; step <= radius; step++) offsets.push(step, -step);
        for (const offset of offsets) {
            const y = baseY + offset;
            if (this.isSafeAt(dimension, Math.floor(x), y, Math.floor(z))) return { x, y, z };
        }
        // 未加载区块无法预读方块时，保留管理员设定的安全坐标。
        return { x: Number(location.x), y: Number(location.y), z: Number(location.z) };
    }

    static teleportToWarp(player, warp) {
        if (!Utils.isValid(player) || !warp) return false;
        const now = Date.now();
        const cooldownMs = Math.max(0, Number(Config.teleport?.cooldownSeconds || 0) * 1000);
        const readyAt = this.cooldowns.get(player.id) || 0;
        if (!Utils.isAdmin(player) && now < readyAt) {
            Utils.tell(player, `§e请等待 ${Math.ceil((readyAt - now) / 1000)} 秒后再次传送。`);
            return false;
        }
        try {
            const dimension = world.getDimension(warp.dimension);
            const destination = this.findSafeLocation(dimension, warp);
            player.teleport(destination, {
                dimension,
                rotation: warp.rotation || undefined
            });
            this.cooldowns.set(player.id, now + cooldownMs);
            Utils.sound.teleport(player);
            Utils.tell(player, `§a已免费传送至 §e${warp.name}§a。`);
            return true;
        } catch (error) {
            console.warn(`[Teleport] Failed to teleport ${player.name} to ${warp.id}: ${error}`);
            Utils.tell(player, "§c传送失败，目标区块暂时不可用。请稍后再试或联系管理员更新传送点。");
            return false;
        }
    }

    static teleportToSpawn(player) {
        const spawn = this.getSpawnWarp();
        if (!spawn) {
            Utils.tell(player, "§7管理员尚未设置主城出生点。");
            return false;
        }
        return this.teleportToWarp(player, spawn);
    }

    static openWarpMenu(player, onBack = null) {
        const warps = this.getWarps();
        const form = new ActionFormData()
            .title("§l§b🧭 公共传送点")
            .body(warps.length ? "§7全部公共传送均免费。请选择目的地：" : "§7管理员尚未创建公共传送点。");
        for (const warp of warps) form.button(`§l§f${warp.name}\n§r§8免费传送`, warp.icon || "textures/ui/World");
        form.button("§l§7⬅ 返回", "textures/ui/undo");
        Utils.showForm(player, form, (res) => {
            if (res.selection < warps.length) this.teleportToWarp(player, warps[res.selection]);
            else onBack?.();
        });
    }

    static openAdminMenu(player, onBack = null) {
        if (!Utils.isAdmin(player)) return;
        const actions = [];
        const form = new ActionFormData().title("§l§c🧭 传送点管理").body(`§f公共传送点: §e${this.getWarps().length}§f 个\n§a所有传送均免费`);
        const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
        add("§l§a➕ 在当前位置创建传送点", "textures/ui/plus", () => this.openCreateWarpModal(player, onBack));
        add("§l§6🏰 设置当前位置为主城出生点", "textures/ui/icon_recipe_nature", () => {
            if (this.setSpawnWarp(player)) Utils.tell(player, "§a主城出生点已更新。");
            this.openAdminMenu(player, onBack);
        });
        add("§l§c🗑️ 删除传送点", "textures/ui/trash", () => this.openDeleteWarpMenu(player, onBack));
        add("§l§b👁️ 预览玩家传送菜单", "textures/ui/World", () => this.openWarpMenu(player, () => this.openAdminMenu(player, onBack)));
        add("§l§7⬅ 返回", "textures/ui/undo", () => onBack?.());
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

    static openDeleteWarpMenu(player, onBack = null) {
        const warps = this.getWarps();
        const form = new ActionFormData().title("§l§c删除传送点").body("§7删除后玩家将无法使用该目的地。");
        for (const warp of warps) form.button(`${warp.name}\n§r§8${warp.dimension}`, warp.icon || "textures/ui/World");
        form.button("§l§7⬅ 返回", "textures/ui/undo");
        Utils.showForm(player, form, (res) => {
            const warp = warps[res.selection];
            if (!warp) return this.openAdminMenu(player, onBack);
            const confirm = new MessageFormData().title("§l§c确认删除").body(`§f确定删除传送点 §e${warp.name}§f？`).button1("§c删除").button2("§7取消");
            Utils.showForm(player, confirm, (result) => {
                if (result.selection === 0 && this.deleteWarp(warp.id)) Utils.tell(player, `§a已删除传送点：§e${warp.name}`);
                this.openAdminMenu(player, onBack);
            });
        });
    }
}
