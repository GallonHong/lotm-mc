import os
import subprocess

FFMPEG_PATH = r"C:\Users\10973\AppData\Roaming\bilibili\ffmpeg\ffmpeg.exe"
TARGET_DIR = r"c:\Users\10973\Desktop\mcaddon\addons\development\apocalypse_life_addon\apocalypse_life_rp\sounds\asiagobagels\vehicles"

def compress_audio():
    if not os.path.exists(FFMPEG_PATH):
        print(f"Error: FFmpeg not found at {FFMPEG_PATH}")
        return

    if not os.path.exists(TARGET_DIR):
        print(f"Error: Target directory not found at {TARGET_DIR}")
        return

    wav_files = [f for f in os.listdir(TARGET_DIR) if f.lower().endswith(".wav")]
    print(f"[*] Found {len(wav_files)} .wav files to compress in {TARGET_DIR}...\n")

    total_orig_size = 0
    total_new_size = 0
    converted_count = 0

    for wav_name in wav_files:
        wav_path = os.path.join(TARGET_DIR, wav_name)
        ogg_name = os.path.splitext(wav_name)[0] + ".ogg"
        ogg_path = os.path.join(TARGET_DIR, ogg_name)

        orig_size = os.path.getsize(wav_path)
        total_orig_size += orig_size

        cmd = [
            FFMPEG_PATH,
            "-i", wav_path,
            "-c:a", "libvorbis",
            "-qscale:a", "4",
            "-y",
            ogg_path
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if res.returncode != 0:
            print(f"[FAIL] {wav_name} conversion failed: {res.stderr.decode('utf-8', errors='ignore')}")
            continue

        if not os.path.exists(ogg_path) or os.path.getsize(ogg_path) == 0:
            print(f"[FAIL] {ogg_name} was not created or empty!")
            continue

        new_size = os.path.getsize(ogg_path)
        total_new_size += new_size
        converted_count += 1

        os.remove(wav_path)

        orig_kb = orig_size / 1024
        new_kb = new_size / 1024
        ratio = (1 - new_size / orig_size) * 100
        print(f"[OK] {wav_name} ({orig_kb:.1f} KB) -> {ogg_name} ({new_kb:.1f} KB) [-{ratio:.1f}%]")

    orig_mb = total_orig_size / (1024 * 1024)
    new_mb = total_new_size / (1024 * 1024)
    saved_mb = orig_mb - new_mb
    overall_ratio = (1 - new_mb / orig_mb) * 100 if orig_mb > 0 else 0

    print(f"\n========================================================")
    print(f"[SUCCESS] Converted {converted_count}/{len(wav_files)} files!")
    print(f"Original Size : {orig_mb:.2f} MB")
    print(f"Compressed Size: {new_mb:.2f} MB")
    print(f"Space Saved   : {saved_mb:.2f} MB ({overall_ratio:.1f}% reduction)")
    print(f"========================================================")

if __name__ == "__main__":
    compress_audio()
