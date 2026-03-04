#!/usr/bin/env python3
"""Preview tree crops for woodcutting sprite sheet.
Extracts each proposed tree and saves individual PNGs + a composite preview."""

from PIL import Image
import os

ASSET = "_asset-pack/Farm RPG - Tiny Asset Pack - (All in One)/Farm/Tree"
OUT = "tools/tree-preview"
os.makedirs(OUT, exist_ok=True)

# Each entry: (source_file, crop_box (left, top, right, bottom), game_name)
# Crop boxes identified from visual inspection of each sheet
TREES = [
    # 1. Pine — Pine Tree.png (256x96): largest conifer at ~x=192, full height
    (f"{ASSET}/Common/No Shadow/Pine Tree.png", (192, 0, 256, 96), "Pine"),

    # 2. Oak — Birch Tree.png (256x96): large green round tree at ~x=96
    (f"{ASSET}/Common/No Shadow/Birch Tree.png", (96, 0, 160, 96), "Oak"),

    # 3. Birch — Birch Tree.png (256x96): red/autumn variant at ~x=128
    (f"{ASSET}/Common/No Shadow/Birch Tree.png", (128, 0, 192, 96), "Birch"),

    # 4. Maple — Maple Tree.png (288x192): orange tree, top row ~x=64
    (f"{ASSET}/Common/No Shadow/Maple Tree.png", (64, 0, 128, 96), "Maple"),

    # 5. Walnut — Mahogany Tree.png (384x96): first large green tree at ~x=64
    (f"{ASSET}/Common/No Shadow/Mahogany Tree.png", (64, 0, 128, 96), "Walnut"),

    # 6. Mahogany — Mahogany Tree.png (384x96): red variant at ~x=128
    (f"{ASSET}/Common/No Shadow/Mahogany Tree.png", (128, 0, 192, 96), "Mahogany"),

    # 7. Yew — Deep Forest/Tree.png (96x288): teal tall tree at ~y=96
    (f"{ASSET}/Deep Forest/Tree.png", (0, 96, 96, 192), "Yew"),

    # 8. Elder — Deep Forest/Tree.png (96x288): purple tall tree at ~y=192
    (f"{ASSET}/Deep Forest/Tree.png", (0, 192, 96, 288), "Elder"),
]

# Save individual crops
for src_path, box, name in TREES:
    img = Image.open(src_path)
    crop = img.crop(box)
    crop.save(f"{OUT}/{name}.png")
    print(f"{name}: {src_path.split('/')[-1]} crop={box} -> {crop.size}")

# Also save source sheets for reference
SOURCES = [
    (f"{ASSET}/Common/No Shadow/Pine Tree.png", "source-Pine"),
    (f"{ASSET}/Common/No Shadow/Birch Tree.png", "source-Birch"),
    (f"{ASSET}/Common/No Shadow/Maple Tree.png", "source-Maple"),
    (f"{ASSET}/Common/No Shadow/Mahogany Tree.png", "source-Mahogany"),
    (f"{ASSET}/Deep Forest/Tree.png", "source-DeepForest"),
]
for src_path, name in SOURCES:
    img = Image.open(src_path)
    img.save(f"{OUT}/{name}.png")

# Composite preview: all 8 trees side by side, 64px columns
CELL_W, CELL_H = 96, 96
composite = Image.new("RGBA", (CELL_W * 8, CELL_H), (0, 0, 0, 0))
for i, (src_path, box, name) in enumerate(TREES):
    img = Image.open(src_path)
    crop = img.crop(box)
    # Center in cell
    cx = (CELL_W - crop.width) // 2
    cy = CELL_H - crop.height
    composite.paste(crop, (i * CELL_W + cx, cy), crop)

composite.save(f"{OUT}/composite-preview.png")
print(f"\nComposite saved: {OUT}/composite-preview.png ({composite.size})")
print("Done! Check tools/tree-preview/ for all crops and source sheets.")
