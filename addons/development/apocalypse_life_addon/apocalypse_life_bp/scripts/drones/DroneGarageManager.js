import { world, system, EquipmentSlot, EntityComponentTypes } from "@minecraft/server";
import { DRONE_REGISTRY } from "./DroneConstants.js";
import { DroneClass } from "./DroneClass.js";

const HANGAR_PROP_KEY = "ab_dr:hangar_v1";

/**
 * 战术无人机机库与生命周期管理器
 * - 个人机库存储与管理 (每人同时仅可激活一架伴飞)
 * - 超高耐久设计 (2000~5000)，绝不可翻新修理
 * - 坠机扣除固定大量耐久，耐久归零永久报废
 * - 报废残骸清理绝不返还蓝图与芯片 (保证长线经济价值)
 * - 电量分级聊天栏通信 (每消耗10%电量提醒，完全让位给枪械 Actionbar)
 */
export class DroneGarageManager {
 static lastAlertedFuelDecile = new Map(); // playerId -> number

 /**
  * 获取玩家无人机机库数据
  */
 static getHangarData(player) {
  if (!player || !player.isValid()) return { currentDrone: null, drones: {} };
  try {
   const raw = player.getDynamicProperty(HANGAR_PROP_KEY);
   if (typeof raw === "string" && raw.startsWith("{")) {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.drones === "object") {
     return parsed;
    }
   }
  } catch {}
  return { currentDrone: null, drones: {} };
 }

 /**
  * 保存玩家机库数据
  */
 static saveHangarData(player, data) {
  if (!player || !player.isValid()) return;
  try {
   player.setDynamicProperty(HANGAR_PROP_KEY, JSON.stringify(data));
  } catch (e) {
   console.error(`[DroneGarageManager] Save error: ${e}`);
  }
 }

 /**
  * 右键使用生成物品绑定至个人机库
  */
 static bindDroneFromItem(player, item, droneId) {
  if (!player || !player.isValid()) return;
  const config = DRONE_REGISTRY[droneId];
  if (!config) {
   player.sendMessage("§c[战术机库] 未知的无人机机型数据！");
   return;
  }

  const hangar = this.getHangarData(player);
  if (hangar.drones[droneId]) {
   const existing = hangar.drones[droneId];
   if (!existing.scrapped && existing.durability > 0) {
    player.sendMessage(`§e[战术机库] 你的机库中已存在一架处于完好服役期的 ${config.name}，无需重复绑定。`);
    return;
   }
  }

  // 消耗手中物品
  const eq = player.getComponent("minecraft:equippable");
  if (eq) {
   const held = eq.getEquipment(EquipmentSlot.Mainhand);
   if (held && held.typeId.includes(droneId)) {
    if (held.amount > 1) {
     held.amount -= 1;
     eq.setEquipment(EquipmentSlot.Mainhand, held);
    } else {
     eq.setEquipment(EquipmentSlot.Mainhand, null);
    }
   }
  }

  // 录入机库新机型
  hangar.drones[droneId] = {
   id: droneId,
   durability: config.maxDurability,
   maxDurability: config.maxDurability,
   fuel: 100,
   hpLvl: 0,
   atkLvl: 0,
   skillLvl: 0,
   scrapped: false,
   createdAt: Date.now()
  };

  if (!hangar.currentDrone) {
   hangar.currentDrone = droneId;
  }

  this.saveHangarData(player, hangar);

  player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  player.sendMessage(`§a【战术机库】新机型配置完成！`);
  player.sendMessage(`§f成功激活机载终端：${config.tier.color}${config.name} §r§f！`);
  player.sendMessage(`§e机身耐久: §f${config.maxDurability}/${config.maxDurability} §e│ 满电储量: §f100%`);
  player.sendMessage(`§6可在指南针便携终端【战术无人机】中随时启动伴飞。`);
  player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  player.runCommandAsync("playsound random.levelup @s ~~~ 0.8 1.4");
 }

 /**
  * 召唤无人机出击伴飞
  */
 static summonDrone(player, droneId) {
  if (!player || !player.isValid()) return false;
  const config = DRONE_REGISTRY[droneId];
  if (!config) return false;

  const hangar = this.getHangarData(player);
  const droneData = hangar.drones[droneId];

  if (!droneData) {
   player.sendMessage("§c[战术机库] 你尚未配置拥有该型号无人机！");
   return false;
  }

  if (droneData.scrapped || droneData.durability <= 0) {
   player.sendMessage(`§c[战术机库] 该 ${config.name} 机身核心耐久已耗尽，处于永久报废状态，无法出击！`);
   player.sendMessage(`§e请在机库中清理残骸，重新采购蓝图与芯片装配新机。`);
   return false;
  }

  if (droneData.fuel <= 0) {
   player.sendMessage(`§c[战术机库] 无人机机载燃油/电量耗尽，请先在菜单中加注燃油！`);
   return false;
  }

  // 召回并清理当前场上已有无人机 (每位玩家同时仅可出动一架伴飞)
  this.recallDrone(player, false);

  hangar.currentDrone = droneId;
  this.saveHangarData(player, hangar);

  // 在玩家肩膀后上方生成实体
  const pLoc = player.location;
  const spawnLoc = {
   x: pLoc.x - Math.sin((player.getRotation().y * Math.PI) / 180) * 1.5,
   y: pLoc.y + 2.2,
   z: pLoc.z + Math.cos((player.getRotation().y * Math.PI) / 180) * 1.5
  };

  try {
   const entity = player.dimension.spawnEntity(config.entityType, spawnLoc);
   entity.nameTag = `${config.tier.color}${config.name}\n§f[幸存者: ${player.name}]`;

   // 写入运行时标签
   entity.addTag(`ab_dr:owner_${player.id}`);
   entity.addTag(`ab_dr:type_${droneId}`);

   // 注册到 DroneClass 活跃驱动表
   try {
    entity.setProperty("makercamp_dr:state", "passive");
    entity.setProperty("makercamp_dr:controlled_by_player", false);
    entity.setProperty("makercamp_dr:is_shooting", false);
   } catch {}

   DroneClass.registerActiveDrone(player, entity, droneId, droneData);

   this.lastAlertedFuelDecile.set(player.id, Math.floor(droneData.fuel / 10) * 10);

   player.sendMessage(`§a[战术机载网络] ${config.tier.color}${config.name} §a已成功部署起飞，进入自动巡航伴飞状态！`);
   player.runCommandAsync("playsound makercamp_dr.drone.summon @a ~~~ 0.8 1.0");
   return true;
  } catch (e) {
   console.error(`[DroneGarageManager] Spawn error: ${e}`);
   player.sendMessage("§c[战术机库] 起飞部署失败，当前空域受阻。");
   return false;
  }
 }

 /**
  * 召回场上的无人机进入机库
  */
 static recallDrone(player, showMsg = true) {
  if (!player || !player.isValid()) return;
  const active = DroneClass.getActiveDrone(player.id);
  if (active && active.entity && active.entity.isValid()) {
   try {
    // 保存飞行消耗的数据
    const hangar = this.getHangarData(player);
    if (hangar.drones[active.droneId]) {
     hangar.drones[active.droneId].durability = active.durability;
     hangar.drones[active.droneId].fuel = active.fuel;
     this.saveHangarData(player, hangar);
    }
    active.entity.remove();
   } catch {}
  }
  DroneClass.unregisterActiveDrone(player.id);

  if (showMsg) {
   player.sendMessage("§6[战术机载网络] 无人机已安全返航进入机库待机。");
   player.runCommandAsync("playsound makercamp_dr.drone.standby_start @s ~~~ 0.8 1.0");
  }
 }

 /**
  * 加注燃油 (手持汽油桶或金币加注)
  */
 static refuelDrone(player, droneId, method = "gold") {
  if (!player || !player.isValid()) return false;
  const hangar = this.getHangarData(player);
  const drone = hangar.drones[droneId];
  if (!drone) return false;

  if (drone.fuel >= 100) {
   player.sendMessage("§e[战术机库] 机载能量蓄电池已处于 100% 满电饱和状态，无需加注。");
   return false;
  }

  if (method === "jerrycan") {
   const eq = player.getComponent("minecraft:equippable");
   const main = eq?.getEquipment(EquipmentSlot.Mainhand);
   if (!main || !main.typeId.includes("jerrycan_full")) {
    player.sendMessage("§c[战术机库] 你的主手未持有【满装汽油桶】！");
    return false;
   }
   // 消耗满油桶，返还空油桶
   eq.setEquipment(EquipmentSlot.Mainhand, null);
   try {
    const emptyCan = player.dimension.spawnItem(
     new (world.ItemStack || Object)("ab_ve:jerrycan_empty", 1),
     player.location
    );
   } catch {}
   drone.fuel = 100;
  } else {
   // 金币快捷充能 (500 金币)
   let balance = 0;
   try {
    const obj = world.scoreboard.getObjective("money");
    if (obj && player.scoreboardIdentity) {
     balance = obj.getScore(player.scoreboardIdentity) || 0;
    }
   } catch {}

   if (balance < 500) {
    player.sendMessage(`§c[战术机库] 金币不足！加注机载能量需要 500 金币，当前拥有: ${balance}`);
    return false;
   }

   try {
    world.scoreboard.getObjective("money")?.addScore(player.scoreboardIdentity, -500);
   } catch {}
   drone.fuel = 100;
  }

  // 同步活跃实体
  const active = DroneClass.getActiveDrone(player.id);
  if (active && active.droneId === droneId) {
   active.fuel = 100;
  }

  this.saveHangarData(player, hangar);
  this.lastAlertedFuelDecile.set(player.id, 100);

  player.sendMessage("§a[战术机库] 成功加注！无人机电量/燃油已恢复至 100% 满能状态。");
  player.runCommandAsync("playsound random.pop @s ~~~ 0.8 1.5");
  return true;
 }

 /**
  * 属性改装升级 (血量 / 攻击力 / 技能增幅)
  */
 static upgradeDrone(player, droneId, statType) {
  if (!player || !player.isValid()) return false;
  const hangar = this.getHangarData(player);
  const drone = hangar.drones[droneId];
  if (!drone) return false;

  const key = `${statType}Lvl`;
  const currentLvl = Number(drone[key] || 0);
  if (currentLvl >= 5) {
   player.sendMessage("§e[战术机库] 该改装项已达到顶级 (LV5) 最大性能！");
   return false;
  }

  // 升级金币费用阶梯
  const COSTS = [1500, 3000, 5000, 8000, 12000];
  const cost = COSTS[currentLvl];

  let balance = 0;
  try {
   const obj = world.scoreboard.getObjective("money");
   if (obj && player.scoreboardIdentity) {
    balance = obj.getScore(player.scoreboardIdentity) || 0;
   }
  } catch {}

  if (balance < cost) {
   player.sendMessage(`§c[战术机库] 升级资金不足！升至 LV${currentLvl + 1} 需要 §6${cost} 金币§c，当前仅有: ${balance}`);
   return false;
  }

  try {
   world.scoreboard.getObjective("money")?.addScore(player.scoreboardIdentity, -cost);
  } catch {}

  drone[key] = currentLvl + 1;
  this.saveHangarData(player, hangar);

  // 同步活跃无人机
  const active = DroneClass.getActiveDrone(player.id);
  if (active && active.droneId === droneId) {
   if (statType === "hp") active.maxHp += 15;
   if (statType === "atk") active.damageBonus += 0.12;
   if (statType === "skill") active.cdReduction += 0.08;
  }

  const statNames = { hp: "机体装甲(血量)", atk: "武器火控(攻击力)", skill: "超频芯片(技能增幅)" };
  player.sendMessage(`§a[战术改装] ${statNames[statType]} 成功升级至 §eLV${drone[key]}§a！性能已即时生效。`);
  player.runCommandAsync("playsound random.anvil_use @s ~~~ 0.7 1.2");
  return true;
 }

 /**
  * 清理报废无人机残骸 (坚决不返还芯片与蓝图，保证长期经济硬通货价值)
  */
 static cleanScrappedDrone(player, droneId) {
  if (!player || !player.isValid()) return false;
  const hangar = this.getHangarData(player);
  const drone = hangar.drones[droneId];
  if (!drone) return false;

  if (!drone.scrapped && drone.durability > 0) {
   player.sendMessage("§c[战术机库] 该无人机机体运转正常，非报废设备，无法拆解清理！");
   return false;
  }

  // 清理当前激活
  if (hangar.currentDrone === droneId) {
   hangar.currentDrone = null;
  }
  delete hangar.drones[droneId];
  this.saveHangarData(player, hangar);

  // 仅返还少量废金属，绝不返还蓝图与芯片
  try {
   player.dimension.spawnItem(
    new (world.ItemStack || Object)("survival_vehicle:scrap_metal", 2),
    player.location
   );
  } catch {}

  player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  player.sendMessage("§e[战术机库] 已成功拆解清理报废机体残骸！");
  player.sendMessage("§f机库机位已腾空，回收获得: §6废金属 x2§f（蓝图与核心芯片已随损毁蒸发）。");
  player.sendMessage("§6可在全球商店或幸运抽奖中获取新蓝图与芯片重新装配。");
  player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  player.runCommandAsync("playsound random.break @s ~~~ 0.8 1.0");
  return true;
 }

 /**
  * 无人机在世界中坠毁爆炸处理
  */
 static onDroneCrash(ownerId, droneId) {
  const player = world.getAllPlayers().find(p => p.id === ownerId);
  if (!player || !player.isValid()) return;

  const hangar = this.getHangarData(player);
  const drone = hangar.drones[droneId];
  if (!drone) return;

  // 坠毁扣除 70 点耐久 (高耐久容错，绝不一次炸毁)
  drone.durability = Math.max(0, drone.durability - 70);
  if (drone.durability <= 0) {
   drone.scrapped = true;
   player.sendMessage(`§c[机载网络警报] 无人机遭受致命殉爆！总耐久已归零，机体进入【永久报废】状态！`);
  } else {
   player.sendMessage(`§c[机载网络警报] 无人机在战斗中被击毁坠爆！机身耐久损失 70 点，当前剩余: §e${drone.durability}/${drone.maxDurability}`);
   player.sendMessage(`§e机体已自动强制召回，冷却后可重新部署。`);
  }

  this.saveHangarData(player, hangar);
  DroneClass.unregisterActiveDrone(ownerId);
 }

 /**
  * 智能低频电量通讯 (每消耗10%通过聊天栏发送一次消息，零 Actionbar 干扰)
  */
 static notifyFuelDecile(player, currentFuel) {
  if (!player || !player.isValid()) return;
  const currentDecile = Math.floor(currentFuel / 10) * 10;
  const lastDecile = this.lastAlertedFuelDecile.get(player.id) ?? 100;

  if (currentDecile < lastDecile) {
   this.lastAlertedFuelDecile.set(player.id, currentDecile);

   if (currentDecile >= 50) {
    player.sendMessage(`§b[战术机载网络] 机载能量已降至 §f${currentDecile}% §b│ 伴飞巡航正常`);
   } else if (currentDecile >= 20) {
    player.sendMessage(`§e[战术机载网络] 机载能量降至 §f${currentDecile}% §e│ 建议适时返航或加注燃油`);
    player.runCommandAsync("playsound random.pop @s ~~~ 0.6 1.2");
   } else if (currentDecile === 10) {
    player.sendMessage(`§c[战术机载网络] 机载能量严重告急 (10%) │ 即将进入低功耗强制休眠！`);
    player.runCommandAsync("playsound random.orb @s ~~~ 0.8 0.6");
   } else if (currentDecile <= 0) {
    player.sendMessage(`§c[战术机载网络] 机载能量耗尽，无人机已紧急迫降并收拢！`);
    this.recallDrone(player, false);
   }
  }
 }
}
