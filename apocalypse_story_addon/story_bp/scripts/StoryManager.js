import { world, system } from "@minecraft/server";
import { ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { STORY_CONFIG } from "./config.js";

const VALID_STAGES = new Set(["not_started", "rendezvous", "ready_dungeon", "in_dungeon", "complete"]);

function isAdmin(player) {
  try { if (player.hasTag("admin")) return true; } catch {}
  try { if (typeof player.isOp === "function" && player.isOp()) return true; } catch {}
  return false;
}

function isUserBusy(value) {
  const reason = String(value?.cancelationReason || value?.cancellationReason || value?.message || value || "").toLowerCase();
  return reason.includes("userbusy") || reason.includes("user busy");
}

function show(player, form, callback, attempt = 0) {
  system.runTimeout(() => form.show(player).then(result => {
    if (!result.canceled) return callback(result);
    if (isUserBusy(result) && attempt < 8) show(player, form, callback, attempt + 1);
  }).catch(error => {
    if (isUserBusy(error) && attempt < 8) return show(player, form, callback, attempt + 1);
    try { player.sendMessage(`§c[主线测试] 界面打开失败：${error}`); } catch {}
  }), attempt === 0 ? 2 : 5);
}

function sameDimension(a, b) {
  return String(a || "").replace("minecraft:", "") === String(b || "").replace("minecraft:", "");
}

function distance(a, b) {
  return Math.hypot(Number(a.x) - Number(b.x), Number(a.y) - Number(b.y), Number(a.z) - Number(b.z));
}

function cleanLocation(value) {
  if (!value || typeof value !== "object") return null;
  const x = Number(value.x), y = Number(value.y), z = Number(value.z), radius = Number(value.radius);
  if (![x, y, z, radius].every(Number.isFinite)) return null;
  return { dimensionId: String(value.dimensionId || "minecraft:overworld"), x, y, z, radius: Math.max(2, radius) };
}

export class StoryManager {
  static read(player) {
    let state = null;
    try { state = JSON.parse(player.getDynamicProperty(STORY_CONFIG.stateKey) || "null"); } catch {}
    if (!state || typeof state !== "object" || !VALID_STAGES.has(state.stage)) {
      state = { schemaVersion: 1, storyId: "newcomer_tutorial", stage: "not_started", updatedAt: Date.now() };
    }
    return state;
  }

  static write(player, state) {
    const next = { ...state, schemaVersion: 1, storyId: "newcomer_tutorial", updatedAt: Date.now() };
    try { player.setDynamicProperty(STORY_CONFIG.stateKey, JSON.stringify(next)); } catch {}
    return next;
  }

  static entry() {
    let override = null;
    try { override = cleanLocation(JSON.parse(world.getDynamicProperty(STORY_CONFIG.entryOverrideKey) || "null")); } catch {}
    return override || cleanLocation(STORY_CONFIG.entry);
  }

  static dailyAvailable() {
    try {
      const heartbeat = Number(world.getDynamicProperty(STORY_CONFIG.dailyHeartbeatKey) || 0);
      return heartbeat > 0 && Date.now() - heartbeat <= STORY_CONFIG.dailyHeartbeatMaxAgeMs;
    } catch { return false; }
  }

  static begin(player) {
    const current = this.read(player);
    if (current.stage !== "not_started") return this.open(player);
    const entry = this.entry();
    this.write(player, { ...current, stage: "rendezvous", lastReminderTick: system.currentTick });
    player.sendMessage("§6[主线测试] §f一段来自曙光谷的求救广播切入公共频道。联盟要求你先前往地面集结点。使用 §e/scriptevent story:menu §f查看任务。");
    player.sendMessage(`§e当前目标：前往集结点 §f${Math.floor(entry.x)} ${Math.floor(entry.y)} ${Math.floor(entry.z)} §8(${entry.dimensionId})`);
    try { player.playSound("random.orb", { volume: 0.8, pitch: 0.8 }); } catch {}
    this.open(player);
  }

  static reachEntry(player, state) {
    if (state.stage !== "rendezvous") return false;
    const entry = this.entry();
    if (!sameDimension(player.dimension.id, entry.dimensionId) || distance(player.location, entry) > entry.radius) return false;
    this.write(player, { ...state, stage: "ready_dungeon" });
    player.sendMessage("§a[主线测试] 已抵达联盟集结点。无线电确认曙光谷仍有幸存者，现在可以进入新手教程副本。");
    try { player.playSound("random.levelup", { volume: 0.9, pitch: 1.1 }); } catch {}
    this.open(player);
    return true;
  }

  static emitEntryGuide(player) {
    const entry = this.entry();
    if (!sameDimension(player.dimension.id, entry.dimensionId)) return;
    let dimension;
    try { dimension = world.getDimension(entry.dimensionId); } catch { return; }
    for (let y = 0.5; y <= 5.5; y += 1) {
      try { dimension.spawnParticle("minecraft:totem_particle", { x: entry.x, y: entry.y + y, z: entry.z }); } catch {}
    }
  }

  static requestDungeon(player) {
    const state = this.read(player);
    if (state.stage !== "ready_dungeon" && state.stage !== "in_dungeon") return this.open(player);
    if (!this.dailyAvailable()) {
      player.sendMessage("§c[主线测试] Daily World Events 未连接，无法创建新手副本。请确认行为包已启用后重试。");
      return;
    }
    try {
      player.runCommand(`scriptevent daily:dungeon_start ${STORY_CONFIG.tutorialDungeonId}`);
      this.write(player, { ...state, stage: "in_dungeon", dungeonRequestedAt: Date.now() });
      player.sendMessage("§6[主线测试] 正在请求部署“曙光谷·第一次撤离”……");
    } catch (error) {
      player.sendMessage(`§c[主线测试] 副本请求失败：${error}`);
    }
  }

  static dungeonComplete(player, dungeonId) {
    const state = this.read(player);
    if (state.stage !== "in_dungeon" || dungeonId !== STORY_CONFIG.tutorialDungeonId) return false;
    this.write(player, { ...state, stage: "complete", completedAt: Date.now() });
    player.sendMessage("§a§l[主线测试完成] §r§f你从曙光谷成功撤离。黑匣子里的异常广播将作为后续主线的入口。");
    try { player.playSound("random.levelup", { volume: 1, pitch: 0.8 }); } catch {}
    return true;
  }

  static reset(player) {
    try { player.setDynamicProperty(STORY_CONFIG.stateKey, undefined); } catch {}
    player.sendMessage("§e[主线测试] 剧情状态已重置。副本的一次性奖励记录不会重置。");
  }

  static setEntryHere(player) {
    if (!isAdmin(player)) return player.sendMessage("§c仅管理员可以修改剧情集结点。");
    const value = {
      dimensionId: player.dimension.id,
      x: Math.floor(player.location.x) + 0.5,
      y: Math.floor(player.location.y),
      z: Math.floor(player.location.z) + 0.5,
      radius: STORY_CONFIG.entry.radius
    };
    try { world.setDynamicProperty(STORY_CONFIG.entryOverrideKey, JSON.stringify(value)); } catch {}
    player.sendMessage(`§a[主线测试] 集结点已改为当前位置：${value.x} ${value.y} ${value.z}（${value.dimensionId}）。`);
  }

  static objectiveText(player, state) {
    const entry = this.entry();
    if (state.stage === "not_started") return "尚未开始。";
    if (state.stage === "rendezvous") {
      const meters = sameDimension(player.dimension.id, entry.dimensionId) ? `${Math.floor(distance(player.location, entry))} 格` : "其他维度";
      return `前往联盟集结点\n§f坐标：§e${Math.floor(entry.x)} ${Math.floor(entry.y)} ${Math.floor(entry.z)}\n§f距离：§e${meters}`;
    }
    if (state.stage === "ready_dungeon") return "已抵达集结点，等待进入“曙光谷·第一次撤离”。";
    if (state.stage === "in_dungeon") return "完成新手教程副本并成功撤离。失败后可从本菜单重新创建。";
    return "第一段测试剧情已经完成。";
  }

  static open(player) {
    const state = this.read(player);
    const actions = [];
    const form = new ActionFormData().title("§l§6主线测试 · 失联广播")
      .body(`§7独立剧情 MVP，不占用 Action Bar，也不依赖 SAPI 菜单。\n\n§f当前状态：§e${state.stage}\n§f当前目标：\n§7${this.objectiveText(player, state)}\n\n§8Daily Events：${this.dailyAvailable() ? "§a已连接" : "§c未连接"}`);
    const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
    if (state.stage === "not_started") add("§l§a接听求救广播\n§r§8开始测试剧情", "textures/ui/icon_book_writable", () => this.confirmBegin(player));
    if (state.stage === "rendezvous") add("§l§e刷新集结点状态\n§r§8进入范围后自动推进", "textures/ui/refresh_light", () => { this.reachEntry(player, this.read(player)); this.open(player); });
    if (state.stage === "ready_dungeon" || state.stage === "in_dungeon") add("§l§c进入新手教程副本\n§r§8曙光谷·第一次撤离", "textures/ui/how_to_play_button_default", () => this.requestDungeon(player));
    if (isAdmin(player)) add("§l§b将当前位置设为集结点\n§r§8方便测试和后期改坐标", "textures/ui/icon_map", () => { this.setEntryHere(player); this.open(player); });
    add("§8关闭", "textures/ui/cancel", () => {});
    show(player, form, result => actions[result.selection]?.());
  }

  static confirmBegin(player) {
    const form = new MessageFormData().title("§l§6失联广播")
      .body("§7‘这里是曙光谷转运车队……我们遭到感染者袭击。若有人收到，请到联盟集结点接收最后一组坐标。’\n\n§f该测试会在主世界追踪一个集结点，抵达后连接现有新手教程副本。")
      .button1("§a接受任务").button2("§8稍后再说");
    show(player, form, result => { if (result.selection === 0) this.begin(player); });
  }

  static status(player) {
    const state = this.read(player);
    player.sendMessage(`§6[主线测试] §f${this.objectiveText(player, state).replace(/\n/g, " §8| §f")}`);
  }

  static tick() {
    for (const player of world.getAllPlayers()) {
      const state = this.read(player);
      if (state.stage === "rendezvous") {
        this.emitEntryGuide(player);
        if (this.reachEntry(player, state)) continue;
        const last = Number(state.lastReminderTick || 0);
        if (system.currentTick - last >= STORY_CONFIG.objectiveReminderTicks) {
          this.write(player, { ...state, lastReminderTick: system.currentTick });
          this.status(player);
        }
      }
    }
  }
}
