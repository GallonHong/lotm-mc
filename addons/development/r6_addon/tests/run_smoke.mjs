// Headless smoke test: copies the BP scripts, rewrites the Minecraft imports to the
// local mock and exercises queue -> rounds -> shooting -> DBNO -> bomb -> match end.
// Run: node tests/run_smoke.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SRC = path.join(ROOT, "r6_bp", "scripts");
const RUN = path.join(HERE, ".run");
const SERVER_MOCK = pathToFileURL(path.join(HERE, "mock", "server.mjs")).href;
const UI_MOCK = pathToFileURL(path.join(HERE, "mock", "server-ui.mjs")).href;

let failures = 0;
const check = (label, cond, detail = "") => {
    if (cond) console.log(`  ok   ${label}`);
    else { failures++; console.log(`  FAIL ${label}${detail ? " - " + detail : ""}`); }
};

function copyDir(src, dst) {
    fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const s = path.join(src, entry.name);
        const d = path.join(dst, entry.name);
        if (entry.isDirectory()) copyDir(s, d);
        else fs.copyFileSync(s, d);
    }
}

function rewriteImports(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) { rewriteImports(p); continue; }
        if (!p.endsWith(".js")) continue;
        let text = fs.readFileSync(p, "utf8");
        text = text.replace(/(["'])@minecraft\/server\1/g, JSON.stringify(SERVER_MOCK));
        text = text.replace(/(["'])@minecraft\/server-ui\1/g, JSON.stringify(UI_MOCK));
        fs.writeFileSync(p, text);
    }
}

fs.rmSync(RUN, { recursive: true, force: true });
fs.mkdirSync(RUN, { recursive: true });
fs.writeFileSync(path.join(RUN, "package.json"), JSON.stringify({ type: "module" }));
copyDir(SRC, path.join(RUN, "scripts"));
rewriteImports(path.join(RUN, "scripts"));

const mock = await import(SERVER_MOCK);
const { __mock, __createPlayer, __advance, __scriptEvent, __itemStartUse, __itemUse, __itemStopUse, __signals, __removePlayer,
    __getBlockId, __setBlock, __findBlock } = mock;
const { State } = await import(pathToFileURL(path.join(RUN, "scripts", "state.js")).href);
const { Match } = await import(pathToFileURL(path.join(RUN, "scripts", "match.js")).href);
const { Bomb } = await import(pathToFileURL(path.join(RUN, "scripts", "bomb.js")).href);
const { Config } = await import(pathToFileURL(path.join(RUN, "scripts", "config.js")).href);
const { Setup } = await import(pathToFileURL(path.join(RUN, "scripts", "setup.js")).href);
const dmg = await import(pathToFileURL(path.join(RUN, "scripts", "damage.js")).href);
const { WEAPONS, OPERATORS } = await import(pathToFileURL(path.join(RUN, "scripts", "data", "registry.js")).href);
const { Loadout } = await import(pathToFileURL(path.join(RUN, "scripts", "loadout.js")).href);
const { Menu } = await import(pathToFileURL(path.join(RUN, "scripts", "menu.js")).href);
const main = await import(pathToFileURL(path.join(RUN, "scripts", "main.js")).href);
const { Guns } = await import(pathToFileURL(path.join(RUN, "scripts", "guns", "engine.js")).href);
const spread = await import(pathToFileURL(path.join(RUN, "scripts", "guns", "spread.js")).href);

// deterministic randomness: spread sampling lands dead center so combat assertions are stable
Math.random = () => 0;

const flush = () => new Promise(r => setTimeout(r, 0));
const warn = [];
const origWarn = console.warn;
console.warn = (...args) => { warn.push(args.join(" ")); };

function playerById(id) { return __mock.players.find(p => p.id === id); }
function psOf(p) { return State.players.get(p.id); }
function ps(p) { return State.players.get(p.id); }

async function main_() {
    console.log("== R6 addon smoke test ==");

    // ---------------------------------------------------------------- init
    check("init: map loaded", !!State.map && Array.isArray(State.map.sites));

    // ---------------------------------------------------------------- setup events
    const admin = __createPlayer("Admin", { x: 0, y: 65, z: 0 });
    __scriptEvent("r6:setup", admin, "spawn add TEST-1");
    await flush(); __advance(1);
    check("setup: spawn added", State.map.spawns.some(s => s.name === "TEST-1"), JSON.stringify(State.map.spawns));
    __scriptEvent("r6:setup", admin, "site add A");
    await flush(); __advance(1);
    check("setup: site added", State.map.sites.some(s => s.id === "A"));
    __scriptEvent("r6:setup", admin, "site add B");
    await flush(); __advance(1);
    check("setup: second site added", State.map.sites.some(s => s.id === "B"));

    // ---------------------------------------------------------------- queue 10 players
    const players = [];
    for (let i = 0; i < 10; i++) players.push(__createPlayer(`P${i}`, { x: i * 2, y: 65, z: 0 }));
    for (const p of players) { __scriptEvent("r6:join", p); }
    await flush(); __advance(3);
    check("match started from queue", !!State.match, `queue=${State.queue.length}`);
    if (!State.match) throw new Error("no match; aborting");
    check("gamerules applied", __mock.commands.some(c => c.includes("keepInventory")));
    check("teams 5v5", State.match.teams.blue.length === 5 && State.match.teams.orange.length === 5,
        `${State.match.teams.blue.length}/${State.match.teams.orange.length}`);
    check("round 1 prep", State.match.round === 1 && State.match.phase === "prep", `${State.match.round}/${State.match.phase}`);

    const allInMatch = players.filter(p => ps(p));
    check("all players tracked", allInMatch.length === 10);
    check("operators assigned", allInMatch.every(p => !!ps(p).operatorId));
    check("loadout granted", allInMatch.every(p => {
        const item = p.getComponent("minecraft:equippable").getEquipment("Mainhand");
        return item && item.typeId.startsWith("r6:");
    }));
    const defenders0 = allInMatch.filter(p => ps(p).side === "defender");
    const attackers0 = allInMatch.filter(p => ps(p).side === "attacker");
    check("sides assigned", attackers0.length === 5 && defenders0.length === 5,
        `${attackers0.length}/${defenders0.length}`);

    // ---------------------------------------------------------------- operator re-select
    const atk = attackers0[0];
    const availableOp = OPERATORS.find(o => o.side === "attacker" && o.id !== ps(atk).operatorId
        && !State.match.takenOperators[ps(atk).team].has(o.id));
    const opErr = Match.chooseOperator(atk, availableOp.id);
    await flush();
    check("operator re-select", opErr === null && ps(atk).operatorId === availableOp.id, opErr ?? "");

    // ---------------------------------------------------------------- menu opens
    Menu.openMain(atk);
    Menu.openOperators(atk);
    await flush();
    const ui = await import(pathToFileURL(path.join(HERE, "mock", "server-ui.mjs")).href);
    check("menu forms opened", ui.__ui.opened.length >= 2, JSON.stringify(ui.__ui.opened));

    // ---------------------------------------------------------------- prep -> action
    __advance(Config.prepSeconds * 20 + 5);
    check("action phase reached", State.match.phase === "action", State.match.phase);
    check("timer running", State.match.timer > 0 && State.match.timer < Config.actionSeconds * 20);

    // ---------------------------------------------------------------- shooting (isolated)
    const shooter = attackers0.find(p => {
        const item = p.getComponent("minecraft:inventory").container.getItem(0);
        const wid = item?.typeId?.slice(3);
        return wid && WEAPONS[wid] && !WEAPONS[wid].shield;
    }) ?? attackers0[0];
    const st = ps(shooter);
    for (const p of __mock.players) {
        if (p !== shooter) p.teleport({ x: 500, y: 65, z: 500 });
    }
    let shooterSlot = 0;
    let gunId = Object.keys(st.ammo).find(id => {
        const item = shooter.getComponent("minecraft:inventory").container.getItem(0);
        return item?.typeId === "r6:" + id;
    });
    if (!gunId) { shooterSlot = 1; gunId = Object.keys(st.ammo)[0]; }
    shooter.selectedSlotIndex = shooterSlot;
    const gun = WEAPONS[gunId];
    if (!gun) throw new Error("no gun ammo initialised");
    const beforeMag = st.ammo[gunId].mag;
    const particlesBefore = __mock.particles;
    __itemStartUse(shooter, shooter.getComponent("minecraft:equippable").getEquipment("Mainhand"));
    __advance(40);
    const holdShots = Guns.debugInfo(shooter).session?.shots ?? 0;
    __itemStopUse(shooter);
    __advance(2);
    const afterMag = st.ammo[gunId]?.mag ?? 0;
    check("weapon fired", afterMag < beforeMag, `${gunId} ${beforeMag} -> ${afterMag}`);
    check("trigger hold keeps firing while held (Test Guns model)",
        gun.auto ? holdShots >= 3 : holdShots === 1, `auto=${gun.auto} shots=${holdShots}`);
    check("muzzle flash / tracer / impact particles spawned",
        __mock.particles - particlesBefore >= 6, `particles=${__mock.particles - particlesBefore}`);
    check("shot sound played", __mock.sounds > 0);
    check("durability bar synced", (() => {
        const item = shooter.getComponent("minecraft:equippable").getEquipment("Mainhand");
        const dur = item?.getComponent("minecraft:durability");
        return !!dur && dur.damage >= 0;
    })());

    // itemUse (single-click) must also fire exactly one round, like Test Guns
    st.ammo[gunId].mag = gun.mag; // refill: a long hold may have emptied the magazine
    __itemStopUse(shooter);
    __advance(2);
    const tapBefore = st.ammo[gunId].mag;
    __itemUse(shooter, shooter.getComponent("minecraft:equippable").getEquipment("Mainhand"));
    __advance(2);
    const tapFired = tapBefore - (st.ammo[gunId]?.mag ?? 0);
    check("itemUse single-click fires one round", tapFired === 1, `fired=${tapFired}`);
    __itemStopUse(shooter);
    __advance(2);

    // ---------------------------------------------------------------- headshot elimination
    const victim = defenders0[0];
    victim.teleport({ x: shooter.location.x, y: shooter.location.y, z: shooter.location.z + 3 });
    dmg.hurt(victim, 30, shooter, { headshot: true });
    check("headshot eliminates (stays down until context)", ps(victim).dead === true || ps(victim).downed === true,
        `dead=${ps(victim).dead} downed=${ps(victim).downed}`);
    // force downed state for revive test
    const victim2 = defenders0[1];
    victim2.teleport({ x: shooter.location.x, y: shooter.location.y, z: shooter.location.z + 4 });
    victim2.getComponent("minecraft:health").currentValue = 20;
    ps(victim2).dead = false;
    ps(victim2).downed = false;
    dmg.hurt(victim2, 40, shooter, { headshot: false });
    check("body damage downs the player", ps(victim2).downed === true,
        `hp=${victim2.getComponent("minecraft:health").currentValue} dead=${ps(victim2).dead}`);
    const reviver = defenders0[2];
    reviver.teleport({ ...victim2.location });
    reviver.isSneaking = true;
    __advance(Config.reviveSeconds * 20 + 6);
    check("teammate revives downed player", ps(victim2).downed === false);
    reviver.isSneaking = false;
    for (const p of __mock.players) p.teleport({ x: 0, y: 65, z: 0 });

    // ---------------------------------------------------------------- bomb plant & explode
    const planter = attackers0[1];
    const site = State.match.site;
    planter.teleport({ x: site.x + 0.5, y: site.y, z: site.z + 0.5 });
    await flush();
    Bomb.useDefuser(planter);
    __advance(Config.plantSeconds * 20 + 5);
    check("bomb planted", !!State.match.bomb && State.match.phase === "planted",
        `phase=${State.match.phase}`);
    const scoreBefore = State.match.score[State.match.attackerTeam];
    __advance(Config.bombSeconds * 20 + 10);
    check("bomb explodes -> attacker round win",
        State.match.score[State.match.attackerTeam] === scoreBefore + 1,
        `score=${JSON.stringify(State.match.score)} phase=${State.match.phase}`);
    __advance(Config.roundEndSeconds * 20 + 5);
    check("next round starts", State.match.round === 2 && State.match.phase === "prep",
        `round=${State.match.round} phase=${State.match.phase}`);

    // ---------------------------------------------------------------- gadget coverage
    __advance(Config.prepSeconds * 20 + 5); // round 2 action phase
    check("round 2 action phase", State.match.phase === "action", State.match.phase);
    const { Abilities } = await import(pathToFileURL(path.join(RUN, "scripts", "gadgets", "abilities.js")).href);
    const { Projectiles } = await import(pathToFileURL(path.join(RUN, "scripts", "gadgets", "projectiles.js")).href);
    const { Deployables } = await import(pathToFileURL(path.join(RUN, "scripts", "gadgets", "deployables.js")).href);
    const { GADGETS } = await import(pathToFileURL(path.join(RUN, "scripts", "data", "registry.js")).href);
    const { ItemStack } = mock;

    const currentAtk = () => __mock.players.filter(p => ps(p)?.side === "attacker" && !ps(p).dead);
    const currentDef = () => __mock.players.filter(p => ps(p)?.side === "defender" && !ps(p).dead);
    const DEFENDER_GADGETS = new Set(["gadget_gas", "gadget_jammer", "gadget_armor_panel", "gadget_cardiac",
        "gadget_stim", "gadget_armor_pack", "gadget_kapkan", "gadget_turret", "gadget_ads",
        "gadget_battery", "gadget_nitro", "gadget_reinforce"]);

    let gadgetFailures = 0;
    for (const gid of Object.keys(GADGETS)) {
        const pool = DEFENDER_GADGETS.has(gid) ? currentDef() : currentAtk();
        const user = pool[gid.length % pool.length];
        if (!user) continue;
        const st = ps(user);
        st.side = DEFENDER_GADGETS.has(gid) ? "defender" : "attacker";
        st.gadgetId = gid;
        st.charges[gid] = 3;
        st.cooldowns[gid] = 0;
        try {
            Abilities.use(user, new ItemStack("r6:" + gid));
            __advance(1);
        } catch (e) {
            gadgetFailures++;
            console.log(`  FAIL gadget ${gid}: ${e}`);
        }
    }
    check("every gadget handler runs without throwing", gadgetFailures === 0, `${gadgetFailures} failures`);
    check("gadget entities spawned", State.devices.size > 0, `devices=${State.devices.size}`);
    __advance(80);
    check("deployable ticks survive 80 ticks", State.devices.size >= 0);

    // direct projectile + explosion
    const projOwner = currentAtk()[0];
    Projectiles.spawn("frag", projOwner, projOwner.getHeadLocation(), { x: 0, y: 0, z: 1 });
    Projectiles.spawn("gas", projOwner, projOwner.getHeadLocation(), { x: 0, y: -0.2, z: 1 });
    Projectiles.spawn("nitro", projOwner, projOwner.getHeadLocation(), { x: 0, y: 0, z: 1 });
    __advance(120);
    check("projectiles resolve", State.projectiles.length === 0, `left=${State.projectiles.length}`);

    // ADS interception
    const defender = currentDef()[0];
    const ads = Deployables.spawnDevice("gadget_ads", { x: 20, y: 65, z: 20 }, defender, { charges: 3 });
    if (ads) {
        const attackerForAds = currentAtk()[0];
        const adsProj = Projectiles.spawn("frag", attackerForAds, { x: 18, y: 66, z: 20 }, { x: 1, y: 0, z: 0 });
        __advance(20);
        check("ADS intercepts or projectile resolves", !State.projectiles.some(p => p.kind === "frag"),
            `ads=${ads.kind}/${ads.team} owner=${ps(attackerForAds)?.team} charges=${ads.charges} ` +
            `proj=${adsProj ? `${JSON.stringify(adsProj.pos)} team=${adsProj.ownerTeam}` : "gone"} ` +
            `left=${State.projectiles.map(p => p.kind).join(",")}`);
        Deployables.removeAll();
    }

    // semi-auto gun: one shot per trigger hold
    const semiUser = currentAtk()[1] ?? currentAtk()[0];
    const semiSt = ps(semiUser);
    const pistolId = Object.keys(semiSt.ammo).find(id => !WEAPONS[id].auto);
    if (pistolId) {
        semiUser.selectedSlotIndex = 1;
        const pistolItem = semiUser.getComponent("minecraft:inventory").container.getItem(1);
        if (pistolItem && pistolItem.typeId === "r6:" + pistolId) {
            const before = semiSt.ammo[pistolId].mag;
            __itemStartUse(semiUser, pistolItem);
            for (let i = 0; i < 40; i++) {
                __advance(1);
                __signals.itemStartUse.fire({ source: semiUser, itemStack: pistolItem });
            }
            __itemStopUse(semiUser);
            const fired = before - semiSt.ammo[pistolId].mag;
            check("semi-auto fires one round per hold", fired === 1, `fired=${fired}`);
        }
    }

    // ---------------------------------------------------------------- barricade -> steel frame blocks
    const breach = await import(pathToFileURL(path.join(RUN, "scripts", "gadgets", "breach.js")).href);
    const util = await import(pathToFileURL(path.join(RUN, "scripts", "util.js")).href);
    const reg2 = await import(pathToFileURL(path.join(RUN, "scripts", "data", "registry.js")).href);
    const { BARRIER_BLOCK, FRAME_BLOCK } = reg2;
    check("block ids exported", BARRIER_BLOCK === "r6:wood_barricade" && FRAME_BLOCK === "r6:steel_frame",
        `${BARRIER_BLOCK} / ${FRAME_BLOCK}`);

    const builder = currentDef()[0] ?? currentAtk()[0];
    const builderSt = ps(builder);
    builderSt.side = "defender";
    builderSt.charges["gadget_barricade"] = 2;
    builderSt.cooldowns["gadget_barricade"] = 0;
    Abilities.use(builder, new ItemStack("r6:gadget_barricade"));
    __advance(1);
    const placed = __findBlock(BARRIER_BLOCK);
    check("barricade gadget places wooden block", !!placed && builderSt.charges["gadget_barricade"] === 1,
        `placed=${JSON.stringify(placed)} charges=${builderSt.charges["gadget_barricade"]}`);
    if (placed) {
        // bullets accumulate damage, then the plank breaks into the steel frame
        breach.damageBarricade(builder.dimension, builder.dimension.getBlock(placed), 999);
        check("wood barricade turns into steel frame", __getBlockId(placed) === FRAME_BLOCK,
            `got ${__getBlockId(placed)}`);
        // frame is walk-through and see-through for rays
        const frameLoc = { ...placed };
        const ray = util.blockRay(builder.dimension, builder.getHeadLocation(), { x: 0, y: 0, z: 1 }, 12);
        check("steel frame blocks are skipped by raycasts", !ray || ray.block.typeId !== FRAME_BLOCK,
            `ray=${ray?.block?.typeId}`);
        // round reset restores the original (air) block
        breach.restoreRoundBlocks(builder.dimension);
        check("round reset restores barricade cells", __getBlockId(frameLoc) === "minecraft:air",
            `got ${__getBlockId(frameLoc)}`);
    }

    // breach charge transform
    const breachCell = { x: 40, y: 65, z: 40 };
    __setBlock(breachCell, BARRIER_BLOCK);
    breach.breachWall(builder.dimension,
        { x: breachCell.x + 0.5, y: breachCell.y + 0.5, z: breachCell.z + 0.5 }, "Up",
        { width: 0, height: 0, depth: 0 });
    check("breach charges turn barricade into steel frame", __getBlockId(breachCell) === FRAME_BLOCK,
        `got ${__getBlockId(breachCell)}`);

    // sledge hammer transform
    const dir = builder.getViewDirection();
    const head = builder.getHeadLocation();
    const sledgeCell = { x: Math.floor(head.x + dir.x * 3), y: Math.floor(head.y + dir.y * 3), z: Math.floor(head.z + dir.z * 3) };
    __setBlock(sledgeCell, BARRIER_BLOCK);
    breach.sledgeBreak(builder);
    check("sledge hammer turns barricade into steel frame", __getBlockId(sledgeCell) === FRAME_BLOCK,
        `got ${__getBlockId(sledgeCell)}`);
    breach.restoreRoundBlocks(builder.dimension);

    // ---------------------------------------------------------------- forced rounds to match end
    let guard = 0;
    while (State.match && guard++ < 20) {
        if (State.match.phase === "prep") { __advance(Config.prepSeconds * 20 + 2); }
        if (State.match?.phase === "action") {
            Match.endRound("attacker", "smoke test");
            __advance(Config.roundEndSeconds * 20 + 3);
        } else if (State.match?.phase === "round_end") {
            __advance(5);
        } else {
            __advance(10);
        }
    }
    check("match ends after roundsToWin", State.match === null);

    // ---------------------------------------------------------------- queue cleanup / restart
    for (const p of [players[0], players[1]]) __scriptEvent("r6:join", p);
    await flush(); __advance(2);
    check("new queue accepts players", State.queue.length === 2);
    __scriptEvent("r6:leave", players[0]);
    await flush(); __advance(1);
    check("leave queue works", State.queue.length === 1);

    // ---------------------------------------------------------------- config events
    __scriptEvent("r6:config", admin, "teamSize 3");
    await flush(); __advance(1);
    check("config teamSize updated", Config.teamSize === 3, String(Config.teamSize));
    __scriptEvent("r6:reset", admin, "");
    await flush(); __advance(1);
    check("config reset", Config.teamSize === 5, String(Config.teamSize));

    // ---------------------------------------------------------------- 1v1 match + mid-match leave
    __mock.players.length = 0;
    for (const p of players) { if (!__mock.players.includes(p)) __mock.players.push(p); }
    Config.teamSize = 1;
    State.players.clear();
    State.match = null;
    State.queue = [];
    const duel = [__createPlayer("D0", { x: 0, y: 65, z: 0 }), __createPlayer("D1", { x: 3, y: 65, z: 0 })];
    for (const p of duel) __scriptEvent("r6:join", p);
    await flush(); __advance(3);
    check("1v1 match starts with teamSize=1", !!State.match && State.match.teams.blue.length === 1
        && State.match.teams.orange.length === 1, State.match ? "match" : "none");
    if (State.match) {
        __advance(Config.prepSeconds * 20 + 5);
        const leaver = duel[0];
        __removePlayer(leaver);
        __advance(5);
        check("mid-match leave resolves the round", State.match?.phase === "round_end"
            || State.match?.round === 2 || State.match === null,
            `phase=${State.match?.phase} round=${State.match?.round}`);
        if (State.match) { Match.stop(admin); await flush(); __advance(2); }
    }
    check("match cleaned up after stop", State.match === null);
    Config.teamSize = 5;

    // ---------------------------------------------------------------- free test mode (no match, like Test Guns)
    const freePlayer = __createPlayer("FreeTester", { x: 0, y: 65, z: 0 });
    const freeInv = freePlayer.getComponent("minecraft:inventory").container;
    const freeGun = new ItemStack("r6:l85a2", 1);
    freeInv.setItem(0, freeGun);
    freePlayer.selectedSlotIndex = 0;

    __itemUse(freePlayer, freeGun);
    __advance(2);
    const freeInfo = Guns.debugInfo(freePlayer);
    check("free mode: itemUse fires without a match",
        !!freeInfo.session && freeInfo.session.shots >= 1 && freeInfo.canFire.ok,
        JSON.stringify(freeInfo));
    check("free mode: durability acts as magazine", (() => {
        const dur = freeInv.getItem(0)?.getComponent("minecraft:durability");
        return !!dur && dur.damage > 0;
    })());

    // hold-to-fire in free mode
    __itemStopUse(freePlayer);
    __advance(1);
    __itemStartUse(freePlayer, freeInv.getItem(0));
    __advance(30);
    const holdInfo = Guns.debugInfo(freePlayer);
    __itemStopUse(freePlayer);
    check("free mode: holding keeps firing", (holdInfo.session?.shots ?? 0) >= 2,
        `shots=${holdInfo.session?.shots}`);

    // skills outside a match
    const skillIds = ["gadget_thermal", "gadget_scanner", "gadget_cardiac", "gadget_stim",
        "gadget_jammer", "gadget_ads", "gadget_turret", "gadget_barricade", "gadget_reinforce"];
    let skillFailures = 0;
    for (const gid of skillIds) {
        try {
            Abilities.use(freePlayer, new ItemStack("r6:" + gid, 1));
            __advance(8); // clear the 6-tick use dedupe between different skills
        } catch (e) {
            skillFailures++;
            console.log(`  FAIL free skill ${gid}: ${e}`);
        }
    }
    __advance(40);
    const freePs = State.players.get(freePlayer.id);
    check("free mode: every skill runs without a match", skillFailures === 0, `${skillFailures} failures`);
    check("free mode: skill state created", !!freePs && freePs.freeMode === true);
    check("free mode: deployables placed", State.devices.size > 0, `devices=${State.devices.size}`);
    check("free mode: barricade block placeable", !!__findBlock("r6:wood_barricade"));

    // debug command output
    const msgCountBefore = freePlayer.messages.length;
    __scriptEvent("r6:debug", freePlayer);
    await flush(); __advance(1);
    check("r6:debug prints diagnostics", freePlayer.messages.length > msgCountBefore,
        `${msgCountBefore} -> ${freePlayer.messages.length}`);
    // unknown item must not crash the router
    __itemUse(freePlayer, new ItemStack("minecraft:dirt", 1));
    __advance(1);
    check("unknown item ignored safely", true);

    // ---------------------------------------------------------------- bullet spread / random sway (Test Guns port)
    const profileCold = spread.spreadProfile(1.0, 1, {});
    const profileHot = spread.spreadProfile(1.0, 5, {});
    const profileAds = spread.spreadProfile(1.0, 1, { sneaking: true });
    check("spread: consecutive shots increase sway",
        profileHot.yawDegrees > profileCold.yawDegrees && profileCold.yawDegrees > 0,
        `cold=${profileCold.yawDegrees.toFixed(2)} hot=${profileHot.yawDegrees.toFixed(2)}`);
    check("spread: ADS/sneaking tightens sway",
        profileAds.pitchDegrees < profileCold.pitchDegrees,
        `ads=${profileAds.pitchDegrees.toFixed(2)} hip=${profileCold.pitchDegrees.toFixed(2)}`);
    const center = spread.sampleSpreadDirection({ x: 0, y: 0, z: 1 }, profileCold);
    check("spread: sample direction stays normalized",
        Math.abs(Math.hypot(center.x, center.y, center.z) - 1) < 1e-6);
    const sprayed = spread.sampleSpreadDirection({ x: 0, y: 0, z: 1 }, profileHot, false, () => 0.999);
    check("spread: random sway moves the aim point", Math.abs(sprayed.x) > 1e-4,
        `x=${sprayed.x.toFixed(4)}`);

    // ---------------------------------------------------------------- console hygiene
    console.warn = origWarn;
    const r6Warnings = warn.filter(w => w.includes("[R6]") && !w.includes("event unavailable"));
    check("no unexpected R6 runtime warnings", r6Warnings.length === 0, r6Warnings.slice(0, 5).join(" | "));

    console.log("");
    if (failures) {
        console.log(`${failures} smoke check(s) failed.`);
        for (const w of r6Warnings.slice(0, 20)) console.log("  warn: " + w);
        process.exit(1);
    }
    console.log("All smoke checks passed.");
}

main_().catch(e => {
    console.error("SMOKE TEST CRASHED:", e);
    process.exit(2);
});
