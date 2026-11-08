import * as mc from "@minecraft/server"
import {
    menuMain,
    setupStaticMenus
} from "./pb_dmgi_menu";
import {
    openDummyMenu,
    setupStaticDummyMenus
} from "./pb_dmgi_dummy_menu";

export const VERSION = "1.0.0";

const MAX_DAMAGE = 100;

const hurt_enemy_types = ["pb_dmgi:training_dummy", "pb_dmgi:chicken_dummy", "pb_dmgi:cow_dummy", "pb_dmgi:dragon_dummy", "pb_dmgi:skeleton_dummy", "pb_dmgi:wither_dummy", "pb_dmgi:zombie_dummy", "pb_dmgi:enderman_dummy"]
const FONT = [
    "pb_dmgi:font_1",
    "pb_dmgi:font_3",
    "pb_dmgi:font_4",
    "pb_dmgi:font_5",
    "pb_dmgi:font_7",
    "pb_dmgi:font_9",
    "pb_dmgi:none_hit"
];

const STYLES = ["_ascend", "_pop", "_freeze", "_gravity", "_spin"];

const SOUND = [
    "pb_dmgi.none",
    "pb_dmgi.woosh",
    "pb_dmgi.slash",
    "pb_dmgi.boing",
    "pb_dmgi.duck",
    "pb_dmgi.squeak"
];

const SOUND_OPTIONS = {
    pitch: 1.0,
    volume: 1.0,
};

const COLORS = [{
        r: 255,
        g: 255,
        b: 255
    }, //white
    {
        r: 255,
        g: 223,
        b: 97
    }, //yellow
    {
        r: 252,
        g: 68,
        b: 35
    }, //red
    {
        r: 32,
        g: 242,
        b: 252
    }, //blue
    {
        r: 220,
        g: 35,
        b: 252
    }
]; //purple

const EFFECTS = ["pb_dmgi:none_hit",
    "pb_dmgi:cross_hit",
    "pb_dmgi:hit_flowers",
    "pb_dmgi:hit_hearts",
    "pb_dmgi:hit_stars",
    "pb_dmgi:hit_comic",
    "pb_dmgi:explosion",
    "pb_dmgi:hit_sparks",
    "pb_dmgi:hit_lightning",
    "pb_dmgi:hit_cards"
];

export let font;
export let style;
export let sound;
export let color_default;
export let color_fire;
export let color_magic;
export let color_environmental;
export let color_explosion;
export let color_wither;
export let effect;

initAddOn();
itemUseListener();
scriptEventListener();
initJigCompuersIntegration();
setupStaticMenus();
setupStaticDummyMenus();
dropGuidebook();

damageListener();

function damageListener() {

    mc.world.afterEvents.entityHurt.subscribe((eventData) => {

        spawnDamageParticle(eventData.damage, eventData.hurtEntity, eventData.damageSource);
        if (sound > 0) {
            let evt_location = eventData.hurtEntity.location;
            mc.world.playSound(SOUND[sound], evt_location, SOUND_OPTIONS);
        }

        if (hurt_enemy_types.includes(eventData.hurtEntity.typeId)) {
            let damage = eventData.damage;
            if (damage > 0 && damage <= 5) eventData.hurtEntity.runCommandAsync("playanimation @s hurt_1");
            if (damage > 5 && damage <= 10) eventData.hurtEntity.runCommandAsync("playanimation @s hurt_2");
            if (damage > 10) eventData.hurtEntity.runCommandAsync("playanimation @s hurt_3");

            updateDummyStats(eventData.hurtEntity, Math.round(damage));
        }
    })
}

function updateDummyStats(entity, damage) {
    let damage_total = entity.getDynamicProperty("damage_total");
    let damage_max = entity.getDynamicProperty("damage_max");

    if (damage_total === undefined) damage_total = 0;
    if (damage_max === undefined) damage_max = 0;

    damage_total = damage_total + damage;
    if (damage > damage_max) damage_max = damage;

    entity.setDynamicProperty("damage_total", damage_total);
    entity.setDynamicProperty("damage_max", damage_max);
}

