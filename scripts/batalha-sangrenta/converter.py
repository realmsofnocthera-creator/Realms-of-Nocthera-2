#!/usr/bin/env python3
"""Converte as peças da tela da Batalha Sangrenta do Yuri (zip tela_batalha_sangrenta: px/*.png e fundo_coliseu_360x540.png, grade 360x540)
para public/images/batalha-sangrenta/*.webp (sem perda; _ vira -). Só entram as peças que a tela usa.
Uso: python3 -I scripts/batalha-sangrenta/converter.py <pasta descompactada do zip>"""
import glob, os, sys
from PIL import Image

ORIGEM = sys.argv[1]
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
SAIDA = os.path.join(RAIZ, 'public/images/batalha-sangrenta/')
os.makedirs(SAIDA, exist_ok=True)
for f in glob.glob(SAIDA + '*'):
    os.remove(f)
PECAS = [
    'card1', 'card2', 'card3', 'card4', 'card5', 'faixa', 'voltar', 'livro', 'gota', 'gota_vazia', 'gota_vip', 'coroa_ok', 'coroa_pend',
    'no_ok', 'no_pend', 'no_perdeu', 'selo_ouro', 'selo_cinza', 'cadeado', 'botao', 'botao_off', 'botao_press',
    'med_darius', 'med_nymeria', 'med_grizzham', 'med_othrak', 'med_varkhazar', 'med_noctharion',
]
total = 0
for n in PECAS:
    im = Image.open(os.path.join(ORIGEM, 'px', n + '.png')).convert('RGBA')
    destino = f'{SAIDA}{n.replace("_", "-")}.webp'
    im.save(destino, 'WEBP', lossless=True, quality=100, method=6)
    total += os.path.getsize(destino)
fundo = Image.open(os.path.join(ORIGEM, 'fundo_coliseu_360x540.png')).convert('RGB')
destino = f'{SAIDA}fundo.webp'
fundo.save(destino, 'WEBP', lossless=True, quality=100, method=6)
if os.path.getsize(destino) > 330 * 1024:
    fundo.save(destino, 'WEBP', quality=92, method=6)
total += os.path.getsize(destino)
print(len(PECAS) + 1, 'arquivos,', total // 1024, 'KB; fundo', os.path.getsize(destino) // 1024, 'KB')
