#!/usr/bin/env python3
"""Convert a Deadzone structure into a standalone vanilla-block dungeon asset."""

from __future__ import annotations

import argparse
import struct
from dataclasses import dataclass
from pathlib import Path


@dataclass
class Tag:
    kind: int
    value: object
    list_kind: int | None = None


class Reader:
    def __init__(self, data: bytes):
        self.data = data
        self.offset = 0

    def unpack(self, fmt: str):
        size = struct.calcsize("<" + fmt)
        value = struct.unpack_from("<" + fmt, self.data, self.offset)
        self.offset += size
        return value[0] if len(value) == 1 else value

    def string(self) -> str:
        length = self.unpack("H")
        value = self.data[self.offset:self.offset + length].decode("utf-8")
        self.offset += length
        return value

    def payload(self, kind: int) -> Tag:
        if kind == 1:
            return Tag(kind, self.unpack("b"))
        if kind == 2:
            return Tag(kind, self.unpack("h"))
        if kind == 3:
            return Tag(kind, self.unpack("i"))
        if kind == 4:
            return Tag(kind, self.unpack("q"))
        if kind == 5:
            return Tag(kind, self.unpack("f"))
        if kind == 6:
            return Tag(kind, self.unpack("d"))
        if kind == 7:
            length = self.unpack("i")
            value = self.data[self.offset:self.offset + length]
            self.offset += length
            return Tag(kind, value)
        if kind == 8:
            return Tag(kind, self.string())
        if kind == 9:
            list_kind = self.unpack("B")
            length = self.unpack("i")
            return Tag(kind, [self.payload(list_kind) for _ in range(length)], list_kind)
        if kind == 10:
            value = {}
            while True:
                child_kind = self.unpack("B")
                if child_kind == 0:
                    break
                name = self.string()
                value[name] = self.payload(child_kind)
            return Tag(kind, value)
        if kind == 11:
            return Tag(kind, [self.unpack("i") for _ in range(self.unpack("i"))])
        if kind == 12:
            return Tag(kind, [self.unpack("q") for _ in range(self.unpack("i"))])
        raise ValueError(f"Unsupported NBT tag {kind}")

    def root(self) -> tuple[str, Tag]:
        kind = self.unpack("B")
        name = self.string()
        return name, self.payload(kind)


def encode_string(value: str) -> bytes:
    raw = value.encode("utf-8")
    return struct.pack("<H", len(raw)) + raw


def encode_payload(tag: Tag) -> bytes:
    kind, value = tag.kind, tag.value
    if kind == 1:
        return struct.pack("<b", value)
    if kind == 2:
        return struct.pack("<h", value)
    if kind == 3:
        return struct.pack("<i", value)
    if kind == 4:
        return struct.pack("<q", value)
    if kind == 5:
        return struct.pack("<f", value)
    if kind == 6:
        return struct.pack("<d", value)
    if kind == 7:
        return struct.pack("<i", len(value)) + value
    if kind == 8:
        return encode_string(value)
    if kind == 9:
        return struct.pack("<Bi", tag.list_kind, len(value)) + b"".join(encode_payload(child) for child in value)
    if kind == 10:
        chunks = []
        for name, child in value.items():
            chunks.append(struct.pack("<B", child.kind) + encode_string(name) + encode_payload(child))
        return b"".join(chunks) + b"\x00"
    if kind == 11:
        return struct.pack("<i", len(value)) + b"".join(struct.pack("<i", item) for item in value)
    if kind == 12:
        return struct.pack("<i", len(value)) + b"".join(struct.pack("<q", item) for item in value)
    raise ValueError(f"Unsupported NBT tag {kind}")


VANILLA_REPLACEMENTS = {
    "mcpe:smooth_stone_brick": "minecraft:stone_bricks",
    "mcpe:tiles_white": "minecraft:quartz_block",
    "mcpe:wood_table": "minecraft:spruce_planks",
    "mcpe:papers": "minecraft:light_gray_carpet",
    "mcpe:wood_chair": "minecraft:spruce_planks",
    "mcpe:medical_loot": "minecraft:barrel",
    "mcpe:trash_can": "minecraft:cauldron",
    "mcpe:monitor_keyboard": "minecraft:black_concrete",
    "mcpe:office_chair_white": "minecraft:white_wool",
    "mcpe:office_chair_blue": "minecraft:blue_wool",
    "mcpe:civilian_loot": "minecraft:barrel",
    "mcpe:food_loot": "minecraft:barrel",
    "mcpe:police_loot": "minecraft:barrel",
    "mcpe:crate": "minecraft:barrel",
    "mcpe:metal_rack": "minecraft:iron_bars",
    "mcpe:microwave": "minecraft:iron_block",
    "mcpe:monitor": "minecraft:black_concrete",
    "mcpe:office_chair_black": "minecraft:black_wool",
    "mcpe:office_chair_green": "minecraft:green_wool",
    "mcpe:ceiling_light": "minecraft:sea_lantern",
    "mcpe:ceiling_light_broken": "minecraft:gray_concrete",
    "mcpe:display_rack_middle_bottom": "minecraft:bookshelf",
    "mcpe:display_rack_middle_top": "minecraft:bookshelf",
    "mcpe:display_rack_side_bottom": "minecraft:bookshelf",
    "mcpe:display_rack_side_top": "minecraft:bookshelf",
    "mcpe:monobloc_yellow": "minecraft:yellow_wool",
    "mcpe:plastic_tan": "minecraft:sandstone",
    "mcpe:radio": "minecraft:note_block",
    "mcpe:street_bench_blue": "minecraft:blue_wool",
    "mcpe:street_bench_white": "minecraft:smooth_stone",
    "mcpe:worklight": "minecraft:glowstone",
    "mcpe:barrel_explosive": "minecraft:red_concrete",
    "mcpe:crowd_fence": "minecraft:iron_bars",
    "mcpe:road_barrier": "minecraft:yellow_concrete",
    "mcpe:traffic_rod": "minecraft:yellow_concrete",
    "mcpe:traffic_turn_left": "minecraft:yellow_concrete",
    "mcpe:traffic_turn_right": "minecraft:yellow_concrete",
}


