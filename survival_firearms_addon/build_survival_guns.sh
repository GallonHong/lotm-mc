#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bp_dir="${script_dir}/survival_guns_bp"
rp_dir="${script_dir}/survival_guns_rp_mvp"
release_version="1.3.4"
versioned_addon="${script_dir}/Survival_Guns_MVP_v${release_version}.mcaddon"

obsolete_packages=(
  "${script_dir}/Survival_Guns_BP.mcpack"
  "${script_dir}/Survival_Guns_RP.mcpack"
  "${script_dir}/Survival_Guns_Addon.mcaddon"
  "${script_dir}/Survival_Guns_Addon_v1.2.1_FIXED.mcaddon"
  "${script_dir}/Survival_Guns_MVP_v1.3.0.mcaddon"
  "${script_dir}/Survival_Guns_MVP_v1.3.1.mcaddon"
  "${script_dir}/Survival_Guns_MVP_v1.3.2.mcaddon"
  "${script_dir}/Survival_Guns_MVP_v1.3.3.mcaddon"
  "${versioned_addon}"
)
for package_path in "${obsolete_packages[@]}"; do
  if [[ -f "${package_path}" ]]; then
    unlink "${package_path}"
  fi
done

(
  cd "${bp_dir}"
  zip -q -r "${script_dir}/Survival_Guns_BP.mcpack" .
)

(
  cd "${rp_dir}"
  zip -q -r "${script_dir}/Survival_Guns_RP.mcpack" .
)

(
  cd "${script_dir}"
  zip -q "${script_dir}/Survival_Guns_Addon.mcaddon" Survival_Guns_BP.mcpack Survival_Guns_RP.mcpack
  zip -q "${versioned_addon}" Survival_Guns_BP.mcpack Survival_Guns_RP.mcpack
)

printf "Successfully built Survival Guns Addon v%s packages!\n" "${release_version}"
