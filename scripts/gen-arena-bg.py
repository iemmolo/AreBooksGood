#!/usr/bin/env python3
"""Generate themed pixel-art dungeon arena backgrounds for the battle canvas.

Each dungeon gets a background matching its name/theme.
Output: static/images/pets/backgrounds/arena-*.png (200x200 each)
"""

import random
import os
from PIL import Image, ImageDraw

W, H = 200, 200
TILE = 16
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)),
                       'static', 'images', 'pets', 'backgrounds')
os.makedirs(OUT_DIR, exist_ok=True)


# ── Shared helpers ──────────────────────────────────

def new_image():
    img = Image.new('RGBA', (W, H), (0, 0, 0, 255))
    return img, ImageDraw.Draw(img)


def draw_tile(draw, x, y, size, color, grout, hi_str=12):
    r, g, b = color
    draw.rectangle([x, y, x + size - 1, y + size - 1], fill=grout)
    draw.rectangle([x + 1, y + 1, x + size - 2, y + size - 2], fill=color)
    hi = (min(r + hi_str, 255), min(g + hi_str, 255), min(b + hi_str, 255))
    sh = (max(r - 18, 0), max(g - 18, 0), max(b - 18, 0))
    draw.line([x + 1, y + 1, x + size - 3, y + 1], fill=hi)
    draw.line([x + 1, y + 2, x + 1, y + size - 3], fill=hi)
    draw.line([x + 2, y + size - 2, x + size - 2, y + size - 2], fill=sh)
    draw.line([x + size - 2, y + 2, x + size - 2, y + size - 2], fill=sh)
    if random.random() < 0.35:
        for _ in range(random.randint(1, 2)):
            cx = x + random.randint(3, max(3, size - 4))
            cy = y + random.randint(3, max(3, size - 4))
            draw.point((cx, cy), fill=(max(r - 14, 0), max(g - 14, 0), max(b - 14, 0)))


