#!/usr/bin/env python3
"""Converte as peças da mesa de tarô da Provação do Guerreiro (zip do Yuri: assets/*.png e intro_distribuir_cartas.mp4) para o site:
  - src/assets/images/guerreiro/*.webp (sem perda; a grade de pixel é a de 360x540, o jogo escala por inteiro/CSS pixelado)
  - public/videos/guerreiro/intro-v1.{av1,h264}.mp4 (720x1080, sem áudio)
Uso: python3 -I scripts/guerreiro/fatiar.py <pasta descompactada do zip>"""
import glob, os, subprocess, sys
from PIL import Image

ORIGEM = sys.argv[1]
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
IMG = os.path.join(RAIZ, 'src/assets/images/guerreiro/')
VID = os.path.join(RAIZ, 'public/videos/guerreiro/')
os.makedirs(IMG, exist_ok=True)
os.makedirs(VID, exist_ok=True)
for f in glob.glob(IMG + '*'):
    os.remove(f)

def salvar(origem, nome):
    im = Image.open(origem).convert('RGBA')
    im.save(IMG + nome + '.webp', 'WEBP', lossless=True, quality=100, method=6)
    print(f'{nome:22s} {im.size[0]}x{im.size[1]} {os.path.getsize(IMG + nome + ".webp") // 1024} KB')

A = os.path.join(ORIGEM, 'assets')
salvar(f'{A}/fundo_mesa_360x540.png', 'fundo-mesa')
salvar(f'{A}/fundo_mesa_compacto_360x360.png', 'fundo-compacto')
salvar(f'{A}/fundo_painel_detalhe_360x180.png', 'fundo-painel')
salvar(f'{A}/banner_titulo_190x63.png', 'banner')
salvar(f'{A}/botao_96x32.png', 'botao')
salvar(f'{A}/moldura_vazia_28x28.png', 'moldura')
for tam in ('34x51', '50x75', '96x144'):
    larg = tam.split('x')[0]
    for n in range(1, 11):
        salvar(f'{A}/cartas/carta_{n:02d}_{tam}.png', f'carta-{n}-{larg}')
    salvar(f'{A}/cartas/verso_{tam}.png', f'verso-{larg}')

VF = 'scale=360:540:flags=neighbor,scale=720:1080:flags=neighbor'
src = os.path.join(ORIGEM, 'intro_distribuir_cartas.mp4')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-an', '-vf', VF, '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', VID + 'intro-v1.h264.mp4'], check=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-an', '-vf', VF, '-c:v', 'libsvtav1', '-crf', '38', '-preset', '6', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', VID + 'intro-v1.av1.mp4'], check=True)
for f in sorted(glob.glob(VID + '*')):
    print(os.path.basename(f), os.path.getsize(f) // 1024, 'KB')
