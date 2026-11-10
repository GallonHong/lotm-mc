import json
import os
import re

REPO_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MOBS_BP_ENTITIES = os.path.join(REPO_DIR, "addons", "development", "apocalypse_mobs_addon", "apocalypse_mobs_bp", "entities")
CONFIG_JS = os.path.join(REPO_DIR, "addons", "development", "apocalypse_mobs_addon", "apocalypse_mobs_bp", "scripts", "config.js")

BOSS_TARGETS = {
    "mutant_zombie.json": 2500,        # 1000 * 2.5
    "mutant_drowned.json": 2250,       # 900 * 2.5
    "mutant_skeleton.json": 2000,      # 800 * 2.5
    "mutant_lobber.json": 1875,        # 750 * 2.5
    "mutant_enderman.json": 3500,      # 1400 * 2.5
    "mutant_iron_golem.json": 5000,    # 2000 * 2.5
    "siren_head.json": 4000,           # 1600 * 2.5
    "fog_man.json": 3000,              # 1200 * 2.5
    "goatman.json": 2750,              # 1100 * 2.5
    "infected_broodmother.json": 1250, # 500 * 2.5
    "infected_tyrant.json": 550        # 220 * 2.5
}

def update_entities():
    print("[*] Updating Boss Entity JSON definitions...")
    for filename, new_hp in BOSS_TARGETS.items():
        filepath = os.path.join(MOBS_BP_ENTITIES, filename)
        if not os.path.exists(filepath):
            print(f"[!] Warning: {filepath} does not exist!")
            continue
        
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        # Update "minecraft:health" component values preserving original formatting
        old_pattern = r'("minecraft:health"\s*:\s*\{\s*"value"\s*:\s*)(\d+)(\s*,\s*"max"\s*:\s*)(\d+)(\s*\})'
        match = re.search(old_pattern, content)
        if match:
            old_val = match.group(2)
            old_max = match.group(4)
            new_content = re.sub(
                old_pattern,
                rf'\g<1>{new_hp}\g<3>{new_hp}\g<5>',
                content,
                count=1
            )
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"  [+] {filename}: {old_val}/{old_max} -> {new_hp}/{new_hp} (x{new_hp/float(old_max):.2f})")
        else:
            print(f"  [!] Could not regex match health in {filename}, falling back to json parse")
            data = json.loads(content)
            comps = data["minecraft:entity"]["components"]
            old_hp = comps["minecraft:health"]["max"]
            comps["minecraft:health"]["value"] = new_hp
            comps["minecraft:health"]["max"] = new_hp
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"  [+] {filename}: {old_hp} -> {new_hp}")

def update_config_js():
    print("[*] Updating MOB_PROFILES in apocalypse_mobs config.js...")
    with open(CONFIG_JS, "r", encoding="utf-8") as f:
        content = f.read()

    # tyrant: { typeId: "apoc:infected_tyrant", weight: 0, tier: 4, armorEligible: true, health: { law: 220, outlaw: 320, extraction: 480 } },
    # broodmother: { typeId: "apoc:infected_broodmother", weight: 0, tier: 5, armorEligible: true, health: { law: 500, outlaw: 652, extraction: 852 } },
    old_tyrant = 'tyrant: { typeId: "apoc:infected_tyrant", weight: 0, tier: 4, armorEligible: true, health: { law: 220, outlaw: 320, extraction: 480 } }'
    new_tyrant = 'tyrant: { typeId: "apoc:infected_tyrant", weight: 0, tier: 4, armorEligible: true, health: { law: 550, outlaw: 800, extraction: 1200 } }'

    old_broodmother = 'broodmother: { typeId: "apoc:infected_broodmother", weight: 0, tier: 5, armorEligible: true, health: { law: 500, outlaw: 652, extraction: 852 } }'
    new_broodmother = 'broodmother: { typeId: "apoc:infected_broodmother", weight: 0, tier: 5, armorEligible: true, health: { law: 1250, outlaw: 1630, extraction: 2130 } }'

    if old_tyrant in content:
        content = content.replace(old_tyrant, new_tyrant)
        print("  [+] Updated tyrant in MOB_PROFILES (220/320/480 -> 550/800/1200)")
    else:
        print("  [!] Warning: old tyrant pattern not found in config.js")

    if old_broodmother in content:
        content = content.replace(old_broodmother, new_broodmother)
        print("  [+] Updated broodmother in MOB_PROFILES (500/652/852 -> 1250/1630/2130)")
    else:
        print("  [!] Warning: old broodmother pattern not found in config.js")

    with open(CONFIG_JS, "w", encoding="utf-8") as f:
        f.write(content)

if __name__ == "__main__":
    update_entities()
    update_config_js()
    print("[SUCCESS] All boss health modifications applied.")
