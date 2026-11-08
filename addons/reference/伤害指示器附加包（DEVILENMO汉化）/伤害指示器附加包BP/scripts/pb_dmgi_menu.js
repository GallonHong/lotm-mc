import * as mc from "@minecraft/server";
import * as ui from "@minecraft/server-ui";
import * as main from "./pb_dmgi_main";

const SOUND_TURN_PAGE = "item.book.page_turn";
const SOUND_OPTIONS = {
    pitch: 1.0,
    volume: 5.0,
};

const MENU_MAIN = new ui.ActionFormData();
const MENU_TUTORIAL = new ui.ActionFormData();
const MENU_CUSTOMIZE = new ui.ActionFormData();

const MENU_CUSTOMIZE_FONT = new ui.ActionFormData();
const MENU_CUSTOMIZE_STYLE = new ui.ActionFormData();
const MENU_CUSTOMIZE_SOUND = new ui.ActionFormData();
const MENU_CUSTOMIZE_EFFECT = new ui.ActionFormData();
const MENU_TARGET_DUMMIES = new ui.ActionFormData();
const MENU_CONFIGURING_DUMMIES = new ui.ActionFormData();

const MENU_ABOUT = new ui.ActionFormData();

//most of the menus don't ever change contents so we set them up once at the very start
export function setupStaticMenus() {
    //GUIDEBOOK MAIN
    MENU_MAIN.title("伤害指示器");
    MENU_MAIN.body("欢迎使用§2伤害指示器附加包§r！\n\n直观显示你对生物造成的伤害，并通过多种选项自定义体验。\n\n");

    MENU_MAIN.button("运作方式", "textures/pb/dmgi/items/tutorial");
    MENU_MAIN.button("自定义", "textures/pb/dmgi/items/customize");
    MENU_MAIN.button("关于此附加包", "textures/pb/dmgi/items/about");

    //GUIDEBOOK TUTORIAL
    MENU_TUTORIAL.title("教程");
    MENU_TUTORIAL.body("§2伤害指示器附加包§r会为受到伤害的生物和玩家添加浮动的§c伤害数字§r与§c自定义效果§r。\n\n你可以使用这本指南来自定义指示器的§2字体§r、§2颜色§r、§2样式§r和§2自定义效果§r，以符合你的偏好。\n\n你也可以制作并自定义§b目标假人§r来测试你的伤害。");
    MENU_TUTORIAL.button("目标假人", "textures/pb/dmgi/items/fight_dummy");
    MENU_TUTORIAL.button("配置假人", "textures/pb/dmgi/items/customize");
    MENU_TUTORIAL.button("返回", "textures/pb/dmgi/items/return");

    //GUIDEBOOK TARGET DUMMIES
    MENU_TARGET_DUMMIES.title("目标假人"),
        MENU_TARGET_DUMMIES.body("要制作一个基础的§b目标假人§r，将一个§b盔甲架§r放入你的合成栏。\n\n要自定义假人，你可以继续添加不同的§c生物材料§r，将其外观更改为对应生物的样子。\n\n可用材料包括：\n§c羽毛§r、§c 皮革§r、§c 骨头§r、§c 腐肉§r、§c 末影珍珠§r、§c 龙首§r、§c 凋灵骷髅头");
    MENU_TARGET_DUMMIES.button("返回", "textures/pb/dmgi/items/return");

    //GUIDEBOOK CONFIGURING DUMMIES
    MENU_CONFIGURING_DUMMIES.title("配置假人")
    MENU_CONFIGURING_DUMMIES.body("要配置一个§b目标假人§r，只需与它互动即可打开菜单。\n\n在这里你可以查看关于该假人的一些§2实用统计数据§r。你还可以更改假人的§2抗性§r值，§2重置§r其统计数据，或将其§2拆除§r以放置到其他地方。\n\n")
    MENU_CONFIGURING_DUMMIES.button("返回", "textures/pb/dmgi/items/return");

    //GUIDEBOOK CUSTOMIZE
    MENU_CUSTOMIZE.title("自定义");
    MENU_CUSTOMIZE.body("选择一个选项来自定义你的§2伤害指示器§r的外观与手感");
    MENU_CUSTOMIZE.button("字体", "textures/pb/dmgi/items/font");
    MENU_CUSTOMIZE.button("样式", "textures/pb/dmgi/items/customize");
    MENU_CUSTOMIZE.button("命中音效", "textures/pb/dmgi/items/icon_sound");
    MENU_CUSTOMIZE.button("命中特效", "textures/pb/dmgi/items/effects");
    MENU_CUSTOMIZE.button("返回", "textures/pb/dmgi/items/return");

    //GUIDEBOOK CUSTOMIZE FONT
    MENU_CUSTOMIZE_FONT.title("自定义");
    MENU_CUSTOMIZE_FONT.body("为你的§2伤害指示器§r选择一种§b字体样式§r");
    MENU_CUSTOMIZE_FONT.button("字体 1", "textures/pb/dmgi/items/font_1");
    MENU_CUSTOMIZE_FONT.button("字体 2", "textures/pb/dmgi/items/font_3");
    MENU_CUSTOMIZE_FONT.button("字体 3", "textures/pb/dmgi/items/font_4");
    MENU_CUSTOMIZE_FONT.button("字体 4", "textures/pb/dmgi/items/font_5");
    MENU_CUSTOMIZE_FONT.button("字体 5", "textures/pb/dmgi/items/font_7");
    MENU_CUSTOMIZE_FONT.button("字体 6", "textures/pb/dmgi/items/font_9");
    MENU_CUSTOMIZE_FONT.button("关闭", "textures/pb/dmgi/items/font");

    MENU_CUSTOMIZE_FONT.button("返回", "textures/pb/dmgi/items/return");

    //GUIDEBOOK CUSTOMIZE STYLE
    MENU_CUSTOMIZE_STYLE.title("自定义");
    MENU_CUSTOMIZE_STYLE.body("为你的字体选择一种§b移动样式§r");
    MENU_CUSTOMIZE_STYLE.button("上升", "textures/pb/dmgi/items/customize");
    MENU_CUSTOMIZE_STYLE.button("弹出", "textures/pb/dmgi/items/customize");
    MENU_CUSTOMIZE_STYLE.button("冻结", "textures/pb/dmgi/items/customize");
    MENU_CUSTOMIZE_STYLE.button("重力", "textures/pb/dmgi/items/customize");
    MENU_CUSTOMIZE_STYLE.button("旋转", "textures/pb/dmgi/items/customize");

    MENU_CUSTOMIZE_STYLE.button("返回", "textures/pb/dmgi/items/return");

    //GUIDEBOOK CUSTOMIZE SOUND
    MENU_CUSTOMIZE_SOUND.title("自定义");
    MENU_CUSTOMIZE_SOUND.body("选择一种额外的§b命中音效§r");

    MENU_CUSTOMIZE_SOUND.button("无", "textures/pb/dmgi/items/icon_sound");
    MENU_CUSTOMIZE_SOUND.button("嗖", "textures/pb/dmgi/items/icon_sound");
    MENU_CUSTOMIZE_SOUND.button("挥砍", "textures/pb/dmgi/items/icon_sound");
    MENU_CUSTOMIZE_SOUND.button("弹跳", "textures/pb/dmgi/items/icon_sound");
    MENU_CUSTOMIZE_SOUND.button("鸭子", "textures/pb/dmgi/items/icon_sound");
    MENU_CUSTOMIZE_SOUND.button("吱吱声", "textures/pb/dmgi/items/icon_sound");

    MENU_CUSTOMIZE_SOUND.button("返回", "textures/pb/dmgi/items/return");

    //GUIDEBOOK CUSTOMIZE EFFECT
    MENU_CUSTOMIZE_EFFECT.title("自定义");
    MENU_CUSTOMIZE_EFFECT.body("选择一种额外的§b命中效果§r");
    MENU_CUSTOMIZE_EFFECT.button("无", "textures/pb/dmgi/items/effects");
    MENU_CUSTOMIZE_EFFECT.button("十字", "textures/pb/dmgi/items/effects");
    MENU_CUSTOMIZE_EFFECT.button("花朵", "textures/pb/dmgi/items/effects");
    MENU_CUSTOMIZE_EFFECT.button("爱心", "textures/pb/dmgi/items/effects");
    MENU_CUSTOMIZE_EFFECT.button("星星", "textures/pb/dmgi/items/effects");
    MENU_CUSTOMIZE_EFFECT.button("漫画", "textures/pb/dmgi/items/effects");
    MENU_CUSTOMIZE_EFFECT.button("爆炸", "textures/pb/dmgi/items/effects");
    MENU_CUSTOMIZE_EFFECT.button("火花", "textures/pb/dmgi/items/effects");
    MENU_CUSTOMIZE_EFFECT.button("闪电", "textures/pb/dmgi/items/effects");
    MENU_CUSTOMIZE_EFFECT.button("卡牌", "textures/pb/dmgi/items/effects");

    MENU_CUSTOMIZE_EFFECT.button("返回", "textures/pb/dmgi/items/return");

    //GUIDEBOOK CREDITS
    MENU_ABOUT.title({
        translate: "pb_dmgi.menu_about_title"
    });
    MENU_ABOUT.body({
        "rawtext": [{
            "text": "Version: §a" + main.VERSION + "§f\n\n"
        }, {
            translate: "pb_dmgi.menu_about_body",
            "with": ["\n"]
        }]
    });
    MENU_ABOUT.button("返回", "textures/pb/dmgi/items/return");
}

