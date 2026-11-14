// R6 Siege Bedrock - main menu / operator select / admin panel (server-ui forms)
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { world, system } from "@minecraft/server";
import { State, ps, isAdmin, matchPlayers } from "./state.js";
import { Config, setConfigValue, saveConfig, resetConfig, configText } from "./config.js";
import { Match } from "./match.js";
import { Setup, setupEventHandler } from "./setup.js";
import { OPERATORS, GADGETS, WEAPONS } from "./data/registry.js";
import { Hud } from "./hud.js";
import { Guns } from "./guns/engine.js";
import { msg, actionBar, safe, nowTick, title, sound } from "./util.js";

const GADGET_NAMES = Object.fromEntries(Object.entries(GADGETS).map(([id, g]) => [id, g.name]));

function operatorButtonLabel(op, match, st) {
    const taken = match?.takenOperators?.[st?.team]?.has(op.id);
    const gadget = GADGET_NAMES[op.gadget] ?? "?";
    const primaries = op.primaries.map(id => WEAPONS[id]?.name ?? id).join(" / ");
    const mark = taken && st?.operatorId !== op.id ? "§8[已被选择]" : (st?.operatorId === op.id ? "§a[当前]" : "");
    return `§f${op.name} §7${op.cn} §8| ${op.armor}甲${op.speed}速 §8| ${gadget}\n§8${primaries} ${mark}`;
}

