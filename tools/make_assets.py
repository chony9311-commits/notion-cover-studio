"""Builds og-image.png (1200x630) and apple-touch-icon.png (180x180)
with the same palette and type as the site's default preset."""
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
COLORS = ["#ffe7d8", "#f8c7be", "#d9a3a6"]
ANGLE = 135
INK = (36, 28, 26)

def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

def gradient(w, h, colors, angle_deg):
    rad = math.radians(angle_deg - 90)
    cx, cy = w / 2, h / 2
    length = abs(w * math.cos(rad)) + abs(h * math.sin(rad))
    x0, y0 = cx - math.cos(rad) * length / 2, cy - math.sin(rad) * length / 2
    ys, xs = np.mgrid[0:h, 0:w]
    t = ((xs - x0) * math.cos(rad) + (ys - y0) * math.sin(rad)) / length
    t = np.clip(t, 0, 1)
    rgb = [hex2rgb(c) for c in colors]
    out = np.zeros((h, w, 3), dtype=np.float64)
    stops = np.linspace(0, 1, len(rgb))
    for ch in range(3):
        out[..., ch] = np.interp(t, stops, [c[ch] for c in rgb])
    return out

base = gradient(W, H, COLORS, ANGLE)

# depth: radial darkening toward the edges (matches drawDepth)
ys, xs = np.mgrid[0:H, 0:W]
cx, cy = W / 2, H / 2
dist = np.sqrt((xs - cx) ** 2 + (ys - cy) ** 2)
inner, outer = min(W, H) * 0.2, max(W, H) * 0.78
k = np.clip((dist - inner) / (outer - inner), 0, 1) ** 1.6
base = base * (1 - 0.10 * k[..., None])

# grain
rng = np.random.default_rng(7)
noise = rng.normal(0, 5.2, (H, W, 1))
base = np.clip(base + noise, 0, 255).astype(np.uint8)
img = Image.fromarray(base, "RGB")

d = ImageDraw.Draw(img)
playfair = ImageFont.truetype("tools/fonts/Playfair.ttf", 96)
inter = ImageFont.truetype("tools/fonts/Inter.ttf", 20)

def tracked(draw, text, font, y, fill, tracking):
    widths = [draw.textlength(ch, font=font) for ch in text]
    total = sum(widths) + tracking * (len(text) - 1)
    x = (W - total) / 2
    for ch, w in zip(text, widths):
        draw.text((x, y), ch, font=font, fill=fill)
        x += w + tracking

text = "Ideas worth keeping"
bbox = d.textbbox((0, 0), text, font=playfair)
tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
d.text(((W - tw) / 2 - bbox[0], (H - th) / 2 - bbox[1] - 6), text, font=playfair, fill=INK)

tracked(d, "NOTION COVER STUDIO", inter, H - 92, (36, 28, 26, 150), 5.2)
img.save("og-image.png", optimize=True)

# apple touch icon: rounded gradient square with an N
icon = gradient(180, 180, COLORS, 135)
icon = np.clip(icon + rng.normal(0, 2.5, (180, 180, 1)), 0, 255).astype(np.uint8)
ic = Image.fromarray(icon, "RGB").convert("RGBA")
mask = Image.new("L", (180, 180), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, 179, 179], radius=40, fill=255)
ic.putalpha(mask)
draw = ImageDraw.Draw(ic)
draw.text((90, 96), "N", font=ImageFont.truetype("tools/fonts/Playfair.ttf", 108), fill=INK, anchor="mm")
ic.save("apple-touch-icon.png", optimize=True)
print("done", img.size)
