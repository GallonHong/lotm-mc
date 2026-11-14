// R6 Siege Bedrock - DBNO (down but not out), revive, elimination & spectating
import { system, world } from "@minecraft/server";
import { State, ps, TAGS, playerById, matchPlayers } from "./state.js";
import { Config } from "./config.js";
import { killPlayer, eliminate, isCombatPhase, setHealth } from "./damage.js";
import { Hud } from "./hud.js";
import { Setup } from "./setup.js";
import {
    actionBar, msg, sound, particle, setFlag, playerName, dist, safe, title, healthOf,
} from "./util.js";

const INPUT_CATEGORIES = [1, 2, 3, 4, 5];

function lockInputs(player, locked) {
    safe(() => {
        if (!player.inputPermissions) return;
        for (const cat of INPUT_CATEGORIES) {
            safe(() => player.inputPermissions.setPermissionCategory(cat, !locked));
        }
    });
}

export function applySpeedEffect(player, st) {
    safe(() => player.removeEffect("speed"));
    safe(() => player.removeEffect("slowness"));
    if (!st) return;
    if (st.speed >= 3) safe(() => player.addEffect("speed", 20 * 900, { amplifier: 0, showParticles: false }));
    else if (st.speed <= 1) safe(() => player.addEffect("slowness", 20 * 900, { amplifier: 0, showParticles: false }));
}

export function clearCombatEffects(player) {
    for (const eff of ["slowness", "weakness", "blindness", "night_vision", "invisibility",
        "speed", "slow_falling", "mining_fatigue", "nausea", "jump_boost"]) {
        safe(() => player.removeEffect(eff));
    }
}

export function revivePlayer(victim, reviver, reason = "救援") {
    const st = ps(victim);
    if (!st || !st.downed || st.dead) return false;
    st.downed = false;
    st.downTicks = 0;
    st.reviveProgress = 0;
    setFlag(victim, TAGS.down, false);
    setFlag(victim, TAGS.noShoot, false);
    setHealth(victim, 10); // 50 R6S HP
    clearCombatEffects(victim);
    applySpeedEffect(victim, st);
    actionBar(victim, "§a你已被救起！");
    title(victim, "§a已获救", `${reason}`, { stay: 20 });
    sound(victim, "r6.stim", 0.7, 1.3);
    const rst = ps(reviver);
    if (rst && rst.team === st.team && rst.id !== st.id) {
        rst.assists = (rst.assists ?? 0) + 1;
        rst.score = (rst.score ?? 0) + 50;
    }
    Hud.announce(`§a[救援] §f${playerName(reviver)} §7救起了 §f${playerName(victim)}`, "");
    return true;
}

export const Dbno = {
    tick() {
        const match = State.match;
        if (!match) return;
        for (const { player, ps: st } of allMatchPlayers()) {
            if (!st || !st.downed || st.dead) continue;
            if (!isCombatPhase(match) && match.phase !== "prep") continue;
            st.downTicks = Math.max(0, (st.downTicks ?? 0) - 1);
            if (st.downTicks <= 0) {
                const killer = playerById(st.lastAttackerId);
                killPlayer(player, killer, { cause: "bleedout" });
                continue;
            }
            // find a reviver: same team, up, close, sneaking, facing
            let reviver = null;
            for (const { player: mate, ps: mst } of allMatchPlayers()) {
                if (!mst || mst.dead || mst.downed || mate.id === player.id) continue;
                if (mst.team !== st.team) continue;
                if (dist(mate.location, player.location) > 3.2) continue;
                if (!mate.isSneaking) continue;
                reviver = mate;
                break;
            }
            if (reviver) {
                st.reviveProgress = (st.reviveProgress ?? 0) + 1;
                const need = Config.reviveSeconds * 20;
                const pct = Math.min(100, Math.floor((st.reviveProgress / need) * 100));
                actionBar(reviver, `§a救援中 ${"§a|".repeat(Math.floor(pct / 10))}${"§8.".repeat(10 - Math.floor(pct / 10))} §f${pct}%`);
                actionBar(player, `§a队友正在救援 §f${pct}%`);
                if (st.reviveProgress >= need) revivePlayer(player, reviver, "队友救援");
            } else {
                st.reviveProgress = 0;
                if (system.currentTick % 10 === 0) {
                    actionBar(player, `§c倒地 ${Math.ceil(st.downTicks / 20)}s §7| 队友靠近并潜行可救援`);
                }
            }
        }
    },

    /** called from entityDie observer */
    onEntityDie(deadEntity, damageSource) {
        if (!deadEntity || deadEntity.typeId !== "minecraft:player") return;
        const st = ps(deadEntity);
        if (!st || st.dead) return;
        const match = State.match;
        if (!match) return;
        const attacker = damageSource?.damagingEntity;
        if (st.downed) {
            killPlayer(deadEntity, attacker, { cause: "finish" });
        } else if (isCombatPhase(match) || match.phase === "prep") {
            eliminate(deadEntity, "环境死亡");
        }
    },

    /** vanilla/other damage while downed = execution */
    onEntityHurt(hurtEntity, damageSource, damage) {
        if (!hurtEntity || hurtEntity.typeId !== "minecraft:player") return;
        const st = ps(hurtEntity);
        if (!st || st.dead || !st.downed) return;
        const attacker = damageSource?.damagingEntity;
        if (attacker && attacker.id === hurtEntity.id) return;
        if (damage !== undefined && damage < 0.5) return;
        killPlayer(hurtEntity, attacker, { cause: "finish" });
    },

    /** place a recently dead player into the spectator corner */
    onPlayerSpawn(player) {
        const st = ps(player);
        if (!st) return;
        if (st.dead) {
            const match = State.match;
            if (!match) return;
            const point = Setup.spectatorPoint(match);
            safe(() => player.teleport(point, { dimension: world.getDimension("overworld") }));
            safe(() => player.addEffect("invisibility", 20 * 900, { amplifier: 0, showParticles: false }));
            safe(() => player.addEffect("slow_falling", 20 * 900, { amplifier: 3, showParticles: false }));
            safe(() => player.setGameMode("spectator"));
            lockInputs(player, true);
            actionBar(player, "§7你已阵亡，正在观战。");
        } else if (st.downed) {
            // respawned out of a downed state (edge case) -> bring back near death point
            if (st.downLocation) Setup.safeTeleport(player, st.downLocation);
        }
    },

    lockInputs,
    clearCombatEffects,
    applySpeedEffect,

    /** restore a player between rounds / after a match */
    restorePlayer(player) {
        clearCombatEffects(player);
        lockInputs(player, false);
        safe(() => player.setGameMode("adventure"));
        safe(() => player.setHealth?.(20));
        const h = healthOf(player);
        if (h) safe(() => h.setCurrentValue(h.effectiveMax ?? 20));
    },
};

function allMatchPlayers() {
    const out = [];
    for (const p of matchPlayers()) {
        const st = ps(p);
        if (p && st) out.push({ player: p, ps: st });
    }
    return out;
}

export { msg, sound, particle };
