#!/usr/bin/env python3
"""Converte as 3 arenas do Teste de Equipe do Yuri (arena_<teste>-<nome>_{360x540.png,loop4s.mp4}, vídeo de 4 s em laço) para o site:
  - o vídeo em 720x1080 (grade de pixel 2x), em AV1 e H.264, sem áudio: public/videos/teste-equipe/arena-<teste>-v1.{av1,h264}.mp4
  - a capa (a imagem parada) em WebP: public/images/teste-equipe/arenas/arena-<teste>-v1.webp
<teste> é alma, corpo ou mente. Uso: python3 -I scripts/batalha-sangrenta/arenas.py <pasta com os arquivos das arenas>"""
import glob, os, re, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

ORIGEM = sys.argv[1]
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
VIDEOS = os.path.join(RAIZ, 'public/videos/teste-equipe/')
CAPAS = os.path.join(RAIZ, 'public/images/teste-equipe/arenas/')
os.makedirs(VIDEOS, exist_ok=True)
os.makedirs(CAPAS, exist_ok=True)
for f in glob.glob(VIDEOS + 'arena-*') + glob.glob(CAPAS + '*'):
    os.remove(f)
VF = 'scale=360:540:flags=neighbor,scale=720:1080:flags=neighbor'

def tarefa(arq):
    n = re.match(r'arena_(alma|corpo|mente)-', os.path.basename(arq)).group(1)
    av1, h264 = f'{VIDEOS}arena-{n}-v1.av1.mp4', f'{VIDEOS}arena-{n}-v1.h264.mp4'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', arq, '-an', '-vf', VF, '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', h264], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', arq, '-an', '-vf', VF, '-c:v', 'libsvtav1', '-crf', '38', '-preset', '6', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', av1], check=True)
    im = Image.open(arq.replace('_loop4s.mp4', '_360x540.png')).convert('RGB').resize((720, 1080), Image.NEAREST)
    capa = f'{CAPAS}arena-{n}-v1.webp'
    im.save(capa, 'WEBP', lossless=True, quality=100, method=6)
    if os.path.getsize(capa) > 330 * 1024:
        im.save(capa, 'WEBP', quality=90, method=6)
    return n, os.path.getsize(av1), os.path.getsize(h264), os.path.getsize(capa)

arqs = sorted(glob.glob(os.path.join(ORIGEM, '**', 'arena_*_loop4s.mp4'), recursive=True))
assert len(arqs) == 3, len(arqs)
with ThreadPoolExecutor(2) as ex:
    for n, a, h, c in sorted(ex.map(tarefa, arqs)):
        print(f'arena {n:6s} av1 {a // 1024:4d} KB  h264 {h // 1024:4d} KB  capa {c // 1024:4d} KB', flush=True)
