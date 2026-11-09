import { MolangVariableMap, system } from '@minecraft/server';

const MAX_DISPLAY_DAMAGE = 100;

export class DamageIndicator {
 static headshots = new Set();
 static crits = new Set();

 /**
  * 标记某实体被爆头命中（用于指示器高亮显示）
  */
 static markHeadshot(entityId) {
  if (!entityId) return;
  this.headshots.add(entityId);
  system.runTimeout(() => {
   this.headshots.delete(entityId);
  }, 3);
 }

 /**
  * 标记某实体受到战术暴击（用于指示器弹出亮红暴击数字）
  */
 static markCritical(entityId) {
  if (!entityId) return;
  this.crits.add(entityId);
  system.runTimeout(() => {
   this.crits.delete(entityId);
  }, 3);
 }

 /**
  * 处理 entityHurt 事件，生成伤害弹出数字粒子
  */
 static handleEntityHurt(event) {
  if (!event) return;
  const hurtEntity = event.hurtEntity;
  const rawDamage = Number(event.damage);
  if (!hurtEntity || !rawDamage || rawDamage <= 0) return;

  let dim;
  let loc;
  try {
   dim = hurtEntity.dimension;
   loc = hurtEntity.location;
  } catch {
   return;
  }
  if (!dim || !loc) return;

  const displayDamage = Math.max(1, Math.min(MAX_DISPLAY_DAMAGE, Math.round(rawDamage)));

  const isHeadshot = this.headshots.has(hurtEntity.id);
  const isCrit = this.crits.has(hurtEntity.id);
  if (isHeadshot) {
   this.headshots.delete(hurtEntity.id);
  }
  if (isCrit) {
   this.crits.delete(hurtEntity.id);
  }

  const cause = event.damageSource?.cause;
  const color = this.getDamageColor(cause, isHeadshot || isCrit);

  try {
   const mvm = new MolangVariableMap();
   mvm.setFloat('variable.r', color.r);
   mvm.setFloat('variable.g', color.g);
   mvm.setFloat('variable.b', color.b);
   mvm.setFloat('variable.damage', displayDamage);
   mvm.setFloat('variable.frame_number', displayDamage);

   dim.spawnParticle('test_gun:damage_pop', loc, mvm);
  } catch {
   // 粒子产生失败时静默处理
  }
 }

 /**
  * 根据伤害来源和爆头状态获取显示颜色
  */
 static getDamageColor(cause, isHeadshot) {
  if (isHeadshot) {
   return { r: 255, g: 50, b: 50 }; // 暴击爆头：亮红色
  }
  if (cause === 'lava' || cause === 'magma' || cause === 'fire' || cause === 'fireTick' || cause === 'campfire' || cause === 'soulCampfire') {
   return { r: 237, g: 126, b: 57 }; // 火焰伤害：橙红色
  }
  if (cause === 'blockExplosion' || cause === 'entityExplosion') {
   return { r: 255, g: 170, b: 0 }; // 爆炸伤害：金橙色
  }
  if (cause === 'magic' || cause === 'lightning') {
   return { r: 0, g: 200, b: 80 }; // 魔法/雷电：荧光绿
  }
  if (cause === 'freezing') {
   return { r: 102, g: 237, b: 226 }; // 冰冻：冰蓝色
  }
  if (cause === 'drowning') {
   return { r: 57, g: 120, b: 220 }; // 溺水：深蓝色
  }
  if (cause === 'wither') {
   return { r: 90, g: 75, b: 85 }; // 凋零：黑紫色
  }
  if (cause === 'fall' || cause === 'thorns' || cause === 'stalagmite' || cause === 'stalactite' || cause === 'temperature' || cause === 'anvil' || cause === 'fallingBlock' || cause === 'flyIntoWall') {
   return { r: 227, g: 212, b: 209 }; // 环境/坠落：灰白色
  }

  // 默认（常规枪械、近战挥砍、普通射击等）：经典纯白色
  return { r: 255, g: 255, b: 255 };
 }
}
