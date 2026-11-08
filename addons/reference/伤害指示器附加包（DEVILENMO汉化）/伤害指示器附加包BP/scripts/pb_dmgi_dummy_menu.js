import * as mc from "@minecraft/server";
import * as ui from "@minecraft/server-ui";
import * as main from "./pb_dmgi_main";

const SOUND_TURN_PAGE = "item.book.page_turn";
const SOUND_RESET = "random.click";
const SOUND_DISMANTLE = "mob.armor_stand.break";
const SOUND_CUSTOMIZE = "random.anvil_use";
const SOUND_OPTIONS = {
    pitch: 1.0,
    volume: 5.0,
};

const ARMOR_OPTIONS = ["§fNo Armor", "§nLeather Armor", "§pGold Armor", "§iIron Armor", "§sDiamond Armor"];
const MENU_CONFIRM_DISMANTLE = new ui.ActionFormData();
const MENU_CONFIRM_RESET = new ui.ActionFormData();

export function setupStaticDummyMenus() {

    MENU_CONFIRM_DISMANTLE.title("确认");
    MENU_CONFIRM_DISMANTLE.body("要拆除这个假人吗？");
    MENU_CONFIRM_DISMANTLE.button("是", "textures/pb/dmgi/items/icon_yes");
    MENU_CONFIRM_DISMANTLE.button("否", "textures/pb/dmgi/items/icon_no");

    MENU_CONFIRM_RESET.title("确认");
    MENU_CONFIRM_RESET.body("重置假人统计数据？");
    MENU_CONFIRM_RESET.button("是", "textures/pb/dmgi/items/icon_yes");
    MENU_CONFIRM_RESET.button("否", "textures/pb/dmgi/items/icon_no");
}

export function openDummyMenu(player, dummy) {
    player.playSound(SOUND_TURN_PAGE, SOUND_OPTIONS);

    let damage_total = dummy.getDynamicProperty("damage_total");
    let damage_max = dummy.getDynamicProperty("damage_max");

    if (damage_total === undefined) damage_total = 0;
    if (damage_max === undefined) damage_max = 0;

    let armor = mc.world.scoreboard.getObjective("pb_dmgi_armor").getScore(dummy);

    let menu_dummy_main = new ui.ActionFormData();
    menu_dummy_main.title({
        translate: "entity." + dummy.typeId + ".name"
    });
    menu_dummy_main.body("\n§r承受的总伤害：§b§l" + damage_total +
        " \n§r单次命中的最高伤害：§6§l" + damage_max +
        "\n§r伤害抗性：" + ARMOR_OPTIONS[armor] + "\n\n\n");

    menu_dummy_main.button("重置假人统计数据", "textures/pb/dmgi/items/icon_reset");
    menu_dummy_main.button("自定义假人", "textures/pb/dmgi/items/customize");
    menu_dummy_main.button("拆除假人", "textures/pb/dmgi/items/icon_dismantle");

    menu_dummy_main.show(player).then(result => {
        if (result.canceled) return;

        let response = result.selection;
        switch (response) {
            case 0:
                confirmReset(player, dummy);
                break;
            case 1:
                menuCustomizeDummy(player, dummy);
                break;
            case 2:
                confirmDismantle(player, dummy);
                break;
            default:
                break;
        }
    });
}

function menuCustomizeDummy(player, dummy) {
    player.playSound(SOUND_TURN_PAGE, SOUND_OPTIONS);

    let armor = mc.world.scoreboard.getObjective("pb_dmgi_armor").getScore(dummy);

    let form = new ui.ModalFormData()
    form.title("自定义假人");

    form.dropdown("伤害抗性等级", ARMOR_OPTIONS, armor);

    form.show(player).then(result => {
        if (result.canceled) return;

        mc.world.scoreboard.getObjective("pb_dmgi_armor").setScore(dummy, result.formValues[0]);
        switch (result.formValues[0]) {
            case 0:
                dummy.triggerEvent("evt:damage_all");
                break;
            case 1:
                dummy.triggerEvent("evt:damage_leather");
                break;
            case 2:
                dummy.triggerEvent("evt:damage_gold");
                break;
            case 3:
                dummy.triggerEvent("evt:damage_iron");
                break;
            case 4:
                dummy.triggerEvent("evt:damage_diamond");
                break;
            default:
                break;
        }
        player.playSound(SOUND_CUSTOMIZE, SOUND_OPTIONS);
    });
}

export function confirmReset(player, dummy) {
    player.playSound(SOUND_TURN_PAGE, SOUND_OPTIONS);
    MENU_CONFIRM_RESET.show(player).then(result => {
        if (result.canceled) return;

        let response = result.selection;
        switch (response) {
            case 0:
                dummy.setDynamicProperty("damage_total", 0);
                dummy.setDynamicProperty("damage_max", 0);
                player.playSound(SOUND_RESET, SOUND_OPTIONS);
                player.sendMessage("假人统计数据已清除！");
                break;
            default:
                break;
        }
    });
}

export function confirmDismantle(player, dummy) {
    player.playSound(SOUND_TURN_PAGE, SOUND_OPTIONS);
    MENU_CONFIRM_DISMANTLE.show(player).then(result => {
        if (result.canceled) return;

        let response = result.selection;
        switch (response) {
            case 0:
                mc.world.getDimension(player.dimension.id).spawnItem(new mc.ItemStack(dummy.typeId + "_spawn_egg", 1), {
                    x: dummy.location.x,
                    y: dummy.location.y + 1,
                    z: dummy.location.z
                });
                player.playSound(SOUND_DISMANTLE, SOUND_OPTIONS);
                dummy.remove();
                break;
            default:
                break;
        }
    });
}
