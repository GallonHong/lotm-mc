import { GUNS } from '../data/guns.js';

// Server events -> client player signal -> public owner variables -> attachable.
// No inventory, damage, use-state, camera or BP minecraft:player changes.
const GUN_KEYS = new Map(GUNS.map((gun, index) => [gun.id, index + 1]));
const CONTROLLER = 'tg3d_action_signal';
const phases = new Map();
const shots = new Map();
let warned = false;

function signal(player, gun, kind, durationSeconds) {
 try {
  if (typeof player?.playAnimation !== 'function') throw new Error('playAnimation unavailable');
  const key = gun ? GUN_KEYS.get(gun.id) : 0;
  if (gun && !key) return;
  const seconds = Math.max(0.05, Number(durationSeconds) || 0.05);
  const interrupted = gun
   ? `!query.is_item_name_any('slot.weapon.mainhand', 0, '${gun.id}') || `
   : '';
  // stopExpression is evaluated on the player by the temporary controller.
  // Explicit return matters: a Molang statement list otherwise returns zero.
  if (kind === 1) shots.set(player.id, (shots.get(player.id) || 0) + 1);
  const expression = [
   `variable.tg3d_shot = ${shots.get(player.id) || 0};`,
   `temp.tg3d_done = ${kind === 0 ? '1' : `${interrupted}query.state_time >= ${seconds.toFixed(4)}`};`,
   `variable.tg3d_kind = temp.tg3d_done ? 0 : ${kind};`,
   `variable.tg3d_gun = temp.tg3d_done ? 0 : ${key || 0};`,
   `variable.tg3d_progress = temp.tg3d_done ? 0 : math.clamp(query.state_time / ${seconds.toFixed(4)}, 0, 1);`,
   'variable.tg3d_stamp = query.life_time;',
   'return temp.tg3d_done;',
  ].join(' ');
  // Do not rely on identical active animation IDs restarting state_time.
  const phase = phases.get(player.id) === 'a' ? 'b' : 'a';
  phases.set(player.id, phase);
  player.playAnimation(`animation.tg3d.signal_${phase}`, {
   controller: CONTROLLER,
   blendOutTime: 0,
   stopExpression: expression,
  });
 } catch (error) {
  if (!warned) {
   warned = true;
   console.warn(`[TG3D visuals] signal unavailable; gameplay unaffected: ${String(error)}`);
  }
 }
}

export const GunVisuals = {
 clearPlayer(playerId) {
  phases.delete(playerId);
  shots.delete(playerId);
 },
 fire(player, gun) {
  signal(player, gun, 1, 0.15);
 },
 reload(player, gun, totalTicks) {
  if (!Number.isFinite(totalTicks) || totalTicks <= 0) return;
  signal(player, gun, 2, totalTicks / 20);
 },
 reset(player) {
  signal(player, undefined, 0, 0.05);
 },
};
