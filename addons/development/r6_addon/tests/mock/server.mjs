// Minimal @minecraft/server mock for headless smoke tests.
// Implements only the API surface the R6 addon touches.

export const __mock = {
    tick: 0,
    players: [],
    entities: [],
    dynamic: new Map(),
    intervals: new Map(),
    timeouts: new Map(),
    nextId: 1,
    warnings: [],
    commands: [],
    sounds: 0,
    particles: 0,
    blocks: new Map(),
};

export const EquipmentSlot = {
    Mainhand: "Mainhand", Offhand: "Offhand",
    Head: "Head", Chest: "Chest", Legs: "Legs", Feet: "Feet",
};

function vec(x = 0, y = 0, z = 0) { return { x, y, z }; }

class Signal {
    constructor(name) { this.name = name; this.handlers = []; }
    subscribe(fn) { this.handlers.push(fn); return fn; }
    fire(payload) {
        for (const fn of [...this.handlers]) {
            try { fn(payload); } catch (e) { console.error(`[mock] ${this.name} handler threw: ${e}`); throw e; }
        }
    }
}

function makeEvents(names) {
    const out = {};
    for (const name of names) out[name] = new Signal(name);
    return out;
}

export const __signals = makeEvents([
    "itemStartUse", "itemStartUseOn", "itemUse", "itemUseOn", "itemStopUse",
    "itemReleaseUse", "itemStopUseOn", "entityHitBlock", "entityHitEntity",
    "entityDie", "entityHurt", "playerSpawn", "playerLeave", "playerJoin",
    "blockBreak", "entitySpawn", "scriptEventReceive",
]);

const afterEvents = __signals;
const beforeEvents = makeEvents(["chatSend", "itemUse", "playerInteractWithBlock"]);

export class ItemStack {
    constructor(typeId = "minecraft:air", amount = 1) {
        this.typeId = typeId;
        this.amount = amount;
        this.nameTag = undefined;
        this.lore = [];
        this._durability = { damage: 0, maxDurability: 33 };
    }
    getComponent(id) {
        if (id === "minecraft:durability") return this._durability;
        return undefined;
    }
    setLore(lines) { this.lore = lines; }
    clone() {
        const s = new ItemStack(this.typeId, this.amount);
        s.nameTag = this.nameTag;
        s._durability = { ...this._durability };
        return s;
    }
}

class HealthComponent {
    constructor(entity, max = 20, current = 20) {
        this.entity = entity;
        this.effectiveMax = max;
        this.currentValue = current;
    }
    setCurrentValue(value) {
        this.currentValue = Math.max(0, Math.min(this.effectiveMax, value));
    }
}

class Container {
    constructor(size = 36) { this.size = size; this.slots = new Array(size).fill(undefined); }
    getItem(i) { return this.slots[i]; }
    setItem(i, item) { this.slots[i] = item; }
}

class InventoryComponent {
    constructor() { this.container = new Container(36); }
}

class EquippableComponent {
    constructor() { this.slots = {}; }
    getEquipment(slot) { return this.slots[slot]; }
    setEquipment(slot, item) { this.slots[slot] = item; return true; }
}

class InputPermissions {
    setPermissionCategory(cat, allowed) { void cat; void allowed; return true; }
}

class OnScreenDisplay {
    constructor(entity) { this.entity = entity; this.actionBars = []; this.titles = []; }
    setActionBar(text) { this.actionBars.push(text); }
    setTitle(text, options) { this.titles.push({ text, options }); }
}

export const BlockPermutation = {
    resolve(identifier) {
        return { type: typeof identifier === "string" ? identifier : identifier?.id ?? "minecraft:air" };
    },
};

