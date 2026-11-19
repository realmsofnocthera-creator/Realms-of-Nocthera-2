#!/usr/bin/env python3
"""Fatia as folhas de arte da Torre Celestial (do Yuri) em peças WebP em src/assets/images/torre/.

Uso: python3 -I scripts/torre/fatiar.py <fundos.png> <assets.png>
  fundos.png: os 4 fundos da torre (720x1080 cada) e o pergaminho, separados por faixas lisas
  assets.png: miniaturas dos andares, ícones, botões, barra e molduras em grade, sobre fundo liso
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

FUNDOS, ASSETS = sys.argv[1], sys.argv[2]
SAIDA = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src/assets/images/torre/')
os.makedirs(SAIDA, exist_ok=True)

def salvar(im, nome, q=88):
    im.save(SAIDA + nome + '.webp', 'WEBP', quality=q, method=6, alpha_quality=100)
    print(f'{nome:24s} {im.size[0]}x{im.size[1]} {os.path.getsize(SAIDA + nome + ".webp") // 1024} KB')

def tirar_fundo(im, cor, tol=30):
    """Deixa transparente o fundo liso que toca a borda do recorte."""
    a = np.array(im.convert('RGBA'))
    perto = np.abs(a[:, :, :3].astype(int) - np.array(cor)).sum(2) <= tol
    lab, _ = ndi.label(perto)
    borda = set(lab[0, :]) | set(lab[-1, :]) | set(lab[:, 0]) | set(lab[:, -1])
    borda.discard(0)
    a[np.isin(lab, list(borda)), 3] = 0
    return Image.fromarray(a)

# ---- fundos (faixas de 720 px) e pergaminho
f = Image.open(FUNDOS).convert('RGB')
for i, (x0, x1) in enumerate([(0, 720), (730, 1450), (1460, 2180), (2190, 2910)], 1):
    salvar(f.crop((x0, 0, x1, f.height)), f'fundo-{i}', 82)
perg = f.crop((2924, 0, f.width, f.height))
a = np.array(perg).astype(int)
fundo_perg = tuple(a[2, 2])
p = tirar_fundo(perg, fundo_perg, 40)
salvar(p.crop(p.getbbox()), 'pergaminho', 90)

# ---- assets em grade
A = Image.open(ASSETS).convert('RGB')
arr = np.array(A).astype(int)
BG = (34, 28, 46)
m = np.abs(arr - np.array(BG)).sum(2) > 30
m = ndi.binary_dilation(ndi.binary_closing(m, iterations=3), iterations=2)
lab, _ = ndi.label(m)
caixas = []
for s in ndi.find_objects(lab):
    h, w = s[0].stop - s[0].start, s[1].stop - s[1].start
    if h * w > 1500:
        caixas.append((s[0].start // 60, s[1].start, s[0].start, s[0].stop, s[1].stop))
caixas.sort()
NOMES = (
    [f'cenario-{i}' for i in range(1, 7)]
    + ['icone-bau', 'icone-casa', 'icone-cadeado', None, None, 'icone-torre', None, 'icone-sigilo']
    + ['botao-vermelho', 'botao-vermelho-escuro', 'botao-cinza']
    + ['barra-titulo', 'moldura-vazia', 'moldura-destaque', 'moldura-pequena']
)
assert len(caixas) == len(NOMES), (len(caixas), len(NOMES))
for (_, x0, y0, y1, x1), nome in zip(caixas, NOMES):
    if nome is None:  # cristais e moeda: o jogo já tem os seus
        continue
    peca = A.crop((x0, y0, x1, y1))
    peca = peca if nome.startswith('cenario') else tirar_fundo(peca, BG)
    if nome.startswith('cenario'):
        peca = tirar_fundo(peca, BG)
    peca = peca.crop(peca.getbbox()) if peca.getbbox() else peca
    salvar(peca, nome, 90)
