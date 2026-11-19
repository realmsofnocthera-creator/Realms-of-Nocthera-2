#!/usr/bin/env python3
"""Converte os emblemas do Yuri (zip emblemas_nocthera: emblemas_estaticos/NN_id_{32,64,128}.png e miticos_animados/NN_id_Nestrela_{32,64}.webp)
para o site:
  - public/images/emblemas/<id>-{32,64}.webp (estático, sem perda; o 128 é só o 64 ampliado e não entra)
  - public/images/emblemas/animados/<id>-<N>estrela-64.webp (os 5 Míticos animados, uma versão por estrela)
Uso: python3 -I scripts/emblemas/converter.py <pasta descompactada do zip>"""
import glob, os, re, shutil, sys
from PIL import Image

ORIGEM = sys.argv[1]
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
SAIDA = os.path.join(RAIZ, 'public/images/emblemas/')
ANIM = SAIDA + 'animados/'
os.makedirs(ANIM, exist_ok=True)
for f in glob.glob(SAIDA + '*.webp') + glob.glob(ANIM + '*.webp'):
    os.remove(f)

ids = []
for arq in sorted(glob.glob(os.path.join(ORIGEM, 'emblemas_estaticos', '*_32.png'))):
    id_ = re.match(r'\d+_(.+)_32\.png$', os.path.basename(arq)).group(1)
    ids.append(id_)
    for tam in (32, 64):
        origem = glob.glob(os.path.join(ORIGEM, 'emblemas_estaticos', f'*_{id_}_{tam}.png'))[0]
        im = Image.open(origem).convert('RGBA')
        assert im.size == (tam, tam), (id_, tam, im.size)
        im.save(f'{SAIDA}{id_}-{tam}.webp', 'WEBP', lossless=True, quality=100, method=6)
print(len(ids), 'emblemas:', ' '.join(ids))

animados = 0
for arq in sorted(glob.glob(os.path.join(ORIGEM, 'miticos_animados', '*_64.webp'))):
    m = re.match(r'\d+_(.+)_(\d)estrela_64\.webp$', os.path.basename(arq))
    shutil.copy(arq, f'{ANIM}{m.group(1)}-{m.group(2)}estrela-64.webp')
    animados += 1
tam_est = sum(os.path.getsize(f) for f in glob.glob(SAIDA + '*.webp'))
tam_ani = sum(os.path.getsize(f) for f in glob.glob(ANIM + '*.webp'))
print(f'estáticos {tam_est // 1024} KB; {animados} animados {tam_ani // 1024} KB')
