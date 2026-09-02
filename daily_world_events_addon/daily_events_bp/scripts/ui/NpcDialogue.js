import { world, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { DailyQuestManager } from "../daily/DailyQuestManager.js";
import { RewardManager } from "../rewards/RewardManager.js";
import { MERCHANTS } from "../merchants/merchantConfig.js";

const SCORE_OBJECTIVES = Object.freeze({
  complete: "daily_done",
  activity: "daily_active",
  claimable: "daily_claim"
});

function objective(id, displayName) {
  try { return world.scoreboard.getObjective(id) || world.scoreboard.addObjective(id, displayName); }
  catch { return null; }
}

function setScore(player, id, displayName, value) {
  try {
    const target = player.scoreboardIdentity;
    const board = objective(id, displayName);
    if (target && board) board.setScore(target, Math.max(0, Math.floor(Number(value) || 0)));
  } catch {}
}

function nativeCommand(player, command) {
  try { player.runCommand(command); return true; }
  catch { return false; }
}

function sapiAlive() {
  try {
    const heartbeat = Number(world.getDynamicProperty("interop:sapi_server_heartbeat") || 0);
    return heartbeat > 0 && Date.now() - heartbeat < 30000;
  } catch { return false; }
}

export class NpcDialogue {
  static syncPlayer(player) {
    const { state, complete } = DailyQuestManager.summary(player);
    const claimable = state.quests.filter(quest => quest.completed && !quest.claimed).length;
    setScore(player, SCORE_OBJECTIVES.complete, "Daily Completed", complete);
    setScore(player, SCORE_OBJECTIVES.activity, "Daily Activity", state.activity);
    setScore(player, SCORE_OBJECTIVES.claimable, "Daily Claimable", claimable);
  }

  static open(player, entity, scene, fallback) {
    this.syncPlayer(player);
    const tag = `daily_dialogue_${Math.floor(Math.random() * 1000000000)}`;
    try { entity.addTag(tag); } catch { fallback?.(); return false; }
    const opened = nativeCommand(player, `dialogue open @e[tag=${tag},c=1] @s ${scene}`);
    try { entity.removeTag(tag); } catch {}
    if (!opened) system.run(() => fallback?.());
    return opened;
  }

  static assignScene(player, entity, permanentTag, scene) {
    try { entity.addTag("daily_managed_npc"); entity.addTag(permanentTag); } catch {}
    const temporary = `daily_setup_${Math.floor(Math.random() * 1000000000)}`;
    try { entity.addTag(temporary); } catch { return false; }
    const changed = nativeCommand(player, `dialogue change @e[tag=${temporary},c=1] ${scene}`);
    try { entity.removeTag(temporary); } catch {}
    return changed;
  }
}

export class MerchantMenu {
  static open(player, merchant) {
    const form = new ActionFormData().title(merchant.name).body(`§f${merchant.description}\n\n§7商人对话与按钮可在行为包 dialogue/merchant_dialogues.json 中修改。`);
    for (const category of merchant.categories) form.button(`§l§e打开 ${category} 商品`, "textures/ui/MCStore_Gold_large");
    form.button("§l§6打开综合商店", "textures/ui/Trade2");
    form.show(player).then(result => {
      if (result.canceled) return;
      const category = merchant.categories[result.selection];
      this.openCategory(player, category || "all");
    }).catch(() => {});
  }

  static openCategory(player, category) {
    if (!sapiAlive()) return player.sendMessage("§c[SAPI] 服务器经济 Addon 未连接，商店暂不可用。");
    const message = String(category || "all").replace(/[^a-z0-9_-]/gi, "");
    system.runTimeout(() => nativeCommand(player, `scriptevent sapi:shop ${message}`), 2);
  }

  static values() { return Object.values(MERCHANTS); }
}
