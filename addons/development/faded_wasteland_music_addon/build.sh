#!/usr/bin/env bash
# Build the Faded Wasteland Music resource pack (.mcpack).
set -euo pipefail
addon_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
python_bin="${PYTHON:-python}"
version="1.0.1"
output="$addon_dir/Faded_Wasteland_Music_v${version}.mcpack"
"$python_bin" "$addon_dir/../../../tools/build_mcpack.py" "$addon_dir/faded_wasteland_music_rp" "$output"
