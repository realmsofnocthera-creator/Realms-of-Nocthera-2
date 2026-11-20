#!/usr/bin/env python3
"""Empacota as animações dos 10 chefes da Provação do Guerreiro (pastas do Yuri: guerreiro-<ROMANO>-<nome>/{idle,ataque}/*.png + tempos.json,
virados para a esquerda) em folhas de quadros WebP em public/images/guerreiro/chefes/ e escreve `src/assets/guerreiroChefesManifesto.json`.
O id de cada chefe é o do jogo (src/rules/guerreiroChefes.ts), achado pelo número romano da pasta.

Uso: python3 -I scripts/guerreiro/empacotarChefes.py <pasta que contém as pastas guerreiro-*>
"""
import glob, json, os, re, sys
from PIL import Image

ORIGEM = sys.argv[1]
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
SAIDA = os.path.join(RAIZ, 'public/images/guerreiro/chefes/')
LIMITE = 330 * 1024
ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
ID_DO_JOGO = {
    1: 'astaroth-louco', 2: 'zephyron-mago', 3: 'thundrak-carro', 4: 'gorvath-forca', 5: 'veredar-justica',
    6: 'selvara-roda-da-fortuna', 7: 'nekrath-morte', 8: 'belzareth-diabo', 9: 'kolossar-torre', 10: 'aetherion-mundo',
}

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
for pasta in sorted(glob.glob(os.path.join(ORIGEM, '**', 'guerreiro-*', 'tempos.json'), recursive=True)):
    d = os.path.dirname(pasta)
    romano = re.match(r'guerreiro-([IVX]+)-', os.path.basename(d)).group(1)
    dificuldade = ROMANOS.index(romano) + 1
    id_ = ID_DO_JOGO[dificuldade]
    tempos = json.load(open(pasta))['frente']
    manifesto[id_] = {'dificuldade': dificuldade}
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
        print(f"{dificuldade:2d} {id_:26s} {anim:6s} {len(quadros):2d}q {w}x{h} {os.path.getsize(SAIDA + arq) // 1024:3d} KB", f"impacto {info.get('impacto', '')}", flush=True)
assert len(manifesto) == 10, sorted(manifesto)
json.dump(dict(sorted(manifesto.items(), key=lambda kv: kv[1]['dificuldade'])), open(os.path.join(RAIZ, 'src/assets/guerreiroChefesManifesto.json'), 'w'), indent=1, ensure_ascii=False)
print('total', total // 1024, 'KB', len(manifesto), 'chefes')