function spawnDamageParticle(damage, entity, source) {

    let evt_location = entity.location;
    let mvm = new mc.MolangVariableMap();
    let display_damage = Math.round(damage);

    updateComputerStats(display_damage);

    if (display_damage > MAX_DAMAGE) display_damage = MAX_DAMAGE;

    let color = getDamageColor(source.cause);
    mvm.setFloat(`variable.r`, color.r);
    mvm.setFloat(`variable.g`, color.g);
    mvm.setFloat(`variable.b`, color.b);
    mvm.setFloat(`variable.damage`, display_damage);
    mvm.setFloat(`variable.frame_number`, display_damage);

    try {
        mc.world.getDimension(entity.dimension.id).spawnParticle("" + FONT[font] + STYLES[style], evt_location, mvm);
        mc.world.getDimension(entity.dimension.id).spawnParticle(EFFECTS[effect], evt_location, mvm);
        if (effect == 6) {
            mc.world.getDimension(entity.dimension.id).spawnParticle("pb_dmgi:explosion_ember", evt_location, mvm);
            mc.world.getDimension(entity.dimension.id).spawnParticle("pb_dmgi:explosion_sparks", evt_location, mvm);
        }
    } catch (error) {};
}

function updateComputerStats(damage) {
    mc.world.scoreboard.getObjective("pb_dmgi:jig_computer.addon_stats").addScore("pb_dmgi:stat_total_damage", damage);
    const damage_max = mc.world.scoreboard.getObjective("pb_dmgi:jig_computer.addon_stats").getScore("pb_dmgi:stat_max_damage");
    if (damage > damage_max) mc.world.scoreboard.getObjective("pb_dmgi:jig_computer.addon_stats").setScore("pb_dmgi:stat_max_damage", damage);

}

function getDamageColor(cause) {
    if (cause == "lava" || cause == "magma" || cause == "fire" || cause == "fireTick" || cause == "campfire" || cause == "soulCampfire") return {
        r: 237,
        g: 126,
        b: 57
    };
    if (cause == "fall" || cause == "thorns" || cause == "stalagmite" || cause == "stalactite" || cause == "temperature" || cause == "piston" || cause == "anvil" || cause == "fallingBlock" || cause == "flyintoWall") return {
        r: 227,
        g: 212,
        b: 209
    };
    if (cause == "magic" || cause == "lightning") return {
        r: 0,
        g: 170,
        b: 0
    };
    if (cause == "blockExplosion" || cause == "entityExplosion") return {
        r: 255,
        g: 170,
        b: 0
    };
    if (cause == "freezing") return {
        r: 102,
        g: 237,
        b: 226
    };
    if (cause == "drowning") return {
        r: 57,
        g: 101,
        b: 204
    };
    if (cause == "wither") return {
        r: 68,
        g: 58,
        b: 58
    };

    return {
        r: 255,
        g: 255,
        b: 255
    };
}

function itemUseListener() {

    mc.world.afterEvents.itemUse.subscribe((eventData) => {
        let player = eventData.source;
        let itemUse = eventData.itemStack;
        if (itemUse === undefined) return;
        if (itemUse.typeId == "pb_dmgi:guidebook") menuMain(player);
    })
}

function scriptEventListener() {
    mc.system.afterEvents.scriptEventReceive.subscribe((eventData) => {
        const {
            id,
            sourceEntity,
            message
        } = eventData;
        if (sourceEntity == null) return;

        if (id == "pb_dmgi:dummy_menu") {
            let player = mc.world.getPlayers().find(player => player.name === message);
            openDummyMenu(player, sourceEntity);
        }
    })
}

