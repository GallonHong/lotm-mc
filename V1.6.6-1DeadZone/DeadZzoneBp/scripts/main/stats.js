import * as mc from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import isMoving from "./test.js";

createScore("player.kills");
createScore("infected.kills");
createScore("infected_miniboss.kills");
createScore("scavenger.kills");
createScore("marauder.kills");
createScore("time.playing");
createScore("survival.time");
createScore("distance.walked");
createScore("headshots");
createScore("kills");
createScore("deaths");
createScore("longest.kill.distance");
createScore("survival.time.leaderboard");

function createScore(name) {
    if (mc.world.scoreboard.getObjective(name)) return;
    mc.world.scoreboard.addObjective(name, name);
}

function getScore(objective, plr, setValue = true) {
    try {
        const obj = mc.world.scoreboard.getObjective(objective);
        if (typeof plr === 'string') {
            const participant = obj.getParticipants().find(v => v.displayName === plr);
            return participant ? obj.getScore(participant) : (setValue ? 0 : undefined);
        } else if (plr && plr.scoreboardIdentity) {
            return obj.getScore(plr.scoreboardIdentity) || (setValue ? 0 : undefined);
        }
        return setValue ? 0 : undefined;
    } catch (error) {
        console.error(`Error getting score for ${objective}:`, error);
        return setValue ? 0 : undefined;
    }
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
}

function resetPlayerScores(pl) {
    const scores = ["player.kills", "infected.kills", "time.playing", "survival.time", "longest.kill.distance", "scavenger.kills", "distance.walked", "marauder.kills"];
    scores.forEach(async (score) => {
        await pl.runCommandAsync(`scoreboard players set @s ${score} 0`);
    });
}

function showPlayerStats(pl) {
    mc.system.run(() => {
        const playerKills = getScore('player.kills', pl, true) || 0;
        const infectedKills = getScore('infected.kills', pl, true) || 0;
        const timePlaying = getScore('time.playing', pl, true) || 0;
        const survivalTime = getScore('survival.time', pl, true) || 0;
        const distanceWalked = getScore('distance.walked', pl, true) || 0;
        const longestKillDistance = getScore('longest.kill.distance', pl, true) || 0;

        const bodyRawText = [
        	{ text: `\xA77` },
            { translate: `statu.player_killed` },
            { text: `\n\xA7r${playerKills}\n\n\xA77` },
            { translate: `statu.infected_killed` },
            { text: `\n\xA7r${infectedKills}\n\n\xA77` },
            { translate: `statu.time_survived` },
            { text: `\n\xA7r${formatTime(survivalTime)}\n\n\xA77` },
            { translate: `statu.distance_walk` },
            { text: `\n\xA7r${distanceWalked} blocks\n\n\xA77` },
            { translate: `statu.kill_distance` },
            { text: `\n\xA7r${longestKillDistance} meters\n\n` },
        ];

        const form = new ActionFormData();
        form.title(`§lStatistics§r`);
        
        form.body({ rawtext: bodyRawText });
        
        form.button(`CLOSE`);

        form.show(pl).then((res) => {
            if (res.selection === 0) {
                pl.runCommandAsync(`tag @s remove stats`);
                return;
            }
        });
    });
}

function showAdditionalStats(pl) {
    mc.system.run(() => {
    	const scavengerKills = getScore('scavenger.kills', pl, true) || 0;
        const marauderKills = getScore('marauder.kills', pl, true) || 0;
        
        const form2 = new ActionFormData();
        form2.title(`§lAdditional Statistics§r`);
        form2.body(`${Body2.join("§r\n§r")
            .replace(/%pl\.scavengerKills%/g, scavengerKills)
            .replace(/%pl\.marauderKills%/g, marauderKills)}`);
        form2.button(`BACK`);
        form2.button(`CLOSE`);

        form2.show(pl).then((res) => {
            if (res.selection === 0) {
                showPlayerStats(pl);
            } else if (res.selection === 1) {
                pl.runCommandAsync(`tag @s remove stats`);
                return;
            }
        });
    });
}

