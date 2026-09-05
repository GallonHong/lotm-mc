import {
    BlockPermutation,
    EquipmentSlot,
    system,
    world,
} from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { midis } from "./songs/index.js";

const PIANO_ITEM = "xypiano:piano_item";
const PIANO_LEFT = "xypiano:piano_left";
const PIANO_RIGHT = "xypiano:piano_right";
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const SAMPLE_NOTES = [0, 3, 6, 9];
const SOUND_TYPES = [
    { id: "piano", name: "标准音" },
    { id: "piano_long", name: "长音" },
    { id: "piano_short", name: "短音" },
];
const RIGHT_OFFSETS = Object.freeze({
    north: { x: -1, y: 0, z: 0 },
    south: { x: 1, y: 0, z: 0 },
    east: { x: 0, y: 0, z: -1 },
    west: { x: 0, y: 0, z: 1 },
});
const FACE_OFFSETS = Object.freeze({
    up: { x: 0, y: 1, z: 0 },
    down: { x: 0, y: -1, z: 0 },
    north: { x: 0, y: 0, z: -1 },
    south: { x: 0, y: 0, z: 1 },
    east: { x: 1, y: 0, z: 0 },
    west: { x: -1, y: 0, z: 0 },
});

const playerSettings = new Map();
const pianoPlayers = new Map();

function offsetBlock(block, offset) {
    return block?.offset(offset);
}

function locationKey(dimension, location) {
    return `${dimension.id}:${location.x},${location.y},${location.z}`;
}

function directionFromRotation(rotation) {
    const y = rotation?.y ?? 0;
    if (y >= -45 && y < 45) return "north";
    if (y >= 45 && y < 135) return "east";
    if (y >= -135 && y < -45) return "west";
    return "south";
}

function inverse(offset) {
    return { x: -offset.x, y: -offset.y, z: -offset.z };
}

function canReplace(block) {
    try {
        return Boolean(block && (block.isAir || block.isLiquid));
    } catch {
        return false;
    }
}

function getLeftBlock(block) {
    if (!block || !block.typeId?.startsWith("xypiano:piano_")) return undefined;
    if (block.typeId === PIANO_LEFT) return block;
    const direction = block.permutation.getState("minecraft:cardinal_direction") ?? "north";
    return offsetBlock(block, inverse(RIGHT_OFFSETS[direction]));
}

function isNear(player, block, maximumSquared = 25) {
    if (!player || !block) return false;
    const dx = player.location.x - (block.location.x + 0.5);
    const dy = player.location.y - (block.location.y + 0.5);
    const dz = player.location.z - (block.location.z + 0.5);
    return dx * dx + dy * dy + dz * dz <= maximumSquared;
}

function getSettings(player) {
    let settings = playerSettings.get(player.id);
    if (!settings) {
        settings = { octave: 4, soundIndex: 0 };
        playerSettings.set(player.id, settings);
    }
    return settings;
}

function midiToSound(midi) {
    const noteIndex = ((midi % 12) + 12) % 12;
    let closest = SAMPLE_NOTES[0];
    let closestDiff = 99;
    for (const sampleIndex of SAMPLE_NOTES) {
        let diff = noteIndex - sampleIndex;
        if (diff > 6) diff -= 12;
        if (diff < -6) diff += 12;
        if (Math.abs(diff) < Math.abs(closestDiff)) {
            closest = sampleIndex;
            closestDiff = diff;
        }
    }
    const sampleMidi = midi - closestDiff;
    const sampleOctave = Math.floor(sampleMidi / 12) - 1;
    return {
        sample: `${NOTE_NAMES[closest]}${sampleOctave}`,
        pitch: Math.pow(2, closestDiff / 12),
    };
}

function particleLocation(leftBlock, midi) {
    const direction = leftBlock.permutation.getState("minecraft:cardinal_direction") ?? "north";
    const right = RIGHT_OFFSETS[direction];
    const normalized = Math.max(0, Math.min(1, (midi - 21) / 87));
    return {
        x: leftBlock.location.x + 0.5 + right.x * normalized,
        y: leftBlock.location.y + 1.05,
        z: leftBlock.location.z + 0.5 + right.z * normalized,
    };
}

function playNote(leftBlock, midi, soundId = "piano", volume = 1.6) {
    try {
        if (!leftBlock || leftBlock.typeId !== PIANO_LEFT) return;
        const note = midiToSound(midi);
        leftBlock.dimension.playSound(`${soundId}.${note.sample}`, leftBlock.location, {
            pitch: note.pitch,
            volume: Math.max(0.2, Math.min(2, volume)),
        });
        try {
            leftBlock.dimension.spawnParticle("minecraft:note_particle", particleLocation(leftBlock, midi));
        } catch {}
    } catch (error) {
        console.warn(`[ApocalypseLife] Piano note failed: ${error}`);
    }
}

