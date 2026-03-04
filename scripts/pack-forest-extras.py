#!/usr/bin/env python3
"""Pack forest decoration extras (logs, stumps, vines, props) into a sprite sheet."""

from PIL import Image
import json, os

os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

with open('tools/forest-extras.json') as f:
    data = json.load(f)

# Gather all items in order: logs, stumps, vines, props
groups = ['logs', 'stumps', 'vines', 'props']
items = []
for g in groups:
    for entry in data[g]:
        if entry['crop']:
            items.append(entry)

# Load and crop each sprite
crops = []
for item in items:
    src = 'tools/' + item['sourcePath']
    img = Image.open(src)
    c = item['crop']
    # Clamp negative coords to 0
    x = max(0, c['x'])
    y = max(0, c['y'])
    crop = img.crop((x, y, x + c['w'], y + c['h']))
    crops.append((item['name'], crop, c['w'], c['h']))
    print(f"  {item['name']}: {src} ({x},{y},{c['w']}x{c['h']})")

# Layout: single row, each sprite in a cell sized to max dimensions
max_w = max(c[2] for c in crops)
max_h = max(c[3] for c in crops)
CELL_W = max_w
CELL_H = max_h
COLS = len(crops)

composite = Image.new('RGBA', (CELL_W * COLS, CELL_H), (0, 0, 0, 0))

print(f"\nCell size: {CELL_W}x{CELL_H}, {COLS} sprites")
print(f"Sheet size: {CELL_W * COLS}x{CELL_H}")
print()

for i, (name, crop_img, w, h) in enumerate(crops):
    # Bottom-align in cell, center horizontally
    px = i * CELL_W + (CELL_W - w) // 2
    py = CELL_H - h
    composite.paste(crop_img, (px, py), crop_img)
    print(f"'{name}': {{ x: {px}, y: {py}, w: {w}, h: {h} }},  // col {i}")

OUT = 'static/images/skills/forest-extras.png'
composite.save(OUT)
print(f"\nSaved: {OUT} ({composite.size[0]}x{composite.size[1]})")
