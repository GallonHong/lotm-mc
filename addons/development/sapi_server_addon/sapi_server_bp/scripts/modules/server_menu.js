import { PvPManager } from "./pvp.js";
import { allowOrdinaryAction, isMatchLocked, isWeeklyLocked } from "./match_access.js";
import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { Config } from "../config.js";
import { Utils } from "../utils.js";
import { EconomyManager } from "./economy.js";
import { ShopManager } from "./shop.js";
import { LandManager } from "./land.js";
import { LotteryManager } from "./lottery.js";
import { MarketManager } from "./market.js";
import { Integration } from "./integration.js";
import { TeleportManager } from "./teleport.js";
import { RegionManager } from "./region.js";
import { AuditManager } from "./audit.js";
import { OperationsManager } from "./operations.js";
import { ItemCleanupManager } from "./item_cleanup.js";
import { SocialManager } from "./social.js";
import { WantedManager } from "./wanted.js";

/** 服务器 Add-on 菜单。LOTM 功能只通过跨包事件调用，不直接导入 LOTM 源码。 */
export class ServerMenuManager {
 static menuRequests = new Map();

 static clearPendingMenu(playerId) {
  this.menuRequests.delete(playerId);
 }

 static menuContext(player) {
  return [player.dimension.id, player.hasTag("pvp:participant"),
   player.hasTag("pvp:admission"), player.hasTag("extract:admission"),
   player.hasTag("weekly:admission"), player.hasTag("weekly:participant")].join("|");
 }

 // A form waiting on UserBusy must not outlive a teleport, admission, newer
 // compass request or disconnect. Rebuild from current state, never replay it.
 static menuGuard(player, reopen) {
  const request = { context: this.menuContext(player) };
  this.menuRequests.set(player.id, request);
  return (refreshWhenStale = true) => {
   if (!Utils.isValid(player) || this.menuRequests.get(player.id) !== request) return false;
   if (this.menuContext(player) === request.context) return true;
   if (!refreshWhenStale) return false;
   system.run(() => {
    if (!Utils.isValid(player) || this.menuRequests.get(player.id) !== request) return;
    this.clearPendingMenu(player.id);
    reopen();
   });
   return false;
  };
 }

