import { world, system } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";
import { DailyQuestManager } from "../daily/DailyQuestManager.js";
import { RewardManager } from "../rewards/RewardManager.js";
import { ACTIVITY_MILESTONES } from "../config.js";
import { EventNodeRegistry } from "../events/EventNodeRegistry.js";
import { WorldEventManager } from "../events/WorldEventManager.js";
import { EVENT_TEMPLATES } from "../events/templates/eventTemplates.js";
import { MERCHANTS } from "../merchants/merchantConfig.js";
import { NpcDialogue } from "./NpcDialogue.js";
import { IntegrationBridge } from "../integration/IntegrationBridge.js";
import { DungeonMenu } from "./DungeonMenu.js";
import { DailyNewsManager } from "../events/DailyNewsManager.js";

const EVENT_DIMENSIONS = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"];
const EVENT_DIMENSION_NAMES = ["主世界", "下界", "末地"];

export function isAdmin(player) {
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
    player.sendMessage(`§c[每日委托] 菜单错误: ${error}`);
  }), attempt === 0 ? 2 : 5);
}

function targetText(quest) {
  const names = {
    logs: "原木", iron: "铁矿/铁类资源", herbs: "药草",
    basic: "普通感染者", runner: "疾行感染者", mutant: "变异感染者", heavy: "重型感染者", elite: "精英怪",
    any: "任意动态事件", money: "金币成交额",
    "minecraft:map": "地图（普通蓝图占位）", "minecraft:arrow": "箭（弹药占位）"
  };
  return names[quest.targetId] || quest.targetId;
}

export class DailyMenu {
  static open(player) {
    const { state, complete, pending } = DailyQuestManager.summary(player);
    const claimable = state.quests.filter(quest => quest.completed && !quest.claimed).length;
    const form = new ActionFormData().title("§l§6生存联盟 · 今日委托")
      .body(`§f日期：§e${state.dayKey}\n§f今日完成度：§a${complete} / 4\n§f活跃度：§6${state.activity} / 100\n§f可领取任务：§e${claimable}\n§f待发物资：§e${pending}`)
      .button("§l§e查看今日任务", "textures/ui/achievements")
      .button("§l§a领取全部已完成奖励", "textures/ui/gift_square")
      .button("§l§6查看活跃度奖励", "textures/ui/Trade2")
      .button("§l§6联盟每日新闻", "textures/ui/infobulb")
      .button("§l§c进入副本行动", "textures/ui/warning_alex")
      .button("§l§d提交制造成果", "textures/ui/icon_recipe_item")
      .button("§l§a领取待发物资", "textures/ui/inventory_icon")
      .button("§l§7任务说明", "textures/ui/infobulb");
    show(player, form, result => {
      if (result.selection === 0) this.openQuests(player);
      else if (result.selection === 1) {
        const count = DailyQuestManager.claimCompleted(player);
        player.sendMessage(count ? `§a已领取 ${count} 项任务奖励。` : "§7没有可领取的任务奖励。完成任务后再来看看。\n");
        this.open(player);
      } else if (result.selection === 2) this.openActivity(player);
      else if (result.selection === 3) this.openNews(player);
      else if (result.selection === 4) DungeonMenu.open(player, () => this.open(player));
      else if (result.selection === 5) {
        const response = DailyQuestManager.submitCraftPlaceholder(player);
        player.sendMessage(`${response.ok ? "§a" : "§c"}${response.message}`);
        this.open(player);
      } else if (result.selection === 6) {
        const count = RewardManager.claimPending(player);
        player.sendMessage(count ? `§a已补发 ${count} 项物资。` : "§7暂无可补发物资，或背包空间仍不足。");
        this.open(player);
      } else this.openHelp(player);
    });
  }