mc.world.afterEvents.entityDie.subscribe(async data => {
    try {
        const deadEntity = data.deadEntity;
        const damageSource = data.damageSource;
        const killer = damageSource?.damagingEntity;

        if (!deadEntity || !killer) {
            console.log("No deadEntity or killer found.");
            return;
        }

        console.log(`${killer.typeId} was killed by ${deadEntity.typeId}`);

        const survivalTime = getScore("survival.time", deadEntity, true) || 0;
        const leaderboardTime = getScore("survival.time.leaderboard", deadEntity, true) || 0;

        console.log(`Survival Time: ${survivalTime}, Leaderboard Time: ${leaderboardTime}`);

        if (survivalTime > leaderboardTime) {
            const leaderboardObjective = mc.world.scoreboard.getObjective("survival.time.leaderboard");
            const identity = deadEntity.scoreboardIdentity;
            if (identity) {
                leaderboardObjective.setScore(identity, survivalTime);
                console.log(`Updated leaderboard time for ${deadEntity.name}`);
            } else {
                console.log(`No scoreboard identity found for ${deadEntity.name}`);
            }
        }

        const isInfectedType = ['mcpe:civilian_male', 'mcpe:civilian_female', 'mcpe:commander_artic', 'mcpe:commander_desert', 'mcpe:commander_woodland', 'mcpe:hazmat_female', 'mcpe:hazmat_male', 'mcpe:military_artic_female', 'mcpe:military_artic_male', 'mcpe:military_desert_female', 'mcpe:military_desert_male', 'mcpe:military_woodland_female', 'mcpe:military_woodland_male', 'mcpe:militia_female', 'mcpe:militia_male', 'mcpe:screamer', 'mcpe:brute', 'mcpe:riot', 'mcpe:civilian', 'mcpe:hazmat', 'mcpe:commander', 'mcpe:military', 'mcpe:militia'].includes(deadEntity.typeId);

        if (isInfectedType && killer.typeId === 'minecraft:player') {
            await killer.runCommandAsync(`scoreboard players add @s infected.kills 1`);
        }
        
        if (deadEntity.typeId === 'mcpe:scavenger' && killer.typeId === 'minecraft:player') {
            await killer.runCommandAsync(`scoreboard players add @s scavenger.kills 1`);
        }
        
        if (deadEntity.typeId === 'mcpe:marauder' && killer.typeId === 'minecraft:player') {
            await killer.runCommandAsync(`scoreboard players add @s marauder.kills 1`);
        }
        
        if (deadEntity.typeId === 'mcpe:militia' && killer.typeId === 'minecraft:player') {
            await killer.runCommandAsync(`scoreboard players add @s infected_miniboss.kills 1`);
        }

        if (deadEntity.typeId === 'minecraft:player' && killer.typeId === 'minecraft:player') {
            await killer.runCommandAsync(`scoreboard players add @s player.kills 1`);
        }

        if (damageSource.cause === 'override' && (deadEntity.typeId === 'minecraft:player' || deadEntity.typeId === 'minecraft:player')) {
            const distance = Math.sqrt(
                Math.pow(deadEntity.location.x - killer.location.x, 2) +
                Math.pow(deadEntity.location.y - killer.location.y, 2) +
                Math.pow(deadEntity.location.z - killer.location.z, 2)
            );
            const distanceInt = Math.round(distance);
            await killer.runCommandAsync(`scoreboard players set @s longest.kill.distance ${Math.max(distanceInt, getScore('longest.kill.distance', killer, true))}`);
        }

        resetPlayerScores(deadEntity);
        console.log(`Reset scores for ${deadEntity.name}`);
    } catch (e) {
        console.error("Error in entityDie event:", e);
    }
});

mc.system.runInterval(() => {
	for (const player of mc.world.getPlayers()) {
		if (isMoving(player) && player.isOnGround && !player.isSprinting) {
			player.runCommandAsync(`scoreboard players add @s[m=!c] distance.walked 1`);
		}
	}
}, 10);

mc.system.runInterval(() => {
	for (const player of mc.world.getPlayers()) {
		if (isMoving(player) && player.isOnGround && player.isSprinting) {
			player.runCommandAsync(`scoreboard players add @s[m=!c] distance.walked 1`);
		}
	}
}, 5);

mc.system.runInterval(() => {
    const players = mc.world.getAllPlayers();
    players.forEach(async (player) => {
        await player.runCommandAsync(`scoreboard players add @s[m=!c] survival.time 1`);
    });
}, 20);

export { showPlayerStats };