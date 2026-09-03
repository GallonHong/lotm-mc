#!/usr/bin/env bash
set -euo pipefail

addon_dir="$(cd "$(dirname "$0")" && pwd)"
bp_dir="${addon_dir}/sapi_server_bp"
bp_pack="${addon_dir}/SAPI_Server_BP.mcpack"
addon="${addon_dir}/SAPI_Server_Addon.mcaddon"
versioned_addon="${addon_dir}/SAPI_Server_Addon_v2.7.4.mcaddon"
bundle_dir="$(mktemp -d)"
trap 'rm -rf "${bundle_dir}"' EXIT

rm -f "${bp_pack}" "${addon}" "${addon_dir}/SAPI_Server_Addon_v2.6.4.mcaddon" "${addon_dir}/SAPI_Server_Addon_v2.6.5.mcaddon" "${addon_dir}/SAPI_Server_Addon_v2.7.0.mcaddon" "${addon_dir}/SAPI_Server_Addon_v2.7.1.mcaddon" "${addon_dir}/SAPI_Server_Addon_v2.7.2.mcaddon" "${versioned_addon}"
(cd "${bp_dir}" && zip -qr "${bp_pack}" .)
cp "${bp_pack}" "${bundle_dir}/SAPI_Server_BP.mcpack"
(cd "${bundle_dir}" && zip -q "${addon}" SAPI_Server_BP.mcpack)
cp "${addon}" "${versioned_addon}"

unzip -tq "${bp_pack}" >/dev/null
unzip -tq "${addon}" >/dev/null
printf 'Built %s\n' "${addon}"