export function menuMain(player) {
    player.playSound(SOUND_TURN_PAGE, SOUND_OPTIONS);
    MENU_MAIN.show(player).then(result => {
        if (result.canceled) return;

        let response = result.selection;
        switch (response) {
            case 0:
                menuTutorial(player);
                break;
            case 1:
                menuCustomize(player);
                break;
            case 2:
                menuAbout(player);
                break;
            default:
                break;
        }
    });
}

function menuTutorial(player) {
    player.playSound(SOUND_TURN_PAGE, SOUND_OPTIONS);
    MENU_TUTORIAL.show(player).then(result => {
        if (result.canceled) return;

        let response = result.selection;
        switch (response) {
            case 0:
                menuTargetDummies(player);
                break;
            case 1:
                menuConfiguringDummies(player);
                break;
            case 2:
                menuMain(player);
                break;
            default:
                break;
        }
    });
}

function menuTargetDummies(player) {
    player.playSound(SOUND_TURN_PAGE, SOUND_OPTIONS);
    MENU_TARGET_DUMMIES.show(player).then(result => {
        if (result.canceled) return;

        let response = result.selection;
        switch (response) {
            case 0:
                menuTutorial(player);
                break;
            default:
                break;
        }
    })
}

function menuConfiguringDummies(player) {
    player.playSound(SOUND_TURN_PAGE, SOUND_OPTIONS);
    MENU_CONFIGURING_DUMMIES.show(player).then(result => {
        if (result.canceled) return;

        let response = result.selection;
        switch (response) {
            case 0:
                menuTutorial(player);
                break;
            default:
                break;
        }
    });
}

