#!/usr/bin/env python3
"""Gera os efeitos do ataque básico e da habilidade especial de cada classe e subclasse com o pixelfx.

Cada habilidade usa um efeito do pixelfx com uma paleta própria, cortado no trecho que importa (`fim`, em segundos) e
reamostrado para 15 quadros por segundo dentro da duração do jogo (0,8 s no básico, 1,2 s no especial). Os efeitos em
repetição (escudo, bênção) somem aos poucos no fim. Saída: `public/images/cacada/pixelfx/hab-<id>[-si].webp` e o manifesto
`src/assets/pixelfxHabilidades.json`.

Uso: PIXELFX_DIR=../pixelfx python3 scripts/pixelfx/habilidades.py
"""
import glob, json, os, shutil, subprocess, tempfile
from PIL import Image

REPO = os.environ.get('PIXELFX_DIR', '../pixelfx')
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
SAIDA = os.path.join(RAIZ, 'public/images/cacada/pixelfx/')
MANIFESTO = os.path.join(RAIZ, 'src/assets/pixelfxHabilidades.json')
FPS = 15
DURACAO = {'basico': 0.8, 'especial': 1.2}

PAL = {
    'fogo': ['#3a0d08', '#8a1f17', '#d6371c', '#ff7a1f', '#ffb53d', '#ffe27a', '#ffffff'],
    'relampago': ['#2a2208', '#7a6410', '#d4b020', '#ffe040', '#fff27a', '#fffbd0', '#ffffff'],
    'sombrio': ['#120820', '#2e1250', '#5a2a9a', '#8a4fd6', '#b98af0', '#e0c8ff', '#ffffff'],
    'sagrado': ['#4a3a10', '#a8862a', '#e8c85a', '#ffe99a', '#fff6cf', '#ffffff', '#ffffff'],
    'ouro': ['#2a1a04', '#6b4a10', '#b8862a', '#e8b84a', '#ffe08a', '#fff4c8', '#ffffff'],
    'aco': ['#101820', '#2c3e50', '#5d7387', '#9fb3c4', '#d6e2ec', '#f2f7fb', '#ffffff'],
    'arcano': ['#140826', '#3a1670', '#6a2fc0', '#a46cf0', '#d4b0ff', '#f0e4ff', '#ffffff'],
    'vermelho': ['#2a0406', '#701018', '#b81c24', '#e8403a', '#ff8a6a', '#ffd2c0', '#ffffff'],
    'sangue': ['#1a0204', '#4a060c', '#8a0f18', '#c41e26', '#e85050', '#ffa0a0', '#ffe8e8'],
    'vazio': ['#0e0418', '#2a0e4a', '#4e2286', '#7a44c8', '#b48af0', '#e2d0ff', '#ffffff'],
    'cura': ['#04200c', '#0e5a2a', '#24994a', '#5cd47a', '#a8f0b8', '#e4ffe8', '#ffffff'],
    'sagrado-fogo': ['#3a2406', '#8a5a10', '#e0a020', '#ffd04a', '#fff08a', '#fffbe0', '#ffffff'],
}

