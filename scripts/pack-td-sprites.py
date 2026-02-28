#!/usr/bin/env python3
"""Pack tower defense sprites into optimized sheets for the web game.

Reads raw assets from _asset-pack/tower-defense-2d-game-kit-v1.1/
and outputs game-ready sprite sheets to static/images/td/ plus
metadata JSON to static/data/td-sprites.json.

Usage:
    python3 scripts/pack-td-sprites.py
"""

import json
import os
from PIL import Image

# ── Paths ────────────────────────────────────────────────────────
PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PACK = os.path.join(PROJECT, '_asset-pack', 'tower-defense-2d-game-kit-v1.1')
OUT = os.path.join(PROJECT, 'static', 'images', 'td')
DATA_OUT = os.path.join(PROJECT, 'static', 'data')

ENEMY_DIR = os.path.join(PACK, 'monster-enemy-game-sprites', 'PNG')
ARCHER_DIR = os.path.join(PACK, 'archer-tower-game-assets', 'PNG')
MAGIC_DIR = os.path.join(PACK, 'magic-tower-game-assets', 'PNG')
SUPPORT_DIR = os.path.join(PACK, 'support-tower-game-assets', 'PNG')
STONE_DIR = os.path.join(PACK, 'stone-tower-game-assets', 'PNG')
EFFECTS_DIR = os.path.join(PACK, 'magic-effects-game-sprite', 'PNG')
MAPS_DIR = os.path.join(PACK, 'td-tilesets', 'tower-defense-game-tilesets', 'PNG')

# Target sizes
ENEMY_HEIGHT = 48      # enemies scaled to 48px tall
TOWER_SIZE = 48        # towers fit in 48x48 cell
EFFECT_HEIGHT = 64     # effects scaled to 64px tall
MAP_SIZE = (640, 480)  # map backgrounds

# ── Enemy definitions ────────────────────────────────────────────
# 5 animations we use (skip jump, run)
ENEMY_ANIMS = ['idle', 'walk', 'attack', 'hurt', 'die']
ENEMY_ANIM_SPEEDS = {
    'idle': 0.08,
    'walk': 0.06,
    'attack': 0.05,
    'hurt': 0.04,
    'die': 0.06,
}
ENEMY_COUNT = 10  # monsters 1-10

# ── Tower definitions ────────────────────────────────────────────
# Map tower type → list of 4 individual sprite filenames (levels 1-4)
# Selected by visual progression (small → large/ornate)
TOWER_SPRITES = {
    'tower-archer': {
        'dir': ARCHER_DIR,
        'files': ['2.png', '4.png', '10.png', '12.png'],
    },
    'tower-stone': {
        'dir': STONE_DIR,
        'files': ['49.png', '47.png', '52.png', '53.png'],
    },
    'tower-magic': {
        'dir': MAGIC_DIR,
        'files': ['2.png', '3.png', '4.png', '12.png'],
    },
    'tower-support': {
        'dir': SUPPORT_DIR,
        'files': ['1.png', '4.png', '7.png', '11.png'],
    },
}

# ── Effect definitions ───────────────────────────────────────────
EFFECTS = {
    'fire':   {'frames': 19, 'sample': 2},  # 19 → 10
    'freeze': {'frames': 16, 'sample': 2},  # 16 → 8
    'stone':  {'frames': 18, 'sample': 2},  # 18 → 9
    'zip':    {'frames': 14, 'sample': 2},  # 14 → 7
    'damage': {'frames': 10, 'sample': 1},  # 10 → 10
    'def':    {'frames': 10, 'sample': 1},  # 10 → 10
}
EFFECT_SPEEDS = {
    'fire': 0.04, 'freeze': 0.05, 'stone': 0.04,
    'zip': 0.03, 'damage': 0.05, 'def': 0.05,
}

# ── Map definitions ──────────────────────────────────────────────
MAP_BACKGROUNDS = [1, 2, 3]


def ensure_dir(path):
    os.makedirs(path, exist_ok=True)


def auto_trim(img):
    """Trim transparent padding from an RGBA image."""
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    bbox = img.getbbox()
    if bbox:
        return img.crop(bbox)
    return img


def scale_to_height(img, target_h):
    """Scale image to target height, maintaining aspect ratio."""
    if img.height == 0:
        return img
    ratio = target_h / img.height
    new_w = max(1, int(img.width * ratio))
    return img.resize((new_w, target_h), Image.LANCZOS)


def scale_to_fit(img, target_w, target_h):
    """Scale image to fit within target dimensions, maintaining aspect ratio."""
    if img.width == 0 or img.height == 0:
        return img
    ratio = min(target_w / img.width, target_h / img.height)
    new_w = max(1, int(img.width * ratio))
    new_h = max(1, int(img.height * ratio))
    return img.resize((new_w, new_h), Image.LANCZOS)


def center_in_cell(img, cell_w, cell_h):
    """Center an image in a cell of given size, transparent background."""
    cell = Image.new('RGBA', (cell_w, cell_h), (0, 0, 0, 0))
    x = (cell_w - img.width) // 2
    y = (cell_h - img.height) // 2
    cell.paste(img, (x, y), img)
    return cell


