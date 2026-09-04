#!/usr/bin/env bash
set -euo pipefail

addon_dir="$(cd "$(dirname "$0")" && pwd)"
bp_pack="$addon_dir/Test_Guns_2D_BP.mcpack"
rp_pack="$addon_dir/Test_Guns_2D_RP.mcpack"
addon="$addon_dir/Test_Guns_2D_Addon.mcaddon"
versioned_addon="$addon_dir/Test_Guns_2D_Addon_v3.10.1.mcaddon"

rm -f "$bp_pack" "$rp_pack" "$addon" "$versioned_addon"
(cd "$addon_dir/test_guns_bp" && zip -qr "$bp_pack" .)
(cd "$addon_dir/test_guns_rp" && zip -qr "$rp_pack" .)
bundle_dir="$(mktemp -d)"
trap 'rm -rf "$bundle_dir"' EXIT
cp "$bp_pack" "$rp_pack" "$bundle_dir/"
(cd "$bundle_dir" && zip -qr "$addon" .)
cp "$addon" "$versioned_addon"
cp "$addon" "$addon_dir/../Test_Guns_2D_Addon.mcaddon"
unzip -tq "$addon" >/dev/null
echo "Built $addon"
