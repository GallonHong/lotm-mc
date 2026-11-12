#!/usr/bin/env python3
"""Merge a "Wormhole" release bundle into the add-on sources.

A bundle is a zip of `*_vX.Y.Z.mcaddon` files, each containing `<pack>.mcpack`
files. The script extracts every package and synchronises each pack into its
repository source directory (add new files, overwrite changed ones, never delete
repo-only files such as tests/tools/docs).

After the pack sync it re-applies the local drone combat-buff layer that the
release packages do not contain:

  - Test Guns / SAPI damage handlers: `readDroneCombatBuff` import + crit/dmg hook
  - Apocalypse Life: `buildDroneBuffTag` import, `applyDroneCombatBuff` method,
    tag cleanup, PvP-friendly trigger threshold, `combatBuff` design values in
    DroneConstants.js, and the droneCombatBuff.js contract file itself
  - keeps the three droneCombatBuff.js copies byte-identical

The script is idempotent: pack sync only writes differing bytes and the drone
layer is skipped where it is already present.

Usage:
  python tools/apply_wormhole_update.py "C:\\Users\\10973\\Downloads\\Wormhole dL2Qo3.zip"
  python tools/apply_wormhole_update.py <bundle.zip> --dry-run
"""
import argparse
import hashlib
import json
import os
import re
import shutil
import sys
import zipfile

REPO_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEV_DIR = os.path.join(REPO_DIR, "addons", "development")
WORK_DIR = os.path.join(REPO_DIR, ".tmp-wormhole", "_merge")

# embedded pack folder name -> repository source directory (relative to addons/development)
PACK_SOURCES = {
    "apocalypse_boss_bp": "apocalypse_boss_addon/apocalypse_boss_bp",
    "apocalypse_boss_rp": "apocalypse_boss_addon/apocalypse_boss_rp",
    "apocalypse_life_bp": "apocalypse_life_addon/apocalypse_life_bp",
    "apocalypse_life_rp": "apocalypse_life_addon/apocalypse_life_rp",
    "apocalypse_mobs_bp": "apocalypse_mobs_addon/apocalypse_mobs_bp",
    "apocalypse_mobs_rp": "apocalypse_mobs_addon/apocalypse_mobs_rp",
    "sapi_server_bp": "sapi_server_addon/sapi_server_bp",
    "sapi_server_rp": "sapi_server_addon/sapi_server_rp",
    "daily_events_bp": "daily_world_events_addon/daily_events_bp",
    "daily_events_rp": "daily_world_events_addon/daily_events_rp",
    "test_guns_bp": "test_guns_2d_addon/test_guns_bp",
    "test_guns_rp": "test_guns_2d_addon/test_guns_rp",
    "natural_disasters_bp": "natural_disasters_standalone_addon/standalone_disasters_bp",
    "natural_disasters_rp": "natural_disasters_standalone_addon/standalone_disasters_rp",
    # newer bundles use Capitalized pack folder names
    "Apocalypse_Boss_BP": "apocalypse_boss_addon/apocalypse_boss_bp",
    "Apocalypse_Boss_RP": "apocalypse_boss_addon/apocalypse_boss_rp",
    "Apocalypse_Life_BP": "apocalypse_life_addon/apocalypse_life_bp",
    "Apocalypse_Life_RP": "apocalypse_life_addon/apocalypse_life_rp",
    "Apocalypse_Mobs_BP": "apocalypse_mobs_addon/apocalypse_mobs_bp",
    "Apocalypse_Mobs_RP": "apocalypse_mobs_addon/apocalypse_mobs_rp",
    "SAPI_Server_BP": "sapi_server_addon/sapi_server_bp",
    "SAPI_Server_RP": "sapi_server_addon/sapi_server_rp",
    "Survival_Daily_Events_BP": "daily_world_events_addon/daily_events_bp",
    "Survival_Daily_Events_RP": "daily_world_events_addon/daily_events_rp",
    "Test_Guns_2D_BP": "test_guns_2d_addon/test_guns_bp",
    "Test_Guns_2D_RP": "test_guns_2d_addon/test_guns_rp",
    "standalone_disasters_bp": "natural_disasters_standalone_addon/standalone_disasters_bp",
    "standalone_disasters_rp": "natural_disasters_standalone_addon/standalone_disasters_rp",
    "extraction_bp": "apocalypse_extraction_addon/extraction_bp",
    "extraction_rp": "apocalypse_extraction_addon/extraction_rp",
    "extraction_dimension_bootstrap_bp": "apocalypse_extraction_addon/extraction_dimension_bootstrap_bp",
    "liufenjie_scene_bp": "liufenjie_scene_addon/liufenjie_scene_bp",
    "apocalypse_ui_rp": "apocalypse_ui_addon/apocalypse_ui_rp",
    "pose_compatibility": "apocalypse_test_guns_pose_compatibility",
    "apocalypse_test_guns_pose_compatibility": "apocalypse_test_guns_pose_compatibility",
}
SKIP_SUFFIXES = (".mcpack", ".mcaddon")
SKIP_DIR_NAMES = {".git", "node_modules", "__pycache__"}

