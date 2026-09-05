import { world, system } from "@minecraft/server";
import { ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { DungeonManager } from "../dungeons/DungeonManager.js";
import { DUNGEON_TEMPLATES, DUNGEON_SLOTS } from "../dungeons/dungeonTemplates.js";

const ICONS = Object.freeze({
  tutorial: "textures/ui/how_to_play_button_default",
  defense: "textures/ui/icon_shield",
  rescue: "textures/ui/icon_recipe_nature",
  escort: "textures/ui/icon_trailer",
  combat: "textures/ui/warning_alex",
  boss: "textures/ui/warning_alex"
});

function isUserBusy(value) {
  const reason = String(value?.cancelationReason || value?.cancellationReason || value?.message || value || "").toLowerCase();
  return reason.includes("userbusy") || reason.includes("user busy");
}

function show(player, form, callback, attempt = 0) {
  system.runTimeout(() => form.show(player).then(result => {
    if (!result.canceled) return callback(result);
    if (isUserBusy(result) && attempt < 8) return show(player, form, callback, attempt + 1);
  }).catch(error => {
    if (isUserBusy(error) && attempt < 8) return show(player, form, callback, attempt + 1);
    try { player.sendMessage(`§c副本菜单打开失败：${error}`); } catch {}
  }), attempt === 0 ? 3 : 5);
}

function showDecision(player, form, callback, attempt = 0) {
  system.runTimeout(() => form.show(player).then(result => {
    if (isUserBusy(result) && attempt < 8) return showDecision(player, form, callback, attempt + 1);
    callback(result);
  }).catch(error => {
    if (isUserBusy(error) && attempt < 8) return showDecision(player, form, callback, attempt + 1);
    callback({ canceled: true, selection: 1 });
  }), attempt === 0 ? 3 : 5);
}

function onlineByName(name) {
  const normalized = String(name || "").trim().toLowerCase();
  return world.getAllPlayers().find(player => player.name.toLowerCase() === normalized) || null;
}

function alive(player) {
  try {
    const health = player.getComponent("minecraft:health") || player.getComponent("health");
    return !health || Number(health.currentValue) > 0;
  } catch { return true; }
}

export class DungeonMenu {
  static readySessions = new Map();

  static open(player, onBack = null) {
    const own = DungeonManager.playerInstance(player);
    if (own) return this.openCurrent(player, own, onBack);

    const active = DungeonManager.list();
    const actions = [];
    const form = new ActionFormData().title("§l§4生存联盟 · 副本行动")
      .body(`§7副本由多块 DeadZone / RandS Structure 拼接，采用独立场地与个人奖励结算。\n§f运行实例：§e${active.length} §8/ ${DUNGEON_SLOTS.length}`);
    const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
    for (const template of Object.values(DUNGEON_TEMPLATES)) {
      const firstReward = template.oneTimeReward
        ? (DungeonManager.hasCompleted(player, template.id) ? "§8首次奖励已领·可重玩" : "§a首次奖励可领")
        : `§8${template.difficulty}`;
      add(`§l§c${template.name}\n§r${firstReward} §8| ${template.recommendedPlayers}`, ICONS[template.category] || ICONS.combat, () => this.confirmStart(player, template, onBack));
    }
    for (const instance of active) {
      const template = DUNGEON_TEMPLATES[instance.templateId];
      if (!template || instance.participants.length >= template.maxPlayers) continue;
      add(`§l§a加入 ${instance.ownerName} 的队伍\n§r§8${template.name} | ${instance.participants.length}/${template.maxPlayers}`, "textures/ui/FriendsIcon", () => {
        player.sendMessage(DungeonManager.join(player, instance.instanceId) ? "§a已加入副本。" : "§c加入失败：队伍已满、超过加入时间或状态已变化。");
      });
    }
    add("§8返回", "textures/ui/undo", () => onBack?.());
    show(player, form, result => actions[result.selection]?.());
  }

  static confirmStart(player, template, onBack) {
    const rewardText = template.oneTimeReward
      ? (DungeonManager.hasCompleted(player, template.id) ? "首次奖励已领取，本次可重玩但不重复发奖" : "首次通关 2000 元 + §9沙漠之鹰 .50 [优良] 图纸")
      : "按个人贡献独立结算";
    const bossRequirement = template.stages.some(stage => stage.type === "boss") ? "\n§fBoss：§c运行时直接生成 Apocalypse Boss；不再使用心跳阻止创建" : "";
    const form = new MessageFormData().title(`§l${template.name}`)
      .body(`§7${template.description}\n\n§f类型：§e${template.category} §8| §f难度：§e${template.difficulty}\n§f地图：§e${template.structureSize.x}×${template.structureSize.y}×${template.structureSize.z}\n§fStructure：§e${template.structures.length} 个\n§f阶段：§e${template.stages.length}\n§f复活：§e每人 ${template.maxDeathsPerPlayer} 次\n§f限时：§e${Math.floor(template.timeoutTicks / 1200)} 分钟${bossRequirement}\n§f奖励：§e${rewardText}`)
      .button1("§a创建副本")
      .button2("§8返回");
    show(player, form, result => {
      if (result.selection !== 0) return this.open(player, onBack);
      const started = DungeonManager.start(player, template.id);
      if (started?.instanceId) player.sendMessage("§a副本实例创建成功。");
      else player.sendMessage("§c创建失败：你已在副本中或当前没有空闲场地。");
    });
  }

  static openTeam(player, rawPayload, onBack = null) {
    let payload = null;
    try { payload = typeof rawPayload === "string" ? JSON.parse(rawPayload) : rawPayload; } catch {}
    const names = [...new Set((payload?.members || []).map(String).filter(Boolean))].slice(0, 4);
    if (!names.some(name => name.toLowerCase() === player.name.toLowerCase())) names.unshift(player.name);
    if (names.length < 2) return this.open(player, onBack);
    const own = DungeonManager.playerInstance(player);
    if (own) return this.openCurrent(player, own, onBack);
    const actions = [];
    const form = new ActionFormData().title("§l§4队伍副本 · 全员 Ready")
      .body(`§0队长：§e${player.name}\n§0队员：§e${names.join("、")}\n§8选择副本后，其余队员必须在30秒内全部确认。`);
    const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
    for (const template of Object.values(DUNGEON_TEMPLATES)) {
      const firstReward = template.oneTimeReward
        ? (DungeonManager.hasCompleted(player, template.id) ? "§8首次奖励已领·可重玩" : "§a首次奖励可领")
        : `§8${template.difficulty}`;
      add(`§l§c${template.name}\n§r${firstReward} §8| ${template.recommendedPlayers}`, ICONS[template.category] || ICONS.combat, () => this.confirmTeamStart(player, template, names, onBack));
    }
    add("§8返回", "textures/ui/undo", () => onBack?.());
    show(player, form, result => actions[result.selection]?.());
  }

  static confirmTeamStart(leader, template, names, onBack) {
    const form = new MessageFormData().title(`§l${template.name} · 队伍准备`)
      .body(`§0队伍人数：§e${names.length}/${template.maxPlayers}\n§0难度：§e${template.difficulty}\n§0推荐：§e${template.recommendedPlayers}\n§0限时：§e${Math.floor(template.timeoutTicks / 1200)} 分钟\n\n§8确认后向所有队员发送 Ready 请求。全部同意才会统一创建和传送副本。`)
      .button1("§a发起全队准备").button2("§8返回");
    show(leader, form, result => {
      if (result.selection === 0) this.beginTeamReady(leader, template, names, onBack);
      else this.openTeam(leader, { members: names }, onBack);
    });
  }

  static beginTeamReady(leader, template, names, onBack) {
    const players = names.map(onlineByName);
    const offline = names.filter((_, index) => !players[index]);
    if (offline.length) {
      leader.sendMessage(`§c[队伍副本] 以下队员已经离线：${offline.join("、")}`);
      return this.openTeam(leader, { members: names }, onBack);
    }
    if (players.length > Number(template.maxPlayers || 4)) {
      leader.sendMessage(`§c[队伍副本] ${template.name} 最多允许 ${template.maxPlayers} 人。`);
      return this.openTeam(leader, { members: names }, onBack);
    }
    const busy = players.filter(player => DungeonManager.playerInstance(player));
    const dead = players.filter(player => !alive(player));
    if (busy.length || dead.length) {
      leader.sendMessage(`§c[队伍副本] 进入检查失败。副本中：${busy.map(value => value.name).join("、") || "无"}；死亡状态：${dead.map(value => value.name).join("、") || "无"}。`);
      return this.openTeam(leader, { members: names }, onBack);
    }

    const id = `ready_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const session = { id, active: true, leader, template, names, players, ready: new Set([leader.name.toLowerCase()]), onBack };
    this.readySessions.set(id, session);
    leader.sendMessage(`§a[队伍副本] 已发起 ${template.name}，等待 ${players.length - 1} 名队员确认。`);

    for (const member of players) {
      if (member.id === leader.id) continue;
      const form = new MessageFormData().title("§l§4队伍副本准备")
        .body(`§0队长 §e${leader.name} §0准备进入：\n§c${template.name}\n§0难度：§e${template.difficulty}\n§0推荐人数：§e${template.recommendedPlayers}\n\n§8请在30秒内确认。`)
        .button1("§a准备").button2("§c拒绝");
      showDecision(member, form, result => this.receiveReady(id, member, result.selection === 0 && !result.canceled));
    }
    system.runTimeout(() => {
      const current = this.readySessions.get(id);
      if (!current?.active) return;
      this.cancelReady(current, "等待超时，队伍副本已取消。");
    }, 600);
    if (players.length === 1) this.completeReady(session);
  }

  static receiveReady(id, member, accepted) {
    const session = this.readySessions.get(id);
    if (!session?.active) return;
    if (!accepted) return this.cancelReady(session, `${member.name} 拒绝或关闭了准备确认。`);
    session.ready.add(member.name.toLowerCase());
    for (const player of session.players) player.sendMessage(`§a[队伍副本] ${member.name} 已准备（${session.ready.size}/${session.players.length}）。`);
    if (session.ready.size >= session.players.length) this.completeReady(session);
  }

  static completeReady(session) {
    if (!session?.active) return;
    session.active = false;
    this.readySessions.delete(session.id);
    const validPlayers = session.names.map(onlineByName);
    if (validPlayers.some(player => !player || DungeonManager.playerInstance(player) || !alive(player))) {
      return this.cancelReady({ ...session, active: true }, "最终检查失败：有队员离线、死亡或进入了其他副本。");
    }
    const started = DungeonManager.startGroup(session.leader, validPlayers, session.template.id);
    for (const player of validPlayers) player.sendMessage(started?.instanceId
      ? `§a[队伍副本] 全员 Ready，正在进入 ${session.template.name}。`
      : "§c[队伍副本] 创建失败：当前没有空闲场地或状态已经变化。");
  }

  static cancelReady(session, reason) {
    if (!session) return;
    session.active = false;
    this.readySessions.delete(session.id);
    for (const player of session.players || []) {
      try { player.sendMessage(`§c[队伍副本] ${reason}`); } catch {}
    }
  }

  static openCurrent(player, instance, onBack) {
    const template = DUNGEON_TEMPLATES[instance.templateId];
    const form = new MessageFormData().title("§l§c当前副本")
      .body(`§f副本：§e${template?.name || instance.templateId}\n§f队长：§e${instance.ownerName}\n§f阶段：§e${Math.max(0, instance.stageIndex + 1)} / ${template?.stages.length || 0}\n§f队员：§e${instance.participantIds.length} / ${template?.maxPlayers || 4}\n\n§c主动退出不会获得通关奖励。`)
      .button1("§c退出副本")
      .button2("§8关闭");
    show(player, form, result => {
      if (result.selection === 0) DungeonManager.exit(player);
      else onBack?.();
    });
  }
}
