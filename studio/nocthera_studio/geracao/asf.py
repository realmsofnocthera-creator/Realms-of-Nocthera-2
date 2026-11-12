"""Provedor que usa o `route_media.py` do Agent Sprite Forge (skill generate2dmedia).

O ASF decide a rota (API com chave > CLI local logado > nada). Aqui a rota só é EXECUTADA se o
usuário autorizou um teto em dólares. Sem autorização, `planejar()` mostra a rota e a estimativa
(dry-run do ASF: nenhuma chave usada, nada enviado) e `gerar()` recusa.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

from ..nucleo import ASSETS, RAIZ
from .base import (GastoNaoAutorizado, PedidoGeracao, ProvedorImagem, ProvedorNaoConfigurado,
                   ResultadoGeracao)

ROUTE_MEDIA = RAIZ.parent / ".claude" / "skills" / "generate2dmedia" / "scripts" / "route_media.py"


class ProvedorAsf(ProvedorImagem):
    nome = "asf_route"

    def __init__(self, cfg: dict | None = None):
        self.cfg = cfg or {}
        self.script = Path(os.environ.get("NOCTHERA_ROUTE_MEDIA", self.cfg.get("route_media") or ROUTE_MEDIA))

    # -- execução do route_media -------------------------------------------------
    def _rodar(self, args: list, timeout: int = 600):
        if not self.script.exists():
            raise ProvedorNaoConfigurado(f"route_media.py não encontrado em {self.script}. Instale o Agent Sprite Forge "
                                         "(.claude/skills/generate2dmedia).")
        r = subprocess.run([sys.executable, str(self.script), *map(str, args)], capture_output=True, text=True,
                           timeout=timeout, env=os.environ.copy())
        linha = (r.stdout.strip().splitlines() or [""])[-1]
        try:
            dados = json.loads(linha)
        except ValueError:
            dados = {"status": "error", "mensagem": (r.stderr or r.stdout).strip()[:400]}
        return r.returncode, dados

    def _args(self, pedido: PedidoGeracao, pf: Path, out: Path, extra=()):
        a = ["image", "--prompt-file", pf, "--out-dir", out, "--size", self.cfg.get("tamanho", "1024x1024"),
             "--route", self.cfg.get("rota", "auto"), "--tier", self.cfg.get("tier", "draft"),
             "--project-dir", ASSETS, "--purpose", f"nocthera:{pedido.id}"[:200]]
        for ref in pedido.referencias:
            a += ["--reference", ref]
        return a + list(extra)

    def planejar(self, pedido: PedidoGeracao) -> dict:
        with tempfile.TemporaryDirectory() as tmp:
            pf = Path(tmp) / "prompt.txt"
            pf.write_text(pedido.prompt, encoding="utf-8")
            codigo, d = self._rodar(self._args(pedido, pf, Path(tmp) / "saida", ["--dry-run"]), timeout=60)
        if d.get("status") == "dry-run":
            return {"provedor": self.nome, "rota": d.get("route"), "modelo": d.get("model"),
                    "estimativa_usd": d.get("estimateUsd"), "observacao": d.get("estimate", "")}
        motivos = "; ".join(d.get("skipped", [])) or d.get("mensagem", "")
        raise ProvedorNaoConfigurado("Nenhuma rota de imagem disponível no ASF "
                                     f"(status {d.get('status')}). Motivos: {motivos}")

    def gerar(self, pedido: PedidoGeracao) -> ResultadoGeracao:
        plano = self.planejar(pedido)  # levanta ProvedorNaoConfigurado se não houver rota
        teto = pedido.autorizacao_usd
        est = plano.get("estimativa_usd")
        if teto is None:
            raise GastoNaoAutorizado(f"Rota {plano['rota']} (estimativa {est} USD) NÃO autorizada: nada foi enviado. "
                                     "Peça ao usuário e rode com --autorizo-gasto <USD>.", plano)
        if est is None or est > teto:
            raise GastoNaoAutorizado(f"Estimativa {est} USD acima do teto autorizado de {teto} USD (ou desconhecida): "
                                     "nada foi enviado.", plano)
        with tempfile.TemporaryDirectory() as tmp:
            pf = Path(tmp) / "prompt.txt"
            pf.write_text(pedido.prompt, encoding="utf-8")
            codigo, d = self._rodar(self._args(pedido, pf, Path(tmp) / "saida",
                                               ["--budget-usd", teto, "--max-calls", 1]))
            if codigo != 0 or d.get("status") != "ok":
                raise RuntimeError(f"route_media falhou (exit {codigo}): {d}")
            imagem = Path(d["artifact"])
            if not imagem.is_absolute():
                imagem = Path.cwd() / imagem
            dados = imagem.read_bytes()
        return ResultadoGeracao([dados], {"provedor": self.nome, "rota": d.get("route"),
                                          "estimativa_usd": d.get("estimateUsd"), "autorizado_usd": teto,
                                          "ledger": str(ASSETS / ".forge" / "ledger.jsonl")})