# ---------------------------------------------------------------- drone layer
DRONE_IMPORT_ANCHOR = "import { JETPACK_COMBAT } from '%sdata/jetpack.js';\n"
DRONE_IMPORT_LINE = "import { readDroneCombatBuff } from '%s';\n"
DRONE_HOOK = (
    "  // 1.2 无人机战术增益（跨包 player tag 契约，见 droneCombatBuff.js；只加暴击率与伤害）\n"
    "  const droneBuff = readDroneCombatBuff(shooter);\n"
    "  critRate += droneBuff.critRate;\n"
    "  dmgMultiplier += droneBuff.damage;\n\n"
)
DRONE_HOOK_ANCHOR = "  // Probability only is clamped; no new cap reduces any pre-existing damage/passive.\n"
DRONE_HANDLERS = [
    ("addons/development/test_guns_2d_addon/test_guns_bp/scripts/feature/damageHandler.js", "../", "./utils/droneCombatBuff.js"),
    ("addons/development/sapi_server_addon/sapi_server_bp/scripts/vendor/baizhan_damage/feature/damageHandler.js", "../", "./utils/droneCombatBuff.js"),
    ("addons/development/sapi_server_addon/sapi_server_bp/scripts/vendor/melee_damageHandler.js", "./baizhan_damage/", "./baizhan_damage/feature/utils/droneCombatBuff.js"),
]

LIFE_DRONE_CLASS = "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/drones/DroneClass.js"
LIFE_DRONE_CONSTANTS = "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/drones/DroneConstants.js"
LIFE_DRONE_IMPORT = (
    'import { DRONE_REGISTRY } from "./DroneConstants.js";\n'
    'import { buildDroneBuffTag, clearDroneCombatBuffs } from "./droneCombatBuff.js";\n'
)
LIFE_DRONE_METHOD = ''' /**
  * 下发跨包战术增益（伤害% / 暴击率%）：写 player tag，持续结束移除同一 token。
  * 契约与读取端见 scripts/drones/droneCombatBuff.js（Test Guns / SAPI 镜像副本）。
  */
 static applyDroneCombatBuff(player, combatBuff, durationTicks) {
  if (!combatBuff) return;
  const applied = [];
  try {
   const token = String(system.currentTick);
   if (combatBuff.damagePct > 0) {
    const tag = buildDroneBuffTag("damage", combatBuff.damagePct, token);
    player.addTag(tag);
    applied.push(tag);
   }
   if (combatBuff.critPct > 0) {
    const tag = buildDroneBuffTag("crit", combatBuff.critPct, token);
    player.addTag(tag);
    applied.push(tag);
   }
  } catch {
   return;
  }
  if (!applied.length) return;
  const ticks = Math.max(1, Math.floor(durationTicks || 0));
  system.runTimeout(() => {
   try {
    if (!player.isValid()) return;
    for (const tag of applied) player.removeTag(tag);
   } catch {}
  }, ticks);
 }

'''
LIFE_DRONE_CLEANUP = '''
// 世界重载后清理上次会话残留的战术增益 tag（增益本身只持续 8–10 秒）。
system.run(() => {
 for (const player of world.getAllPlayers()) clearDroneCombatBuffs(player);
});
'''
LIFE_COMBAT_BUFFS = {
    "adrenaline_shot": (20, 0, 8),
    "gale_buff": (20, 20, 8),
    "abyssal_matrix": (35, 35, 10),
}
LIFE_DESC = {
    "adrenaline_shot": "进入交火时为主人注入战术肾上腺素：速度II、抗性提升I、伤害提升20%(8秒)",
    "gale_buff": "注入战术战意：提高主人20%伤害、20%暴击率，并赋予2颗额外黄金吸收心(持续8秒)",
    "abyssal_matrix": "开启终极矩阵：大幅提升主人35%伤害、35%暴击率，力量II、速度II并赋予2颗额外心(持续10秒)",
}


