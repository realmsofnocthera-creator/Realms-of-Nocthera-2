from __future__ import annotations

from ..nucleo import CONFIG, carregar_json
from .base import ProvedorImagem
from .comando_externo import ProvedorComandoExterno
from .http_api import ProvedorHttp
from .manual import ProvedorManual


def obter_provedor(nome: str | None = None) -> ProvedorImagem:
    cfg = carregar_json(CONFIG / "provedores.json")
    nome = nome or cfg.get("padrao", "manual")
    if nome == "manual":
        return ProvedorManual()
    if nome == "comando_externo":
        return ProvedorComandoExterno(cfg["comando_externo"])
    if nome == "http_api":
        return ProvedorHttp(cfg["http_api"])
    raise ValueError(f"Provedor desconhecido: {nome}")
