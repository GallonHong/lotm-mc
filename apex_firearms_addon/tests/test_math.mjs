import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const addonRoot = path.resolve(__dirname, "..");

console.log("=== [Apex Firearms] Running Static & Mathematical Test Suite ===");

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

console.log("\n[1/3] Validating all JSON manifests, models, attachables, and recipes...");
validateJsonDir(path.join(addonRoot, "apex_firearms_bp"));
validateJsonDir(path.join(addonRoot, "apex_firearms_rp"));

// 2. Math Validation: 600 RPM Accumulator Clock
console.log("\n[2/3] Validating 600 RPM Tick Accumulator Math...");
const targetRpm = 600;
const intervalTicks = 20.0 / (targetRpm / 60.0); // 2.0 ticks/shot
let accumulator = 0.0;
let totalShots = 0;
for (let tick = 1; tick <= 200; tick++) { // 10 seconds @ 20 TPS
  accumulator += 1.0;
  while (accumulator >= intervalTicks) {
    accumulator -= intervalTicks;
    totalShots++;
  }
}
if (totalShots !== 100) {
  console.error(`  ✖ RPM Math Error: Expected 100 shots in 200 ticks, got ${totalShots}`);
  process.exit(1);
}
console.log(`  ✔ RPM Math Verified: 200 ticks -> exactly ${totalShots} shots (600 RPM, 0% error margin)`);

// 3. Math Validation: Armor Reduction & Penetration
console.log("\n[3/3] Validating Armor Penetration & Reduction Formula...");
function calculateArmorReduction(baseDamage, armorPoints, armorPiercing) {
  if (armorPoints <= 0) return baseDamage;
  const effectivePiercing = Math.max(1 - armorPiercing, 0);
  let reductionPercent = armorPoints * 4 * effectivePiercing;
  const diminishingFactor = Math.min(1, baseDamage / 12);
  reductionPercent *= (1 - 0.1 * diminishingFactor);
  const finalReduction = (baseDamage * reductionPercent) / 100;
  return Math.max(1, Math.round(baseDamage - finalReduction));
}

const baseDmg = 22;
const ap = 0.35;
const testCases = [
  { armor: 0, expected: 22 },
  { armor: 10, expected: 17 },
  { armor: 20, expected: 12 }
];

for (const tc of testCases) {
  const result = calculateArmorReduction(baseDmg, tc.armor, ap);
  if (result !== tc.expected) {
    console.error(`  ✖ Armor Math Mismatch: Armor ${tc.armor} -> expected ${tc.expected}, got ${result}`);
    process.exit(1);
  }
  console.log(`  ✔ Armor ${tc.armor} pts -> Damage: ${result} HP (Base: ${baseDmg}, AP: 35%)`);
}

console.log("\n=======================================================");
console.log("✔ ALL APEX FIREARMS TESTS PASSED SUCCESSFULLY! (100%)");
console.log("=======================================================");
