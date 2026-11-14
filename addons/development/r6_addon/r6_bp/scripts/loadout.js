// R6 Siege Bedrock - operator loadouts, ammo bookkeeping & item factories
import { ItemStack, EquipmentSlot, system } from "@minecraft/server";
import { State, ps, TAGS, TAGS as _T } from "./state.js";
import { Config } from "./config.js";
import { WEAPONS, OPERATORS, GADGETS } from "./data/registry.js";
import { applySpeedEffect, clearCombatEffects } from "./dbno.js";
import {
    clearInventory, setSlot, itemStack, setMainhand, playerName, msg, safe, mainhand, sound,
} from "./util.js";

export function operatorOf(st) {
    if (!st?.operatorId) return undefined;
    return OPERATORS.find(o => o.id === st.operatorId);
}

export function gadgetDef(gid) {
    return GADGETS[gid];
}

export function makeGunItem(weaponId, mag) {
    const w = WEAPONS[weaponId];
    if (!w) return undefined;
    const stack = safe(() => new ItemStack("r6:" + weaponId, 1));
    if (!stack) return undefined;
    if (w.shield) return stack;
    const durability = safe(() => stack.getComponent("minecraft:durability"));
    if (durability) {
        durability.damage = Math.max(0, (w.maxDurability ?? w.mag + 1) - Math.max(1, mag));
    }
    return stack;
}

export function syncAmmoBar(player, weaponId) {
    const st = ps(player);
    const w = WEAPONS[weaponId];
    if (!st || !w || w.shield) return;
    const ammo = st.ammo?.[weaponId];
    if (!ammo) return;
    const item = mainhand(player);
    if (!item || item.typeId !== "r6:" + weaponId) return;
    const durability = safe(() => item.getComponent("minecraft:durability"));
    if (!durability) return;
    durability.damage = Math.max(0, (w.maxDurability ?? w.mag + 1) - Math.max(1, ammo.mag));
    safe(() => player.getComponent("minecraft:equippable")
        ?.setEquipment(EquipmentSlot.Mainhand, item));
}

export function makeKnife() {
    const stack = itemStack("minecraft:diamond_sword", 1);
    if (!stack) return undefined;
    safe(() => { stack.nameTag = "§7战术匕首"; });
    safe(() => stack.setLore(["§8近战 / 破门辅助"]));
    return stack;
}

