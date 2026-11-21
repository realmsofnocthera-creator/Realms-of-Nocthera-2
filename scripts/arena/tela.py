#!/usr/bin/env python3
"""Converte as peças das telas da Arena do Yuri (zips arena_selecao_de_modo_2, arena_selecao, arena_ranqueada_selecao, arena_campeonato; grade 360x540)
para public/images/arena/tela/*.webp (sem perda; _ vira -) e os 4 fundos (coliseu, torre, torneio, campeão). Só entram as peças que as telas usam (a
fase de grupos e as linhas da chave não: a chave desenha as linhas em CSS).
Uso: python3 -I scripts/arena/tela.py <pasta com as pastas descompactadas dos 4 zips>"""
import os, sys
from PIL import Image

ORIGEM = sys.argv[1]
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
SAIDA = os.path.join(RAIZ, 'public/images/arena/tela/')
os.makedirs(SAIDA, exist_ok=True)
for f in os.listdir(SAIDA):
    os.remove(SAIDA + f)

POR_ZIP = {
    'arena_selecao_de_modo_2': ['modo_arena', 'modo_ranqueada', 'modo_campeonato'],
    'arena_selecao': [
        'titulo', 'voltar', 'livro', 'botao', 'botao_off', 'botao_press',
        'tab1_on', 'tab1_off', 'tab2_on', 'tab2_off', 'tab3_on', 'tab3_off', 'painel_jogador',
        'ficha_cheia', 'ficha_ouro', 'ficha_vazia', 'ic_ampulheta', 'ic_sobe', 'ic_desce', 'ic_espadas',
        'card_forte', 'card_neutro', 'card_fraco', 'trocar', 'ic_replay', 'ic_trofeu', 'linha_vitoria', 'linha_derrota',
        'podio', 'premio_ouro', 'premio_prata', 'ic_moeda', 'ic_diamante', 'ic_selo', 'ic_louros',
    ],
    'arena_ranqueada_selecao': [
        'rcard_forte', 'rcard_neutro', 'rcard_fraco', 'rbotao_trocar', 'badge_queda', 'plat_off', 'plat_ouro', 'plat_vio',
        'recompensas', 'bau_fechado', 'bau_aberto',
    ] + [f'rank{n:02d}_{t}' for n in range(1, 11) for t in 'pg'],
    'arena_campeonato': [
        't_contagem', 't_voce', 't_voce_trancado', 't_cab_on', 't_cab_off', 't_match_eu', 't_match_fim', 't_match_n', 't_match_v',
        't_b_espera', 't_b_fim', 't_b_vivo', 'c_faixa', 'c_trofeu', 'c_bau', 'c_bau_aberto',
        'c_premio_ouro', 'c_premio_prata', 'c_premio_bronze', 'c_premio_azul', 'c_premio_cinza', 'c_coroa', 'c_louros',
        'c_tit1', 'c_tit2', 'c_tit3', 'c_tit5',
    ],
}
FUNDOS = {'coliseu': ('arena_selecao', 'fundo_coliseu_360x540.png'), 'torre': ('arena_ranqueada_selecao', 'fundo_torre_360x540.png'),
          'torneio': ('arena_campeonato', 'fundo_torneio_360x540.png'), 'campeao': ('arena_campeonato', 'fundo_campeao_360x540.png')}
total = 0
def salvar(im, nome):
    global total
    destino = f'{SAIDA}{nome}.webp'
    im.save(destino, 'WEBP', lossless=True, quality=100, method=6)
    total += os.path.getsize(destino)
    assert os.path.getsize(destino) <= 350 * 1024, nome

n = 0
for zip_, nomes in POR_ZIP.items():
    for nome in nomes:
        salvar(Image.open(os.path.join(ORIGEM, zip_, 'pecas', nome + '.png')).convert('RGBA'), nome.replace('_', '-'))
        n += 1
for nome, (zip_, arq) in FUNDOS.items():
    salvar(Image.open(os.path.join(ORIGEM, zip_, arq)).convert('RGB'), f'fundo-{nome}')
    n += 1
print(f'{n} arquivos, {total // 1024} KB')
