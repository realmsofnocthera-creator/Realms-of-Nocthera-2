#!/usr/bin/env python3
"""Converte as peças da tela do Chefe Mundial do Yuri (zip tela_chefe_mundial_v2: px/*.png e bgpx/b1..b7.png, grade 360x540) para
public/images/chefe-mundial/tela/*.webp (sem perda). O painel do ranking (262x691) vem alto demais para a tela: a arte do Yuri o mostra
com 436 de altura, sem as linhas 225 a 479 do meio, então ele é costurado assim aqui. Os fundos b1..b7 são, em ordem, Solvaris,
Pyrathon, Cryonax, Zephyrak, Nyxoloth, Xerothul e Orvakar (conferido contra as telas de exemplo).
Uso: python3 -I scripts/chefe-mundial/tela.py <pasta descompactada do zip>"""
import glob, os, sys
from PIL import Image

ORIGEM = sys.argv[1]
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
SAIDA = os.path.join(RAIZ, 'public/images/chefe-mundial/tela/')
os.makedirs(SAIDA, exist_ok=True)
for f in glob.glob(SAIDA + '*'):
    os.remove(f)
PECAS = {
    'banner': 'banner', 'fita': 'fita', 'info': 'info', 'bandeja': 'bandeja', 'dano': 'dano', 'botao': 'botao', 'botao_off': 'botao-off',
    'botao_press': 'botao-press', 'fechar': 'fechar', 'voltar': 'voltar', 'pergaminho': 'ranking', 'i_ampulheta': 'ampulheta',
    'i_trofeu': 'trofeu', 'linha1': 'linha-1', 'linha2': 'linha-2', 'linha3': 'linha-3', 'linha4': 'linha-4', 'linha_eu': 'linha-eu',
    'painel_rec': 'painel-rec',
}
total = 0
def salvar(im, nome):
    global total
    destino = f'{SAIDA}{nome}.webp'
    im.save(destino, 'WEBP', lossless=True, quality=100, method=6)
    total += os.path.getsize(destino)
    print(f'{nome:14s} {im.size[0]}x{im.size[1]} {os.path.getsize(destino) // 1024} KB')

for arq, nome in PECAS.items():
    salvar(Image.open(os.path.join(ORIGEM, 'px', arq + '.png')).convert('RGBA'), nome)
painel = Image.open(os.path.join(ORIGEM, 'px', 'painel_rank.png')).convert('RGBA')
assert painel.size == (262, 691)
costurado = Image.new('RGBA', (262, 436), (0, 0, 0, 0))
costurado.paste(painel.crop((0, 0, 262, 225)), (0, 0))
costurado.paste(painel.crop((0, 480, 262, 691)), (0, 225))
salvar(costurado, 'painel-rank')
FUNDOS = ['solvaris', 'pyrathon', 'cryonax', 'zephyrak', 'nyxoloth', 'xerothul', 'orvakar']
for i, chefe in enumerate(FUNDOS, 1):
    im = Image.open(os.path.join(ORIGEM, 'bgpx', f'b{i}.png')).convert('RGB')
    destino = f'{SAIDA}fundo-{chefe}.webp'
    im.save(destino, 'WEBP', lossless=True, quality=100, method=6)
    if os.path.getsize(destino) > 330 * 1024:
        im.save(destino, 'WEBP', quality=92, method=6)
    total += os.path.getsize(destino)
    print(f'fundo-{chefe:9s} {im.size[0]}x{im.size[1]} {os.path.getsize(destino) // 1024} KB')
print('total', total // 1024, 'KB')
