"""Build the combined Faded Wasteland (visuals + music) resource pack 0.4.12.

Merges:
  addons/development/faded_wasteland_visuals_addon/faded_wasteland_visuals_rp  (0.3.6)
  addons/development/faded_wasteland_music_addon/faded_wasteland_music_rp      (1.0.0)
into addons/development/faded_wasteland_combined_addon/faded_wasteland_combined_rp
"""
import json
import os
import shutil

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIS = os.path.join(REPO, "addons", "development", "faded_wasteland_visuals_addon", "faded_wasteland_visuals_rp")
MUS = os.path.join(REPO, "addons", "development", "faded_wasteland_music_addon", "faded_wasteland_music_rp")
OUT = os.path.join(REPO, "addons", "development", "faded_wasteland_combined_addon", "faded_wasteland_combined_rp")

if os.path.isdir(OUT):
    shutil.rmtree(OUT)
shutil.copytree(VIS, OUT)
shutil.copytree(os.path.join(MUS, "sounds"), os.path.join(OUT, "sounds"), dirs_exist_ok=True)

manifest_path = os.path.join(OUT, "manifest.json")
with open(manifest_path, "r", encoding="utf-8-sig") as handle:
    manifest = json.load(handle)
manifest["header"]["name"] = "余晖 · 废土光影 + 音乐 0.4.12"
manifest["header"]["description"] = (
    "Faded Wasteland Visuals + Music | 原版贴图不变 · 需要灵动视效 | "
    "光影：固定更暗·阴郁废土档、正午再压暗、雨天粒子（Dark Fantasy 雨滴/涟漪/雨雾）；"
    "音乐：主世界/下界/末地/创造/龙战/主菜单全部替换为 4 首营地/野外/居住区 BGM | 合并资源包，无需再装单独音乐包"
)
manifest["header"]["version"] = [0, 4, 12]
for module in manifest.get("modules", []):
    module["version"] = [0, 4, 12]
with open(manifest_path, "w", encoding="utf-8", newline="\n") as handle:
    json.dump(manifest, handle, ensure_ascii=False, indent=2)
    handle.write("\n")

icon_src = os.path.join(os.path.dirname(OUT), "pack_icon.png")
if os.path.isfile(icon_src):
    shutil.copy2(icon_src, os.path.join(OUT, "pack_icon.png"))
    print("[ok] pack icon: Faded Wasteland apocalypse artwork")

ogg_files = [name for _, _, files in os.walk(os.path.join(OUT, "sounds")) for name in files if name.endswith(".ogg")]
print(f"[ok] combined RP: {OUT}")
print(f"[ok] manifest 0.4.12, ogg tracks: {len(ogg_files)}")
