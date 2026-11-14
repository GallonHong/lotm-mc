// R6 Siege Bedrock - angular dispersion & spray heat
//
// Ported 1:1 from Test Guns 2D (`feature/utils/spreadUtils.js` +
// `feature/recoilManager.js`): per-player spray heat, stance stability and a
// uniform-disk sample inside an aim-local ellipse. No camera/entity mutation.
import { nowTick, safe } from "../util.js";

const DEG = Math.PI / 180;
/** playerId -> { count, lastTick, weaponId } */
const sprayHeat = new Map();

export function resetSpray(playerId) {
    sprayHeat.delete(playerId);
}

export function resetAllSpray() {
    sprayHeat.clear();
}

/** Each consecutive shot within 12 ticks adds heat (max count 15). */
export function nextSprayState(previous, tick, weaponId) {
    const continued = previous?.weaponId === weaponId && tick >= previous.lastTick
        && tick - previous.lastTick <= 12;
    return {
        count: continued ? Math.min(15, previous.count + 1) : 1,
        lastTick: tick,
        weaponId,
    };
}

/** Convert raw recoil + spray heat + stance into angular limits (degrees). */
export function spreadProfile(rawRecoil, count, stance = {}) {
    const number = Number(rawRecoil);
    const recoil = Number.isFinite(number) && number >= 0 ? number : 0.2;
    const heat = 1 + Math.min(1.2, Math.max(0, count) * 0.12);
    const stability = stance.sneaking ? 0.55 * (stance.mobPants ? 0.65 : 1)
        : stance.sprinting ? 1.4
            : stance.falling || stance.climbing ? 1.6 : 1;
    return {
        pitchDegrees: Math.min(18, recoil * 5.5 * heat * stability),
        yawDegrees: Math.min(12, recoil * 2.9 * heat * stability),
        pelletDegrees: Math.atan(stance.sneaking ? 0.022 : 0.075) / DEG,
    };
}

/** Called once per trigger pull; returns the shot's angular profile. */
export function beginShot(player, weapon) {
    const state = nextSprayState(sprayHeat.get(player.id), nowTick(), weapon.id);
    sprayHeat.set(player.id, state);
    return spreadProfile(weapon.recoil, state.count, {
        sneaking: safe(() => player.isSneaking) === true,
        sprinting: safe(() => player.isSprinting) === true,
        falling: safe(() => player.isFalling) === true,
        climbing: safe(() => player.isClimbing) === true,
    });
}

export function sprayCount(playerId) {
    return sprayHeat.get(playerId)?.count ?? 0;
}

/** Uniform disk inside the aim-local angular ellipse (shotgun pellets add a base cone). */
export function sampleSpreadDirection(direction, profile, pellet = false, random = Math.random) {
    const length = Math.hypot(direction.x, direction.y, direction.z);
    const f = length > 1e-10 && Number.isFinite(length)
        ? { x: direction.x / length, y: direction.y / length, z: direction.z / length }
        : { x: 0, y: 0, z: 1 };
    const horizontal = Math.hypot(f.x, f.z);
    const r = horizontal > 1e-8
        ? { x: f.z / horizontal, y: 0, z: -f.x / horizontal }
        : { x: 1, y: 0, z: 0 };
    const u = {
        x: f.y * r.z - f.z * r.y,
        y: f.z * r.x - f.x * r.z,
        z: f.x * r.y - f.y * r.x,
    };
    // Uniform disk, stretched into an ellipse in the aim-local angular plane.
    // Pellet base cone is combined in quadrature and sampled per pellet.
    const base = pellet ? profile.pelletDegrees : 0;
    const radius = Math.sqrt(Math.max(0, Math.min(1, random())));
    const theta = random() * 2 * Math.PI;
    const yaw = radius * Math.cos(theta) * Math.hypot(profile.yawDegrees, base) * DEG;
    const pitch = radius * Math.sin(theta) * Math.hypot(profile.pitchDegrees, base) * DEG;
    const angle = Math.hypot(yaw, pitch);
    if (angle < 1e-12) return f;
    const s = Math.sin(angle) / angle;
    const c = Math.cos(angle);
    return {
        x: f.x * c + (r.x * yaw + u.x * pitch) * s,
        y: f.y * c + (r.y * yaw + u.y * pitch) * s,
        z: f.z * c + (r.z * yaw + u.z * pitch) * s,
    };
}
