# -*- coding: utf-8 -*-
import zipfile, io, struct, nbtlib, sys

sys.stdout.reconfigure(encoding='utf-8')

with zipfile.ZipFile('明日之后.mcworld', 'r') as zf:
    raw = zf.read('level.dat')
    ver, length = struct.unpack('<II', raw[:8])
    nbt_bytes = raw[8:]
    nbt = nbtlib.File.parse(io.BytesIO(nbt_bytes), byteorder='little')
    print("Level.dat experiments:")
    if "experiments" in nbt:
        for k, v in nbt["experiments"].items():
            print(f"  {k}: {v}")
    else:
        print("  NO experiments key in level.dat!")
