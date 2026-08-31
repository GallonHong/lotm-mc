//code by uncxrafter
import { world, system, EntityDamageCause } from '@minecraft/server';
import { setArmorPoints, getArmorPoints } from "./setArmorPoints.js"
//import { GunSettings } from '../settings.js';
import { BulletList } from "./list.js"
world.afterEvents.projectileHitEntity.subscribe((event) => {
    const { dimension, hitVector, location, projectile, source } = event
    const hitEntity = event.getEntityHit().entity
    if (BulletList.hasOwnProperty(hitEntity)) return
    //console.warn(projectile.typeId)
    setGunDamage(source, projectile, hitEntity)
    // printStat(hitEntity, source)
})

function printStat(hitEntity, source) {
    let playerComp = source.getComponent("equippable")
    let entityComp = hitEntity.getComponent("equippable")
    source.sendMessage("player: " + JSON.stringify(playerComp) + "\n" + "hitEntity: " + JSON.stringify(entityComp))

}
function printComponents(entity, player) {
    let components = entity.getComponents()
    player.sendMessage(JSON.stringify(components, null, 2))
}

function setGunDamage(player, projectile, target) {
    //if ()
    const removeHitAmunity = true
    //GunSettings.values.removeHitImmunity.value
    ///console.warn(removeHitAmunity)
    if (!BulletList.hasOwnProperty(projectile.typeId) || !removeHitAmunity) return

    const BaseDamage = BulletList[projectile.typeId].damage
    const armorPiercing = BulletList[projectile.typeId].piercing
    setArmorPoints(target)
    let armorPoints = getArmorPoints(target)
    console.warn("armorPoints " + armorPoints)
    if (armorPoints != undefined) {
        let actualDamage = calculateDamageReduction(BaseDamage, armorPoints, armorPiercing)
        actualDamage = calculateResistanceDamage(player, actualDamage)
        damage1(target, actualDamage, player, projectile)
    } else {
        system.runTimeout(() => {
            let armorPoints = getArmorPoints(target)
            let actualDamage = calculateDamageReduction(BaseDamage, armorPoints, armorPiercing)
            actualDamage = calculateResistanceDamage(player, actualDamage)
            damage1(target, actualDamage, player, projectile)
        }, 1)
    }
}
function damage2(entity, damage, damager, projectile) {
    const healthComp = entity.getComponent("health")
    entity.applyDamage(damage, {
        cause: EntityDamageCause.override,
        damagingEntity: damager
    })

    const direction = damager.getViewDirection()
    const vertical = 0.1
    const horizontal = 0.6
    entity.applyKnockback(direction.x, direction.z, horizontal, vertical)
}
function damage1(entity, damage, damager, projectile) {
    const healthComp = entity.getComponent("health")
    const currentHealth = healthComp.currentValue
    if (damage > currentHealth) {
        damage2(entity, damage, damager, projectile)
        return
    }
    entity.applyDamage(damage, {
        cause: EntityDamageCause.override
    })
    applyKnockback(entity, damager, projectile)
}
function applyKnockback(entity, damager, projectile) {
    const direction = damager.getViewDirection()
    const vertical = BulletList[projectile.typeId].knockback.vertical
    const horizontal = BulletList[projectile.typeId].knockback.horizontal
    entity.applyKnockback(direction.x, direction.z, horizontal, vertical)
}
function calculateDamageReduction(damage, armorPoints, armorPiercingValue) {
    armorPiercingValue = Math.max(1 - armorPiercingValue, 0)
    let damageReductionPercent = armorPoints * 4;
    damageReductionPercent *= armorPiercingValue
    const damageDiminishingFactor = 12
    const diminishingFactor = Math.min(1, damage / damageDiminishingFactor);
    damageReductionPercent *= (1 - 0.1 * diminishingFactor);

    const damageReduction = (damage * damageReductionPercent) / 100;

    return damage - damageReduction;
}
function calculateResistanceDamage(player, damage) {
    let resistanceEffect = player.getEffect("resistance")
    if (!resistanceEffect) return damage
    let resistanceLevel = Math.min(resistanceEffect.amplifier + 1, 4)
    const resistanceReduction = 0.20 * resistanceLevel;
    const finalDamage = damage * (1 - resistanceReduction);
    //console.warn ("damage: "+finalDamage+" amplifier "+resistanceLevel )
    return finalDamage;
}