from __future__ import annotations

from ..nucleo import ASSETS
from .base import AguardandoImagem, PedidoGeracao, ProvedorImagem, ResultadoGeracao


class ProvedorManual(ProvedorImagem):
    """Pega o que já foi gerado fora (outro modelo, Aseprite, pxl, mão humana) em assets/entrada/."""
    nome = "manual"
    gasta = False

    def planejar(self, pedido):
        return {"provedor": "manual", "rota": "manual", "estimativa_usd": 0.0, "observacao": "sem geração"}

    def gerar(self, pedido: PedidoGeracao) -> ResultadoGeracao:
        achados = sorted((ASSETS / "entrada").glob(f"{pedido.id}*.*"))
        achados = [p for p in achados if p.suffix.lower() in (".png", ".webp", ".jpg", ".jpeg")]
        if not achados:
            raise AguardandoImagem(
                f"Nenhuma imagem em assets/entrada/{pedido.id}*.png. Gere com a ferramenta/modelo de sua "
                "escolha usando o prompt salvo em assets/bruto/ e coloque o arquivo lá.")
        return ResultadoGeracao([p.read_bytes() for p in achados], {"provedor": "manual",
                                                                    "arquivos": [p.name for p in achados]})