  static openNews(player) {
    const entries = DailyNewsManager.listRecent(30);
    const form = new ActionFormData().title("§l§6联盟每日新闻")
      .body(entries.length ? `§f今日报道：§e${DailyNewsManager.listToday().length}\n§7选择新闻查看事件坐标和详情。` : "§7当前还没有新闻报道。");
    for (const entry of entries) {
      const state = entry.phase === "active" ? "§c进行中" : entry.phase === "success" ? "§a已解决" : "§8已失败";
      form.button(`${state} §f${entry.headline}\n§8${entry.locationName}`, entry.phase === "active" ? "textures/ui/warning_alex" : "textures/ui/infobulb");
    }
    form.button("§7返回", "textures/ui/undo");
    show(player, form, result => {
      const entry = entries[result.selection];
      if (!entry) return this.open(player);
      const detail = new MessageFormData().title(entry.headline).body(DailyNewsManager.formatEntry(entry)).button1("§a返回新闻").button2("§7返回菜单");
      show(player, detail, detailResult => detailResult.selection === 0 ? this.openNews(player) : this.open(player));
    });
  }

  static openQuests(player) {
    const state = DailyQuestManager.ensureState(player);
    const lines = state.quests.map((quest, index) => {
      const status = quest.claimed ? "§8已领取" : quest.completed ? "§a已完成·待领取" : `§e${quest.progress}/${quest.required}`;
      return `§6${index + 1}. ${quest.title}\n§7${targetText(quest)}：${status} §8| +${quest.activity} 活跃`;
    }).join("\n\n");
    const form = new MessageFormData().title("§l今日 4 项委托").body(lines).button1("§a领取奖励").button2("§7返回");
    show(player, form, result => {
      if (result.selection === 0) DailyQuestManager.claimCompleted(player);
      this.open(player);
    });
  }

  static openActivity(player) {
    const state = DailyQuestManager.ensureState(player);
    if (!Array.isArray(state.activityClaims)) state.activityClaims = [];
    const actions = [];
    const form = new ActionFormData().title("§l§6每日活跃度").body(`§f当前：§e${state.activity}/100\n§7达到档位后可各领取一次。`);
    for (const milestone of ACTIVITY_MILESTONES) {
      const claimed = state.activityClaims.includes(milestone.value);
      const ready = state.activity >= milestone.value;
      form.button(`${claimed ? "§8✓" : ready ? "§a领取" : "§7未达成"} ${milestone.value} 活跃`, ready ? "textures/ui/gift_square" : "textures/ui/lock_color");
      actions.push(() => {
        player.sendMessage(DailyQuestManager.claimActivity(player, milestone.value) ? `§a已领取 ${milestone.value} 活跃奖励。` : "§7该档位尚未达成或已领取。");
        this.openActivity(player);
      });
    }
    form.button("§7返回", "textures/ui/undo");
    actions.push(() => this.open(player));
    show(player, form, result => actions[result.selection]?.());
  }

  static openHelp(player) {
    const body = "§f每天固定生成：\n§a1 个采集任务\n§c1 个击杀任务\n§d1 个动态事件任务\n§61 个随机任务\n\n§7采集只统计亲手破坏方块，旧库存不能刷进度。击杀按 30 格内、最近 15 秒参与伤害计算。动态事件只奖励实际参战或防守的玩家。\n\n§eMVP 占位：地图=普通枪械蓝图，箭=弹药，红石=研究数据，紫水晶=Epic 数据，命名牌=Epic Ticket。";
    const form = new MessageFormData().title("§l任务说明").body(body).button1("§a知道了").button2("§7返回");
    show(player, form, () => this.open(player));
  }
}