 static openMainMenu(player) {
  if (!Utils.isValid(player)) return;
  // Extraction also owns pvp:admission while loading. A transaction lock is
  // not evidence that this player joined PvP; only its participant tag is.
  if (PvPManager.isParticipant(player)) {
   this.clearPendingMenu(player.id);
   return PvPManager.openMenu(player);
  }
  if (isWeeklyLocked(player)) {
   this.clearPendingMenu(player.id);
   return Integration.send(player, "daily:weekly");
  }
  const isCurrent = this.menuGuard(player, () => this.openMainMenu(player));
  const preparing = isMatchLocked(player);
  if (!preparing) EconomyManager.redeemLegacyCoinItems(player);
  const balance = EconomyManager.getBalance(player);
  const { chunkX, chunkZ } = Utils.getChunkCoords(player.location);
  const currentZone = Integration.resolveCurrentZone(player.dimension.id, player.location);
  let zoneDisplay = "";
  if (currentZone.type === "safe") {
   zoneDisplay = `§a安全区 · ${currentZone.name}§r`;
  } else if (currentZone.type === "law") {
   zoneDisplay = `§e法制区 · ${currentZone.name}§r`;
  } else {
   zoneDisplay = `§c危险区 · ${currentZone.name}§r`;
  }

  const actions = [];
  // Keep this title stable: the optional Apocalypse UI resource pack uses
  // it as a JSON UI skin gate. Without that pack this remains a normal,
  // fully functional ActionForm.
  let seasonDisplay = "";
  try {
   seasonDisplay = String(world.getDynamicProperty("apoc:season_display") || "§a春季 · 第1天");
  } catch {
   seasonDisplay = "§a春季 · 第1天";
  }

  const form = new ActionFormData()
   .title("§l§2幸存者联盟§r")
   .body(
    (preparing ? "§e正在准备入场，完成前暂不能传送、交易或进入其他玩法。\n" : "") +
    `§e${player.name} §6│ §6${Utils.formatCurrency(balance)}\n` +
    `${zoneDisplay} §6│ 时令: ${seasonDisplay}\n` +
    `§6──────────────────────────────\n` +
    `§e当前区域: ${zoneDisplay}\n` +
    `§e时令气象: ${seasonDisplay}\n` +
    `§e区块坐标: §8[${chunkX}, ${chunkZ}] §e维度: §8${player.dimension.id.replace("minecraft:", "")}\n` +
    `§6──────────────────────────────`
   );

  const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
  add("§l§b公共传送点\n§r§8前往主城与公共区域（免费）", "textures/ui/World", () => TeleportManager.openWarpMenu(player, () => this.openMainMenu(player)));
  add("§l§a个人传送\n§r§8Home、TPA 与死亡返回（免费）", "textures/ui/icon_recipe_nature", () => TeleportManager.openPlayerMenu(player, () => this.openMainMenu(player)));
  add("§l§e每日福利\n§r§8签到、兑换码与待领取奖励", "textures/ui/gift_square", () => OperationsManager.openPlayerMenu(player, () => this.openMainMenu(player)));
  add("§l§6幸存者联盟委托\n§r§8日常任务、活跃度与世界事件", "textures/ui/achievements", () => Integration.send(player, "daily:menu"));
  add("§l§c副本行动\n§r§8单人进入或由队长发起全队 Ready", "textures/ui/warning_alex", () => SocialManager.openDungeon(player));
  add("§l§4战斗玩法\n§r§8城市摸金 · 废土争夺战 · 突变体周本", "textures/ui/warning_alex", () => this.openBattleMenu(player));
  add("§l§6个人银行\n§r§8资产查询与玩家转账", "textures/items/gold_ingot", () => EconomyManager.openBankUI(player, () => this.openMainMenu(player)));
  add("§l§a全球商店\n§r§8物资买卖与一键物品回收", "textures/items/emerald", () => ShopManager.openShopCategoryUI(player, () => this.openMainMenu(player)));
  add("§l§2地皮领地\n§r§8购买与管理保护区块", "textures/ui/village_hero_effect", () => LandManager.openPlotMainUI(player, () => this.openMainMenu(player)));
  add("§l§d幸运抽奖\n§r§8按已安装内容动态生成奖池", "textures/ui/gift_square", () => LotteryManager.openLotteryMainUI(player, () => this.openMainMenu(player)));
  add("§l§6玩家寄卖行\n§r§8自由定价交易，成交收取10%费率", "textures/ui/MCStore_Gold_large", () => MarketManager.openMainUI(player, () => this.openMainMenu(player)));
  add("§l§b社交\n§r§8好友、在线玩家、队伍与公会", "textures/ui/FriendsIcon", () => SocialManager.openSocialMenu(player, () => this.openMainMenu(player)));
  // The optional tile UI binds these stable collection indexes.
  add("§l§6便携终端\n§r§8末日载具、排行与管理", "textures/ui/settings_glyph_color_2x", () => this.openMoreMenu(player));

  Utils.showForm(player, form, (res) => {
   if (!res.canceled) system.run(() => { if (isCurrent() && allowOrdinaryAction(player)) actions[res.selection]?.(); });
  }, 5, isCurrent);
 }

