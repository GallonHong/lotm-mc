#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
rm -f Apocalypse_Extraction_City_BP.mcpack Apocalypse_Extraction_City_RP.mcpack Apocalypse_Extraction_City_Addon.mcaddon
(cd extraction_bp && zip -qr ../Apocalypse_Extraction_City_BP.mcpack .)
(cd extraction_rp && zip -qr ../Apocalypse_Extraction_City_RP.mcpack .)
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cp Apocalypse_Extraction_City_BP.mcpack Apocalypse_Extraction_City_RP.mcpack "$TMP"/
(cd "$TMP" && zip -qr "$ROOT/Apocalypse_Extraction_City_Addon.mcaddon" .)
echo "Built Apocalypse_Extraction_City_Addon.mcaddon"
