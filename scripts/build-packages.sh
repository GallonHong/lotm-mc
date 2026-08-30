#!/usr/bin/env bash
set -Eeuo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
build_root="$(mktemp -d)"
bp_dir="${build_root}/bp"
rp_dir="${build_root}/rp"
addon_dir="${build_root}/addon"

cleanup() {
  rm -rf "${build_root}"
}
trap cleanup EXIT

mkdir -p "${bp_dir}" "${rp_dir}" "${addon_dir}"

cp "${repo_root}/manifest.json" "${bp_dir}/manifest.json"
cp "${repo_root}/pack_icon.png" "${bp_dir}/pack_icon.png"
cp -R "${repo_root}/items" "${bp_dir}/items"
cp -R "${repo_root}/scripts" "${bp_dir}/scripts"
rm "${bp_dir}/scripts/build-packages.sh"

cp "${repo_root}/resource_manifest.json" "${rp_dir}/manifest.json"
cp "${repo_root}/pack_icon.png" "${rp_dir}/pack_icon.png"
cp -R "${repo_root}/texts" "${rp_dir}/texts"
cp -R "${repo_root}/textures" "${rp_dir}/textures"

rm -f \
  "${repo_root}/SAPI_System_BP.mcpack" \
  "${repo_root}/SAPI_System_RP.mcpack" \
  "${repo_root}/SAPI_System_Addon.mcpack" \
  "${repo_root}/SAPI_System_Addon.mcaddon"

(
  cd "${bp_dir}"
  zip -q -r "${repo_root}/SAPI_System_BP.mcpack" .
)

(
  cd "${rp_dir}"
  zip -q -r "${repo_root}/SAPI_System_RP.mcpack" .
)

cp "${repo_root}/SAPI_System_BP.mcpack" "${repo_root}/SAPI_System_Addon.mcpack"
cp "${repo_root}/SAPI_System_BP.mcpack" "${addon_dir}/SAPI_System_BP.mcpack"
cp "${repo_root}/SAPI_System_RP.mcpack" "${addon_dir}/SAPI_System_RP.mcpack"

(
  cd "${addon_dir}"
  zip -q "${repo_root}/SAPI_System_Addon.mcaddon" \
    SAPI_System_BP.mcpack \
    SAPI_System_RP.mcpack
)

for archive in \
  "${repo_root}/SAPI_System_BP.mcpack" \
  "${repo_root}/SAPI_System_RP.mcpack" \
  "${repo_root}/SAPI_System_Addon.mcpack" \
  "${repo_root}/SAPI_System_Addon.mcaddon"; do
  unzip -tq "${archive}" >/dev/null
done

printf 'Built and verified Minecraft packages.\n'
