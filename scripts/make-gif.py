"""Build docs/assets/ANVILPOINT-tour.gif from real Playwright screenshots."""
from PIL import Image, ImageDraw, ImageFont
import os

BASE = os.path.join(os.path.dirname(__file__), "..", "docs", "assets")
SHOTS = os.path.join(BASE, "shots")

FRAMES = [
    ("01-empty.png", "1 · Import any repository ZIP — 100% local, nothing uploaded"),
    ("02-overview.png", "2 · Instant readiness score — transparent, heuristic, honest"),
    ("03-analysis.png", "3 · Browse every file — binary-safe, budget-limited"),
    ("04-findings.png", "4 · Evidence-backed findings — filter by category, status, severity"),
    ("05-docs.png", "5 · Generate docs from verified facts — placeholders, never invented"),
    ("06-integrations.png", "6 · Optional live connect: GitHub & GitLab, token stays in memory"),
]

W = 960
BAR = 46
BG = (20, 22, 27)
ACCENT = (245, 158, 11)

try:
    font = ImageFont.truetype("DejaVuSans-Bold.ttf", 20)
except OSError:
    try:
        font = ImageFont.truetype("arialbd.ttf", 20)
    except OSError:
        font = ImageFont.load_default()

imgs = []
for name, caption in FRAMES:
    img = Image.open(os.path.join(SHOTS, name)).convert("RGB")
    img = img.resize((W, int(img.height * W / img.width)), Image.LANCZOS)
    canvas = Image.new("RGB", (W, img.height + BAR), BG)
    canvas.paste(img, (0, BAR))
    d = ImageDraw.Draw(canvas)
    d.rectangle([0, 0, W, BAR], fill=BG)
    d.rectangle([0, BAR - 3, W, BAR], fill=ACCENT)
    d.text((18, 11), caption, font=font, fill=(232, 234, 240))
    imgs.append(canvas)

out = os.path.join(BASE, "anvilpoint-tour.gif")
imgs[0].save(
    out, save_all=True, append_images=imgs[1:],
    duration=1600, loop=0, optimize=True,
)
size = os.path.getsize(out)
print(f"wrote {out} ({size / 1024:.0f} KB)")
