#!/usr/bin/env bash
set -Eeuo pipefail

addon_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
development_root="$(cd "${addon_root}/.." && pwd)"
build_root="$(mktemp -d)"
lotm_bp="${build_root}/lotm_bp"
lotm_rp="${build_root}/lotm_rp"
lotm_addon="${build_root}/lotm_addon"

cleanup() {
  rm -rf "${build_root}"
}
trap cleanup EXIT

mkdir -p \
  "${lotm_bp}/scripts/modules" \
  "${lotm_rp}" \
  "${lotm_addon}"

# SAPI Server has its own complete source tree and build entry.
bash "${development_root}/sapi_server_addon/build.sh"

# LOTM Pathways: keep the original BP/RP UUIDs so existing worlds upgrade in place.
cp "${addon_root}/manifest.json" "${lotm_bp}/manifest.json"
cp "${addon_root}/pack_icon.png" "${lotm_bp}/pack_icon.png"
cp -R "${addon_root}/items" "${lotm_bp}/items"
cp "${addon_root}/scripts/lotm_main.js" "${lotm_bp}/scripts/main.js"
cp "${addon_root}/scripts/lotm_config.js" "${lotm_bp}/scripts/config.js"
cp "${addon_root}/scripts/utils.js" "${lotm_bp}/scripts/utils.js"
cp "${addon_root}/scripts/modules/integration.js" "${lotm_bp}/scripts/modules/integration.js"
cp "${addon_root}"/scripts/modules/lotm*.js "${lotm_bp}/scripts/modules/"
cp "${addon_root}"/scripts/modules/pathway*.js "${lotm_bp}/scripts/modules/"

cp "${addon_root}/resource_manifest.json" "${lotm_rp}/manifest.json"
cp "${addon_root}/pack_icon.png" "${lotm_rp}/pack_icon.png"
cp -R "${addon_root}/texts" "${lotm_rp}/texts"
cp -R "${addon_root}/textures" "${lotm_rp}/textures"

# The split packages replace the old monolithic artifacts.
rm -f \
  "${addon_root}/SAPI_System_BP.mcpack" \
  "${addon_root}/SAPI_System_RP.mcpack" \
  "${addon_root}/SAPI_System_Addon.mcpack" \
  "${addon_root}/SAPI_System_Addon.mcaddon" \
  "${addon_root}/LOTM_Pathways_BP.mcpack" \
  "${addon_root}/LOTM_Pathways_RP.mcpack" \
  "${addon_root}/LOTM_Pathways_Addon.mcaddon"

(
  cd "${lotm_bp}"
  zip -q -r "${addon_root}/LOTM_Pathways_BP.mcpack" .
)
(
  cd "${lotm_rp}"
  zip -q -r "${addon_root}/LOTM_Pathways_RP.mcpack" .
)
cp "${addon_root}/LOTM_Pathways_BP.mcpack" "${lotm_addon}/LOTM_Pathways_BP.mcpack"
cp "${addon_root}/LOTM_Pathways_RP.mcpack" "${lotm_addon}/LOTM_Pathways_RP.mcpack"
(
  cd "${lotm_addon}"
  zip -q "${addon_root}/LOTM_Pathways_Addon.mcaddon" LOTM_Pathways_BP.mcpack LOTM_Pathways_RP.mcpack
)

for archive in \
  "${addon_root}/LOTM_Pathways_BP.mcpack" \
  "${addon_root}/LOTM_Pathways_RP.mcpack" \
  "${addon_root}/LOTM_Pathways_Addon.mcaddon"; do
  unzip -tq "${archive}" >/dev/null
done

printf 'Built and verified SAPI Server (standalone folder) and LOTM Pathways packages.\n'