# id da habilidade: (tipo, [(alvo, efeito do pixelfx, paleta, fim em segundos)])
HABILIDADES = {
    'barbaro_golpe_barbaro': ('basico', [('inimigo', 'melee/heavy-cleave', None, 0.9)]),
    'barbaro_furia_selvagem': ('especial', [('inimigo', 'melee/hammer-smash', 'fogo', 1.1)]),
    'cavaleiro_golpe_do_guardiao': ('basico', [('inimigo', 'melee/sword-slash', 'ouro', None)]),
    'cavaleiro_postura_do_guardiao': ('especial', [('si', 'holy/divine-shield', None, 1.4)]),
    'feiticeiro_faisca_arcana': ('basico', [('inimigo', 'lightning/zap-hit', 'arcano', None)]),
    'feiticeiro_explosao_arcana': ('especial', [('inimigo', 'explosions/plasma-explosion', 'arcano', None)]),
    'bandido_golpe_rapido': ('basico', [('inimigo', 'melee/double-slash', 'aco', None)]),
    'bandido_rajada_de_golpes': ('especial', [('inimigo', 'melee/dagger-flurry', None, None)]),
    'profeta_luz_sagrada': ('basico', [('inimigo', 'holy/sunburst', 'sagrado', 1.2)]),
    'profeta_bencao_divina': ('especial', [('si', 'holy/blessing', 'ouro', 1.8)]),
    'samurai_corte_preciso': ('basico', [('inimigo', 'melee/sword-slash', 'vermelho', None)]),
    'samurai_iaijutsu': ('especial', [('inimigo', 'melee/spin-slash', 'vermelho', None)]),
    'berserker_golpe_desenfreado': ('basico', [('inimigo', 'melee/claw-swipe', 'sangue', None)]),
    'berserker_investida_sangrenta': ('especial', [('inimigo', 'melee/heavy-cleave', 'sangue', 0.9)]),
    'colosso_golpe_esmagador': ('basico', [('inimigo', 'impacts/blunt-hit', 'ouro', None)]),
    'colosso_impacto_sismico': ('especial', [('inimigo', 'impacts/ground-slam', None, 1.4)]),
    'vanguarda_estocada_da_vanguarda': ('basico', [('inimigo', 'melee/thrust', 'ouro', None)]),
    'vanguarda_carga_esmagadora': ('especial', [('inimigo', 'melee/hammer-smash', 'ouro', 1.1)]),
    'bastiao_golpe_de_escudo': ('basico', [('inimigo', 'impacts/blunt-hit', 'aco', None)]),
    'bastiao_muralha_inabalavel': ('especial', [('inimigo', 'impacts/parry', 'aco', None), ('si', 'holy/divine-shield', 'aco', 1.4)]),
    'kensei_corte_perfeito': ('basico', [('inimigo', 'melee/sword-slash', 'vazio', None)]),
    'kensei_lamina_desembainhada': ('especial', [('inimigo', 'melee/double-slash', 'vazio', None)]),
    'ronin_corte_relampago': ('basico', [('inimigo', 'melee/double-slash', 'relampago', None)]),
    'ronin_danca_da_lamina_solitaria': ('especial', [('inimigo', 'melee/dagger-flurry', 'vermelho', None)]),
    'assassino_estocada_furtiva': ('basico', [('inimigo', 'melee/thrust', 'sombrio', None)]),
    'assassino_golpe_nas_sombras': ('especial', [('inimigo', 'shadow/shadow-tendrils', None, 1.4)]),
    'duelista_estocada_dupla': ('basico', [('inimigo', 'melee/thrust', 'aco', None)]),
    'duelista_finta': ('especial', [('inimigo', 'melee/dagger-flurry', 'aco', None)]),
    'sacerdote_toque_sagrado': ('basico', [('inimigo', 'holy/feather-burst', None, 1.2)]),
    'sacerdote_prece_de_cura': ('especial', [('inimigo', 'impacts/parry', 'sagrado', None), ('si', 'holy/blessing', 'cura', 1.8)]),
    'inquisidor_sentenca': ('basico', [('inimigo', 'holy/smite', None, 1.4)]),
    'inquisidor_fogo_sagrado': ('especial', [('inimigo', 'fire/fire-ring', 'sagrado-fogo', 1.5)]),
    'arquimago_bola_de_fogo': ('basico', [('inimigo', 'explosions/plasma-explosion', 'fogo', None)]),
    'arquimago_tempestade_de_raios': ('especial', [('inimigo', 'lightning/lightning-strike', None, 1.5)]),
    'sabio_arcano_lanca_de_gelo': ('basico', [('inimigo', 'ice/ice-shatter', None, 1.2)]),
    'sabio_arcano_feitico_do_torpor': ('especial', [('inimigo', 'arcane/time-stop', None, 1.5)]),
}