export const Menu = {
    printDebug(player) {
        const d = State.debug ?? {};
        msg(player, "§6===== R6 调试信息 =====");
        msg(player, `§7脚本就绪 §f${d.scriptsReady ? "是" : "否"} §7| 启动 tick §f${d.startedAt ?? "?"} §7| 当前 tick §f${nowTick()}`);
        msg(player, `§7事件计数 §fitemStartUse=${d.itemStartUse ?? 0} §7| §fitemUse=${d.itemUse ?? 0} §7| §fitemStartUseOn=${d.itemStartUseOn ?? 0} §7| §fitemUseOn=${d.itemUseOn ?? 0} §7| §fitemStopUse=${d.itemStopUse ?? 0}`);
        if (d.subscribeErrors?.length) msg(player, `§c订阅失败：§f${d.subscribeErrors.join(", ")}`);
        const info = Guns.debugInfo(player);
        msg(player, `§7主手 §f${info.mainhand} §7| 热键槽 §f${info.selectedSlot} §7| 对局内 §f${info.inMatch ? "是" : "否"} §7| 阶段 §f${info.phase}`);
        msg(player, `§7可开火 §f${info.canFire?.ok ? "是" : "否"}§7${info.canFire?.reason ? ` (${info.canFire.reason})` : ""} §7| 模式 §f${info.canFire?.mode ?? "-"}`);
        if (info.session) {
            const s = info.session;
            msg(player, `§7扳机会话 §f${s.weaponId} §7| 模式 §f${s.mode} §7| 持握 §f${s.holding} §7| armed §f${s.armed} §7| 已射 §f${s.shots} §7| 自动换弹 §f${s.reloadEnd > 0}`);
        } else {
            msg(player, "§7扳机会话 §8无（右键武器应创建会话）");
        }
        const m = State.match;
        msg(player, m
            ? `§7对局 §f第${m.round}回合 §7| 阶段 §f${m.phase} §7| 比分 §9${m.score.blue}§7:§6${m.score.orange} §7| 计时 §f${m.timer}`
            : "§7对局 §8无（自由测试模式：可正常开枪/放技能）");
        msg(player, "§8对局中若无法开枪：准备阶段禁枪，行动阶段才可开火。");
    },

    openMain(player) {
        sound(player, "r6.ui_click", 0.6, 1.2);
        const inMatch = !!State.match;
        const inQueue = Match.inQueue(player);
        const form = new ActionFormData()
            .title("§6R6 SIEGE §8BEDROCK")
            .body(inMatch
                ? `§7第 §f${State.match.round} §7回合 §8| §9${State.match.score.blue}§7:§6${State.match.score.orange}\n§7阶段 §f${State.match.phase}`
                : `§7队列 §f${State.queue.length}§7/${Config.teamSize * 2} §8| §7等待玩家加入匹配`)
            .button(inQueue ? "§c离开匹配队列" : "§a加入匹配队列")
            .button("§b选择干员")
            .button("§e对局状态")
            .button("§7帮助 / 操作说明")
            .button("§8调试信息（枪/技能没反应时点这里）");
        if (isAdmin(player)) form.button("§c管理员面板");
        system.run(() => {
            safe(() => form.show(player).then(res => {
                if (res.canceled) return;
                system.run(() => {
                    if (res.selection === 0) {
                        if (inQueue) Match.queueLeave(player); else Match.queueJoin(player);
                    } else if (res.selection === 1) {
                        this.openOperators(player);
                    } else if (res.selection === 2) {
                        Match.status(player);
                    } else if (res.selection === 3) {
                        this.openHelp(player);
                    } else if (res.selection === 4) {
                        this.printDebug(player);
                    } else if (res.selection === 5 && isAdmin(player)) {
                        this.openAdmin(player);
                    }
                });
            }));
        });
    },

    openOperators(player) {
        sound(player, "r6.ui_click", 0.6, 1.2);
        const match = State.match;
        const st = ps(player);
        if (!match || !st) {
            msg(player, "§c你不在对局中");
            return;
        }
        if (match.phase !== "prep") {
            msg(player, "§c只能在准备阶段更换干员");
            return;
        }
        const pool = OPERATORS.filter(o => o.side === st.side);
        const form = new ActionFormData()
            .title(`§b选择干员 §8- ${st.side === "attacker" ? "进攻方" : "防守方"}`)
            .body("§7回合开始前可以选择或更换干员。\n§8同一队伍内干员不能重复。");
        for (const op of pool) form.button(operatorButtonLabel(op, match, st));
        system.run(() => {
            safe(() => form.show(player).then(res => {
                if (res.canceled) return;
                const op = pool[res.selection];
                if (!op) return;
                system.run(() => {
                    const err = Match.chooseOperator(player, op.id);
                    if (err) msg(player, `§c${err}`);
                });
            }));
        });
    },

    openHelp(player) {
        sound(player, "r6.ui_click", 0.6, 1.2);
        const form = new MessageFormData()
            .title("§6操作说明")
            .body([
                "§e基础操作",
                "§7· §f右键 §7使用主武器 / 干员技能（长按自动武器连发）",
                "§7· §f左键点击方块 §7手动换弹",
                "§7· §f潜行 §7瞄准，降低散布",
                "§7· §f潜行靠近倒地队友 §7自动救援",
                "§7· §fR6 战术平板 §7右键打开菜单（背包第 8 格）",
                "",
                "§e进攻方",
                "§7· 准备阶段留在出生点，行动阶段寻找炸弹点",
                "§7· 用 §b拆弹器 §7（第 4 格）在炸弹点安放炸弹",
                "§7· 安放后保护炸弹直到引爆",
                "",
                "§e防守方",
                "§7· 准备阶段布置干员技能与 §b加固墙 §7（第 5 格）",
                "§7· 用 §b拆弹器 §7拆除已安放的炸弹",
                "§7· 消灭全部进攻方或阻止安放即可获胜",
                "",
                "§e自由测试模式",
                "§7未开始任何对局时，可以直接右键开枪、右键使用技能：",
                "§7· 枪械用物品耐久当弹匣，打空后自动换弹；左键点方块手动换弹",
                "§7· 干员技能无冷却/次数限制，方便逐个测试效果",
                "§7· 对局中则恢复 R6 规则：准备阶段不能开枪，技能有次数与冷却",
                "",
                "§e指令",
                "§7/scriptevent r6:join §8加入队列",
                "§7/scriptevent r6:start §8管理员开始对局",
                "§7/scriptevent r6:setup §8地图设置",
                "§7/scriptevent r6:debug §8枪/技能没反应时输出诊断信息",
            ].join("\n"))
            .button1("§a返回")
            .button2("§7关闭");
        system.run(() => {
            safe(() => form.show(player).then(res => {
                if (!res.canceled && res.selection === 0) system.run(() => this.openMain(player));
            }));
        });
    },

    openAdmin(player) {
        if (!isAdmin(player)) {
            msg(player, "§c需要管理员权限");
            return;
        }
        sound(player, "r6.ui_click", 0.6, 1.2);
        const form = new ActionFormData()
            .title("§cR6 管理员面板")
            .body(`§7地图 §f${State.map?.name ?? "-"} §8| §7出生点 ${State.map?.spawns?.length ?? 0} §8| §7炸弹点 ${State.map?.sites?.length ?? 0}\n§8指令：/scriptevent r6:setup spawn add <名称> | site add A`)
            .button("§a开始对局（队列）")
            .button("§a强制开始（在线玩家）")
            .button("§c终止当前对局")
            .button("§e地图配置")
            .button("§b对局参数")
            .button("§7查看状态")
            .button("§8调试信息");
        system.run(() => {
            safe(() => form.show(player).then(res => {
                if (res.canceled) return;
                system.run(() => {
                    switch (res.selection) {
                        case 0: Match.tryStartFromQueue(); msg(player, State.match ? "§a对局已开始" : "§e队列人数不足"); break;
                        case 1: Match.forceStart(player); break;
                        case 2: Match.stop(player); break;
                        case 3: Setup.show(player); break;
                        case 4: this.openConfig(player); break;
                        case 5: Match.status(player); break;
                        case 6: this.printDebug(player); break;
                    }
                });
            }));
        });
    },

    openConfig(player) {
        if (!isAdmin(player)) return;
        const keysNum = ["teamSize", "roundsToWin", "maxRounds", "prepSeconds", "actionSeconds",
            "bombSeconds", "plantSeconds", "defuseSeconds", "reviveSeconds", "bleedoutSeconds", "roundEndSeconds"];
        const limits = {
            teamSize: [1, 5], roundsToWin: [1, 7], maxRounds: [1, 9], prepSeconds: [5, 120],
            actionSeconds: [30, 600], bombSeconds: [10, 180], plantSeconds: [1, 15],
            defuseSeconds: [1, 20], reviveSeconds: [1, 15], bleedoutSeconds: [10, 180],
            roundEndSeconds: [1, 20],
        };
        const form = new ModalFormData().title("§b对局参数");
        for (const key of keysNum) {
            const [min, max] = limits[key];
            form.slider(`§7${key}`, min, max, 1, Config[key]);
        }
        form.toggle("§7friendlyFire", !!Config.friendlyFire);
        system.run(() => {
            safe(() => form.show(player).then(res => {
                if (res.canceled || !res.formValues) return;
                system.run(() => {
                    keysNum.forEach((key, i) => {
                        const v = res.formValues[i];
                        if (typeof v === "number") setConfigValue(key, v);
                    });
                    setConfigValue("friendlyFire", res.formValues[keysNum.length] ? "true" : "false");
                    saveConfig();
                    msg(player, `§a参数已保存 §7${configText()}`);
                });
            }));
        });
    },
};

