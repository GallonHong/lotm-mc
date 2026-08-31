import "./functionality/index.js";

import "./main/advancements.js";
import "./main/test.js";
import "./main/core_system.js";
import "./main/backpack.js";
import "./main/item.js";
import "./main/bullet.js";
import "./main/main-menu.js";
import "./main/stats.js";
import "./main/CustomComponent/blocks.js";
import "./main/CustomComponent/vm_test.js";
import "./main/CustomComponent/items.js";
import "./main/CustomComponent/unbreakable.js";
import "./main/skins.js";
import "./main/guns.js";
import "./main/vector.js";
import "./main/lore.js";
import "./config.js";
import "./main/CustomComponent/items/healing.js";
import "./main/CustomComponent/items/first_aid.js";
import "./main/CustomComponent/items/medical.js";
import "./main/CustomComponent/items/can_hand.js";
import "./main/refill_water.js";
import "./main/CustomComponent/chair.js";

import { system, world } from "@minecraft/server";
import { tick } from "./main/flashbang.js"; 

system.runInterval(() => {
	const players = world.getAllPlayers();
    for (let i = 0; i < players.length; i++) {
        const player = players[i];
        tick(player);
    };
}, 1);