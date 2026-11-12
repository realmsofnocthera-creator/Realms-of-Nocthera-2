"""Camada de geração: interface comum para provedores de imagem (manual, comando externo, API HTTP)."""
from .base import AguardandoImagem, PedidoGeracao, ProvedorImagem, ProvedorNaoConfigurado, ResultadoGeracao
from .registro import obter_provedor

__all__ = ["AguardandoImagem", "PedidoGeracao", "ProvedorImagem", "ProvedorNaoConfigurado",
           "ResultadoGeracao", "obter_provedor"]