function initAddOn() {
    if (mc.world.scoreboard.getObjective("pb_dmgi_config") === undefined) mc.world.scoreboard.addObjective("pb_dmgi_config", "pb_dmgi_config");
    mc.world.scoreboard.getObjective("pb_dmgi_config").addScore("font", 0);
    mc.world.scoreboard.getObjective("pb_dmgi_config").addScore("style", 0);
    mc.world.scoreboard.getObjective("pb_dmgi_config").addScore("effect", 0);
    mc.world.scoreboard.getObjective("pb_dmgi_config").addScore("sound", 0);

    mc.world.scoreboard.getObjective("pb_dmgi_config").addScore("color", 0);
    mc.world.scoreboard.getObjective("pb_dmgi_config").addScore("color_default", 0);
    mc.world.scoreboard.getObjective("pb_dmgi_config").addScore("color_fire", 0);
    mc.world.scoreboard.getObjective("pb_dmgi_config").addScore("color_magic", 0);
    mc.world.scoreboard.getObjective("pb_dmgi_config").addScore("color_environmental", 0);
    mc.world.scoreboard.getObjective("pb_dmgi_config").addScore("color_explosion", 0);
    mc.world.scoreboard.getObjective("pb_dmgi_config").addScore("color_wither", 0);

    mc.world.scoreboard.getObjective("pb_dmgi_config").addScore("effect", 0);

    font = mc.world.scoreboard.getObjective("pb_dmgi_config").getScore("font");
    style = mc.world.scoreboard.getObjective("pb_dmgi_config").getScore("style");
    sound = mc.world.scoreboard.getObjective("pb_dmgi_config").getScore("sound");
    color_default = mc.world.scoreboard.getObjective("pb_dmgi_config").getScore("color");
    effect = mc.world.scoreboard.getObjective("pb_dmgi_config").getScore("effect");

    if (mc.world.scoreboard.getObjective("pb_dmgi_dmg_total") === undefined) mc.world.scoreboard.addObjective("pb_dmgi_dmg_total", "pb_dmgi_dmg_total");
    if (mc.world.scoreboard.getObjective("pb_dmgi_dmg_dps") === undefined) mc.world.scoreboard.addObjective("pb_dmgi_dmg_dps", "pb_dmgi_dmg_dps");
    if (mc.world.scoreboard.getObjective("pb_dmgi_dmg_max") === undefined) mc.world.scoreboard.addObjective("pb_dmgi_dmg_max", "pb_dmgi_dmg_max");
    if (mc.world.scoreboard.getObjective("pb_dmgi_armor") === undefined) mc.world.scoreboard.addObjective("pb_dmgi_armor", "pb_dmgi_armor");
}

export function updateConfig() {
    mc.system.runTimeout(() => {
        font = mc.world.scoreboard.getObjective("pb_dmgi_config").getScore("font");
        style = mc.world.scoreboard.getObjective("pb_dmgi_config").getScore("style");
        sound = mc.world.scoreboard.getObjective("pb_dmgi_config").getScore("sound");
        color_default = mc.world.scoreboard.getObjective("pb_dmgi_config").getScore("color");
        effect = mc.world.scoreboard.getObjective("pb_dmgi_config").getScore("effect");
    }, 10);
}

function initJigCompuersIntegration() {
    if (mc.world.scoreboard.getObjective("pb_dmgi:jig_computer.addon_stats") === undefined) mc.world.scoreboard.addObjective("pb_dmgi:jig_computer.addon_stats", "pb_dmgi:jig_computer.addon_stats");
    mc.world.scoreboard.getObjective("pb_dmgi:jig_computer.addon_stats").addScore("pb_dmgi:stat_total_damage", 0);
    mc.world.scoreboard.getObjective("pb_dmgi:jig_computer.addon_stats").addScore("pb_dmgi:stat_max_damage", 0);
}

function dropGuidebook() {
    mc.world.afterEvents.playerSpawn.subscribe((eventData) => {
        if (eventData.player.hasTag('pb_dmgi_book')) {} else {
            mc.world.getDimension(eventData.player.dimension.id).spawnItem(new mc.ItemStack("pb_dmgi:guidebook", 1), eventData.player.location);
            eventData.player.addTag('pb_dmgi_book');
        }
    })
}
