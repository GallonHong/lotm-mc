import os
import zipfile

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MCPACK_PATH = os.path.join(SCRIPT_DIR, "Apocalypse_Test_Guns_Pose_Compatibility.mcpack")

def build_mcpack():
    with zipfile.ZipFile(MCPACK_PATH, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, _, files in os.walk(SCRIPT_DIR):
            for file in files:
                if file.endswith((".mcpack", ".mcaddon", ".py")):
                    continue
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, SCRIPT_DIR).replace(os.sep, "/")
                zf.write(full_path, rel_path)
    print(f"Created package: {MCPACK_PATH}")

if __name__ == "__main__":
    build_mcpack()
