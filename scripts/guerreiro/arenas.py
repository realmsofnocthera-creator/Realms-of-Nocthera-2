#!/usr/bin/env python3
"""Converte as 10 arenas da Provação do Guerreiro do Yuri (arena_<ROMANO>-<nome>_{360x540.png,animada_4s.mp4}, vídeo de 4 s em laço) para o site:
  - o vídeo em 720x1080 (grade de pixel 2x), em AV1 e H.264, sem áudio: public/videos/guerreiro/arena-N-v1.{av1,h264}.mp4
  - a capa (a imagem parada) em WebP: public/images/guerreiro/arenas/arena-N-v1.webp
N é a dificuldade (1 a 10). Uso: python3 -I scripts/guerreiro/arenas.py <pasta com os arquivos das arenas>"""
import glob, os, re, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

ORIGEM = sys.argv[1]
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
VIDEOS = os.path.join(RAIZ, 'public/videos/guerreiro/')
CAPAS = os.path.join(RAIZ, 'public/images/guerreiro/arenas/')
ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
os.makedirs(VIDEOS, exist_ok=True)
os.makedirs(CAPAS, exist_ok=True)
for f in glob.glob(VIDEOS + 'arena-*') + glob.glob(CAPAS + '*'):
    os.remove(f)
# a grade de pixel do Yuri é 360x540 (cada pixel dele é um bloco 3x3 no vídeo de 1080x1620): volta a ela e dobra
VF = 'scale=360:540:flags=neighbor,scale=720:1080:flags=neighbor'

def tarefa(arq):
    n = ROMANOS.index(re.match(r'arena_([IVX]+)-', os.path.basename(arq)).group(1)) + 1
    av1, h264 = f'{VIDEOS}arena-{n}-v1.av1.mp4', f'{VIDEOS}arena-{n}-v1.h264.mp4'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', arq, '-an', '-vf', VF, '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', h264], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', arq, '-an', '-vf', VF, '-c:v', 'libsvtav1', '-crf', '38', '-preset', '6', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', av1], check=True)
    png = arq.replace('_animada_4s.mp4', '_360x540.png')
    im = Image.open(png).convert('RGB').resize((720, 1080), Image.NEAREST)
    capa = f'{CAPAS}arena-{n}-v1.webp'
    im.save(capa, 'WEBP', lossless=True, quality=100, method=6)
    if os.path.getsize(capa) > 330 * 1024:
        im.save(capa, 'WEBP', quality=90, method=6)
    return n, os.path.getsize(av1), os.path.getsize(h264), os.path.getsize(capa)

arqs = sorted(glob.glob(os.path.join(ORIGEM, '**', 'arena_*_animada_4s.mp4'), recursive=True))
assert len(arqs) == 10, len(arqs)
tot = [0, 0, 0]
with ThreadPoolExecutor(2) as ex:
    for n, a, h, c in sorted(ex.map(tarefa, arqs)):
        tot = [tot[0] + a, tot[1] + h, tot[2] + c]
        print(f'arena {n:2d}  av1 {a // 1024:4d} KB  h264 {h // 1024:4d} KB  capa {c // 1024:4d} KB', flush=True)
print('total av1', tot[0] // 1024, 'KB  h264', tot[1] // 1024, 'KB  capas', tot[2] // 1024, 'KB')
