#!/usr/bin/env bash
# Build LOTM Pathways packages (BP/RP mcpacks + combined mcaddon).
set -euo pipefail
addon_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_dir="$(cd "$addon_dir/../../.." && pwd)"
python_bin="${PYTHON:-python}"
version="1.4.1"
"$python_bin" "$repo_dir/tools/build_mcpack.py" "$addon_dir/lotm_pathways_bp" "$addon_dir/LOTM_Pathways_BP.mcpack"
"$python_bin" "$repo_dir/tools/build_mcpack.py" "$addon_dir/lotm_pathways_rp" "$addon_dir/LOTM_Pathways_RP.mcpack"
"$python_bin" "$repo_dir/tools/build_mcaddon.py" "$addon_dir/LOTM_Pathways_Addon.mcaddon" "$addon_dir/lotm_pathways_bp" "$addon_dir/lotm_pathways_rp"
echo "[done] LOTM Pathways v$version packages built"