def sha(path):
    with open(path, "rb") as handle:
        return hashlib.sha256(handle.read()).hexdigest()


def read_text(path):
    with open(path, "r", encoding="utf-8") as handle:
        return handle.read()


def write_text(path, text):
    with open(path, "w", encoding="utf-8", newline="") as handle:
        handle.write(text)


def extract_zip(zip_path, destination):
    with zipfile.ZipFile(zip_path, "r") as archive:
        for entry in archive.infolist():
            if entry.is_dir():
                continue
            target = os.path.join(destination, entry.filename)
            os.makedirs(os.path.dirname(target), exist_ok=True)
            with archive.open(entry, "r") as reader, open(target, "wb") as writer:
                shutil.copyfileobj(reader, writer, 1024 * 1024)


def tree(root):
    result = {}
    for current, dirs, files in os.walk(root):
        dirs[:] = [name for name in dirs if name not in SKIP_DIR_NAMES]
        for name in files:
            path = os.path.join(current, name)
            result[os.path.relpath(path, root).replace(os.sep, "/")] = sha(path)
    return result


def diff_tree(src_dir, dst_dir):
    new_tree = tree(dst_dir)
    cur_tree = tree(src_dir)
    added = sorted(set(new_tree) - set(cur_tree))
    changed = sorted(path for path in set(new_tree) & set(cur_tree) if new_tree[path] != cur_tree[path])
    removed = sorted(set(cur_tree) - set(new_tree))
    return added, changed, removed


def sync_tree(src_dir, dst_dir):
    copied = added = unchanged = 0
    for current, dirs, files in os.walk(src_dir):
        dirs[:] = [name for name in dirs if name not in SKIP_DIR_NAMES]
        for name in files:
            if name.endswith(SKIP_SUFFIXES):
                continue
            full = os.path.join(current, name)
            rel = os.path.relpath(full, src_dir)
            target = os.path.join(dst_dir, rel)
            os.makedirs(os.path.dirname(target), exist_ok=True)
            if os.path.exists(target) and sha(full) == sha(target):
                unchanged += 1
                continue
            if not os.path.exists(target):
                added += 1
            shutil.copy2(full, target)
            copied += 1
    return copied, added, unchanged


def reapply_handler(relative, import_prefix, hook_target):
    path = os.path.join(REPO_DIR, relative)
    source = read_text(path)
    changed = False
    if "readDroneCombatBuff(shooter)" not in source:
        if source.count(DRONE_HOOK_ANCHOR) != 1:
            return f"anchor mismatch: {relative}"
        source = source.replace(DRONE_HOOK_ANCHOR, DRONE_HOOK + DRONE_HOOK_ANCHOR)
        changed = True
    if "readDroneCombatBuff } from" not in source:
        import_anchor = DRONE_IMPORT_ANCHOR % import_prefix
        if import_anchor not in source:
            return f"import anchor mismatch: {relative}"
        source = source.replace(import_anchor, import_anchor + DRONE_IMPORT_LINE % hook_target)
        changed = True
    if changed:
        write_text(path, source)
        return f"re-applied: {relative}"
    return f"already present: {relative}"


