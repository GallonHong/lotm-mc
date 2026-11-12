import { world, system } from "@minecraft/server";
import { ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { WeeklyRaidManager } from "./manager.js";
import { WeeklyRewards } from "./rewards.js";
import { WEEKLY_BOSSES, WEEKLY_TIERS, WEEKLY_TIER_ORDER } from "./config.js";
import { inspectWeeklyMap, installWeeklyMap, resetWeeklyMap } from "./maps.js";

const requests = new Map();
const normalize = value => String(value || "").trim().toLowerCase();
const online = name => world.getAllPlayers().find(p => normalize(p.name) === normalize(name));
const tell = (p, message) => { try { p.sendMessage(`§6[围剿周本] §r${message}`); } catch {} };
const roster = room => (room?.members || []).filter(member => member.status !== "left");
function valid(player) {
 try { return !!player && (typeof player.isValid === "function" ? player.isValid() : player.isValid !== false); }
 catch { return false; }
}
function accessible(player) {
 try { return valid(player) && !["pvp:participant", "pvp:admission", "extract:admission", "apoc_extraction_active", "daily_in_dungeon"].some(tag => player.hasTag(tag)); }
 catch { return false; }
}
function admin(player) {
 try { return player.hasTag("admin") || (typeof player.isOp === "function" && player.isOp()); }
 catch { return false; }
}
function busy(value) {
 return /user\s*busy/i.test(String(value?.cancelationReason || value?.cancellationReason || value?.message || value || ""));
}
function context(player) {
 const room = WeeklyRaidManager.getPlayerRoom(player);
 return `${player.dimension.id}|${room?.session || ""}|${room?.state || ""}`;
}
// Never replay an old confirmation after a newer menu, room replacement,
// teleport to another dimension, explicit Close, or admission into another mode.
function show(player, form, callback, guard = () => true) {
 if (!accessible(player)) return;
 const request = { context: context(player) };
 requests.set(player.id, request);
 const current = () => accessible(player) && requests.get(player.id) === request && context(player) === request.context && guard();
 const attempt = count => system.runTimeout(() => {
  if (!current()) { if (requests.get(player.id) === request) requests.delete(player.id); return; }
  Promise.resolve().then(() => form.show(player)).then(response => {
   if (!current()) { if (requests.get(player.id) === request) requests.delete(player.id); return; }
   if (response.canceled) {
    if (busy(response) && count < 8) return attempt(count + 1);
    requests.delete(player.id);
    return;
   }
   system.run(() => {
    if (!current()) return;
    requests.delete(player.id);
    Promise.resolve().then(() => callback(response)).catch(error => tell(player, `§c操作未完成：${error?.message || error}`));
   });
  }).catch(error => {
   if (!current()) return;
   if (busy(error) && count < 8) return attempt(count + 1);
   requests.delete(player.id);
   tell(player, "§c周本菜单未能打开，请关闭其他界面后重试。");
   console.warn(`[WeeklyMenu] ${error}`);
  });
 }, count === 0 ? 3 : 5);
 attempt(0);
}
function perform(player, operation, onDone) {
 const result = operation();
 tell(player, `${result?.ok ? "§a" : "§c"}${result?.message || "操作未完成，请重试。"}`);
 onDone?.(result);
 return result;
}
function currentRoom(id, session) {
 return WeeklyRaidManager.listRooms().find(room => room.id === id && room.session === session) || null;
}
function progressText(player, bossId) {
 const progress = WeeklyRewards.getProgress(player, bossId);
 return `§e本周最高：${WEEKLY_TIERS[progress.highestTier]?.name || "未通关"}` +
  (progress.pending ? ` §6· 有 ${progress.pending} 项奖励待发放` : "") +
  (progress.needsReview ? "\n§c有奖励发放记录需要管理员核对，请勿重复领取。" : "");
}
function partyOf(player, rawPayload) {
 let data;
 try { data = typeof rawPayload === "string" ? JSON.parse(rawPayload) : rawPayload; } catch { return null; }
 if (!data || !Array.isArray(data.members) || typeof data.teamId !== "string" || !/^team_[a-z0-9_]+$/i.test(data.teamId)) return null;
 if (normalize(data.leader) !== normalize(player.name)) return null;
 const suffix = data.teamId.replace(/[^a-z0-9_]/gi, "").slice(-24);
 const tag = `sapi_team_${suffix}`, leaderTag = `sapi_party_leader:${suffix}`;
 if (!player.hasTag(tag) || !player.hasTag(leaderTag)) return null;
 const names = [...new Map(data.members.filter(name => typeof name === "string").map(name => [normalize(name), name])).values()];
 if (!names.length || names.length > 8 || !names.some(name => normalize(name) === normalize(player.name))) return null;
 // A script-event string cannot supply party membership or leader authority.
 if (names.some(name => { const member = online(name); return !member || !member.hasTag(tag); })) return null;
 return { teamId: data.teamId, leader: player.name, members: names, tag, leaderTag };
}
function partyStillValid(leader, party, target = null) {
 if (!valid(leader) || !leader.hasTag(party.tag) || !leader.hasTag(party.leaderTag)) return false;
 return !target || (valid(target) && party.members.some(name => normalize(name) === normalize(target.name)) && target.hasTag(party.tag));
}

export class WeeklyMenu {
 static open(player, onBack = null) {
  if (!accessible(player)) return tell(player, "§c请先退出其他战斗玩法，再打开周本。");
  const room = WeeklyRaidManager.getPlayerRoom(player);
  if (room) return this.openRoom(player, room, onBack);
  this.openSelection(player, null, onBack);
 }

 static openTeam(player, payload, onBack = null) {
  if (!accessible(player)) return tell(player, "§c请先退出其他战斗玩法，再打开周本。");
  const room = WeeklyRaidManager.getPlayerRoom(player);
  if (room) return this.openRoom(player, room, onBack);
  const party = partyOf(player, payload);
  if (!party) {
   tell(player, "§e队伍信息已失效，请由当前队长从服务器战斗菜单重新发起；也可以自行创建或加入周本房间。");
   return this.open(player, onBack);
  }
  this.openSelection(player, party, onBack);
 }

 static openSelection(player, party, onBack) {
  const actions = [];
  const form = new ActionFormData().title("§l§5围剿顶级突变体 · 周本")
   .body("§e独立周本房间支持 1–8 人，不占用 PvP 房间。\n§e加入后每人点击准备，由房主开始。使用自己的装备、弹药和耐久。\n§7每周一 04:00（UTC+8）刷新；同一首领升级难度只补本周奖励差额。" +
    (party ? `\n\n§a当前队伍：${party.members.join("、")}\n§7创建后逐人邀请，接受并准备才可入场。` : ""));
  const add = (label, action, icon = "textures/ui/warning_alex") => { form.button(label, icon); actions.push(action); };
  for (const boss of Object.values(WEEKLY_BOSSES)) {
   const room = WeeklyRaidManager.listRooms().find(value => value.bossId === boss.id);
   const map = inspectWeeklyMap(boss.id);
   const state = room ? (room.state === "lobby" ? `§a候场 ${roster(room).length}/8 · ${WEEKLY_TIERS[room.tier]?.name}` : "§c正在挑战") : (map.installed ? "§a可创建房间" : "§6管理员尚未安装地图");
   add(`§l§5${boss.name}\n§r${state}`, () => this.openBoss(player, boss.id, party, onBack));
  }
  add("§6领取待发放周奖励", () => {
   const result = WeeklyRewards.claimPending(player);
   tell(player, result.needsReview ? "§c管理员需核对未完成发奖记录。" : `§a已发放 ${result.delivered || 0} 项，剩余 ${result.pending || 0} 项。请保持背包有空位。`);
   this.openSelection(player, party, onBack);
  }, "textures/ui/gift_square");
  if (admin(player)) add("§6管理员：周本地图安装/重置", () => this.openMaps(player, onBack), "textures/ui/op");
  add("§8返回战斗玩法", () => onBack?.(), "textures/ui/undo");
  show(player, form, response => actions[response.selection]?.());
 }

 static openBoss(player, bossId, party, onBack) {
  const own = WeeklyRaidManager.getPlayerRoom(player);
  if (own) return this.openRoom(player, own, onBack);
  const boss = WEEKLY_BOSSES[bossId];
  if (!boss) return this.open(player, onBack);
  const room = WeeklyRaidManager.listRooms().find(value => value.bossId === bossId);
  const actions = [];
  const form = new ActionFormData().title(`§l§5${boss.name}`)
   .body(`§7${boss.description}\n§e生命：${boss.hp.toLocaleString()}（各难度不变）\n${progressText(player, bossId)}\n\n§e普通/困难/噩梦/地狱：护甲 0/10/20/40，奖励 1/2/4/8 倍。\n§7已领取的周奖励不会重复发放。`);
  const add = (label, action) => { form.button(label); actions.push(action); };
  if (room) {
   const { id, session } = room;
   if (room.state === "lobby") add(`§a加入 ${room.leader} 的房间\n${WEEKLY_TIERS[room.tier]?.name} · ${roster(room).length}/8`, () => {
    if (!currentRoom(id, session)) { tell(player, "§e房间已变化，请重新选择。"); return this.openBoss(player, bossId, party, onBack); }
    perform(player, () => WeeklyRaidManager.joinRoom(player, id, session), () => this.open(player, onBack));
   });
   else add("§8本场正在挑战 · 刷新状态", () => this.openBoss(player, bossId, party, onBack));
  } else {
   for (const tier of WEEKLY_TIER_ORDER) {
    const difficulty = WEEKLY_TIERS[tier];
    add(`§e${difficulty.name} · 护甲 ${difficulty.armor} · ${difficulty.multiplier} 倍奖励`, () => this.confirmCreate(player, bossId, tier, party, onBack));
   }
  }
  add("§8返回周本列表", () => this.openSelection(player, party, onBack));
  show(player, form, response => actions[response.selection]?.());
 }

 static confirmCreate(player, bossId, tier, party, onBack) {
  const boss = WEEKLY_BOSSES[bossId], difficulty = WEEKLY_TIERS[tier];
  if (!boss || !difficulty) return;
  const materials = boss.materials.map(item => `${item.name} ×${item.amount * difficulty.multiplier}`).join("\n");
  const blueprints = boss.blueprints.map((item, index) => `${item.name} ${Math.round(difficulty.blueprintChances[index] * 100)}%`).join(" · ");
  const form = new MessageFormData().title(`§l${boss.name} · ${difficulty.name}`)
   .body(`§e首领生命：${boss.hp} · 护甲：${difficulty.armor}\n§e本难度周奖励总额：金币 ${boss.baseGold * difficulty.multiplier}\n${materials}\n§e蓝图概率：${blueprints}\n\n${progressText(player, bossId)}\n§7升级只补差额，重复通关不重复发奖。\n§7创建房间不会自动开始。独立房间最多 8 人，房主也必须准备。${party ? "\n§a同时邀请已验证的现有队员，自行接受加入。" : ""}`)
   .button1("§a创建候场房间").button2("§8返回");
  show(player, form, response => {
   if (response.selection !== 0) return this.openBoss(player, bossId, party, onBack);
   if (party && !partyOf(player, party)) { tell(player, "§c队伍已变化，请由当前队长重新发起。"); return this.open(player, onBack); }
   const result = perform(player, () => WeeklyRaidManager.createRoom(player, bossId, tier));
   if (result?.ok && result.room && party) this.inviteParty(player, result.room, party);
   this.open(player, onBack);
  });
 }

 static inviteParty(leader, room, party) {
  const { id, session } = room;
  if (!partyOf(leader, party)) return;
  const expires = Date.now() + 60000;
  for (const name of party.members) {
   const member = online(name);
   if (!member || member.id === leader.id || !partyStillValid(leader, party, member) || !accessible(member)) continue;
   const form = new MessageFormData().title("§l§5周本组队邀请")
    .body(`§e${leader.name} 邀请你加入：\n§5${WEEKLY_BOSSES[room.bossId]?.name} · ${WEEKLY_TIERS[room.tier]?.name}\n§7邀请 60 秒内有效。接受仅加入候场，你仍需主动准备。\n§7使用自己的装备、弹药和耐久。`)
    .button1("§a加入候场").button2("§8拒绝");
   const invitationValid = () => {
    const current = currentRoom(id, session);
    return Date.now() <= expires && current?.state === "lobby" && normalize(current.leader) === normalize(leader.name) && partyStillValid(leader, party, member);
   };
   show(member, form, response => {
    if (response.selection !== 0 || !invitationValid()) return;
    perform(member, () => WeeklyRaidManager.joinRoom(member, id, session), result => { if (result?.ok) this.open(member); });
   }, invitationValid);
  }
 }

 static openRoom(player, room, onBack) {
  const { id, session } = room;
  const boss = WEEKLY_BOSSES[room.bossId], difficulty = WEEKLY_TIERS[room.tier];
  const members = roster(room), self = members.find(member => normalize(member.name) === normalize(player.name));
  const leader = normalize(room.leader) === normalize(player.name);
  const wasReady = !!self?.ready;
  const names = members.map(member => `${normalize(member.name) === normalize(room.leader) ? "§6★" : "§7•"} ${member.name} ${!online(member.name) ? "§8离线" : room.state === "lobby" ? (member.ready ? "§a已准备" : "§e未准备") : member.status === "dead" ? "§8已阵亡" : "§a战斗中"}`).join("\n");
  const states = { lobby: "候场", starting: "正在入场", active: "战斗中", finishing: "结算与返回中" };
  const actions = [];
  const form = new ActionFormData().title(`§l§5${boss?.name || room.bossId} · ${states[room.state] || room.state}`)
   .body(`§e${difficulty?.name} · 护甲 ${difficulty?.armor} · ${difficulty?.multiplier} 倍奖励\n§e人数 ${members.length}/8\n${names}\n\n§7${room.state === "lobby" ? "全员准备后由房主开始。任何人可从战斗玩法加入。" : "真正死亡后等待队友完成；主动退出不结算本局奖励。"}`);
  const add = (label, action) => { form.button(label); actions.push(action); };
  const current = () => {
   const value = WeeklyRaidManager.getPlayerRoom(player);
   return value?.id === id && value?.session === session;
  };
  if (room.state === "lobby") {
   add(wasReady ? "§e取消准备" : "§a我已准备", () => perform(player, () => WeeklyRaidManager.setReady(player, !wasReady, session), () => this.open(player, onBack)));
   if (leader) add("§c开始围剿（须全员准备）", () => perform(player, () => WeeklyRaidManager.startRoom(player, session), () => this.open(player, onBack)));
  }
  add("§b刷新房间状态", () => this.open(player, onBack));
  add(room.state === "lobby" ? "§c退出候场" : "§c退出本局（放弃奖励）", () => this.confirmLeave(player, room, onBack));
  if (["lobby", "active"].includes(room.state) && self?.status !== "dead") {
   add("§b战术无人机 · 召唤/收回", () => this.openDroneMenu(player, id, session));
  }
  add("§8关闭菜单", () => {});
  show(player, form, response => actions[response.selection]?.(), current);
 }

 static openDroneMenu(player, roomId, session) {
  const room = WeeklyRaidManager.getPlayerRoom(player);
  const member = room?.members.find(value => normalize(value.name) === normalize(player.name));
  if (!accessible(player) || room?.id !== roomId || room?.session !== session ||
      !["lobby", "active"].includes(room.state) || member?.status === "dead") return;
  // Exact drone menu only. No generic SAPI dispatcher or activity-lock bypass.
  system.runTimeout(() => {
   const current = WeeklyRaidManager.getPlayerRoom(player);
   if (!accessible(player) || current?.session !== session || !["lobby", "active"].includes(current.state) ||
       current.members.find(value => normalize(value.name) === normalize(player.name))?.status === "dead") return;
   try {
    const envelope = `__sapi_player__=${encodeURIComponent(player.name)}&data=`;
    player.runCommand(`scriptevent drone:open_hangar ${envelope}`);
   } catch { tell(player, "§c无人机菜单未打开，请确认 Apocalypse Life 行为包已启用。"); }
  }, 3);
 }

 static confirmLeave(player, room, onBack) {
  const { id, session } = room;
  const form = new MessageFormData().title("§l§c退出周本")
   .body(room.state === "lobby" ? "§e退出当前候场房间？房主离开后会把房主交给下一位成员。" : "§c主动退出不结算本局奖励，并返回入场前位置。确定继续？")
   .button1("§c确认退出").button2("§8返回");
  show(player, form, response => {
   if (response.selection === 0) perform(player, () => WeeklyRaidManager.leaveRoom(player));
   this.open(player, onBack);
  }, () => { const own = WeeklyRaidManager.getPlayerRoom(player); return own?.id === id && own?.session === session; });
 }

 static openMaps(player, onBack = null) {
  if (!admin(player)) return;
  const actions = [], form = new ActionFormData().title("§l§6周本地图管理")
   .body("§c安装/重置会覆盖专用区域内的方块和建筑。请先备份世界，查看并确认准确坐标。\n§7有候场/战斗房间或区域内有玩家时拒绝施工。不会自动安装地图。");
  for (const boss of Object.values(WEEKLY_BOSSES)) {
   const info = inspectWeeklyMap(boss.id);
   form.button(`§e${boss.name}\n${info.busy ? "§6施工中" : info.installed ? "§a已安装 · 查看/重置" : "§c未安装"}`);
   actions.push(() => this.confirmMap(player, boss.id, onBack));
  }
  form.button("§8返回周本列表"); actions.push(() => this.open(player, onBack));
  show(player, form, response => actions[response.selection]?.(), () => admin(player));
 }

 static confirmMap(player, bossId, onBack) {
  if (!admin(player)) return;
  const info = inspectWeeklyMap(bossId);
  const reset = info.installed;
  const form = new MessageFormData().title(`§l§c${reset ? "重置" : "安装"}${WEEKLY_BOSSES[bossId].name}地图`)
   .body(`${info.warning}\n\n§e尺寸：${info.size.x}×${info.size.y}×${info.size.z}\n§c确认即授权覆盖上面列出的专用区域。`)
   .button1(`§c确认${reset ? "重置" : "安装"}`).button2("§8取消");
  show(player, form, async response => {
   if (response.selection !== 0) return this.openMaps(player, onBack);
   // Keep the exact inspected fingerprint. A configuration change requires a new confirmation.
   const latest = inspectWeeklyMap(bossId);
   if (latest.confirmation !== info.confirmation || latest.installed !== info.installed) {
    tell(player, "§c地图配置或安装状态已变化，请重新查看坐标并确认。"); return this.openMaps(player, onBack);
   }
   if (!WeeklyRaidManager.canInstall(bossId)) { tell(player, "§c该周本仍有房间，请全部退出后再施工。"); return; }
   const options = { player, canInstall: id => WeeklyRaidManager.canInstall(id) };
   tell(player, `§e正在${reset ? "重置" : "安装"}地图，请等待结果。`);
   try {
    if (reset) await resetWeeklyMap(bossId, options);
    else await installWeeklyMap(bossId, { ...options, confirmation: info.confirmation });
    tell(player, "§a地图处理完成。");
   } catch (error) { tell(player, `§c地图未完成：${error?.message || error}`); }
   if (valid(player)) this.openMaps(player, onBack);
  }, () => admin(player));
 }
}