function showSafe(player, form, callback, retries = 4) {
    system.runTimeout(() => {
        if (!player?.isValid()) return;
        form.show(player).then((result) => {
            if (result.canceled) {
                const reason = String(result.cancelationReason ?? "").toLowerCase();
                if (retries > 0 && reason.includes("busy")) showSafe(player, form, callback, retries - 1);
                return;
            }
            system.runTimeout(() => callback(result), 1);
        }).catch(() => {});
    }, 1);
}

function parseNoteToken(token, defaultOctave) {
    const match = /^([A-Ga-g])([#b]?)(-?\d)?$/.exec(token.trim());
    if (!match) return undefined;
    let index = NOTE_NAMES.indexOf(match[1].toUpperCase());
    if (index < 0) return undefined;
    if (match[2] === "#") index += 1;
    if (match[2] === "b") index -= 1;
    let octave = match[3] === undefined ? defaultOctave : Number(match[3]);
    if (index < 0) { index += 12; octave -= 1; }
    if (index >= 12) { index -= 12; octave += 1; }
    const midi = (octave + 1) * 12 + index;
    return midi >= 21 && midi <= 108 ? midi : undefined;
}

function openMelodyInput(player, leftBlock) {
    if (!isNear(player, leftBlock)) return;
    const settings = getSettings(player);
    const form = new ModalFormData()
        .title("§l§6钢琴 · 简谱输入")
        .textField("输入空格分隔的音名，最多 48 个\n例：C4 D4 E4 - E4 D4 C4（- 为休止）", "C4 D4 E4 G4", "C4 D4 E4 G4")
        .slider("每拍间隔（游戏刻）", 2, 20, 1, 6);
    showSafe(player, form, (result) => {
        if (!isNear(player, leftBlock)) return;
        const raw = String(result.formValues?.[0] ?? "").trim();
        const delay = Math.round(Number(result.formValues?.[1] ?? 6));
        const tokens = raw.split(/\s+/).filter(Boolean).slice(0, 48);
        let scheduled = 0;
        for (const token of tokens) {
            if (token !== "-") {
                const midi = parseNoteToken(token, settings.octave);
                if (midi !== undefined) {
                    system.runTimeout(() => playNote(leftBlock, midi, SOUND_TYPES[settings.soundIndex].id), scheduled * delay);
                }
            }
            scheduled += 1;
        }
        player.sendMessage(`§6[钢琴] §f已载入 ${scheduled} 拍旋律。`);
    });
}

function flattenSong(song) {
    const notes = [];
    for (const track of song.tracks ?? []) {
        const values = track.notes ?? [];
        for (let index = 0; index + 3 < values.length; index += 4) {
            notes.push({
                midi: values[index],
                time: values[index + 1],
                duration: values[index + 2],
                velocity: values[index + 3],
            });
        }
    }
    notes.sort((a, b) => a.time - b.time);
    return notes;
}

async function loadQueueEntry(playback, index) {
    const meta = playback.queue[index];
    if (!meta) return false;
    playback.loading = true;
    try {
        const song = await meta.value();
        const currentBlock = playback.dimension.getBlock(playback.location);
        if (!currentBlock || currentBlock.typeId !== PIANO_LEFT) return false;
        playback.queueIndex = index;
        playback.songName = meta.name;
        playback.notes = flattenSong(song);
        playback.cursor = 0;
        playback.elapsedUnits = 0;
        playback.status = "playing";
        return true;
    } finally {
        playback.loading = false;
    }
}

async function startQueue(player, leftBlock, queue) {
    if (!isNear(player, leftBlock)) return;
    try {
        const key = locationKey(leftBlock.dimension, leftBlock.location);
        const playback = {
            key,
            dimension: leftBlock.dimension,
            location: { ...leftBlock.location },
            direction: leftBlock.permutation.getState("minecraft:cardinal_direction") ?? "north",
            queue: [...queue],
            queueIndex: 0,
            songName: queue[0]?.name ?? "unknown",
            notes: [],
            cursor: 0,
            elapsedUnits: 0,
            loading: false,
            status: "playing",
        };
        if (!await loadQueueEntry(playback, 0)) throw new Error("piano disappeared while loading");
        pianoPlayers.set(key, playback);
        player.sendMessage(`§6[钢琴] §f开始播放：§e${playback.songName} §7(${playback.queueIndex + 1}/${playback.queue.length})`);
    } catch (error) {
        player.sendMessage("§c[钢琴] 曲目加载失败，请检查行为包是否完整。");
        console.warn(`[ApocalypseLife] Piano song load failed: ${error}`);
    }
}

function getPlayback(leftBlock) {
    return pianoPlayers.get(locationKey(leftBlock.dimension, leftBlock.location));
}

function openSongLibrary(player, leftBlock) {
    if (!isNear(player, leftBlock)) return;
    const playback = getPlayback(leftBlock);
    const form = new ActionFormData()
        .title("§l§d钢琴曲库")
        .body(playback ? `§f当前：§e${playback.songName}\n§f状态：§b${playback.status} §7· ${playback.queueIndex + 1}/${playback.queue.length}` : "§7选择单曲，或连续播放完整曲库。")
        .button(playback?.status === "playing" ? "§e暂停当前曲目" : "§a继续当前曲目")
        .button("§c停止当前曲目")
        .button("§6连续播放全部（播放列表）");
    for (const meta of midis) form.button(`§f${meta.name}`);
    form.button("§7返回琴键");
    showSafe(player, form, (result) => {
        if (!isNear(player, leftBlock)) return;
        if (result.selection === 0) {
            const current = getPlayback(leftBlock);
            if (current) current.status = current.status === "playing" ? "paused" : "playing";
            openSongLibrary(player, leftBlock);
            return;
        }
        if (result.selection === 1) {
            pianoPlayers.delete(locationKey(leftBlock.dimension, leftBlock.location));
            openSongLibrary(player, leftBlock);
            return;
        }
        if (result.selection === 2) {
            startQueue(player, leftBlock, midis);
            return;
        }
        const songIndex = result.selection - 3;
        if (songIndex >= 0 && songIndex < midis.length) {
            startQueue(player, leftBlock, [midis[songIndex]]);
            return;
        }
        openKeyboard(player, leftBlock);
    });
}

function openKeyboard(player, clickedBlock) {
    const leftBlock = getLeftBlock(clickedBlock);
    if (!leftBlock || leftBlock.typeId !== PIANO_LEFT) return;
    if (!isNear(player, leftBlock)) {
        player.sendMessage("§c[钢琴] 请站在钢琴 5 格以内演奏。");
        return;
    }
    const settings = getSettings(player);
    const sound = SOUND_TYPES[settings.soundIndex];
    const form = new ActionFormData()
        .title("§l§6钢琴演奏")
        .body(`§f音域：§eC${settings.octave} - B${settings.octave}  §f音色：§b${sound.name}\n§7点击琴键发声；曲库支持原包内置的 6 首 MIDI 曲目。`);
    for (const noteName of NOTE_NAMES) {
        const accidental = noteName.includes("#");
        form.button(`${accidental ? "§8♯" : "§f♩"} ${noteName}${settings.octave}`);
    }
    form
        .button("§b降低八度")
        .button("§b升高八度")
        .button(`§d切换音色：${sound.name}`)
        .button("§a输入旋律")
        .button("§6内置曲库（6 首）");
    showSafe(player, form, (result) => {
        if (!isNear(player, leftBlock)) return;
        if (result.selection < 12) {
            playNote(leftBlock, (settings.octave + 1) * 12 + result.selection, sound.id);
            openKeyboard(player, leftBlock);
        } else if (result.selection === 12) {
            settings.octave = Math.max(1, settings.octave - 1);
            openKeyboard(player, leftBlock);
        } else if (result.selection === 13) {
            settings.octave = Math.min(7, settings.octave + 1);
            openKeyboard(player, leftBlock);
        } else if (result.selection === 14) {
            settings.soundIndex = (settings.soundIndex + 1) % SOUND_TYPES.length;
            openKeyboard(player, leftBlock);
        } else if (result.selection === 15) {
            openMelodyInput(player, leftBlock);
        } else if (result.selection === 16) {
            openSongLibrary(player, leftBlock);
        }
    });
}

function consumeMainHand(player, itemStack) {
    if (String(player.getGameMode()).toLowerCase() === "creative") return;
    const equippable = player.getComponent("minecraft:equippable");
    if (!equippable) return;
    if (itemStack.amount <= 1) equippable.setEquipment(EquipmentSlot.Mainhand, undefined);
    else {
        itemStack.amount -= 1;
        equippable.setEquipment(EquipmentSlot.Mainhand, itemStack);
    }
}

const PianoPlacerComponent = {
    onUseOn(event) {
        const player = event.source;
        const itemStack = event.itemStack;
        if (!player || player.typeId !== "minecraft:player" || itemStack?.typeId !== PIANO_ITEM) return;
        const face = String(event.blockFace ?? "up").toLowerCase();
        const leftBlock = offsetBlock(event.block, FACE_OFFSETS[face] ?? FACE_OFFSETS.up);
        const direction = directionFromRotation(player.getRotation());
        const rightBlock = offsetBlock(leftBlock, RIGHT_OFFSETS[direction]);
        if (!canReplace(leftBlock) || !canReplace(rightBlock)) {
            player.sendMessage("§c[钢琴] 需要相邻的两格空地才能放置。");
            return;
        }
        const leftOriginal = leftBlock.permutation;
        const rightOriginal = rightBlock.permutation;
        try {
            leftBlock.setPermutation(BlockPermutation.resolve(PIANO_LEFT, { "minecraft:cardinal_direction": direction }));
            rightBlock.setPermutation(BlockPermutation.resolve(PIANO_RIGHT, { "minecraft:cardinal_direction": direction }));
            consumeMainHand(player, itemStack);
            leftBlock.dimension.playSound("random.pop", leftBlock.location, { volume: 0.8, pitch: 1 });
        } catch (error) {
            try { leftBlock.setPermutation(leftOriginal); } catch {}
            try { rightBlock.setPermutation(rightOriginal); } catch {}
            player.sendMessage("§c[钢琴] 放置失败，物品未消耗。");
            console.warn(`[ApocalypseLife] Piano placement failed: ${error}`);
        }
    },
};

const PianoBlockComponent = {
    onPlayerInteract(event) {
        const player = event.player;
        if (!player) return;
        system.run(() => openKeyboard(player, event.block));
    },
};

function subscribeAfterEvent(name, handler) {
    try {
        const signal = world.afterEvents?.[name];
        if (!signal?.subscribe) return false;
        signal.subscribe(handler);
        return true;
    } catch {
        return false;
    }
}

function tickPlayers() {
    for (const [key, playback] of pianoPlayers) {
        let block;
        try { block = playback.dimension.getBlock(playback.location); } catch {}
        if (!block || block.typeId !== PIANO_LEFT) {
            pianoPlayers.delete(key);
            continue;
        }
        if (playback.status !== "playing" || playback.loading) continue;
        playback.elapsedUnits += 2;
        let played = 0;
        while (playback.cursor < playback.notes.length && playback.notes[playback.cursor].time <= playback.elapsedUnits) {
            const note = playback.notes[playback.cursor++];
            const soundId = note.duration < 100 ? "piano_short" : note.duration > 400 ? "piano_long" : "piano";
            playNote(block, note.midi, soundId, 0.5 + note.velocity / 80);
            played += 1;
            if (played >= 24) break;
        }
        if (playback.cursor >= playback.notes.length) {
            const nextIndex = playback.queueIndex + 1;
            if (nextIndex < playback.queue.length) {
                loadQueueEntry(playback, nextIndex).catch(error => {
                    console.warn(`[ApocalypseLife] Piano queue advance failed: ${error}`);
                    pianoPlayers.delete(key);
                });
            } else {
                pianoPlayers.delete(key);
            }
        }
    }
}

export class PianoSystem {
    static init() {
        try {
            world.beforeEvents.worldInitialize.subscribe((event) => {
                event.itemComponentRegistry.registerCustomComponent("xypiano:placer", PianoPlacerComponent);
                event.blockComponentRegistry.registerCustomComponent("xypiano:piano_block", PianoBlockComponent);
            });
        } catch (error) {
            console.warn(`[ApocalypseLife] Piano component registration unavailable: ${error}`);
        }

        subscribeAfterEvent("playerBreakBlock", (event) => {
            const permutation = event.brokenBlockPermutation;
            const typeId = permutation?.type?.id;
            if (typeId !== PIANO_LEFT && typeId !== PIANO_RIGHT) return;
            try {
                const direction = permutation.getState("minecraft:cardinal_direction") ?? "north";
                const offset = typeId === PIANO_LEFT ? RIGHT_OFFSETS[direction] : inverse(RIGHT_OFFSETS[direction]);
                const paired = offsetBlock(event.block, offset);
                if (paired?.typeId === (typeId === PIANO_LEFT ? PIANO_RIGHT : PIANO_LEFT)) paired.setType("minecraft:air");
                const leftLocation = typeId === PIANO_LEFT ? event.block.location : paired?.location;
                if (leftLocation) pianoPlayers.delete(locationKey(event.block.dimension, leftLocation));
            } catch (error) {
                console.warn(`[ApocalypseLife] Piano pair cleanup failed: ${error}`);
            }
        });

        subscribeAfterEvent("playerLeave", (event) => playerSettings.delete(event.playerId));
        system.runInterval(tickPlayers, 1);
        console.warn("[ApocalypseLife] Piano system initialized (stable UI, 88-key samples, 6 MIDI songs).");
    }
}