function menuCustomize(player) {
    player.playSound(SOUND_TURN_PAGE, SOUND_OPTIONS);
    MENU_CUSTOMIZE.show(player).then(result => {
        if (result.canceled) return;

        let response = result.selection;
        switch (response) {
            case 0:
                menuCustomizeFont(player);
                break;
            case 1:
                menuCustomizeStyle(player);
                break;
            case 2:
                menuCustomizeSound(player);
                break;
            case 3:
                menuCustomizeEffect(player);
                break;
            case 4:
                menuMain(player);
                break;
            default:
                break;
        }
    });
}

function menuCustomizeFont(player) {
    player.playSound(SOUND_TURN_PAGE, SOUND_OPTIONS);
    MENU_CUSTOMIZE_FONT.show(player).then(result => {
        if (result.canceled) return;

        let response = result.selection;
        switch (response) {
            case 0:
                //font style 1
                mc.world.scoreboard.getObjective("pb_dmgi_config").setScore("font", 0);
                main.updateConfig();
                break;
            case 1:
                //font style 2
                mc.world.scoreboard.getObjective("pb_dmgi_config").setScore("font", 1);
                main.updateConfig();
                break;
            case 2:
                //font style 3
                mc.world.scoreboard.getObjective("pb_dmgi_config").setScore("font", 2);
                main.updateConfig();
                break;
            case 3:
                //font style 4
                mc.world.scoreboard.getObjective("pb_dmgi_config").setScore("font", 3);
                main.updateConfig();
                break;
            case 4:
                //font style 5
                mc.world.scoreboard.getObjective("pb_dmgi_config").setScore("font", 4);
                main.updateConfig();
                break;
            case 5:
                //font style 6
                mc.world.scoreboard.getObjective("pb_dmgi_config").setScore("font", 5);
                main.updateConfig();
                break;
            case 6:
                //font style 7
                mc.world.scoreboard.getObjective("pb_dmgi_config").setScore("font", 6);
                main.updateConfig();
                break;
            case 7:
                menuCustomize(player); //return
                break;
            default:
                break;
        }
    });
}

