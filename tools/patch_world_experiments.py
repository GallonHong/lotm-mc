"""Copy 明日之后.mcworld and disable the `deferred_technical_preview` experiment in level.dat.

Vibrant Visuals and the old Deferred Technical Preview are mutually exclusive. A world saved
with the deferred experiment keeps using the legacy deferred renderer, which forces the
Vibrant Visuals option off in that world. This script patches a COPY of the world.

Usage:
  python tools/patch_world_experiments.py [--world PATH] [--out PATH] [--key KEY]
"""
import argparse
import os
import struct
import zipfile

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_WORLD = os.path.join(REPO, "明日之后.mcworld")
DEFAULT_OUT = os.path.join(REPO, "明日之后_VV修复版.mcworld")


class Reader:
    def __init__(self, data):
        self.data = data
        self.pos = 0

    def u8(self):
        value = self.data[self.pos]
        self.pos += 1
        return value

    def i16(self):
        value = struct.unpack_from("<h", self.data, self.pos)[0]
        self.pos += 2
        return value

    def i32(self):
        value = struct.unpack_from("<i", self.data, self.pos)[0]
        self.pos += 4
        return value

    def i64(self):
        value = struct.unpack_from("<q", self.data, self.pos)[0]
        self.pos += 8
        return value

    def f32(self):
        value = struct.unpack_from("<f", self.data, self.pos)[0]
        self.pos += 4
        return value

    def f64(self):
        value = struct.unpack_from("<d", self.data, self.pos)[0]
        self.pos += 8
        return value

    def string(self):
        length = struct.unpack_from("<H", self.data, self.pos)[0]
        self.pos += 2
        value = self.data[self.pos:self.pos + length].decode("utf-8", "replace")
        self.pos += length
        return value


def read_typed(reader, tag_type):
    if tag_type == 1:
        return 1, reader.u8()
    if tag_type == 2:
        return 2, reader.i16()
    if tag_type == 3:
        return 3, reader.i32()
    if tag_type == 4:
        return 4, reader.i64()
    if tag_type == 5:
        return 5, reader.f32()
    if tag_type == 6:
        return 6, reader.f64()
    if tag_type == 7:
        length = reader.i32()
        value = bytes(reader.data[reader.pos:reader.pos + length])
        reader.pos += length
        return 7, value
    if tag_type == 8:
        return 8, reader.string()
    if tag_type == 9:
        item_type = reader.u8()
        length = reader.i32()
        items = [read_typed(reader, item_type)[1] for _ in range(length)]
        return 9, (item_type, items)
    if tag_type == 10:
        result = {}
        while True:
            child_type = reader.u8()
            if child_type == 0:
                return 10, result
            name = reader.string()
            result[name] = read_typed(reader, child_type)
    if tag_type == 11:
        length = reader.i32()
        value = list(struct.unpack_from("<%di" % length, reader.data, reader.pos))
        reader.pos += 4 * length
        return 11, value
    if tag_type == 12:
        length = reader.i32()
        value = list(struct.unpack_from("<%dq" % length, reader.data, reader.pos))
        reader.pos += 8 * length
        return 12, value
    raise ValueError(f"unsupported tag type {tag_type}")


class Writer:
    def __init__(self):
        self.buf = bytearray()

    def u8(self, value):
        self.buf += struct.pack("<B", value)

    def i16(self, value):
        self.buf += struct.pack("<h", value)

    def i32(self, value):
        self.buf += struct.pack("<i", value)

    def i64(self, value):
        self.buf += struct.pack("<q", value)

    def f32(self, value):
        self.buf += struct.pack("<f", value)

    def f64(self, value):
        self.buf += struct.pack("<d", value)

    def string(self, value):
        encoded = value.encode("utf-8")
        self.buf += struct.pack("<H", len(encoded))
        self.buf += encoded


def write_typed(writer, tag_type, name, value):
    writer.u8(tag_type)
    writer.string(name)
    write_typed_payload(writer, tag_type, value)


def write_typed_payload(writer, tag_type, value):
    if tag_type == 1:
        writer.u8(value)
    elif tag_type == 2:
        writer.i16(value)
    elif tag_type == 3:
        writer.i32(value)
    elif tag_type == 4:
        writer.i64(value)
    elif tag_type == 5:
        writer.f32(value)
    elif tag_type == 6:
        writer.f64(value)
    elif tag_type == 7:
        writer.i32(len(value))
        writer.buf += bytes(value)
    elif tag_type == 8:
        writer.string(value)
    elif tag_type == 9:
        item_type, items = value
        writer.u8(item_type)
        writer.i32(len(items))
        for item in items:
            write_typed_payload(writer, item_type, item)
    elif tag_type == 10:
        for child_name, (child_type, child_value) in value.items():
            write_typed(writer, child_type, child_name, child_value)
        writer.u8(0)
    elif tag_type == 11:
        writer.i32(len(value))
        writer.buf += struct.pack("<%di" % len(value), *value)
    elif tag_type == 12:
        writer.i32(len(value))
        writer.buf += struct.pack("<%dq" % len(value), *value)
    else:
        raise ValueError(f"unsupported tag type {tag_type}")


def load_level(world_path):
    with zipfile.ZipFile(world_path) as archive:
        raw = archive.read("level.dat")
    header_version = struct.unpack_from("<i", raw, 0)[0]
    payload_size = struct.unpack_from("<i", raw, 4)[0]
    nbt_bytes = raw[8:8 + payload_size]
    reader = Reader(nbt_bytes)
    root_type = reader.u8()
    root_name = reader.string()
    root = read_typed(reader, root_type)
    return header_version, root_type, root_name, root


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--world", default=DEFAULT_WORLD)
    parser.add_argument("--out", default=DEFAULT_OUT)
    parser.add_argument("--key", default="deferred_technical_preview")
    return parser.parse_args()


def main():
    args = parse_args()
    header_version, root_type, root_name, root = load_level(args.world)
    level = root[1]
    experiments = level.get("experiments")
    if not experiments or experiments[0] != 10:
        raise SystemExit("[!] no experiments compound in level.dat")
    experiment_values = experiments[1]
    before = {name: value[1] for name, value in experiment_values.items()}
    print("experiments before:", before)
    if args.key not in experiment_values:
        raise SystemExit(f"[!] {args.key} not present")
    experiment_values[args.key] = (1, 0)
    after = {name: value[1] for name, value in experiment_values.items()}
    print("experiments after :", after)

    writer = Writer()
    write_typed(writer, root_type, root_name, root[1])
    new_nbt = bytes(writer.buf)

    check_reader = Reader(new_nbt)
    check_type = check_reader.u8()
    check_name = check_reader.string()
    check = read_typed(check_reader, check_type)[1]
    assert check["experiments"][1][args.key][1] == 0, "round-trip failed for experiment"
    assert check["LevelName"][1] == level["LevelName"][1], "round-trip name mismatch"
    assert check["RandomSeed"][1] == level["RandomSeed"][1], "round-trip seed mismatch"

    new_level = struct.pack("<i", header_version) + struct.pack("<i", len(new_nbt)) + new_nbt

    temp_out = args.out + ".tmp"
    with zipfile.ZipFile(args.world) as src, zipfile.ZipFile(temp_out, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as dst:
        for info in src.infolist():
            data = src.read(info)
            if info.filename == "level.dat":
                data = new_level
            dst.writestr(info, data)
    os.replace(temp_out, args.out)
    print(f"[ok] patched world written: {args.out}")
    print(f"     size: {os.path.getsize(args.out) / 1024 / 1024:.2f} MB")


if __name__ == "__main__":
    main()
