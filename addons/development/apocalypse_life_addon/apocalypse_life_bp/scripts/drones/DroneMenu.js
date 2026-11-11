import { locked } from "../pvp/PvpLifePolicy.js";
import { world, system, EquipmentSlot } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { DRONE_REGISTRY } from "./DroneConstants.js";
import { DroneGarageManager } from "./DroneGarageManager.js";
import { DroneClass } from "./DroneClass.js";

/**
 * 战术无人机终端全彩菜单界面 (严格执行零灰色字，全彩高对比度)
 */
export class DroneMenu {
 /**
  * 打开无人机机库主菜单
  */
 static openMainMenu(player) {
  if (!player || !player.isValid() || locked(player, true)) return;
  const hangar = DroneGarageManager.getHangarData(player);
  const droneKeys = Object.keys(hangar.drones || {});

  const activeDrone = DroneClass.getActiveDrone(player.id);
  const activeName = activeDrone ? activeDrone.config.name : "§f无伴飞僚机";

  const form = new ActionFormData()
   .title("§l§6战术无人机机库§r")
   .body(
    `§e幸存者: §f${player.name} §6│ §e当前出战: §a${activeName}\n` +
    `§6──────────────────────────────\n` +
    `§e机库总装机数: §f${droneKeys.length} 架 §6│ 当前空域规则: §f单机伴飞\n` +
    `§e注意: 无人机具备超高耐久，不可翻新修理，炸机只扣除部分耐久。\n` +
    `§6──────────────────────────────`
   );

  if (droneKeys.length === 0) {
   form.button("§l§a装配新机指南\n§r§f可在商店购买或工作台制造蓝图", "textures/ui/info");
   form.button("§l§c关闭终端", "textures/ui/cancel");
   form.show(player).then((res) => {
   if (locked(player, true)) return;
    if (res.canceled) return;
    if (res.selection === 0) {
     this.showGuideDialog(player);
    }
   });
   return;
  }

  const actions = [];

  // 遍历展示玩家机库中的所有无人机
  for (const droneId of droneKeys) {
   const data = hangar.drones[droneId];
   const conf = DRONE_REGISTRY[droneId];
   if (!conf) continue;

   const isCurrent = (activeDrone && activeDrone.droneId === droneId);
   const statusTag = data.scrapped || data.durability <= 0
    ? "§c[已报废]"
    : (isCurrent ? "§a[伴飞中]" : "§e[待命中]");

   const btnLabel = `§l${conf.tier.color}${conf.name} ${statusTag}\n§r§f耐久: §6${data.durability}/${data.maxDurability} §f│ 电量: §e${data.fuel}%`;
   const iconPath = "textures/drones/items/" + conf.entityType.replace("makercamp_dr:", "");

   form.button(btnLabel, iconPath);
   actions.push(() => this.openDroneManageMenu(player, droneId));
  }

  form.button("§l§a查看装配制造指南", "textures/ui/info");
  actions.push(() => this.showGuideDialog(player));

  form.button("§l§c关闭终端", "textures/ui/cancel");
  actions.push(() => {});

  form.show(player).then((res) => {
   if (locked(player, true)) return;
   if (res.canceled || res.selection === undefined) return;
   actions[res.selection]?.();
  });
 }

