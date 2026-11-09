import os
import zlib
import io
import nbtlib

def process_mca_file(mca_path):
    with open(mca_path, 'rb') as f:
        mca_bytes = f.read()
    if len(mca_bytes) < 8192:
        return 0, 0

    locations = bytearray(mca_bytes[:4096])
    timestamps = bytearray(mca_bytes[4096:8192])

    chunks = {}
    removed_be_count = 0
    removed_palette_count = 0
    modified = False

    target_ids = {'minecraft:lectern', 'minecraft:chest', 'minecraft:trapped_chest'}

    for i in range(1024):
        loc = (locations[4*i] << 16) | (locations[4*i + 1] << 8) | locations[4*i + 2]
        sector_count = locations[4*i + 3]
        if loc == 0:
            continue
        byte_offset = loc * 4096
        if byte_offset >= len(mca_bytes):
            continue
        chunk_len = int.from_bytes(mca_bytes[byte_offset:byte_offset+4], 'big')
        comp_type = mca_bytes[byte_offset+4]
        compressed_data = mca_bytes[byte_offset+5:byte_offset+4+chunk_len]

        try:
            raw_nbt = zlib.decompress(compressed_data)
            nbt_file = nbtlib.File.parse(io.BytesIO(raw_nbt), byteorder='big')
            chunk_modified = False

            # 1. Block entities
            if 'block_entities' in nbt_file:
                orig_len = len(nbt_file['block_entities'])
                filtered_be = [
                    be for be in nbt_file['block_entities']
                    if str(be.get('id', '')) not in target_ids
                ]
                if len(filtered_be) != orig_len:
                    removed_be_count += (orig_len - len(filtered_be))
                    nbt_file['block_entities'] = nbtlib.List[nbtlib.Compound](filtered_be)
                    chunk_modified = True

            # 2. Block palette in sections
            for sec in nbt_file.get('sections', []):
                bs = sec.get('block_states', {})
                palette = bs.get('palette', [])
                for item in palette:
                    pname = str(item.get('Name', ''))
                    if pname in target_ids:
                        item['Name'] = nbtlib.String('minecraft:air')
                        if 'Properties' in item:
                            del item['Properties']
                        removed_palette_count += 1
                        chunk_modified = True

            if chunk_modified:
                modified = True
                out = io.BytesIO()
                nbt_file.write(out, byteorder='big')
                new_raw = out.getvalue()
                new_compressed = zlib.compress(new_raw)
                chunk_header = (len(new_compressed) + 1).to_bytes(4, 'big') + b'\x02'
                chunks[i] = chunk_header + new_compressed
            else:
                chunks[i] = mca_bytes[byte_offset:byte_offset+4+chunk_len]
        except Exception as e:
            chunks[i] = mca_bytes[byte_offset:byte_offset+4+chunk_len]

    if not modified:
        return 0, 0

    new_mca = bytearray(8192)
    new_mca[4096:8192] = timestamps
    current_sector = 2

    for i in range(1024):
        if i in chunks:
            chunk_data = chunks[i]
            sector_offset = current_sector
            sectors_needed = (len(chunk_data) + 4095) // 4096
            padding_needed = sectors_needed * 4096 - len(chunk_data)

            new_mca[4*i] = (sector_offset >> 16) & 0xFF
            new_mca[4*i + 1] = (sector_offset >> 8) & 0xFF
            new_mca[4*i + 2] = sector_offset & 0xFF
            new_mca[4*i + 3] = sectors_needed & 0xFF

            new_mca.extend(chunk_data)
            new_mca.extend(b'\x00' * padding_needed)
            current_sector += sectors_needed

    with open(mca_path, 'wb') as f:
        f.write(new_mca)

    return removed_be_count, removed_palette_count

def main():
    region_dir = 'temp_java_world/liufenjie_java/region'
    total_be = 0
    total_pal = 0
    modified_files = 0
    
    for fname in sorted(os.listdir(region_dir)):
        if fname.endswith('.mca'):
            fpath = os.path.join(region_dir, fname)
            be_c, pal_c = process_mca_file(fpath)
            if be_c > 0 or pal_c > 0:
                print(f"[{fname}] Removed {be_c} block entities, {pal_c} palette entries")
                total_be += be_c
                total_pal += pal_c
                modified_files += 1

    print(f"\n[SUMMARY] Total Block Entities removed: {total_be}")
    print(f"[SUMMARY] Total Palette entries replaced: {total_pal}")
    print(f"[SUMMARY] Total MCA files modified: {modified_files}")

if __name__ == '__main__':
    main()
