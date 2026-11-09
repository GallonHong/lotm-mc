# -*- coding: utf-8 -*-
import zipfile, json, sys

sys.stdout.reconfigure(encoding='utf-8')

with zipfile.ZipFile('明日之后.mcworld', 'r') as zf:
    print("Files in root of zip:")
    root_files = [n for n in zf.namelist() if '/' not in n or n.count('/') == 1]
    for rf in root_files[:30]:
        print(" ", rf)

    # Check world_behavior_packs.json
    for name in ['world_behavior_packs.json', 'MRZH SURVIVE/world_behavior_packs.json']:
        if name in zf.namelist():
            print(f"\n--- {name} ---")
            data = json.loads(zf.read(name).decode('utf-8'))
            print(json.dumps(data, indent=2, ensure_ascii=False))

    # Check manifests of packs in zip
    print("\n--- Manifests found in zip ---")
    manifests = [n for n in zf.namelist() if n.endswith('manifest.json')]
    for m in manifests:
        try:
            m_data = json.loads(zf.read(m).decode('utf-8'))
            header = m_data.get('header', {})
            print(f"{m} -> name: {header.get('name')}, uuid: {header.get('uuid')}, ver: {header.get('version')}")
        except Exception as e:
            print(f"Error reading {m}: {e}")
