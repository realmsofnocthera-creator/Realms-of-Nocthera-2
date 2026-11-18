#!/usr/bin/env python3
"""Empacota as animações dos monstros (as pastas do Yuri: <nome>/{idle,ataque}/*.png + tempos.json, de frente e virados para a
esquerda) em folhas de quadros WebP e escreve o manifesto `src/assets/monstrosManifesto.json`.

Uso: python3 scripts/monstros/empacotar.py <pasta com as pastas monstros_N_estrela>
"""
import glob, json, os, sys
from PIL import Image

ORIGEM = sys.argv[1]
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
SAIDA = os.path.join(RAIZ, 'public/images/cacada/monstros/')
LIMITE = 330 * 1024
# o nome da pasta do Yuri -> o id do monstro no jogo (os que não estão aqui já usam o id)
ID = {
    'abutre-veneno': 'pesthyr', 'abutre-fogo': 'pesthyr-carmesim', 'abutre-gelo': 'pesthyr-glacial', 'aranha-roxa': 'nythrakka',
    'aranha-lamina': 'nythrakka-venenosa', 'cranio-tentaculos': 'nythrakka-fantasma', 'bruto-chifre-carneiro': 'cryovarn',
    'bruto-caveira': 'cryovarn-abissal', 'bruto-branco-chifrudo': 'cryovarn-furioso', 'cao-pardo-2-cabecas': 'vargheist-alfa',
    'cao-branco-lava': 'vargheist-alfa-carmesim', 'cao-infernal-3-cabecas': 'vargheist-alfa-vulcanico', 'centopeia-dourada': 'rhazkida',
    'centopeia-rubra': 'rhazkida-escarlate', 'mosquito-espinhoso': 'rhazkida-cristalina', 'crocodilo-couracado': 'murdrax',
    'crocodilo-espinhoso': 'murdrax-corrosivo', 'crocodilo-esqueleto': 'murdrax-de-basalto', 'esqueleto-guerreiro': 'esqueleto',
    'golem-musgoso': 'drazhkar', 'golem-ancestral': 'drazhkar-de-obsidiana', 'golem-rosto': 'drazhkar-sismico', 'hiena-parda': 'vargheist',
    'hiena-de-lava': 'vargheist-vulcanico', 'hiena-branca': 'vargheist-albino', 'morcego-pardo': 'noctyrr', 'morcego-roxo': 'noctyrr-tempestuoso',
    'morcego-fantasma': 'noctyrr-abissal', 'planta-lenhosa': 'floragoth', 'planta-carnivora': 'floragoth-carmesim', 'planta-folhosa': 'floragoth-abissal',
    'rato-marrom': 'rato-da-floresta', 'rato-de-lava': 'rato-das-cinzas', 'rato-negro': 'rato-pestilento', 'serpente-eletrica': 'zaryth',
    'serpente-fogo': 'zaryth-vulcanico', 'serpente-trovao': 'zaryth-abissal', 'urso-pardo': 'urso-gigante', 'urso-negro': 'urso-colerico',
    'urso-tribal': 'grizzharn', 'urso-de-gelo-golem': 'grizzharn-glacial', 'urso-guerreiro-armado': 'grizzharn-ancestral',
    'matriarca-casulo': 'nythrakka-matriarca-do-casulo', 'kharvok-obsidiana': 'kharvok-de-obsidiana',
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
for pasta in sorted(glob.glob(os.path.join(ORIGEM, '*', 'monstros_*_estrela', '*', 'tempos.json'))):
    d = os.path.dirname(pasta)
    nome = os.path.basename(d)
    id_ = ID.get(nome, nome)
    estrela = int(os.path.basename(os.path.dirname(d)).split('_')[1])
    tempos = json.load(open(pasta))['frente']
    manifesto[id_] = {'estrela': estrela}
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
        print(f"{id_:32s} {anim:6s} {len(quadros):2d}q {w}x{h} {os.path.getsize(SAIDA + arq) // 1024:3d} KB", f"impacto {info.get('impacto', '')}")
json.dump(manifesto, open(os.path.join(RAIZ, 'src/assets/monstrosManifesto.json'), 'w'), indent=1, ensure_ascii=False)
print('total', total // 1024, 'KB', len(manifesto), 'monstros')
