#!/usr/bin/env python3
"""Extract farm sprites from the RPG asset pack into individual PNGs.

Reads sprite sheets from _asset-pack/ and outputs individual frames to
static/images/farm/{crops,stations,houses,ground}/.

Usage:
    python3 scripts/extract-farm-sprites.py
"""

import os
from PIL import Image

# ── Paths ────────────────────────────────────────────────────────
PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PACK = os.path.join(PROJECT, '_asset-pack',
                    'Farm RPG - Tiny Asset Pack - (All in One)')
OUT = os.path.join(PROJECT, 'static', 'images', 'farm')

CROPS_DIR   = os.path.join(PACK, 'Farm Crops')
BENCH_DIR   = os.path.join(PACK, 'Farm', 'Work Benches')
HOUSES_DIR  = os.path.join(PACK, 'Exterior', 'Houses')
BUILDS_DIR  = os.path.join(HOUSES_DIR, 'Farm Buildings')
PROPS_DIR   = os.path.join(PACK, 'Farm', 'Props')
EXT_DIR     = os.path.join(PACK, 'Exterior')
TREE_DIR    = os.path.join(PACK, 'Farm', 'Tree')
TILESET_DIR = os.path.join(PACK, 'Farm', 'Tileset', 'Modular')

# ── Crop definitions ─────────────────────────────────────────────
# Each: (output_name, source_path, frame_width, frame_height, stage_indices)
# stage_indices maps to stages: planted(1), sprouting(2), growing(3), flowering(4), ready(5)
# Blank frames (transparent/empty) have been identified and skipped.
CROPS = [
    ('carrot',       os.path.join(CROPS_DIR, 'Spring', 'Carrot.png'),     16, 16, [0, 1, 3, 5, 7]),
    ('potato',       os.path.join(CROPS_DIR, 'Spring', 'Potato.png'),     16, 16, [0, 1, 3, 5, 7]),
    ('wheat',        os.path.join(CROPS_DIR, 'Summer', 'Wheat.png'),      16, 16, [0, 2, 4, 5, 9]),
    ('tomato',       os.path.join(CROPS_DIR, 'Summer', 'Tomato.png'),     16, 16, [0, 2, 4, 6, 9]),
    ('corn',         os.path.join(CROPS_DIR, 'Summer', 'Corn.png'),       32, 32, [0, 1, 2, 3, 4]),
    ('pumpkin',      os.path.join(CROPS_DIR, 'Fall', 'Pumpkin.png'),      16, 16, [0, 2, 3, 5, 7]),
    ('golden_apple', os.path.join(CROPS_DIR, 'Spring', 'Strawberry.png'), 16, 16, [0, 1, 3, 5, 7]),
    ('crystal_herb', os.path.join(CROPS_DIR, 'Summer', 'Aloe.png'),      16, 16, [0, 2, 4, 5, 9]),
    ('dragon_fruit', os.path.join(CROPS_DIR, 'Summer', 'Pineapple.png'), 32, 32, [0, 1, 2, 4, 4]),
]

# ── Station definitions ──────────────────────────────────────────
# Each: (output_name, source_path, crop_box (x, y, x2, y2))
STATIONS = [
    # Processing
    ('mill',        os.path.join(BENCH_DIR, 'Workbench.png'),          (0, 0, 32, 32)),
    ('sawmill',     os.path.join(BENCH_DIR, 'Sawmill.png'),            (0, 0, 32, 16)),
    ('mason',       os.path.join(BENCH_DIR, 'Anvil.png'),              (0, 0, 32, 32)),
    ('kitchen',     os.path.join(BENCH_DIR, 'Kitchen pot.png'),        (0, 0, 32, 32)),
    ('forge',       os.path.join(BENCH_DIR, 'Furnace.png'),            (0, 0, 32, 32)),
    ('loom',        os.path.join(BENCH_DIR, 'Drying Rack.png'),        (0, 0, 16, 32)),
    ('smokehouse',  os.path.join(BENCH_DIR, 'fermentation barrel.png'),(0, 0, 32, 32)),
    ('enchanter',   os.path.join(BENCH_DIR, 'Alchemy Table.png'),      (0, 0, 32, 32)),
    # Gathering — buildings
    ('chickenCoop', os.path.join(BUILDS_DIR, 'Chicken Coop', 'Chicken Coop.png'), (0, 0, 70, 80)),
    ('cowPasture',  os.path.join(BUILDS_DIR, 'Stable', 'Stable.png'),             (0, 0, 102, 66)),
    ('sheepPen',    os.path.join(BUILDS_DIR, 'Barn', 'Barn.png'),                 (0, 0, 87, 82)),
    # Gathering — props (improved sprites)
    ('lumberYard',  os.path.join(PROPS_DIR, 'wood.png'),                           (0, 0, 64, 16)),
    ('quarry',      os.path.join(PROPS_DIR, 'Mine', 'stone with minerals.png'),    (0, 192, 32, 224)),
    ('mine',        os.path.join(PROPS_DIR, 'Mine', 'stone with minerals.png'),     (0, 192, 32, 224)),
    ('deepMine',    os.path.join(PROPS_DIR, 'Mine', 'Props Mine.png'),             (0, 192, 32, 224)),
    ('oldGrowth',   os.path.join(TREE_DIR, 'Deep Forest', 'Tree.png'),             (64, 0, 96, 48)),
]

