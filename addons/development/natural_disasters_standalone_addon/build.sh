#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
BP="$ROOT/standalone_disasters_bp"
RP="$ROOT/standalone_disasters_rp"
BP_OUT="$ROOT/Natural_Disasters_Standalone_BP.mcpack"
RP_OUT="$ROOT/Natural_Disasters_Standalone_RP.mcpack"
ADDON_OUT="$ROOT/Natural_Disasters_Standalone_Addon.mcaddon"
VERSIONED_OUT="$ROOT/Natural_Disasters_Standalone_Addon_v1.3.4.mcaddon"
rm -f "$BP_OUT" "$RP_OUT" "$ADDON_OUT" "$ROOT/Natural_Disasters_Standalone_Addon_v1.0.0.mcaddon" "$ROOT/Natural_Disasters_Standalone_Addon_v1.0.1.mcaddon" "$ROOT/Natural_Disasters_Standalone_Addon_v1.1.0.mcaddon" "$ROOT/Natural_Disasters_Standalone_Addon_v1.2.0.mcaddon" "$ROOT/Natural_Disasters_Standalone_Addon_v1.3.0.mcaddon" "$ROOT/Natural_Disasters_Standalone_Addon_v1.3.1.mcaddon" "$ROOT/Natural_Disasters_Standalone_Addon_v1.3.2.mcaddon" "$ROOT/Natural_Disasters_Standalone_Addon_v1.3.3.mcaddon" "$VERSIONED_OUT"
(cd "$BP" && zip -qr "$BP_OUT" .)
(cd "$RP" && zip -qr "$RP_OUT" .)
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cp "$BP_OUT" "$RP_OUT" "$TMP"/
(cd "$TMP" && zip -qr "$ADDON_OUT" .)
cp "$ADDON_OUT" "$VERSIONED_OUT"
echo "Built $ADDON_OUT"