 /**
  * 单机整备与详细管理页面
  */
 static openDroneManageMenu(player, droneId) {
  if (!player || !player.isValid() || locked(player, true)) return;
  const hangar = DroneGarageManager.getHangarData(player);
  const data = hangar.drones[droneId];
  const conf = DRONE_REGISTRY[droneId];
  if (!data || !conf) return;

  const activeDrone = DroneClass.getActiveDrone(player.id);
  const isCurrent = (activeDrone && activeDrone.droneId === droneId);

  let statusText = "§e机库待命中";
  if (data.scrapped || data.durability <= 0) {
   statusText = "§c核心耐久耗尽 · 已永久报废";
  } else if (isCurrent) {
   statusText = activeDrone && activeDrone.manualMode
    ? "§b手动遥控火控中"
    : "§a当前空域伴飞巡航中";
  }

  let skillsDesc = "";
  if (conf.skills.length > 0) {
   skillsDesc = conf.skills.map((s, idx) => ` §e${idx + 1}. 【${s.name}】§f: ${s.desc}`).join("\n");
  } else {
   skillsDesc = " §f无战术主动技能，具备全自动伴飞火控自卫功能。";
  }

  if (conf.autoRevive) {
   skillsDesc += "\n §a【紧急生命协议】: 玩家倒地濒死时，自动俯冲进行心肺复苏紧急救援 (CD 60秒)。";
  }

  const form = new ActionFormData()
   .title(`§l${conf.tier.color}${conf.name} §6管理§r`)
   .body(
    `§e机型名称: ${conf.tier.color}${conf.name} §6│ 评级: ${conf.tier.color}【${conf.tier.name}】\n` +
    `§e当前状态: ${statusText}\n` +
    `§6──────────────────────────────\n` +
    `§e机体耐久: §6${data.durability} / ${data.maxDurability} §f(注:不可修理，炸机只扣固定耐久)\n` +
    `§e机载燃油: §a${data.fuel}% §6│ 基础火力: §f${conf.baseDamage} 点伤害\n` +
    `§e机体护甲: §b${conf.armor || 0} 点 §6│ §e爆炸减免: §b${Math.round((conf.blastReduction || 0) * 100)}% §f(固有装甲，按武器穿甲削减) \n` +
    `§e改装配置: §f装甲 LV${data.hpLvl || 0} §6│ §f火控 LV${data.atkLvl || 0} §6│ §f超频 LV${data.skillLvl || 0}\n` +
    `§6──────────────────────────────\n` +
    `§e战术技能载荷:\n${skillsDesc}\n` +
    `§6──────────────────────────────`
   );

  const actions = [];

  // 按钮 1：召唤出战 或 召回返航
  if (isCurrent) {
   form.button("§l§e召回返航待机\n§r§f将伴飞僚机收回机库", "textures/ui/undo");
   actions.push(() => {
    DroneGarageManager.recallDrone(player, true);
    this.openDroneManageMenu(player, droneId);
   });

   // 手动模式切换 (点击后立即进入无人机第一人称主视角)
   const manualLabel = activeDrone && activeDrone.manualMode
    ? "§l§e退出手动模式\n§r§f切回自主协同伴飞与自瞄"
    : "§l§b接管手动操控 (进入FPV视角)\n§r§f立即进入无人机第一人称视角与火控";
   form.button(manualLabel, "textures/ui/camera_glyph");
   actions.push(() => {
    // 重点：绝不重新打开管理菜单！立即直接进入无人机第一人称视角！
    DroneClass.enterManualControl(player);
   });
  } else {
   form.button("§l§a启动伴飞出战\n§r§f部署至身旁协同交火", "textures/ui/play_glyph");
   actions.push(() => {
    DroneGarageManager.summonDrone(player, droneId);
    this.openDroneManageMenu(player, droneId);
   });
  }

  // 按钮 2：加注燃油 / 电量
  form.button("§l§6加注机载燃油\n§r§f500金币或汽油桶充能至100%", "textures/items/fuel/jerrycan_full");
  actions.push(() => this.openRefuelDialog(player, droneId));

  // 按钮 3：属性科技改装
  form.button("§l§b战术属性改装\n§r§f升级机身装甲、火控与技能核心", "textures/ui/settings_glyph_color_2x");
  actions.push(() => this.openUpgradeMenu(player, droneId));

  // 按钮 4：负重货箱 (仅限骆驼货运无人机)
  if (conf.id === "camel") {
   form.button("§l§e展开机载货仓\n§r§f存取随身货运物资", "textures/ui/inventory_icon");
   actions.push(() => {
    player.sendMessage("§e[战术机库] 靠近出战的「骆驼」重载货运机右键即可打开随身保险箱。");
    this.openDroneManageMenu(player, droneId);
   });
  }

  // 按钮 5：报废拆解清理 (仅限 durability <= 0 时可用)
  if (data.scrapped || data.durability <= 0) {
   form.button("§l§c拆解报废残骸\n§r§f腾空机位(绝不返还蓝图与芯片)", "textures/ui/trash");
   actions.push(() => {
    DroneGarageManager.cleanScrappedDrone(player, droneId);
    this.openMainMenu(player);
   });
  }

  form.button("§l§2返回机库列表", "textures/ui/undo");
  actions.push(() => this.openMainMenu(player));

  form.show(player).then((res) => {
   if (locked(player, true)) return;
   if (res.canceled || res.selection === undefined) return;
   actions[res.selection]?.();
  });
 }

 /**
  * 加注燃油弹窗
  */
 static openRefuelDialog(player, droneId) {
  const form = new ActionFormData()
   .title("§l§6机载能源加注")
   .body("§f请选择加注充能方式：\n每秒消耗极低，能量低于20%将在聊天栏告警。")
   .button("§l§6消耗 500 金币一键加满\n§r§f快捷高效补充蓄电池", "textures/items/gold_ingot")
   .button("§l§e消耗手持满装汽油桶\n§r§f使用生存物资补给燃油", "textures/items/fuel/jerrycan_full")
   .button("§l§2返回上一级", "textures/ui/undo");

  form.show(player).then((res) => {
   if (locked(player, true)) return;
   if (res.canceled) return;
   if (res.selection === 0) {
    DroneGarageManager.refuelDrone(player, droneId, "gold");
    this.openDroneManageMenu(player, droneId);
   } else if (res.selection === 1) {
    DroneGarageManager.refuelDrone(player, droneId, "jerrycan");
    this.openDroneManageMenu(player, droneId);
   } else {
    this.openDroneManageMenu(player, droneId);
   }
  });
 }

