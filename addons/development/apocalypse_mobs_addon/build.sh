#!/usr/bin/env bash
set -euo pipefail

addon_dir="$(cd "$(dirname "$0")" && pwd)"
bp_pack="$addon_dir/Apocalypse_Mobs_BP.mcpack"
rp_pack="$addon_dir/Apocalypse_Mobs_RP.mcpack"
addon="$addon_dir/Apocalypse_Mobs_Addon.mcaddon"
versioned_addon="$addon_dir/Apocalypse_Mobs_Addon_v0.7.1.mcaddon"

rm -f "$bp_pack" "$rp_pack" "$addon" "$versioned_addon"
(cd "$addon_dir/apocalypse_mobs_bp" && zip -qr "$bp_pack" .)
(cd "$addon_dir/apocalypse_mobs_rp" && zip -qr "$rp_pack" .)
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT
cp "$bp_pack" "$tmp_dir/"
cp "$rp_pack" "$tmp_dir/"
(cd "$tmp_dir" && zip -qr "$addon" .)
cp "$addon" "$versioned_addon"
echo "Built $addon"
