import { world, system } from '@minecraft/server';
const ArmorData = {
    "leather_helmet": { points: 1, location: "slot.armor.head" },
    "leather_chestplate": { points: 3, location: "slot.armor.chest" },
    "leather_leggings": { points: 2, location: "slot.armor.legs" },
    "leather_boots": { points: 1, location: "slot.armor.feet" },

    "golden_helmet": { points: 2, location: "slot.armor.head" },
    "golden_chestplate": { points: 5, location: "slot.armor.chest" },
    "golden_leggings": { points: 3, location: "slot.armor.legs" },
    "golden_boots": { points: 1, location: "slot.armor.feet" },

    "chainmail_helmet": { points: 2, location: "slot.armor.head" },
    "chainmail_chestplate": { points: 5, location: "slot.armor.chest" },
    "chainmail_leggings": { points: 4, location: "slot.armor.legs" },
    "chainmail_boots": { points: 1, location: "slot.armor.feet" },

    "iron_helmet": { points: 2, location: "slot.armor.head" },
    "iron_chestplate": { points: 6, location: "slot.armor.chest" },
    "iron_leggings": { points: 5, location: "slot.armor.legs" },
    "iron_boots": { points: 2, location: "slot.armor.feet" },

    "diamond_helmet": { points: 3, location: "slot.armor.head" },
    "diamond_chestplate": { points: 8, location: "slot.armor.chest" },
    "diamond_leggings": { points: 6, location: "slot.armor.legs" },
    "diamond_boots": { points: 3, location: "slot.armor.feet" },

    "netherite_helmet": { points: 3, location: "slot.armor.head" },
    "netherite_chestplate": { points: 8, location: "slot.armor.chest" },
    "netherite_leggings": { points: 6, location: "slot.armor.legs" },
    "netherite_boots": { points: 3, location: "slot.armor.feet" },

    "turtle_helmet": { points: 2, location: "slot.armor.head" },

    "armor:swat_helmet": { points: 6, location: "slot.armor.head" },
    "armor:swat_armor": { points: 10, location: "slot.armor.chest" },
    "armor:swat_pants": { points: 8, location: "slot.armor.legs" },
    "armor:swat_boots": { points: 4, location: "slot.armor.feet" },

    "hengker:hazmat_helmet": { points: 4, location: "slot.armor.head" },
    "armor:hazmat_suit": { points: 3, location: "slot.armor.chest" },
    "armor:hazmat_pants": { points: 2, location: "slot.armor.legs" },
    "armor:hazmat_boots": { points: 1, location: "slot.armor.feet" },

    "bridge:t4_helmet_helmet": { points: 6, location: "slot.armor.head" },
    "hengker:t4_vest": { points: 7, location: "slot.armor.chest" },

    "bridge:t3_helmet_helmet": { points: 5, location: "slot.armor.head" },
    "hengker:t3_vest": { points: 6, location: "slot.armor.chest" },

    "bridge:t2_helmet_helmet": { points: 3, location: "slot.armor.head" },
    "hengker:t2_vest": { points: 4, location: "slot.armor.chest" },

    "bridge:t1_helmet_helmet": { points: 2, location: "slot.armor.head" },
    "hengker:t1_vest": { points: 3, location: "slot.armor.chest" },

    "hengker:ghost_helmet": { points: 5, location: "slot.armor.head" },
    "hengker:advanced_vest": { points: 9, location: "slot.armor.chest" },
    "hengker:advanced_leggings": { points: 7, location: "slot.armor.legs" },
    "hengker:advanced_boots": { points: 3, location: "slot.armor.feet" }

};
const ArmorWearableEntities = [
    ""
]
export function setArmorPoints(entity) {
    if (!entity) return 0
    let updatePointsCooldown = entity.getDynamicProperty("updatePointsCooldown") || 0
    if (system.currentTick < updatePointsCooldown) return
    entity.runCommandAsync("scoreboard players set @s L4gg-armorPoints 0")
    entity.runCommandAsync("execute as @s run function getArmorPoints")
    /*
    for (const armor in ArmorData) {
        const points = ArmorData[armor].points
        const location = ArmorData[armor].location
        entity.runCommandAsync(`scoreboard players add @s[hasitem={item=${armor}, location=${location}, slot=0}] L4gg-armorPoints ${points}`)
        
    };
    */
    entity.setDynamicProperty("updatePointsCooldown", system.currentTick + 20)
    system.runTimeout(() => {
        printArmorPoints(entity)
    }, 1)

}
export function getArmorPoints(entity) {
    const objective = world.scoreboard.getObjective("L4gg-armorPoints")
    if (!objective) {
        world.scoreboard.addObjective("L4gg-armorPoints", "Armor Points")
    }
    if (!objective.hasParticipant(entity)) {
        return undefined
    }
    let score = objective.getScore(entity)
    return score

}
function printArmorPoints(entity) {
    const objective = world.scoreboard.getObjective("L4gg-armorPoints")
    let score = objective.getScore(entity)
    //console.warn("score "+score)

}