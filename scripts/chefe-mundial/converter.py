#!/usr/bin/env python3
"""Converte os 7 chefes mundiais do Yuri (zips chefes_mundiais_parte1/parte2) para o site. Cada chefe vem como CENA completa (arena com o
chefe já desenhado) em 4 vídeos de 1080x1620 (idle em laço de 4 s, ataque, furia em laço e golpe), mais a arena parada com e sem o chefe e a
camada do chefe sozinho (226x300).
Saída:
  - public/videos/chefe-mundial/<chefe>-<estado>-v1.{av1,h264}.mp4 (720x1080, sem áudio)
  - public/images/chefe-mundial/<chefe>-arena.webp (a cena parada, 720x1080: capa e fundo de "reduzir movimento")
  - public/images/chefe-mundial/<chefe>-camada.webp (o chefe sozinho, 226x300, para a tela)
Uso: python3 -I scripts/chefe-mundial/converter.py <pasta com os dois zips descompactados>"""
import glob, os, re, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

ORIGEM = sys.argv[1]
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
VIDEOS = os.path.join(RAIZ, 'public/videos/chefe-mundial/')
IMAGENS = os.path.join(RAIZ, 'public/images/chefe-mundial/')
ESTADOS = ('idle', 'ataque', 'furia', 'golpe')
os.makedirs(VIDEOS, exist_ok=True)
os.makedirs(IMAGENS, exist_ok=True)
for f in glob.glob(VIDEOS + '*') + glob.glob(IMAGENS + '*'):
    os.remove(f)
# a grade de pixel do Yuri é 360x540 (cada pixel dele é um bloco 3x3 no vídeo de 1080x1620): volta a ela e dobra
VF = 'scale=360:540:flags=neighbor,scale=720:1080:flags=neighbor'

def clipe(args):
    arq, chefe, estado = args
    av1, h264 = f'{VIDEOS}{chefe}-{estado}-v1.av1.mp4', f'{VIDEOS}{chefe}-{estado}-v1.h264.mp4'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', arq, '-an', '-vf', VF, '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', h264], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', arq, '-an', '-vf', VF, '-c:v', 'libsvtav1', '-crf', '38', '-preset', '6', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', av1], check=True)
    return chefe, estado, os.path.getsize(av1), os.path.getsize(h264)

tarefas, chefes = [], {}
for arq in sorted(glob.glob(os.path.join(ORIGEM, '**', 'chefe_mundial_*.mp4'), recursive=True)):
    m = re.match(r'chefe_mundial_(\w+?)_(\d)_(\w+)_(idle|ataque|furia|golpe)\.mp4$', os.path.basename(arq))
    dia, n, chefe, estado = m.groups()
    chefes[chefe] = (dia, int(n), os.path.dirname(arq))
    tarefas.append((arq, chefe, estado))
assert len(chefes) == 7 and len(tarefas) == 28, (len(chefes), len(tarefas))

for chefe, (dia, n, pasta) in chefes.items():
    cena = Image.open(os.path.join(pasta, f'arena_{dia}_{n}_{chefe}_com_chefe_360x540.png')).convert('RGB').resize((720, 1080), Image.NEAREST)
    cena.save(f'{IMAGENS}{chefe}-arena.webp', 'WEBP', lossless=True, quality=100, method=6)
    if os.path.getsize(f'{IMAGENS}{chefe}-arena.webp') > 330 * 1024:
        cena.save(f'{IMAGENS}{chefe}-arena.webp', 'WEBP', quality=90, method=6)
    camada = Image.open(os.path.join(pasta, f'chefe_{dia}_{n}_{chefe}_camada.png')).convert('RGBA')
    camada.save(f'{IMAGENS}{chefe}-camada.webp', 'WEBP', lossless=True, quality=100, method=6)

tot = [0, 0]
with ThreadPoolExecutor(2) as ex:
    for chefe, estado, a, h in ex.map(clipe, tarefas):
        tot = [tot[0] + a, tot[1] + h]
        print(f'{chefe:10s} {estado:7s} av1 {a // 1024:4d} KB  h264 {h // 1024:4d} KB', flush=True)
print('total av1', tot[0] // 1024, 'KB  h264', tot[1] // 1024, 'KB')