export class Block {
    constructor(dimension, location, typeId = "minecraft:air") {
        this.dimension = dimension;
        this.location = { ...location };
        this.typeId = typeId;
    }
    setType(typeId) {
        this.typeId = typeof typeId === "string" ? typeId : typeId?.id ?? "minecraft:air";
        __mock.blocks.set(keyOf(this.location), this.typeId);
        return true;
    }
    setPermutation(permutation) {
        this.typeId = permutation?.type ?? permutation?.id ?? "minecraft:air";
        __mock.blocks.set(keyOf(this.location), this.typeId);
        return true;
    }
}

function keyOf(loc) {
    return `${Math.floor(loc.x)},${Math.floor(loc.y)},${Math.floor(loc.z)}`;
}

function hitResult(dimension, loc, id, direction) {
    let face = "Up";
    if (Math.abs(direction.y) <= 0.5) {
        if (Math.abs(direction.x) > Math.abs(direction.z)) face = direction.x > 0 ? "West" : "East";
        else face = direction.z > 0 ? "North" : "South";
    } else {
        face = direction.y > 0 ? "Down" : "Up";
    }
    return { block: new Block(dimension, loc, id), face, faceLocation: { x: 0.5, y: 0.5, z: 0.5 } };
}

export class Entity {
    constructor(dimension, typeId, location) {
        this.id = `e${__mock.nextId++}`;
        this.typeId = typeId;
        this.dimension = dimension;
        this.location = { ...location };
        this.rotation = { x: 0, y: 0 };
        this.valid = true;
        this._components = { "minecraft:health": new HealthComponent(this, 100, 100) };
        this._tags = new Set();
        this.isSneaking = false;
        this.family = familyFor(typeId);
    }
    getComponent(id) { return this._components[id]; }
    isValid() { return this.valid; }
    kill() {
        if (!this.valid) return;
        this.valid = false;
        this._components["minecraft:health"].currentValue = 0;
        __mock.entities = __mock.entities.filter(e => e !== this);
        afterEvents.entityDie.fire({ deadEntity: this, damageSource: { damagingEntity: undefined } });
    }
    applyDamage(amount) {
        const hp = this._components["minecraft:health"];
        hp.currentValue = Math.max(0, hp.currentValue - amount);
        afterEvents.entityHurt.fire({ hurtEntity: this, damageSource: { damagingEntity: undefined }, damage: amount });
    }
    teleport(location, options) {
        this.location = { ...location };
        if (options?.dimension) this.dimension = options.dimension;
        return true;
    }
    setRotation(rotation) { this.rotation = rotation; }
    addTag(tag) { this._tags.add(tag); return true; }
    removeTag(tag) { this._tags.delete(tag); return true; }
    hasTag(tag) { return this._tags.has(tag); }
    getTags() { return [...this._tags]; }
    addEffect() { }
    removeEffect() { }
    runCommand(command) { __mock.commands.push(command); return { successCount: 1 }; }
    runCommandAsync(command) { __mock.commands.push(command); return Promise.resolve({ successCount: 1 }); }
    playAnimation() { }
    getViewDirection() { return vec(0, 0, 1); }
    getHeadLocation() { return { x: this.location.x, y: this.location.y + 1.62, z: this.location.z }; }
}

