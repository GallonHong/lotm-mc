/**
 * Survivor Gene Combat Attributes Contract.
 * Entity tags are visible across behavior-pack namespaces:
 *   gene:crit:<float>     // 暴击几率加成 (如 0.02, 0.04)
 *   gene:light:<float>    // 轻型枪械伤害加成 (如 0.025, 0.05)
 *   gene:heavy:<float>    // 重型枪械伤害加成 (如 0.02, 0.04)
 *   gene:melee:<float>    // 近战冷兵器伤害加成 (如 0.04, 0.08)
 *   gene:hp:<int>         // 生命上限加成 (4, 8, 12, 16, 20)
 *   gene:dr:<float>       // 综合免伤加成 (如 0.015, 0.03)
 *   gene:regen:<int>      // 脱战生命恢复等级 (1..5)
 */
export function readGeneCombatAttributes(entity) {
  const res = {
    critRate: 0,
    lightDmg: 0,
    heavyDmg: 0,
    meleeDmg: 0,
    maxHp: 0,
    damageReduction: 0,
    naturalRegen: 0
  };
  if (!entity?.getTags) return res;
  for (const tag of entity.getTags()) {
    if (typeof tag !== 'string' || !tag.startsWith('gene:')) continue;
    const parts = tag.split(':');
    if (parts.length < 3) continue;
    const key = parts[1];
    const val = Number(parts[2]);
    if (!Number.isFinite(val) || val <= 0) continue;
    if (key === 'crit') res.critRate = Math.max(res.critRate, val);
    else if (key === 'light') res.lightDmg = Math.max(res.lightDmg, val);
    else if (key === 'heavy') res.heavyDmg = Math.max(res.heavyDmg, val);
    else if (key === 'melee') res.meleeDmg = Math.max(res.meleeDmg, val);
    else if (key === 'hp') res.maxHp = Math.max(res.maxHp, Math.floor(val));
    else if (key === 'dr') res.damageReduction = Math.max(res.damageReduction, val);
    else if (key === 'regen') res.naturalRegen = Math.max(res.naturalRegen, Math.floor(val));
  }
  return res;
}