export class DailyAdminMenu {
  static open(player) {
    if (!isAdmin(player)) return player.sendMessage("§c仅管理员可使用此菜单。");
    const form = new ActionFormData().title("§l§c日常与动态事件管理")
      .body(`§f事件节点：§e${EventNodeRegistry.getNodes().length}\n§f运行事件：§e${WorldEventManager.list().length}`)
      .button("§a放置委托专员", "textures/ui/FriendsIcon")
      .button("§6放置商人 NPC", "textures/ui/MCStore_Gold_large")
      .button("§6创建/手填事件节点", "textures/ui/World")
      .button("§c删除附近事件节点", "textures/ui/trash")
      .button("§4当前位置测试事件", "textures/ui/warning_alex")
      .button("§4发布新闻并启动事件", "textures/ui/infobulb")
      .button("§e查看运行事件", "textures/ui/magnifyingGlass")
      .button("§c停止附近事件", "textures/ui/cancel")
      .button("§d重置自己的今日任务", "textures/ui/refresh")
      .button("§7打开玩家委托菜单", "textures/ui/undo");
    show(player, form, result => {
      if (result.selection === 0) this.spawnCommissioner(player);
      else if (result.selection === 1) this.openMerchantSpawner(player);
      else if (result.selection === 2) this.createNode(player);
      else if (result.selection === 3) this.deleteNearbyNode(player);
      else if (result.selection === 4) this.startDebugEvent(player);
      else if (result.selection === 5) this.startNewsEvent(player);
      else if (result.selection === 6) this.listEvents(player);
      else if (result.selection === 7) { player.sendMessage(WorldEventManager.stopNear(player) ? "§a已停止附近事件。" : "§7附近没有运行事件。"); this.open(player); }
      else if (result.selection === 8) { DailyQuestManager.ensureState(player, true); player.sendMessage("§a已重新生成自己的今日任务。" ); this.open(player); }
      else DailyMenu.open(player);
    });
  }

  static spawnCommissioner(player) {
    try {
      let entity;
      try { entity = player.dimension.spawnEntity("minecraft:npc", player.location); }
      catch { entity = player.dimension.spawnEntity("daily:commissioner", player.location); }
      entity.nameTag = "§6生存联盟委托专员";
      const native = NpcDialogue.assignScene(player, entity, "daily_commissioner", "daily_commissioner_main");
      player.sendMessage(native ? "§a委托专员已放置。右键/长按打开原生 NPC 委托对话。" : "§e委托专员已放置，但原生对话初始化失败，将使用兼容菜单。");
    } catch (error) { player.sendMessage(`§c放置失败：${error}`); }
    this.open(player);
  }

  static openMerchantSpawner(player) {
    const merchants = Object.values(MERCHANTS);
    const form = new ActionFormData().title("§l放置商人 NPC").body("§7商人名称、台词、按钮和商店分类均可在配置文件中继续修改。");
    for (const merchant of merchants) form.button(`${merchant.name}\n§r§8${merchant.description}`, "textures/ui/MCStore_Gold_large");
    form.button("§7返回", "textures/ui/undo");
    show(player, form, result => {
      const merchant = merchants[result.selection];
      if (!merchant) return this.open(player);
      this.spawnMerchant(player, merchant);
    });
  }

  static spawnMerchant(player, merchant) {
    try {
      let entity;
      try { entity = player.dimension.spawnEntity("minecraft:npc", player.location); }
      catch { entity = player.dimension.spawnEntity("daily:merchant", player.location); }
      entity.nameTag = merchant.name;
      const native = NpcDialogue.assignScene(player, entity, merchant.tag, merchant.scene);
      player.sendMessage(native ? `§a已放置 ${merchant.name}§a。` : `§e已放置 ${merchant.name}§e，但原生对话初始化失败，将使用兼容菜单。`);
    } catch (error) { player.sendMessage(`§c放置商人失败：${error}`); }
    this.open(player);
  }

