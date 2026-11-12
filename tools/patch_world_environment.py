#!/usr/bin/env python3
"""Enable day/night cycle and weather cycle in a Bedrock .mcworld level.dat.

Bedrock stores the gamerule toggles ``dodaylightcycle`` and ``doweathercycle`` as
top-level byte tags inside level.dat (0 = frozen/off, 1 = on). Some downloaded maps
freeze them; this tool flips them on while leaving every other NBT field untouched
(only the existing 1-byte payload is rewritten, so the file layout stays identical).

Usage:
  python tools/patch_world_environment.py <world.mcworld> [--daylight 1] [--weather 1] [--dry-run]
"""
import argparse
import os
import struct
import sys
import tempfile
import zipfile

TAG_END = 0


def parse_compound_tags(data, pos, name_prefix=""):
    """Yield (name, tag_type, value_pos) for tags and recurse into compounds."""
    while True:
        tag_type = data[pos]
        pos += 1
        if tag_type == TAG_END:
            return
        name_len = struct.unpack_from("<H", data, pos)[0]
        pos += 2
        name = data[pos:pos + name_len].decode("utf-8", "replace")
        pos += name_len
        value_pos = pos
        yield name_prefix + name, tag_type, value_pos
        pos = skip_payload(data, pos, tag_type)


def skip_payload(data, pos, tag_type):
    if tag_type in (1,):          # byte
        return pos + 1
    if tag_type in (2,):          # short
        return pos + 2
    if tag_type in (3, 5):        # int / float
        return pos + 4
    if tag_type in (4, 6):        # long / double
        return pos + 8
    if tag_type == 7:             # byte array
        length = struct.unpack_from("<i", data, pos)[0]
        return pos + 4 + length
    if tag_type == 8:             # string
        length = struct.unpack_from("<H", data, pos)[0]
        return pos + 2 + length
    if tag_type == 9:             # list
        item_type = data[pos]
        length = struct.unpack_from("<i", data, pos + 1)[0]
        pos += 5
        for _ in range(length):
            pos = skip_payload(data, pos, item_type)
        return pos
    if tag_type == 10:            # compound
        while True:
            inner_type = data[pos]
            pos += 1
            if inner_type == TAG_END:
                return pos
            name_len = struct.unpack_from("<H", data, pos)[0]
            pos += 2 + name_len
            pos = skip_payload(data, pos, inner_type)
    if tag_type == 11:            # int array
        length = struct.unpack_from("<i", data, pos)[0]
        return pos + 4 + 4 * length
    if tag_type == 12:            # long array
        length = struct.unpack_from("<i", data, pos)[0]
        return pos + 4 + 8 * length
    raise ValueError(f"unknown tag type {tag_type}")


def read_value(data, tag_type, value_pos):
    if tag_type == 1:
        return data[value_pos]
    if tag_type == 2:
        return struct.unpack_from("<h", data, value_pos)[0]
    if tag_type == 3:
        return struct.unpack_from("<i", data, value_pos)[0]
    if tag_type == 4:
        return struct.unpack_from("<q", data, value_pos)[0]
    if tag_type == 5:
        return struct.unpack_from("<f", data, value_pos)[0]
    if tag_type == 6:
        return struct.unpack_from("<d", data, value_pos)[0]
    return None


def patch_level_dat(raw, day_cycle, weather_cycle, dry_run=False):
    version, size = struct.unpack_from("<ii", raw, 0)
    data = bytearray(raw[8:8 + size])
    trailer = raw[8 + size:]
    pos = 0
    tag_type = data[pos]
    pos += 1
    name_len = struct.unpack_from("<H", data, pos)[0]
    pos += 2 + name_len
    if tag_type != 10:
        raise SystemExit("[!] level.dat root is not a compound")
    offsets = dict()
    for name, ttype, value_pos in parse_compound_tags(data, pos):
        offsets[name] = (ttype, value_pos)

    changes = {}
    for key, value in (("dodaylightcycle", day_cycle), ("doweathercycle", weather_cycle)):
        if key not in offsets:
            print(f"[!] {key}: not present, skipped")
            continue
        ttype, value_pos = offsets[key]
        if ttype != 1:
            print(f"[!] {key}: unexpected tag type {ttype}, skipped")
            continue
        old = data[value_pos]
        changes[key] = (old, int(value))
        if not dry_run:
            data[value_pos] = int(value) & 0xFF
    return raw[:8] + bytes(data) + trailer, changes


def main():
    parser = argparse.ArgumentParser(description="Enable day/night + weather cycles in a Bedrock world")
    parser.add_argument("world")
    parser.add_argument("--daylight", type=int, default=1)
    parser.add_argument("--weather", type=int, default=1)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    world = os.path.abspath(args.world)
    if not os.path.isfile(world):
        sys.exit(f"[!] {world} not found")

    with zipfile.ZipFile(world) as archive:
        before = {info.filename: archive.read(info) for info in archive.infolist() if not info.is_dir()}
    if "level.dat" not in before:
        sys.exit("[!] level.dat missing in world")
    new_level, changes = patch_level_dat(before["level.dat"], args.daylight, args.weather, args.dry_run)
    for key, (old, new) in changes.items():
        print(f"[patch] {key}: {old} -> {new}")
    if not changes:
        print("[!] nothing to change")
        return
    if args.dry_run:
        print("[dry-run] world not written")
        return

    backup = world + ".bak-env"
    if not os.path.exists(backup):
        with open(backup, "wb") as handle:
            handle.write(open(world, "rb").read())
        print("[backup]", os.path.basename(backup))

    fd, temp_path = tempfile.mkstemp(suffix=".mcworld", dir=os.path.dirname(world))
    os.close(fd)
    with zipfile.ZipFile(temp_path, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as target:
        for name, payload in before.items():
            target.writestr(name, new_level if name == "level.dat" else payload)
    with zipfile.ZipFile(temp_path) as check:
        if check.testzip() is not None:
            os.remove(temp_path)
            sys.exit("[!] rebuilt world failed CRC check")
        again = check.read("level.dat")
    _, recheck = patch_level_dat(again, args.daylight, args.weather, dry_run=True)
    if any(old != new for old, new in recheck.values()):
        os.remove(temp_path)
        sys.exit("[!] verification failed: level.dat values not persisted")
    os.replace(temp_path, world)
    print(f"[ok] {os.path.basename(world)}: day/night + weather cycle enabled, "
          f"{len(before)} entries, {os.path.getsize(world) / 1024 / 1024:.2f}MB")


if __name__ == "__main__":
    main()
