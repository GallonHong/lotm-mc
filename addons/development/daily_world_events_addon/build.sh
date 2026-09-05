#!/usr/bin/env bash
set -euo pipefail

addon_dir="$(cd "$(dirname "$0")" && pwd)"
bp_pack="$addon_dir/Survival_Daily_Events_BP.mcpack"
rp_pack="$addon_dir/Survival_Daily_Events_RP.mcpack"
addon="$addon_dir/Survival_Daily_Events_Addon.mcaddon"
versioned_addon="$addon_dir/Survival_Daily_Events_Addon_v0.18.0.mcaddon"

rm -f "$bp_pack" "$rp_pack" "$addon" "$versioned_addon"
(cd "$addon_dir/daily_events_bp" && zip -qr "$bp_pack" .)
(cd "$addon_dir/daily_events_rp" && zip -qr "$rp_pack" .)
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT
cp "$bp_pack" "$tmp_dir/"
cp "$rp_pack" "$tmp_dir/"
(cd "$tmp_dir" && zip -qr "$addon" .)
cp "$addon" "$versioned_addon"
echo "Built $addon"
