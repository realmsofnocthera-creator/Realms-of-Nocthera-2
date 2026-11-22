#!/usr/bin/env python3
"""Converte as molduras e os títulos do Yuri para o site:
  - 22 molduras estáticas (128 px, centro transparente) -> public/images/molduras/<id>.webp (sem perda)
  - 7 molduras animadas (48 quadros, 24 fps) -> public/images/molduras/<id>-anim.webp (copiadas)
  - 27 títulos (faixa 176 x 48) -> public/images/titulos/<id>.webp (sem perda)
Os ids das molduras: ranque-<ranque>, campeonato-<n>, categoria-<categoria> e chefe-mundial (ver src/rules/molduras.ts).
Uso: python3 -I scripts/molduras/converter.py <pasta molduras_nocthera> <pasta dos títulos (com 1x/)>"""
import json, os, shutil, sys
from PIL import Image

MOL, TIT = sys.argv[1], sys.argv[2]
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
SAIDA_M = os.path.join(RAIZ, 'public/images/molduras/')
SAIDA_T = os.path.join(RAIZ, 'public/images/titulos/')
for d in (SAIDA_M, SAIDA_T):
    os.makedirs(d, exist_ok=True)
    for f in os.listdir(d):
        os.remove(d + f)

def id_da_moldura(grupo, ordem, id_):
    if grupo == 'ranque_arena': return f'ranque-{id_}'
    if grupo == 'campeonato': return f'campeonato-{ordem}'
    if id_ == 'chefe-mundial': return 'chefe-mundial'
    return f'categoria-{id_}'

indice = json.load(open(os.path.join(MOL, 'indice.json'), encoding='utf8'))['molduras']
total = 0
for m in indice:
    mid = id_da_moldura(m['grupo'], m['ordem'], m['id'])
    im = Image.open(os.path.join(MOL, m['estatica_128'])).convert('RGBA')
    assert im.size == (128, 128), mid
    destino = f'{SAIDA_M}{mid}.webp'
    im.save(destino, 'WEBP', lossless=True, quality=100, method=6)
    total += os.path.getsize(destino)
    if 'animacao_webp' in m:
        shutil.copy(os.path.join(MOL, m['animacao_webp']), f'{SAIDA_M}{mid}-anim.webp')
        total += os.path.getsize(f'{SAIDA_M}{mid}-anim.webp')
titulos = json.load(open(os.path.join(TIT, 'titulos.json'), encoding='utf8'))
for t in titulos:
    im = Image.open(os.path.join(TIT, t['arquivo_1x'])).convert('RGBA')
    assert im.size == (176, 48), t['id']
    destino = f"{SAIDA_T}{t['id']}.webp"
    im.save(destino, 'WEBP', lossless=True, quality=100, method=6)
    total += os.path.getsize(destino)
print(f'{len(indice)} molduras, {len(titulos)} títulos, {total // 1024} KB')
