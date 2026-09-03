import { world } from "@minecraft/server";

const DIRECTORY_KEY = "sapi:social:directory:v1";
const GUILD_DIRECTORY_KEY = "sapi:social:guild_directory:v1";

export function normalizePlayerName(value) {
    return String(value || "").trim().toLowerCase();
}

function hash(value) {
    let result = 2166136261;
    for (const character of String(value || "")) {
        result ^= character.charCodeAt(0);
        result = Math.imul(result, 16777619);
    }
    return (result >>> 0).toString(36);
}

function readJson(key, fallback) {
    try {
        const raw = world.getDynamicProperty(key);
        if (typeof raw !== "string" || !raw) return fallback;
        const value = JSON.parse(raw);
        return value ?? fallback;
    } catch {
        return fallback;
    }
}

function writeJson(key, value) {
    try {
        world.setDynamicProperty(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.warn(`[SocialStore] Failed to save ${key}: ${error}`);
        return false;
    }
}

function profilePropertyKey(name) {
    return `sapi:social:player:${hash(normalizePlayerName(name))}`;
}

function guildPropertyKey(id) {
    return `sapi:social:guild:${String(id || "").replace(/[^a-z0-9_-]/gi, "").slice(0, 40)}`;
}

export class SocialStore {
    static directory() {
        const value = readJson(DIRECTORY_KEY, {});
        return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    }

    static saveDirectory(directory) {
        return writeJson(DIRECTORY_KEY, directory);
    }

    static defaultProfile(name) {
        return {
            name: String(name || "未知玩家").slice(0, 32),
            title: "幸存者",
            wanted: "正常",
            friends: [],
            friendRequests: [],
            guildId: "",
            createdAt: Date.now(),
            lastSeen: Date.now(),
        };
    }

    static getProfile(name, create = false) {
        const normalized = normalizePlayerName(name);
        if (!normalized) return null;
        const directory = this.directory();
        const knownName = directory[normalized]?.name || String(name).trim();
        const saved = readJson(profilePropertyKey(normalized), null);
        if (!saved && !create) return null;
        const profile = { ...this.defaultProfile(knownName), ...(saved || {}) };
        profile.name = knownName || profile.name;
        profile.friends = Array.isArray(profile.friends) ? [...new Set(profile.friends.map(String))].slice(0, 50) : [];
        profile.friendRequests = Array.isArray(profile.friendRequests) ? profile.friendRequests.slice(-50) : [];
        return profile;
    }

    static saveProfile(profile) {
        if (!profile?.name) return false;
        const normalized = normalizePlayerName(profile.name);
        const directory = this.directory();
        directory[normalized] = { name: profile.name, lastSeen: Number(profile.lastSeen || Date.now()) };
        if (!this.saveDirectory(directory)) return false;
        return writeJson(profilePropertyKey(normalized), profile);
    }

    static touchPlayer(player) {
        if (!player?.name) return null;
        const profile = this.getProfile(player.name, true);
        profile.name = player.name;
        profile.lastSeen = Date.now();
        this.saveProfile(profile);
        return profile;
    }

    static allProfiles() {
        return Object.values(this.directory()).map(entry => this.getProfile(entry.name, false)).filter(Boolean);
    }

    static areFriends(leftName, rightName) {
        const profile = this.getProfile(leftName, false);
        const right = normalizePlayerName(rightName);
        return !!profile?.friends?.some(name => normalizePlayerName(name) === right);
    }

    static requestFriend(fromName, toName, limit = 50) {
        const from = this.getProfile(fromName, true);
        const target = this.getProfile(toName, true);
        if (!from || !target || normalizePlayerName(from.name) === normalizePlayerName(target.name)) return { ok: false, reason: "不能添加自己" };
        if (this.areFriends(from.name, target.name)) return { ok: false, reason: "你们已经是好友" };
        if (from.friends.length >= limit || target.friends.length >= limit) return { ok: false, reason: "一方好友数量已达上限" };
        if (target.friendRequests.some(entry => normalizePlayerName(entry.from) === normalizePlayerName(from.name))) return { ok: false, reason: "好友申请已经发送" };
        target.friendRequests.push({ from: from.name, createdAt: Date.now() });
        this.saveProfile(target);
        return { ok: true };
    }

    static acceptFriend(targetName, fromName, limit = 50) {
        const target = this.getProfile(targetName, true);
        const from = this.getProfile(fromName, true);
        if (!target || !from) return { ok: false, reason: "玩家资料不存在" };
        const requestIndex = target.friendRequests.findIndex(entry => normalizePlayerName(entry.from) === normalizePlayerName(from.name));
        if (requestIndex < 0) return { ok: false, reason: "申请已经失效" };
        if (target.friends.length >= limit || from.friends.length >= limit) return { ok: false, reason: "一方好友数量已达上限" };
        target.friendRequests.splice(requestIndex, 1);
        if (!target.friends.some(name => normalizePlayerName(name) === normalizePlayerName(from.name))) target.friends.push(from.name);
        if (!from.friends.some(name => normalizePlayerName(name) === normalizePlayerName(target.name))) from.friends.push(target.name);
        this.saveProfile(target);
        this.saveProfile(from);
        return { ok: true };
    }

    static rejectFriend(targetName, fromName) {
        const target = this.getProfile(targetName, true);
        if (!target) return false;
        const before = target.friendRequests.length;
        target.friendRequests = target.friendRequests.filter(entry => normalizePlayerName(entry.from) !== normalizePlayerName(fromName));
        this.saveProfile(target);
        return target.friendRequests.length !== before;
    }

    static removeFriend(leftName, rightName) {
        const left = this.getProfile(leftName, true);
        const right = this.getProfile(rightName, true);
        if (!left || !right) return false;
        left.friends = left.friends.filter(name => normalizePlayerName(name) !== normalizePlayerName(right.name));
        right.friends = right.friends.filter(name => normalizePlayerName(name) !== normalizePlayerName(left.name));
        this.saveProfile(left);
        this.saveProfile(right);
        return true;
    }

    static guildDirectory() {
        const value = readJson(GUILD_DIRECTORY_KEY, []);
        return Array.isArray(value) ? value : [];
    }

    static getGuild(id) {
        if (!id) return null;
        const value = readJson(guildPropertyKey(id), null);
        return value && typeof value === "object" ? value : null;
    }

    static getGuilds() {
        return this.guildDirectory().map(entry => this.getGuild(entry.id)).filter(Boolean);
    }

    static saveGuild(guild) {
        if (!guild?.id || !guild?.name) return false;
        if (!writeJson(guildPropertyKey(guild.id), guild)) return false;
        const directory = this.guildDirectory().filter(entry => entry.id !== guild.id);
        directory.push({ id: guild.id, name: guild.name, tag: guild.tag, leaderName: guild.leaderName, memberCount: guild.members?.length || 0 });
        return writeJson(GUILD_DIRECTORY_KEY, directory.slice(-200));
    }

    static deleteGuild(id) {
        try { world.setDynamicProperty(guildPropertyKey(id), undefined); } catch {}
        const directory = this.guildDirectory().filter(entry => entry.id !== id);
        return writeJson(GUILD_DIRECTORY_KEY, directory);
    }

    static guildForPlayer(name) {
        const profile = this.getProfile(name, false);
        return profile?.guildId ? this.getGuild(profile.guildId) : null;
    }

    static setPlayerGuild(name, guildId) {
        const profile = this.getProfile(name, true);
        if (!profile) return false;
        profile.guildId = guildId || "";
        profile.lastSeen = Date.now();
        return this.saveProfile(profile);
    }
}
