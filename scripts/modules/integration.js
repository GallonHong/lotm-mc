import { world, system } from "@minecraft/server";

const SERVER_HEARTBEAT = "interop:sapi_server_heartbeat";
const LOTM_HEARTBEAT = "interop:lotm_heartbeat";
const HEARTBEAT_MAX_AGE_MS = 15000;

/** 两个独立 Add-on 之间不使用源码导入，只通过心跳与 scriptevent 联动。 */
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
