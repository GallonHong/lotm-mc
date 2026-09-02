#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
BP="$ROOT/Natural Disasters Survival Challenge  BP"
RP="$ROOT/Natural Disasters Survival Challenge  RP"
BP_OUT="$ROOT/Natural_Disasters_Server_Events_BP.mcpack"
RP_OUT="$ROOT/Natural_Disasters_Server_Events_RP.mcpack"
ADDON_OUT="$ROOT/Natural_Disasters_Server_Events_Addon.mcaddon"

rm -f "$BP_OUT" "$RP_OUT" "$ADDON_OUT"
(cd "$BP" && zip -qr "$BP_OUT" .)
(cd "$RP" && zip -qr "$RP_OUT" .)
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cp "$BP_OUT" "$RP_OUT" "$TMP"/
(cd "$TMP" && zip -qr "$ADDON_OUT" .)
echo "Built $ADDON_OUT"
