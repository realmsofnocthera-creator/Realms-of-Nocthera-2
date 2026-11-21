#!/usr/bin/env python3
"""Converte as peças da tela do Teste de Equipe do Yuri (zip teste_equipe_assets: px/*.png e fundo_camara_360x540.png, grade 360x540) para
public/images/teste-equipe/tela/*.webp (sem perda; _ vira -). Só entram as peças que a tela usa. O painel das dificuldades (300x567) vem alto
demais para a tela: a arte do Yuri o mostra com 430 de altura, sem as linhas 200 a 336 do meio, então ele é costurado assim aqui.
Uso: python3 -I scripts/teste-equipe/tela.py <pasta descompactada do zip>"""
import glob, os, sys
from PIL import Image

ORIGEM = sys.argv[1]
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
SAIDA = os.path.join(RAIZ, 'public/images/teste-equipe/tela/')
os.makedirs(SAIDA, exist_ok=True)
for f in glob.glob(SAIDA + '*'):
    os.remove(f)
PECAS = [
    'voltar', 'livro', 'titulo', 'botao', 'botao2', 'botao_off', 'botao_press',
    'pil_alma_on', 'pil_alma_off', 'pil_corpo_on', 'pil_corpo_off', 'pil_mente_on', 'pil_mente_off', 'placa_nome',
    'chave_gratis', 'chave_comprada', 'chave_abismo',
    'altar_vazio', 'altar_ocupado', 'altar_pronto', 'altar_trancado', 'lider_on', 'lider_off', 'pronto_on', 'pronto_off', 'feixe_on', 'feixe_off',
    'info', 'mais', 'halo', 'concluido', 'trancado', 'caminho_on', 'caminho_off', 'selo1', 'selo2', 'selo3', 'selo4', 'selo5', 'selo6',
    'moldura1', 'moldura2', 'moldura3', 'moldura4', 'moldura5', 'moldura6', 'placa_recompensa', 'caco', 'poeira', 'diamante', 'carimbo',
    'dorso_alma', 'dorso_corpo', 'dorso_mente',
]
total = 0
def salvar(im, nome):
    global total
    destino = f'{SAIDA}{nome}.webp'
    im.save(destino, 'WEBP', lossless=True, quality=100, method=6)
    total += os.path.getsize(destino)

for n in PECAS:
    salvar(Image.open(os.path.join(ORIGEM, 'px', n + '.png')).convert('RGBA'), n.replace('_', '-'))
painel = Image.open(os.path.join(ORIGEM, 'px', 'painel.png')).convert('RGBA')
assert painel.size == (300, 567)
costurado = Image.new('RGBA', (300, 430), (0, 0, 0, 0))
costurado.paste(painel.crop((0, 0, 300, 200)), (0, 0))
costurado.paste(painel.crop((0, 337, 300, 567)), (0, 200))
salvar(costurado, 'painel')
fundo = Image.open(os.path.join(ORIGEM, 'fundo_camara_360x540.png')).convert('RGB')
destino = f'{SAIDA}fundo.webp'
fundo.save(destino, 'WEBP', lossless=True, quality=100, method=6)
if os.path.getsize(destino) > 330 * 1024:
    fundo.save(destino, 'WEBP', quality=92, method=6)
total += os.path.getsize(destino)
# o fundo das outras vistas: o mesmo, desfocado e escuro (como nas telas de exemplo do Yuri)
from PIL import ImageEnhance, ImageFilter
desfocado = ImageEnhance.Brightness(fundo.filter(ImageFilter.GaussianBlur(2.2))).enhance(0.6)
destino = f'{SAIDA}fundo-desfocado.webp'
desfocado.save(destino, 'WEBP', quality=88, method=6)
total += os.path.getsize(destino)
print(len(PECAS) + 3, 'arquivos,', total // 1024, 'KB; fundo', os.path.getsize(destino) // 1024, 'KB')
