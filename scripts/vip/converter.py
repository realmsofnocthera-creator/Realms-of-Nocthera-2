"""Converte o pacote de recompensas do VIP (Yuri) para o jogo.
Uso: python3 -I scripts/vip/converter.py <pasta do pacote descompactado>
Gera: títulos e molduras (no formato das que já existem), tiras de skins/aura, retratos, emblema e balão em public/images/vip, vídeos dos efeitos em public/videos/vip
e src/assets/vipArteManifesto.json."""
import json, os, shutil, sys
from PIL import Image

O = sys.argv[1]
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
P = lambda *a: os.path.join(R, 'public', *a)
os.makedirs(P('images', 'vip'), exist_ok=True)
os.makedirs(P('videos', 'vip'), exist_ok=True)
man = {'skins': {}, 'aura': {}, 'emblema': {}, 'decoracao': {}, 'efeitos': {}}

def webp(im, destino, **kw):
    im.convert('RGBA').save(destino, 'WEBP', lossless=True, method=6, **kw)
    kb = os.path.getsize(destino) / 1024
    if kb > 350:
        im.convert('RGBA').save(destino, 'WEBP', quality=92, alpha_quality=100, method=6)
        kb = os.path.getsize(destino) / 1024
    print(os.path.relpath(destino, R), round(kb), 'KB')

# títulos (176x48), com os ids que o jogo usa
for src, tid in (('vip-2-titulo', 'vip-adepto'), ('vip-9-titulo', 'vip-especial'), ('vip-10-titulo', 'vip-transcendente')):
    webp(Image.open(os.path.join(O, 'titulos', src + '.png')), P('images', 'titulos', tid + '.webp'))

# molduras: 128x128, buraco no mesmo lugar das que já existem; as animadas também têm o loop `-anim` (webp animado)
for n in (1, 3, 5, 8, 10):
    webp(Image.open(os.path.join(O, 'molduras', f'vip-{n}-moldura.png')), P('images', 'molduras', f'vip-{n}.webp'))
for n in (5, 8):
    d = os.path.join(O, 'molduras', f'vip-{n}-moldura-anim')
    t = json.load(open(os.path.join(d, 'tempos.json')))
    quadros = [Image.open(os.path.join(d, f'vip-{n}-moldura-anim_{i}.png')).convert('RGBA') for i in range(1, t['frames'] + 1)]
    destino = P('images', 'molduras', f'vip-{n}-anim.webp')
    quadros[0].save(destino, 'WEBP', save_all=True, append_images=quadros[1:], duration=round(1000 / t['fps']), loop=0, lossless=True, method=6)
    print(os.path.relpath(destino, R), round(os.path.getsize(destino) / 1024), 'KB')

# skins (tiras horizontais, como as do herói), retratos
for n in (4, 7, 10):
    d = os.path.join(O, 'skins', f'vip-{n}-skin')
    t = json.load(open(os.path.join(d, 'tempos.json')))
    ent = {}
    for lado in ('frente', 'costas'):
        ent[lado] = {}
        for anim, nome in (('parado', 'idle'), ('ataque', 'ataque')):
            im = Image.open(os.path.join(d, lado, f'{anim}_sheet.png')).convert('RGBA')
            m = t[lado][anim]
            l, a = m['frame_size']
            assert im.size == (l * m['frames'], a), (n, lado, anim, im.size, m)
            webp(im, P('images', 'vip', f'skin-{n}-{lado}-{nome}.webp'))
            ent[lado][nome] = {'quadros': m['frames'], 'largura': l, 'altura': a, 'ms': m['ms']}
    webp(Image.open(os.path.join(d, f'vip-{n}-skin_retrato_480x720.png')), P('images', 'vip', f'skin-{n}-retrato.webp'))
    man['skins'][str(n)] = ent

# aura (6 quadros de 128x160; o centro é oco)
a = json.load(open(os.path.join(O, 'aura', 'vip-9-aura.json')))
webp(Image.open(os.path.join(O, 'aura', 'vip-9-aura_sheet.png')), P('images', 'vip', 'aura-9.webp'))
man['aura']['9'] = {'quadros': a['frames'], 'largura': a['frame_size'][0], 'altura': a['frame_size'][1], 'ms': a['ms'], 'centro': a['centro_do_heroi']}

# emblema (16x16) e balão de chat (48x48, nine-slice de 12)
webp(Image.open(os.path.join(O, 'emblema', 'vip-7-emblema.png')), P('images', 'vip', 'emblema-7.webp'))
man['emblema']['7'] = {'lado': 16}
dc = json.load(open(os.path.join(O, 'decoracao', 'vip-8-decoracao.json')))
webp(Image.open(os.path.join(O, 'decoracao', dc['balao'])), P('images', 'vip', 'decoracao-8-balao.webp'))
man['decoracao']['8'] = {'lado': dc['tamanho'][0], 'fatia': dc['nine_slice']['esquerda'], 'corDoNome': dc['cor_do_nome'], 'sombraDoNome': dc['cor_do_nome_sombra']}

# efeitos: vídeos (576x864, sem transparência)
for n, dur in ((6, 3), (10, 4)):
    for ext in ('mp4', 'webm'):
        shutil.copy(os.path.join(O, 'efeitos', f'vip-{n}-efeito.{ext}'), P('videos', 'vip', f'efeito-{n}.{ext}'))
    man['efeitos'][str(n)] = {'duracaoS': dur, 'largura': 576, 'altura': 864}

json.dump(man, open(os.path.join(R, 'src', 'assets', 'vipArteManifesto.json'), 'w'), indent=1)
