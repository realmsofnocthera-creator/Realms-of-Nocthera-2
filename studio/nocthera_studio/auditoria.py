"""Orquestra as quatro verificações e produz um veredito técnico.

O veredito NUNCA é "aprovado". O melhor resultado possível é `pendente_revisao_visual`: passar nas
verificações mecânicas é condição necessária, não suficiente.
"""
from __future__ import annotations

import json
from pathlib import Path

from .nucleo import ASSETS, Imagem, carregar, cfg_categoria, padroes
from .paleta import Paleta, carregar_paleta
from .verificacoes import (verificar_dimensoes, verificar_paleta, verificar_pixels,
                           verificar_transparencia)

LIMITE_ANALISE = 512
REPROVADO = "reprovado"
PENDENTE = "pendente_revisao_visual"
NOTA = ("Passar nas verificações técnicas não aprova o sprite. Falta a revisão visual: silhueta, "
        "clusters, leitura em tamanho 1x, coerência com a direção de arte (use `aprovar`).")


def auditar_imagem(img: Imagem, categoria: str | None = None, paleta: Paleta | str | None = "padrao") -> dict:
    pad = padroes()
    cfg = cfg_categoria(categoria, pad)
    if paleta == "padrao":
        paleta = carregar_paleta(pad["paleta_padrao"])
    elif isinstance(paleta, str):
        paleta = carregar_paleta(paleta)
    resultados = [verificar_dimensoes(img, cfg, pad)]
    if max(img.largura, img.altura) > LIMITE_ANALISE:
        # Sprites de produção são 96/128. Folhas/ilustrações grandes só passam pela checagem de dimensões.
        resultados[0].add("analise_parcial", "info",
                          f"Imagem maior que {LIMITE_ANALISE}px: demais verificações ignoradas.")
    else:
        resultados += [verificar_transparencia(img, cfg, pad),
                       verificar_paleta(img, cfg, paleta, pad),
                       verificar_pixels(img, cfg, pad)]
    erros = sum(len(r.erros) for r in resultados)
    avisos = sum(len(r.avisos) for r in resultados)
    return {
        "arquivo": str(img.caminho),
        "sha256": img.sha256,
        "categoria": categoria or "generico",
        "paleta": paleta.nome if paleta else None,
        "tamanho": [img.largura, img.altura],
        "veredito_tecnico": REPROVADO if erros else PENDENTE,
        "erros": erros,
        "avisos": avisos,
        "verificacoes": [r.para_dict() for r in resultados],
        "nota": NOTA,
    }


def auditar_arquivo(caminho, categoria=None, paleta="padrao") -> dict:
    return auditar_imagem(carregar(caminho), categoria, paleta)


def achados_planos(relatorio: dict):
    for v in relatorio["verificacoes"]:
        for a in v["achados"]:
            yield a


def resumo_texto(rel: dict, verbose: bool = True) -> str:
    sinal = {"erro": "✖", "aviso": "▲", "info": "·"}
    linhas = [f"{Path(rel['arquivo']).name}  [{rel['categoria']}]  {rel['tamanho'][0]}x{rel['tamanho'][1]}  "
              f"→ {rel['veredito_tecnico'].upper()}  ({rel['erros']} erros, {rel['avisos']} avisos)"]
    if verbose:
        for a in achados_planos(rel):
            linhas.append(f"   {sinal[a['severidade']]} [{a['verificacao']}/{a['codigo']}] {a['mensagem']}")
        if rel["veredito_tecnico"] == PENDENTE:
            linhas.append("   ⏸ " + rel["nota"])
    return "\n".join(linhas)


def salvar_relatorio(rel: dict, destino: Path | None = None) -> Path:
    destino = destino or ASSETS / "relatorios" / (Path(rel["arquivo"]).stem + ".audit.json")
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(json.dumps(rel, ensure_ascii=False, indent=2), encoding="utf-8")
    return destino
