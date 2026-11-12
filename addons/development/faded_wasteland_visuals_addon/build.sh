#!/usr/bin/env bash
# Build the Faded Wasteland Visuals resource pack (.mcpack).
set -euo pipefail
addon_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
python_bin="${PYTHON:-python}"
version="0.3.11"
output="$addon_dir/Faded_Wasteland_Visuals_v${version}.mcpack"
"$python_bin" "$addon_dir/../../../tools/build_mcpack.py" "$addon_dir/faded_wasteland_visuals_rp" "$output"
