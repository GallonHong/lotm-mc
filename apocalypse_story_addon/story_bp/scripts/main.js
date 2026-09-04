import { system } from "@minecraft/server";
import { StoryManager } from "./StoryManager.js";

console.warn("[ApocalypseStory] Tutorial story MVP v0.1.0 initializing...");

function playerFrom(event) {
  if (event.sourceEntity?.typeId === "minecraft:player") return event.sourceEntity;
  if (event.initiator?.typeId === "minecraft:player") return event.initiator;
  return null;
}

system.afterEvents.scriptEventReceive.subscribe(event => {
  const player = playerFrom(event);
  if (!player) return;
  const id = String(event.id || "").toLowerCase();
  const message = String(event.message || "").trim();
  if (id === "story:menu") StoryManager.open(player);
  else if (id === "story:start") StoryManager.begin(player);
  else if (id === "story:status") StoryManager.status(player);
  else if (id === "story:reset") StoryManager.reset(player);
  else if (id === "story:set_entry" && message.toLowerCase() === "here") StoryManager.setEntryHere(player);
  else if (id === "story:dungeon_complete") StoryManager.dungeonComplete(player, message.toLowerCase());
});

system.runInterval(() => {
  try { StoryManager.tick(); }
  catch (error) { console.warn(`[ApocalypseStory] tick failed: ${error}`); }
}, 20);
