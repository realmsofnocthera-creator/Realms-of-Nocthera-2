"""Briefing → prompt. Mantém o estilo fixo e coloca no briefing só o que muda de ativo para ativo."""
from __future__ import annotations

from .nucleo import CONFIG, carregar_json, cfg_categoria

CAMPOS_OBRIGATORIOS = ("id", "categoria", "nome", "descricao")


def validar_briefing(b: dict):
    faltam = [c for c in CAMPOS_OBRIGATORIOS if not b.get(c)]
    if faltam:
        raise ValueError("Briefing incompleto, faltam: " + ", ".join(faltam))
    if b["categoria"] not in ("monstro", "arma", "icone"):
        raise ValueError("categoria deve ser monstro, arma ou icone")
    if b.get("tamanho", 128) not in (96, 128):
        raise ValueError("tamanho nativo deve ser 96 ou 128")


def montar_prompt(b: dict) -> dict:
    validar_briefing(b)
    est = carregar_json(CONFIG / "estilo_prompt.json")
    cfg = cfg_categoria(b["categoria"])
    base = est["base"].format(max_cores=cfg["max_cores"])
    materiais = ", ".join(b.get("materiais", [])) or "as described"
    rar = est["raridades"].get(b.get("raridade", "comum"), est["raridades"]["comum"])
    corpo = est["categorias"][b["categoria"]].format(descricao=b["descricao"], materiais=materiais, raridade=rar)
    extras = []
    if b.get("elemento"):
        extras.append(f"elemental theme: {b['elemento']}")
    if b.get("notas_de_arte"):
        extras.append(b["notas_de_arte"])
    prompt = ". ".join([corpo, base] + extras)
    return {"prompt": prompt, "negativo": est["negativo"], "semente": b.get("semente", 0),
            "tamanho": b.get("tamanho", 128), "categoria": b["categoria"], "id": b["id"]}
