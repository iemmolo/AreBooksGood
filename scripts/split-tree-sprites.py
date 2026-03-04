#!/usr/bin/env python3
"""Split each source tree sheet into individual tree files using alpha bounding boxes."""

from PIL import Image
import os

SRC = "tools/tree-sources"
OUT = "tools/tree-individuals"
os.makedirs(OUT, exist_ok=True)

def find_sprites(img, min_w=8, min_h=8, gap=2):
    """Find bounding boxes of non-transparent regions by scanning columns."""
    w, h = img.size
    pixels = img.load()

    # Find non-empty columns
    col_has_alpha = [False] * w
    for x in range(w):
        for y in range(h):
            if pixels[x, y][3] > 10:
                col_has_alpha[x] = True
                break

    # Group contiguous non-empty columns into sprites
    sprites = []
    in_sprite = False
    start_x = 0
    empty_count = 0

    for x in range(w):
        if col_has_alpha[x]:
            if not in_sprite:
                start_x = x
                in_sprite = True
            empty_count = 0
        else:
            if in_sprite:
                empty_count += 1
                if empty_count > gap:
                    end_x = x - empty_count
                    if end_x - start_x >= min_w:
                        sprites.append((start_x, end_x))
                    in_sprite = False
                    empty_count = 0

    if in_sprite:
        end_x = w - 1
        while end_x > start_x and not col_has_alpha[end_x]:
            end_x -= 1
        if end_x - start_x >= min_w:
            sprites.append((start_x, end_x + 1))

    # For each column range, find the actual y bounding box
    results = []
    for (x1, x2) in sprites:
        y1, y2 = h, 0
        for x in range(x1, x2):
            for y in range(h):
                if pixels[x, y][3] > 10:
                    y1 = min(y1, y)
                    y2 = max(y2, y)
        if y2 - y1 >= min_h:
            results.append((x1, y1, x2, y2 + 1))

    return results


def split_sheet(filename, label, gap=2):
    """Split a sheet and save individual sprites."""
    path = os.path.join(SRC, filename)
    img = Image.open(path)
    print(f"\n=== {label} ({img.size[0]}x{img.size[1]}) ===")

    sprites = find_sprites(img, gap=gap)

    for i, (x1, y1, x2, y2) in enumerate(sprites):
        crop = img.crop((x1, y1, x2, y2))
        name = f"{label}-{i+1}"
        out_path = os.path.join(OUT, f"{name}.png")
        crop.save(out_path)
        print(f"  {name}: ({x1},{y1})-({x2},{y2}) = {x2-x1}x{y2-y1}")


def split_vertical(filename, label, cell_h):
    """Split a vertical sheet into rows, then split each row."""
    path = os.path.join(SRC, filename)
    img = Image.open(path)
    w, h = img.size
    print(f"\n=== {label} ({w}x{h}) ===")

    rows = h // cell_h
    for r in range(rows):
        row_img = img.crop((0, r * cell_h, w, (r + 1) * cell_h))
        sprites = find_sprites(row_img, gap=2)
        for i, (x1, y1, x2, y2) in enumerate(sprites):
            crop = row_img.crop((x1, y1, x2, y2))
            name = f"{label}-r{r+1}-{i+1}"
            out_path = os.path.join(OUT, f"{name}.png")
            crop.save(out_path)
            print(f"  {name}: ({x1},{y1})-({x2},{y2}) = {x2-x1}x{y2-y1}")


# Common trees: single-row sheets, split by column gaps
split_sheet("pine.png", "pine", gap=1)
split_sheet("birch.png", "birch", gap=1)
split_sheet("mahogany.png", "mahogany", gap=1)

# Maple: 2-row sheet (top=trees, bottom=items), split top row only
maple = Image.open(os.path.join(SRC, "maple.png"))
print(f"\n=== maple ({maple.size[0]}x{maple.size[1]}) ===")
# Top half = trees
maple_top = maple.crop((0, 0, maple.size[0], 96))
sprites = find_sprites(maple_top, gap=1)
for i, (x1, y1, x2, y2) in enumerate(sprites):
    crop = maple_top.crop((x1, y1, x2, y2))
    name = f"maple-top-{i+1}"
    out_path = os.path.join(OUT, f"{name}.png")
    crop.save(out_path)
    print(f"  {name}: ({x1},{y1})-({x2},{y2}) = {x2-x1}x{y2-y1}")
# Bottom half = items (save as one strip for reference)
maple_bot = maple.crop((0, 96, maple.size[0], maple.size[1]))
sprites_bot = find_sprites(maple_bot, gap=1)
for i, (x1, y1, x2, y2) in enumerate(sprites_bot):
    crop = maple_bot.crop((x1, y1, x2, y2))
    name = f"maple-bot-{i+1}"
    out_path = os.path.join(OUT, f"{name}.png")
    crop.save(out_path)
    print(f"  {name}: ({x1},{y1})-({x2},{y2}) = {x2-x1}x{y2-y1}")

# Deep forest: vertical 96px rows
split_vertical("deepforest.png", "deepforest", 96)

# Mushroom tree
split_vertical("mushroom.png", "mushroom", 48)

# Mine tree
split_sheet("mine.png", "mine", gap=1)

# Fruit trees
split_sheet("cherry.png", "cherry", gap=1)
split_sheet("apple.png", "apple", gap=1)

print(f"\nDone! All sprites saved to {OUT}/")
print(f"Total files: {len(os.listdir(OUT))}")