 static openBattleMenu(player) {
  if (!Utils.isValid(player)) return;
  if (PvPManager.isParticipant(player)) {
   this.clearPendingMenu(player.id);
   return PvPManager.openMenu(player);
  }
  if (isWeeklyLocked(player)) {
   this.clearPendingMenu(player.id);
   return Integration.send(player, "daily:weekly");
  }
  const isCurrent = this.menuGuard(player, () => this.openBattleMenu(player));
  const form = new ActionFormData().title("§l§4战斗玩法")
   .body("§8城市摸金：搜集物资并撤离。\n§8废土争夺战：系统补给，死亡保留本局装备。\n§e突变体周本：两位顶级 Boss，1–8 人独立候场，全员准备后开战。")
   .button("§6城市摸金", "textures/ui/World")
   .button("§c废土争夺战", "textures/ui/warning_alex")
   .button("§5围剿顶级突变体 · 周本", "textures/ui/icon_multiplayer")
   .button("§2返回", "textures/ui/undo");
  Utils.showForm(player, form, res => {
   if (res.canceled) return;
   system.run(() => {
    if (!isCurrent()) return;
    if (res.selection === 3) return this.openMainMenu(player);
    if (!allowOrdinaryAction(player)) return;
    if (res.selection === 1) return PvPManager.openMenu(player, () => this.openBattleMenu(player));
    if (res.selection === 0) Integration.openExtractionMenu(player);
    if (res.selection === 2) SocialManager.openWeeklyRaid(player);
   });
  }, 5, isCurrent);
 }

 static openMoreMenu(player) {
  if (!allowOrdinaryAction(player)) return;
  if (!Utils.isValid(player)) return;
  const actions = [];
  let seasonDisplay = "";
  try {
   seasonDisplay = String(world.getDynamicProperty("apoc:season_display") || "§a春季 · 第1天");
  } catch {
   seasonDisplay = "§a春季 · 第1天";
  }

  const form = new ActionFormData()
   .title("§l§6便捷终端与更多")
   .body(`§e当前时令: ${seasonDisplay}\n§8服务器扩展功能、个人载具终端与管理入口`);
  const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };

