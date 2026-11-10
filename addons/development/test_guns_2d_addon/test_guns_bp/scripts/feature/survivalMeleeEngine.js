import { world, system, EquipmentSlot, ScriptEventSource } from '@minecraft/server';
import { SURVIVAL_MELEE } from '../data/survivalMelee.js';
import { ComboTracker, createComboAttack, createHeavyAttack } from '../vendor/fieryCombatCore.js';
import { MeleeTechniquesClient } from './meleeTechniquesClient.js';
import { EquipmentWear } from './equipmentWear.js';
import { pvpCanAttack } from './utils/pvpRules.js';

function valid(entity) {
  try { return !!entity && (typeof entity.isValid === 'function' ? entity.isValid() : entity.isValid === true); }
  catch { return false; }
}
function alive(entity) {
  try { return valid(entity) && (entity.getComponent('minecraft:health')?.currentValue ?? 0) > 0; }
  catch { return false; }
}
function canAttack(player) {
  return alive(player) && pvpCanAttack(player) && String(player.getGameMode?.()).toLowerCase() !== 'spectator';
}
function hand(player) { return player.getComponent('minecraft:equippable')?.getEquipment(EquipmentSlot.Mainhand); }
function subscribe(name, fn) {
  const signal = world.afterEvents?.[name];
  if (signal?.subscribe) signal.subscribe(fn);
}

/** Right-use combos plus a shared left-use cooldown grant. Stable API 1.15
 * cannot cancel native left damage. SAPI observes the real native hurt and adds
 * only the post-mitigation difference to the configured shared-combo total.
 * No player JSON override, movement locking, health subtraction or global prototype patches.
 */
export class SurvivalMeleeEngine {
  static combos = new ComboTracker();
  static states = new Map();
  static serial = 0;
  static initialized = false;
  static leftSnapshots = new Map();
  static leftGrants = new Map();

  static init() {
    if (this.initialized) return;
    this.initialized = true;
    MeleeTechniquesClient.init();
    const use = event => {
      try { this.start(event.source, event.itemStack); }
      catch (error) { console.warn('[Survival Melee] use:', error); }
    };
    // Both are emitted by some clients. start() de-duplicates using one active attack/recovery.
    subscribe('itemUse', use);
    subscribe('itemStartUse', use);
    subscribe('entityHitEntity', event => this.leftHit(event));
    subscribe('playerLeave', event => this.clear(event.playerId));
    subscribe('entityDie', event => {
      const id = event.deadEntity?.id;
      if (id) this.clear(id);
    });
    system.afterEvents?.scriptEventReceive?.subscribe(event => this.acceptApproval(event));
    system.runInterval(() => this.tick(), 1);
  }

  static clear(id) {
    const state = this.states.get(id);
    if (state) this.combos.reset(state.player);
    this.states.delete(id);
    this.leftSnapshots.delete(id);
    const grant=this.leftGrants.get(id);
    try { grant?.player.removeTag(grant.tag); } catch {}
    this.leftGrants.delete(id);
    MeleeTechniquesClient.clear(id);
  }

  static start(player, item) {
    const spec = SURVIVAL_MELEE[item?.typeId];
    if (!spec || !canAttack(player)) return false;
    const held = hand(player);
    if (held?.typeId !== item.typeId) return false;
    this.prepareIdentity(player,held);
    const now = system.currentTick;
    let state = this.states.get(player.id);
    if (!state) {
      state = { player, readyAt: 0, heavyReady: new Map(), pending: null };
      this.states.set(player.id, state);
    }
    if (state.pending || now < state.readyAt) return false;
    const heavy = !!player.isSneaking;
    if (heavy && now < (state.heavyReady.get(item.typeId) || 0)) {
      player.onScreenDisplay?.setActionBar?.(`§e重击冷却 ${Math.ceil((state.heavyReady.get(item.typeId) - now) / 20)} 秒`);
      return false;
    }
    const mode = heavy ? { ...spec, ...spec.heavy } : spec;
    const index = this.combos.next(player, item.typeId, spec.damage.length).index - 1;
    const attack = { attackCategory: heavy ? 'heavy' : 'combo', movementSpeed: 1, damagingDuration: mode.windup / 20 };
    const args = { attack, itemStack: held, selectedSlotIndex: player.selectedSlotIndex,
      comboIndex: index, comboTotal: spec.damage.length, currentTick: now, attackSpeed: 1 };
    // The original Fiery Combat functions construct the hit timing and combo descriptor.
    const pending = heavy ? createHeavyAttack(args) : createComboAttack(args);
    Object.assign(pending, { typeId: item.typeId, spec, mode, heavy, index,
      identity: EquipmentWear.identity(held), initialWear: held.getComponent('minecraft:durability')?.damage ?? 0,
      dimensionId: player.dimension.id, context: EquipmentWear.context(player), resolved: false });
    state.pending = pending;
    state.readyAt = now + mode.windup + mode.recovery;
    if (heavy) state.heavyReady.set(item.typeId, now + spec.heavy.cooldown);
    else this.combos.record(player, item.typeId, index, spec.damage.length);
    if (heavy) this.combos.reset(player);
    if (!MeleeTechniquesClient.begin(player,pending,(accepted,hits)=>{
      if(accepted&&this.sameAttack(player,pending))this.wear(player,pending);
      if(!accepted||hits===0)this.combos.reset(player);
    })) {state.pending=null;this.combos.reset(player);return false;}
    try {
      player.dimension.playSound(heavy ? 'random.anvil_use' : spec.sound, player.location,
        { volume: heavy ? 0.65 : 0.7, pitch: heavy ? 0.8 : 1.05 + index * 0.1 });
    } catch {}
    player.onScreenDisplay?.setActionBar?.(`§b${spec.name} §7${heavy ? '重击准备' : `连击 ${index + 1}/${spec.damage.length}`}`);
    return true;
  }

