#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACK_DIR="${ROOT_DIR}/apocalypse_ui_rp"
DIST_DIR="${ROOT_DIR}/dist"
OUTPUT="${DIST_DIR}/Apocalypse_UI.mcpack"

mkdir -p "${DIST_DIR}"
(
  cd "${PACK_DIR}"
  zip -qr "${OUTPUT}" . -x '*.DS_Store'
)
echo "Built ${OUTPUT}"
