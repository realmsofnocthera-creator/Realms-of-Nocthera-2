#!/usr/bin/env python3
"""Empacota as animações dos heróis (as pastas do Yuri: <id>_animacoes/{frente,costas}/{idle,ataque}/*.png + tempos.json)
em folhas de quadros WebP (os quadros lado a lado) e escreve o manifesto `src/assets/heroisManifesto.json`.

Uso: python3 scripts/herois/empacotar.py <pasta com as pastas <id>_animacoes (em classes/ e subclasses/)>
"""
import glob, json, os, sys
from PIL import Image

ORIGEM = sys.argv[1]
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
SAIDA = os.path.join(RAIZ, 'public/images/cacada/herois/')
# o id do personagem no jogo (a arte "feiticeira" é a classe "feiticeiro")
ID_NO_JOGO = {'feiticeira': 'feiticeiro'}
LIMITE = 330 * 1024

os.makedirs(SAIDA, exist_ok=True)
for f in glob.glob(SAIDA + '*'):
    os.remove(f)

def impacto_ms(ms):
    """O instante (ms desde o começo) do golpe: o começo do quadro mais demorado entre 30% e 75% da animação."""
    n = len(ms)
    faixa = range(int(n * 0.3), max(int(n * 0.3) + 1, int(n * 0.75) + 1))
    melhor = max(faixa, key=lambda i: (ms[i], -i))
    return sum(ms[:melhor])

manifesto = {}
total = 0
for pasta in sorted(glob.glob(os.path.join(ORIGEM, '*', '*_animacoes'))):
    nome = os.path.basename(pasta).replace('_animacoes', '')
    id_ = ID_NO_JOGO.get(nome, nome)
    tempos = json.load(open(os.path.join(pasta, 'tempos.json')))
    manifesto[id_] = {'tipo': os.path.basename(os.path.dirname(pasta))}
    for lado in ('frente', 'costas'):
        manifesto[id_][lado] = {}
        for anim in ('idle', 'ataque'):
            t = tempos[lado][anim]
            arqs = sorted(glob.glob(os.path.join(pasta, lado, anim, '*.png')), key=lambda f: int(f.rsplit('_', 1)[1][:-4]))
            assert len(arqs) == t['frames'] == len(t['ms']), (id_, lado, anim)
            quadros = [Image.open(a).convert('RGBA') for a in arqs]
            w, h = quadros[0].size
            assert all(q.size == (w, h) for q in quadros) and [w, h] == t['frame_size'], (id_, lado, anim)
            folha = Image.new('RGBA', (w * len(quadros), h), (0, 0, 0, 0))
            for i, q in enumerate(quadros):
                folha.paste(q, (i * w, 0))
            arq = f'{id_}-{lado}-{anim}.webp'
            for qual in (None, 95, 90, 85, 80, 70):
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
            manifesto[id_][lado][anim] = info
            print(f"{id_:13s} {lado:6s} {anim:6s} {len(quadros):2d}q {w}x{h} {os.path.getsize(SAIDA + arq) // 1024:3d} KB", f"impacto {info.get('impacto', '')}")
json.dump(manifesto, open(os.path.join(RAIZ, 'src/assets/heroisManifesto.json'), 'w'), indent=1, ensure_ascii=False)
print('total', total // 1024, 'KB', len(manifesto), 'personagens')
