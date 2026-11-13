import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// SAPI PvP: shields must be allowed into a match (kept from inventory/offhand).
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "sapi_server_bp", "scripts", "modules", "pvp");
const vault = readFileSync(join(root, "vault.js"), "utf8");
const pvp = readFileSync(join(root, "..", "pvp.js"), "utf8");

assert.match(vault, /function isShield\(item\)/, "vault must define isShield");
assert.match(vault, /ownedShields/, "vault must collect shields from the player inventory");
assert.match(vault, /matchCopy\(item,tx\.matchId\)/, "shield copies must be issued into the match");
assert.match(vault, /off\?\.typeId==='minecraft:shield'/, "offhand shield must stay in the offhand");
assert.doesNotMatch(pvp, /shield[\s\S]{0,80}(cancel|reject|kick|deny)/i, "admission must not reject shields");

console.log("PvP shield admission validation passed (inventory + offhand shields kept during a match).");
