/**
 * 喷气背包推进平衡参数（20 tick = 1 秒）。
 * 单次耐久消耗、PvP 操作限制不变。
 * 物品耐久与维修量由 items/jetpack.json 配置。
 */
export const JETPACK_TUNING = Object.freeze({
 cooldownTicks: 24,          // 原 30：1.5 秒 -> 1.2 秒
 horizontalImpulse: 0.54,   // 原 0.45：水平推进 +20%
 verticalImpulse: 1.0,      // 原 0.92：垂直推进约 +8.7%
 slowFallingTicks: 80,      // 原 70：缓降 3.5 秒 -> 4 秒
 doubleJumpWindowTicks: 12  // 保留原双跳判定窗口
});

/**
 * 机动胸甲的战斗被动。JPC 同为 8 护甲/+10 个百分点暴击，但增伤为 20%；
 * 喷气背包保留机动特色，采用较低的 12% 增伤，不额外增加终伤/爆炸减免。
 * armorPoints 必须与 items/jetpack.json 的 wearable.protection 同步。
 */
export const JETPACK_COMBAT = Object.freeze({
 armorPoints: 8,
 critChanceBonus: 0.10,
 damageBonus: 0.12
});
