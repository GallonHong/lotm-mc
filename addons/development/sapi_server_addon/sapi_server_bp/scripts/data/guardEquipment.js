// Explicit project inventory, not substring matching: firearms/tools from unknown
// addons must never acquire melee input/animation behaviour accidentally.
export const ADDON_MELEE = Object.freeze([
 'test_gun:salvage_cleaver', 'test_gun:breach_hammer', 'test_gun:pulse_spear',
 'test_gun:combat_knife', 'test_gun:tactical_shovel', 'test_gun:tactical_axe',
 'test_gun:kukri_machete', 'test_gun:katana'
]);
export const SHIELDS = Object.freeze(['minecraft:shield','test_gun:riot_shield','test_gun:flash_shield']);
export function isGuardMelee(id) {
 return ADDON_MELEE.includes(id) || /^minecraft:(wooden|stone|iron|golden|diamond|netherite)_(sword|axe)$/.test(id || '') || ['minecraft:trident','minecraft:mace'].includes(id);
}
export function guardEquipment(main, off) {
 const shield = SHIELDS.includes(off?.typeId) ? off : SHIELDS.includes(main?.typeId) ? main : null;
 if (!shield && !isGuardMelee(main?.typeId)) return null;
 return {shield:!!shield, shieldSlot:shield===off?'Offhand':shield?'Mainhand':null,
  canRoll:isGuardMelee(main?.typeId), typeId:main?.typeId || '',
  signature:JSON.stringify([main?.typeId||'',main?.getLore?.()||[],off?.typeId||'',off?.getLore?.()||[]])};
}
