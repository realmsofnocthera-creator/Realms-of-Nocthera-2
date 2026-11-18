#!/usr/bin/env python3
"""Converte os vídeos das ultimates do Yuri (pastas 0N_Classe/NN_<nome>__{cinematica_completa,corte_cara}.mp4, 1080x1920) para
540x960 H.264 sem áudio, em `public/videos/ultimates/<id da habilidade>-{cinematica,corte}-v1.mp4`.
Uso: python3 scripts/ultimates/converter.py <pasta do zip descompactado>"""
import glob, os, re, subprocess, sys
from concurrent.futures import ThreadPoolExecutor

ORIGEM = sys.argv[1]
SAIDA = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public/videos/ultimates')
# as ultimates das classes (00_CLASSE_*) para o id da habilidade da classe
CLASSE = {'ira_barbaro': 'barbaro_ira_do_barbaro', 'juramento_cavaleiro': 'cavaleiro_juramento_do_guardiao', 'cataclismo_arcano': 'feiticeiro_cataclismo_arcano',
          'danca_das_laminas': 'bandido_danca_das_laminas', 'milagre_divino': 'profeta_milagre_divino', 'corte_do_vazio': 'samurai_corte_do_vazio'}
os.makedirs(SAIDA, exist_ok=True)
tarefas = []
for arq in sorted(glob.glob(os.path.join(ORIGEM, '*', '*.mp4'))):
    nome = os.path.basename(arq)[:-4]
    m = re.match(r'\d+_(CLASSE_)?(.+)__(cinematica_completa|corte_cara)$', nome)
    assert m, nome
    id_ = CLASSE[m.group(2)] if m.group(1) else m.group(2)
    tipo = 'cinematica' if m.group(3) == 'cinematica_completa' else 'corte'
    tarefas.append((arq, os.path.join(SAIDA, f'{id_}-{tipo}-v1.mp4'), 30 if tipo == 'cinematica' else 28))

def converter(t):
    arq, saida, crf = t
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', arq, '-an', '-vf', 'scale=540:960:flags=neighbor', '-c:v', 'libx264', '-preset', 'slow', '-crf', str(crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', saida], check=True)
    return os.path.basename(saida), os.path.getsize(saida)

with ThreadPoolExecutor(4) as ex:
    total = 0
    for nome, tam in ex.map(converter, tarefas):
        total += tam
        print(f'{nome:60s} {tam // 1024:5d} KB')
print('total', total // 1024, 'KB', len(tarefas), 'vídeos')
