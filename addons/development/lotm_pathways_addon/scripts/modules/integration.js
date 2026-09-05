import { world, system } from "@minecraft/server";

const SERVER_HEARTBEAT = "interop:sapi_server_heartbeat";
const LOTM_HEARTBEAT = "interop:lotm_heartbeat";
const DAILY_EVENTS_HEARTBEAT = "interop:daily_events_heartbeat";
const DAILY_SALES_KEY = "interop:daily_sales:v1";
const HEARTBEAT_MAX_AGE_MS = 15000;

/** 独立 Add-on 之间不使用源码导入，只通过心跳、动态属性与 scriptevent 联动。 */
export class Integration {
    static readHeartbeat(key) {
        try {
            return Number(world.getDynamicProperty(key) || 0);
        } catch {
            return 0;
        }
    }

    static isAlive(key) {
        const heartbeat = this.readHeartbeat(key);
        return heartbeat > 0 && Date.now() - heartbeat <= HEARTBEAT_MAX_AGE_MS;
    }

    static isServerAvailable() {
        return this.isAlive(SERVER_HEARTBEAT);
    }

    static isLotmAvailable() {
        return this.isAlive(LOTM_HEARTBEAT);
    }

    static isDailyEventsAvailable() {
        return this.isAlive(DAILY_EVENTS_HEARTBEAT);
    }

    /** 累计成交额桥接：日常 Add-on 只读取差值，不介入 SAPI 交易。 */
    static recordDailySale(playerName, amount) {
        const value = Math.max(0, Math.floor(Number(amount) || 0));
        if (!playerName || !value) return;
        try {
            const raw = world.getDynamicProperty(DAILY_SALES_KEY);
            const totals = typeof raw === "string" ? JSON.parse(raw) : {};
            totals[playerName] = Math.max(0, Math.floor(Number(totals[playerName]) || 0)) + value;
            world.setDynamicProperty(DAILY_SALES_KEY, JSON.stringify(totals));
        } catch (error) {
            console.warn(`[Integration] Failed to record daily sale: ${error}`);
        }
    }

    static startServerHeartbeat() {
        this.startHeartbeat(SERVER_HEARTBEAT);
    }

    static startLotmHeartbeat() {
        this.startHeartbeat(LOTM_HEARTBEAT);
    }

    static startHeartbeat(key) {
        const beat = () => {
            try { world.setDynamicProperty(key, Date.now()); } catch {}
        };
        beat();
        system.runInterval(beat, 100);
    }

    static send(player, eventId, message = "") {
        try {
            player.runCommand(`scriptevent ${eventId} ${message}`.trim());
            return true;
        } catch {
            return false;
        }
    }
}
