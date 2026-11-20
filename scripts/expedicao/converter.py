#!/usr/bin/env python3
"""Converte a arte da Expedição do Yuri (zip expedicao_ui_pixel: assets_pixel/*.png e animacoes/*.webp) para o site:
  - public/images/expedicao/<nome>.webp (as peças, sem perda; _ vira -)
  - public/images/expedicao/animacoes/<nome>.webp (as animações, copiadas: carimbos e pops tocam uma vez, o resto em laço)
Só entram as peças que a tela usa. Uso: python3 -I scripts/expedicao/converter.py <pasta descompactada do zip>"""
import glob, os, shutil, sys
from PIL import Image

ORIGEM = sys.argv[1]
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
SAIDA = os.path.join(RAIZ, 'public/images/expedicao/')
ANIM = SAIDA + 'animacoes/'
os.makedirs(ANIM, exist_ok=True)
for f in glob.glob(SAIDA + '*.webp') + glob.glob(ANIM + '*.webp'):
    os.remove(f)

PECAS = [
    'cenario', 'fita_titulo', 'vaga_livre', 'vaga_andamento', 'vaga_pronta', 'barra_trilho', 'barra_preenchimento', 'btn_fechar',
    'btn_ouro_normal', 'btn_ouro_pressionado', 'btn_ouro_desativado', 'btn_carmesim_normal', 'btn_carmesim_pressionado', 'btn_carmesim_desativado',
    'turno_2h', 'turno_6h', 'turno_8h', 'turno_12h', 'avanco_ampulheta', 'ouro', 'fragmento_memoria', 'pedra_recordacao',
    'material_comum', 'material_raro', 'material_muito_raro', 'material_epico', 'material_lendario',
    'selo_desgastado', 'selo_encantado', 'selo_eternidade', 'selo_origem',
]
ANIMACOES = [
    'carimbo_enviar', 'carimbo_coletar', 'vaga_pronta_brilho', 'barra_progresso_brilho', 'turno_selecionado_brilho',
    'pop_ouro', 'pop_fragmento_memoria', 'pop_pedra_recordacao', 'pop_avanco_ampulheta',
    'pop_material_comum', 'pop_material_raro', 'pop_material_muito_raro', 'pop_material_epico', 'pop_material_lendario',
    'pop_selo_desgastado', 'pop_selo_encantado', 'pop_selo_eternidade', 'pop_selo_origem',
    'selo_desgastado_loop', 'selo_encantado_loop', 'selo_eternidade_loop', 'selo_origem_loop',
]
total = 0
for n in PECAS:
    im = Image.open(os.path.join(ORIGEM, 'assets_pixel', n + '.png')).convert('RGBA')
    destino = f'{SAIDA}{n.replace("_", "-")}.webp'
    im.save(destino, 'WEBP', lossless=True, quality=100, method=6)
    total += os.path.getsize(destino)
for n in ANIMACOES:
    destino = f'{ANIM}{n.replace("_", "-")}.webp'
    shutil.copy(os.path.join(ORIGEM, 'animacoes', n + '.webp'), destino)
    total += os.path.getsize(destino)
print(len(PECAS), 'peças e', len(ANIMACOES), 'animações,', total // 1024, 'KB')
