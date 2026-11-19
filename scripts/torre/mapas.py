#!/usr/bin/env python3
"""Converte os 30 mapas da Torre Celestial do Yuri (mapa_NN_andares_A-B_{360x540.png,animado.mp4}, vídeo de 4 s em laço) para o site:
  - o vídeo em 720x1080 (grade de pixel 2x), em AV1 e H.264, sem áudio: public/videos/torre/mapa-N-v1.{av1,h264}.mp4
  - a capa (a imagem parada) em WebP: public/images/torre/mapas/cenario-N.webp
Uso: python3 -I scripts/torre/mapas.py <pasta com os mapas descompactados> <versão>
Só converte os mapas que estão na pasta (mapa_NN_*): o resto fica como está. Os arquivos levam a versão no nome (mapa-N-v2), porque
ficam em cache por um ano, e os da versão anterior do mesmo mapa são apagados."""
import glob, os, re, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

ORIGEM = sys.argv[1]
VERSAO = int(sys.argv[2])
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
VIDEOS = os.path.join(RAIZ, 'public/videos/torre/')
CAPAS = os.path.join(RAIZ, 'public/images/torre/mapas/')
os.makedirs(VIDEOS, exist_ok=True)
os.makedirs(CAPAS, exist_ok=True)
# a grade de pixel do Yuri é 360x540 (cada pixel dele é um bloco 3x3 no vídeo de 1080x1620): volta a ela e dobra
VF = 'scale=360:540:flags=neighbor,scale=720:1080:flags=neighbor'

def tarefa(arq):
    n = int(re.match(r'mapa_(\d+)_', os.path.basename(arq)).group(1))
    av1, h264 = f'{VIDEOS}mapa-{n}-v{VERSAO}.av1.mp4', f'{VIDEOS}mapa-{n}-v{VERSAO}.h264.mp4'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', arq, '-an', '-vf', VF, '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', h264], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', arq, '-an', '-vf', VF, '-c:v', 'libsvtav1', '-crf', '38', '-preset', '6', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', av1], check=True)
    png = glob.glob(os.path.join(os.path.dirname(arq), f'mapa_{n:02d}_*_360x540.png'))[0]
    im = Image.open(png).convert('RGB').resize((720, 1080), Image.NEAREST)
    capa = f'{CAPAS}cenario-{n}-v{VERSAO}.webp'
    im.save(capa, 'WEBP', lossless=True, quality=100, method=6)
    if os.path.getsize(capa) > 330 * 1024:
        im.save(capa, 'WEBP', quality=90, method=6)
    # apaga os arquivos antigos do mesmo mapa (de outras versões)
    for antigo in glob.glob(f'{VIDEOS}mapa-{n}-v*') + glob.glob(f'{CAPAS}cenario-{n}-v*.webp'):
        if f'-v{VERSAO}.' not in os.path.basename(antigo):
            os.remove(antigo)
    return n, os.path.getsize(av1), os.path.getsize(h264), os.path.getsize(capa)

por_mapa = {}
for arq in sorted(glob.glob(os.path.join(ORIGEM, '**', 'mapa_*_animado.mp4'), recursive=True)):
    por_mapa.setdefault(int(re.match(r'mapa_(\d+)_', os.path.basename(arq)).group(1)), arq)  # cópias repetidas valem uma só
arqs = [por_mapa[n] for n in sorted(por_mapa)]
print(len(arqs), 'mapas:', sorted(por_mapa))
tot = [0, 0, 0]
with ThreadPoolExecutor(2) as ex:
    for n, a, h, c in sorted(ex.map(tarefa, arqs)):
        tot = [tot[0] + a, tot[1] + h, tot[2] + c]
        print(f'mapa {n:2d}  av1 {a // 1024:4d} KB  h264 {h // 1024:4d} KB  capa {c // 1024:4d} KB', flush=True)
print('total av1', tot[0] // 1024, 'KB  h264', tot[1] // 1024, 'KB  capas', tot[2] // 1024, 'KB')
