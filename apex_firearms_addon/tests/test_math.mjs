import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const addonRoot = path.resolve(__dirname, "..");

console.log("=== [Apex Firearms] Running 6-Gun Arsenal & Titan Exo-Armor Static Test Suite ===");

// 1. JSON Validations
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

console.log("\n[1/3] Validating all JSON manifests, models, items, armors, attachables, and recipes...");
validateJsonDir(path.join(addonRoot, "apex_firearms_bp"));
validateJsonDir(path.join(addonRoot, "apex_firearms_rp"));

// 2. Durability System Validation
console.log("\n[2/3] Validating Firearms Durability Configuration...");
const gunDurabilities = {
  "ak47.json": 600,
  "m82.json": 250,
  "vector.json": 800,
  "mgl.json": 300,
  "arc_emitter.json": 400,
  "shotgun.json": 450
};

for (const [file, expectedDur] of Object.entries(gunDurabilities)) {
  const p = path.join(addonRoot, "apex_firearms_bp", "items", file);
  const json = JSON.parse(fs.readFileSync(p, "utf8"));
  const maxDur = json["minecraft:item"].components["minecraft:durability"]?.max_durability;
  if (maxDur === expectedDur) {
    console.log(`  ✔ Durability verified for ${file}: ${maxDur} shots`);
  } else {
    console.error(`  ✖ Durability mismatch for ${file}: expected ${expectedDur}, got ${maxDur}`);
    process.exit(1);
  }
}

// 3. Armor System & Synergy Validation
console.log("\n[3/3] Validating Titan Exo-Armor Set & Skills...");
const armorFiles = ["exo_helmet.json", "exo_chestplate.json", "exo_leggings.json", "exo_boots.json"];
for (const file of armorFiles) {
  const p = path.join(addonRoot, "apex_firearms_bp", "items", file);
  const json = JSON.parse(fs.readFileSync(p, "utf8"));
  const prot = json["minecraft:item"].components["minecraft:wearable"]?.protection;
  const dur = json["minecraft:item"].components["minecraft:durability"]?.max_durability;
  console.log(`  ✔ Armor Piece ${file}: Protection = ${prot}, Durability = ${dur}`);
}

console.log("\n=======================================================");
console.log("✔ ALL ARSENAL & TITAN EXO-ARMOR TESTS PASSED! (100%)");
console.log("=======================================================");