/** central scriptevent router */
export function handleScriptEvent(event) {
    const player = event.sourceEntity;
    const id = String(event.id ?? "");
    if (!player) return;
    const message = String(event.message ?? "").trim();
    const admin = isAdmin(player);
    switch (id) {
        case "r6:menu":
        case "r6:tablet":
            system.run(() => Menu.openMain(player));
            return;
        case "r6:help":
            system.run(() => Menu.openHelp(player));
            return;
        case "r6:join":
            Match.queueJoin(player);
            return;
        case "r6:leave":
            Match.queueLeave(player);
            return;
        case "r6:op":
        case "r6:operator": {
            if (!message) {
                system.run(() => Menu.openOperators(player));
                return;
            }
            const err = Match.chooseOperator(player, message.toLowerCase());
            msg(player, err ? `§c${err}` : "§a干员已选择");
            return;
        }
        case "r6:status":
            Match.status(player);
            return;
        case "r6:start":
            if (!admin) { msg(player, "§c需要管理员权限"); return; }
            Match.forceStart(player);
            return;
        case "r6:stop":
            if (!admin) { msg(player, "§c需要管理员权限"); return; }
            Match.stop(player);
            return;
        case "r6:config":
            if (!admin) { msg(player, "§c需要管理员权限"); return; }
            if (!message) { msg(player, configText()); return; }
            {
                const [key, value] = message.split(/\s+/, 2);
                if (!key || value === undefined) { msg(player, "§7用法：r6:config <键> <值>"); return; }
                const res = setConfigValue(key, value);
                msg(player, res.ok ? `§a已设置 ${key} = ${res.value}` : `§c${res.error}`);
            }
            return;
        case "r6:setup":
            if (!admin) { msg(player, "§c需要管理员权限"); return; }
            setupEventHandler(event);
            return;
        case "r6:reset":
            if (!admin) { msg(player, "§c需要管理员权限"); return; }
            resetConfig();
            msg(player, "§a配置已重置");
            return;
        case "r6:rules":
            system.run(() => Menu.openHelp(player));
            return;
        case "r6:debug":
            system.run(() => Menu.printDebug(player));
            return;
        default:
            if (id.startsWith("r6:")) {
                msg(player, `§7未知指令 §f${id}§7，输入 §f/scriptevent r6:menu §7打开菜单。`);
            }
            return;
    }
}
