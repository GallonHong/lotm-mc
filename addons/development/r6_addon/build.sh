#!/usr/bin/env bash
# R6 Siege Bedrock Addon - build script (bash)
set -euo pipefail
cd "$(dirname "$0")"

python3 tools/gen_data.py
python3 tools/gen_icons.py
python3 tools/import_assets.py
node tests/validate_r6.mjs
node tests/run_smoke.mjs
python3 tools/build.py
