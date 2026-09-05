import { system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

const STATION_ID = "ab_ve:medical_station";

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function countItem(container, typeId) {
    let count = 0;
    for (let slot = 0; slot < container.size; slot++) {
        const item = container.getItem(slot);
        if (item?.typeId === typeId) count += item.amount;
    }
    return count;
}

function consumeItem(container, typeId) {
    for (let slot = 0; slot < container.size; slot++) {
        const item = container.getItem(slot);
        if (item?.typeId !== typeId) continue;
        if (item.amount <= 1) container.setItem(slot, undefined);
        else { item.amount -= 1; container.setItem(slot, item); }
        return true;
    }
    return false;
}

function heal(player, amount, cleanse = false) {
    const health = player.getComponent("minecraft:health");
    if (!health) return false;
    const maximum = Number(health.effectiveMax ?? health.defaultValue ?? 20);
    health.setCurrentValue(Math.min(maximum, Number(health.currentValue || 0) + amount));
    if (cleanse) {
        for (const effect of ["poison", "wither", "nausea", "weakness", "slowness"]) {
            try { player.removeEffect(effect); } catch {}
        }
    }
    try { player.playSound("random.orb", { volume: 0.8, pitch: cleanse ? 1.35 : 1.05 }); } catch {}
    return true;
}

function treat(player, station, typeId, amount, cleanse, label) {
    if (!station?.isValid() || distance(player.location, station.location) > 2.5) {
        player.sendMessage("§c请靠近医疗站后再进行治疗。");
        return;
    }
    const container = player.getComponent("minecraft:inventory")?.container;
    if (!container || countItem(container, typeId) < 1) {
        player.sendMessage(`§c医疗站需要 1 个${label}。`);
        return;
    }
    const health = player.getComponent("minecraft:health");
    const maximum = Number(health?.effectiveMax ?? health?.defaultValue ?? 20);
    if (!cleanse && Number(health?.currentValue || maximum) >= maximum) {
        player.sendMessage("§e当前生命值已满，未消耗医疗品。");
        return;
    }
    if (!consumeItem(container, typeId) || !heal(player, amount, cleanse)) return;
    player.sendMessage(`§a[医疗站] 已使用${label}${cleanse ? "，完成全面救治与异常状态清除" : `，恢复 ${amount} 点生命`}。`);
}

export class MedicalStation {
    static handleInteraction(player, target) {
        if (target?.typeId !== STATION_ID) return false;
        if (distance(player.location, target.location) > 2.5) {
            player.sendMessage("§c请站到医疗站旁边再使用。");
            return true;
        }
        const container = player.getComponent("minecraft:inventory")?.container;
        const bandages = container ? countItem(container, "ab_ve:bandage") : 0;
        const kits = container ? countItem(container, "ab_ve:first_aid") : 0;
        const health = player.getComponent("minecraft:health");
        const current = Math.ceil(Number(health?.currentValue || 0));
        const maximum = Math.ceil(Number(health?.effectiveMax ?? health?.defaultValue ?? 20));
        const form = new ActionFormData().title("§l§a联盟医疗站")
            .body(`§7生命：§c${current}§7 / §a${maximum}\n§7医疗物资：绷带 ${bandages} · 急救包 ${kits}\n\n§8医疗站不会免费生成药品。`)
            .button("§f包扎治疗\n§8消耗绷带 ×1 · 恢复 8 点", "textures/items/medic/bandage")
            .button("§a全面救治\n§8消耗急救包 ×1 · 回满并解毒", "textures/items/medic/first_aid")
            .button("§8离开");
        system.run(() => form.show(player).then(result => {
            if (result.canceled) return;
            if (result.selection === 0) treat(player, target, "ab_ve:bandage", 8, false, "无菌绷带");
            if (result.selection === 1) treat(player, target, "ab_ve:first_aid", 1000000, true, "战术急救包");
        }).catch(() => {}));
        return true;
    }
}