 /**
  * 属性改装升级界面
  */
 static openUpgradeMenu(player, droneId) {
  const hangar = DroneGarageManager.getHangarData(player);
  const drone = hangar.drones[droneId];
  const conf = DRONE_REGISTRY[droneId];
  if (!drone || !conf) return;

  const COSTS = [1500, 3000, 5000, 8000, 12000];
  const getCost = (lvl) => (lvl >= 5 ? "已满级" : `§6${COSTS[lvl]} 金币`);

  const hpLvl = drone.hpLvl || 0;
  const atkLvl = drone.atkLvl || 0;
  const skillLvl = drone.skillLvl || 0;

  const form = new ActionFormData()
   .title(`§l§b战术改装 · ${conf.name}`)
   .body(
    `§e目标机型: ${conf.tier.color}${conf.name}\n` +
    `§6──────────────────────────────\n` +
    `通过投入研发资金升级核心子系统，改装数据永久保留至该机身：\n` +
    `§a装甲强化: 每级增加 15 点最大生命值\n` +
    `§c火控强化: 每级增加 12% 基础伤害\n` +
    `§d超频芯片: 每级缩减 8% 战术技能冷却\n` +
    `§6──────────────────────────────`
   )
   .button(`§l§a强化装甲 [LV${hpLvl}/5]\n§r§f费用: ${getCost(hpLvl)}`, "textures/ui/anvil_icon")
   .button(`§l§c强化火控 [LV${atkLvl}/5]\n§r§f费用: ${getCost(atkLvl)}`, "textures/ui/strength_effect")
   .button(`§l§d超频芯片 [LV${skillLvl}/5]\n§r§f费用: ${getCost(skillLvl)}`, "textures/ui/speed_effect")
   .button("§l§2返回上一级", "textures/ui/undo");

  form.show(player).then((res) => {
   if (locked(player, true)) return;
   if (res.canceled) return;
   if (res.selection === 0) {
    DroneGarageManager.upgradeDrone(player, droneId, "hp");
    this.openUpgradeMenu(player, droneId);
   } else if (res.selection === 1) {
    DroneGarageManager.upgradeDrone(player, droneId, "atk");
    this.openUpgradeMenu(player, droneId);
   } else if (res.selection === 2) {
    DroneGarageManager.upgradeDrone(player, droneId, "skill");
    this.openUpgradeMenu(player, droneId);
   } else {
    this.openDroneManageMenu(player, droneId);
   }
  });
 }

 /**
  * 制造与装配指南对话框
  */
 static showGuideDialog(player) {
  const form = new MessageFormData()
   .title("§l§6战术无人机装配指南")
   .body(
    "§e【如何获取与装配无人机？】\n\n" +
    "§f1. §a图纸获取:\n" +
    " - 普通型 (蜂鸟、骆驼): 可直接在工作台使用基础材料制造蓝图\n" +
    " - 特装型 (生命线、惩戒者、幽灵、神风、疾风): 在全球商店【战术无人机商】处购买\n" +
    " - 高级与典藏 (守护天使、毁灭者、极光天灾、深渊主宰等): 在幸运抽奖奖池中获取\n\n" +
    "§f2. §b配件制造:\n" +
    " - 机架: 碳纤维结构件 + 铁锭\n" +
    " - 旋翼电机: 铜锭 + 红石 + 铁粒\n" +
    " - 电池: 锂聚合物电芯 + 红石块\n" +
    " - 芯片: T1/T2/T3 分级火控计算核心\n\n" +
    "§f3. §6绑定与维护:\n" +
    " - 手持装配好的无人机右键即可绑定至机库\n" +
    " - 无人机拥有 2000~5000 点超高耐久，不可翻新修理\n" +
    " - 坠机仅扣除 70 点耐久，生命周期漫长耐用！"
   )
   .button1("§l§a我知道了", "textures/ui/confirm")
   .button2("§l§2返回机库", "textures/ui/undo");

  form.show(player).then((res) => {
   if (locked(player, true)) return;
   if (res.selection === 1) {
    this.openMainMenu(player);
   }
  });
 }
}
