from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

from .base import PedidoGeracao, ProvedorImagem, ProvedorNaoConfigurado, ResultadoGeracao


class ProvedorComandoExterno(ProvedorImagem):
    """Executa um comando local sem shell. Útil para ligar geradores de outros repositórios."""
    nome = "comando_externo"

    def __init__(self, cfg: dict):
        self.cfg = cfg

    def gerar(self, pedido: PedidoGeracao) -> ResultadoGeracao:
        comando = self.cfg.get("comando") or []
        if not comando:
            raise ProvedorNaoConfigurado("config/provedores.json: 'comando_externo.comando' está vazio.")
        with tempfile.TemporaryDirectory() as tmp:
            pf, saida = Path(tmp) / "prompt.txt", Path(tmp) / "saida.png"
            pf.write_text(pedido.prompt, encoding="utf-8")
            args = [a.format(prompt_file=pf, saida=saida, semente=pedido.semente, tamanho=pedido.largura)
                    for a in comando]
            subprocess.run(args, check=True, timeout=self.cfg.get("timeout_s", 300))
            if not saida.exists():
                raise RuntimeError("O comando terminou sem criar o arquivo de saída.")
            return ResultadoGeracao([saida.read_bytes()], {"provedor": self.nome, "comando": args[0]})
