from __future__ import annotations

import base64
import json
import os
import re
import urllib.request

from .base import PedidoGeracao, ProvedorImagem, ProvedorNaoConfigurado, ResultadoGeracao


def _subst_env(texto: str) -> str:
    def troca(m):
        v = os.environ.get(m.group(1))
        if not v:
            raise ProvedorNaoConfigurado(f"Variável de ambiente {m.group(1)} não definida.")
        return v
    return re.sub(r"\$\{(\w+)\}", troca, texto)


def _subst_corpo(obj, valores):
    if isinstance(obj, str):
        if re.fullmatch(r"\{(\w+)\}", obj) and obj[1:-1] == "semente":
            return valores["semente"]  # número, não texto
        return obj.format(**valores)
    if isinstance(obj, dict):
        return {k: _subst_corpo(v, valores) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_subst_corpo(v, valores) for v in obj]
    return obj


def _caminho(dado, caminho: str):
    for parte in caminho.split("."):
        dado = dado[int(parte)] if isinstance(dado, list) else dado[parte]
    return dado


class ProvedorHttp(ProvedorImagem):
    """Cliente JSON genérico e configurável. Não assume fornecedor; só entrega o que o JSON descrever."""
    nome = "http_api"

    def __init__(self, cfg: dict):
        self.cfg = cfg

    def gerar(self, pedido: PedidoGeracao) -> ResultadoGeracao:
        if not self.cfg.get("ativo") or not self.cfg.get("url"):
            raise ProvedorNaoConfigurado(
                "http_api inativo: defina 'ativo': true e 'url' em config/provedores.json "
                "(veja docs/INTEGRACAO_API.md).")
        valores = {"prompt": pedido.prompt, "negativo": pedido.negativo, "semente": pedido.semente,
                   "largura": pedido.largura, "altura": pedido.altura, "id": pedido.id}
        corpo = json.dumps(_subst_corpo(self.cfg["corpo"], valores)).encode()
        cab = {k: _subst_env(v) for k, v in self.cfg.get("cabecalhos", {}).items()}
        req = urllib.request.Request(self.cfg["url"], data=corpo, headers=cab, method=self.cfg.get("metodo", "POST"))
        with urllib.request.urlopen(req, timeout=self.cfg.get("timeout_s", 120)) as r:
            resp = json.loads(r.read())
        bruto = _caminho(resp, self.cfg["resposta"]["caminho"])
        if self.cfg["resposta"]["tipo"] == "base64":
            imagem = base64.b64decode(bruto)
        else:  # "url"
            with urllib.request.urlopen(bruto, timeout=self.cfg.get("timeout_s", 120)) as r:
                imagem = r.read()
        return ResultadoGeracao([imagem], {"provedor": self.nome, "url": self.cfg["url"],
                                           "modelo": self.cfg["corpo"].get("model", "")})
