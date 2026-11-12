"""Fluxo completo de um ativo: briefing → prompt → provedor → pós-processamento → auditoria → manifesto."""
from __future__ import annotations

import io
import json
from pathlib import Path

from PIL import Image

from .auditoria import auditar_arquivo, resumo_texto
from .folha import gerar_folha
from .geracao import GastoNaoAutorizado, PedidoGeracao, obter_provedor
from .manifesto import registrar
from .nucleo import ASSETS, RAIZ, carregar_json, cfg_categoria
from .paleta import carregar_paleta
from .posprocessar import posprocessar
from .prompts import montar_prompt

PASTAS = {"monstro": "monstros", "arma": "armas", "icone": "icones"}


def gerar_ativo(caminho_briefing, provedor: str | None = None, metodo: str = "box",
                autorizo_gasto: float | None = None, so_planejar: bool = False) -> dict:
    b = carregar_json(caminho_briefing)
    p = montar_prompt(b)
    pasta_bruta = ASSETS / "bruto" / b["id"]
    pasta_bruta.mkdir(parents=True, exist_ok=True)
    (pasta_bruta / "prompt.json").write_text(json.dumps(p, ensure_ascii=False, indent=2), encoding="utf-8")
    prov = obter_provedor(provedor)
    refs = [str(r if Path(r).is_absolute() else RAIZ / r) for r in b.get("referencias", [])]
    pedido = PedidoGeracao(id=b["id"], categoria=b["categoria"], prompt=p["prompt"], negativo=p["negativo"],
                           semente=p["semente"], referencias=refs, autorizacao_usd=autorizo_gasto)
    if so_planejar:
        return {"id": b["id"], "plano": prov.planejar(pedido), "saidas": []}
    if prov.gasta and autorizo_gasto is None:  # portão geral: nada gasta sem teto autorizado pelo usuário
        raise GastoNaoAutorizado(f"O provedor '{prov.nome}' pode gerar custo e não há --autorizo-gasto <USD>. "
                                 "Nada foi enviado. Use `gerar --planejar` para ver a rota e a estimativa.",
                                 prov.planejar(pedido))
    res = prov.gerar(pedido)
    saidas = []
    for i, dados in enumerate(res.imagens):
        bruto = pasta_bruta / f"bruto_{i:02d}.png"
        Image.open(io.BytesIO(dados)).convert("RGBA").save(bruto)
        cfg = cfg_categoria(b["categoria"])
        paleta = carregar_paleta(b.get("paleta", "nocthera-32"))
        final = posprocessar(Image.open(bruto), p["tamanho"], paleta, cfg["max_cores"], metodo,
                             contorno=cfg.get("contorno", False))
        nome = f"{b['id']}.png" if len(res.imagens) == 1 else f"{b['id']}_v{i + 1}.png"
        destino = ASSETS / "candidatos" / PASTAS[b["categoria"]] / nome
        destino.parent.mkdir(parents=True, exist_ok=True)
        final.save(destino)
        entrada = registrar(destino, b["categoria"], destino.stem,
                            origem={**({"tipo": "modelo"} if prov.gasta else {}), **res.metadados, "prompt": p["prompt"], "semente": p["semente"],
                                    "bruto": str(bruto.relative_to(ASSETS.parent))})
        rel = auditar_arquivo(destino, b["categoria"])
        folha = gerar_folha(destino, rel)
        saidas.append({"candidato": str(destino), "folha": str(folha), "status": entrada["status"],
                       "resumo": resumo_texto(rel)})
    return {"id": b["id"], "saidas": saidas}