def reapply_life():
    results = []
    class_path = os.path.join(REPO_DIR, LIFE_DRONE_CLASS)
    source = read_text(class_path)
    changed = False
    if "buildDroneBuffTag" not in source:
        anchor = 'import { DRONE_REGISTRY } from "./DroneConstants.js";\n'
        if anchor not in source:
            return ["DroneClass: import anchor missing"]
        source = source.replace(anchor, LIFE_DRONE_IMPORT)
        changed = True
    threshold_old = "    const mobs = this.combatTargets(player, entity, 16);\n    if (mobs.length >= 2) {\n"
    threshold_new = (
        "    const mobs = this.combatTargets(player, entity, 16);\n"
        "    // PvP 对局中 1 个敌对目标即可触发；PvE 保持 2 个以上交火目标。\n"
        "    const requiredTargets = participant(player) ? 1 : 2;\n"
        "    if (mobs.length >= requiredTargets) {\n"
    )
    if "requiredTargets = participant(player)" not in source:
        if threshold_old not in source:
            return ["DroneClass: trigger B anchor missing"]
        source = source.replace(threshold_old, threshold_new)
        changed = True
    if "applyDroneCombatBuff(player, skill.combatBuff" not in source:
        trigger_c = "   // 触发器 C：单体高爆/榴弹 (combat_target)"
        if trigger_c not in source:
            return ["DroneClass: trigger C anchor missing"]
        head, tail = source.split(trigger_c, 1)
        marker = "    }\n   }\n\n"
        if marker not in head:
            return ["DroneClass: trigger B closing anchor missing"]
        insert_at = head.rfind(marker)
        head = head[:insert_at] + "     if (skill.combatBuff) this.applyDroneCombatBuff(player, skill.combatBuff, skill.durationTicks || 160);\n" + head[insert_at:]
        source = head + trigger_c + tail
        changed = True
    if "static applyDroneCombatBuff(" not in source:
        method_anchor = " static combatTargets(player, entity, radius) {"
        if method_anchor not in source:
            return ["DroneClass: combatTargets anchor missing"]
        source = source.replace(method_anchor, LIFE_DRONE_METHOD + method_anchor)
        changed = True
    if "clearDroneCombatBuffs(player)" not in source:
        source = source.rstrip("\n") + "\n" + LIFE_DRONE_CLEANUP
        changed = True
    if changed:
        write_text(class_path, source)
        results.append("life DroneClass: re-applied")

    constants_path = os.path.join(REPO_DIR, LIFE_DRONE_CONSTANTS)
    constants = read_text(constants_path)
    changed = False
    for skill_id, (damage, crit, seconds) in LIFE_COMBAT_BUFFS.items():
        marker = f'id: "{skill_id}",'
        index = constants.find(marker)
        if index < 0:
            results.append(f"life DroneConstants: {skill_id} missing")
            continue
        close = constants.find("\n   }", index)
        desc_anchor = constants.find("\n    desc: ", index)
        if close < 0 or desc_anchor < 0 or desc_anchor > close:
            results.append(f"life DroneConstants: {skill_id} block shape unknown")
            continue
        block = constants[index:close]
        if "combatBuff:" not in block or LIFE_DESC[skill_id] not in block:
            add = ""
            if f"durationTicks: {seconds} * 20," not in block:
                add += f"\n    durationTicks: {seconds} * 20,"
            if "combatBuff:" not in block:
                add += f"\n    combatBuff: {{ damagePct: {damage}, critPct: {crit} }},"
            desc_offset = constants.find("\n    desc: ", index) - index
            block = block[:desc_offset] + add + block[desc_offset:]
            block = re.sub(r'desc: "[^"]*"', f'desc: "{LIFE_DESC[skill_id]}"', block, count=1)
            constants = constants[:index] + block + constants[close:]
            changed = True
    if changed:
        write_text(constants_path, constants)
        results.append("life DroneConstants: re-applied")
    return results