# ── Enemy sprite packing ────────────────────────────────────────

def pack_enemies():
    """Pack enemy sprite sheets: 10 monsters × 5 animations.

    Each output sheet: horizontal strip per animation, 5 rows stacked.
    Frames sampled every 2nd frame (20 → 10), trimmed, scaled to 48px height.
    """
    out_dir = os.path.join(OUT, 'enemies')
    ensure_dir(out_dir)
    metadata = {}

    for m in range(1, ENEMY_COUNT + 1):
        monster_dir = os.path.join(ENEMY_DIR, str(m))
        if not os.path.isdir(monster_dir):
            print('  WARNING: Monster {} dir not found, skipping'.format(m))
            continue

        anim_rows = []
        anim_meta = {}
        max_frame_w = 0

        for anim in ENEMY_ANIMS:
            # Collect frame files for this animation
            pattern = '_{}_'.format(anim)
            frames = sorted([f for f in os.listdir(monster_dir) if pattern in f])

            # Sample every 2nd frame
            sampled = frames[::2]
            frame_count = len(sampled)

            # Load, trim, scale each frame
            processed = []
            for fname in sampled:
                img = Image.open(os.path.join(monster_dir, fname)).convert('RGBA')
                img = auto_trim(img)
                img = scale_to_height(img, ENEMY_HEIGHT)
                processed.append(img)
                max_frame_w = max(max_frame_w, img.width)

            anim_rows.append((anim, processed, frame_count))

        if not anim_rows:
            continue

        # Determine uniform frame width (max across all animations)
        frame_w = max_frame_w
        frame_h = ENEMY_HEIGHT
        num_frames = max(len(row[1]) for row in anim_rows)

        # Build sheet: num_frames columns × 5 rows
        sheet_w = frame_w * num_frames
        sheet_h = frame_h * len(ENEMY_ANIMS)
        sheet = Image.new('RGBA', (sheet_w, sheet_h), (0, 0, 0, 0))

        for row_idx, (anim, processed, fc) in enumerate(anim_rows):
            for f_idx, frame_img in enumerate(processed):
                # Center frame in cell
                cell = center_in_cell(frame_img, frame_w, frame_h)
                sheet.paste(cell, (f_idx * frame_w, row_idx * frame_h), cell)

            anim_meta[anim] = {
                'row': row_idx,
                'frames': fc,
                'speed': ENEMY_ANIM_SPEEDS[anim],
            }

        out_path = os.path.join(out_dir, 'enemy-{}.png'.format(m))
        sheet.save(out_path, optimize=True)

        metadata[str(m)] = {
            'sheet': 'enemies/enemy-{}.png'.format(m),
            'frameW': frame_w,
            'frameH': frame_h,
            'animations': anim_meta,
        }

        print('  Monster {}: {}x{} ({} frames/anim, {}x{} per frame)'.format(
            m, sheet_w, sheet_h, num_frames, frame_w, frame_h))

    print('Enemies: {} sheets'.format(len(metadata)))
    return metadata


# ── Tower sprite packing ────────────────────────────────────────

def pack_towers():
    """Pack tower sprite sheets: vertical strips, 1 frame per level.

    Each tower type → 4 individual sprites (levels 1-4), trimmed, fit to 48x48.
    Output: 48 wide × (48 * 4) = 192 tall per sheet.
    """
    out_dir = os.path.join(OUT, 'towers')
    ensure_dir(out_dir)
    metadata = {}

    for tower_key, cfg in TOWER_SPRITES.items():
        src_dir = cfg['dir']
        files = cfg['files']
        frames = []

        for fname in files:
            path = os.path.join(src_dir, fname)
            if not os.path.exists(path):
                print('  WARNING: {} not found'.format(path))
                continue
            img = Image.open(path).convert('RGBA')
            img = auto_trim(img)
            img = scale_to_fit(img, TOWER_SIZE, TOWER_SIZE)
            img = center_in_cell(img, TOWER_SIZE, TOWER_SIZE)
            frames.append(img)

        if len(frames) < 4:
            print('  WARNING: {} only has {} frames, padding'.format(tower_key, len(frames)))
            while len(frames) < 4:
                frames.append(frames[-1] if frames else Image.new('RGBA', (TOWER_SIZE, TOWER_SIZE)))

        # Build vertical strip
        sheet = Image.new('RGBA', (TOWER_SIZE, TOWER_SIZE * 4), (0, 0, 0, 0))
        for i, frame in enumerate(frames[:4]):
            sheet.paste(frame, (0, i * TOWER_SIZE), frame)

        out_path = os.path.join(out_dir, '{}.png'.format(tower_key))
        sheet.save(out_path, optimize=True)

        metadata[tower_key] = {
            'sheet': 'towers/{}.png'.format(tower_key),
            'frameW': TOWER_SIZE,
            'frameH': TOWER_SIZE,
            'frames': 4,
        }

        print('  {}: {}x{}'.format(tower_key, TOWER_SIZE, TOWER_SIZE * 4))

    print('Towers: {} sheets'.format(len(metadata)))
    return metadata


