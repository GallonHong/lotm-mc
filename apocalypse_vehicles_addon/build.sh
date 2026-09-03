#!/usr/bin/env bash
set -euo pipefail

addon_dir="$(cd "$(dirname "$0")" && pwd)"
bp_pack="$addon_dir/Apocalypse_Vehicles_BP.mcpack"
rp_pack="$addon_dir/Apocalypse_Vehicles_RP.mcpack"
addon="$addon_dir/Apocalypse_Vehicles_Addon.mcaddon"
versioned_addon="$addon_dir/Apocalypse_Vehicles_Addon_v1.2.0.mcaddon"

rm -f "$bp_pack" "$rp_pack" "$addon" "$versioned_addon"
(cd "$addon_dir/apocalypse_vehicles_bp" && zip -qr "$bp_pack" .)
(cd "$addon_dir/apocalypse_vehicles_rp" && zip -qr "$rp_pack" .)
bundle_dir="$(mktemp -d)"
trap 'rm -rf "$bundle_dir"' EXIT
cp "$bp_pack" "$rp_pack" "$bundle_dir/"
(cd "$bundle_dir" && zip -qr "$addon" .)
cp "$addon" "$versioned_addon"
unzip -tq "$addon" >/dev/null
echo "Built $addon"
