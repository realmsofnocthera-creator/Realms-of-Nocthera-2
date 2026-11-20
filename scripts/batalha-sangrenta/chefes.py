#!/usr/bin/env python3
"""Empacota os 6 chefes da Batalha Sangrenta do Yuri (pastas <chefe>/<chefe>.json e <chefe>_{idle,ataque,golpe}_sheet.png: grades de quadros de
24 fps, 12 colunas) em folhas de quadros lado a lado (WebP) em public/images/batalha-sangrenta/chefes/ e escreve
`src/assets/batalhaChefesManifesto.json`. O idle (96 quadros, laço de 4 s) fica com 1 quadro a cada 4, que cabe no limite de largura do WebP;
o ataque e o golpe (reação ao dano) ficam inteiros. Os chefes são desenhados olhando para a esquerda; o jogo espelha na luta.

Uso: python3 -I scripts/batalha-sangrenta/chefes.py <pasta com as pastas chefes_1 e chefes_2 descompactadas>"""
import glob, json, os, sys
from PIL import Image

ORIGEM = sys.argv[1]
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
SAIDA = os.path.join(RAIZ, 'public/images/batalha-sangrenta/chefes/')
LIMITE = 330 * 1024
# a pasta do Yuri -> o id do chefe no jogo (src/rules/chefesEspeciais.ts)
ID = {
    'darius': 'darius-carrasco-escarlate', 'nymeria': 'nymeria-noiva-do-lamento', 'grizzham': 'grizzham-devorador-de-ossos',
    'othrak': 'othrak-relicto-primordial', 'varkhazar': 'varkhazar-dragao-da-carnificina', 'noctharion': 'noctharion-dragao-do-eclipse-eterno',
}
PASSO_DO_IDLE = 4
# o instante do golpe, como fração do ataque (o machado, as garras ou o sopro descem a pouco menos da metade)
FRACAO_DO_IMPACTO = 0.42

os.makedirs(SAIDA, exist_ok=True)
for f in glob.glob(SAIDA + '*'):
    os.remove(f)
manifesto, total = {}, 0
for json_arq in sorted(glob.glob(os.path.join(ORIGEM, '**', '*', '*.json'), recursive=True)):
    nome = os.path.basename(json_arq)[:-5]
    if nome not in ID:
        continue
    j = json.load(open(json_arq))
    fw, fh, fps = j['frame_w'], j['frame_h'], j['fps']
    pasta = os.path.dirname(json_arq)
    id_ = ID[nome]
    entrada = {}
    for anim in ('idle', 'ataque', 'golpe'):
        info = j['anims'][anim]
        grade = Image.open(os.path.join(pasta, f'{nome}_{anim}_sheet.png')).convert('RGBA')
        cols = info['columns']
        assert grade.size == (cols * fw, info['rows'] * fh), (nome, anim, grade.size)
        quadros = [grade.crop(((i % cols) * fw, (i // cols) * fh, (i % cols + 1) * fw, (i // cols + 1) * fh)) for i in range(info['frames'])]
        passo = PASSO_DO_IDLE if anim == 'idle' else 1
        while True:
            usados = quadros[::passo]
            folha = Image.new('RGBA', (fw * len(usados), fh), (0, 0, 0, 0))
            for i, q in enumerate(usados):
                folha.paste(q, (i * fw, 0))
            arq = f'{id_}-{anim}.webp'
            for qual in (None, 95, 90, 85, 80, 70):
                if qual is None:
                    folha.save(SAIDA + arq, 'WEBP', lossless=True, quality=100, method=6)
                else:
                    folha.save(SAIDA + arq, 'WEBP', quality=qual, alpha_quality=100, method=6)
                if os.path.getsize(SAIDA + arq) <= LIMITE:
                    break
            if os.path.getsize(SAIDA + arq) <= LIMITE or passo >= 4:
                break
            passo *= 2  # ainda pesada: tira mais quadros
        ms = round(1000 / fps * passo)
        dados = {'quadros': len(usados), 'largura': fw, 'altura': fh, 'ms': [ms] * len(usados)}
        if anim == 'ataque':
            dados['impacto'] = round(sum(dados['ms']) * FRACAO_DO_IMPACTO)
        entrada[anim] = dados
        total += os.path.getsize(SAIDA + arq)
        print(f"{id_:42s} {anim:6s} {len(usados):3d}q {fw}x{fh} {os.path.getsize(SAIDA + arq) // 1024:4d} KB")
    manifesto[id_] = entrada
assert len(manifesto) == 6, sorted(manifesto)
json.dump(manifesto, open(os.path.join(RAIZ, 'src/assets/batalhaChefesManifesto.json'), 'w'), indent=1, ensure_ascii=False)
print('total', total // 1024, 'KB', len(manifesto), 'chefes')
