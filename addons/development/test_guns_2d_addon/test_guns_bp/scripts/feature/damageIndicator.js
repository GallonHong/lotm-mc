import { MolangVariableMap, system, world } from '@minecraft/server';

const MAX_DISPLAY_DAMAGE = 100;

export class DamageIndicator {
 // Cross-pack authoritative feedback is cosmetic only. Native events win;
 // confirmed fallback is shown only if the corresponding event did not draw.
 static pending = new Map();
 static serial = 0;
 static nativeEvents = [];
 static remoteSeen = new Map();
 static prunePending() {
  this.nativeEvents = this.nativeEvents.filter(e => system.currentTick-e.tick <= 24);
  for(const [key,tick] of this.remoteSeen)if(system.currentTick-tick>48)this.remoteSeen.delete(key);
  for (const [key, record] of this.pending) if (system.currentTick - record.created > 24) this.pending.delete(key);
 }
 static expectAuthoritative(nonce, shooter, target) {
  this.prunePending();
  if (this.pending.size >= 512 || this.pending.has(nonce)) return false;
  try {
   this.pending.set(nonce, { nonce, shooterId: shooter.id, targetId: target.id, created: system.currentTick,
    dimension: target.dimension, location: { ...target.location }, observed: false, displayed: false });
   return true;
  } catch { return false; }
 }
 static cancelAuthoritative(nonce) { this.pending.delete(nonce); }
 static observeAuthoritative(event) {
  this.prunePending();
  const source = event.damageSource?.damagingEntity?.id;
  // Matching includes shooter, so simultaneous opponents never consume each
  // other's receipts. Same-source native events retain emission order.
  for (const record of this.pending.values()) {
   if(record.displayed && (!Number.isInteger(record.hitTick) || Math.abs(system.currentTick-record.hitTick)>2 ||
      !Number.isFinite(record.expectedDamage) || Math.abs(Number(event.damage)-record.expectedDamage)>0.1)) continue;
   if (!record.observed && record.targetId === event.hurtEntity?.id && record.shooterId === source &&
       event.damageSource?.cause === 'override' && system.currentTick - record.created <= 24) {
    record.observed = true;
    return record;
   }
  }
  return false;
 }
 static resolveAuthoritative(nonce, applied, feedback) {
  const record = this.pending.get(nonce);
  if (!record) return;
  if (applied !== true) { this.pending.delete(nonce); return; }
  if (!feedback || feedback.targetId !== record.targetId || feedback.shooterId !== record.shooterId ||
      feedback.dimension !== record.dimension.id || !Number.isFinite(feedback.damage) || feedback.damage <= 0 ||
      !feedback.location || !['x','y','z'].every(a => Number.isFinite(feedback.location[a]))) return;
  record.hitTick = Number.isInteger(feedback.hitTick) ? feedback.hitTick : record.created;
  record.expectedDamage = feedback.damage;
  const draw = () => {
   if (this.pending.get(nonce) !== record || record.displayed || system.currentTick - record.created > 24) return;
   record.displayed = this.showDamage(record.dimension, feedback.location, feedback.damage, feedback.cause || 'override',
    feedback.headshot === true || feedback.critical === true);
  };
  // Give native entityHurt a chance to arrive; a later event is suppressed by
  // the same retained receipt, not by a target-wide cooldown.
  system.runTimeout(draw, 2);
 }
 /** Server-selected impacts may arrive after native entityHurt. Consume a
  * distinct unpaired event, never suppress all damage on a target for a tick. */
 static receiveRemoteHit(key, feedback) {
  this.prunePending();
  if(typeof key!=='string'||!key||key.length>200||this.remoteSeen.has(key)||this.remoteSeen.size>=1024||
     !feedback||typeof feedback.shooterId!=='string'||typeof feedback.targetId!=='string'||
     !Number.isInteger(feedback.hitTick)||feedback.hitTick>system.currentTick||system.currentTick-feedback.hitTick>24)return false;
  let dimension;try{dimension=world.getDimension(feedback.dimension);}catch{return false;}
  if(this.pending.size>=512)return false;
  this.remoteSeen.set(key,system.currentTick);
  const record={nonce:key,shooterId:feedback.shooterId,targetId:feedback.targetId,created:feedback.hitTick,
   dimension,location:feedback.location,observed:false,displayed:false};
  const prior=this.nativeEvents.find(e=>!e.claimed&&e.shooterId===record.shooterId&&e.targetId===record.targetId&&
   e.dimension===feedback.dimension&&Math.abs(e.tick-feedback.hitTick)<=2);
  if(prior){prior.claimed=true;record.observed=true;record.displayed=prior.shown;}
  this.pending.set(key,record);this.resolveAuthoritative(key,true,feedback);return true;
 }
 static captureHit(shooter, target, apply) {
  const nonce = `local_${system.currentTick}_${++this.serial}`;
  this.expectAuthoritative(nonce, shooter, target);
  let before;
  try { before = target.getComponent('minecraft:health')?.currentValue; } catch {}
  let applied = false;
  try { applied = apply() === true; } catch { applied = false; }
  let feedback;
  try {
   const after = target.getComponent('minecraft:health')?.currentValue;
   // Invalid/dead/unreadable targets, absorption-only damage and downing are
   // not guessed. Native event data can still display these accurately.
   if (applied && target.isValid() && Number.isFinite(before) && Number.isFinite(after) && after >= 0 && before > after &&
       !target.hasTag?.('pvp:downed') && !target.hasTag?.('apoc:downed') && !target.hasTag?.('apoc_downed')) {
    const record = this.pending.get(nonce);
    feedback = { shooterId: shooter.id, targetId: target.id, dimension: record?.dimension.id,
     location: record?.location, damage: before - after, cause: 'override',
     headshot: this.headshots.has(target.id), critical: this.crits.has(target.id), basis: 'health_loss', hitTick: system.currentTick };
   }
  } catch {}
  this.resolveAuthoritative(nonce, applied, feedback);
  return applied;
 }
 static showDamage(dim, loc, rawDamage, cause, highlighted = false) {
  if (!dim || !loc || !Number.isFinite(rawDamage) || rawDamage <= 0) return false;
  const displayDamage = Math.max(1, Math.min(MAX_DISPLAY_DAMAGE, Math.round(rawDamage)));
  const color = this.getDamageColor(cause, highlighted);
  try {
   const mvm = new MolangVariableMap();
   mvm.setFloat('variable.r', color.r); mvm.setFloat('variable.g', color.g); mvm.setFloat('variable.b', color.b);
   mvm.setFloat('variable.damage', displayDamage); mvm.setFloat('variable.frame_number', displayDamage);
   dim.spawnParticle('test_gun:damage_pop', loc, mvm);
   return true;
  } catch { return false; }
 }

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
  const authoritative = this.observeAuthoritative(event);
  if (authoritative?.displayed) return;

  let dim;
  let loc;
  try {
   dim = hurtEntity.dimension;
   loc = hurtEntity.location;
  } catch {
   dim = authoritative?.dimension; loc = authoritative?.location;
  }
  if (!dim || !loc) return;

  const isHeadshot = this.headshots.has(hurtEntity.id);
  const isCrit = this.crits.has(hurtEntity.id);
  if (isHeadshot) {
   this.headshots.delete(hurtEntity.id);
  }
  if (isCrit) {
   this.crits.delete(hurtEntity.id);
  }

  const cause = event.damageSource?.cause;
  const shown = this.showDamage(dim, loc, rawDamage, cause, isHeadshot || isCrit);
  if (authoritative) authoritative.displayed = shown;
  this.nativeEvents.push({shooterId:event.damageSource?.damagingEntity?.id,targetId:hurtEntity.id,
   dimension:dim.id,tick:system.currentTick,claimed:!!authoritative,shown});
  if(this.nativeEvents.length>512)this.nativeEvents.splice(0,this.nativeEvents.length-512);
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
