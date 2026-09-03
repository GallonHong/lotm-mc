import { system } from "@minecraft/server";
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

export class DungeonMenu {
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
    const bossRequirement = template.stages.some(stage => stage.type === "boss") ? "\n§fBoss 依赖：§cApocalypse Mobs BP/RP" : "";
    const form = new MessageFormData().title(`§l${template.name}`)
      .body(`§7${template.description}\n\n§f类型：§e${template.category} §8| §f难度：§e${template.difficulty}\n§f地图：§e${template.structureSize.x}×${template.structureSize.y}×${template.structureSize.z}\n§fStructure：§e${template.structures.length} 个\n§f阶段：§e${template.stages.length}\n§f复活：§e每人 ${template.maxDeathsPerPlayer} 次\n§f限时：§e${Math.floor(template.timeoutTicks / 1200)} 分钟${bossRequirement}\n§f奖励：§e${rewardText}`)
      .button1("§a创建副本")
      .button2("§8返回");
    show(player, form, result => {
      if (result.selection !== 0) return this.open(player, onBack);
      const started = DungeonManager.start(player, template.id);
      if (started?.instanceId) player.sendMessage("§a副本实例创建成功。");
      else if (started?.error === "missing_apocalypse_boss") player.sendMessage("§c创建失败：未检测到 Apocalypse Mobs，请启用对应 BP/RP 后再创建包含 Boss 的副本。");
      else player.sendMessage("§c创建失败：你已在副本中或当前没有空闲场地。");
    });
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
