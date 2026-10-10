"""Make small 1-bit Floyd–Steinberg prints; retain every original mascot PNG.

Optional asset rebuild: python3 web/scripts/ink-art.py (requires Pillow).
The committed PNGs are runtime assets; the Vite build needs no Python.
"""
from pathlib import Path
from PIL import Image

art = Path(__file__).resolve().parents[1] / 'public' / 'art'
(art / 'ink').mkdir(exist_ok=True)
for name, size in [('logo', 128), ('mascot', 320), ('hero', 360)]:
    original = Image.open(art / f'{name}.png').convert('RGBA')
    original.thumbnail((size, size), Image.Resampling.LANCZOS)
    paper = Image.new('RGBA', original.size, '#000000')
    paper.alpha_composite(original)
    # Mode 1 stores one bit per pixel, with error-diffusion dithering.
    ink = paper.convert('L').convert('1', dither=Image.Dither.FLOYDSTEINBERG)
    ink.save(art / 'ink' / f'{name}.png', optimize=True)