  static createNode(player) {
    const templateNames = [`全部 ${Object.keys(EVENT_TEMPLATES).length} 类随机`, ...Object.values(EVENT_TEMPLATES).map(value => `${value.name}${value.zones?.includes("safe") ? "（仅安全区）" : value.zones?.includes("outlaw") && value.zones.length === 1 ? "（仅非法制区）" : ""}`)];
    const templateIds = [null, ...Object.keys(EVENT_TEMPLATES)];
    const currentDimension = Math.max(0, EVENT_DIMENSIONS.indexOf(player.dimension.id));
    const form = new ModalFormData().title("创建人工事件节点")
      .textField("节点名称", "废弃加油站", "新事件节点")
      .dropdown("允许事件", templateNames, 0)
      .dropdown("维度", EVENT_DIMENSION_NAMES, currentDimension)
      .textField("X 坐标", "例如 1280", String(Number(player.location.x.toFixed(1))))
      .textField("Y 坐标", "例如 64", String(Number(player.location.y.toFixed(1))))
      .textField("Z 坐标", "例如 -640", String(Number(player.location.z.toFixed(1))))
      .textField("触发半径", "35", "35")
      .textField("冷却分钟", "20", "20");
    show(player, form, result => {
      const [name, typeIndex, dimensionIndex, x, y, z, radius, cooldown] = result.formValues;
      const selected = templateIds[Number(typeIndex) || 0];
      const dimensionId = EVENT_DIMENSIONS[Number(dimensionIndex) || 0];
      const node = EventNodeRegistry.addAt(player, name, dimensionId, { x: Number(x), y: Number(y), z: Number(z) }, selected ? [selected] : Object.keys(EVENT_TEMPLATES), radius, cooldown);
      const zone = node ? IntegrationBridge.resolveZone(node.dimension, node.location) : null;
      const zoneLabel = zone?.type === "outlaw" ? "§4非法制区·高危" : zone?.type === "safe" ? "§a安全区" : "§e法制区·常规";
      player.sendMessage(node ? `§a已创建节点 ${node.name}。§7当前区域：${zoneLabel}` : "§c创建节点失败。");
      this.open(player);
    });
  }

  static startNewsEvent(player) {
    const presets = DailyNewsManager.presetList();
    const form = new ActionFormData().title("§l§4选择新闻预设").body("§7选择报道和事件类型，下一步可手动填写地点名称及完整坐标。");
    for (const value of presets) {
      const template = EVENT_TEMPLATES[value.eventTemplateId];
      const scope = template?.zones?.includes("safe") ? "仅安全区" : template?.zones?.length === 1 && template.zones[0] === "outlaw" ? "仅非法制区" : "法制区/荒野";
      form.button(`§f${value.headline}\n§8${value.category} | 危险 ${value.danger} | ${scope}`, "textures/ui/warning_alex");
    }
    form.button("§7返回", "textures/ui/undo");
    show(player, form, result => {
      const preset = presets[result.selection];
      if (!preset) return this.open(player);
      this.configureNewsEvent(player, preset);
    });
  }

  static configureNewsEvent(player, preset) {
    const currentDimension = Math.max(0, EVENT_DIMENSIONS.indexOf(player.dimension.id));
    const form = new ModalFormData().title(preset.headline)
      .textField("新闻地点名称", "例如：曙光主城南门", "未命名事件区域")
      .dropdown("事件维度", EVENT_DIMENSION_NAMES, currentDimension)
      .textField("X 坐标", "例如 1280", String(Number(player.location.x.toFixed(1))))
      .textField("Y 坐标（会在上下 24 格内校正地面）", "例如 64", String(Number(player.location.y.toFixed(1))))
      .textField("Z 坐标", "例如 -640", String(Number(player.location.z.toFixed(1))));
    show(player, form, result => {
      const [locationName, dimensionIndex, x, y, z] = result.formValues;
      const dimensionId = EVENT_DIMENSIONS[Number(dimensionIndex) || 0];
      const normalized = EventNodeRegistry.normalizeLocation(dimensionId, { x: Number(x), y: Number(y), z: Number(z) });
      if (!normalized) {
        player.sendMessage("§c坐标无效。X/Z 必须在世界边界内，Y 必须为 -64～319。");
        return this.configureNewsEvent(player, preset);
      }
      this.prepareNewsEvent(player, preset, String(locationName || "未命名事件区域"), normalized.dimension, normalized.location);
    });
  }