  static prepareIdentity(player,item) {
    try{
      const lore=item.getLore?.()||[],ids=lore.filter(x=>x.startsWith('SM_ID:'));
      if(ids.length!==1){
        const markers=lore.filter(x=>x.startsWith('PVP_MATCH:'));if(markers.length>18)return;
        const token=`SM_ID:${Date.now()}_${system.currentTick}_${++this.serial}`;
        item.setLore([...lore.filter(x=>!x.startsWith('SM_ID:')&&!x.startsWith('PVP_MATCH:')).slice(0,19-markers.length),token,...markers]);
        player.getComponent('minecraft:equippable').setEquipment(EquipmentSlot.Mainhand,item);
      }
      // Establish the shared epoch after identity initialization, including a
      // fresh weapon used only with left input. Read back the committed hand.
      MeleeTechniquesClient.ensure(player,hand(player));
    }catch{}
  }

  static leftHit(event) {
    const p=event?.damagingEntity,t=event?.hitEntity;
    if(p?.typeId!=='minecraft:player'||!t||!canAttack(p))return false;
    const item=hand(p),spec=SURVIVAL_MELEE[item?.typeId];if(!spec)return false;
    const now=system.currentTick;
    let state=this.states.get(p.id);
    if(state?.pending){state.pending=null;MeleeTechniquesClient.clear(p.id);this.combos.reset(p);return false;}
    if(state&&now<state.readyAt)return false;
    const marker=(item.getLore?.()||[]).filter(x=>x.startsWith('SM_ID:'));
    if(marker.length!==1)return false; // A first-frame pickup initializes on tick; no guessed identity.
    state=state||{player:p,readyAt:0,heavyReady:new Map(),pending:null};
    state.readyAt=now+spec.windup+spec.recovery;this.states.set(p.id,state);
    const index=this.combos.next(p,item.typeId,spec.damage.length).index-1;
    const tag=`tg_melee_left:${now}:${p.selectedSlotIndex}:${t.id}:${index}`;
    if(tag.length>240)return false;
    try {
      for(const old of p.getTags())if(old.startsWith('tg_melee_left:'))p.removeTag(old);
      p.addTag(tag);this.leftGrants.set(p.id,{player:p,tag,tick:now,accepted:false});
      this.combos.record(p,item.typeId,index,spec.damage.length);
    }catch{return false;}
    const before=this.leftSnapshots.get(p.id),identity=EquipmentWear.identity(item);
    // Native durability wins. Only top up if the pre-hit snapshot proves no
    // native charge occurred. Never add a second charge or repair native wear.
    if(before&&now-before.tick<=1&&before.slot===p.selectedSlotIndex&&before.identity===identity)system.run(()=>{
      try{const current=hand(p),d=current?.getComponent('minecraft:durability');
        if(!d||String(p.getGameMode?.())==='creative'||p.selectedSlotIndex!==before.slot||EquipmentWear.identity(current)!==identity||d.damage!==before.damage)return;
        let level=current.getComponent('minecraft:enchantable')?.getEnchantment('unbreaking')?.level||0;
        if(Math.random()>=1/(level+1))return;d.damage++;
        p.getComponent('minecraft:equippable').setEquipment(EquipmentSlot.Mainhand,d.damage>=d.maxDurability?undefined:current);
      }catch{}
    });
    return true;
  }