# ── Farmhouse levels ─────────────────────────────────────────────
# Each: (level, source_path) — copy whole image, no slicing
FARMHOUSES = [
    (1, os.path.join(HOUSES_DIR, '5.png')),
    (2, os.path.join(HOUSES_DIR, '6.png')),
    (3, os.path.join(HOUSES_DIR, '2.png')),
    (4, os.path.join(HOUSES_DIR, '7.png')),
    (5, os.path.join(HOUSES_DIR, '8.png')),
]


def ensure_dir(path):
    os.makedirs(path, exist_ok=True)


def extract_crops():
    out_dir = os.path.join(OUT, 'crops')
    ensure_dir(out_dir)
    count = 0

    for name, src, fw, fh, indices in CROPS:
        img = Image.open(src)
        for stage_num, frame_idx in enumerate(indices, start=1):
            x = frame_idx * fw
            frame = img.crop((x, 0, x + fw, fh))
            out_path = os.path.join(out_dir, '{}-{}.png'.format(name, stage_num))
            frame.save(out_path)
            count += 1

    print('Crops: {} PNGs'.format(count))


def extract_stations():
    out_dir = os.path.join(OUT, 'stations')
    ensure_dir(out_dir)
    count = 0

    for name, src, box in STATIONS:
        img = Image.open(src)
        frame = img.crop(box)
        out_path = os.path.join(out_dir, '{}.png'.format(name))
        frame.save(out_path)
        count += 1

    print('Stations: {} PNGs'.format(count))


def extract_farmhouses():
    out_dir = os.path.join(OUT, 'houses')
    ensure_dir(out_dir)
    count = 0

    for level, src in FARMHOUSES:
        img = Image.open(src)
        out_path = os.path.join(out_dir, 'farmhouse-{}.png'.format(level))
        img.save(out_path)
        count += 1

    print('Houses: {} PNGs'.format(count))


def extract_ground_tiles():
    """Extract grass composite and tilled soil tile for grid backgrounds."""
    import random
    out_dir = os.path.join(OUT, 'ground')
    ensure_dir(out_dir)

    # Grass: 384x256 composite (24x16 tiles) from fill tiles at (5,1), (6,1),
    # (5,2), (6,2) in the Grass Summer tileset. These 4 tiles share the same
    # base color (126,196,51) with subtle dark-green grass blade marks.
    # Random rotations/flips across 8 orientations break up the pattern.
    # Large size (24x16) ensures no visible repetition at 3x CSS display.
    grass_src = os.path.join(TILESET_DIR, 'Tileset Grass Summer.png')
    grass_img = Image.open(grass_src)
    fills = [
        grass_img.crop((80, 16, 96, 32)),   # (5,1)
        grass_img.crop((96, 16, 112, 32)),   # (6,1)
        grass_img.crop((80, 32, 96, 48)),    # (5,2)
        grass_img.crop((96, 32, 112, 48)),   # (6,2)
    ]

    GCOLS, GROWS = 24, 16
    random.seed(42)
    composite = Image.new('RGBA', (GCOLS * 16, GROWS * 16))
    transforms = [
        None, Image.ROTATE_90, Image.ROTATE_180, Image.ROTATE_270,
        Image.FLIP_LEFT_RIGHT,
        (Image.ROTATE_90, Image.FLIP_LEFT_RIGHT),
        (Image.ROTATE_180, Image.FLIP_LEFT_RIGHT),
        (Image.ROTATE_270, Image.FLIP_LEFT_RIGHT),
    ]
    for row in range(GROWS):
        for col in range(GCOLS):
            t = random.choice(fills).copy()
            tr = random.choice(transforms)
            if tr is not None:
                if isinstance(tr, tuple):
                    for transform in tr:
                        t = t.transpose(transform)
                else:
                    t = t.transpose(tr)
            composite.paste(t, (col * 16, row * 16))

    composite.save(os.path.join(out_dir, 'grass.png'))

    # Tilled soil tile: 16x16 from Tilled Soil and wet soil.png at (0,0)
    soil_src = os.path.join(TILESET_DIR, 'Tilled Soil and wet soil.png')
    soil_img = Image.open(soil_src)
    soil_tile = soil_img.crop((0, 0, 16, 16))
    soil_tile.save(os.path.join(out_dir, 'soil.png'))

    print('Ground: 2 PNGs (384x256 grass composite, 16x16 soil)')