# ── Effect sprite packing ───────────────────────────────────────

def pack_effects():
    """Pack effect sprite sheets: horizontal strips, sampled frames.

    Each effect → load frames, trim, scale to 64px height, pack horizontal.
    """
    out_dir = os.path.join(OUT, 'effects')
    ensure_dir(out_dir)
    metadata = {}

    for eff_name, cfg in EFFECTS.items():
        eff_dir = os.path.join(EFFECTS_DIR, eff_name)
        if not os.path.isdir(eff_dir):
            print('  WARNING: Effect dir {} not found'.format(eff_name))
            continue

        # Collect and sort frame files
        all_frames = sorted([f for f in os.listdir(eff_dir) if f.endswith('.png')])

        # Sample
        sample_rate = cfg['sample']
        sampled = all_frames[::sample_rate]
        frame_count = len(sampled)

        # Load, trim, scale
        processed = []
        max_w = 0
        for fname in sampled:
            img = Image.open(os.path.join(eff_dir, fname)).convert('RGBA')
            img = auto_trim(img)
            img = scale_to_height(img, EFFECT_HEIGHT)
            processed.append(img)
            max_w = max(max_w, img.width)

        if not processed:
            continue

        # Build horizontal strip with uniform frame width
        frame_w = max_w
        frame_h = EFFECT_HEIGHT
        sheet = Image.new('RGBA', (frame_w * frame_count, frame_h), (0, 0, 0, 0))

        for i, img in enumerate(processed):
            cell = center_in_cell(img, frame_w, frame_h)
            sheet.paste(cell, (i * frame_w, 0), cell)

        out_path = os.path.join(out_dir, 'fx-{}.png'.format(eff_name))
        sheet.save(out_path, optimize=True)

        metadata[eff_name] = {
            'sheet': 'effects/fx-{}.png'.format(eff_name),
            'frameW': frame_w,
            'frameH': frame_h,
            'frames': frame_count,
            'speed': EFFECT_SPEEDS[eff_name],
        }

        print('  {}: {}x{} ({} frames, {}x{} per frame)'.format(
            eff_name, sheet.width, sheet.height, frame_count, frame_w, frame_h))

    print('Effects: {} sheets'.format(len(metadata)))
    return metadata


# ── Map background packing ──────────────────────────────────────

def pack_maps():
    """Scale map backgrounds from 1920x1080 to 640x480."""
    out_dir = os.path.join(OUT, 'maps')
    ensure_dir(out_dir)
    metadata = {}

    for map_num in MAP_BACKGROUNDS:
        src = os.path.join(
            MAPS_DIR,
            'game_background_{}'.format(map_num),
            'game_background_{}.png'.format(map_num)
        )
        if not os.path.exists(src):
            print('  WARNING: Map {} not found'.format(map_num))
            continue

        img = Image.open(src).convert('RGBA')
        img = img.resize(MAP_SIZE, Image.LANCZOS)

        out_path = os.path.join(out_dir, 'map-{}.png'.format(map_num))
        img.save(out_path, optimize=True)

        metadata[str(map_num)] = 'maps/map-{}.png'.format(map_num)

        print('  Map {}: {}x{}'.format(map_num, MAP_SIZE[0], MAP_SIZE[1]))

    print('Maps: {} images'.format(len(metadata)))
    return metadata


# ── Metadata JSON ───────────────────────────────────────────────

def write_metadata(enemies, towers, effects, maps):
    """Write td-sprites.json with all sprite metadata."""
    ensure_dir(DATA_OUT)

    data = {
        'enemies': enemies,
        'towers': towers,
        'effects': effects,
        'maps': maps,
    }

    out_path = os.path.join(DATA_OUT, 'td-sprites.json')
    with open(out_path, 'w') as f:
        json.dump(data, f, indent=2)

    print('\nMetadata: {}'.format(out_path))


# ── Main ────────────────────────────────────────────────────────

if __name__ == '__main__':
    ensure_dir(OUT)
    print('Packing TD sprites...')
    print('  Asset pack: {}'.format(PACK))
    print('  Output: {}'.format(OUT))
    print()

    print('--- Enemies ---')
    enemies_meta = pack_enemies()
    print()

    print('--- Towers ---')
    towers_meta = pack_towers()
    print()

    print('--- Effects ---')
    effects_meta = pack_effects()
    print()

    print('--- Maps ---')
    maps_meta = pack_maps()
    print()

    write_metadata(enemies_meta, towers_meta, effects_meta, maps_meta)

    # Report total output size
    total_bytes = 0
    for root, dirs, files in os.walk(OUT):
        for f in files:
            total_bytes += os.path.getsize(os.path.join(root, f))
    print('Total output: {:.1f} KB'.format(total_bytes / 1024))
    print('\nDone!')