export class Player extends Entity {
    constructor(dimension, name, location) {
        super(dimension, "minecraft:player", location);
        this.name = name;
        this._components = {
            "minecraft:health": new HealthComponent(this, 20, 20),
            "minecraft:inventory": new InventoryComponent(),
            "minecraft:equippable": new EquippableComponent(),
        };
        this.selectedSlotIndex = 0;
        this.commandPermissionLevel = 4;
        this.messages = [];
        this.onScreenDisplay = new OnScreenDisplay(this);
        this.inputPermissions = new InputPermissions();
        this.gameMode = "survival";
        this.isSneaking = false;
        // link equippable to the hotbar (slot 0..8) like the real engine does
        const inventory = this._components["minecraft:inventory"].container;
        this._components["minecraft:equippable"] = {
            getEquipment: (slot) => {
                if (slot === "Mainhand") return inventory.getItem(this.selectedSlotIndex);
                if (slot === "Offhand") return inventory.getItem(40);
                return undefined;
            },
            setEquipment: (slot, item) => {
                if (slot === "Mainhand") inventory.setItem(this.selectedSlotIndex, item);
                else if (slot === "Offhand") inventory.setItem(40, item);
                return true;
            },
        };
    }
    sendMessage(text) { this.messages.push(text); }
    setGameMode(mode) { this.gameMode = mode; return true; }
    applyDamage(amount, options) {
        const hp = this._components["minecraft:health"];
        const before = hp.currentValue;
        hp.currentValue = Math.max(0, before - amount);
        afterEvents.entityHurt.fire({
            hurtEntity: this, damageSource: { damagingEntity: options?.damagingEntity }, damage: amount,
        });
        if (hp.currentValue <= 0) {
            afterEvents.entityDie.fire({
                deadEntity: this, damageSource: { damagingEntity: options?.damagingEntity },
            });
        }
    }
    kill() {
        const hp = this._components["minecraft:health"];
        hp.currentValue = 0;
        afterEvents.entityDie.fire({ deadEntity: this, damageSource: { damagingEntity: undefined } });
        afterEvents.playerSpawn.fire({ player: this, initialSpawn: false });
    }
    teleport(location, options) {
        this.location = { ...location };
        if (options?.dimension) this.dimension = options.dimension;
        return true;
    }
}

function familyFor(typeId) {
    if (typeId === "minecraft:player") return ["player", "mob"];
    if (typeId === "r6:bomb") return ["r6_bomb", "r6_target", "inanimate"];
    if (typeId === "r6:drone") return ["r6_drone", "r6_target", "inanimate"];
    if (typeId.startsWith("r6:gadget_")) return ["r6_device", "r6_target", "inanimate"];
    return ["mob"];
}

export class Dimension {
    constructor(id) { this.id = id; this.type = id; }
    getPlayers(query) {
        let list = __mock.players.filter(p => p.dimension === this);
        if (query?.location && query.maxDistance !== undefined) {
            list = list.filter(p => dist(p.location, query.location) <= query.maxDistance);
        }
        return list;
    }
    getEntities(query) {
        let list = __mock.entities.filter(e => e.dimension === this && e.valid);
        if (query?.families) {
            list = list.filter(e => query.families.some(f => e.family.includes(f)));
        }
        if (query?.location && query.maxDistance !== undefined) {
            list = list.filter(e => dist(e.location, query.location) <= query.maxDistance);
        }
        return list;
    }
    spawnEntity(typeId, location) {
        const e = new Entity(this, typeId, location);
        __mock.entities.push(e);
        afterEvents.entitySpawn.fire({ entity: e });
        return e;
    }
    getBlock(location) {
        const id = __mock.blocks.get(keyOf(location)) ?? "minecraft:air";
        return new Block(this, location, id);
    }
    getBlockFromRay(location, direction, options) {
        const maxDistance = options?.maxDistance ?? 5;
        const l = Math.hypot(direction.x, direction.y, direction.z) || 1;
        const v = { x: direction.x / l, y: direction.y / l, z: direction.z / l };
        const step = 0.2;
        const steps = Math.ceil(maxDistance / step);
        for (let i = 1; i <= steps; i++) {
            const p = {
                x: location.x + v.x * step * i,
                y: location.y + v.y * step * i,
                z: location.z + v.z * step * i,
            };
            const loc = { x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) };
            const id = __mock.blocks.get(keyOf(loc));
            if (id && id !== "minecraft:air") return hitResult(this, loc, id, v);
        }
        // synthetic surface so placement/gadget tests always have something to aim at
        const dist = Math.min(3, maxDistance);
        const p = { x: location.x + v.x * dist, y: location.y + v.y * dist, z: location.z + v.z * dist };
        const loc = { x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) };
        return hitResult(this, loc, "minecraft:stone", v);
    }
    playSound() { __mock.sounds++; }
    spawnParticle() { __mock.particles++; }
    runCommand(command) { __mock.commands.push(command); return { successCount: 1 }; }
    runCommandAsync(command) { __mock.commands.push(command); return Promise.resolve({ successCount: 1 }); }
}