def check_mirrors():
    checks = []
    pairs = [
        ("test_guns/sapi damageHandler", "addons/development/test_guns_2d_addon/test_guns_bp/scripts/feature/damageHandler.js",
         "addons/development/sapi_server_addon/sapi_server_bp/scripts/vendor/baizhan_damage/feature/damageHandler.js"),
        ("life/guns droneCombatBuff", "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/drones/droneCombatBuff.js",
         "addons/development/test_guns_2d_addon/test_guns_bp/scripts/feature/utils/droneCombatBuff.js"),
        ("life/sapi droneCombatBuff", "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/drones/droneCombatBuff.js",
         "addons/development/sapi_server_addon/sapi_server_bp/scripts/vendor/baizhan_damage/feature/utils/droneCombatBuff.js"),
    ]
    for label, left, right in pairs:
        left_path, right_path = os.path.join(REPO_DIR, left), os.path.join(REPO_DIR, right)
        same = os.path.exists(left_path) and os.path.exists(right_path) and sha(left_path) == sha(right_path)
        checks.append(f"{label}: {'identical' if same else 'DRIFTED'}")
    return checks


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("bundle", help="Wormhole zip with *_vX.Y.Z.mcaddon files")
    parser.add_argument("--dry-run", action="store_true", help="only report the diff")
    args = parser.parse_args()
    bundle = os.path.abspath(args.bundle)
    if not os.path.exists(bundle):
        sys.exit(f"[!] bundle not found: {bundle}")

    if os.path.isdir(WORK_DIR):
        shutil.rmtree(WORK_DIR)
    os.makedirs(WORK_DIR, exist_ok=True)
    extract_zip(bundle, WORK_DIR)

    merged = 0
    for name in sorted(os.listdir(WORK_DIR)):
        if not name.endswith(".mcaddon"):
            continue
        package = name[: -len(".mcaddon")]
        package_dir = os.path.join(WORK_DIR, package)
        extract_zip(os.path.join(WORK_DIR, name), package_dir)
        print(f"\n=== {package}")
        for mcpack in sorted(os.listdir(package_dir)):
            if not mcpack.endswith(".mcpack"):
                continue
            pack_name = mcpack[: -len(".mcpack")]
            pack_dir = os.path.join(package_dir, pack_name)
            extract_zip(os.path.join(package_dir, mcpack), pack_dir)
            source_rel = PACK_SOURCES.get(pack_name)
            if not source_rel:
                print(f"  [!!] {pack_name}: no repository mapping, skipped")
                continue
            src_dir = os.path.join(DEV_DIR, source_rel)
            if not os.path.isdir(src_dir):
                print(f"  [!!] {pack_name}: source dir missing ({source_rel})")
                continue
            with open(os.path.join(pack_dir, "manifest.json"), "r", encoding="utf-8-sig") as handle:
                new_manifest = json.load(handle)["header"]
            with open(os.path.join(src_dir, "manifest.json"), "r", encoding="utf-8-sig") as handle:
                cur_manifest = json.load(handle)["header"]
            added, changed, removed = diff_tree(src_dir, pack_dir)
            version_note = f"v{'.'.join(map(str, new_manifest['version']))}"
            if new_manifest["version"] == cur_manifest["version"]:
                version_note += " (same version)"
            print(f"  {pack_name}: {version_note} | added={len(added)} changed={len(changed)} src-only={len(removed)}")
            for path in added[:10]:
                print(f"    + {path}")
            for path in changed[:10]:
                print(f"    ~ {path}")
            for path in removed[:10]:
                print(f"    - {path}")
            if args.dry_run:
                continue
            copied, new_files, unchanged = sync_tree(pack_dir, src_dir)
            print(f"    synced {copied} file(s) ({new_files} new), {unchanged} unchanged")
            merged += 1

    if args.dry_run:
        print("\n[dry-run] no files were written")
        return

    print("\n[drone] re-applying combat buff layer")
    for relative, import_prefix, hook_target in DRONE_HANDLERS:
        print("  " + reapply_handler(relative, import_prefix, hook_target))
    for line in reapply_life():
        print("  " + line)
    for line in check_mirrors():
        print("[check] " + line)
    print(f"\n[done] merged {merged} pack(s)")


if __name__ == "__main__":
    main()
