#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bp_dir="${script_dir}/survival_guns_bp"
rp_dir="${script_dir}/survival_guns_rp"
release_version="1.2.1"
versioned_addon="${script_dir}/Survival_Guns_Addon_v${release_version}_FIXED.mcaddon"

rm -f "${script_dir}/Survival_Guns_BP.mcpack" \
      "${script_dir}/Survival_Guns_RP.mcpack" \
      "${script_dir}/Survival_Guns_Addon.mcaddon" \
      "${versioned_addon}"

(
  cd "${bp_dir}"
  zip -q -r "${script_dir}/Survival_Guns_BP.mcpack" .
)

(
  cd "${rp_dir}"
  zip -q -r "${script_dir}/Survival_Guns_RP.mcpack" .
)

temp_dir="$(mktemp -d)"
cp "${script_dir}/Survival_Guns_BP.mcpack" "${temp_dir}/"
cp "${script_dir}/Survival_Guns_RP.mcpack" "${temp_dir}/"
(
  cd "${temp_dir}"
  zip -q "${script_dir}/Survival_Guns_Addon.mcaddon" Survival_Guns_BP.mcpack Survival_Guns_RP.mcpack
  zip -q "${versioned_addon}" Survival_Guns_BP.mcpack Survival_Guns_RP.mcpack
)
rm -rf "${temp_dir}"

printf "Successfully built Survival Guns Addon v%s packages!\n" "${release_version}"
