#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BP_DIR="$SCRIPT_DIR/apex_firearms_bp"
RP_DIR="$SCRIPT_DIR/apex_firearms_rp"

BP_PACK="$SCRIPT_DIR/Apex_AK47_BP.mcpack"
RP_PACK="$SCRIPT_DIR/Apex_AK47_RP.mcpack"
ADDON_PACK="$SCRIPT_DIR/Apex_AK47_Addon.mcaddon"
VERSION_PACK="$SCRIPT_DIR/Apex_AK47_v1.0.0.mcaddon"

echo "Packaging Behavior Pack..."
rm -f "$BP_PACK"
(cd "$BP_DIR" && zip -r -q "$BP_PACK" .)

echo "Packaging Resource Pack..."
rm -f "$RP_PACK"
(cd "$RP_DIR" && zip -r -q "$RP_PACK" .)

echo "Packaging Combined Add-on..."
rm -f "$ADDON_PACK" "$VERSION_PACK"
TEMP_DIR=$(mktemp -d)
cp "$BP_PACK" "$TEMP_DIR/Apex_AK47_BP.mcpack"
cp "$RP_PACK" "$TEMP_DIR/Apex_AK47_RP.mcpack"
(cd "$TEMP_DIR" && zip -r -q "$ADDON_PACK" .)
cp "$ADDON_PACK" "$VERSION_PACK"
rm -rf "$TEMP_DIR"

echo "Build complete!"
