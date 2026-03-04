#!/usr/bin/env python3
"""Pack tree sprites into a single sheet from user-verified crop coordinates.

Layout: 8 columns x 2 rows
  Row 0: 8 trees (Pine, Oak, Birch, Maple, Walnut, Mahogany, Yew, Elder)
  Row 1: 1 shared stump + 6 decoration trees

All sprites bottom-aligned within their cell.
"""

from PIL import Image
import os, json

SRC = "tools/tree-sources"
OUT = "static/images/skills/trees.png"

# From user's tree-crops.json export
TREES = [
    ("pine.png",        96,  0, 32, 48, "Pine"),       # y was -1, clamped to 0
    ("maple.png",        0, 47, 32, 49, "Oak"),
    ("maple.png",      160, 48, 32, 48, "Birch"),
    ("maple.png",       64, 48, 32, 48, "Maple"),
    ("mahogany.png",   128,  0, 32, 47, "Walnut"),     # y was -1, clamped to 0
    ("deepforest.png",  64, 95, 32, 50, "Mahogany"),
    ("deepforest.png",   0,239, 32, 49, "Yew"),
    ("deepforest.png",  64,239, 33, 49, "Elder"),
]

# Shared stump (Pine stump used for all trees)
STUMP = ("pine.png", 192, 32, 32, 17, "Stump")

DECOS = [
    ("mushroom.png",    64, 95, 32, 50, "Deco1"),      # mushroom tree
    ("mine.png",         0, 48, 32, 49, "Deco2"),      # mine tree top
    ("mine.png",        32, 95, 32, 33, "Deco3"),      # mine tree small
    ("cherry.png",     160,  0, 32, 48, "Deco4"),      # cherry
    ("apple.png",      224,  0, 32, 48, "Deco5"),      # apple (y was -1, clamped)
    ("bushes.png",      48,159, 47, 33, "Deco6"),      # bush
]

# Cell sizing
COLS = 8
CELL_W = 48  # fits widest sprite (47px bush) with 1px padding
ROW0_H = 50  # tallest tree is 50px (Mahogany)
ROW1_H = 50  # tallest deco is 50px (Deco1 mushroom)
SHEET_W = CELL_W * COLS
SHEET_H = ROW0_H + ROW1_H

composite = Image.new("RGBA", (SHEET_W, SHEET_H), (0, 0, 0, 0))

def place_sprite(entries, row_y, row_h, col_offset=0):
    results = []
    for i, (filename, cx, cy, cw, ch, name) in enumerate(entries):
        col = col_offset + i
        path = os.path.join(SRC, filename)
        img = Image.open(path)
        # Clamp crop to image bounds
        cx = max(0, cx)
        cy = max(0, cy)
        crop = img.crop((cx, cy, cx + cw, cy + ch))
        # Bottom-align, center horizontally in cell
        px = col * CELL_W + (CELL_W - cw) // 2
        py = row_y + (row_h - ch)
        composite.paste(crop, (px, py), crop)
        results.append((name, px, py, cw, ch))
        print(f"  {name}: col={col}, sheet({px},{py}) {cw}x{ch}")
    return results

print("=== Row 0: Trees ===")
tree_coords = place_sprite(TREES, 0, ROW0_H)

print("\n=== Row 1: Stump + Decorations ===")
stump_coords = place_sprite([STUMP], ROW0_H, ROW1_H, col_offset=0)
deco_coords = place_sprite(DECOS, ROW0_H, ROW1_H, col_offset=1)

composite.save(OUT)
print(f"\nSaved: {OUT} ({SHEET_W}x{SHEET_H})")

# Output JS sprite maps
print("\n// TREE_SPRITES (full trees)")
print("var TREE_SPRITES = {")
for name, px, py, cw, ch in tree_coords:
    print(f"    '{name}': {{ x: {px}, y: {py}, w: {cw}, h: {ch} }},")
print("};")

print("\n// STUMP_SPRITE (shared for all trees)")
s = stump_coords[0]
print(f"var STUMP_SPRITE = {{ x: {s[1]}, y: {s[2]}, w: {s[3]}, h: {s[4]} }};")

print("\n// DECO_SPRITES")
print("var DECO_SPRITES = {")
for name, px, py, cw, ch in deco_coords:
    print(f"    '{name}': {{ x: {px}, y: {py}, w: {cw}, h: {ch} }},")
print("};")

print(f"\n// SKILL_SHEET_META.trees = {{ w: {SHEET_W}, h: {SHEET_H} }}")
