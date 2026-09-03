import { world, system } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";
import { Config } from "../config.js";
import { Utils } from "../utils.js";
import { calculateSafeDamage } from "../data/safeRules.js";
import { AuditManager } from "./audit.js";
import { LandManager } from "./land.js";
import { RegionManager } from "./region.js";

const SAFE_TYPE = "sapi:secure_safe";
const DEPLOYER_TYPE = "sapi:secure_safe_deployer";
const PROP_OWNER = "sapi:safe_owner";
const PROP_PASSWORD = "sapi:safe_password";
const PROP_SALT = "sapi:safe_salt";
const PROP_DURABILITY = "sapi:safe_durability";
const PROP_BREACHED = "sapi:safe_breached";

/** 密码保险箱：真实实体容器、密码访问、攻击报废与拥有者回收。 */
export class SafeManager {
    static attempts = new Map();
    static damageNotices = new Map();
    static transactionLocks = new Set();
    static registered = false;

    static get settings() {
        return Config.safe || {};
    }

    static registerEvents() {
        if (this.registered) return;
        this.registered = true;

        const startup = system.beforeEvents?.startup || world.beforeEvents?.worldInitialize;
        if (startup?.subscribe) {
            startup.subscribe(event => {
                try {
                    event.itemComponentRegistry.registerCustomComponent("sapi:secure_safe_deployer", {
                        onUseOn: componentEvent => system.run(() => this.requestPlacement(componentEvent))
                    });
                } catch (error) {
                    console.warn(`[Safe] deployer component registration failed: ${error}`);
                }
            });
        } else {
            console.warn("[Safe] startup event unavailable; safe deployer cannot be registered.");
        }

        const interact = world.beforeEvents?.playerInteractWithEntity;
        if (interact?.subscribe) {
            interact.subscribe(event => {
                if (event.target?.typeId !== SAFE_TYPE) return;
                event.cancel = true;
                system.run(() => this.requestAccess(event.player, event.target));
            });
        }

        const hurt = world.beforeEvents?.entityHurt;
        if (hurt?.subscribe) {
            hurt.subscribe(event => {
                if (event.hurtEntity?.typeId !== SAFE_TYPE) return;
                event.cancel = true;
                system.run(() => this.applyVirtualDamage(event.hurtEntity, event.damageSource, event.damage));
            });
        }
    }

    static validSafe(safe) {
        return Utils.isValid(safe) && safe.typeId === SAFE_TYPE;
    }

    static getContainer(safe) {
        try { return safe.getComponent("minecraft:inventory")?.container || safe.getComponent("inventory")?.container || null; }
        catch { return null; }
    }

    static ownerName(safe) {
        return String(Utils.getProp(safe, PROP_OWNER, ""));
    }

    static isOwner(player, safe) {
        return !!player && this.ownerName(safe) === player.name;
    }

    static isBreached(safe) {
        return Boolean(Utils.getProp(safe, PROP_BREACHED, false));
    }

    static durability(safe) {
        const maximum = Math.max(1, Number(this.settings.maxDurability || 2000));
        return Math.max(0, Math.min(maximum, Number(Utils.getProp(safe, PROP_DURABILITY, maximum))));
    }

