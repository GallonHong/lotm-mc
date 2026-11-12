"""Read Bedrock level.dat NBT (little-endian) and report experiments."""
import struct
import zipfile

WORLD = r"C:\Users\10973\Desktop\mcaddon\明日之后.mcworld"
raw = None
with zipfile.ZipFile(WORLD) as archive:
    raw = archive.read("level.dat")

# header: 4-byte version, 4-byte length, then NBT (little-endian, version >= 8)
version = struct.unpack_from("<i", raw, 0)[0]
size = struct.unpack_from("<i", raw, 4)[0]
data = raw[8:8 + size]
pos = 0


def u8():
    global pos
    value = data[pos]
    pos += 1
    return value


def i16():
    global pos
    value = struct.unpack_from("<h", data, pos)[0]
    pos += 2
    return value


def i32():
    global pos
    value = struct.unpack_from("<i", data, pos)[0]
    pos += 4
    return value


def i64():
    global pos
    value = struct.unpack_from("<q", data, pos)[0]
    pos += 8
    return value


def f32():
    global pos
    value = struct.unpack_from("<f", data, pos)[0]
    pos += 4
    return value


def f64():
    global pos
    value = struct.unpack_from("<d", data, pos)[0]
    pos += 8
    return value


def string():
    global pos
    length = struct.unpack_from("<H", data, pos)[0]
    pos += 2
    value = data[pos:pos + length].decode("utf-8", "replace")
    pos += length
    return value


def payload(tag_type):
    if tag_type == 1:
        return u8()
    if tag_type == 2:
        return i16()
    if tag_type == 3:
        return i32()
    if tag_type == 4:
        return i64()
    if tag_type == 5:
        return f32()
    if tag_type == 6:
        return f64()
    if tag_type == 7:
        length = i32()
        value = list(data[pos:pos + length])
        pos += length
        return value
    if tag_type == 8:
        return string()
    if tag_type == 9:
        item_type = u8()
        length = i32()
        return [payload(item_type) for _ in range(length)]
    if tag_type == 10:
        result = {}
        while True:
            child_type = u8()
            if child_type == 0:
                return result
            name = string()
            result[name] = payload(child_type)
    if tag_type == 11:
        length = i32()
        values = list(struct.unpack_from("<%di" % length, data, pos))
        pos += 4 * length
        return values
    if tag_type == 12:
        length = i32()
        values = list(struct.unpack_from("<%dq" % length, data, pos))
        pos += 8 * length
        return values
    raise ValueError(f"unsupported tag {tag_type}")


root_type = u8()
root_name = string()
root = payload(root_type)
level = root if root_name == "" else root
print("version:", version, "size:", size)
print("top-level keys:", sorted(level.keys()))
print("experiments:", level.get("experiments"))
print("experiments_ever_used:", level.get("experiments_ever_used"))
print("saved_with_toggled_experiments:", level.get("saved_with_toggled_experiments"))
