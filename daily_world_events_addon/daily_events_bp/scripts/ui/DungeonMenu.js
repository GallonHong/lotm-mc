import { system } from "@minecraft/server";
import { ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { DungeonManager } from "../dungeons/DungeonManager.js";
import { DUNGEON_TEMPLATES } from "../dungeons/dungeonTemplates.js";

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
      .body(`§7副本采用独立场地、个人贡献与防重复奖励结算。\n§f运行实例：§e${active.length} §8/ 2`);
    const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
    const clinic = DUNGEON_TEMPLATES.abandoned_clinic;
    add(`§l§c${clinic.name}\n§r§8推荐 1–4 人 | 多建筑九阶段行动`, "textures/ui/warning_alex", () => this.confirmStart(player, clinic, onBack));
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
    const form = new MessageFormData().title(`§l${template.name}`)
      .body(`§7${template.description}\n\n§f地图：§e${template.structureSize.x}×${template.structureSize.y}×${template.structureSize.z} 多建筑小镇\n§fStructure：§e${template.structures.length} 个\n§f阶段：§e${template.stages.length}\n§f复活：§e每人 ${template.maxDeathsPerPlayer} 次\n§f限时：§e${Math.floor(template.timeoutTicks / 1200)} 分钟\n§f奖励：§e按个人贡献独立结算`)
      .button1("§a创建副本")
      .button2("§8返回");
    show(player, form, result => {
      if (result.selection !== 0) return this.open(player, onBack);
      player.sendMessage(DungeonManager.start(player, template.id) ? "§a副本实例创建成功。" : "§c创建失败：你已在副本中或当前没有空闲场地。");
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
