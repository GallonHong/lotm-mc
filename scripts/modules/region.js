import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { Config } from "../config.js";
import { Utils } from "../utils.js";

const REGIONS_KEY = "sapi:server:regions:v1";

/** 管理员区域保护。区域优先级高于玩家区块领地。 */
export class RegionManager {
    static selections = new Map();
    static playerRegions = new Map();

    static getRegions() {
        try {
            const raw = world.getDynamicProperty(REGIONS_KEY);
            const regions = typeof raw === "string" ? JSON.parse(raw) : [];
            return Array.isArray(regions) ? regions.filter(region => region?.id && region?.dimension) : [];
        } catch (error) {
            console.warn(`[Regions] Failed to read regions: ${error}`);
            return [];
        }
    }

    static saveRegions(regions) {
        try {
            const limit = Math.max(1, Number(Config.regions?.maxRegions) || 50);
            world.setDynamicProperty(REGIONS_KEY, JSON.stringify(regions.slice(0, limit)));
            return true;
        } catch (error) {
            console.warn(`[Regions] Failed to save regions: ${error}`);
            return false;
        }
    }

    static contains(region, dimensionId, location) {
        return region.dimension === dimensionId &&
            location.x >= region.min.x && location.x <= region.max.x &&
            location.y >= region.min.y && location.y <= region.max.y &&
            location.z >= region.min.z && location.z <= region.max.z;
    }

    static getRegionAt(dimensionId, location) {
        return this.getRegions()
            .filter(region => this.contains(region, dimensionId, location))
            .sort((a, b) => (b.priority || 0) - (a.priority || 0))[0] || null;
    }

    static isAllowed(player, location, flag) {
        if (Utils.isAdmin(player)) return true;
        const region = this.getRegionAt(player.dimension.id, location);
        return !region || region.flags?.[flag] !== false;
    }

    static isLandClaimAllowed(dimensionId, chunkX, chunkZ) {
        const minX = chunkX * 16;
        const maxX = minX + 15;
        const minZ = chunkZ * 16;
        const maxZ = minZ + 15;
        return !this.getRegions().some(region => region.dimension === dimensionId &&
            region.flags?.allowLandClaim === false &&
            region.max.x >= minX && region.min.x <= maxX &&
            region.max.z >= minZ && region.min.z <= maxZ);
    }

    static setPoint(player, key) {
        const selection = this.selections.get(player.id) || {};
        selection[key] = {
            dimension: player.dimension.id,
            x: Math.floor(player.location.x),
            y: Math.floor(player.location.y),
            z: Math.floor(player.location.z)
        };
        this.selections.set(player.id, selection);
        Utils.tell(player, `§a保护区选点 ${key === "a" ? "A" : "B"} 已设为 §e${selection[key].x}, ${selection[key].y}, ${selection[key].z}`);
    }

    static createRegion(player, name, priority) {
        const selection = this.selections.get(player.id);
        if (!selection?.a || !selection?.b || selection.a.dimension !== selection.b.dimension) return false;
        const regions = this.getRegions();
        if (regions.length >= (Config.regions?.maxRegions ?? 50)) return false;
        const min = {}, max = {};
        for (const axis of ["x", "y", "z"]) {
            min[axis] = Math.min(selection.a[axis], selection.b[axis]);
            max[axis] = Math.max(selection.a[axis], selection.b[axis]);
        }
        const volume = (max.x - min.x + 1) * (max.y - min.y + 1) * (max.z - min.z + 1);
        if (volume > (Config.regions?.maxVolume ?? 4000000)) return false;
        regions.push({
            id: `region_${Date.now().toString(36)}`,
            name: String(name || "主城保护区").replace(/[\n\r§]/g, "").trim().slice(0, 24) || "主城保护区",
            dimension: selection.a.dimension,
            min,
            max,
            priority: Math.max(0, Math.min(1000, Number(priority) || Config.regions?.defaultPriority || 100)),
            flags: { ...Config.regions.defaultFlags },
            createdBy: player.name,
            createdAt: Date.now()
        });
        this.selections.delete(player.id);
        return this.saveRegions(regions);
    }

    static removeRegion(id) {
        const regions = this.getRegions();
        const next = regions.filter(region => region.id !== id);
        return next.length !== regions.length && this.saveRegions(next);
    }

    static subscribe(eventSignal, label, callback) {
        if (!eventSignal || typeof eventSignal.subscribe !== "function") {
            console.warn(`[Regions] ${label} event is unavailable; skipped.`);
            return false;
        }
        eventSignal.subscribe(callback);
        return true;
    }

