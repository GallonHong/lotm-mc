import { world, system } from "@minecraft/server";

export class DietThermoregulation {
 // 玩家当前临时 Buff: warmingBuffTicks, coolingBuffTicks
 static playerBuffs = new Map();

 /**
  * 初始化食物饮品体温调节监听
  */
 static init() {
  console.warn("[DietThermoregulation] Diet Thermoregulation System initializing...");

  if (world.afterEvents?.itemCompleteUse) {
   world.afterEvents.itemCompleteUse.subscribe((event) => {
    const { source: player, itemStack: item } = event;
    if (!player || player.typeId !== "minecraft:player" || !item) return;

    this.handleConsumption(player, item.typeId);
   });
  }
 }

 /**
  * 处理具体食物与饮品的体温调节
  */
 static handleConsumption(player, typeId) {
  if (!player || !player.isValid()) return;

  const cleanType = typeId.replace(/^[^:]+:/, "");
  const currentData = this.getBuffData(player);

  // 1. 驱寒暖身系列
  if (cleanType === "vodka") {
   currentData.warmingTicks = Math.max(currentData.warmingTicks, 20 * 180); // 3 分钟御寒 Buff
   currentData.tempOffset += 15;
   player.sendMessage("§6【暖流驱寒】烈酒入喉！全身血液沸腾，获得 3 分钟【暖身御寒】状态，抵御严寒侵袭。");
   try { player.runCommandAsync("playsound random.burp @s ~~~ 0.8 1.1"); } catch {}
   this.setBuffData(player, currentData);
   return;
  }

  if (cleanType === "ramen_cup") {
   currentData.warmingTicks = Math.max(currentData.warmingTicks, 20 * 120); // 2 分钟御寒
   currentData.tempOffset += 10;
   player.sendMessage("§e【热汤暖胃】热气腾腾的泡面下肚，寒意尽散！体温上升并持续御寒 2 分钟。");
   try { player.runCommandAsync("playsound random.burp @s ~~~ 0.8 1.2"); } catch {}
   this.setBuffData(player, currentData);
   return;
  }

  if (cleanType === "canned_beef_stew") {
   currentData.warmingTicks = Math.max(currentData.warmingTicks, 20 * 90);
   currentData.tempOffset += 8;
   player.sendMessage("§e【热量补给】浓郁的热牛肉炖罐头提供了充足能量，持续产热御寒！");
   this.setBuffData(player, currentData);
   return;
  }

  if (cleanType === "chocolate_bar") {
   currentData.warmingTicks = Math.max(currentData.warmingTicks, 20 * 60);
   currentData.tempOffset += 6;
   this.setBuffData(player, currentData);
   return;
  }

  // 2. 清凉消暑系列
  if (cleanType === "popsi_cola") {
   currentData.coolingTicks = Math.max(currentData.coolingTicks, 20 * 180); // 3 分钟消暑
   currentData.tempOffset -= 15;
   player.sendMessage("§b【冰爽消暑】畅饮冰镇百事可乐！燥热尽褪，获得 3 分钟【清凉消暑】状态，抵御高温酷暑。");
   try { player.runCommandAsync("playsound random.burp @s ~~~ 0.8 1.3"); } catch {}
   this.setBuffData(player, currentData);
   return;
  }

  if (cleanType === "bottle_water") {
   currentData.coolingTicks = Math.max(currentData.coolingTicks, 20 * 120);
   currentData.tempOffset -= 10;
   player.sendMessage("§b【补水清凉】畅饮纯净水，解除了体内燥热脱水，感觉神清气爽！");
   this.setBuffData(player, currentData);
   return;
  }

  if (cleanType === "energy_drink") {
   currentData.coolingTicks = Math.max(currentData.coolingTicks, 20 * 90);
   currentData.tempOffset -= 8;
   this.setBuffData(player, currentData);
   return;
  }

  if (cleanType === "canned_fruit") {
   currentData.coolingTicks = Math.max(currentData.coolingTicks, 20 * 60);
   currentData.tempOffset -= 6;
   this.setBuffData(player, currentData);
   return;
  }
 }

 /**
  * 获取玩家体温调节增益数据
  */
 static getBuffData(player) {
  if (!this.playerBuffs.has(player.id)) {
   this.playerBuffs.set(player.id, {
    warmingTicks: 0,
    coolingTicks: 0,
    tempOffset: 0
   });
  }
  return this.playerBuffs.get(player.id);
 }

 /**
  * 设置玩家体温调节增益数据
  */
 static setBuffData(player, data) {
  this.playerBuffs.set(player.id, data);
 }

 /**
  * 每秒更新 Buff 衰减与体温偏移衰减
  */
 static updatePlayerBuffs(player) {
  if (!player || !player.isValid()) return { hasWarming: false, hasCooling: false, tempOffset: 0 };

  const data = this.getBuffData(player);

  if (data.warmingTicks > 0) data.warmingTicks = Math.max(0, data.warmingTicks - 20);
  if (data.coolingTicks > 0) data.coolingTicks = Math.max(0, data.coolingTicks - 20);

  // 瞬间体温偏移量平滑归零衰减 (每秒衰减 1 点)
  if (data.tempOffset > 0) data.tempOffset = Math.max(0, data.tempOffset - 1);
  else if (data.tempOffset < 0) data.tempOffset = Math.min(0, data.tempOffset + 1);

  this.setBuffData(player, data);

  return {
   hasWarming: data.warmingTicks > 0,
   hasCooling: data.coolingTicks > 0,
   tempOffset: data.tempOffset
  };
 }
}