  add("§l§6末日载具\n§r§8召唤、召回、改装、加油与维修", "textures/items/blueprints/blueprint_truck", () => {
   Integration.send(player, "vehicle:open_garage");
  });
  add("§l§b战术无人机\n§r§8伴飞僚机、遥控开火、改装与充能", "textures/drones/items/crossbow_drone", () => {
   Integration.send(player, "drone:open_hangar");
  });
  add("§l§e财富排行\n§r§8查看服务器富豪排行榜", "textures/ui/achievements", () => EconomyManager.openLeaderboardUI(player, () => this.openMoreMenu(player)));
  add(`§l§c通缉与保释\n§r§8当前通缉值: §e${WantedManager.points(player)}`, "textures/ui/warning_alex", () => WantedManager.openPlayerMenu(player, () => this.openMoreMenu(player)));
  if (Integration.isLotmAvailable()) {
   add("§l§5诡秘非凡秘典\n§r§8查看途径、序列与能力", "textures/items/potion_seer", () => Integration.send(player, "lotm:open"));
  }
  if (Utils.isAdmin(player)) {
   add("§l§c管理员控制台\n§r§8服务器与联动管理", "textures/ui/op", () => this.openAdminPanel(player, () => this.openMoreMenu(player)));
  }
  add("§l§2返回主菜单", "textures/ui/undo", () => this.openMainMenu(player));
  add("§l§c关闭菜单", "textures/ui/cancel", () => {});
  Utils.showForm(player, form, (res) => actions[res.selection]?.());
 }

 static openAdminPanel(player, onBack = null) {
  if (!Utils.isAdmin(player)) return;
  const dailyEventsReady = Integration.isDailyEventsAvailable();
  const actions = [];
  const form = new ActionFormData()
   .title("§l§c服务器管理员控制台")
   .body(`§e在线玩家: §e${world.getAllPlayers().length}\n§8LOTM 联动: ${Integration.isLotmAvailable() ? "§a已连接" : "§c未连接"}\n§8日常事件联动: ${dailyEventsReady ? "§a已连接" : "§c未连接（突发事件入口仍保留）"}`);
  const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
  add(`§l§6发布每日突发事件\n§r§8${dailyEventsReady ? "选择预设并手填事件坐标" : "需要启用 Daily Events BP"}`, "textures/ui/infobulb", () => {
   if (!Integration.isDailyEventsAvailable()) return Utils.tell(player, "§cDaily Events 未连接。请启用最新 Survival Daily & World Events BP，并退出世界后重新进入。");
   Integration.send(player, "daily:news_admin");
  });
  add("§l§b公共传送点管理", "textures/ui/World", () => TeleportManager.openAdminMenu(player, () => this.openAdminPanel(player, onBack)));
  add("§l§6主城与保护区管理", "textures/ui/village_hero_effect", () => RegionManager.openAdminMenu(player, () => this.openAdminPanel(player, onBack)));
  add("§l§e管理与审计日志", "textures/ui/achievements", () => AuditManager.openAdminUI(player, () => this.openAdminPanel(player, onBack)));
  add("§l§c掉落物清理管理\n§r§8十分钟自动清理、开关与立即清理", "textures/ui/trash", () => ItemCleanupManager.openAdminMenu(player, () => this.openAdminPanel(player, onBack)));
  add("§l§d服务器运营管理", "textures/ui/op", () => OperationsManager.openAdminMenu(player, () => this.openAdminPanel(player, onBack)));
  add("§l§c打开灾害控制器\n§r§8直接进入独立灾害管理页面", "textures/ui/warning_alex", () => this.openDisasterController(player));
  add("§l§6获取灾害遥控器物品\n§r§8页面无法打开时的备用入口", "textures/ui/op", () => this.giveDisasterController(player, () => this.openAdminPanel(player, onBack)));
  add("§l§6玩家金币管理", "textures/ui/Trade2", () => this.openPlayerMoneyAdmin(player, onBack));
  add("§l§4通缉与黑名单管理\n§r§8清除通缉或一键拉黑高危玩家", "textures/ui/cancel", () => WantedManager.openAdminMenu(player, () => this.openAdminPanel(player, onBack)));
  add("§l§4强制删除当前地皮", "textures/ui/trash", () => this.forceDeleteCurrentPlot(player, onBack));
  add("§l§e发布全服公告", "textures/ui/accessibility_glyph_color", () => this.openBroadcastModal(player, onBack));
  add("§l§a全服发放福利金币", "textures/ui/gift_square", () => this.openGiftAllModal(player, onBack));
  add("§l§d自定义奖池与保底", "textures/ui/gift_square", () => LotteryManager.openAdminPoolManager(player, () => this.openAdminPanel(player, onBack)));
  if (Integration.isLotmAvailable()) {
   add("§l§5LOTM 调试控制台", "textures/items/potion_magician", () => Integration.send(player, "lotm:admin"));
  }
  add(`§l§6日常、希望报与事件管理\n§r§8${dailyEventsReady ? "已连接" : "需要启用 Daily Events BP"}`, "textures/ui/achievements", () => {
   if (!Integration.isDailyEventsAvailable()) return Utils.tell(player, "§cDaily Events 未连接。请启用最新 Survival Daily & World Events BP，并退出世界后重新进入。");
   Integration.send(player, "daily:admin");
  });
  add("§l§2返回", "textures/ui/undo", () => onBack?.());
  Utils.showForm(player, form, (res) => actions[res.selection]?.());
 }

 static openDisasterController(player) {
  Utils.tell(player, "§e正在打开独立灾害控制器……若没有出现页面，请确认独立灾害行为包已启用，或返回后领取遥控器物品。");
  Integration.send(player, "sando_standalone:menu");
 }

 static giveDisasterController(player, onBack = null) {
  try {
   player.runCommand("give @s sando_standalone:disaster_controller 1");
   Utils.tell(player, "§a已发放独立自然灾害遥控器。手持后右键/长按打开控制器。");
   AuditManager.log("admin_item_give", player, player.name, "sando_standalone:disaster_controller x1");
  } catch (error) {
   Utils.tell(player, "§c发放失败：请先在当前世界启用 Natural Disasters Standalone BP v1.3.1。也可输入 /give @p sando_standalone:disaster_controller。");
   console.warn(`[SAPI] Failed to give disaster controller: ${error}`);
  }
  onBack?.();
 }

 static openPlayerMoneyAdmin(player, onBack = null) {
  const players = world.getAllPlayers();
  const form = new ModalFormData()
   .title("§l§6玩家金币调控")
   .dropdown("§e选择玩家", players.map(p => p.name))
   .dropdown("§e操作", ["§e增加", "§e扣除", "§e设定"])
   .textField("§e金额", "1000");
  Utils.showForm(player, form, (res) => {
   if (!allowOrdinaryAction(player)) return;
   if (res.canceled) return onBack?.();
   const [playerIndex, operation, rawAmount] = res.formValues;
   const target = players[playerIndex];
   const amount = Math.floor(Number(rawAmount));
   if (!Utils.isValid(target) || !Number.isFinite(amount) || amount < 0) {
    Utils.tell(player, "§c玩家或金额无效。");
   } else {
    if (operation === 0) EconomyManager.addBalance(target, amount);
    else if (operation === 1) EconomyManager.removeBalance(target, amount);
    else EconomyManager.setBalance(target, amount);
    AuditManager.log("admin_money", player, target.name, `${["增加", "扣除", "设定"][operation]} ${amount}`);
   }
   onBack?.();
  });
 }

 static forceDeleteCurrentPlot(player, onBack = null) {
  const { chunkX, chunkZ } = Utils.getChunkCoords(player.location);
  const dimension = player.dimension.id;
  const plot = LandManager.getPlot(dimension, chunkX, chunkZ);
  if (!plot) {
   Utils.tell(player, "§e当前区块没有地皮。");
   return onBack?.();
  }
  const form = new MessageFormData().title("§l§4确认删除地皮").body(`§e${plot.name}\n§8[${chunkX}, ${chunkZ}]`).button1("§4删除").button2("§a取消");
  Utils.showForm(player, form, (res) => {
   if (!allowOrdinaryAction(player)) return;
   if (res.selection === 0) {
    LandManager.deletePlot(dimension, chunkX, chunkZ);
    AuditManager.log("admin_plot_delete", player, plot.ownerName, `${dimension} [${chunkX},${chunkZ}] ${plot.name}`);
   }
   onBack?.();
  });
 }

 static openBroadcastModal(player, onBack = null) {
  const form = new ModalFormData().title("§l§e发布公告").textField("§e内容", "服务器公告");
  Utils.showForm(player, form, (res) => {
   if (!allowOrdinaryAction(player)) return;
   const content = res.formValues?.[0]?.trim();
   if (content) {
    Utils.broadcast(`§e[管理员 ${player.name}] §e${content}`);
    AuditManager.log("admin_broadcast", player, "all", content);
   }
   onBack?.();
  });
 }

 static openGiftAllModal(player, onBack = null) {
  const form = new ModalFormData().title("§l§a全服福利").textField("§e每人金币", "1000");
  Utils.showForm(player, form, (res) => {
   if (!allowOrdinaryAction(player)) return;
   const amount = Math.floor(Number(res.formValues?.[0]));
   if (Number.isFinite(amount) && amount > 0) {
    for (const target of world.getAllPlayers()) EconomyManager.addBalance(target, amount);
    Utils.broadcast(`§a管理员发放了每人 ${Utils.formatCurrency(amount)} 的福利。`);
    AuditManager.log("admin_gift", player, "all", `每人 ${amount}，在线 ${world.getAllPlayers().length} 人`);
   }
   onBack?.();
  });
 }
}
