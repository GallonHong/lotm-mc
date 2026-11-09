import { system } from "@minecraft/server";

// Dynamic properties belong to a BP UUID, so never read SAPI's keys from this pack.
const pending = new Map();
const byPlayer = new Map();
let sequence = 0;
export class HopeLotteryBridge {
 static request(player, callback) {
  const previous = byPlayer.get(player.id);
  if (previous) pending.delete(previous);
  const nonce = `hp_${Date.now().toString(36)}_${(++sequence).toString(36)}`;
  const finish = snapshot => {
   if (!pending.has(nonce)) return;
   pending.delete(nonce);
   if (byPlayer.get(player.id) === nonce) byPlayer.delete(player.id);
   callback(snapshot);
  };
  byPlayer.set(player.id, nonce);
  pending.set(nonce, { playerId: player.id, finish });
  system.runTimeout(() => finish(null), 30);
  try { player.runCommand(`scriptevent sapi:hope_lottery_request ${nonce}`); }
  catch { finish(null); }
 }

 static receive(player, message) {
  let packet;
  try { packet = JSON.parse(message); } catch { return false; }
  const request = pending.get(packet?.nonce);
  if (!request || !player || request.playerId !== player.id) return false;
  if (packet.version !== 1 || typeof packet.subtitle !== "string" || typeof packet.body !== "string"
   || packet.subtitle.length > 120 || packet.body.length > 1600) return false;
  request.finish({ subtitle: packet.subtitle, body: packet.body });
  return true;
 }
}
