import { world, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { Utils } from "./utils.js";
import { LotmManager } from "./modules/lotm.js";
import { Integration } from "./modules/integration.js";

function initLotm() {
    console.warn("[LOTM Pathways] Initializing v1.4.0...");
    LotmManager.init();
    Integration.startLotmHeartbeat();
    console.warn("[LOTM Pathways] Pathways, artifacts and integration bridge initialized.");
}

system.run(initLotm);

world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
    if (!Utils.isValid(player)) return;
    LotmManager.applyHealthProfile(player);
    if (initialSpawn && !Integration.isServerAvailable()) {
        Utils.tell(player, "§5LOTM Pathways 已启用。手持罗盘右键或使用 /scriptevent lotm:open 打开非凡秘典。");
        if (Utils.countItem(player, "minecraft:compass") === 0) Utils.giveItem(player, "minecraft:compass", 1, "§r§l§5非凡秘典导航", ["§7右键查看当前途径与能力"]);
    }
});

world.afterEvents.itemUse.subscribe(({ source: player, itemStack }) => {
    if (!Utils.isValid(player) || !itemStack) return;
    if (itemStack.typeId === "minecraft:compass") {
        if (!Integration.isServerAvailable()) system.run(() => LotmManager.openAbilityMenu(player));
        return;
    }
    if (itemStack.typeId.startsWith("lotm:")) system.run(() => LotmManager.handleItemUse(player, itemStack));
});

function handleInteract(event) {
    const { player, itemStack } = event;
    if (!Utils.isValid(player)) return;
    if (itemStack?.typeId === "minecraft:compass" && !Integration.isServerAvailable()) {
        event.cancel = true;
        system.run(() => LotmManager.openAbilityMenu(player));
        return;
    }
    if (!itemStack && LotmManager.getPathway(player) !== "none") {
        event.cancel = true;
        system.run(() => LotmManager.handleEmptyHandUse(player));
        return;
    }
    if (itemStack?.typeId?.startsWith("lotm:")) {
        event.cancel = true;
        system.run(() => LotmManager.handleItemUse(player, itemStack));
    }
}

const blockInteract = world.beforeEvents.playerInteractWithBlock;
if (blockInteract?.subscribe) blockInteract.subscribe(handleInteract);
const entityInteract = world.beforeEvents.playerInteractWithEntity;
if (entityInteract?.subscribe) entityInteract.subscribe(handleInteract);

world.afterEvents.entityHurt.subscribe(({ hurtEntity, damage, damageSource }) => {
    const attacker = damageSource?.damagingEntity;
    if (attacker?.typeId === "minecraft:player" && hurtEntity) LotmManager.handleAttackHit(attacker, hurtEntity);
    if (hurtEntity?.typeId !== "minecraft:player" || !Utils.isValid(hurtEntity)) return;
    const player = hurtEntity;
    const fireArmorUntil = Utils.getProp(player, "lotm:hunter_fire_armor_until", 0);
    if (fireArmorUntil > system.currentTick && attacker && Utils.isValid(attacker) && damageSource?.cause !== "fire") {
        const distance = Math.hypot(attacker.location.x - player.location.x, attacker.location.z - player.location.z);
        if (distance <= 4) {
            try { attacker.applyDamage(4, { damagingEntity: player, cause: "fire" }); } catch {}
            try { attacker.setOnFire(2, true); } catch {}
        }
    }
    LotmManager.playerInCombat.set(player.id, system.currentTick);
    try {
        const health = player.getComponent("health");
        if (health && health.currentValue <= damage + 2) LotmManager.triggerFatalSubstitute(player);
    } catch {}
});

function openLotmAdmin(player) {
    if (!Utils.isAdmin(player)) {
        Utils.tell(player, "§c需要管理员权限。");
        return;
    }
    const actions = [];
    const form = new ActionFormData().title("§l§5🔮 LOTM 调试控制台").body("§7调试操作仅对管理员开放。");
    const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
    add("§l§e🧪 获取全部魔药", "textures/items/potion_seer", () => LotmManager.giveAllPotionKit(player));
    add("§l§6🎁 获取当前途径媒介", "textures/items/diamond_sword", () => LotmManager.giveFocusKit(player));
    add("§l§a📜 当前消化度设为100%", "textures/items/book_enchanted", () => Utils.setProp(player, "lotm:digestion", 100));
    add("§l§b⚡ 回满灵性", "textures/items/experience_bottle", () => Utils.setProp(player, "lotm:sp", LotmManager.getMaxSpirituality(player)));
    add("§l§4🔄 重置为普通人", "textures/ui/trash", () => LotmManager.setProgression(player, "none", 0, 0));
    if (Integration.isServerAvailable()) add("§l§7⬅ 返回服务器菜单", "textures/ui/undo", () => Integration.send(player, "sapi:open"));
    Utils.showForm(player, form, (res) => actions[res.selection]?.());
}

function handleChat(event) {
    const message = event.message.trim().toLowerCase();
    if (!["!lotm", "!guimi", "!非凡", "!途径"].includes(message)) return;
    if ("cancel" in event) event.cancel = true;
    system.run(() => LotmManager.openAbilityMenu(event.sender));
}

const beforeChat = world.beforeEvents.chatSend;
const afterChat = world.afterEvents.chatSend;
if (beforeChat?.subscribe) beforeChat.subscribe(handleChat);
else if (afterChat?.subscribe) afterChat.subscribe(handleChat);

const scriptEvents = system.afterEvents.scriptEventReceive;
if (scriptEvents?.subscribe) {
    scriptEvents.subscribe(({ id, sourceEntity }) => {
        if (!sourceEntity || sourceEntity.typeId !== "minecraft:player") return;
        if (["lotm:open", "system:lotm", "gui:lotm"].includes(id)) LotmManager.openAbilityMenu(sourceEntity);
        else if (id === "lotm:admin") openLotmAdmin(sourceEntity);
    });
}
