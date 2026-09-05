#!/usr/bin/env bash
set -euo pipefail

addon_dir="$(cd "$(dirname "$0")" && pwd)"
bp_pack="$addon_dir/Apocalypse_Story_Test_BP.mcpack"
addon="$addon_dir/Apocalypse_Story_Test_Addon.mcaddon"
versioned_addon="$addon_dir/Apocalypse_Story_Test_Addon_v0.1.0.mcaddon"

rm -f "$bp_pack" "$addon" "$versioned_addon"
(cd "$addon_dir/story_bp" && zip -qr "$bp_pack" .)
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT
cp "$bp_pack" "$tmp_dir/"
(cd "$tmp_dir" && zip -qr "$addon" .)
cp "$addon" "$versioned_addon"
echo "Built $addon"