  static sameAttack(player, attack) {
    if (!canAttack(player) || player.selectedSlotIndex !== attack.selectedSlotIndex ||
        player.dimension.id !== attack.dimensionId || EquipmentWear.context(player) !== attack.context) return false;
    const held = hand(player);
    return held?.typeId === attack.typeId && EquipmentWear.identity(held) === attack.identity &&
      (held.getComponent('minecraft:durability')?.damage ?? 0) === attack.initialWear;
  }

  static tick() {
    MeleeTechniquesClient.prune();
    const now = system.currentTick;
    for (const [id,g] of this.leftGrants) if (now-g.tick>4) {try{g.player.removeTag(g.tag);}catch{}if(!g.accepted)this.combos.reset(g.player);this.leftGrants.delete(id);}
    // Cache pre-native durability and a shared unique identity while held.
    for (const p of world.getAllPlayers?.() || []) {
      const item=hand(p);if(!SURVIVAL_MELEE[item?.typeId]){
        if(this.leftSnapshots.has(p.id))this.combos.reset(p);
        this.leftSnapshots.delete(p.id);
        const grant=this.leftGrants.get(p.id);if(grant){try{p.removeTag(grant.tag);}catch{}this.leftGrants.delete(p.id);}
        continue;
      }
      try {
        if(!(this.states.get(p.id)?.pending))this.prepareIdentity(p,item);
        const previous=this.leftSnapshots.get(p.id),currentIdentity=EquipmentWear.identity(item);
        if(previous&&(previous.identity!==currentIdentity||previous.slot!==p.selectedSlotIndex)){
          this.combos.reset(p);const grant=this.leftGrants.get(p.id);if(grant){try{p.removeTag(grant.tag);}catch{}this.leftGrants.delete(p.id);}
        }
        this.leftSnapshots.set(p.id,{identity:EquipmentWear.identity(item),damage:item.getComponent('minecraft:durability')?.damage??0,tick:now,slot:p.selectedSlotIndex});
      }catch{}
    }
    for (const [id, state] of this.states) {
      try {
        if (!alive(state.player)) { this.clear(id); continue; }
        const attack = state.pending;
        if (!attack) {
          if (now > state.readyAt + 200) this.clear(id);
          continue;
        }
        if (!this.sameAttack(state.player, attack)) {
          state.pending = null;
          MeleeTechniquesClient.clear(id);
          this.combos.reset(state.player);
          continue;
        }
        if (now < attack.damagingTick) continue;
        state.pending = null; // Clear before any callback to prevent re-entrancy/double damage.
        this.resolve(state.player, attack);
      } catch (error) {
        this.clear(id);
        console.warn('[Survival Melee] tick:', error);
      }
    }
  }

  static acceptApproval(event) {
    if(event.id==='tg:melee_left_result'&&event.sourceType===ScriptEventSource.Server&&!event.sourceEntity&&!event.sourceBlock){
      try{const r=JSON.parse(event.message),g=this.leftGrants.get(r.playerId);if(g&&g.tick===r.tick){g.accepted=r.accepted===true;if(!g.accepted)this.combos.reset(g.player);}}catch{}
      return;
    }
  }

  static wear(player, attack) {
    if (String(player.getGameMode?.()).toLowerCase() === 'creative') return;
    const eq = player.getComponent('minecraft:equippable'), held = hand(player);
    if (!held || EquipmentWear.identity(held) !== attack.identity) return;
    const durability = held.getComponent('minecraft:durability');
    if (!durability) return;
    let level = 0;
    try { level = held.getComponent('minecraft:enchantable')?.getEnchantment('unbreaking')?.level || 0; } catch {}
    let wear = 0;
    for (let i = 0; i < (attack.heavy ? 3 : 1); i++) if (Math.random() < 1 / (level + 1)) wear++;
    const next = durability.damage + wear;
    if (next >= durability.maxDurability) {
      eq.setEquipment(EquipmentSlot.Mainhand, undefined);
      try { player.dimension.playSound('random.break', player.location); } catch {}
    } else if (wear) {
      durability.damage = next;
      eq.setEquipment(EquipmentSlot.Mainhand, held);
    }
  }

  static resolve(player, attack) {
    if (!this.sameAttack(player, attack)) {this.combos.reset(player);MeleeTechniquesClient.clear(player.id);return;}
    if(!MeleeTechniquesClient.resolve(player,attack))this.combos.reset(player);
  }
}

system.run(() => SurvivalMeleeEngine.init());