function menuCustomizeStyle(player) {
    player.playSound(SOUND_TURN_PAGE, SOUND_OPTIONS);
    MENU_CUSTOMIZE_STYLE.show(player).then(result => {
        if (result.canceled) return;

        let response = result.selection;
        switch (response) {
            case 0:
                //color white
                mc.world.scoreboard.getObjective("pb_dmgi_config").setScore("style", 0);
                main.updateConfig();
                break;
            case 1:
                //color yellow
                mc.world.scoreboard.getObjective("pb_dmgi_config").setScore("style", 1);
                main.updateConfig();
                break;
            case 2:
                //color red
                mc.world.scoreboard.getObjective("pb_dmgi_config").setScore("style", 2);
                main.updateConfig();
                break;
            case 3:
                //color blue
                mc.world.scoreboard.getObjective("pb_dmgi_config").setScore("style", 3);
                main.updateConfig();
                break;
            case 4:
                //color purple
                mc.world.scoreboard.getObjective("pb_dmgi_config").setScore("style", 4);
                main.updateConfig();
                break;
            case 5:
                menuCustomize(player); //return
                break;
            default:
                break;
        }
    });

}

function menuCustomizeSound(player) {
    player.playSound(SOUND_TURN_PAGE, SOUND_OPTIONS);
    MENU_CUSTOMIZE_SOUND.show(player).then(result => {
        if (result.canceled) return;

        let response = result.selection;
        switch (response) {
            case 0:
                mc.world.scoreboard.getObjective("pb_dmgi_config").setScore("sound", 0);
                main.updateConfig();
                break;
            case 1:
                mc.world.scoreboard.getObjective("pb_dmgi_config").setScore("sound", 1);
                main.updateConfig();
                break;
            case 2:
                mc.world.scoreboard.getObjective("pb_dmgi_config").setScore("sound", 2);
                main.updateConfig();
                break;
            case 3:
                mc.world.scoreboard.getObjective("pb_dmgi_config").setScore("sound", 3);
                main.updateConfig();
                break;
            case 4:
                mc.world.scoreboard.getObjective("pb_dmgi_config").setScore("sound", 4);
                main.updateConfig();
                break;
            case 5:
                mc.world.scoreboard.getObjective("pb_dmgi_config").setScore("sound", 5);
                main.updateConfig();
                break;
            case 6:
                menuCustomize(player); //return
                break;
            default:
                break;
        }
    });

}