def renderizar(pfx, paleta, pasta):
    args = ['node', 'tools/render.mjs', pfx, '--sheet', '--no-actor', '--fps', '30', '--out', pasta]
    if paleta:
        args += ['--opts', json.dumps({'palette': PAL[paleta]})]
    subprocess.run(args, cwd=REPO, check=True, capture_output=True)
    dirr = glob.glob(os.path.join(pasta, '*', '*'))[0]
    png = [p for p in glob.glob(dirr + '/*.png') if not p.endswith('contact.png')][0]
    js = json.load(open(glob.glob(dirr + '/*.json')[0]))
    folha = Image.open(png).convert('RGBA')
    frs = js['frames'] if isinstance(js['frames'], list) else list(js['frames'].values())
    quadros = [folha.crop((f['frame']['x'], f['frame']['y'], f['frame']['x'] + f['frame']['w'], f['frame']['y'] + f['frame']['h'])) for f in frs]
    return quadros, js['meta']['pixelfx']

def vazio(q):
    return q.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox() is None

def empacotar(nome, quadros, alvo, laco):
    x0 = y0 = 10 ** 9; x1 = y1 = -1
    for q in quadros:
        b = q.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
        if b:
            x0, y0, x1, y1 = min(x0, b[0]), min(y0, b[1]), max(x1, b[2]), max(y1, b[3])
    quadros = [q.crop((x0, y0, x1, y1)) for q in quadros]
    if laco:  # some aos poucos nos últimos 35%
        n = len(quadros); ini = int(n * 0.65)
        for i in range(ini, n):
            k = 1 - (i - ini + 1) / (n - ini + 1)
            a = quadros[i].getchannel('A').point(lambda v, k=k: int(v * k)); quadros[i].putalpha(a)
    w, h = quadros[0].size
    folha = Image.new('RGBA', (w * len(quadros), h), (0, 0, 0, 0))
    for i, q in enumerate(quadros):
        folha.paste(q, (i * w, 0))
    arq = SAIDA + nome + '.webp'
    for qual in (None, 90, 80, 70):
        if qual is None:
            folha.save(arq, 'WEBP', lossless=True, quality=100, method=6)
        else:
            folha.save(arq, 'WEBP', quality=qual, alpha_quality=100, method=6)
        if os.path.getsize(arq) <= 330 * 1024:
            break
    return {'quadros': len(quadros), 'largura': w, 'altura': h, 'fps': FPS, 'laco': False, 'alvo': alvo}, os.path.getsize(arq)

manifesto = {}
total = 0
for f in glob.glob(SAIDA + 'hab-*.webp'):
    os.remove(f)
for id_, (tipo, efeitos) in HABILIDADES.items():
    for alvo, pfx, paleta, fim in efeitos:
        pasta = tempfile.mkdtemp()
        try:
            quadros, meta = renderizar(pfx, paleta, pasta)
        finally:
            shutil.rmtree(pasta, ignore_errors=True)
        if fim:
            quadros = quadros[: max(2, int(fim * 30))]
        while len(quadros) > 2 and vazio(quadros[-1]):
            quadros.pop()
        alvo_n = round(DURACAO[tipo] * FPS)
        if len(quadros) > alvo_n:  # reamostra para caber na duração do jogo
            quadros = [quadros[round(i * (len(quadros) - 1) / (alvo_n - 1))] for i in range(alvo_n)]
        nome = f'hab-{id_}' + ('-si' if alvo == 'si' else '')
        info, tam = empacotar(nome, quadros, alvo, bool(meta.get('loop')))
        manifesto[nome] = info
        total += tam
        print(f'{nome:46s} {pfx:30s} {paleta or "-":12s} {info["quadros"]:2d}q {info["largura"]}x{info["altura"]} {tam // 1024:3d} KB')
json.dump(manifesto, open(MANIFESTO, 'w'), indent=1, ensure_ascii=False)
print('total', total // 1024, 'KB', len(manifesto), 'efeitos')