def generic_replacement(identifier: str) -> str:
    """Return a conservative vanilla stand-in for DeadZone furniture.

    Dungeon structures are scenery only: enemies, loot and interaction state are
    owned by Script API.  Keeping this fallback here lets additional DeadZone
    structures be imported without silently retaining a missing mcpe:* block.
    """
    name = identifier.split(":", 1)[-1]
    if "loot" in name or name == "crate":
        return "minecraft:barrel"
    if "light" in name:
        return "minecraft:sea_lantern" if "broken" not in name else "minecraft:gray_concrete"
    if "barrel_explosive" in name:
        return "minecraft:red_concrete"
    if "barrel" in name:
        return "minecraft:barrel"
    if "metal" in name or "fence" in name or "rack" in name:
        return "minecraft:iron_bars"
    if "chair" in name or "bench" in name:
        return "minecraft:spruce_planks"
    if "monitor" in name or name in {"tv", "radio_ham", "radio"}:
        return "minecraft:black_concrete"
    if "paper" in name:
        return "minecraft:light_gray_carpet"
    if "tile" in name or "sink" in name or "toilet" in name:
        return "minecraft:quartz_block"
    if "brick" in name:
        return "minecraft:stone_bricks"
    if "plastic" in name or "corrugated" in name:
        return "minecraft:gray_concrete"
    if "caution" in name or "traffic" in name:
        return "minecraft:yellow_concrete"
    if "trace" in name or "graffiti" in name:
        return "minecraft:gray_carpet"
    if "sign" in name:
        return "minecraft:redstone_lamp"
    return "minecraft:smooth_stone"


def child(compound: Tag, name: str) -> Tag:
    return compound.value[name]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--expected-size", help="Optional X,Y,Z safety check")
    args = parser.parse_args()

    reader = Reader(args.source.read_bytes())
    root_name, root = reader.root()
    if reader.offset != len(reader.data):
        raise ValueError("Trailing data found after root NBT tag")

    size = [entry.value for entry in child(root, "size").value]
    if args.expected_size:
        expected = [int(value) for value in args.expected_size.split(",")]
        if size != expected:
            raise ValueError(f"Unexpected structure dimensions: {size}; expected {expected}")

    structure = child(root, "structure")
    default_palette = child(child(structure, "palette"), "default")
    block_palette = child(default_palette, "block_palette")
    replaced = 0
    for entry in block_palette.value:
        name_tag = child(entry, "name")
        replacement = VANILLA_REPLACEMENTS.get(name_tag.value)
        if name_tag.value.startswith("mcpe:") and not replacement:
            replacement = generic_replacement(name_tag.value)
        if name_tag.value in {"minecraft:mob_spawner", "minecraft:jigsaw"}:
            replacement = "minecraft:air"
        if not replacement:
            continue
        name_tag.value = replacement
        entry.value["states"] = Tag(10, {})
        replaced += 1

    # The original four block-entity records belong to custom loot/furniture blocks.
    # Rewards are handled per player by RewardManager, so these records are removed.
    default_palette.value["block_position_data"] = Tag(10, {})
    # Imported packs sometimes save zombies, markers or jigsaw entities inside
    # the structure. DungeonManager is the sole authority for spawned actors.
    structure.value["entities"] = Tag(9, [], 10)

    encoded = struct.pack("<B", root.kind) + encode_string(root_name) + encode_payload(root)
    if b"mcpe:" in encoded:
        raise ValueError("Custom Deadzone block identifiers remain in converted structure")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(encoded)
    print(f"Prepared {args.output} ({size[0]}x{size[1]}x{size[2]}, {replaced} palette entries replaced)")


if __name__ == "__main__":
    main()