export const Loadout = {
    /** choose operator; returns error string or null */
    selectOperator(player, operatorId, team, taken = []) {
        const st = ps(player);
        if (!st) return "你不在对局中";
        const op = OPERATORS.find(o => o.id === operatorId);
        if (!op) return "未知干员";
        const side = st.side;
        const opSide = op.side;
        if (side && opSide !== side) return `该干员属于${opSide === "attacker" ? "进攻方" : "防守方"}`;
        if (taken.includes(operatorId)) return "该干员已被队友选择";
        st.operatorId = operatorId;
        st.armor = op.armor;
        st.speed = op.speed;
        st.gadgetId = op.gadget;
        msg(player, `§a已选择干员 §f${op.name} §7(${op.cn}) §8- ${GADGETS[op.gadget]?.name ?? ""}`);
        applySpeedEffect(player, st);
        return null;
    },

    summonItemById(player, slot, itemId, count = 1) {
        const stack = itemStack(itemId, count);
        if (stack) setSlot(player, slot, stack);
        return stack;
    },

    /** full round loadout: primary, secondary, gadget, defuser, reinforcements, knife */
    grant(player) {
        const st = ps(player);
        if (!st) return;
        clearInventory(player);
        const op = operatorOf(st);
        if (!op) return;
        st.plate = 0;
        st.ammo = {};
        st.charges = {};
        st.cooldowns = {};
        st.gadgetId = op.gadget;
        st.bloom = 0;

        const primaryId = op.primaries[0];
        const secondaryId = op.secondary;
        const primarySlots = [0, 5, 6];
        op.primaries.forEach((wid, index) => {
            const w = WEAPONS[wid];
            if (!w) return;
            if (!w.shield) {
                st.ammo[wid] = { mag: w.mag, reserve: (w.reserve ?? 4) * w.mag };
            }
            const item = makeGunItem(wid, w.mag);
            if (item) setSlot(player, primarySlots[index] ?? 6, item);
        });
        const secondary = WEAPONS[secondaryId];
        if (secondary) {
            if (!secondary.shield) {
                st.ammo[secondaryId] = { mag: secondary.mag, reserve: (secondary.reserve ?? 4) * secondary.mag };
            }
            const item = makeGunItem(secondaryId, secondary.mag);
            if (item) setSlot(player, 1, item);
        }
        // operator gadget
        const gadget = GADGETS[op.gadget];
        if (gadget) {
            setSlot(player, 2, itemStack(gadget.item, 1));
            st.charges[op.gadget] = gadget.charges;
            st.cooldowns[op.gadget] = 0;
        }
        // defuser (plant / defuse)
        setSlot(player, 3, itemStack("r6:defuser", 1));
        // defenders get two reinforcements and two wooden barricades
        if (st.side === "defender") {
            setSlot(player, 4, itemStack("r6:gadget_reinforce", 1));
            st.charges["gadget_reinforce"] = 2;
            st.cooldowns["gadget_reinforce"] = 0;
            setSlot(player, 6, itemStack("r6:gadget_barricade", 1));
            st.charges["gadget_barricade"] = 2;
            st.cooldowns["gadget_barricade"] = 0;
        }
        // knife
        const knife = makeKnife();
        if (knife) setSlot(player, 8, knife);
        // R6 tactical tablet (main menu)
        setSlot(player, 7, itemStack("r6:tablet", 1));
        safe(() => { player.selectedSlotIndex = 0; });

        clearCombatEffects(player);
        applySpeedEffect(player, st);
        // vanilla mitigation so external damage cannot bypass the R6 HP model
        safe(() => player.addEffect("resistance", 20 * 900, { amplifier: 4, showParticles: false }));
        try {
            const health = player.getComponent("minecraft:health");
            if (health) health.setCurrentValue(health.effectiveMax ?? 20);
        } catch { }
        safe(() => player.setGameMode("adventure"));
        sound(player, "r6.weapon_draw", 0.45, 1.0);
        msg(player, `§8[§bR6§8] §7干员 §f${op.name} §7| §7主武器 §f${WEAPONS[primaryId]?.name ?? "-"} §7| 技能 §f${gadget?.name ?? "-"}`);
    },

    grantReinforcement(player) {
        const st = ps(player);
        if (!st) return;
        if ((st.charges["gadget_reinforce"] ?? 0) <= 0) return;
        st.charges["gadget_reinforce"] -= 1;
        const item = itemStack("r6:gadget_reinforce", 1);
        if (item) setSlot(player, 4, item);
    },

    hasGadgetCharges(st, gid) {
        const def = GADGETS[gid];
        if (!def) return false;
        if (def.charges === 0) return true;
        return (st.charges?.[gid] ?? 0) > 0;
    },

    consumeGadget(st, gid) {
        const def = GADGETS[gid];
        if (!def) return false;
        if (def.charges === 0) return true;
        if ((st.charges?.[gid] ?? 0) <= 0) return false;
        st.charges[gid] -= 1;
        return true;
    },

    cooldownRemaining(st, gid) {
        const until = st.cooldowns?.[gid] ?? 0;
        return Math.max(0, until - system.currentTick);
    },

    setCooldown(st, gid) {
        const def = GADGETS[gid];
        if (def?.cooldown) st.cooldowns[gid] = system.currentTick + def.cooldown * 20;
    },

    /** refresh the visual gadget item (charges left) */
    refreshGadgetSlot(player) {
        const st = ps(player);
        const op = operatorOf(st);
        if (!st || !op) return;
        const def = GADGETS[op.gadget];
        if (!def) return;
        const left = st.charges?.[op.gadget] ?? 0;
        if (def.charges > 0 && left <= 0) {
            setSlot(player, 2, undefined);
        } else {
            setSlot(player, 2, itemStack(def.item, 1));
        }
        if (st.side === "defender") {
            const rleft = st.charges?.["gadget_reinforce"] ?? 0;
            if (rleft <= 0) setSlot(player, 4, undefined);
            else setSlot(player, 4, itemStack("r6:gadget_reinforce", 1));
            const bleft = st.charges?.["gadget_barricade"] ?? 0;
            if (bleft <= 0) setSlot(player, 6, undefined);
            else setSlot(player, 6, itemStack("r6:gadget_barricade", 1));
        }
    },
};
