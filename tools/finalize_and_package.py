# -*- coding: utf-8 -*-
import os
import io
import shutil
import zipfile
import nbtlib
from PIL import Image

def finalize_world():
    bedrock_dir = os.path.abspath('temp_java_world/liufenjie_bedrock')
    level_dat_path = os.path.join(bedrock_dir, 'level.dat')
    
    # 1. Patch level.dat
    with open(level_dat_path, 'rb') as f:
        data = f.read()
    
    header = data[:8]
    nbt_data = data[8:]
    n = nbtlib.File.parse(io.BytesIO(nbt_data), byteorder='little')
    
    world_name = "六分街 - 1.21.1兼容"
    n['LevelName'] = nbtlib.String(world_name)
    n['SpawnX'] = nbtlib.Int(198)
    n['SpawnY'] = nbtlib.Int(41)
    n['SpawnZ'] = nbtlib.Int(169)
    n['GameType'] = nbtlib.Int(1)
    n['commandsEnabled'] = nbtlib.Byte(1)
    n['cheatsEnabled'] = nbtlib.Byte(1)
    n['showcoordinates'] = nbtlib.Byte(1)
    
    out_buf = io.BytesIO()
    n.write(out_buf, byteorder='little')
    new_nbt_bytes = out_buf.getvalue()
    
    new_header = int(10).to_bytes(4, 'little') + len(new_nbt_bytes).to_bytes(4, 'little')
    new_level_dat = new_header + new_nbt_bytes
    
    with open(level_dat_path, 'wb') as f:
        f.write(new_level_dat)
    print("Patched level.dat successfully.")
    
    # 2. Copy level.dat to level.dat_old
    level_dat_old = os.path.join(bedrock_dir, 'level.dat_old')
    shutil.copyfile(level_dat_path, level_dat_old)
    print("Created level.dat_old.")
    
    # 3. Create levelname.txt
    levelname_txt = os.path.join(bedrock_dir, 'levelname.txt')
    with open(levelname_txt, 'w', encoding='utf-8') as f:
        f.write(world_name)
    print("Created levelname.txt.")
    
    # 4. Convert icon.png to world_icon.jpeg
    java_icon_path = os.path.abspath('temp_java_world/liufenjie_java/icon.png')
    world_icon_path = os.path.join(bedrock_dir, 'world_icon.jpeg')
    if os.path.exists(java_icon_path):
        img = Image.open(java_icon_path).convert('RGB')
        img.save(world_icon_path, 'JPEG', quality=95)
        print("Generated world_icon.jpeg.")
    
    # 5. Package into .mcworld
    output_filename = "六分街 - 1.21.1兼容.mcworld"
    local_output_path = os.path.abspath(output_filename)
    desktop_output_path = os.path.join(os.path.expanduser('~'), 'Desktop', output_filename)
    downloads_output_path = os.path.join(os.path.expanduser('~'), 'Downloads', output_filename)
    
    print(f"Creating zip archive {local_output_path}...")
    with zipfile.ZipFile(local_output_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(bedrock_dir):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, bedrock_dir)
                zf.write(full_path, rel_path)
    
    print(f"Local package size: {os.path.getsize(local_output_path):,} bytes")
    
    # Copy to Desktop
    try:
        shutil.copyfile(local_output_path, desktop_output_path)
        print(f"Copied to Desktop: {desktop_output_path}")
    except Exception as e:
        print(f"Error copying to Desktop: {e}")
        
    # Copy to Downloads
    try:
        shutil.copyfile(local_output_path, downloads_output_path)
        print(f"Copied to Downloads: {downloads_output_path}")
    except Exception as e:
        print(f"Error copying to Downloads: {e}")

if __name__ == '__main__':
    finalize_world()
