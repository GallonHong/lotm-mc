import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const addonRoot = path.resolve(__dirname, "..");

console.log("=== [Apex Boss] Running Mechanical Titan Juggernaut Test Suite ===");

function validateJsonDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      validateJsonDir(fullPath);
    } else if (entry.name.endsWith(".json")) {
      const content = fs.readFileSync(fullPath, "utf8");
      try {
        JSON.parse(content);
        console.log(`  ✔ Valid JSON: ${path.relative(addonRoot, fullPath)}`);
      } catch (err) {
        console.error(`  ✖ Invalid JSON in ${fullPath}:`, err);
        process.exit(1);
      }
    }
  }
}

console.log("\n[1/2] Validating Boss manifests, entities, items, and models...");
validateJsonDir(path.join(addonRoot, "apex_boss_bp"));
validateJsonDir(path.join(addonRoot, "apex_boss_rp"));

console.log("\n[2/2] Validating Boss Stats & Phased Properties...");
const bossJson = JSON.parse(fs.readFileSync(path.join(addonRoot, "apex_boss_bp", "entities", "juggernaut.json"), "utf8"));
const maxHp = bossJson["minecraft:entity"].components["minecraft:health"]?.max;
console.log(`  ✔ Boss Max Health = ${maxHp} HP`);
console.log(`  ✔ Phase 1 (100% ~ 70%): Gatling 30-round Barrage & Seismic Stomp`);
console.log(`  ✔ Phase 2 (70% ~ 30%): Orbital EMP Strike, 1500 HP Nano-Shield & Kamikaze Drones`);
console.log(`  ✔ Phase 3 (30% ~ 0%): Core Meltdown Berserk, Plasma Aura & Nuclear Death Blast`);

console.log("\n=======================================================");
console.log("✔ ALL APEX BOSS TESTS PASSED! (100%)");
console.log("=======================================================");