def extract_pond_composite():
    """Compose a pond sprite from Grass Water Summer tileset tiles.

    Uses the modular autotile sheet: top border from row 3 (cols 1-3),
    bottom border = vertically flipped top, edges from cols 4/7 row 1,
    water fill from (9,6). Result is 96x48 (6x3 tiles, 2:1 ratio)
    matching the pond cell's desktop aspect ratio (4cols x 2rows).
    """
    out_dir = os.path.join(OUT, 'stations')
    ensure_dir(out_dir)

    gw_src = os.path.join(TILESET_DIR, 'Tileset Grass Water Summer.png')
    gw_img = Image.open(gw_src)
    # First animation frame (256x256)
    frame = gw_img.crop((0, 0, 256, 256))

    def gw_tile(col, row):
        x, y = col * 16, row * 16
        return frame.crop((x, y, x + 16, y + 16))

    # Border tiles identified by quadrant analysis:
    # Top row: TL=(3,3)=GMBB, T=(2,3)=GGBB, TR=(1,3)=MGBB
    # Edges: L=(7,1)=GMGM, R=(4,1)=MGMG
    # Bottom row: flipped top for clean symmetric bank
    # Water fill: (9,6)=WWWW
    tl = gw_tile(3, 3)
    t = gw_tile(2, 3)
    tr = gw_tile(1, 3)
    l = gw_tile(7, 1)
    r = gw_tile(4, 1)
    bl = tl.transpose(Image.FLIP_TOP_BOTTOM)
    b = t.transpose(Image.FLIP_TOP_BOTTOM)
    br = tr.transpose(Image.FLIP_TOP_BOTTOM)
    water = gw_tile(9, 6)

    WIDE, TALL = 6, 3  # 96x48 pixels
    pw, ph = WIDE * 16, TALL * 16
    pond = Image.new('RGBA', (pw, ph), (0, 0, 0, 0))

    # Corners
    pond.paste(tl, (0, 0), tl)
    pond.paste(tr, ((WIDE - 1) * 16, 0), tr)
    pond.paste(bl, (0, (TALL - 1) * 16), bl)
    pond.paste(br, ((WIDE - 1) * 16, (TALL - 1) * 16), br)

    # Edges
    for c in range(1, WIDE - 1):
        pond.paste(t, (c * 16, 0), t)
        pond.paste(b, (c * 16, (TALL - 1) * 16), b)
    for ri in range(1, TALL - 1):
        pond.paste(l, (0, ri * 16), l)
        pond.paste(r, ((WIDE - 1) * 16, ri * 16), r)

    # Water fill
    for ri in range(1, TALL - 1):
        for c in range(1, WIDE - 1):
            pond.paste(water, (c * 16, ri * 16), water)

    pond.save(os.path.join(out_dir, 'fishingPond.png'))
    print('Pond: 1 PNG (96x48 tileset composite)')


def extract_tree_decoration():
    """Extract decorative maple tree sprite."""
    out_dir = os.path.join(OUT, 'stations')
    ensure_dir(out_dir)

    maple_src = os.path.join(TREE_DIR, 'Common', 'No Shadow', 'Maple Tree.png')
    maple_img = Image.open(maple_src)
    # 32x64 green maple at (0, 32, 32, 96) — canopy + trunk
    tree = maple_img.crop((0, 32, 32, 96))
    tree.save(os.path.join(out_dir, 'tree.png'))

    print('Tree: 1 PNG (32x64 maple)')


if __name__ == '__main__':
    ensure_dir(OUT)
    print('Extracting farm sprites...')
    print('  Asset pack: {}'.format(PACK))
    print('  Output: {}'.format(OUT))
    print()
    extract_crops()
    extract_stations()
    extract_farmhouses()
    extract_ground_tiles()
    extract_pond_composite()
    extract_tree_decoration()
    print()
    print('Done!')
