import { locked } from "../pvp/PvpLifePolicy.js";
import { world, system, ItemStack } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import * as VC from "./VehicleConstants.js";
import { FuelManager } from "./FuelManager.js";
import { VehicleMenu } from "./VehicleMenu.js";

const GARAGE_PROP_KEY = "ab_ve:garage_v1";
const REPAIR_COST_PER_POINT = 30; // 每 1 点耐久维修费用 (金币)
const REFUEL_GOLD_COST = 500;  // 快捷金币加满油费用 (金币)

const VEHICLE_META = {
 "ab_ve:truck": {
  displayName: "皮卡货车",
  icon: "textures/items/blueprints/blueprint_truck.png",
  category: "car"
 },
 "ab_ve:motorcycle": {
  displayName: "越野摩托车",
  icon: "textures/items/blueprints/blueprint_motorcycle.png",
  category: "car"
 },
 "ab_ve:ambulance": {
  displayName: "战地救护车",
  icon: "textures/items/blueprints/blueprint_ambulance.png",
  category: "car"
 },
 "ab_ve:helicopter": {
  displayName: "军用直升机",
  icon: "textures/items/blueprints/blueprint_helicopter.png",
  category: "plane"
 },
 "ab_ve:speedboat": {
  displayName: "冲锋快艇",
  icon: "textures/items/blueprints/blueprint_speedboat.png",
  category: "boat"
 }
};

/**
 * 末日载具个人便携终端与车库管理器
 */
export class VehicleGarageManager {
 /**
  * 获取玩家车库数据
  * @param {Player} player 
  * @returns {Object}
  */
 static getPlayerGarage(player) {
  if (!player) return {};
  try {
   const raw = player.getDynamicProperty(GARAGE_PROP_KEY);
   if (typeof raw === "string" && raw.trim().length > 0) {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
   }
  } catch (e) {
   console.warn(`[VehicleGarage] Failed to parse garage for ${player.name}: ${e}`);
  }
  return {};
 }

 /**
  * 保存玩家车库数据
  * @param {Player} player 
  * @param {Object} garage 
  */
 static savePlayerGarage(player, garage) {
  if (!player) return false;
  try {
   player.setDynamicProperty(GARAGE_PROP_KEY, JSON.stringify(garage || {}));
   return true;
  } catch (e) {
   console.error(`[VehicleGarage] Failed to save garage for ${player.name}: ${e}`);
   return false;
  }
 }

 /**
  * 解析车型名称与元数据
  */
 static getMeta(typeId) {
  return VEHICLE_META[typeId] || {
   displayName: "未知载具",
   icon: "textures/asiagobagels/vehicles/ui/top_speed.png",
   category: "car"
  };
 }