def draw_brick_rows(draw, start_y, end_y, tile_size, colors, grout, hi=12):
    for py in range(start_y, end_y, tile_size):
        row_idx = (py - start_y) // tile_size
        offset = (tile_size // 2) if (row_idx % 2 == 1) else 0
        for col in range(-1, W // tile_size + 2):
            x = col * tile_size + offset
            if x + tile_size < 0 or x >= W:
                continue
            draw_tile(draw, x, py, tile_size, random.choice(colors), grout, hi)


def apply_vignette(img, strength=55, start=0.55):
    for y in range(H):
        for x in range(W):
            dx = (x - W / 2) / (W / 2)
            dy = (y - H / 2) / (H / 2)
            dist = (dx * dx * 0.7 + dy * dy) ** 0.5
            if dist > start:
                darken = min(int((dist - start) * (strength / (1.0 - start))), strength)
                r, g, b, a = img.getpixel((x, y))
                img.putpixel((x, y), (max(r - darken, 0), max(g - darken, 0), max(b - darken, 0), a))


def apply_gradient(img, top_darken=0, bottom_darken=30):
    for y in range(H):
        t = y / H
        darken = int(top_darken + (bottom_darken - top_darken) * t)
        if darken <= 0:
            continue
        for x in range(W):
            r, g, b, a = img.getpixel((x, y))
            img.putpixel((x, y), (max(r - darken, 0), max(g - darken, 0), max(b - darken, 0), a))


def draw_glow(img, cx, cy, radius, color, intensity=40):
    cr, cg, cb = color
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            fx, fy = cx + dx, cy + dy
            if 0 <= fx < W and 0 <= fy < H:
                dist = (dx * dx + dy * dy) ** 0.5
                if 0 < dist < radius:
                    alpha = int(intensity * (1 - dist / radius))
                    r, g, b, a = img.getpixel((fx, fy))
                    r = min(r + int(cr / 255 * alpha), 255)
                    g = min(g + int(cg / 255 * alpha), 255)
                    b = min(b + int(cb / 255 * alpha), 255)
                    img.putpixel((fx, fy), (r, g, b, 255))


def draw_pillar(draw, img, px, start_y, h, base, hi, sh, dark):
    pw = 12
    draw.rectangle([px, start_y, px + pw - 1, start_y + h - 1], fill=base)
    draw.line([px, start_y, px, start_y + h - 1], fill=hi)
    draw.line([px + 1, start_y, px + 1, start_y + h - 1], fill=tuple((a+b)//2 for a,b in zip(hi, base)))
    draw.line([px + pw - 2, start_y, px + pw - 2, start_y + h - 1], fill=sh)
    draw.line([px + pw - 1, start_y, px + pw - 1, start_y + h - 1], fill=dark)
    for by in range(start_y + 15, start_y + h - 10, 30):
        draw.rectangle([px, by, px + pw - 1, by + 2], fill=sh)
        draw.line([px, by, px + pw - 1, by], fill=hi)
    draw.rectangle([px - 2, start_y, px + pw + 1, start_y + 4], fill=hi)
    draw.line([px - 2, start_y, px + pw + 1, start_y], fill=tuple(min(c+15,255) for c in hi))
    draw.rectangle([px - 2, start_y + h - 4, px + pw + 1, start_y + h - 1], fill=base)
    draw.line([px - 2, start_y + h - 1, px + pw + 1, start_y + h - 1], fill=dark)


def draw_torch(draw, img, tx, ty, flame_color=(255, 200, 60)):
    draw.rectangle([tx, ty + 2, tx + 2, ty + 6], fill=(100, 80, 50))
    fr, fg, fb = flame_color
    draw.point((tx + 1, ty + 1), fill=flame_color)
    draw.point((tx, ty), fill=(fr, max(fg - 30, 0), max(fb - 20, 0)))
    draw.point((tx + 2, ty), fill=(fr, max(fg - 30, 0), max(fb - 20, 0)))
    draw.point((tx + 1, ty - 1), fill=(max(fr - 20, 0), max(fg - 60, 0), max(fb - 40, 0)))
    draw_glow(img, tx + 1, ty, 6, flame_color, 40)


def save(img, name):
    path = os.path.join(OUT_DIR, name)
    img.save(path, optimize=True)
    sz = os.path.getsize(path)
    print(f'  {name} ({sz} bytes)')
    return path


# ── Arena generators ────────────────────────────────

def gen_cave():
    """Natural rocky cave — Grass Cavern."""
    random.seed(1)
    img, draw = new_image()
    # Rough stone walls (top)
    wall_colors = [(55, 58, 50), (62, 65, 55), (48, 52, 45), (58, 62, 52)]
    wall_grout = (32, 35, 28)
    draw_brick_rows(draw, 0, 48, TILE, wall_colors, wall_grout, 8)
    # Stalactites
    for sx in range(8, W - 8, random.randint(18, 30)):
        sh = random.randint(8, 22)
        sw = random.randint(3, 6)
        base_c = random.choice(wall_colors)
        for sy in range(sh):
            w = max(1, int(sw * (1 - sy / sh)))
            cx = sx + sw // 2
            c = tuple(max(v - sy, 0) for v in base_c)
            draw.line([cx - w // 2, 48 + sy, cx + w // 2, 48 + sy], fill=c)
    # Ledge
    draw.rectangle([0, 48, W, 52], fill=(50, 55, 44))
    draw.line([0, 48, W, 48], fill=(68, 72, 60))
    draw.line([0, 53, W, 53], fill=(35, 38, 30))
    # Floor — rough stone
    floor_colors = [(78, 82, 70), (85, 90, 76), (72, 76, 65), (90, 95, 80)]
    floor_grout = (45, 48, 38)
    draw_brick_rows(draw, 54, H + TILE, TILE, floor_colors, floor_grout)
    # Mossy patches
    for _ in range(12):
        mx = random.randint(10, W - 10)
        my = random.randint(70, H - 10)
        for dx in range(-3, 4):
            for dy in range(-2, 3):
                if random.random() < 0.5:
                    px, py = mx + dx, my + dy
                    if 0 <= px < W and 0 <= py < H:
                        r, g, b, a = img.getpixel((px, py))
                        img.putpixel((px, py), (max(r - 10, 0), min(g + 15, 255), max(b - 5, 0), 255))
    # Pillars
    p_base = (60, 64, 54)
    draw_pillar(draw, img, 3, 46, H - 56, p_base, (75, 80, 68), (42, 45, 38), (30, 33, 26))
    draw_pillar(draw, img, W - 15, 46, H - 56, p_base, (75, 80, 68), (42, 45, 38), (30, 33, 26))
    draw_torch(draw, img, 8, 72, (200, 230, 120))
    draw_torch(draw, img, W - 11, 72, (200, 230, 120))
    apply_vignette(img, 50, 0.5)
    return save(img, 'arena-cave.png')


def gen_volcanic():
    """Volcanic/lava arena — Ember Depths, Inferno Pit."""
    random.seed(2)
    img, draw = new_image()
    # Dark volcanic walls
    wall_colors = [(45, 30, 25), (52, 35, 28), (40, 28, 22), (48, 32, 26)]
    draw_brick_rows(draw, 0, 48, TILE, wall_colors, (25, 15, 12), 6)
    # Lava glow from top
    for y in range(40, 55):
        alpha = int(20 * (1 - abs(y - 48) / 10))
        for x in range(W):
            r, g, b, a = img.getpixel((x, y))
            img.putpixel((x, y), (min(r + alpha * 2, 255), min(g + alpha, 255), b, 255))
    # Ledge
    draw.rectangle([0, 48, W, 52], fill=(55, 30, 20))
    draw.line([0, 48, W, 48], fill=(80, 45, 30))
    # Cracked obsidian floor
    floor_colors = [(38, 32, 30), (44, 36, 33), (35, 28, 26), (48, 38, 34)]
    floor_grout = (22, 16, 14)
    draw_brick_rows(draw, 53, H + TILE, TILE, floor_colors, floor_grout, 6)
    # Lava cracks in floor
    for _ in range(8):
        cx = random.randint(20, W - 20)
        cy = random.randint(65, H - 15)
        length = random.randint(10, 30)
        for i in range(length):
            px = cx + random.randint(-1, 1)
            py = cy + i
            cx = px
            if 0 <= px < W and 0 <= py < H:
                draw.point((px, py), fill=(255, random.randint(120, 180), 30))
                draw_glow(img, px, py, 3, (255, 100, 20), 25)
    # Lava pools at edges
    for pool_x, pool_y in [(15, H - 25), (W - 25, H - 30), (W // 2, H - 15)]:
        for dx in range(-8, 9):
            for dy in range(-4, 5):
                dist = (dx * dx / 64 + dy * dy / 16) ** 0.5
                if dist < 1.0 and 0 <= pool_x + dx < W and 0 <= pool_y + dy < H:
                    bright = int(255 * (1 - dist * 0.5))
                    img.putpixel((pool_x + dx, pool_y + dy),
                                 (bright, int(bright * 0.45), 0, 255))
    # Rock pillars
    p_base = (50, 32, 26)
    draw_pillar(draw, img, 3, 46, H - 56, p_base, (65, 42, 34), (35, 22, 18), (22, 14, 10))
    draw_pillar(draw, img, W - 15, 46, H - 56, p_base, (65, 42, 34), (35, 22, 18), (22, 14, 10))
    draw_torch(draw, img, 8, 72, (255, 140, 40))
    draw_torch(draw, img, W - 11, 72, (255, 140, 40))
    draw_torch(draw, img, 8, 130, (255, 140, 40))
    draw_torch(draw, img, W - 11, 130, (255, 140, 40))
    apply_vignette(img, 45, 0.5)
    return save(img, 'arena-volcanic.png')


def gen_grotto():
    """Underwater grotto — Tidal Grotto, Storm Peaks."""
    random.seed(3)
    img, draw = new_image()
    # Wet stone walls
    wall_colors = [(40, 55, 65), (45, 60, 72), (38, 52, 62), (50, 65, 75)]
    draw_brick_rows(draw, 0, 48, TILE, wall_colors, (25, 35, 42), 8)
    # Dripping water streaks
    for sx in range(10, W - 10, random.randint(15, 25)):
        for sy in range(0, 50):
            if random.random() < 0.15:
                if 0 <= sx < W:
                    r, g, b, a = img.getpixel((sx, sy))
                    img.putpixel((sx, sy), (min(r + 8, 255), min(g + 15, 255), min(b + 20, 255), 255))
    # Ledge with barnacles
    draw.rectangle([0, 48, W, 53], fill=(45, 58, 68))
    draw.line([0, 48, W, 48], fill=(60, 75, 85))
    for bx in range(5, W - 5, random.randint(8, 15)):
        draw.point((bx, 49), fill=(70, 85, 75))
        draw.point((bx + 1, 50), fill=(65, 80, 70))
    # Wet stone floor
    floor_colors = [(60, 72, 80), (68, 80, 88), (55, 68, 76), (72, 85, 92)]
    draw_brick_rows(draw, 54, H + TILE, TILE, floor_colors, (35, 45, 52))
    # Water puddles
    for _ in range(6):
        px = random.randint(20, W - 20)
        py = random.randint(80, H - 15)
        for dx in range(-6, 7):
            for dy in range(-3, 4):
                dist = (dx * dx / 36 + dy * dy / 9) ** 0.5
                if dist < 1.0:
                    fx, fy = px + dx, py + dy
                    if 0 <= fx < W and 0 <= fy < H:
                        r, g, b, a = img.getpixel((fx, fy))
                        img.putpixel((fx, fy), (max(r - 10, 0), min(g + 5, 255), min(b + 20, 255), 255))
                        # Specular highlight
                        if abs(dx) < 2 and dy == -2:
                            img.putpixel((fx, fy), (min(r + 30, 255), min(g + 35, 255), min(b + 40, 255), 255))
    # Coral/crystal pillars
    p_base = (50, 65, 75)
    draw_pillar(draw, img, 3, 46, H - 56, p_base, (65, 80, 92), (35, 48, 58), (25, 35, 42))
    draw_pillar(draw, img, W - 15, 46, H - 56, p_base, (65, 80, 92), (35, 48, 58), (25, 35, 42))
    draw_torch(draw, img, 8, 72, (80, 180, 255))
    draw_torch(draw, img, W - 11, 72, (80, 180, 255))
    apply_vignette(img, 50, 0.5)
    # Slight blue tint overall
    for y in range(H):
        for x in range(W):
            r, g, b, a = img.getpixel((x, y))
            img.putpixel((x, y), (max(r - 3, 0), g, min(b + 4, 255), a))
    return save(img, 'arena-grotto.png')


def gen_crypt():
    """Dark crypt/tomb — Shadow Crypt, Bone Yard."""
    random.seed(4)
    img, draw = new_image()
    # Dark stone walls
    wall_colors = [(42, 38, 45), (48, 42, 50), (38, 34, 42), (45, 40, 48)]
    draw_brick_rows(draw, 0, 48, TILE, wall_colors, (24, 20, 28), 6)
    # Cobweb in corners
    for corner_x, dx_dir in [(0, 1), (W - 1, -1)]:
        for i in range(15):
            for j in range(15 - i):
                fx = corner_x + i * dx_dir
                fy = j
                if 0 <= fx < W and 0 <= fy < H and random.random() < 0.3:
                    r, g, b, a = img.getpixel((fx, fy))
                    img.putpixel((fx, fy), (min(r + 18, 255), min(g + 16, 255), min(b + 20, 255), 255))
    # Ledge
    draw.rectangle([0, 48, W, 53], fill=(40, 36, 44))
    draw.line([0, 48, W, 48], fill=(55, 50, 60))
    # Floor — cracked flagstones
    floor_colors = [(55, 50, 58), (62, 56, 65), (50, 45, 54), (58, 52, 62)]
    draw_brick_rows(draw, 54, H + TILE, TILE, floor_colors, (30, 26, 34))
    # Skull details on floor
    for _ in range(3):
        sx = random.randint(25, W - 25)
        sy = random.randint(90, H - 25)
        # Simple skull: circle + jaw
        for dx in range(-3, 4):
            for dy in range(-3, 3):
                if dx * dx + dy * dy <= 9:
                    fx, fy = sx + dx, sy + dy
                    if 0 <= fx < W and 0 <= fy < H:
                        img.putpixel((fx, fy), (85, 80, 75, 255))
        # Eye sockets
        draw.point((sx - 1, sy - 1), fill=(30, 26, 34))
        draw.point((sx + 1, sy - 1), fill=(30, 26, 34))
    # Dark pillars
    p_base = (45, 40, 50)
    draw_pillar(draw, img, 3, 46, H - 56, p_base, (58, 52, 64), (32, 28, 38), (20, 16, 24))
    draw_pillar(draw, img, W - 15, 46, H - 56, p_base, (58, 52, 64), (32, 28, 38), (20, 16, 24))
    draw_torch(draw, img, 8, 72, (180, 120, 255))
    draw_torch(draw, img, W - 11, 72, (180, 120, 255))
    apply_vignette(img, 60, 0.45)
    return save(img, 'arena-crypt.png')


def gen_vault():
    """Metallic tech vault — Tech Vault, Iron Forge."""
    random.seed(5)
    img, draw = new_image()
    # Metal panel walls
    panel_w = 20
    for col in range(0, W, panel_w):
        shade = random.choice([(70, 75, 80), (65, 70, 76), (75, 80, 85)])
        draw.rectangle([col, 0, col + panel_w - 1, 48], fill=shade)
        # Panel border
        draw.line([col, 0, col, 48], fill=(50, 55, 60))
        draw.line([col + panel_w - 1, 0, col + panel_w - 1, 48], fill=(50, 55, 60))
        # Rivet
        draw.point((col + panel_w // 2, 8), fill=(90, 95, 100))
        draw.point((col + panel_w // 2, 40), fill=(90, 95, 100))
        # Horizontal seam
        draw.line([col, 24, col + panel_w - 1, 24], fill=(55, 60, 65))
    # Ledge — metal beam
    draw.rectangle([0, 48, W, 53], fill=(80, 85, 90))
    draw.line([0, 48, W, 48], fill=(100, 105, 110))
    draw.line([0, 53, W, 53], fill=(55, 60, 65))
    # Grated metal floor
    floor_colors = [(72, 78, 82), (78, 84, 88), (68, 74, 78), (82, 88, 92)]
    floor_grout = (48, 52, 56)
    for py in range(54, H, TILE):
        for col in range(-1, W // TILE + 2):
            x = col * TILE
            color = random.choice(floor_colors)
            draw_tile(draw, x, py, TILE, color, floor_grout, 10)
            # Grate dots
            if random.random() < 0.3:
                for gx in range(x + 4, x + TILE - 3, 4):
                    for gy in range(py + 4, py + TILE - 3, 4):
                        if 0 <= gx < W and 0 <= gy < H:
                            draw.point((gx, gy), fill=(45, 50, 55))
    # Pipe details on walls
    pipe_y = 20
    draw.rectangle([0, pipe_y, W, pipe_y + 3], fill=(60, 65, 70))
    draw.line([0, pipe_y, W, pipe_y], fill=(85, 90, 95))
    draw.line([0, pipe_y + 3, W, pipe_y + 3], fill=(45, 50, 55))
    # Metal pillars
    p_base = (68, 73, 78)
    draw_pillar(draw, img, 3, 46, H - 56, p_base, (88, 93, 98), (50, 55, 60), (38, 42, 46))
    draw_pillar(draw, img, W - 15, 46, H - 56, p_base, (88, 93, 98), (50, 55, 60), (38, 42, 46))
    draw_torch(draw, img, 8, 72, (120, 200, 255))
    draw_torch(draw, img, W - 11, 72, (120, 200, 255))
    apply_vignette(img, 40, 0.55)
    return save(img, 'arena-vault.png')


def gen_grove():
    """Outdoor forest grove — Ancient Grove."""
    random.seed(6)
    img, draw = new_image()
    # Sky gradient at top
    for y in range(50):
        t = y / 50
        r = int(25 + 15 * t)
        g = int(35 + 20 * t)
        b = int(50 + 15 * t)
        draw.line([0, y, W, y], fill=(r, g, b))
    # Tree canopy (dark green masses)
    for tx in range(0, W, 25):
        tw = random.randint(20, 35)
        th = random.randint(15, 25)
        ty = random.randint(5, 25)
        for dx in range(-tw // 2, tw // 2):
            for dy in range(-th // 2, th // 2):
                dist = (dx * dx / (tw * tw / 4) + dy * dy / (th * th / 4)) ** 0.5
                if dist < 1.0:
                    fx, fy = tx + dx, ty + dy
                    if 0 <= fx < W and 0 <= fy < H:
                        shade = random.choice([(30, 55, 28), (35, 62, 32), (25, 48, 24), (38, 65, 35)])
                        img.putpixel((fx, fy), (*shade, 255))
    # Grass floor
    for y in range(50, H):
        for x in range(W):
            base_g = 55 + random.randint(-5, 5)
            shade = (28 + random.randint(-3, 3), base_g, 25 + random.randint(-3, 3))
            img.putpixel((x, y), (*shade, 255))
    # Stone path in center
    path_colors = [(75, 72, 65), (82, 78, 70), (70, 66, 60), (85, 80, 72)]
    for py in range(55, H, 12):
        for col in range(3, W // 12 - 2):
            x = col * 12 + (6 if (py // 12) % 2 else 0)
            if 30 < x < W - 42:
                draw_tile(draw, x, py, 12, random.choice(path_colors), (50, 48, 42), 8)
    # Tree trunks on sides
    for tx in [8, W - 14]:
        draw.rectangle([tx, 20, tx + 6, H - 5], fill=(55, 38, 25))
        draw.line([tx, 20, tx, H - 5], fill=(65, 48, 32))
        draw.line([tx + 6, 20, tx + 6, H - 5], fill=(40, 28, 18))
    # Roots
    for rx, rdir in [(14, 1), (W - 14, -1)]:
        for i in range(10):
            ry = H - 10 + random.randint(-5, 0)
            draw.point((rx + i * rdir, ry), fill=(50, 35, 22))
    draw_torch(draw, img, 10, 72, (180, 220, 100))
    draw_torch(draw, img, W - 13, 72, (180, 220, 100))
    apply_vignette(img, 50, 0.5)
    return save(img, 'arena-grove.png')


def gen_marsh():
    """Murky swamp — Poison Marsh, Fungal Depths."""
    random.seed(7)
    img, draw = new_image()
    # Murky sky/canopy
    for y in range(45):
        t = y / 45
        draw.line([0, y, W, y], fill=(int(22 + 10 * t), int(28 + 15 * t), int(18 + 8 * t)))
    # Hanging vines
    for vx in range(8, W - 8, random.randint(12, 20)):
        vine_len = random.randint(20, 45)
        for vy in range(vine_len):
            sway = int(2 * (0.5 + 0.5 * (((vy * 7 + vx) % 13) / 13.0)))
            px = vx + sway
            if 0 <= px < W and 0 <= vy < H:
                img.putpixel((px, vy), (30, 50 + random.randint(0, 15), 25, 255))
    # Swamp floor (mix of mud and water)
    for y in range(45, H):
        for x in range(W):
            noise = random.random()
            if noise < 0.3:  # water
                img.putpixel((x, y), (25 + random.randint(-3, 3), 42 + random.randint(-5, 5), 35 + random.randint(-3, 3), 255))
            else:  # mud
                img.putpixel((x, y), (48 + random.randint(-5, 5), 42 + random.randint(-5, 5), 30 + random.randint(-3, 3), 255))
    # Lily pads
    for _ in range(5):
        lx = random.randint(25, W - 25)
        ly = random.randint(80, H - 20)
        for dx in range(-4, 5):
            for dy in range(-3, 4):
                if dx * dx + dy * dy <= 12 and not (dx > 0 and dy == 0):
                    fx, fy = lx + dx, ly + dy
                    if 0 <= fx < W and 0 <= fy < H:
                        img.putpixel((fx, fy), (35, 70, 32, 255))
    # Mushrooms
    for _ in range(8):
        mx = random.randint(15, W - 15)
        my = random.randint(60, H - 10)
        cap_color = random.choice([(120, 60, 80), (80, 55, 100), (100, 70, 50)])
        # Stem
        draw.line([mx, my, mx, my + 4], fill=(90, 85, 75))
        # Cap
        draw.rectangle([mx - 2, my - 1, mx + 2, my], fill=cap_color)
        draw.point((mx, my - 2), fill=cap_color)
        # Glow
        draw_glow(img, mx, my, 4, cap_color, 15)
    # Gnarled tree trunks
    for tx in [5, W - 12]:
        for ty in range(10, H - 5):
            sway = int(1.5 * ((ty % 20) / 20.0 - 0.5))
            px = tx + sway
            for dx in range(5):
                if 0 <= px + dx < W:
                    img.putpixel((px + dx, ty), ((45, 35, 22) if dx in [0, 4] else (55, 42, 28))[0],)
                    # Ugh, fix this
                    c = (45, 35, 22) if dx in [0, 4] else (55, 42, 28)
                    img.putpixel((px + dx, ty), (*c, 255))
    apply_vignette(img, 55, 0.45)
    return save(img, 'arena-marsh.png')


def gen_spire():
    """Magical tower interior — Mystic Spire, Void Sanctum."""
    random.seed(8)
    img, draw = new_image()
    # Dark arcane walls
    wall_colors = [(38, 35, 52), (44, 40, 58), (35, 32, 48), (42, 38, 55)]
    draw_brick_rows(draw, 0, 48, TILE, wall_colors, (22, 20, 32), 8)
    # Arcane runes on wall
    rune_color = (120, 100, 180)
    for rx in range(20, W - 20, 30):
        ry = random.randint(10, 35)
        # Simple rune shapes
        draw.point((rx, ry), fill=rune_color)
        draw.point((rx - 1, ry + 1), fill=rune_color)
        draw.point((rx + 1, ry + 1), fill=rune_color)
        draw.point((rx, ry + 2), fill=rune_color)
        draw_glow(img, rx, ry + 1, 5, rune_color, 20)
    # Ledge
    draw.rectangle([0, 48, W, 53], fill=(45, 40, 60))
    draw.line([0, 48, W, 48], fill=(60, 55, 78))
    # Arcane floor — darker with magic circle
    floor_colors = [(48, 44, 62), (55, 50, 68), (42, 38, 56), (52, 48, 65)]
    draw_brick_rows(draw, 54, H + TILE, TILE, floor_colors, (28, 25, 38))
    # Magic circle in center of floor
    cx, cy = W // 2, 54 + (H - 54) // 2
    for angle_step in range(120):
        import math
        angle = angle_step * math.pi * 2 / 120
        for r in [28, 30]:
            px = int(cx + r * math.cos(angle))
            py = int(cy + r * 0.6 * math.sin(angle))
            if 0 <= px < W and 0 <= py < H:
                img.putpixel((px, py), (100, 80, 160, 255))
    # Inner circle
    for angle_step in range(60):
        import math
        angle = angle_step * math.pi * 2 / 60
        for r in [15, 16]:
            px = int(cx + r * math.cos(angle))
            py = int(cy + r * 0.6 * math.sin(angle))
            if 0 <= px < W and 0 <= py < H:
                img.putpixel((px, py), (120, 95, 180, 255))
    draw_glow(img, cx, cy, 20, (100, 80, 180), 12)
    # Crystal pillars
    p_base = (55, 50, 72)
    draw_pillar(draw, img, 3, 46, H - 56, p_base, (72, 65, 95), (38, 34, 52), (25, 22, 36))
    draw_pillar(draw, img, W - 15, 46, H - 56, p_base, (72, 65, 95), (38, 34, 52), (25, 22, 36))
    draw_torch(draw, img, 8, 72, (180, 140, 255))
    draw_torch(draw, img, W - 11, 72, (180, 140, 255))
    draw_torch(draw, img, 8, 130, (180, 140, 255))
    draw_torch(draw, img, W - 11, 130, (180, 140, 255))
    apply_vignette(img, 50, 0.5)
    return save(img, 'arena-spire.png')


def gen_abyss():
    """Dark void with floating platforms — Abyssal Rift, The Abyss."""
    random.seed(9)
    img, draw = new_image()
    # Deep void background
    for y in range(H):
        for x in range(W):
            dx = (x - W / 2) / (W / 2)
            dy = (y - H / 2) / (H / 2)
            dist = (dx * dx + dy * dy) ** 0.5
            base = int(12 + 8 * (1 - min(dist, 1.0)))
            img.putpixel((x, y), (base, base, int(base * 1.3), 255))
    # Stars/particles in void
    for _ in range(40):
        sx = random.randint(0, W - 1)
        sy = random.randint(0, H - 1)
        bright = random.randint(40, 80)
        img.putpixel((sx, sy), (bright, bright, int(bright * 1.2), 255))
    # Floating stone platform (main arena floor)
    plat_top = 55
    plat_left = 15
    plat_right = W - 15
    # Platform edge (dark underside visible)
    for y in range(plat_top + 2, plat_top + 10):
        t = (y - plat_top - 2) / 8
        shade = int(30 + 15 * (1 - t))
        draw.line([plat_left + int(t * 5), y, plat_right - int(t * 5), y], fill=(shade, shade - 2, shade + 5))
    # Platform surface
    floor_colors = [(52, 48, 58), (58, 54, 64), (48, 44, 54), (55, 50, 62)]
    for py in range(plat_top - 8, plat_top + 2, TILE):
        for col in range(-1, W // TILE + 2):
            x = col * TILE + ((TILE // 2) if ((py // TILE) % 2) else 0)
            if plat_left < x < plat_right - TILE:
                draw_tile(draw, x, py, TILE, random.choice(floor_colors), (30, 28, 36), 8)
    # Lower floor
    floor2_top = H - 70
    for py in range(floor2_top, H, TILE):
        row_idx = (py - floor2_top) // TILE
        offset = (TILE // 2) if (row_idx % 2 == 1) else 0
        for col in range(-1, W // TILE + 2):
            x = col * TILE + offset
            if x + TILE < 0 or x >= W:
                continue
            draw_tile(draw, x, py, TILE, random.choice(floor_colors), (30, 28, 36), 8)
    # Void energy streaks
    for _ in range(5):
        ex = random.randint(20, W - 20)
        ey = random.randint(30, H - 30)
        for i in range(8):
            px = ex + random.randint(-1, 1)
            py = ey + i * 2
            ex = px
            if 0 <= px < W and 0 <= py < H:
                img.putpixel((px, py), (60, 40, 100, 255))
                draw_glow(img, px, py, 3, (80, 50, 140), 15)
    # Floating rock pillars
    p_base = (45, 42, 55)
    draw_pillar(draw, img, 8, 40, H - 60, p_base, (60, 56, 72), (32, 30, 42), (20, 18, 28))
    draw_pillar(draw, img, W - 20, 40, H - 60, p_base, (60, 56, 72), (32, 30, 42), (20, 18, 28))
    apply_vignette(img, 60, 0.4)
    return save(img, 'arena-abyss.png')


def gen_arena():
    """Open-air colosseum — The Gauntlet, Golem Forge."""
    random.seed(10)
    img, draw = new_image()
    # Sky
    for y in range(35):
        t = y / 35
        draw.line([0, y, W, y], fill=(int(20 + 18 * t), int(22 + 20 * t), int(40 + 25 * t)))
    # Colosseum wall with arches
    wall_color = (75, 68, 60)
    draw.rectangle([0, 35, W, 55], fill=wall_color)
    # Arches
    for ax in range(15, W - 10, 25):
        draw.rectangle([ax, 36, ax + 16, 52], fill=(30, 28, 35))
        draw.rectangle([ax + 1, 36, ax + 15, 36], fill=(85, 78, 68))
        # Arch top (simple rectangle top)
        draw.rectangle([ax, 35, ax + 16, 37], fill=(82, 75, 66))
    # Top trim
    draw.rectangle([0, 33, W, 35], fill=(85, 78, 68))
    draw.line([0, 33, W, 33], fill=(95, 88, 78))
    # Ledge
    draw.rectangle([0, 55, W, 59], fill=(78, 72, 64))
    draw.line([0, 55, W, 55], fill=(92, 85, 75))
    draw.line([0, 59, W, 59], fill=(55, 50, 44))
    # Sandy stone floor
    floor_colors = [(95, 88, 75), (102, 94, 80), (88, 82, 70), (98, 90, 76)]
    draw_brick_rows(draw, 60, H + TILE, TILE, floor_colors, (62, 58, 50))
    # Center circle marking
    import math
    cx, cy = W // 2, 60 + (H - 60) // 2
    for angle_step in range(80):
        angle = angle_step * math.pi * 2 / 80
        for r in [25, 26]:
            px = int(cx + r * math.cos(angle))
            py = int(cy + r * 0.6 * math.sin(angle))
            if 0 <= px < W and 0 <= py < H:
                img.putpixel((px, py), (110, 100, 85, 255))
    # Stone pillars
    p_base = (80, 74, 65)
    draw_pillar(draw, img, 3, 53, H - 63, p_base, (98, 90, 80), (58, 54, 48), (42, 38, 34))
    draw_pillar(draw, img, W - 15, 53, H - 63, p_base, (98, 90, 80), (58, 54, 48), (42, 38, 34))
    # Brazier torches
    draw_torch(draw, img, 8, 78, (255, 180, 60))
    draw_torch(draw, img, W - 11, 78, (255, 180, 60))
    apply_vignette(img, 45, 0.55)
    return save(img, 'arena-colosseum.png')


def gen_castle():
    """Japanese castle interior — Ronin's Keep."""
    random.seed(11)
    img, draw = new_image()
    # Dark wood wall
    for y in range(50):
        for x in range(W):
            base = 42 + random.randint(-3, 3)
            img.putpixel((x, y), (base + 8, base, base - 8, 255))
    # Shoji screen panels
    for px in range(15, W - 15, 30):
        # Frame
        draw.rectangle([px, 5, px + 24, 45], fill=(55, 48, 35))
        # Paper
        draw.rectangle([px + 2, 7, px + 22, 43], fill=(80, 75, 65))
        # Cross bars
        draw.line([px + 12, 7, px + 12, 43], fill=(55, 48, 35))
        draw.line([px + 2, 25, px + 22, 25], fill=(55, 48, 35))
    # Wood beam
    draw.rectangle([0, 48, W, 54], fill=(60, 48, 32))
    draw.line([0, 48, W, 48], fill=(75, 62, 42))
    draw.line([0, 54, W, 54], fill=(40, 32, 20))
    # Tatami-style floor (woven pattern)
    for y in range(55, H):
        for x in range(W):
            # Alternating mat sections
            mat_x = (x // 24) % 2
            mat_y = (y // 24) % 2
            if mat_x == mat_y:
                base = 68 + random.randint(-2, 2)
                img.putpixel((x, y), (base + 5, base, base - 12, 255))
            else:
                base = 62 + random.randint(-2, 2)
                img.putpixel((x, y), (base + 3, base - 2, base - 15, 255))
            # Mat borders
            if x % 24 < 1 or y % 24 < 1:
                img.putpixel((x, y), (45, 38, 25, 255))
    # Wooden pillars
    p_base = (58, 45, 30)
    draw_pillar(draw, img, 3, 46, H - 56, p_base, (72, 58, 38), (42, 34, 22), (30, 24, 15))
    draw_pillar(draw, img, W - 15, 46, H - 56, p_base, (72, 58, 38), (42, 34, 22), (30, 24, 15))
    # Paper lanterns instead of torches
    for lx in [8, W - 11]:
        ly = 72
        draw.rectangle([lx, ly, lx + 3, ly + 6], fill=(180, 150, 100))
        draw.rectangle([lx - 1, ly - 1, lx + 4, ly], fill=(60, 48, 32))
        draw.rectangle([lx - 1, ly + 6, lx + 4, ly + 7], fill=(60, 48, 32))
        draw_glow(img, lx + 1, ly + 3, 6, (220, 180, 100), 30)
    apply_vignette(img, 45, 0.5)
    return save(img, 'arena-castle.png')


def gen_cathedral():
    """Gothic cathedral — Cursed Cathedral."""
    random.seed(12)
    img, draw = new_image()
    # Tall stone walls with pointed arch
    wall_colors = [(52, 50, 55), (58, 55, 60), (48, 46, 52)]
    draw_brick_rows(draw, 0, 48, TILE, wall_colors, (30, 28, 34), 8)
    # Pointed gothic arch in center
    import math
    arch_cx = W // 2
    arch_w = 40
    arch_h = 40
    for y in range(5, 46):
        t = (y - 5) / 40
        if t < 0.7:
            hw = int(arch_w / 2 * (t / 0.7))
        else:
            hw = int(arch_w / 2 * (1 - (t - 0.7) / 0.3))
        if hw > 0:
            # Stained glass colors
            for dx in range(-hw, hw + 1):
                fx = arch_cx + dx
                if 0 <= fx < W:
                    dt = abs(dx) / max(hw, 1)
                    # Multi-color stained glass
                    r = int(40 + 30 * (1 - dt))
                    g = int(25 + 15 * dt)
                    b = int(50 + 30 * (1 - dt))
                    img.putpixel((fx, y), (r, g, b, 255))
    # Arch frame
    for y in range(5, 46):
        t = (y - 5) / 40
        if t < 0.7:
            hw = int(arch_w / 2 * (t / 0.7))
        else:
            hw = int(arch_w / 2 * (1 - (t - 0.7) / 0.3))
        if hw > 0:
            for dx in [hw, -hw]:
                fx = arch_cx + dx
                if 0 <= fx < W:
                    img.putpixel((fx, y), (70, 65, 72, 255))
    # Ledge
    draw.rectangle([0, 48, W, 53], fill=(55, 52, 58))
    draw.line([0, 48, W, 48], fill=(72, 68, 75))
    # Checkered floor
    check_size = 12
    for y in range(54, H, check_size):
        for x in range(0, W, check_size):
            cx = x // check_size
            cy = (y - 54) // check_size
            if (cx + cy) % 2 == 0:
                color = (62, 58, 65)
            else:
                color = (48, 45, 52)
            draw.rectangle([x, y, x + check_size - 1, min(y + check_size - 1, H - 1)], fill=color)
            # Tile edge highlight
            draw.line([x, y, x + check_size - 1, y], fill=tuple(min(c + 8, 255) for c in color))
    # Stone pillars
    p_base = (58, 55, 62)
    draw_pillar(draw, img, 3, 46, H - 56, p_base, (72, 68, 78), (42, 40, 48), (30, 28, 34))
    draw_pillar(draw, img, W - 15, 46, H - 56, p_base, (72, 68, 78), (42, 40, 48), (30, 28, 34))
    # Candle-like torches
    draw_torch(draw, img, 8, 72, (200, 160, 100))
    draw_torch(draw, img, W - 11, 72, (200, 160, 100))
    draw_torch(draw, img, 8, 130, (200, 160, 100))
    draw_torch(draw, img, W - 11, 130, (200, 160, 100))
    apply_vignette(img, 55, 0.45)
    return save(img, 'arena-cathedral.png')


def gen_dungeon():
    """Classic stone dungeon — original arena (fallback)."""
    random.seed(42)
    img, draw = new_image()
    # Stone walls
    wall_colors = [(62, 58, 56), (70, 65, 62), (56, 52, 50), (66, 62, 58)]
    draw_brick_rows(draw, 0, 48, TILE, wall_colors, (35, 32, 30), 8)
    # Ledge
    draw.rectangle([0, 48, W, 55], fill=(60, 55, 50))
    draw.line([0, 48, W, 48], fill=(78, 72, 66))
    draw.line([0, 55, W, 55], fill=(40, 36, 33))
    # Standard stone floor
    floor_colors = [(92, 85, 78), (100, 92, 84), (108, 99, 90), (96, 88, 80)]
    draw_brick_rows(draw, 56, H + TILE, TILE, floor_colors, (52, 48, 44))
    # Pillars
    p_base = (72, 66, 60)
    draw_pillar(draw, img, 3, 46, H - 56, p_base, (95, 88, 80), (50, 46, 42), (40, 37, 34))
    draw_pillar(draw, img, W - 15, 46, H - 56, p_base, (95, 88, 80), (50, 46, 42), (40, 37, 34))
    draw_torch(draw, img, 8, 72, (255, 200, 60))
    draw_torch(draw, img, W - 11, 72, (255, 200, 60))
    draw_torch(draw, img, 8, 130, (255, 200, 60))
    draw_torch(draw, img, W - 11, 130, (255, 200, 60))
    apply_vignette(img, 55, 0.55)
    return save(img, 'arena-dungeon.png')


# ── Generate all ────────────────────────────────────

if __name__ == '__main__':
    print('Generating arena backgrounds...')
    gen_cave()       # Grass Cavern
    gen_volcanic()   # Ember Depths, Inferno Pit
    gen_grotto()     # Tidal Grotto, Storm Peaks
    gen_crypt()      # Shadow Crypt, Bone Yard
    gen_vault()      # Tech Vault, Iron Forge
    gen_grove()      # Ancient Grove
    gen_marsh()      # Poison Marsh, Fungal Depths
    gen_spire()      # Mystic Spire, Void Sanctum
    gen_abyss()      # Abyssal Rift, The Abyss
    gen_arena()      # The Gauntlet, Golem Forge
    gen_castle()     # Ronin's Keep
    gen_cathedral()  # Cursed Cathedral
    gen_dungeon()    # Fallback
    print('Done!')