function menuCustomizeEffect(player) {
    player.playSound(SOUND_TURN_PAGE, SOUND_OPTIONS);
    MENU_CUSTOMIZE_EFFECT.show(player).then(result => {
        if (result.canceled) return;

        let response = result.selection;
        switch (response) {
            case 0:
                //effect none
                mc.world.scoreboard.getObjective("pb_dmgi_config").setScore("effect", 0);
                main.updateConfig();
                break;
            case 1:
                //effect 1
                mc.world.scoreboard.getObjective("pb_dmgi_config").setScore("effect", 1);
                main.updateConfig();
                break;
            case 2:
                mc.world.scoreboard.getObjective("pb_dmgi_config").setScore("effect", 2);
                main.updateConfig();
                break;
            case 3:
                mc.world.scoreboard.getObjective("pb_dmgi_config").setScore("effect", 3);
                main.updateConfig();
                break;
            case 4:
                mc.world.scoreboard.getObjective("pb_dmgi_config").setScore("effect", 4);
                main.updateConfig();
                break;
            case 5:
                mc.world.scoreboard.getObjective("pb_dmgi_config").setScore("effect", 5);
                main.updateConfig();
                break;
            case 6:
                mc.world.scoreboard.getObjective("pb_dmgi_config").setScore("effect", 6);
                main.updateConfig();
                break;
            case 7:
                mc.world.scoreboard.getObjective("pb_dmgi_config").setScore("effect", 7);
                main.updateConfig();
                break;
            case 8:
                mc.world.scoreboard.getObjective("pb_dmgi_config").setScore("effect", 8);
                main.updateConfig();
                break;
            case 9:
                mc.world.scoreboard.getObjective("pb_dmgi_config").setScore("effect", 9);
                main.updateConfig();
                break;
            case 10:
                menuCustomize(player); //return
                break;
            default:
                break;
        }
    });
}

function menuCustomizeColor(player) {
    player.playSound(SOUND_TURN_PAGE, SOUND_OPTIONS);

    let color_default = mc.world.scoreboard.getObjective("pb_dmgi_config").getScore("color_default");
    let color_fire = mc.world.scoreboard.getObjective("pb_dmgi_config").getScore("color_fire");
    let color_magic = mc.world.scoreboard.getObjective("pb_dmgi_config").getScore("color_magic");
    let color_environmental = mc.world.scoreboard.getObjective("pb_dmgi_config").getScore("color_environmental");
    let color_explosion = mc.world.scoreboard.getObjective("pb_dmgi_config").getScore("color_explosion");
    let color_wither = mc.world.scoreboard.getObjective("pb_dmgi_config").getScore("color_wither");

    const color_options = ["§fWhite", "§iIron Gray", "§4Dark Red", "§aGreen", "§2Dark Green", "§6Gold", "§jDark Gray", "§uAmethyst", "§bAqua", "§eYellow"];

    let form = new ui.ModalFormData()
    form.title("自定义颜色");

    form.dropdown("物理伤害", color_options, color_default);
    form.dropdown("火焰伤害", color_options, color_fire);
    form.dropdown("魔法伤害", color_options, color_magic);
    form.dropdown("环境伤害", color_options, color_environmental);
    form.dropdown("爆炸伤害", color_options, color_explosion);
    form.dropdown("凋零伤害", color_options, color_wither);

    form.show(player).then(result => {
        if (result.canceled) return;

        mc.world.scoreboard.getObjective("pb_dmgi_config").setScore("color_default", result.formValues[0]);
        mc.world.scoreboard.getObjective("pb_dmgi_config").setScore("color_fire", result.formValues[1]);
        mc.world.scoreboard.getObjective("pb_dmgi_config").setScore("color_magic", result.formValues[2]);
        mc.world.scoreboard.getObjective("pb_dmgi_config").setScore("color_environmental", result.formValues[3]);
        mc.world.scoreboard.getObjective("pb_dmgi_config").setScore("color_explosion", result.formValues[4]);
        mc.world.scoreboard.getObjective("pb_dmgi_config").setScore("color_wither", result.formValues[5]);
        main.updateConfig();
    });
}

function menuAbout(player) {
    player.playSound(SOUND_TURN_PAGE, SOUND_OPTIONS);
    MENU_ABOUT.show(player).then(result => {
        if (result.canceled) return;

        let response = result.selection;
        switch (response) {
            case 0:
                menuMain(player);
                break;
            default:
                break;
        }
    });
}
