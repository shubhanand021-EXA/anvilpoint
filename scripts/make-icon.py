"""Generate build/icon.png + build/icon.ico (original Anvilpoint mark, MIT)."""
from PIL import Image, ImageDraw, ImageFont
import os

BASE = os.path.join(os.path.dirname(__file__), "..", "build")
os.makedirs(BASE, exist_ok=True)

SIZE = 256
img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.rounded_rectangle([0, 0, SIZE - 1, SIZE - 1], radius=56, fill=(22, 24, 29, 255))

for candidate in (
    r"C:\Windows\Fonts\arialbd.ttf",
    r"C:\Windows\Fonts\segoeuib.ttf",
    "DejaVuSans-Bold.ttf",
    "arialbd.ttf",
):
    try:
        font = ImageFont.truetype(candidate, 150)
        break
    except OSError:
        continue
else:
    font = ImageFont.load_default()

d.text((SIZE / 2, SIZE / 2 - 78), "A", font=font, fill=(245, 158, 11, 255), anchor="ma")
d.rounded_rectangle([52, 208, 204, 220], radius=6, fill=(120, 113, 108, 255))

img.save(os.path.join(BASE, "icon.png"))
img.save(os.path.join(BASE, "icon.ico"), sizes=[(16, 16), (32, 32), (48, 48), (256, 256)])
print("wrote build/icon.png + build/icon.ico")
