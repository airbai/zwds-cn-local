import sys, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import json
raw, out, font = sys.argv[1], sys.argv[2], sys.argv[3]
HEADS = json.loads(sys.argv[4]) if len(sys.argv) > 4 else None
FACE = int(sys.argv[5]) if len(sys.argv) > 5 else 0
LATIN = sys.argv[6] if len(sys.argv) > 6 else font
W, H = 1290, 2796
INK=(11,13,18); PAPER=(239,230,211); GOLD=(203,168,105); CIN=(200,68,46)
def glow(cx, cy, r, color, alpha):
    g = Image.new('RGBA', (W, H), (0,0,0,0)); ImageDraw.Draw(g).ellipse([cx-r, cy-r, cx+r, cy+r], fill=color+(alpha,))
    return g.filter(ImageFilter.GaussianBlur(r*0.5))
def wrap(d, text, f, maxw):
    lines, cur = [], ''
    for w in text.split():
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=f) <= maxw: cur = t
        else: lines.append(cur); cur = w
    return lines + [cur]
SHOTS = [('today','Your day, read from your own stars'),('chart','Twelve palaces. One clear chart.'),('detail','Every star, explained in plain words'),
         ('ask','Ask anything. Every answer cites your chart.'),('today2','The four currents of the day, and the season you are in')]
if HEADS: SHOTS = [(n, h) for (n, _), h in zip(SHOTS, HEADS)]
for n,(name,head) in enumerate(SHOTS,1):
    im = Image.new('RGBA', (W, H), INK+(255,))
    im.alpha_composite(glow(int(W*0.85), 150, 700, GOLD, 40)); im.alpha_composite(glow(60, H-200, 620, CIN, 26))
    d = ImageDraw.Draw(im); random.seed(n)
    for _ in range(70):
        x,y = random.random()*W, random.random()*620
        if 100 < y < 620 and 70 < x < W-70: continue  # keep the headline clear
        r = random.choice([1.5,2,2.5,3.5]); d.ellipse([x-r,y-r,x+r,y+r], fill=PAPER+(random.randint(40,150),))
    small = ImageFont.truetype(LATIN, 44); d.text((W/2, 150), 'I N K S T A R', font=small, fill=GOLD, anchor='mm')
    f = ImageFont.truetype(font, 92 if HEADS else 104, index=FACE); lines = head.split('\n') if HEADS else wrap(d, head, f, W-200)
    y = 250
    for ln in lines: d.text((W/2, y), ln, font=f, fill=PAPER, anchor='ma'); y += 118
    shot = Image.open(f'{raw}/{name}.png').convert('RGBA')
    sw = 1010; top = 250 + 118*len(lines) + 70; sh = min(int(shot.height*sw/shot.width), H - top + 40)
    shot = shot.resize((sw, int(shot.height*sw/shot.width)), Image.LANCZOS).crop((0, 0, sw, sh))
    mask = Image.new('L', (sw, sh), 0); ImageDraw.Draw(mask).rounded_rectangle([0,0,sw-1,sh+200], radius=78, fill=255)
    x0 = (W-sw)//2
    shadow = Image.new('RGBA', (W, H), (0,0,0,0)); ImageDraw.Draw(shadow).rounded_rectangle([x0-6, top-6, x0+sw+6, top+sh+200], radius=84, fill=(0,0,0,150))
    im.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(40)))
    im.paste(shot, (x0, top), mask)
    ImageDraw.Draw(im).rounded_rectangle([x0-2, top-2, x0+sw+1, top+sh+200], radius=80, outline=GOLD+(150,), width=3)
    im.convert('RGB').save(f'{out}/{n:02d}-{name}.png'); print(n, name, len(lines), 'lines')
