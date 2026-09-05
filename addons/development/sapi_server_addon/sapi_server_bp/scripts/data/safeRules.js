/** 可独立测试的保险箱伤害规则。 */
export function calculateSafeDamage(rawDamage, isSpecialWeapon, normalReduction = 0.90) {
    const raw = Math.max(0, Number(rawDamage || 0));
    if (raw <= 0) return 0;
    const reduction = Math.max(0, Math.min(0.99, Number(normalReduction ?? 0.90)));
    const reduced = raw * (isSpecialWeapon ? 1 : (1 - reduction));
    return Math.max(0.1, Math.round(reduced * 10) / 10);
}