    static registerProtectionEvents() {
        const before = world.beforeEvents;
        this.subscribe(before?.playerBreakBlock, "playerBreakBlock", event => {
            if (!this.isAllowed(event.player, event.block.location, "allowBreak")) event.cancel = true;
        });
        const beforePlace = before?.playerPlaceBlock;
        if (beforePlace && typeof beforePlace.subscribe === "function") {
            beforePlace.subscribe(event => {
                const location = event.block?.location || event.player.location;
                if (!this.isAllowed(event.player, location, "allowPlace")) event.cancel = true;
            });
        } else {
            this.subscribe(world.afterEvents?.playerPlaceBlock, "after playerPlaceBlock", event => {
                const { player, block } = event;
                if (this.isAllowed(player, block.location, "allowPlace")) return;
                const placedTypeId = block.typeId;
                system.run(() => {
                    try {
                        block.setType("minecraft:air");
                        let creative = false;
                        try { creative = String(player.getGameMode()).toLowerCase() === "creative"; } catch {}
                        if (!creative) Utils.giveItem(player, placedTypeId, 1);
                        Utils.actionbar(player, "§c[主城保护] 此处禁止放置方块，操作已撤销。");
                    } catch (error) {
                        console.warn(`[Regions] Failed to roll back placed block: ${error}`);
                    }
                });
            });
        }
        this.subscribe(before?.playerInteractWithBlock, "playerInteractWithBlock", event => {
            if (!this.isAllowed(event.player, event.block.location, "allowBlockInteract")) event.cancel = true;
        });
        this.subscribe(before?.playerInteractWithEntity, "playerInteractWithEntity", event => {
            if (!this.isAllowed(event.player, event.target.location, "allowEntityInteract")) event.cancel = true;
        });
        this.subscribe(before?.explosion, "explosion", event => {
            if (typeof event.getImpactedBlocks !== "function" || typeof event.setImpactedBlocks !== "function") return;
            event.setImpactedBlocks(event.getImpactedBlocks().filter(block => {
                const region = this.getRegionAt(event.dimension.id, block.location);
                return !region || region.flags?.allowExplosion !== false;
            }));
        });
        this.subscribe(before?.entityHurt, "entityHurt", event => {
            const victim = event.hurtEntity;
            const attacker = event.damageSource?.damagingEntity;
            if (victim?.typeId !== "minecraft:player" || attacker?.typeId !== "minecraft:player") return;
            const region = this.getRegionAt(victim.dimension.id, victim.location);
            if (region?.flags?.allowPvp === false && !Utils.isAdmin(attacker)) event.cancel = true;
        });

        system.runInterval(() => {
            for (const player of world.getAllPlayers()) {
                const region = this.getRegionAt(player.dimension.id, player.location);
                const previous = this.playerRegions.get(player.id) || null;
                const current = region?.id || null;
                if (current === previous) continue;
                if (region) Utils.tell(player, `§b你已进入保护区：§e${region.name}`);
                else if (previous) Utils.tell(player, "§7你已离开管理员保护区。");
                if (current) this.playerRegions.set(player.id, current);
                else this.playerRegions.delete(player.id);
            }
        }, 20);
        console.warn("[Regions] Administrator region protection initialized.");
    }

    static openAdminMenu(player, onBack = null) {
        if (!Utils.isAdmin(player)) return;
        const selection = this.selections.get(player.id) || {};
        const point = value => value ? `${value.x}, ${value.y}, ${value.z}` : "未设置";
        const actions = [];
        const form = new ActionFormData().title("§l§c🏰 主城与保护区管理").body(
            `§f保护区: §e${this.getRegions().length}§f 个\n§f选点 A: §7${point(selection.a)}\n§f选点 B: §7${point(selection.b)}`
        );
        const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
        add("§l§a📍 设置选点 A", "textures/ui/World", () => { this.setPoint(player, "a"); this.openAdminMenu(player, onBack); });
        add("§l§a📍 设置选点 B", "textures/ui/World", () => { this.setPoint(player, "b"); this.openAdminMenu(player, onBack); });
        add("§l§6🏰 创建主城保护区", "textures/ui/village_hero_effect", () => this.openCreateRegionModal(player, onBack));
        add("§l§c🗑️ 删除保护区", "textures/ui/trash", () => this.openDeleteRegionMenu(player, onBack));
        add("§l§b🔎 查看当前位置", "textures/ui/magnifyingGlass", () => {
            const region = this.getRegionAt(player.dimension.id, player.location);
            Utils.tell(player, region ? `§a当前位置属于：§e${region.name} §7(优先级 ${region.priority})` : "§7当前位置不在管理员保护区内。");
            this.openAdminMenu(player, onBack);
        });
        add("§l§7⬅ 返回", "textures/ui/undo", () => onBack?.());
        Utils.showForm(player, form, res => actions[res.selection]?.());
    }

    static openCreateRegionModal(player, onBack = null) {
        const form = new ModalFormData().title("§l创建主城保护区")
            .textField("保护区名称", "主城")
            .textField("优先级（0-1000）", String(Config.regions?.defaultPriority || 100));
        Utils.showForm(player, form, res => {
            if (!res.canceled) {
                const [name, priority] = res.formValues;
                Utils.tell(player, this.createRegion(player, name, priority) ? "§a保护区创建成功，已禁止破坏、放置、PVP、爆炸和玩家领地认领。" : "§c创建失败：请先在同一维度设置 A/B 两点，或检查区域大小/数量上限。");
            }
            this.openAdminMenu(player, onBack);
        });
    }

    static openDeleteRegionMenu(player, onBack = null) {
        const regions = this.getRegions();
        const form = new ActionFormData().title("§l§c删除保护区").body("§7选择要删除的管理员保护区。");
        for (const region of regions) form.button(`${region.name}\n§r§8${region.dimension}`, "textures/ui/trash");
        form.button("§l§7⬅ 返回", "textures/ui/undo");
        Utils.showForm(player, form, res => {
            const region = regions[res.selection];
            if (!region) return this.openAdminMenu(player, onBack);
            const confirm = new MessageFormData().title("§l§c确认删除").body(`§f确定删除 §e${region.name}§f？`).button1("§c删除").button2("§7取消");
            Utils.showForm(player, confirm, answer => {
                if (answer.selection === 0 && this.removeRegion(region.id)) Utils.tell(player, `§a已删除保护区：§e${region.name}`);
                this.openAdminMenu(player, onBack);
            });
        });
    }
}
