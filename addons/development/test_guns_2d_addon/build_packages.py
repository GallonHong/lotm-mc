import os
import zipfile

base_dir = os.path.dirname(os.path.abspath(__file__))
bp_dir = os.path.join(base_dir, 'test_guns_bp')
rp_dir = os.path.join(base_dir, 'test_guns_rp')

bp_mcpack = os.path.join(base_dir, 'Test_Guns_2D_BP.mcpack')
rp_mcpack = os.path.join(base_dir, 'Test_Guns_2D_RP.mcpack')
addon_mcaddon = os.path.join(base_dir, 'Test_Guns_2D_Addon.mcaddon')

def zip_folder(source_dir, output_path):
    if os.path.exists(output_path):
        os.remove(output_path)
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(source_dir):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, source_dir).replace('\\', '/')
                zf.write(full_path, arcname=rel_path)
    print(f"Created package: {os.path.basename(output_path)}")

# 1. Build BP and RP mcpacks
zip_folder(bp_dir, bp_mcpack)
zip_folder(rp_dir, rp_mcpack)

# 2. Build .mcaddon containing both .mcpack files
if os.path.exists(addon_mcaddon):
    os.remove(addon_mcaddon)

with zipfile.ZipFile(addon_mcaddon, 'w', zipfile.ZIP_DEFLATED) as zf:
    zf.write(bp_mcpack, arcname='Test_Guns_2D_BP.mcpack')
    zf.write(rp_mcpack, arcname='Test_Guns_2D_RP.mcpack')

print(f"Created Addon: {addon_mcaddon}")

# Verify archive entries
for pack_file in [bp_mcpack, rp_mcpack, addon_mcaddon]:
    print(f"\nVerifying {os.path.basename(pack_file)}:")
    with zipfile.ZipFile(pack_file, 'r') as zf:
        for info in zf.infolist()[:10]:
            print(f"  - {info.filename}")