  static prepareNewsEvent(player, preset, locationName, dimensionId, requestedLocation) {
    let dimension;
    try { dimension = world.getDimension(dimensionId); }
    catch { player.sendMessage("§c目标维度不可用。"); return this.open(player); }
    const areaId = `daily_news_${Date.now().toString(36).slice(-8)}`;
    const x = Math.floor(requestedLocation.x), y = Math.floor(requestedLocation.y), z = Math.floor(requestedLocation.z);
    try { dimension.runCommand(`tickingarea remove ${areaId}`); } catch {}
    try { dimension.runCommand(`tickingarea add ${x - 12} ${Math.max(-64, y - 32)} ${z - 12} ${x + 12} ${Math.min(319, y + 32)} ${z + 12} ${areaId} true`); } catch {}
    player.sendMessage(`§e正在检查 ${locationName} 的区块与地面……`);
    system.runTimeout(() => {
      const location = EventNodeRegistry.resolveGround(dimensionId, requestedLocation);
      if (!location) {
        player.sendMessage("§c坐标附近没有找到可用地面，事件未发布。请调整 Y 或换到开阔位置。");
      } else {
        const node = { id: `manual_news_${Date.now().toString(36)}`, name: locationName, dimension: dimensionId, location, allowedEvents: [preset.eventTemplateId], cooldownUntil: 0, cooldownMinutes: 1 };
        const started = WorldEventManager.start(node, preset.eventTemplateId, player, { newsPresetId: preset.id, locationName, waitForPlayers: true });
        const adjusted = location.y !== requestedLocation.y ? `§7地面 Y 已校正为 ${location.y}。` : "";
        player.sendMessage(started ? `§a新闻已发布；首名玩家在 2 分钟内抵达后事件正式启动。${adjusted}` : "§c事件启动失败：区域类型不兼容、Boss/Apocalypse Mobs 未启用，或附近已有事件。");
      }
      system.runTimeout(() => { try { dimension.runCommand(`tickingarea remove ${areaId}`); } catch {} }, 100);
      this.open(player);
    }, 30);
  }

  static deleteNearbyNode(player) {
    const nodes = EventNodeRegistry.nearby(player, 100).sort((a, b) => Math.hypot(a.location.x - player.location.x, a.location.z - player.location.z) - Math.hypot(b.location.x - player.location.x, b.location.z - player.location.z));
    const form = new ActionFormData().title("删除附近节点").body(nodes.length ? "§7选择节点。" : "§7附近 100 格没有节点。");
    for (const node of nodes) form.button(`${node.name}\n§8${Math.floor(distance2d(node.location, player.location))} 格`, "textures/ui/trash");
    form.button("§7返回", "textures/ui/undo");
    show(player, form, result => {
      const node = nodes[result.selection];
      if (node) player.sendMessage(EventNodeRegistry.remove(node.id) ? "§a节点已删除。" : "§c删除失败。");
      this.open(player);
    });
  }

  static startDebugEvent(player) {
    const ids = Object.keys(EVENT_TEMPLATES);
    const form = new ActionFormData().title("测试事件").body("§7测试节点不会保存；安全区只允许启动叛军入侵事件。");
    for (const id of ids) form.button(EVENT_TEMPLATES[id].name, "textures/ui/warning_alex");
    form.button("§7返回", "textures/ui/undo");
    show(player, form, result => {
      const id = ids[result.selection];
      if (!id) return this.open(player);
      const node = { id: `debug_${Date.now().toString(36)}`, name: "调试节点", dimension: player.dimension.id, location: { ...player.location }, allowedEvents: [id], cooldownUntil: 0, cooldownMinutes: 1 };
      player.sendMessage(WorldEventManager.start(node, id, player) ? `§a已启动 ${EVENT_TEMPLATES[id].name}。` : "§c启动失败：当前位置可能是安全区或已有事件。");
      this.open(player);
    });
  }

  static listEvents(player) {
    const active = WorldEventManager.list();
    const body = active.length ? active.map(value => `${EVENT_TEMPLATES[value.templateId]?.name || value.templateId} | ${value.zoneType === "outlaw" ? "非法制区" : value.zoneType === "safe" ? "安全区入侵" : "法制区"} | ${value.state} | ${value.nodeId}`).join("\n") : "§7当前没有运行事件。";
    const form = new MessageFormData().title("运行事件").body(body).button1("刷新").button2("返回");
    show(player, form, result => result.selection === 0 ? this.listEvents(player) : this.open(player));
  }
}

function distance2d(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