    static passwordHash(password, salt) {
        let hash = 2166136261;
        const value = `${salt}:${password}:sapi-safe`;
        for (let index = 0; index < value.length; index++) {
            hash ^= value.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(36);
    }

    static createSalt() {
        return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    }

    static validPassword(password) {
        const min = Math.max(4, Number(this.settings.passwordMinLength || 4));
        const max = Math.max(min, Number(this.settings.passwordMaxLength || 8));
        return new RegExp(`^\\d{${min},${max}}$`).test(String(password || ""));
    }

    static placementAllowed(player, dimension, location) {
        if (!RegionManager.isAllowed(player, location, "allowPlace")) return false;
        const { chunkX, chunkZ } = Utils.getChunkCoords(location);
        const plot = LandManager.getPlot(dimension.id, chunkX, chunkZ);
        return !plot || LandManager.hasPermission(player, plot) || plot.flags?.allowPlace;
    }

    static requestPlacement(event) {
        const player = event?.source;
        const block = event?.block;
        const item = event?.itemStack;
        if (!Utils.isValid(player) || player.typeId !== "minecraft:player" || item?.typeId !== DEPLOYER_TYPE || !block) return;

        const location = { x: block.location.x + 0.5, y: block.location.y + 1, z: block.location.z + 0.5 };
        const dimension = block.dimension || player.dimension;
        if (!this.placementAllowed(player, dimension, location)) {
            Utils.tell(player, "§c此处禁止放置保险箱。");
            Utils.sound.fail(player);
            return;
        }
        try {
            const targetBlock = dimension.getBlock(location);
            if (targetBlock && !targetBlock.isAir && !targetBlock.isLiquid) {
                Utils.tell(player, "§c保险箱上方空间不足。");
                return;
            }
            if (dimension.getEntities({ type: SAFE_TYPE, location, maxDistance: 1.1 }).length) {
                Utils.tell(player, "§c这里已经有一台保险箱。");
                return;
            }
        } catch {}

        const min = Math.max(4, Number(this.settings.passwordMinLength || 4));
        const max = Math.max(min, Number(this.settings.passwordMaxLength || 8));
        const form = new ModalFormData().title("§l§6设置保险箱密码")
            .textField(`§0请输入 ${min}～${max} 位数字密码`, "不会保存明文密码")
            .textField("§0再次输入密码", "重复密码");
        Utils.showForm(player, form, response => {
            if (response.canceled) return;
            const [password, confirmation] = response.formValues || [];
            if (!this.validPassword(password)) {
                Utils.tell(player, `§c密码必须是 ${min}～${max} 位数字。`);
                return;
            }
            if (password !== confirmation) {
                Utils.tell(player, "§c两次输入的密码不一致，保险箱没有放置。");
                return;
            }
            if (Utils.countItem(player, DEPLOYER_TYPE) < 1) {
                Utils.tell(player, "§c保险箱部署器已经不在背包中，放置取消。");
                return;
            }
            this.deploy(player, dimension, location, password);
        });
    }

    static deploy(player, dimension, location, password) {
        let safe = null;
        try {
            safe = dimension.spawnEntity(SAFE_TYPE, location);
            const salt = this.createSalt();
            Utils.setProp(safe, PROP_OWNER, player.name);
            Utils.setProp(safe, PROP_SALT, salt);
            Utils.setProp(safe, PROP_PASSWORD, this.passwordHash(password, salt));
            Utils.setProp(safe, PROP_DURABILITY, Number(this.settings.maxDurability || 2000));
            Utils.setProp(safe, PROP_BREACHED, false);
            try { safe.setProperty("sapi:breached", false); } catch {}
            try {
                const yaw = Math.round((Number(player.getRotation()?.y || 0)) / 90) * 90;
                safe.setRotation({ x: 0, y: yaw });
            } catch {}
            this.updateNameTag(safe);
            if (!Utils.removeItem(player, DEPLOYER_TYPE, 1)) throw new Error("deployer removal failed");
            AuditManager.log("safe_place", player, safe.id, `${dimension.id} ${Math.floor(location.x)},${Math.floor(location.y)},${Math.floor(location.z)}`);
            Utils.tell(player, `§a保险箱已部署，初始耐久 §e${this.settings.maxDurability || 2000}§a。请牢记密码。`);
            Utils.sound.success(player);
        } catch (error) {
            try { safe?.remove(); } catch {}
            Utils.tell(player, "§c保险箱部署失败，部署器未消耗或已返还。");
            console.warn(`[Safe] deployment failed: ${error}`);
        }
    }

    static updateNameTag(safe) {
        if (!this.validSafe(safe)) return;
        const breached = this.isBreached(safe);
        const current = Math.ceil(this.durability(safe));
        const maximum = Number(this.settings.maxDurability || 2000);
        try {
            safe.nameTag = breached
                ? "§c报废保险箱 §8| 无密码保护"
                : `§6加固密码保险箱 §8| §e${current}/${maximum}`;
        } catch {}
    }

    static damagingPlayer(source) {
        const direct = source?.damagingEntity;
        if (direct?.typeId === "minecraft:player") return direct;
        try {
            const owner = direct?.getComponent("minecraft:projectile")?.owner;
            if (owner?.typeId === "minecraft:player") return owner;
        } catch {}
        return null;
    }

    static heldItemId(player) {
        try {
            const inventory = player.getComponent("minecraft:inventory")?.container || player.getComponent("inventory")?.container;
            return inventory?.getItem(player.selectedSlotIndex)?.typeId || "";
        } catch { return ""; }
    }

    static isSpecialWeapon(player) {
        return (this.settings.specialWeaponIds || []).includes(this.heldItemId(player));
    }

    static applyVirtualDamage(safe, damageSource, rawDamage) {
        if (!this.validSafe(safe) || this.isBreached(safe)) return;
        const attacker = this.damagingPlayer(damageSource);
        if (!attacker) return;

        const special = this.isSpecialWeapon(attacker);
        const reduction = Math.max(0, Math.min(0.99, Number(this.settings.normalDamageReduction ?? 0.90)));
        const applied = calculateSafeDamage(rawDamage, special, reduction);
        if (applied <= 0) return;
        const remaining = Math.max(0, this.durability(safe) - applied);
        Utils.setProp(safe, PROP_DURABILITY, remaining);
        this.updateNameTag(safe);

        try {
            safe.dimension.spawnParticle(special ? "minecraft:critical_hit_emitter" : "minecraft:basic_smoke_particle", {
                x: safe.location.x, y: safe.location.y + 0.8, z: safe.location.z
            });
            safe.dimension.playSound("random.anvil_land", safe.location, { volume: 0.55, pitch: special ? 0.75 : 1.35 });
        } catch {}

        const lastNotice = Number(this.damageNotices.get(attacker.id) || -1000);
        if (system.currentTick - lastNotice >= 40) {
            this.damageNotices.set(attacker.id, system.currentTick);
            Utils.tell(attacker, special
                ? `§c特殊枪械造成 §e${applied.toFixed(1)} §c点保险箱伤害，剩余 §e${Math.ceil(remaining)}/2000§c。`
                : `§8保险箱减免 90% 伤害，本次造成 §e${applied.toFixed(1)}§8，剩余 §e${Math.ceil(remaining)}/2000§8。`);
        }

        if (remaining <= 0) this.breach(safe, attacker);
    }

    static breach(safe, attacker) {
        if (!this.validSafe(safe) || this.isBreached(safe)) return;
        Utils.setProp(safe, PROP_BREACHED, true);
        Utils.setProp(safe, PROP_DURABILITY, 0);
        try { safe.triggerEvent("sapi:breach"); } catch { try { safe.setProperty("sapi:breached", true); } catch {} }
        this.updateNameTag(safe);
        try {
            safe.dimension.playSound("random.break", safe.location, { volume: 1.6, pitch: 0.55 });
            safe.dimension.spawnParticle("minecraft:huge_explosion_emitter", safe.location);
        } catch {}
        AuditManager.log("safe_breach", attacker, safe.id, `owner=${this.ownerName(safe)}`);
        Utils.tell(attacker, "§c保险箱已彻底报废，现在任何人都能免密码打开，且无法回收。");
        const owner = world.getAllPlayers().find(player => player.name === this.ownerName(safe));
        if (owner && owner.id !== attacker.id) Utils.tell(owner, `§c你的保险箱已被 §e${attacker.name} §c攻破！`);
    }

    static attemptKey(player, safe) {
        return `${safe.id}:${player.name}`;
    }

    static requestAccess(player, safe) {
        if (!Utils.isValid(player) || !this.validSafe(safe)) return;
        if (this.isBreached(safe)) return this.openSafeMenu(player, safe);

        const key = this.attemptKey(player, safe);
        const state = this.attempts.get(key) || { failures: 0, lockedUntil: 0 };
        const now = Date.now();
        if (state.lockedUntil > now) {
            Utils.tell(player, `§c密码输入已锁定，请等待 ${Math.ceil((state.lockedUntil - now) / 1000)} 秒。`);
            return;
        }

        const form = new ModalFormData().title("§l§6保险箱密码验证")
            .textField(`§0拥有者：§e${this.ownerName(safe)}\n§0请输入密码`, "4～8 位数字");
        Utils.showForm(player, form, response => {
            if (response.canceled || !this.validSafe(safe)) return;
            const password = String(response.formValues?.[0] || "");
            const salt = String(Utils.getProp(safe, PROP_SALT, ""));
            const expected = String(Utils.getProp(safe, PROP_PASSWORD, ""));
            if (salt && expected && this.passwordHash(password, salt) === expected) {
                this.attempts.delete(key);
                AuditManager.log("safe_open", player, safe.id, `owner=${this.ownerName(safe)}`);
                return this.openSafeMenu(player, safe);
            }

            state.failures += 1;
            const limit = Math.max(1, Number(this.settings.maxPasswordAttempts || 3));
            if (state.failures >= limit) {
                state.failures = 0;
                state.lockedUntil = now + Math.max(5, Number(this.settings.passwordLockSeconds || 30)) * 1000;
                Utils.tell(player, `§c密码错误次数过多，锁定 ${this.settings.passwordLockSeconds || 30} 秒。`);
            } else {
                Utils.tell(player, `§c密码错误，还可尝试 ${limit - state.failures} 次。`);
            }
            this.attempts.set(key, state);
            Utils.sound.fail(player);
        });
    }

    static openSafeMenu(player, safe) {
        if (!this.validSafe(safe)) return;
        const container = this.getContainer(safe);
        if (!container) {
            Utils.tell(player, "§c保险箱容器不可用，请检查行为包版本。");
            return;
        }
        const occupied = this.occupiedSlots(container).length;
        const breached = this.isBreached(safe);
        const actions = [];
        const form = new ActionFormData().title(breached ? "§l§c报废保险箱" : "§l§6加固密码保险箱")
            .body(`§0拥有者：§e${this.ownerName(safe)}\n§0状态：${breached ? "§c已报废，密码失效" : `§a完好 §8(${Math.ceil(this.durability(safe))}/2000)`}\n§0容量：§e${occupied}/27`);
        const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
        add("§l§a存入物品\n§r§8从背包选择整组物品", "textures/ui/arrow_dark_down", () => this.openDepositMenu(player, safe));
        add("§l§b取出物品\n§r§8查看并取出整组物品", "textures/ui/arrow_dark_up", () => this.openWithdrawMenu(player, safe));
        if (!breached && this.isOwner(player, safe)) {
            add("§l§e修改密码\n§r§8设置新的数字密码", "textures/ui/icon_lock", () => this.openChangePassword(player, safe));
            add("§l§6回收保险箱\n§r§8须先清空；再次放置恢复满血", "textures/ui/trash", () => this.confirmRecovery(player, safe));
        }
        add("§l§8关闭", "textures/ui/cancel", () => {});
        Utils.showForm(player, form, response => actions[response.selection]?.());
    }

    static occupiedSlots(container) {
        const slots = [];
        for (let index = 0; index < container.size; index++) {
            const item = container.getItem(index);
            if (item) slots.push({ index, item });
        }
        return slots;
    }

    static itemLabel(item) {
        const custom = String(item?.nameTag || "").replace(/[\n\r]/g, " ").slice(0, 30);
        return custom || String(item?.typeId || "未知物品").replace("minecraft:", "").replace("test_gun:", "");
    }

    static itemSignature(item) {
        if (!item) return "";
        let lore = "";
        try { lore = item.getLore().join("|"); } catch {}
        return `${item.typeId}:${item.amount}:${item.nameTag || ""}:${lore}`;
    }

    static openDepositMenu(player, safe) {
        if (!this.validSafe(safe)) return;
        const playerContainer = player.getComponent("minecraft:inventory")?.container || player.getComponent("inventory")?.container;
        const safeContainer = this.getContainer(safe);
        if (!playerContainer || !safeContainer) return;
        const stacks = this.occupiedSlots(playerContainer);
        const actions = [];
        const form = new ActionFormData().title("§l§a存入保险箱")
            .body(stacks.length ? "§8点击后会存入该格的整组物品。" : "§8背包中没有可存入的物品。");
        for (const { index, item } of stacks) {
            const signature = this.itemSignature(item);
            form.button(`§0${this.itemLabel(item)}\n§r§8数量：${item.amount}`);
            actions.push(() => {
                const current = playerContainer.getItem(index);
                if (!current || this.itemSignature(current) !== signature) {
                    Utils.tell(player, "§c该背包格已经变化，请重新选择。");
                    return this.openDepositMenu(player, safe);
                }
                this.transferStack(player, safe, playerContainer, index, safeContainer, "存入");
            });
        }
        form.button("§l§8返回保险箱", "textures/ui/undo");
        actions.push(() => this.openSafeMenu(player, safe));
        Utils.showForm(player, form, response => actions[response.selection]?.());
    }

    static openWithdrawMenu(player, safe) {
        if (!this.validSafe(safe)) return;
        const playerContainer = player.getComponent("minecraft:inventory")?.container || player.getComponent("inventory")?.container;
        const safeContainer = this.getContainer(safe);
        if (!playerContainer || !safeContainer) return;
        const stacks = this.occupiedSlots(safeContainer);
        const actions = [];
        const form = new ActionFormData().title("§l§b取出保险箱物品")
            .body(stacks.length ? "§8点击后会取出该格的整组物品。" : "§8保险箱目前为空。");
        for (const { index, item } of stacks) {
            const signature = this.itemSignature(item);
            form.button(`§0${this.itemLabel(item)}\n§r§8数量：${item.amount}`);
            actions.push(() => {
                const current = safeContainer.getItem(index);
                if (!current || this.itemSignature(current) !== signature) {
                    Utils.tell(player, "§c该保险箱格已经变化，请重新选择。");
                    return this.openWithdrawMenu(player, safe);
                }
                this.transferStack(player, safe, safeContainer, index, playerContainer, "取出");
            });
        }
        form.button("§l§8返回保险箱", "textures/ui/undo");
        actions.push(() => this.openSafeMenu(player, safe));
        Utils.showForm(player, form, response => actions[response.selection]?.());
    }

    static transferStack(player, safe, source, sourceIndex, destination, action) {
        if (!this.validSafe(safe)) return;
        if (this.transactionLocks.has(safe.id)) {
            Utils.tell(player, "§e另一名玩家正在操作此保险箱，请稍后重试。");
            return;
        }
        this.transactionLocks.add(safe.id);
        try {
            const item = source.getItem(sourceIndex);
            if (!item) return;
            const originalAmount = item.amount;
            const leftover = destination.addItem(item.clone());
            const remaining = leftover?.amount || 0;
            const moved = originalAmount - remaining;
            if (moved <= 0) {
                Utils.tell(player, "§c目标容器空间不足。");
                return;
            }
            source.setItem(sourceIndex, leftover || undefined);
            Utils.tell(player, `§a已${action} §e${this.itemLabel(item)} §ax${moved}。`);
            AuditManager.log(action === "存入" ? "safe_deposit" : "safe_withdraw", player, safe.id, `${item.typeId} x${moved}`);
        } catch (error) {
            console.warn(`[Safe] ${action} transaction failed: ${error}`);
            Utils.tell(player, `§c${action}失败，物品状态未确认，请重新打开保险箱检查。`);
        } finally {
            this.transactionLocks.delete(safe.id);
        }
        this.openSafeMenu(player, safe);
    }

    static openChangePassword(player, safe) {
        if (!this.validSafe(safe) || !this.isOwner(player, safe) || this.isBreached(safe)) return;
        const min = Math.max(4, Number(this.settings.passwordMinLength || 4));
        const max = Math.max(min, Number(this.settings.passwordMaxLength || 8));
        const form = new ModalFormData().title("§l§e修改保险箱密码")
            .textField(`§0新密码（${min}～${max} 位数字）`, "新密码")
            .textField("§0再次输入", "重复新密码");
        Utils.showForm(player, form, response => {
            if (response.canceled || !this.validSafe(safe)) return this.openSafeMenu(player, safe);
            const [password, confirmation] = response.formValues || [];
            if (!this.validPassword(password) || password !== confirmation) {
                Utils.tell(player, "§c密码格式错误或两次输入不一致。");
                return this.openSafeMenu(player, safe);
            }
            const salt = this.createSalt();
            Utils.setProp(safe, PROP_SALT, salt);
            Utils.setProp(safe, PROP_PASSWORD, this.passwordHash(password, salt));
            AuditManager.log("safe_password", player, safe.id, "owner changed password");
            Utils.tell(player, "§a保险箱密码已修改。");
            this.openSafeMenu(player, safe);
        });
    }

    static confirmRecovery(player, safe) {
        if (!this.validSafe(safe) || !this.isOwner(player, safe) || this.isBreached(safe)) return;
        const container = this.getContainer(safe);
        if (!container || this.occupiedSlots(container).length > 0) {
            Utils.tell(player, "§c回收前必须先清空保险箱。");
            return this.openSafeMenu(player, safe);
        }
        const form = new MessageFormData().title("§l§6回收保险箱")
            .body("§0回收后密码和当前耐久会清除。再次放置时重新设置密码，并恢复为 2000 满耐久。")
            .button1("§a确认回收")
            .button2("§8取消");
        Utils.showForm(player, form, response => {
            if (response.selection !== 0 || !this.validSafe(safe)) return this.openSafeMenu(player, safe);
            if (this.occupiedSlots(this.getContainer(safe)).length > 0) {
                Utils.tell(player, "§c保险箱内容已经变化，回收取消。");
                return this.openSafeMenu(player, safe);
            }
            if (!Utils.giveItem(player, DEPLOYER_TYPE, 1)) {
                Utils.tell(player, "§c保险箱物品返还失败，回收取消。");
                return;
            }
            AuditManager.log("safe_recover", player, safe.id, `remaining=${Math.ceil(this.durability(safe))}`);
            try { safe.remove(); } catch {}
            Utils.tell(player, "§a保险箱已回收；再次放置时会恢复 2000 满耐久。");
            Utils.sound.success(player);
        });
    }
}
