"""Converte as artes dos cosméticos pagos (skins, auras, efeitos de entrada, molduras) do Yuri em tiras horizontais webp para `public/images/loja/cosmeticos/`.
Uso: python3 -I scripts/loja/cosmeticos.py <pasta com os 4 pacotes descompactados>   (gera também src/assets/cosmeticosManifesto.json)"""
import json, os, sys
from PIL import Image

ORIGEM = sys.argv[1]
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
SAIDA = os.path.join(RAIZ, 'public', 'images', 'loja', 'cosmeticos')
os.makedirs(SAIDA, exist_ok=True)
man = {'skins': {}, 'auras': {}, 'efeitos': {}, 'molduras': {}}

def salvar(im, nome):
    caminho = os.path.join(SAIDA, nome)
    im.save(caminho, 'WEBP', lossless=True, method=6)
    kb = os.path.getsize(caminho) / 1024
    if kb > 350:  # o limite do projeto: tenta com perda quase invisível
        im.save(caminho, 'WEBP', quality=92, alpha_quality=100, method=6)
        kb = os.path.getsize(caminho) / 1024
    return kb

def grade_para_tira(arq, quadros, colunas, lado):
    im = Image.open(arq).convert('RGBA')
    tira = Image.new('RGBA', (lado * quadros, lado), (0, 0, 0, 0))
    for i in range(quadros):
        c, l = i % colunas, i // colunas
        tira.paste(im.crop((c * lado, l * lado, (c + 1) * lado, (l + 1) * lado)), (i * lado, 0))
    return tira

for pasta in ('efeitos_entrada_combate', 'auras_personagem'):
    idx = json.load(open(os.path.join(ORIGEM, pasta, 'indice.json')))
    for nome, d in idx.items():
        quadros, lado = d['frames'], d['tamanho'][0]
        alvo = 'efeitos' if pasta.startswith('efeitos') else 'auras'
        chave = nome.split('-', 1)[1]
        colunas = d.get('colunas', 6)
        for camada in ('atras', 'frente'):
            arq = os.path.join(ORIGEM, pasta, nome, f'spritesheet_{camada}_{lado}.png')
            kb = salvar(grade_para_tira(arq, quadros, colunas, lado), f'{alvo[:-1] if alvo == "auras" else "efeito"}-{chave}-{camada}.webp')
            print(nome, camada, round(kb), 'KB')
        man[alvo][chave] = {'quadros': quadros, 'fps': d['fps'], 'lado': lado, 'pes': d['ancora_pes'], 'loop': d.get('loop', True), **({'revelacao': d['quadro_revelacao']} if 'quadro_revelacao' in d else {})}

idx = json.load(open(os.path.join(ORIGEM, 'molduras_perfil_8', 'indice.json')))
for nome, d in idx.items():
    lado = d['frame_size'][0]
    kb = salvar(grade_para_tira(os.path.join(ORIGEM, 'molduras_perfil_8', f'moldura-{nome}', d['spritesheet']), d['frames'], d['colunas'], lado), f'moldura-{nome}.webp')
    print('moldura', nome, round(kb), 'KB')
    man['molduras'][nome] = {'quadros': d['frames'], 'fps': d['fps'], 'lado': lado, 'buraco': d['buraco_diametro']}

for skin in sorted(os.listdir(os.path.join(ORIGEM, 'skins_estilo_samurai_1'))):
    t = json.load(open(os.path.join(ORIGEM, 'skins_estilo_samurai_1', skin, 'tempos.json')))
    entrada = {}
    for lado_ in ('frente', 'costas'):
        entrada[lado_] = {}
        for anim in ('idle', 'ataque'):
            im = Image.open(os.path.join(ORIGEM, 'skins_estilo_samurai_1', skin, lado_, f'{anim}_sheet.png')).convert('RGBA')
            m = t[lado_][anim]
            l, a = m['frame_size']
            assert im.size == (l * m['frames'], a), (skin, lado_, anim, im.size, m)
            kb = salvar(im, f'{skin}-{lado_}-{anim}.webp')
            print(skin, lado_, anim, round(kb), 'KB')
            entrada[lado_][anim] = {'quadros': m['frames'], 'largura': l, 'altura': a, 'ms': m['ms']}
    man['skins'][skin.split('-', 1)[1]] = entrada

json.dump(man, open(os.path.join(RAIZ, 'src', 'assets', 'cosmeticosManifesto.json'), 'w'), indent=1, ensure_ascii=False)
print('total', round(sum(os.path.getsize(os.path.join(SAIDA, f)) for f in os.listdir(SAIDA)) / 1024), 'KB')
