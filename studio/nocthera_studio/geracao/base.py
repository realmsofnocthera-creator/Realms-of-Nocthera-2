from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


class ProvedorNaoConfigurado(RuntimeError):
    """O provedor existe, mas falta URL, chave ou comando. Nunca cai para um desenho de mentira."""


class GastoNaoAutorizado(RuntimeError):
    """Gerar custaria dinheiro/cota e o usuário não autorizou um teto. Nada foi enviado."""

    def __init__(self, mensagem, plano=None):
        super().__init__(mensagem)
        self.plano = plano or {}


class AguardandoImagem(RuntimeError):
    """Provedor manual: a imagem ainda não foi colocada em assets/entrada/."""


@dataclass
class PedidoGeracao:
    id: str
    categoria: str
    prompt: str
    negativo: str = ""
    semente: int = 0
    largura: int = 1024  # geração em alta; o estúdio reduz para 96/128 no pós-processamento
    altura: int = 1024
    referencias: list = field(default_factory=list)  # caminhos de imagens de referência (codixel: parta de imagens reais)
    autorizacao_usd: float | None = None  # teto de gasto autorizado pelo USUÁRIO para esta chamada; None = nenhum


@dataclass
class ResultadoGeracao:
    imagens: list  # lista de bytes PNG/JPEG/WebP
    metadados: dict = field(default_factory=dict)


class ProvedorImagem(ABC):
    nome = "base"

    #: o provedor gasta dinheiro/cota? (manual não gasta)
    gasta = True

    def planejar(self, pedido: PedidoGeracao) -> dict:
        """Diz o que aconteceria, SEM gerar nem gastar. Provedores com estimativa devem sobrescrever."""
        return {"provedor": self.nome, "rota": self.nome, "estimativa_usd": None,
                "observacao": "custo desconhecido para este provedor"}

    @abstractmethod
    def gerar(self, pedido: PedidoGeracao) -> ResultadoGeracao: ...
