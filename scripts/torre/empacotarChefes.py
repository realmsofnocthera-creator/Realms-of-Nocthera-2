#!/usr/bin/env python3
"""Empacota as animações dos 30 chefes da Torre Celestial (pastas do Yuri: andarNNN-<id>/{idle,ataque}/*.png + tempos.json,
virados para a esquerda) em folhas de quadros WebP em public/images/torre/chefes/ e escreve `src/assets/chefesManifesto.json`.

Uso: python3 -I scripts/torre/empacotarChefes.py <pasta que contém as pastas chefes_torre_andares_*>
"""
import glob, json, os, re, sys
from PIL import Image

ORIGEM = sys.argv[1]
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
SAIDA = os.path.join(RAIZ, 'public/images/torre/chefes/')
LIMITE = 330 * 1024

def impacto_ms(ms):
    """O instante (ms desde o começo) do golpe: o começo do quadro mais demorado entre 35% e 80% da animação."""
    n = len(ms)
    faixa = range(int(n * 0.35), max(int(n * 0.35) + 1, int(n * 0.8) + 1))
    melhor = max(faixa, key=lambda i: (ms[i], -i))
    return sum(ms[:melhor])

os.makedirs(SAIDA, exist_ok=True)
for f in glob.glob(SAIDA + '*'):
    os.remove(f)
manifesto, total = {}, 0
for pasta in sorted(glob.glob(os.path.join(ORIGEM, '**', 'andar*', 'tempos.json'), recursive=True)):
    d = os.path.dirname(pasta)
    m = re.match(r'andar(\d+)-(.+)$', os.path.basename(d))
    andar, id_ = int(m.group(1)), m.group(2)
    tempos = json.load(open(pasta))['frente']
    manifesto[id_] = {'andar': andar}
    for anim in ('idle', 'ataque'):
        t = tempos[anim]
        arqs = sorted(glob.glob(os.path.join(d, anim, '*.png')), key=lambda f: int(f.rsplit('_', 1)[1][:-4]))
        assert len(arqs) == t['frames'] == len(t['ms']), (id_, anim)
        quadros = [Image.open(a).convert('RGBA') for a in arqs]
        w, h = quadros[0].size
        assert all(q.size == (w, h) for q in quadros) and [w, h] == t['frame_size'], (id_, anim)
        folha = Image.new('RGBA', (w * len(quadros), h), (0, 0, 0, 0))
        for i, q in enumerate(quadros):
            folha.paste(q, (i * w, 0))
        arq = f'{id_}-{anim}.webp'
        for qual in (None, 95, 90, 85, 80, 70, 60):
            if qual is None:
                folha.save(SAIDA + arq, 'WEBP', lossless=True, quality=100, method=6)
            else:
                folha.save(SAIDA + arq, 'WEBP', quality=qual, alpha_quality=100, method=6)
            if os.path.getsize(SAIDA + arq) <= LIMITE:
                break
        total += os.path.getsize(SAIDA + arq)
        info = {'quadros': len(quadros), 'largura': w, 'altura': h, 'ms': t['ms']}
        if anim == 'ataque':
            info['impacto'] = impacto_ms(t['ms'])
        manifesto[id_][anim] = info
        print(f"{andar:3d} {id_:40s} {anim:6s} {len(quadros):2d}q {w}x{h} {os.path.getsize(SAIDA + arq) // 1024:3d} KB", f"impacto {info.get('impacto', '')}", flush=True)
json.dump(dict(sorted(manifesto.items(), key=lambda kv: kv[1]['andar'])), open(os.path.join(RAIZ, 'src/assets/chefesManifesto.json'), 'w'), indent=1, ensure_ascii=False)
print('total', total // 1024, 'KB', len(manifesto), 'chefes')
