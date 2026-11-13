"""Apoio comum às peças desenhadas por código (origem: codigo). Usa o motor do Pixel Art Studio.

Tudo é desenhado em 1x, na grade nativa, com a paleta nocthera-32 (o Sprite 'trava' cada cor na paleta).
"""
import json
import math
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SKILL = RAIZ.parent / ".claude" / "skills" / "pixel-art-studio" / "scripts"
sys.path.insert(0, str(SKILL))
from pixelstudio import Sprite  # noqa: E402

_pal = json.loads((RAIZ / "config" / "paleta-nocthera-32.json").read_text())["cores"]
C = dict(_pal)                       # nome -> "#rrggbb"
PALETA = list(C.values())


def novo(w, h):
    return Sprite(w, h, palette=PALETA)


def sh(pts, dx, dy):
    return [(x + dx, y + dy) for x, y in pts]


def forma(s, pts, mid, luz=(), sombra=(), luzc=None, sombrac=None):
    """Polígono com realce/sombra desenhados à mão (listas de polígonos recortados pela cor-base)."""
    s.polygon(pts, mid)
    for p in luz:
        s.polygon(p, luzc, only=mid)
    for p in sombra:
        s.polygon(p, sombrac, only=mid)


def trapezio(x0, y0, x1, y1, topo0, topo1):
    return [(x0, y0), (x1, y0), (x1 + topo1, y1), (x0 + topo0, y1)]


def faixa(pts_a, pts_b):
    """Polígono entre duas polilinhas (a ida, b a volta)."""
    return list(pts_a) + list(reversed(pts_b))


def arco_pts(cx, cy, r, a0, a1, n=24):
    return [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)),
             cy + r * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]


def crescente(cx, cy, r, a0, a1, larg, n=28, ry=None):
    """Lua crescente/golpe: borda externa circular, interna deslocada (afinando nas pontas)."""
    ry = ry or r
    ext, inte = [], []
    for i in range(n + 1):
        t = i / n
        a = math.radians(a0 + (a1 - a0) * t)
        f = math.sin(math.pi * t)          # 0 nas pontas, 1 no meio
        ext.append((cx + r * math.cos(a), cy + ry * math.sin(a)))
        inte.append((cx + (r - larg * f) * math.cos(a), cy + (ry - larg * f) * math.sin(a)))
    return faixa(ext, inte)


def salvar(s, nome, destino, escala=8):
    destino = Path(destino)
    destino.parent.mkdir(parents=True, exist_ok=True)
    s.save_png(str(destino))
    s.preview(f"/tmp/preview-{nome}.png", scale=escala, grid=False, labels=False)
    s.save_silhouette(f"/tmp/sil-{nome}.png", scale=4)
    return destino


def garantir_margem(s, m=2):
    """Desloca a arte (sem reamostrar) para deixar >= m px livres até a borda; o contorno de 1 px não é cortado."""
    caixa = s.composite().getchannel("A").getbbox()
    if not caixa:
        return
    x0, y0, x1, y1 = caixa
    dx = max(0, m - x0) - max(0, x1 - (s.w - m))
    dy = max(0, m - y0) - max(0, y1 - (s.h - m))
    if dx or dy:
        s.shift(dx, dy)
    x0, y0, x1, y1 = s.composite().getchannel("A").getbbox()
    if x0 < 1 or y0 < 1 or x1 > s.w - 1 or y1 > s.h - 1:
        print(f"AVISO: arte não cabe com margem ({x0},{y0},{x1},{y1}) em {s.w}x{s.h}")