 /**
  * 玩家手持载具生成蛋右键触发：将载具绑定至个人车库
  * @param {Player} player 
  * @param {ItemStack} item 
  * @param {string} entityType 
  */
 static bindVehicleFromItem(player, item, entityType) {
  if (locked(player, true)) return;
  if (!player || !entityType) return;

  const meta = this.getMeta(entityType);
  const garage = this.getPlayerGarage(player);

  if (garage[entityType]) {
   player.sendMessage(`§e[车库提示] 您已绑定过【${meta.displayName}】！同一型号每位幸存者仅可绑定一辆。\n§f可在指南针便携终端中随时召唤与管理。`);
   try { player.runCommandAsync("playsound note.bass @s ~~~ 0.8"); } catch {}
   return;
  }

  // 解析物品上原有 Lore 属性 (如有)
  let properties = {};
  let savedFuel = 100;
  try {
   const lore = item.getLore?.() || [];
   lore.forEach(line => {
    if (line.startsWith("§eMax Speed: §f")) {
     properties["ab_ve:max_speed"] = parseInt(line.replace("§eMax Speed: §f", ""), 10);
    } else if (line.startsWith("§eAcceleration: §f")) {
     properties["ab_ve:acceleration"] = parseInt(line.replace("§eAcceleration: §f", ""), 10);
    } else if (line.startsWith("§eSpecial: §f")) {
     properties["ab_ve:special"] = parseInt(line.replace("§eSpecial: §f", ""), 10);
    } else if (line.startsWith("§eColor ID: §f")) {
     properties["ab_ve:color"] = parseInt(line.replace("§eColor ID: §f", ""), 10);
    } else if (line.startsWith("§eFuel: §f")) {
     savedFuel = parseInt(line.replace("§eFuel: §f", ""), 10);
    }
   });
  } catch {}

  // 消耗手持物品 1 个
  try {
   const equippable = player.getComponent("minecraft:equippable");
   if (equippable) {
    const held = equippable.getEquipment("Mainhand");
    if (held && held.typeId === item.typeId) {
     if (held.amount > 1) {
      held.amount -= 1;
      equippable.setEquipment("Mainhand", held);
     } else {
      equippable.setEquipment("Mainhand", null);
     }
    }
   }
  } catch (e) {
   console.warn(`[VehicleGarage] Failed to consume item: ${e}`);
  }

  garage[entityType] = {
   typeId: entityType,
   displayName: meta.displayName,
   icon: meta.icon,
   durability: 100,
   maxDurability: 100,
   fuel: Math.max(0, Math.min(100, savedFuel || 100)),
   maxSpeedLevel: properties["ab_ve:max_speed"] || 0,
   accelerationLevel: properties["ab_ve:acceleration"] || 0,
   specialLevel: properties["ab_ve:special"] || 0,
   color: properties["ab_ve:color"] || 0,
   isSpawned: false,
   entityId: null,
   dimensionId: player.dimension.id
  };

  this.savePlayerGarage(player, garage);

  try {
   player.runCommandAsync("playsound random.levelup @s ~~~ 0.9 1.3");
  } catch {}

  player.sendMessage(`§a━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  player.sendMessage(`§l§a【载具绑定成功】§r`);
  player.sendMessage(`§f载具型号：§e${meta.displayName}§r`);
  player.sendMessage(`§f该载具已成功录入您的个人便携终端车库！`);
  player.sendMessage(`§6使用方法：手持指南针右键 -> 便携终端 -> 末日载具`);
  player.sendMessage(`§a━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
 }

 /**
  * 打开车库主列表
  * @param {Player} player 
  */
 static openGarageMenu(player) {
  if (locked(player, true)) return;
  if (!player || !player.isValid()) return;

  const garage = this.getPlayerGarage(player);
  const money = VehicleMenu.getPlayerMoney(player);
  const vehicleKeys = Object.keys(garage);

  const form = new ActionFormData()
   .title("§l§6末日载具便携终端§r")
   .body(
    `幸存者: §e${player.name} §6│ 钱包: §6${money} 金币\n` +
    `§6──────────────────────────────\n` +
    `§e车库已绑定: §a${vehicleKeys.length}§f/ 5 辆\n` +
    `§f选择载具进行召唤、召回、改装、加油或维修：`
   );

  if (vehicleKeys.length === 0) {
   form.body(
    `幸存者: §e${player.name} §6│ 钱包: §6${money} 金币\n` +
    `§6──────────────────────────────\n` +
    `§c【当前车库为空】\n` +
    `§f您尚未绑定任何末日载具！\n\n` +
    `§e[如何获得与绑定载具？]\n` +
    `§f1. 收集发动机、轮胎、底盘等零件；\n` +
    `§f2. 在工作台合成载具（皮卡、摩托、救护车等）；\n` +
    `§f3. 手持合成出的载具物品右键点击，即可自动绑定至本终端！`
   );
   form.button("§l§c关闭终端", "textures/ui/cancel");
   form.show(player);
   return;
  }

  const actions = [];
  for (const typeId of vehicleKeys) {
   const v = garage[typeId];
   const meta = this.getMeta(typeId);
   const dura = typeof v.durability === "number" ? Math.max(0, Math.min(100, v.durability)) : 100;
   const fuel = typeof v.fuel === "number" ? Math.max(0, Math.min(100, v.fuel)) : 100;

   let statusText = "§b[在库]";
   let duraColor = "§a";
   if (dura <= 0) {
    statusText = "§4[损毁]";
    duraColor = "§c";
   } else if (v.isSpawned) {
    statusText = "§e[世界中]";
   }

   if (dura <= 30) duraColor = "§c";
   else if (dura <= 70) duraColor = "§e";

   const btnText = `${meta.displayName} ${statusText}\n${duraColor}耐久: ${dura}% §6│ §a燃油: ${fuel}%`;
   form.button(btnText, meta.icon);
   actions.push(() => this.openVehicleControlPanel(player, typeId));
  }

  form.button("§l§c关闭终端", "textures/ui/cancel");
  actions.push(() => {});

  form.show(player).then(res => {
   if (locked(player, true)) return;
   if (res.canceled) return;
   actions[res.selection]?.();
  });
 }

 /**
  * 载具详细控制中心 (召唤、召回、改装工坊、加油、维修)
  * @param {Player} player 
  * @param {string} typeId 
  */
 static openVehicleControlPanel(player, typeId) {
  if (locked(player, true)) return;
  if (!player || !player.isValid()) return;

  const garage = this.getPlayerGarage(player);
  const v = garage[typeId];
  if (!v) {
   this.openGarageMenu(player);
   return;
  }

  const meta = this.getMeta(typeId);
  const money = VehicleMenu.getPlayerMoney(player);
  const dura = typeof v.durability === "number" ? Math.max(0, Math.min(100, v.durability)) : 100;
  const fuel = typeof v.fuel === "number" ? Math.max(0, Math.min(100, v.fuel)) : 100;
  const colorName = VC.VEHICLE_COLORS[v.color]?.name || "默认白色";

  // 构造耐久进度条文本
  const duraBlocks = Math.round(dura / 10);
  const duraBar = "§a" + "■".repeat(duraBlocks) + "§c" + "■".repeat(10 - duraBlocks);
  const fuelBlocks = Math.round(fuel / 10);
  const fuelBar = "§6" + "■".repeat(fuelBlocks) + "§c" + "■".repeat(10 - fuelBlocks);

  let statusDesc = "§a已停泊在个人车库中，可随时出库。";
  if (dura <= 0) {
   statusDesc = "§c载具已在外界大爆炸彻底报废！发动机报废，必须维修后才可召唤。";
  } else if (v.isSpawned) {
   statusDesc = "§e载具已在世界中投放！同一辆车不可重复创建，可一键重定位或召回。";
  }

  const missingDura = 100 - dura;
  const repairCost = missingDura > 0 ? Math.max(100, missingDura * REPAIR_COST_PER_POINT) : 0;

  const form = new ActionFormData()
   .title(`§l§6${meta.displayName} · 控制面板§r`)
   .body(
    `§f型号: §e${meta.displayName} §6│ §f车况: ${dura <= 0 ? "§c严重损毁" : v.isSpawned ? "§e在外界运行" : "§a完好在库"}\n` +
    `§f状态: ${statusDesc}\n` +
    `§6──────────────────────────────\n` +
    `§e耐久车况: ${duraBar} §f${dura}/100\n` +
    `§e燃油储量: ${fuelBar} §f${fuel}%\n` +
    `§e性能改装: §b时速 Lv.${v.maxSpeedLevel} §6│ §b加速 Lv.${v.accelerationLevel} §6│ §b特权 Lv.${v.specialLevel}\n` +
    `§e外观车漆: §f${colorName}\n` +
    `§6──────────────────────────────\n` +
    `钱包金币: §6${money} 金币`
   );

  const actions = [];

  // 按钮 1：召唤 / 传送到身边
  if (!v.isSpawned) {
   if (dura <= 0) {
    form.button("§l§c无法召唤 (载具已损毁)\n§r§f请先在下方点击【维修载具】", "textures/ui/cancel");
    actions.push(() => {
     player.sendMessage("§c[车库系统] 该载具已严重损毁，无法启动引擎！请点击【维修载具】恢复耐久度。");
     try { player.runCommandAsync("playsound note.bass @s ~~~ 0.8"); } catch {}
     this.openVehicleControlPanel(player, typeId);
    });
   } else {
    form.button("§l§a召唤载具到身边\n§r§f在当前身前位置生成载具", "textures/asiagobagels/vehicles/ui/top_speed.png");
    actions.push(() => this.summonVehicle(player, typeId));
   }
  } else {
   form.button("§l§b传送到身边 (重定位)\n§r§f载具已在世界中，拉回当前面前", "textures/ui/World");
   actions.push(() => this.summonVehicle(player, typeId));
  }

  // 按钮 2：载具召回功能 (用户特别指定新增功能)
  if (v.isSpawned) {
   form.button("§l§6召回载具到车库\n§r§f安全收回世界实体，状态同步入库", "textures/ui/undo");
   actions.push(() => this.recallVehicle(player, typeId));
  } else {
   form.button("§l§e强制校准/重置状态\n§r§f清除可能遗留在世界的游离实体", "textures/ui/undo");
   actions.push(() => this.recallVehicle(player, typeId, true));
  }

  // 按钮 3：载具改装工坊 (Wrench 菜单)
  form.button("§l§e载具改装工坊\n§r§f时速、加速、专属特权与车漆", "textures/asiagobagels/vehicles/ui/acceleration.png");
  actions.push(() => this.openUpgradeMenu(player, typeId));

  // 按钮 4：快速加注燃油
  if (fuel >= 100) {
   form.button("§l§a燃油已满 (100%)\n§r§f无需加注汽油", "textures/items/fuel/jerrycan_full");
   actions.push(() => {
    player.sendMessage("§e[油箱提示] 载具燃油已满，无需加注！");
    this.openVehicleControlPanel(player, typeId);
   });
  } else {
   form.button(`§l§6快速加注燃油\n§r§f消耗背包油桶 或 ${REFUEL_GOLD_COST} 金币加满`, "textures/items/fuel/jerrycan_full");
   actions.push(() => this.refuelVehicle(player, typeId));
  }

  // 按钮 5：维修载具耐久
  if (dura >= 100) {
   form.button("§l§a耐久已满 (100/100)\n§r§f车况良好无需维修", "textures/asiagobagels/vehicles/ui/healing.png");
   actions.push(() => {
    player.sendMessage("§a[车况提示] 载具耐久度满额，车况极佳！");
    this.openVehicleControlPanel(player, typeId);
   });
  } else {
   form.button(`§l§d维修载具车况\n§r§f恢复 100% 耐久 (费用: §e${repairCost} 金币§f)`, "textures/asiagobagels/vehicles/ui/healing.png");
   actions.push(() => this.repairVehicle(player, typeId, repairCost));
  }

  // 按钮 6：返回车库列表
  form.button("§l§2返回车库列表", "textures/ui/cancel");
  actions.push(() => this.openGarageMenu(player));

  form.show(player).then(res => {
   if (locked(player, true)) return;
   if (res.canceled) return;
   actions[res.selection]?.();
  });
 }

 /**
  * 召唤载具到身边 / 重定位
  */
 static summonVehicle(player, typeId) {
  if (locked(player, true)) return;
  if (!player || !player.isValid()) return;

  const garage = this.getPlayerGarage(player);
  const v = garage[typeId];
  if (!v) return;

  if (v.durability <= 0) {
   player.sendMessage("§c[车库系统] 载具处于损毁状态，无法召唤！请先在菜单中进行维修。");
   try { player.runCommandAsync("playsound note.bass @s ~~~ 0.8"); } catch {}
   return;
  }

  const view = player.getViewDirection();
  const spawnLoc = {
   x: player.location.x + view.x * 2.5,
   y: player.location.y + 0.1,
   z: player.location.z + view.z * 2.5
  };

  // 1. 若当前标记为已在世界中，先查找已有实体以防止重复出现 (防刷载具)
  if (v.isSpawned && v.entityId) {
   let existingEntity = null;
   try {
    existingEntity = world.getEntity(v.entityId);
   } catch {}

   if (existingEntity && existingEntity.isValid()) {
    try {
     existingEntity.teleport(spawnLoc, {
      dimension: player.dimension,
      rotation: player.getRotation()
     });
     player.sendMessage(`§a[车库系统] 已将您世界中的【${v.displayName}】重定位传送到您面前！`);
     try { player.runCommandAsync("playsound random.pop @s ~~~ 0.8 1.2"); } catch {}
     return;
    } catch (e) {
     console.warn(`[VehicleGarage] Teleport existing entity failed, will respawn: ${e}`);
    }
   }
  }

  // 2. 召唤全新实体
  try {
   const spawned = player.dimension.spawnEntity(typeId, spawnLoc);
   spawned.setRotation(player.getRotation());

   // 绑定归属标记 (以便伤害、爆炸回溯)
   spawned.setDynamicProperty("ownerId", player.id);
   spawned.setDynamicProperty("ownerName", player.name);
   spawned.setDynamicProperty("vehicleTypeId", typeId);

   // 应用改装等级
   try { spawned.setProperty("ab_ve:max_speed", v.maxSpeedLevel || 0); } catch {}
   try { spawned.setProperty("ab_ve:acceleration", v.accelerationLevel || 0); } catch {}
   try { spawned.setProperty("ab_ve:special", v.specialLevel || 0); } catch {}
   try { spawned.setProperty("ab_ve:color", v.color || 0); } catch {}

   // 应用燃油
   FuelManager.setFuel(spawned, v.fuel ?? 100);

   // 应用耐久与破损贴图
   const healthComp = spawned.getComponent("minecraft:health");
   if (healthComp) {
    const maxHp = healthComp.effectiveMax;
    const hp = Math.max(1, Math.round((v.durability / 100) * maxHp));
    try { healthComp.setCurrentValue(hp); } catch {}

    const ratio = hp / maxHp;
    let crackState = 0;
    if (ratio <= 0.33) crackState = 2;
    else if (ratio <= 0.66) crackState = 1;
    try { spawned.setProperty("ab_ve:crack_state", crackState); } catch {}
   }

   v.isSpawned = true;
   v.entityId = spawned.id;
   v.dimensionId = player.dimension.id;
   this.savePlayerGarage(player, garage);

   player.sendMessage(`§a[车库系统] 成功召唤【${v.displayName}】！同一时间仅存在此一辆。`);
   try { player.runCommandAsync("playsound random.levelup @s ~~~ 0.8 1.4"); } catch {}
  } catch (e) {
   console.error(`[VehicleGarage] Summon error: ${e}`);
   player.sendMessage(`§c[车库系统] 召唤失败，请确认面前有足够空地放置载具。`);
  }
 }

 /**
  * 召回载具到车库 (用户指定新增功能)
  * @param {Player} player 
  * @param {string} typeId 
  * @param {boolean} forceReset 
  */
 static recallVehicle(player, typeId, forceReset = false) {
  if (locked(player, true)) return;
  if (!player || !player.isValid()) return;

  const garage = this.getPlayerGarage(player);
  const v = garage[typeId];
  if (!v) return;

  let foundEntity = null;
  if (v.entityId) {
   try {
    foundEntity = world.getEntity(v.entityId);
   } catch {}
  }

  if (foundEntity && foundEntity.isValid()) {
   // 同步燃油
   try {
    v.fuel = Math.floor(FuelManager.getFuel(foundEntity));
   } catch {}

   // 同步耐久
   try {
    const healthComp = foundEntity.getComponent("minecraft:health");
    if (healthComp) {
     v.durability = Math.max(1, Math.round((healthComp.currentValue / healthComp.effectiveMax) * 100));
    }
   } catch {}

   // 同步改装等级
   try { v.maxSpeedLevel = foundEntity.getProperty("ab_ve:max_speed") ?? v.maxSpeedLevel; } catch {}
   try { v.accelerationLevel = foundEntity.getProperty("ab_ve:acceleration") ?? v.accelerationLevel; } catch {}
   try { v.specialLevel = foundEntity.getProperty("ab_ve:special") ?? v.specialLevel; } catch {}
   try { v.color = foundEntity.getProperty("ab_ve:color") ?? v.color; } catch {}

   // 若车上有乘客，强制下车
   try {
    const rideComp = foundEntity.getComponent("minecraft:rideable");
    if (rideComp) {
     for (const rider of rideComp.getRiders()) {
      try { rider.runCommandAsync("dismount"); } catch {}
     }
    }
   } catch {}

   // 若皮卡后备箱有物品，将其掉落于玩家面前，杜绝吞物
   try {
    const inv = foundEntity.getComponent("minecraft:inventory")?.container;
    if (inv) {
     for (let i = 0; i < inv.size; i++) {
      const item = inv.getItem(i);
      if (item) {
       player.dimension.spawnItem(item, player.location);
       inv.setItem(i, null);
      }
     }
    }
   } catch {}

   // 彻底移除实体
   try {
    foundEntity.remove();
   } catch {}
  }

  v.isSpawned = false;
  v.entityId = null;
  this.savePlayerGarage(player, garage);

  try {
   player.runCommandAsync("playsound beacon.deactivate @s ~~~ 0.8 1.5");
  } catch {}

  player.sendMessage(`§a[车库系统] 成功将【${v.displayName}】安全召回车库！状态与燃油已保存。`);
 }

 /**
  * 菜单内快速加油 (支持汽油桶或金币)
  */
 static refuelVehicle(player, typeId) {
  if (locked(player, true)) return;
  if (!player || !player.isValid()) return;

  const garage = this.getPlayerGarage(player);
  const v = garage[typeId];
  if (!v) return;

  if (v.fuel >= 100) {
   player.sendMessage("§e[油量提示] 载具燃油已满，无需加注！");
   return;
  }

  // 1. 优先检测背包内是否有满装汽油桶
  let usedCanister = false;
  try {
   const inv = player.getComponent("minecraft:inventory")?.container;
   if (inv) {
    for (let i = 0; i < inv.size; i++) {
     const it = inv.getItem(i);
     if (it && it.typeId === "survival_vehicle:jerrycan_full") {
      if (it.amount > 1) {
       it.amount -= 1;
       inv.setItem(i, it);
      } else {
       inv.setItem(i, null);
      }
      // 返还空油桶
      try {
       player.dimension.spawnItem(new ItemStack("survival_vehicle:jerrycan_empty", 1), player.location);
      } catch {}
      usedCanister = true;
      break;
     }
    }
   }
  } catch (e) {
   console.warn(`[VehicleGarage] Check canister error: ${e}`);
  }

  if (usedCanister) {
   v.fuel = 100;
   this.syncEntityStatsIfSpawned(v);
   this.savePlayerGarage(player, garage);
   try { player.runCommandAsync("playsound bucket.empty_water @a ~~~ 0.8 1.2"); } catch {}
   player.sendMessage(`§a[加油成功] 消耗 1 桶汽油，已将【${v.displayName}】燃油注满 (100%)！获得空汽油桶。`);
   this.openVehicleControlPanel(player, typeId);
   return;
  }

  // 2. 无汽油桶时，花费金币加油
  const money = VehicleMenu.getPlayerMoney(player);
  if (money < REFUEL_GOLD_COST) {
   player.sendMessage(`§c[加油失败] 背包中没有满装汽油桶，且金币不足！加满油需要 §e${REFUEL_GOLD_COST}§c金币，当前仅有 §e${money}§c金币。`);
   try { player.runCommandAsync("playsound note.bass @s ~~~ 0.8"); } catch {}
   this.openVehicleControlPanel(player, typeId);
   return;
  }

  if (VehicleMenu.deductPlayerMoney(player, REFUEL_GOLD_COST)) {
   v.fuel = 100;
   this.syncEntityStatsIfSpawned(v);
   this.savePlayerGarage(player, garage);
   try { player.runCommandAsync("playsound bucket.empty_water @a ~~~ 0.8 1.2"); } catch {}
   player.sendMessage(`§a[加油成功] 消耗 §e${REFUEL_GOLD_COST}§a金币通过后勤部加注，已将【${v.displayName}】燃油注满 (100%)！`);
  } else {
   player.sendMessage(`§c[加油失败] 扣费异常，请重试。`);
  }
  this.openVehicleControlPanel(player, typeId);
 }

 /**
  * 菜单内金币维修载具
  */
 static repairVehicle(player, typeId, cost) {
  if (locked(player, true)) return;
  if (!player || !player.isValid()) return;

  const garage = this.getPlayerGarage(player);
  const v = garage[typeId];
  if (!v) return;

  if (v.durability >= 100) {
   player.sendMessage("§a[维修提示] 载具耐久度满额，车况极佳，无需维修！");
   this.openVehicleControlPanel(player, typeId);
   return;
  }

  const money = VehicleMenu.getPlayerMoney(player);
  if (money < cost) {
   player.sendMessage(`§c[维修失败] 金币不足！全面修缮【${v.displayName}】需要 §e${cost}§c金币，当前仅有 §e${money}§c金币。`);
   try { player.runCommandAsync("playsound note.bass @s ~~~ 0.8"); } catch {}
   this.openVehicleControlPanel(player, typeId);
   return;
  }

  if (VehicleMenu.deductPlayerMoney(player, cost)) {
   v.durability = 100;
   this.syncEntityStatsIfSpawned(v);
   this.savePlayerGarage(player, garage);

   try {
    player.runCommandAsync("playsound random.anvil_use @s ~~~ 0.8 1.2");
    player.runCommandAsync("playsound random.levelup @s ~~~ 0.8 1.4");
   } catch {}

   player.sendMessage(`§a━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
   player.sendMessage(`§l§a【载具全面维修完成】§r`);
   player.sendMessage(`§f载具型号: §e${v.displayName}§r`);
   player.sendMessage(`§a消耗金币: §e${cost} 金币§a，车况耐久已恢复至 §e100/100§a满额状态！`);
   player.sendMessage(`§f发动机与车身已重置为出厂状态，可以随时安全召唤出库。`);
   player.sendMessage(`§a━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  } else {
   player.sendMessage("§c[维修失败] 扣费异常，请重试。");
  }
  this.openVehicleControlPanel(player, typeId);
 }

 /**
  * 载具改装工坊 (时速、加速度、特权、车漆)
  */
 static openUpgradeMenu(player, typeId) {
  if (locked(player, true)) return;
  if (!player || !player.isValid()) return;

  const garage = this.getPlayerGarage(player);
  const v = garage[typeId];
  if (!v) return;

  const meta = this.getMeta(typeId);
  const money = VehicleMenu.getPlayerMoney(player);

  const currSpeedLevel = v.maxSpeedLevel || 0;
  const currAccLevel = v.accelerationLevel || 0;
  const currSpecialLevel = v.specialLevel || 0;

  const speedList = VC.maxSpeedUpgrades[typeId] || [];
  const nextSpeed = speedList.find(u => u.level === currSpeedLevel + 1);

  const accList = VC.accelerationUpgrades[typeId] || [];
  const nextAcc = accList.find(u => u.level === currAccLevel + 1);

  const specList = VC.specialUpgrades[typeId] || [];
  const nextSpec = specList.find(u => u.level === currSpecialLevel + 1);

  const colorName = VC.VEHICLE_COLORS[v.color]?.name || "默认白色";

  const form = new ActionFormData()
   .title(`§l§6${meta.displayName} · 改装工坊§r`)
   .body(
    `§e型号: §f${meta.displayName} §6│ §e车漆: §f${colorName}\n` +
    `§e当前钱包余额: §6${money} 金币\n\n` +
    `§f选择升级项目以强化载具各项生存性能：`
   );

  // 按钮 0：最高时速
  if (nextSpeed) {
   form.button(`最高时速 [Lv.${currSpeedLevel} -> Lv.${currSpeedLevel + 1}]\n§e费用: ${nextSpeed.price} 金币`, "textures/asiagobagels/vehicles/ui/top_speed.png");
  } else {
   form.button(`最高时速 [已达顶级 Lv.${currSpeedLevel} MAX]`, "textures/asiagobagels/vehicles/ui/top_speed.png");
  }

  // 按钮 1：加速度
  if (nextAcc) {
   form.button(`动力加速 [Lv.${currAccLevel} -> Lv.${currAccLevel + 1}]\n§e费用: ${nextAcc.price} 金币`, "textures/asiagobagels/vehicles/ui/acceleration.png");
  } else {
   form.button(`动力加速 [已达顶级 Lv.${currAccLevel} MAX]`, "textures/asiagobagels/vehicles/ui/acceleration.png");
  }

  // 按钮 2：专属特权 (如有)
  const hasSpecial = specList.length > 0;
  if (hasSpecial) {
   if (nextSpec) {
    form.button(`专属特权: ${nextSpec.menu_name}\n§e费用: ${nextSpec.price} 金币`, nextSpec.icon || "textures/asiagobagels/vehicles/ui/boost.png");
   } else {
    form.button(`专属特权 [已达顶级 Lv.${currSpecialLevel} MAX]`, "textures/asiagobagels/vehicles/ui/boost.png");
   }
  }

  // 按钮 3：车漆涂装定制
  form.button(`外观车漆喷涂\n§r§f当前: §e${colorName}`, "textures/asiagobagels/vehicles/ui/storage.png");

  // 按钮 4：返回控制面板
  form.button("§l§2返回控制面板", "textures/ui/undo");

  form.show(player).then(res => {
   if (locked(player, true)) return;
   if (res.canceled) return;
   const sel = res.selection;

   if (sel === 0) {
    this.executeUpgrade(player, typeId, "maxSpeedLevel", "ab_ve:max_speed", nextSpeed, "最高时速");
   } else if (sel === 1) {
    this.executeUpgrade(player, typeId, "accelerationLevel", "ab_ve:acceleration", nextAcc, "动力加速");
   } else if (sel === 2 && hasSpecial) {
    this.executeUpgrade(player, typeId, "specialLevel", "ab_ve:special", nextSpec, nextSpec ? nextSpec.menu_name : "专属特权");
   } else if ((sel === 2 && !hasSpecial) || (sel === 3 && hasSpecial)) {
    this.openColorSelectMenu(player, typeId);
   } else {
    this.openVehicleControlPanel(player, typeId);
   }
  });
 }

 /**
  * 执行具体升级扣费
  */
 static executeUpgrade(player, typeId, garageField, propKey, nextConfig, title) {
  if (locked(player, true)) return;
  if (!nextConfig) {
   player.sendMessage("§e[改装提示] 该改装项目已升至最高等级！");
   try { player.runCommandAsync("playsound note.bell @s ~~~ 0.5"); } catch {}
   this.openUpgradeMenu(player, typeId);
   return;
  }

  const cost = nextConfig.price;
  const currentMoney = VehicleMenu.getPlayerMoney(player);

  if (currentMoney < cost) {
   player.sendMessage(`§c[改装失败] 金币不足！升级【${title}】需要 §e${cost} 金币§c，当前仅有 §e${currentMoney} 金币。`);
   try { player.runCommandAsync("playsound note.bass @s ~~~ 0.8"); } catch {}
   this.openUpgradeMenu(player, typeId);
   return;
  }

  if (VehicleMenu.deductPlayerMoney(player, cost)) {
   const garage = this.getPlayerGarage(player);
   if (garage[typeId]) {
    garage[typeId][garageField] = nextConfig.level;
    this.syncEntityStatsIfSpawned(garage[typeId]);
    this.savePlayerGarage(player, garage);
   }
   player.sendMessage(`§a[改装成功] 消耗 §e${cost} 金币§a，已将【${title}】成功升级至 Lv.${nextConfig.level}！`);
   try { player.runCommandAsync("playsound random.levelup @s ~~~ 0.8 1.2"); } catch {}
  } else {
   player.sendMessage("§c[改装异常] 扣费失败，请重试。");
  }
  this.openUpgradeMenu(player, typeId);
 }

 /**
  * 16 色车漆涂装选择菜单
  */
 static openColorSelectMenu(player, typeId) {
  if (locked(player, true)) return;
  if (!player || !player.isValid()) return;

  const garage = this.getPlayerGarage(player);
  const v = garage[typeId];
  if (!v) return;

  const form = new ActionFormData()
   .title("§l§6车漆涂装喷漆工坊§r")
   .body("§f选择心仪的战术涂装或防护面漆：");

  const colorKeys = Object.keys(VC.VEHICLE_COLORS);
  for (const cId of colorKeys) {
   const isCurrent = Number(cId) === (v.color || 0);
   form.button(`${isCurrent ? "§a" : ""}${VC.VEHICLE_COLORS[cId].name}`);
  }
  form.button("§l§2返回改装工坊", "textures/ui/undo");

  form.show(player).then(res => {
   if (locked(player, true)) return;
   if (res.canceled) return;
   const sel = res.selection;
   if (sel >= colorKeys.length) {
    this.openUpgradeMenu(player, typeId);
    return;
   }

   const chosenColor = Number(colorKeys[sel]);
   v.color = chosenColor;
   this.syncEntityStatsIfSpawned(v);
   this.savePlayerGarage(player, garage);

   player.sendMessage(`§a[涂装喷绘] 成功将车身喷涂更换为【${VC.VEHICLE_COLORS[chosenColor].name}】！`);
   try { player.runCommandAsync("playsound random.orb @s ~~~ 0.8 1.2"); } catch {}
   this.openUpgradeMenu(player, typeId);
  });
 }

 /**
  * 辅助同步：若载具已在世界中召唤，即时更新实体上的属性
  */
 static syncEntityStatsIfSpawned(v) {
  if (!v || !v.isSpawned || !v.entityId) return;
  try {
   const ent = world.getEntity(v.entityId);
   if (ent && ent.isValid()) {
    if (typeof v.maxSpeedLevel === "number") ent.setProperty("ab_ve:max_speed", v.maxSpeedLevel);
    if (typeof v.accelerationLevel === "number") ent.setProperty("ab_ve:acceleration", v.accelerationLevel);
    if (typeof v.specialLevel === "number") ent.setProperty("ab_ve:special", v.specialLevel);
    if (typeof v.color === "number") ent.setProperty("ab_ve:color", v.color);
    if (typeof v.fuel === "number") FuelManager.setFuel(ent, v.fuel);
    if (typeof v.durability === "number") {
     const healthComp = ent.getComponent("minecraft:health");
     if (healthComp) {
      const maxHp = healthComp.effectiveMax;
      const hp = Math.max(1, Math.round((v.durability / 100) * maxHp));
      healthComp.setCurrentValue(hp);
      const ratio = hp / maxHp;
      let crack = 0;
      if (ratio <= 0.33) crack = 2;
      else if (ratio <= 0.66) crack = 1;
      try { ent.setProperty("ab_ve:crack_state", crack); } catch {}
     }
    }
   }
  } catch {}
 }

 /**
  * 当实体在世界中被彻底摧毁/爆炸时回调
  * @param {string} ownerId 
  * @param {string} typeId 
  */
 static onVehicleDestroyed(ownerId, typeId) {
  if (!ownerId || !typeId) return;

  const owner = world.getAllPlayers().find(p => p.id === ownerId);
  if (owner) {
   const garage = this.getPlayerGarage(owner);
   if (garage[typeId]) {
    garage[typeId].durability = 0;
    garage[typeId].isSpawned = false;
    garage[typeId].entityId = null;
    this.savePlayerGarage(owner, garage);

    owner.sendMessage(`§c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    owner.sendMessage(`§l§4【载具损毁告警】§r`);
    owner.sendMessage(`§c您的【${garage[typeId].displayName}】遭受致命毁灭性破坏已大爆炸！`);
    owner.sendMessage(`§c车况耐久已归零（损毁状态），暂时无法再次召唤。`);
    owner.sendMessage(`§e请使用指南针打开【便携终端 -> 末日载具】，通过金币维修即可恢复出库！`);
    owner.sendMessage(`§c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    try { owner.runCommandAsync("playsound random.explode @s ~~~ 1.5 0.7"); } catch {}
   }
  }
 }

 /**
  * 当实体在世界中受到常规伤害时同步耐久度
  */
 static onVehicleDamaged(ownerId, typeId, currentHp, maxHp) {
  if (!ownerId || !typeId || maxHp <= 0) return;
  const owner = world.getAllPlayers().find(p => p.id === ownerId);
  if (owner) {
   const garage = this.getPlayerGarage(owner);
   if (garage[typeId]) {
    const ratio = Math.max(0, Math.min(1, currentHp / maxHp));
    garage[typeId].durability = Math.max(0, Math.round(ratio * 100));
    this.savePlayerGarage(owner, garage);
   }
  }
 }
}
