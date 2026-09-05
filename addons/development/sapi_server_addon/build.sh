#!/usr/bin/env bash
set -euo pipefail

addon_dir="$(cd "$(dirname "$0")" && pwd)"
bp_dir="${addon_dir}/sapi_server_bp"
rp_dir="${addon_dir}/sapi_server_rp"
bp_pack="${addon_dir}/SAPI_Server_BP.mcpack"
rp_pack="${addon_dir}/SAPI_Server_RP.mcpack"
addon="${addon_dir}/SAPI_Server_Addon.mcaddon"
versioned_addon="${addon_dir}/SAPI_Server_Addon_v2.12.1.mcaddon"
bundle_dir="$(mktemp -d)"
trap 'rm -rf "${bundle_dir}"' EXIT

rm -f "${bp_pack}" "${rp_pack}" "${addon}" "${versioned_addon}"
(cd "${bp_dir}" && zip -qr "${bp_pack}" .)
(cd "${rp_dir}" && zip -qr "${rp_pack}" .)
cp "${bp_pack}" "${bundle_dir}/SAPI_Server_BP.mcpack"
cp "${rp_pack}" "${bundle_dir}/SAPI_Server_RP.mcpack"
(cd "${bundle_dir}" && zip -q "${addon}" SAPI_Server_BP.mcpack SAPI_Server_RP.mcpack)
cp "${addon}" "${versioned_addon}"

unzip -tq "${bp_pack}" >/dev/null
unzip -tq "${rp_pack}" >/dev/null
unzip -tq "${addon}" >/dev/null
printf 'Built %s\n' "${addon}"
