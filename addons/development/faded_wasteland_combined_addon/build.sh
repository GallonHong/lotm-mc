#!/usr/bin/env bash
# Build the combined visuals + music resource pack (.mcpack).
set -euo pipefail
addon_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_dir="$(cd "$addon_dir/../../.." && pwd)"
python_bin="${PYTHON:-python}"
version="0.4.3"
"$python_bin" "$repo_dir/tools/merge_visual_music.py"
"$python_bin" "$repo_dir/tools/build_mcpack.py" "$addon_dir/faded_wasteland_combined_rp" "$addon_dir/Faded_Wasteland_Visuals_Music_v${version}.mcpack"
