with open('tools/repack_world.py', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''            # 3. Embed all active Behavior Packs
            print("[*] Embedding Behavior Packs...")
            for bp_name, bp_path in BEHAVIOR_PACKS:
                for root, dirs, files in os.walk(bp_path):
                    # Skip git and cache dirs
                    if any(x in root for x in [".git", "node_modules", ".gemini", "__pycache__"]):
                        continue
                    for file in files:
                        full_p = os.path.join(root, file)
                        rel_p = os.path.relpath(full_p, bp_path)
                        zip_entry = f"behavior_packs/{bp_name}/{rel_p.replace(os.sep, '/')}"
                        dst_zip.write(full_p, zip_entry)

            # 4. Embed all active Resource Packs
            print("[*] Embedding Resource Packs...")
            for rp_name, rp_path in RESOURCE_PACKS:
                if not os.path.exists(rp_path):
                    continue
                for root, dirs, files in os.walk(rp_path):
                    if any(x in root for x in [".git", "node_modules", ".gemini", "__pycache__"]):
                        continue
                    for file in files:
                        full_p = os.path.join(root, file)
                        rel_p = os.path.relpath(full_p, rp_path)
                        zip_entry = f"resource_packs/{rp_name}/{rel_p.replace(os.sep, '/')}"
                        dst_zip.write(full_p, zip_entry)'''

replacement = '''            # 3. Embed all active Behavior Packs
            print("[*] Embedding Behavior Packs...")
            for bp_name, bp_path in BEHAVIOR_PACKS:
                for root, dirs, files in os.walk(bp_path):
                    if any(x in root for x in [".git", "node_modules", ".gemini", "__pycache__"]):
                        continue
                    for file in files:
                        if file.endswith((".mcpack", ".mcaddon", ".py")):
                            continue
                        full_p = os.path.join(root, file)
                        rel_p = os.path.relpath(full_p, bp_path)
                        zip_entry = f"behavior_packs/{bp_name}/{rel_p.replace(os.sep, '/')}"
                        dst_zip.write(full_p, zip_entry)

            # 4. Embed all active Resource Packs
            print("[*] Embedding Resource Packs...")
            for rp_name, rp_path in RESOURCE_PACKS:
                if not os.path.exists(rp_path):
                    continue
                for root, dirs, files in os.walk(rp_path):
                    if any(x in root for x in [".git", "node_modules", ".gemini", "__pycache__"]):
                        continue
                    for file in files:
                        if file.endswith((".mcpack", ".mcaddon", ".py")):
                            continue
                        full_p = os.path.join(root, file)
                        rel_p = os.path.relpath(full_p, rp_path)
                        zip_entry = f"resource_packs/{rp_name}/{rel_p.replace(os.sep, '/')}"
                        dst_zip.write(full_p, zip_entry)'''

if target in content:
    content = content.replace(target, replacement)
    with open('tools/repack_world.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated repack_world.py successfully!")
else:
    print("Target not found!")
