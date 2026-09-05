import { world, system } from "@minecraft/server";
import { Integration } from "./integration.js";
import { WantedManager } from "./wanted.js";
import { Utils } from "../utils.js";

const TEAM_PREFIX = "sapi_team_";

function teamTag(player) {
    try { return player.getTags().find(tag => tag.startsWith(TEAM_PREFIX)) || ""; }
    catch { return ""; }
}

function attackingPlayer(source) {
    const direct = source?.damagingEntity;
    if (direct?.typeId === "minecraft:player") return direct;
    try {
        const owner = direct?.getComponent("minecraft:projectile")?.owner || source?.damagingProjectile?.getComponent("minecraft:projectile")?.owner;
        return owner?.typeId === "minecraft:player" ? owner : null;
    } catch { return null; }
}

export class CombatManager {
    static crimeTicks = new Map();
    static lastCriminalHit = new Map();

    static areTeammates(left, right) {
        if (!left || !right || left.id === right.id) return false;
        const tag = teamTag(left);
        return !!tag && tag === teamTag(right);
    }

    static recordProtectedAttack(attacker, victim) {
        if (!attacker || !victim || Utils.isAdmin(attacker)) return;
        const zoneA = Integration.resolveCurrentZone(attacker.dimension.id, attacker.location);
        const zoneV = Integration.resolveCurrentZone(victim.dimension.id, victim.location);
        const protectedType = zoneA.type === "safe" || zoneV.type === "safe" ? "safe"
            : zoneA.type === "law" || zoneV.type === "law" ? "law" : "";
        if (!protectedType) return;
        const key = `${attacker.id}:${victim.id}`;
        const last = Number(this.crimeTicks.get(key) ?? -1000);
        if (system.currentTick - last < 20) return;
        this.crimeTicks.set(key, system.currentTick);
        this.lastCriminalHit.set(victim.id, { attackerName: attacker.name, tick: system.currentTick, type: protectedType });
        WantedManager.addPoints(attacker, protectedType === "safe" ? 3 : 2, protectedType === "safe" ? "安全区攻击玩家" : "法制区攻击玩家");
    }

    static registerEvents() {
        const hurt = world.beforeEvents?.entityHurt;
        if (hurt?.subscribe) hurt.subscribe(event => {
            const victim = event.hurtEntity;
            const attacker = attackingPlayer(event.damageSource);
            if (victim?.typeId !== "minecraft:player" || !attacker) return;
            if (this.areTeammates(attacker, victim)) {
                event.cancel = true;
                return;
            }
            this.recordProtectedAttack(attacker, victim);
        });
        system.runInterval(() => {
            for (const [key, tick] of this.crimeTicks) if (system.currentTick - Number(tick) > 200) this.crimeTicks.delete(key);
            for (const [key, hit] of this.lastCriminalHit) if (system.currentTick - Number(hit.tick) > 400) this.lastCriminalHit.delete(key);
        }, 200);
    }

    static onPlayerDeath(player) {
        const hit = this.lastCriminalHit.get(player?.id);
        if (!hit || system.currentTick - Number(hit.tick) > 200) return;
        WantedManager.addPoints(hit.attackerName, 10, `${hit.type === "safe" ? "安全区" : "法制区"}击杀玩家`);
        this.lastCriminalHit.delete(player.id);
    }
}
