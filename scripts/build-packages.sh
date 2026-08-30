#!/usr/bin/env bash
set -Eeuo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
build_root="$(mktemp -d)"
server_bp="${build_root}/server_bp"
server_addon="${build_root}/server_addon"
lotm_bp="${build_root}/lotm_bp"
lotm_rp="${build_root}/lotm_rp"
lotm_addon="${build_root}/lotm_addon"

cleanup() {
  rm -rf "${build_root}"
}
trap cleanup EXIT

mkdir -p \
  "${server_bp}/scripts/modules" \
  "${server_addon}" \
  "${lotm_bp}/scripts/modules" \
  "${lotm_rp}" \
  "${lotm_addon}"

# SAPI Server Economy: server systems plus an optional LOTM integration catalog.
cp "${repo_root}/server_manifest.json" "${server_bp}/manifest.json"
cp "${repo_root}/pack_icon.png" "${server_bp}/pack_icon.png"
cp "${repo_root}/scripts/server_main.js" "${server_bp}/scripts/main.js"
cp "${repo_root}/scripts/config.js" "${server_bp}/scripts/config.js"
cp "${repo_root}/scripts/utils.js" "${server_bp}/scripts/utils.js"
for module in economy shop land lottery server_menu integration; do
  cp "${repo_root}/scripts/modules/${module}.js" "${server_bp}/scripts/modules/${module}.js"
done

# LOTM Pathways: keep the original BP/RP UUIDs so existing worlds upgrade in place.
cp "${repo_root}/manifest.json" "${lotm_bp}/manifest.json"
cp "${repo_root}/pack_icon.png" "${lotm_bp}/pack_icon.png"
cp -R "${repo_root}/items" "${lotm_bp}/items"
cp "${repo_root}/scripts/lotm_main.js" "${lotm_bp}/scripts/main.js"
cp "${repo_root}/scripts/lotm_config.js" "${lotm_bp}/scripts/config.js"
cp "${repo_root}/scripts/utils.js" "${lotm_bp}/scripts/utils.js"
cp "${repo_root}/scripts/modules/integration.js" "${lotm_bp}/scripts/modules/integration.js"
cp "${repo_root}"/scripts/modules/lotm*.js "${lotm_bp}/scripts/modules/"
cp "${repo_root}"/scripts/modules/pathway*.js "${lotm_bp}/scripts/modules/"

cp "${repo_root}/resource_manifest.json" "${lotm_rp}/manifest.json"
cp "${repo_root}/pack_icon.png" "${lotm_rp}/pack_icon.png"
cp -R "${repo_root}/texts" "${lotm_rp}/texts"
cp -R "${repo_root}/textures" "${lotm_rp}/textures"

# The split packages replace the old monolithic artifacts.
rm -f \
  "${repo_root}/SAPI_System_BP.mcpack" \
  "${repo_root}/SAPI_System_RP.mcpack" \
  "${repo_root}/SAPI_System_Addon.mcpack" \
  "${repo_root}/SAPI_System_Addon.mcaddon" \
  "${repo_root}/SAPI_Server_BP.mcpack" \
  "${repo_root}/SAPI_Server_Addon.mcaddon" \
  "${repo_root}/LOTM_Pathways_BP.mcpack" \
  "${repo_root}/LOTM_Pathways_RP.mcpack" \
  "${repo_root}/LOTM_Pathways_Addon.mcaddon"

(
  cd "${server_bp}"
  zip -q -r "${repo_root}/SAPI_Server_BP.mcpack" .
)
cp "${repo_root}/SAPI_Server_BP.mcpack" "${server_addon}/SAPI_Server_BP.mcpack"
(
  cd "${server_addon}"
  zip -q "${repo_root}/SAPI_Server_Addon.mcaddon" SAPI_Server_BP.mcpack
)

(
  cd "${lotm_bp}"
  zip -q -r "${repo_root}/LOTM_Pathways_BP.mcpack" .
)
(
  cd "${lotm_rp}"
  zip -q -r "${repo_root}/LOTM_Pathways_RP.mcpack" .
)
cp "${repo_root}/LOTM_Pathways_BP.mcpack" "${lotm_addon}/LOTM_Pathways_BP.mcpack"
cp "${repo_root}/LOTM_Pathways_RP.mcpack" "${lotm_addon}/LOTM_Pathways_RP.mcpack"
(
  cd "${lotm_addon}"
  zip -q "${repo_root}/LOTM_Pathways_Addon.mcaddon" LOTM_Pathways_BP.mcpack LOTM_Pathways_RP.mcpack
)

for archive in \
  "${repo_root}/SAPI_Server_BP.mcpack" \
  "${repo_root}/SAPI_Server_Addon.mcaddon" \
  "${repo_root}/LOTM_Pathways_BP.mcpack" \
  "${repo_root}/LOTM_Pathways_RP.mcpack" \
  "${repo_root}/LOTM_Pathways_Addon.mcaddon"; do
  unzip -tq "${archive}" >/dev/null
done

printf 'Built and verified split SAPI Server and LOTM Pathways packages.\n'
