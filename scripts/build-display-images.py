"""Generate smaller display copies of project photos; originals and image content stay intact.
Requires Pillow. Run: python scripts/build-display-images.py
"""
from pathlib import Path
from PIL import Image, ImageOps
import json, hashlib

repo = Path(__file__).resolve().parent.parent
source_files = {
    'hero-lakeside': 'assets/images/hero-lakeside.webp',
    'hero-wuxiang': 'assets/images/hero-wuxiang.webp',
    'hero-tianshengqiao': 'assets/images/hero-tianshengqiao.webp',
    'node-tianshengqiao': 'nodes/n_tsq.jpg',
    'node-wuxiang': 'nodes/n_wx.jpg',
    'culture-dragon': 'assets/catalog/culture-luoshan-dragon.png',
}
output = repo / 'public/assets/display'
output.mkdir(parents=True, exist_ok=True)
manifest = []
for name, source in source_files.items():
    original = repo / 'public' / source
    with Image.open(original) as image:
        image = ImageOps.exif_transpose(image).convert('RGB')
        for width in [640, 960]:
            resized = image.copy()
            resized.thumbnail((width, 2400), Image.Resampling.LANCZOS)
            target = output / f'{name}-{width}.webp'
            resized.save(target, 'WEBP', quality=80, method=6)
            manifest.append({'source': source, 'sourceSha256': hashlib.sha256(original.read_bytes()).hexdigest(), 'output': target.relative_to(repo / 'public').as_posix(), 'dimensions': list(resized.size), 'bytes': target.stat().st_size})
(repo / 'reports/display-images-2026-10-07.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'copies':len(manifest), 'bytes':sum(row['bytes'] for row in manifest), 'originalsPreserved':True}))
