import { system, world } from "@minecraft/server";

const TARGET_ID = "ab_ve:training_target";
const WINDOW_TICKS = 100;
const samples = new Map();

function attackerPlayer(damageSource) {
    const direct = damageSource?.damagingEntity;
    if (direct?.typeId === "minecraft:player") return direct;
    try {
        const owner = direct?.getComponent("minecraft:projectile")?.owner;
        if (owner?.typeId === "minecraft:player") return owner;
    } catch {}
    return null;
}

function resetHealth(target) {
    system.run(() => {
        try {
            if (!target.isValid()) return;
            const health = target.getComponent("minecraft:health");
            if (health) health.setCurrentValue(health.effectiveMax ?? health.defaultValue ?? 1000000);
        } catch {}
    });
}

export class TrainingTarget {
    static init() {
        const signal = world.afterEvents?.entityHurt;
        if (!signal || typeof signal.subscribe !== "function") return;
        try { signal.subscribe(event => this.handleHurt(event)); }
        catch (error) { console.warn(`[ApocalypseLife] training target listener failed: ${error}`); }
        system.runInterval(() => {
            const now = system.currentTick;
            for (const [key, recent] of samples) {
                if (!recent.length || now - recent[recent.length - 1].tick > WINDOW_TICKS * 2) samples.delete(key);
            }
        }, 200);
    }

    static handleHurt(event) {
        const target = event.hurtEntity;
        if (target?.typeId !== TARGET_ID) return;
        resetHealth(target);
        const player = attackerPlayer(event.damageSource);
        const damage = Math.max(0, Number(event.damage || 0));
        if (!player || damage <= 0) return;
        const key = `${target.id}:${player.id}`;
        const now = system.currentTick;
        const recent = (samples.get(key) || []).filter(sample => now - sample.tick <= WINDOW_TICKS);
        recent.push({ tick: now, damage });
        samples.set(key, recent);
        const total = recent.reduce((sum, sample) => sum + sample.damage, 0);
        const elapsed = Math.max(20, now - recent[0].tick + 1);
        const dps = total / (elapsed / 20);
        target.nameTag = `§l§e枪械训练靶§r\n§f${player.name} §7| 单次 §c${damage.toFixed(1)} §7| 5秒DPS §6${dps.toFixed(1)}`;
    }
}