const overworld = new Dimension("minecraft:overworld");
const nether = new Dimension("minecraft:nether");

export const world = {
    getPlayers() { return [...__mock.players]; },
    getAllPlayers() { return [...__mock.players]; },
    getDimension(id) {
        if (id === "minecraft:nether") return nether;
        return overworld;
    },
    getDynamicProperty(key) { return __mock.dynamic.get(key); },
    setDynamicProperty(key, value) { __mock.dynamic.set(key, value); },
    getDefaultSpawnLocation() { return vec(0, 64, 0); },
    afterEvents,
    beforeEvents,
    sendMessage() { },
};

function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

export const system = {
    get currentTick() { return __mock.tick; },
    runInterval(cb, ticks = 1) {
        const id = __mock.nextId++;
        __mock.intervals.set(id, { cb, every: Math.max(1, ticks), next: __mock.tick + Math.max(1, ticks) });
        return id;
    },
    runTimeout(cb, ticks = 1) {
        const id = __mock.nextId++;
        __mock.timeouts.set(id, { cb, at: __mock.tick + Math.max(1, ticks) });
        return id;
    },
    clearRun(id) {
        __mock.intervals.delete(id);
        __mock.timeouts.delete(id);
    },
    run(cb) { queueMicrotask(() => { try { cb(); } catch (e) { console.error(`[mock] system.run threw: ${e}`); } }); },
    afterEvents: __signals,
    beforeEvents: makeEvents([]),
};

export function __createPlayer(name, location = vec(0, 65, 0)) {
    const p = new Player(overworld, name, location);
    __mock.players.push(p);
    return p;
}

export function __removePlayer(player) {
    __mock.players = __mock.players.filter(p => p !== player);
    afterEvents.playerLeave.fire({ playerId: player.id, playerName: player.name });
}

export function __advance(ticks = 1) {
    for (let i = 0; i < ticks; i++) {
        __mock.tick += 1;
        for (const [id, interval] of [...__mock.intervals.entries()]) {
            if (__mock.tick >= interval.next) {
                interval.next = __mock.tick + interval.every;
                try { interval.cb(); } catch (e) { console.error(`[mock] interval ${id} threw: ${e}`); throw e; }
            }
        }
        for (const [id, timeout] of [...__mock.timeouts.entries()]) {
            if (__mock.tick >= timeout.at) {
                __mock.timeouts.delete(id);
                try { timeout.cb(); } catch (e) { console.error(`[mock] timeout ${id} threw: ${e}`); throw e; }
            }
        }
    }
    // let queued microtasks (forms, system.run) settle
}

export function __scriptEvent(id, player, message = "") {
    afterEvents.scriptEventReceive.fire({ id, message, sourceEntity: player, sourceType: "Entity" });
}

export function __itemStartUse(player, item) {
    afterEvents.itemStartUse.fire({ source: player, itemStack: item });
}

export function __itemUse(player, item) {
    afterEvents.itemUse.fire({ source: player, itemStack: item });
}

export function __itemStopUse(player) {
    afterEvents.itemStopUse.fire({ source: player });
}

export function __dist(a, b) { return dist(a, b); }

export function __setBlock(location, typeId) {
    __mock.blocks.set(keyOf(location), typeId);
}

export function __getBlockId(location) {
    return __mock.blocks.get(keyOf(location)) ?? "minecraft:air";
}

export function __findBlock(typeId) {
    for (const [key, id] of __mock.blocks.entries()) {
        if (id === typeId) {
            const [x, y, z] = key.split(",").map(Number);
            return { x, y, z };
        }
    }
    return undefined;
}
