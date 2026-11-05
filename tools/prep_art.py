# Подготовка арта: ресайз + зимняя тонировка + WebP.
# Запуск: python -I tools/prep_art.py  (нужен Pillow, паки в assets/raw)
import os
from PIL import Image, ImageEnhance

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'assets', 'raw')
ART = os.path.join(ROOT, 'assets', 'art')
IG = os.path.join(RAW, 'island-gui', 'Island-game-gui', 'png')
PZ = os.path.join(RAW, 'park-zone', 'PNG')
VB = os.path.join(RAW, 'village-buildings', 'PNG')
os.makedirs(ART, exist_ok=True)

def winterize(im, sat=0.45, hue_shift=-12, bright=0.97):
    """Зимняя тонировка: десатурация + сдвиг тона к холодному."""
    im = im.convert('RGBA')
    a = im.getchannel('A')
    rgb = im.convert('RGB').convert('HSV')
    h, s, v = rgb.split()
    s = s.point(lambda x: int(x * sat))
    h = h.point(lambda x: (x + hue_shift) % 256)
    rgb = Image.merge('HSV', (h, s, v)).convert('RGB')
    rgb = ImageEnhance.Brightness(rgb).enhance(bright)
    out = rgb.convert('RGBA')
    out.putalpha(a)
    return out

def save(im, name, width=None, quality=82):
    """WebP с ресайзом по ширине (2x от логического размера)."""
    if width and im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    path = os.path.join(ART, name + '.webp')
    im.save(path, 'WEBP', quality=quality)
    return f'{name}: {os.path.getsize(path)//1024} КБ'

log = []

# ── UI: Island GUI ──
log.append(save(Image.open(f'{IG}/frames/paused.png'), 'ui-panel'))
for src, dst in [('normal/long', 'ui-btn-long'), ('normal/medium', 'ui-btn-medium'),
                 ('normal/round', 'ui-btn-round'), ('normal/small', 'ui-btn-small')]:
    im = Image.open(f'{IG}/buttons/{src}.png')
    log.append(save(im, dst))
    # нажатая: темнее и чуть ниже контраста
    dn = ImageEnhance.Brightness(im.convert('RGBA')).enhance(0.8)
    log.append(save(dn, dst + '-down'))
log.append(save(Image.open(f'{IG}/images/energy.png'), 'ui-energy'))
log.append(save(Image.open(f'{IG}/images/coin.png'), 'ui-coin'))
log.append(save(Image.open(f'{IG}/images/star.png'), 'ui-star'))
log.append(save(Image.open(f'{IG}/images/clock.png'), 'ui-clock'))

# ── Карта: небо и даль Park Zone ──
log.append(save(Image.open(f'{PZ}/Background/Day/Park_Zone_Tileset_BackgroundD1.png'), 'map-sky', width=1440))
log.append(save(Image.open(f'{PZ}/Background/Day/Park_Zone_Tileset_BackgroundD4.png'), 'map-treeline', width=1440))
log.append(save(winterize(Image.open(f'{PZ}/Background/Day/Park_Zone_Tileset_BackgroundD4.png'), sat=0.5), 'map-treeline-winter', width=1440))

# ── Деревья и кусты (озимённые) ──
for src, dst in [('Tree1', 'map-tree1'), ('Tree2', 'map-tree2'), ('Tree3', 'map-tree3')]:
    log.append(save(winterize(Image.open(f'{PZ}/Objects/Other/Park_Zone_Tileset_{src}.png')), dst, width=340))
for src, dst in [('Bush1', 'map-bush1'), ('Bush13', 'map-bush2'), ('Bush15', 'map-bush3')]:
    log.append(save(winterize(Image.open(f'{PZ}/Objects/Bushes/Park_Zone_Tileset_{src}.png')), dst, width=200))

# ── Рамка заказ-бланка из Xmas GUI ──
log.append(save(Image.open(f'{RAW}/xmas-gui/PNG/Level_Completed/Window.png'), 'ui-order-frame'))

# ── Здания (пережим) ──
for f in ['b-wood-warehouse', 'b-wood-house', 'b-brick-warehouse', 'b-brick-house']:
    log.append(save(Image.open(os.path.join(ART, f + '.png')), f))
# форт = большой кирпичный дом (уровень 4)
log.append(save(Image.open(f'{VB}/Houses and Warehouses_Brick House - Level 4.png'), 'b-fort', width=420))
# домик для титула
log.append(save(Image.open(f'{VB}/Houses and Warehouses_Wooden House - Level 2.png'), 'b-title-house', width=420))

# старые png-дубли больше не нужны в билде
for f in ['b-wood-warehouse.png', 'b-wood-house.png', 'b-brick-warehouse.png', 'b-brick-house.png', 'ribbon.png']:
    p = os.path.join(ART, f)
    if os.path.exists(p):
        os.remove(p)
        log.append(f'удалён старый {f}')

print('\n'.join(log))
total = sum(os.path.getsize(os.path.join(ART, f)) for f in os.listdir(ART))
print(f'ИТОГО арт: {total//1024} КБ')
