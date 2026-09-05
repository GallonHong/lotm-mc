import { world, system } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";
import { Config } from "../config.js";
import { SocialStore, normalizePlayerName } from "../data/socialStore.js";
import { Utils } from "../utils.js";
import { EconomyManager } from "./economy.js";
import { LandManager } from "./land.js";
import { Integration } from "./integration.js";
import { AuditManager } from "./audit.js";

const TEAM_TAG_PREFIX = "sapi_team_";

function onlinePlayer(name) {
    const normalized = normalizePlayerName(name);
    return world.getAllPlayers().find(player => normalizePlayerName(player.name) === normalized) || null;
}

function cleanText(value, maxLength) {
    return String(value || "").replace(/[§\n\r]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function dimensionStatus(player) {
    if (!player) return "离线";
    try { if (player.hasTag("daily_in_dungeon")) return "副本中"; } catch {}
    const dimension = String(player.dimension?.id || "");
    if (dimension.includes("apoc_extract")) return "摸金都市";
    if (dimension.includes("nether")) return "下界";
    if (dimension.includes("the_end")) return "末地";
    return "主世界";
}

function isAlive(player) {
    try {
        const health = player.getComponent("minecraft:health") || player.getComponent("health");
        return !health || Number(health.currentValue) > 0;
    } catch { return true; }
}

/** 好友、玩家卡、临时四人队伍、公会与领地观光。 */
export class SocialManager {
    static teams = new Map();
    static playerTeams = new Map();
    static guildChatTicks = new Map();

    static get settings() {
        return Config.social || {};
    }

    static initializePlayer(player) {
        SocialStore.touchPlayer(player);
        if (!this.teamOf(player.name)) this.clearTeamTags(player);
    }

    static clearTeamTags(player) {
        try {
            for (const tag of player.getTags()) if (tag.startsWith(TEAM_TAG_PREFIX)) player.removeTag(tag);
        } catch {}
    }

    static onPlayerLeave(playerName) {
        const team = this.teamOf(playerName);
        if (team) this.removeTeamMember(team, playerName, true);
    }

    static openSocialMenu(player, onBack = null) {
        if (!Utils.isValid(player)) return;
        const profile = SocialStore.touchPlayer(player);
        const friends = profile.friends || [];
        const onlineFriends = friends.filter(name => onlinePlayer(name)).length;
        const team = this.teamOf(player.name);
        const guild = SocialStore.guildForPlayer(player.name);
        const actions = [];
        const form = new ActionFormData().title("§l§b👥 社交").body(
            `§0好友：§e${onlineFriends}/${friends.length} 在线 §8| 上限 ${this.settings.maxFriends || 50}\n` +
            `§0在线玩家：§e${world.getAllPlayers().length}\n` +
            `§0队伍：§e${team ? `${team.members.length}/${this.settings.teamMaxPlayers || 4}` : "未加入"}\n` +
            `§0公会：§e${guild ? `[${guild.tag}] ${guild.name}` : "未加入"}`
        );
        const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
        add(`§l§c❤️ 我的好友\n§r§8${onlineFriends}/${friends.length} 在线`, "textures/ui/FriendsIcon", () => this.openFriends(player, () => this.openSocialMenu(player, onBack)));
        add(`§l§b🌐 在线玩家\n§r§8当前 ${world.getAllPlayers().length} 人在线`, "textures/ui/World", () => this.openOnlinePlayers(player, () => this.openSocialMenu(player, onBack)));
        add(`§l§a👥 我的队伍\n§r§8${team ? `${team.members.length}/${this.settings.teamMaxPlayers || 4} 人` : "尚未加入队伍"}`, "textures/ui/icon_multiplayer", () => this.openTeam(player, () => this.openSocialMenu(player, onBack)));
        add(`§l§6🏴 公会\n§r§8${guild ? `[${guild.tag}] ${guild.name}` : "创建或申请加入公会"}`, "textures/ui/icon_steve", () => this.openGuild(player, () => this.openSocialMenu(player, onBack)));
        if (profile.friendRequests?.length) {
            add(`§l§e📨 好友申请\n§r§8${profile.friendRequests.length} 条待处理`, "textures/ui/invite_base", () => this.openFriendRequests(player, () => this.openSocialMenu(player, onBack)));
        }
        add("§l§8返回", "textures/ui/undo", () => onBack?.());
        Utils.showForm(player, form, response => actions[response.selection]?.());
    }

    static openFriends(player, onBack = null) {
        const profile = SocialStore.touchPlayer(player);
        const friends = [...(profile.friends || [])].sort((a, b) => Number(!!onlinePlayer(b)) - Number(!!onlinePlayer(a)) || a.localeCompare(b));
        const actions = [];
        const form = new ActionFormData().title("§l§c❤️ 我的好友").body(`§0我的好友：§e${friends.length}/${this.settings.maxFriends || 50}`);
        for (const name of friends) {
            const target = onlinePlayer(name);
            form.button(`${target ? "§a●" : "§8○"} §0${name}\n§r§8${target ? `在线 · ${dimensionStatus(target)}` : "离线"}`, "textures/ui/FriendsIcon");
            actions.push(() => this.openPlayerCard(player, name, () => this.openFriends(player, onBack)));
        }
        form.button("§l§8返回", "textures/ui/undo");
        actions.push(() => onBack?.());
        Utils.showForm(player, form, response => actions[response.selection]?.());
    }

    static openFriendRequests(player, onBack = null) {
        const profile = SocialStore.touchPlayer(player);
        const requests = [...(profile.friendRequests || [])].reverse();
        const actions = [];
        const form = new ActionFormData().title("§l§e📨 好友申请").body(`§0待处理：§e${requests.length}`);
        for (const request of requests) {
            form.button(`§0${request.from}\n§r§8申请添加你为好友`, "textures/ui/invite_base");
            actions.push(() => this.openFriendRequestDecision(player, request.from, onBack));
        }
        form.button("§l§8返回", "textures/ui/undo");
        actions.push(() => onBack?.());
        Utils.showForm(player, form, response => actions[response.selection]?.());
    }

    static openFriendRequestDecision(player, fromName, onBack) {
        const form = new MessageFormData().title("§l好友申请").body(`§e${fromName} §0希望添加你为好友。`)
            .button1("§a接受").button2("§c拒绝");
        Utils.showForm(player, form, response => {
            if (response.selection === 0) {
                const result = SocialStore.acceptFriend(player.name, fromName, this.settings.maxFriends || 50);
                Utils.tell(player, result.ok ? `§a你和 §e${fromName} §a已成为好友。` : `§c接受失败：${result.reason}`);
                const sender = onlinePlayer(fromName);
                if (result.ok && sender) Utils.tell(sender, `§a${player.name} 接受了你的好友申请。`);
            } else {
                SocialStore.rejectFriend(player.name, fromName);
                Utils.tell(player, `§8已拒绝 ${fromName} 的好友申请。`);
            }
            this.openFriendRequests(player, onBack);
        });
    }

    static openOnlinePlayers(player, onBack = null) {
        const players = [...world.getAllPlayers()].sort((a, b) => a.name.localeCompare(b.name));
        const actions = [];
        const form = new ActionFormData().title("§l§b🌐 在线玩家").body(`§0当前在线：§e${players.length}`);
        for (const target of players) {
            const guild = SocialStore.guildForPlayer(target.name);
            form.button(`§0${target.name}${guild ? ` §6[${guild.tag}]` : ""}\n§r§8${dimensionStatus(target)}`, "textures/ui/icon_steve");
            actions.push(() => this.openPlayerCard(player, target.name, () => this.openOnlinePlayers(player, onBack)));
        }
        form.button("§l§8返回", "textures/ui/undo");
        actions.push(() => onBack?.());
        Utils.showForm(player, form, response => actions[response.selection]?.());
    }

    static openPlayerCard(viewer, targetName, onBack = null) {
        const targetProfile = SocialStore.getProfile(targetName, true);
        const target = onlinePlayer(targetName);
        const guild = targetProfile.guildId ? SocialStore.getGuild(targetProfile.guildId) : null;
        const friends = SocialStore.areFriends(viewer.name, targetProfile.name);
        const sameTeam = this.teamOf(viewer.name) && this.teamOf(viewer.name)?.id === this.teamOf(targetProfile.name)?.id;
        const self = normalizePlayerName(viewer.name) === normalizePlayerName(targetProfile.name);
        const actions = [];
        const form = new ActionFormData().title(`§l§b${targetProfile.name}`).body(
            `§0公会：§e${guild ? `[${guild.tag}] ${guild.name}` : "无"}\n` +
            `§0称号：§e${targetProfile.title || "幸存者"}\n` +
            `§0状态：${target ? `§a在线 · ${dimensionStatus(target)}` : "§8离线"}\n` +
            `§0通缉：§a${targetProfile.wanted || "正常"}`
        );
        const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
        if (!self && target) add("§l§b私聊", "textures/ui/icon_book_writable", () => this.openPrivateMessage(viewer, targetProfile.name, onBack));
        if (!self && !friends) add("§l§a添加好友", "textures/ui/plus", () => {
            const result = SocialStore.requestFriend(viewer.name, targetProfile.name, this.settings.maxFriends || 50);
            Utils.tell(viewer, result.ok ? `§a已向 §e${targetProfile.name} §a发送好友申请。` : `§c${result.reason}`);
            if (result.ok && target) Utils.tell(target, `§e${viewer.name} §a向你发送了好友申请，请从社交菜单处理。`);
            onBack?.();
        });
        if (!self && target && !sameTeam) add("§l§a邀请组队", "textures/ui/invite_base", () => { this.inviteToTeam(viewer, target); onBack?.(); });
        if (!self && target && friends) add("§l§6邀请领地观光", "textures/ui/map_icon", () => this.openLandVisitInvite(viewer, target, onBack));
        if (sameTeam) add("§l§a查看队伍", "textures/ui/icon_multiplayer", () => this.openTeam(viewer, onBack));
        if (guild) add("§l§6查看公会", "textures/ui/icon_steve", () => this.openGuildDetail(viewer, guild, onBack));
        if (!self && friends) add("§l§c删除好友", "textures/ui/minus", () => this.confirmRemoveFriend(viewer, targetProfile.name, onBack));
        add("§l§8返回", "textures/ui/undo", () => onBack?.());
        Utils.showForm(viewer, form, response => actions[response.selection]?.());
    }

    static openPrivateMessage(sender, targetName, onBack = null) {
        const form = new ModalFormData().title(`§l私聊 ${targetName}`).textField("输入发送内容", "最多 200 字");
        Utils.showForm(sender, form, response => {
            const message = cleanText(response.formValues?.[0], 200);
            const target = onlinePlayer(targetName);
            if (!response.canceled && message && target) {
                target.sendMessage(`§d[私聊] §e${sender.name}§0：${message}`);
                sender.sendMessage(`§d[私聊给 ${target.name}] §0${message}`);
            } else if (!response.canceled && message) Utils.tell(sender, "§c对方已经离线，消息未发送。");
            onBack?.();
        });
    }

    static confirmRemoveFriend(player, targetName, onBack = null) {
        const form = new MessageFormData().title("§l删除好友").body(`§c确定删除好友 ${targetName}？`).button1("§c删除").button2("§8取消");
        Utils.showForm(player, form, response => {
            if (response.selection === 0) {
                SocialStore.removeFriend(player.name, targetName);
                Utils.tell(player, `§8已删除好友 ${targetName}。`);
            }
            onBack?.();
        });
    }

    static ownedPlots(player) {
        const plots = [];
        for (const key of LandManager.getPlayerPlots(player)) {
            try {
                const raw = world.getDynamicProperty(key);
                const plot = typeof raw === "string" ? JSON.parse(raw) : null;
                if (plot?.ownerName === player.name && plot.visitorPoint) plots.push(plot);
            } catch {}
        }
        return plots;
    }

    static openLandVisitInvite(owner, target, onBack = null) {
        const plots = this.ownedPlots(owner);
        if (!plots.length) {
            Utils.tell(owner, "§c你还没有为任何领地设置访客出生点。请站在自己的领地内，从领地菜单设置。");
            return onBack?.();
        }
        const actions = [];
        const form = new ActionFormData().title("§l§6邀请领地观光").body(`§0选择邀请 §e${target.name} §0参观的领地。观光不会授予建造、容器或保险箱权限。`);
        for (const plot of plots) {
            form.button(`§0${plot.name}\n§r§8访客点已设置`, "textures/ui/map_icon");
            actions.push(() => this.sendLandVisitInvite(owner, target, plot, onBack));
        }
        form.button("§l§8返回", "textures/ui/undo");
        actions.push(() => onBack?.());
        Utils.showForm(owner, form, response => actions[response.selection]?.());
    }

    static sendLandVisitInvite(owner, target, plot, onBack = null) {
        Utils.tell(owner, `§a已邀请 ${target.name} 参观领地 ${plot.name}。`);
        const form = new MessageFormData().title("§l§6领地观光邀请").body(
            `§e${owner.name} §0邀请你参观他的领地：§e${plot.name}\n\n§8接受后只会传送到访客点，不会获得破坏、放置、容器、保险箱或载具权限。`
        ).button1("§a接受").button2("§c拒绝");
        Utils.showForm(target, form, response => {
            if (response.selection !== 0) {
                Utils.tell(owner, `§8${target.name} 拒绝了领地观光邀请。`);
                return;
            }
            if (!SocialStore.areFriends(owner.name, target.name)) return Utils.tell(target, "§c你们已经不是好友，邀请失效。");
            const current = LandManager.getPlot(plot.dimension, plot.chunkX, plot.chunkZ);
            const point = current?.visitorPoint;
            if (!point || current.ownerName !== owner.name) return Utils.tell(target, "§c领地或访客点已经失效。");
            try {
                target.teleport({ x: Number(point.x), y: Number(point.y), z: Number(point.z) }, { dimension: world.getDimension(point.dimension || current.dimension) });
                Utils.sound.teleport(target);
                Utils.tell(target, `§a已抵达 ${owner.name} 的领地 ${current.name}。`);
                AuditManager.log("land_visit", target, current.name, `invitedBy=${owner.name}`);
            } catch { Utils.tell(target, "§c传送失败，目标区块可能不可用。"); }
        });
        onBack?.();
    }

    static createTeam(player) {
        if (this.teamOf(player.name)) return null;
        const id = `team_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        const team = { id, leaderName: player.name, members: [player.name], createdAt: Date.now() };
        this.teams.set(id, team);
        this.playerTeams.set(normalizePlayerName(player.name), id);
        this.applyTeamTag(player, team);
        return team;
    }

    static teamOf(name) {
        const id = this.playerTeams.get(normalizePlayerName(name));
        return id ? this.teams.get(id) || null : null;
    }

    static teamTag(team) {
        return `${TEAM_TAG_PREFIX}${team.id.replace(/[^a-z0-9_]/gi, "").slice(-24)}`;
    }

    static applyTeamTag(player, team) {
        this.clearTeamTags(player);
        try { player.addTag(this.teamTag(team)); } catch {}
    }

    static broadcastTeam(team, message) {
        for (const name of team.members) {
            const member = onlinePlayer(name);
            if (member) member.sendMessage(`§a[队伍] §0${message}`);
        }
    }

    static inviteToTeam(inviter, target) {
        let team = this.teamOf(inviter.name);
        if (!team) team = this.createTeam(inviter);
        if (!team || team.leaderName !== inviter.name) return Utils.tell(inviter, "§c只有队长可以邀请成员。");
        if (team.members.length >= (this.settings.teamMaxPlayers || 4)) return Utils.tell(inviter, "§c队伍已满。");
        if (this.teamOf(target.name)) return Utils.tell(inviter, "§c对方已经加入其他队伍。");
        Utils.tell(inviter, `§a已向 ${target.name} 发送组队邀请。`);
        const teamId = team.id;
        const form = new MessageFormData().title("§l§a组队邀请").body(`§e${inviter.name} §0邀请你加入队伍。\n§0当前人数：§e${team.members.length}/${this.settings.teamMaxPlayers || 4}`).button1("§a加入").button2("§c拒绝");
        Utils.showForm(target, form, response => {
            const current = this.teams.get(teamId);
            if (response.selection !== 0) return Utils.tell(inviter, `§8${target.name} 拒绝了组队邀请。`);
            if (!current || current.members.length >= (this.settings.teamMaxPlayers || 4) || this.teamOf(target.name)) return Utils.tell(target, "§c队伍邀请已经失效。");
            current.members.push(target.name);
            this.playerTeams.set(normalizePlayerName(target.name), current.id);
            this.applyTeamTag(target, current);
            this.broadcastTeam(current, `§e${target.name} §0加入了队伍。`);
        });
    }

    static removeTeamMember(team, memberName, disconnected = false) {
        if (!team) return;
        const normalized = normalizePlayerName(memberName);
        team.members = team.members.filter(name => normalizePlayerName(name) !== normalized);
        this.playerTeams.delete(normalized);
        const player = onlinePlayer(memberName);
        if (player) this.clearTeamTags(player);
        if (!team.members.length) {
            this.teams.delete(team.id);
            return;
        }
        if (normalizePlayerName(team.leaderName) === normalized) team.leaderName = team.members[0];
        if (!disconnected) this.broadcastTeam(team, `§e${memberName} §0离开了队伍。`);
    }

    static dissolveTeam(team, actor = "system") {
        if (!team) return;
        for (const name of team.members) {
            this.playerTeams.delete(normalizePlayerName(name));
            const player = onlinePlayer(name);
            if (player) {
                this.clearTeamTags(player);
                Utils.tell(player, "§8队伍已解散。");
            }
        }
        this.teams.delete(team.id);
        AuditManager.log("team_dissolve", actor, team.id, `members=${team.members.length}`);
    }

    static openTeam(player, onBack = null) {
        const team = this.teamOf(player.name);
        if (!team) {
            const form = new MessageFormData().title("§l§a👥 我的队伍").body("§0你当前没有加入队伍。普通队伍最多 4 人，服务器重启后自动解散。")
                .button1("§a创建队伍").button2("§8返回");
            return Utils.showForm(player, form, response => {
                if (response.selection === 0) {
                    this.createTeam(player);
                    Utils.tell(player, "§a队伍已创建，你现在是队长。");
                    this.openTeam(player, onBack);
                } else onBack?.();
            });
        }
        const leader = team.leaderName === player.name;
        const actions = [];
        const memberLines = team.members.map(name => `${name === team.leaderName ? "§6👑" : "§8•"} §0${name}${onlinePlayer(name) ? " §a在线" : " §8离线"}`).join("\n");
        const form = new ActionFormData().title("§l§a👥 我的队伍").body(`§0队伍人数：§e${team.members.length}/${this.settings.teamMaxPlayers || 4}\n${memberLines}`);
        const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
        if (leader) add("§l§a邀请在线玩家", "textures/ui/plus", () => this.openTeamInviteList(player, team, onBack));
        add("§l§b队伍聊天", "textures/ui/icon_book_writable", () => this.openTeamChat(player, team, onBack));
        add("§l§c进入副本\n§r§8队长发起全队 Ready", "textures/ui/warning_alex", () => this.openDungeon(player));
        if (leader && team.members.length > 1) {
            add("§l§6移交队长", "textures/ui/trade_icon", () => this.openTransferLeader(player, team, onBack));
            add("§l§c移除成员", "textures/ui/minus", () => this.openRemoveTeamMember(player, team, onBack));
        }
        add(leader ? "§l§4解散队伍" : "§l§c离开队伍", "textures/ui/cancel", () => this.confirmLeaveTeam(player, team, onBack));
        add("§l§8返回", "textures/ui/undo", () => onBack?.());
        Utils.showForm(player, form, response => actions[response.selection]?.());
    }

    static openTeamInviteList(player, team, onBack) {
        const candidates = world.getAllPlayers().filter(target => target.name !== player.name && !this.teamOf(target.name));
        const actions = [];
        const form = new ActionFormData().title("§l邀请组队").body(candidates.length ? "§0选择在线玩家。" : "§8没有可邀请的在线玩家。");
        for (const target of candidates) {
            form.button(`§0${target.name}\n§r§8${dimensionStatus(target)}`, "textures/ui/invite_base");
            actions.push(() => { this.inviteToTeam(player, target); this.openTeam(player, onBack); });
        }
        form.button("§l§8返回", "textures/ui/undo");
        actions.push(() => this.openTeam(player, onBack));
        Utils.showForm(player, form, response => actions[response.selection]?.());
    }

    static openTeamChat(player, team, onBack) {
        const form = new ModalFormData().title("§l队伍聊天").textField("发送给当前队伍", "最多 200 字");
        Utils.showForm(player, form, response => {
            const message = cleanText(response.formValues?.[0], 200);
            if (!response.canceled && message && this.teamOf(player.name)?.id === team.id) this.broadcastTeam(team, `§e${player.name}§0：${message}`);
            this.openTeam(player, onBack);
        });
    }

    static openTransferLeader(player, team, onBack) {
        const candidates = team.members.filter(name => name !== player.name && onlinePlayer(name));
        const form = new ModalFormData().title("§l移交队长").dropdown("选择新队长", candidates.length ? candidates : ["没有在线成员"]);
        Utils.showForm(player, form, response => {
            const target = candidates[response.formValues?.[0]];
            if (!response.canceled && target && this.teamOf(player.name)?.id === team.id && team.leaderName === player.name) {
                team.leaderName = target;
                this.broadcastTeam(team, `§e${target} §0成为新队长。`);
            }
            this.openTeam(player, onBack);
        });
    }

    static openRemoveTeamMember(player, team, onBack) {
        const candidates = team.members.filter(name => name !== player.name);
        const form = new ModalFormData().title("§l移除队员").dropdown("选择成员", candidates);
        Utils.showForm(player, form, response => {
            const target = candidates[response.formValues?.[0]];
            if (!response.canceled && target && this.teamOf(player.name)?.id === team.id && team.leaderName === player.name) {
                this.removeTeamMember(team, target);
                const removed = onlinePlayer(target);
                if (removed) Utils.tell(removed, `§c你被队长 ${player.name} 移出了队伍。`);
            }
            this.openTeam(player, onBack);
        });
    }

    static confirmLeaveTeam(player, team, onBack) {
        const leader = team.leaderName === player.name;
        const form = new MessageFormData().title(leader ? "§l§4解散队伍" : "§l离开队伍")
            .body(leader ? "§c解散后所有成员退出队伍，确定继续？" : "§0确定离开当前队伍？")
            .button1(leader ? "§4解散" : "§c离开").button2("§8取消");
        Utils.showForm(player, form, response => {
            if (response.selection === 0) {
                if (leader) this.dissolveTeam(team, player);
                else this.removeTeamMember(team, player.name);
                onBack?.();
            } else this.openTeam(player, onBack);
        });
    }

    static openDungeon(player) {
        const team = this.teamOf(player.name);
        if (!team) return Integration.send(player, "daily:dungeon");
        if (team.leaderName !== player.name) return Utils.tell(player, `§c只有队长 ${team.leaderName} 可以发起队伍副本。`);
        const offline = team.members.filter(name => !onlinePlayer(name));
        if (offline.length) return Utils.tell(player, `§c以下队员不在线：${offline.join("、")}`);
        Integration.send(player, "daily:dungeon_team", JSON.stringify({ teamId: team.id, leader: player.name, members: [...team.members] }));
    }

    static openGuild(player, onBack = null) {
        const guild = SocialStore.guildForPlayer(player.name);
        if (guild) return this.openGuildHome(player, guild, onBack);
        const actions = [];
        const applications = SocialStore.getGuilds().filter(value => value.applications?.some(entry => normalizePlayerName(entry.name) === normalizePlayerName(player.name)));
        const form = new ActionFormData().title("§l§6🏴 公会").body("§0你当前没有加入公会。");
        const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
        add(`§l§6创建公会\n§r§8花费 ${Utils.formatCurrency(this.settings.guildCreateCost || 15000)}`, "textures/ui/plus", () => this.openCreateGuild(player, onBack));
        add("§l§b查找公会", "textures/ui/magnifyingGlass", () => this.openGuildBrowser(player, onBack));
        add(`§l§e我的申请\n§r§8${applications.length} 个待审核`, "textures/ui/invite_base", () => this.openMyGuildApplications(player, onBack));
        add("§l§8返回", "textures/ui/undo", () => onBack?.());
        Utils.showForm(player, form, response => actions[response.selection]?.());
    }

    static openCreateGuild(player, onBack) {
        const form = new ModalFormData().title("§l§6创建公会")
            .textField("公会名称（2～16字）", "例如：渡鸦营地")
            .textField("简称（2～5字母/汉字/数字）", "例如：RAVEN")
            .textField("简介（最多80字）", "主要进行 PvE、副本和基地建设");
        Utils.showForm(player, form, response => {
            if (response.canceled) return this.openGuild(player, onBack);
            const name = cleanText(response.formValues?.[0], 16);
            const tag = cleanText(response.formValues?.[1], 5).toUpperCase();
            const description = cleanText(response.formValues?.[2], 80);
            if (name.length < 2 || !/^[A-Z0-9\u4e00-\u9fff]{2,5}$/.test(tag)) {
                Utils.tell(player, "§c名称或简称格式错误。");
                return this.openGuild(player, onBack);
            }
            if (SocialStore.guildForPlayer(player.name)) return Utils.tell(player, "§c你已经加入公会。");
            const duplicate = SocialStore.getGuilds().some(guild => guild.name.toLowerCase() === name.toLowerCase() || guild.tag.toLowerCase() === tag.toLowerCase());
            if (duplicate) return Utils.tell(player, "§c公会名称或简称已经被使用。");
            const cost = Number(this.settings.guildCreateCost || 15000);
            if (!EconomyManager.hasBalance(player, cost)) return Utils.tell(player, `§c创建公会需要 ${Utils.formatCurrency(cost)}。`);
            EconomyManager.removeBalance(player, cost);
            const id = `guild_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
            const guild = {
                id, name, tag, description: description || "这个公会还没有填写简介。",
                leaderName: player.name,
                members: [{ name: player.name, role: "leader", joinedAt: Date.now() }],
                applications: [], recentMessages: [], baseLocation: null, createdAt: Date.now(),
            };
            SocialStore.saveGuild(guild);
            SocialStore.setPlayerGuild(player.name, id);
            AuditManager.log("guild_create", player, name, `tag=${tag} cost=${cost}`);
            Utils.tell(player, `§a公会 §e[${tag}] ${name} §a创建成功。`);
            this.openGuildHome(player, guild, onBack);
        });
    }

    static openGuildBrowser(player, onBack, filter = "") {
        const needle = cleanText(filter, 16).toLowerCase();
        const guilds = SocialStore.getGuilds().filter(guild => !needle || guild.name.toLowerCase().includes(needle) || guild.tag.toLowerCase().includes(needle))
            .sort((a, b) => (b.members?.length || 0) - (a.members?.length || 0));
        const actions = [];
        const form = new ActionFormData().title("§l§b查找公会").body(`§0找到 §e${guilds.length} §0个公会。`);
        form.button("§l§b按名称搜索", "textures/ui/magnifyingGlass");
        actions.push(() => this.openGuildSearch(player, onBack));
        for (const guild of guilds.slice(0, 50)) {
            form.button(`§6[${guild.tag}] §0${guild.name}\n§r§8${guild.members?.length || 0}/${this.settings.guildMaxMembers || 30} · 会长 ${guild.leaderName}`, "textures/ui/icon_steve");
            actions.push(() => this.openGuildDetail(player, guild, () => this.openGuildBrowser(player, onBack, filter)));
        }
        form.button("§l§8返回", "textures/ui/undo");
        actions.push(() => this.openGuild(player, onBack));
        Utils.showForm(player, form, response => actions[response.selection]?.());
    }

    static openGuildSearch(player, onBack) {
        const form = new ModalFormData().title("§l搜索公会").textField("公会名称或简称", "RAVEN");
        Utils.showForm(player, form, response => this.openGuildBrowser(player, onBack, response.formValues?.[0] || ""));
    }

    static openGuildDetail(player, guild, onBack = null) {
        const current = SocialStore.getGuild(guild.id);
        if (!current) return this.openGuild(player, onBack);
        if (SocialStore.guildForPlayer(player.name)?.id === current.id) return this.openGuildHome(player, current, onBack);
        const applied = current.applications?.some(entry => normalizePlayerName(entry.name) === normalizePlayerName(player.name));
        const form = new MessageFormData().title(`§l§6[${current.tag}] ${current.name}`).body(
            `§0成员：§e${current.members.length}/${this.settings.guildMaxMembers || 30}\n§0会长：§e${current.leaderName}\n\n§0简介：\n§8${current.description}`
        ).button1(applied ? "§8已申请" : "§a申请加入").button2("§8返回");
        Utils.showForm(player, form, response => {
            if (response.selection === 0 && !applied) {
                if (SocialStore.guildForPlayer(player.name)) return Utils.tell(player, "§c你已经加入其他公会。");
                current.applications = current.applications || [];
                current.applications.push({ name: player.name, createdAt: Date.now() });
                current.applications = current.applications.slice(-100);
                SocialStore.saveGuild(current);
                Utils.tell(player, `§a已申请加入 §e[${current.tag}] ${current.name}§a。`);
                const leader = onlinePlayer(current.leaderName);
                if (leader) Utils.tell(leader, `§e${player.name} §a申请加入公会。`);
            }
            onBack?.();
        });
    }

    static openMyGuildApplications(player, onBack) {
        const guilds = SocialStore.getGuilds().filter(guild => guild.applications?.some(entry => normalizePlayerName(entry.name) === normalizePlayerName(player.name)));
        const form = new ActionFormData().title("§l§e我的公会申请").body(guilds.length ? guilds.map(guild => `§6[${guild.tag}] §0${guild.name}`).join("\n") : "§8当前没有待审核申请。");
        form.button("§l§8返回", "textures/ui/undo");
        Utils.showForm(player, form, () => this.openGuild(player, onBack));
    }

    static openGuildHome(player, guild, onBack = null) {
        const current = SocialStore.getGuild(guild.id);
        if (!current) {
            SocialStore.setPlayerGuild(player.name, "");
            return this.openGuild(player, onBack);
        }
        const leader = normalizePlayerName(current.leaderName) === normalizePlayerName(player.name);
        const onlineCount = current.members.filter(member => onlinePlayer(member.name)).length;
        const actions = [];
        const form = new ActionFormData().title(`§l§6🏴 [${current.tag}] ${current.name}`).body(
            `§0会长：§e${current.leaderName}\n§0成员：§e${current.members.length}/${this.settings.guildMaxMembers || 30}\n§0在线：§a${onlineCount}\n§0职位：§e${leader ? "Leader" : "Member"}`
        );
        const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
        add(`§l§d公会频道\n§r§8查看消息或发送信息`, "textures/ui/chat_send", () => this.openGuildChat(player, current, onBack));
        add("§l§b公会成员", "textures/ui/FriendsIcon", () => this.openGuildMembers(player, current, onBack));
        add(`§l§a公会基地\n§r§8${current.baseLocation ? "传送或查看位置" : "尚未设置"}`, "textures/ui/map_icon", () => this.openGuildBase(player, current, onBack));
        add("§l§6公会信息", "textures/ui/icon_book_writable", () => this.openGuildInfo(player, current, onBack));
        if (leader) {
            add(`§l§e申请列表\n§r§8${current.applications?.length || 0} 条`, "textures/ui/invite_base", () => this.openGuildApplications(player, current, onBack));
            add("§l§c管理成员与公会", "textures/ui/gear", () => this.openGuildManagement(player, current, onBack));
        } else add("§l§c退出公会", "textures/ui/cancel", () => this.confirmLeaveGuild(player, current, onBack));
        add("§l§8返回", "textures/ui/undo", () => onBack?.());
        Utils.showForm(player, form, response => actions[response.selection]?.());
    }

    static openGuildChat(player, guild, onBack) {
        const current = SocialStore.getGuild(guild.id);
        if (!current?.members?.some(member => normalizePlayerName(member.name) === normalizePlayerName(player.name))) {
            return this.openGuild(player, onBack);
        }
        const messages = Array.isArray(current.recentMessages) ? current.recentMessages.slice(-20) : [];
        const body = messages.length
            ? messages.map(message => `§8${new Date(message.createdAt).toLocaleTimeString()} §e${message.sender}§8：§0${message.message}`).join("\n")
            : "§8公会频道还没有消息。";
        const form = new ActionFormData().title(`§l§d[${current.tag}] 公会频道`).body(body)
            .button("§l§a发送消息", "textures/ui/chat_send")
            .button("§l§8返回", "textures/ui/undo");
        Utils.showForm(player, form, response => {
            if (response.selection === 0) this.openGuildChatCompose(player, current, onBack);
            else this.openGuildHome(player, current, onBack);
        });
    }

    static openGuildChatCompose(player, guild, onBack) {
        const previous = Number(this.guildChatTicks.get(player.name) ?? -1000);
        if (system.currentTick - previous < 40) {
            Utils.tell(player, "§c公会消息发送得太快，请稍后再试。");
            return this.openGuildChat(player, guild, onBack);
        }
        const form = new ModalFormData().title("§l发送公会消息").textField("消息（最多 200 字）", "今晚一起打副本吗？");
        Utils.showForm(player, form, response => {
            if (response.canceled) return this.openGuildChat(player, guild, onBack);
            const current = SocialStore.getGuild(guild.id);
            const member = current?.members?.some(entry => normalizePlayerName(entry.name) === normalizePlayerName(player.name));
            if (!current || !member) return Utils.tell(player, "§c你已经不在这个公会中。");
            const message = cleanText(response.formValues?.[0], 200);
            if (!message) return this.openGuildChat(player, current, onBack);
            this.guildChatTicks.set(player.name, system.currentTick);
            current.recentMessages = Array.isArray(current.recentMessages) ? current.recentMessages : [];
            current.recentMessages.push({ sender: player.name, message, createdAt: Date.now() });
            current.recentMessages = current.recentMessages.slice(-20);
            SocialStore.saveGuild(current);
            for (const guildMember of current.members) {
                const target = onlinePlayer(guildMember.name);
                if (target) Utils.tell(target, `§d[公会] §e${player.name}§8：§0${message}`);
            }
            AuditManager.log("guild_chat", player, current.id, `members=${current.members.length}`);
        });
    }

    static openGuildMembers(player, guild, onBack) {
        const members = [...guild.members].sort((a, b) => Number(b.role === "leader") - Number(a.role === "leader") || a.name.localeCompare(b.name));
        const actions = [];
        const form = new ActionFormData().title(`§l§b${guild.name} · 成员`).body(`§0成员：§e${members.length}`);
        for (const member of members) {
            const online = onlinePlayer(member.name);
            form.button(`${member.role === "leader" ? "§6👑" : "§8•"} §0${member.name}\n§r§8${member.role === "leader" ? "Leader" : "Member"} · ${online ? "§a在线" : "§8离线"}`, "textures/ui/icon_steve");
            actions.push(() => this.openPlayerCard(player, member.name, () => this.openGuildMembers(player, guild, onBack)));
        }
        form.button("§l§8返回", "textures/ui/undo");
        actions.push(() => this.openGuildHome(player, guild, onBack));
        Utils.showForm(player, form, response => actions[response.selection]?.());
    }

    static openGuildInfo(player, guild, onBack) {
        const leader = normalizePlayerName(guild.leaderName) === normalizePlayerName(player.name);
        const form = new MessageFormData().title(`§l§6[${guild.tag}] ${guild.name}`).body(
            `§0创建时间：§8${new Date(guild.createdAt).toLocaleDateString()}\n§0会长：§e${guild.leaderName}\n\n§0简介：\n§8${guild.description}`
        ).button1(leader ? "§a编辑简介" : "§8返回").button2("§8关闭");
        Utils.showForm(player, form, response => {
            if (response.selection === 0 && leader) this.openEditGuildDescription(player, guild, onBack);
            else if (response.selection === 0) this.openGuildHome(player, guild, onBack);
        });
    }

    static openEditGuildDescription(player, guild, onBack) {
        const form = new ModalFormData().title("§l编辑公会简介").textField("简介（最多80字）", "公会简介", guild.description || "");
        Utils.showForm(player, form, response => {
            if (!response.canceled && normalizePlayerName(guild.leaderName) === normalizePlayerName(player.name)) {
                guild.description = cleanText(response.formValues?.[0], 80) || guild.description;
                SocialStore.saveGuild(guild);
                AuditManager.log("guild_edit", player, guild.name, "description");
            }
            this.openGuildHome(player, guild, onBack);
        });
    }

    static openGuildBase(player, guild, onBack) {
        const leader = normalizePlayerName(guild.leaderName) === normalizePlayerName(player.name);
        const actions = [];
        const location = guild.baseLocation;
        const form = new ActionFormData().title("§l§a公会基地").body(location
            ? `§0维度：§e${location.dimension}\n§0位置：§e${Math.floor(location.x)}, ${Math.floor(location.y)}, ${Math.floor(location.z)}\n§8基地位置只是传送点，不会自动创建公会领地。`
            : "§8公会尚未设置基地位置。基地位置只是传送点，不会自动创建公会领地。"
        );
        const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
        if (location) add("§l§a前往公会基地", "textures/ui/map_icon", () => {
            try {
                player.teleport({ x: location.x, y: location.y, z: location.z }, { dimension: world.getDimension(location.dimension) });
                Utils.sound.teleport(player);
                AuditManager.log("guild_base_visit", player, guild.name, location.dimension);
            } catch { Utils.tell(player, "§c公会基地传送失败。"); }
        });
        if (leader) add("§l§6设置当前位置为基地", "textures/ui/plus", () => {
            guild.baseLocation = { dimension: player.dimension.id, x: player.location.x, y: player.location.y, z: player.location.z };
            SocialStore.saveGuild(guild);
            AuditManager.log("guild_base_set", player, guild.name, `${guild.baseLocation.dimension} ${Math.floor(guild.baseLocation.x)},${Math.floor(guild.baseLocation.y)},${Math.floor(guild.baseLocation.z)}`);
            Utils.tell(player, "§a公会基地位置已更新；没有自动生成领地保护。");
            this.openGuildHome(player, guild, onBack);
        });
        add("§l§8返回", "textures/ui/undo", () => this.openGuildHome(player, guild, onBack));
        Utils.showForm(player, form, response => actions[response.selection]?.());
    }

    static openGuildApplications(player, guild, onBack) {
        const applications = guild.applications || [];
        const actions = [];
        const form = new ActionFormData().title("§l§e公会申请").body(`§0待审核：§e${applications.length}`);
        for (const application of applications) {
            form.button(`§0${application.name}\n§r§8申请加入公会`, "textures/ui/invite_base");
            actions.push(() => this.openGuildApplicationDecision(player, guild, application.name, onBack));
        }
        form.button("§l§8返回", "textures/ui/undo");
        actions.push(() => this.openGuildHome(player, guild, onBack));
        Utils.showForm(player, form, response => actions[response.selection]?.());
    }

    static openGuildApplicationDecision(player, guild, applicantName, onBack) {
        const form = new MessageFormData().title("§l公会申请审核").body(`§e${applicantName} §0申请加入 §6[${guild.tag}] ${guild.name}§0。`).button1("§a批准").button2("§c拒绝");
        Utils.showForm(player, form, response => {
            const current = SocialStore.getGuild(guild.id);
            if (!current || normalizePlayerName(current.leaderName) !== normalizePlayerName(player.name)) return;
            current.applications = (current.applications || []).filter(entry => normalizePlayerName(entry.name) !== normalizePlayerName(applicantName));
            if (response.selection === 0) {
                if (current.members.length >= (this.settings.guildMaxMembers || 30)) Utils.tell(player, "§c公会成员已满。");
                else if (SocialStore.guildForPlayer(applicantName)) Utils.tell(player, "§c该玩家已经加入其他公会。");
                else {
                    current.members.push({ name: applicantName, role: "member", joinedAt: Date.now() });
                    SocialStore.setPlayerGuild(applicantName, current.id);
                    const applicant = onlinePlayer(applicantName);
                    if (applicant) Utils.tell(applicant, `§a你已加入 §e[${current.tag}] ${current.name}§a。`);
                    AuditManager.log("guild_join", player, applicantName, current.name);
                }
            }
            SocialStore.saveGuild(current);
            this.openGuildApplications(player, current, onBack);
        });
    }

    static openGuildManagement(player, guild, onBack) {
        const actions = [];
        const form = new ActionFormData().title("§l§c公会管理").body("§cLeader 操作会立即影响持久化公会数据。");
        const add = (label, icon, action) => { form.button(label, icon); actions.push(action); };
        add("§l§a邀请在线玩家", "textures/ui/plus", () => this.openGuildInviteList(player, guild, onBack));
        if (guild.members.length > 1) {
            add("§l§c移除成员", "textures/ui/minus", () => this.openGuildRemoveMember(player, guild, onBack));
            add("§l§6移交会长", "textures/ui/trade_icon", () => this.openGuildTransferLeader(player, guild, onBack));
        }
        add("§l§4解散公会", "textures/ui/trash", () => this.confirmDisbandGuild(player, guild, onBack));
        add("§l§8返回", "textures/ui/undo", () => this.openGuildHome(player, guild, onBack));
        Utils.showForm(player, form, response => actions[response.selection]?.());
    }

    static openGuildInviteList(player, guild, onBack) {
        const candidates = world.getAllPlayers().filter(target => target.name !== player.name && !SocialStore.guildForPlayer(target.name));
        const actions = [];
        const form = new ActionFormData().title("§l邀请加入公会").body(candidates.length ? "§0选择在线玩家。" : "§8没有可邀请的在线玩家。");
        for (const target of candidates) {
            form.button(`§0${target.name}\n§r§8${dimensionStatus(target)}`, "textures/ui/invite_base");
            actions.push(() => this.sendGuildInvite(player, target, guild, onBack));
        }
        form.button("§l§8返回", "textures/ui/undo");
        actions.push(() => this.openGuildManagement(player, guild, onBack));
        Utils.showForm(player, form, response => actions[response.selection]?.());
    }

    static sendGuildInvite(leader, target, guild, onBack) {
        Utils.tell(leader, `§a已邀请 ${target.name} 加入公会。`);
        const form = new MessageFormData().title("§l§6公会邀请").body(`§e${leader.name} §0邀请你加入 §6[${guild.tag}] ${guild.name}§0。`).button1("§a加入").button2("§c拒绝");
        Utils.showForm(target, form, response => {
            const current = SocialStore.getGuild(guild.id);
            if (response.selection !== 0) return Utils.tell(leader, `§8${target.name} 拒绝了公会邀请。`);
            if (!current || current.leaderName !== leader.name || current.members.length >= (this.settings.guildMaxMembers || 30) || SocialStore.guildForPlayer(target.name)) return Utils.tell(target, "§c公会邀请已经失效。");
            current.members.push({ name: target.name, role: "member", joinedAt: Date.now() });
            current.applications = (current.applications || []).filter(entry => normalizePlayerName(entry.name) !== normalizePlayerName(target.name));
            SocialStore.saveGuild(current);
            SocialStore.setPlayerGuild(target.name, current.id);
            Utils.tell(target, `§a你已加入 §e[${current.tag}] ${current.name}§a。`);
            AuditManager.log("guild_join", leader, target.name, current.name);
        });
        this.openGuildManagement(leader, guild, onBack);
    }

    static openGuildRemoveMember(player, guild, onBack) {
        const candidates = guild.members.filter(member => member.role !== "leader").map(member => member.name);
        const form = new ModalFormData().title("§l移除公会成员").dropdown("选择成员", candidates);
        Utils.showForm(player, form, response => {
            const targetName = candidates[response.formValues?.[0]];
            const current = SocialStore.getGuild(guild.id);
            if (!response.canceled && targetName && current?.leaderName === player.name) {
                current.members = current.members.filter(member => normalizePlayerName(member.name) !== normalizePlayerName(targetName));
                SocialStore.saveGuild(current);
                SocialStore.setPlayerGuild(targetName, "");
                const target = onlinePlayer(targetName);
                if (target) Utils.tell(target, `§c你已被移出公会 ${current.name}。`);
                AuditManager.log("guild_kick", player, targetName, current.name);
            }
            this.openGuildManagement(player, current || guild, onBack);
        });
    }

    static openGuildTransferLeader(player, guild, onBack) {
        const candidates = guild.members.filter(member => member.role !== "leader").map(member => member.name);
        const form = new ModalFormData().title("§l移交会长").dropdown("选择新会长", candidates);
        Utils.showForm(player, form, response => {
            const targetName = candidates[response.formValues?.[0]];
            const current = SocialStore.getGuild(guild.id);
            if (!response.canceled && targetName && current?.leaderName === player.name) {
                current.leaderName = targetName;
                current.members = current.members.map(member => ({ ...member, role: normalizePlayerName(member.name) === normalizePlayerName(targetName) ? "leader" : "member" }));
                SocialStore.saveGuild(current);
                AuditManager.log("guild_transfer", player, targetName, current.name);
                const target = onlinePlayer(targetName);
                if (target) Utils.tell(target, `§a你已成为 ${current.name} 的会长。`);
                Utils.tell(player, `§a会长已移交给 ${targetName}。`);
            }
            this.openGuildHome(player, current || guild, onBack);
        });
    }

    static confirmLeaveGuild(player, guild, onBack) {
        const form = new MessageFormData().title("§l退出公会").body(`§c确定退出 §e[${guild.tag}] ${guild.name}§c？`).button1("§c退出").button2("§8取消");
        Utils.showForm(player, form, response => {
            if (response.selection === 0) {
                const current = SocialStore.getGuild(guild.id);
                if (current) {
                    current.members = current.members.filter(member => normalizePlayerName(member.name) !== normalizePlayerName(player.name));
                    SocialStore.saveGuild(current);
                }
                SocialStore.setPlayerGuild(player.name, "");
                AuditManager.log("guild_leave", player, guild.name, "member left");
                return this.openGuild(player, onBack);
            }
            this.openGuildHome(player, guild, onBack);
        });
    }

    static confirmDisbandGuild(player, guild, onBack) {
        const form = new MessageFormData().title("§l§4解散公会").body(`§c公会成员、申请和基地位置将永久删除，创建费用不会返还。确定解散 ${guild.name}？`).button1("§4永久解散").button2("§8取消");
        Utils.showForm(player, form, response => {
            const current = SocialStore.getGuild(guild.id);
            if (response.selection === 0 && current?.leaderName === player.name) {
                for (const member of current.members) {
                    SocialStore.setPlayerGuild(member.name, "");
                    const online = onlinePlayer(member.name);
                    if (online && online.name !== player.name) Utils.tell(online, `§c公会 ${current.name} 已被解散。`);
                }
                SocialStore.deleteGuild(current.id);
                AuditManager.log("guild_disband", player, current.name, `members=${current.members.length}`);
                Utils.tell(player, "§8公会已解散。");
                return this.openGuild(player, onBack);
            }
            this.openGuildManagement(player, current || guild, onBack);
        });
    }
}
