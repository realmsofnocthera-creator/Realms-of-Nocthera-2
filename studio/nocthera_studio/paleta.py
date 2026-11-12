"""Paletas controladas: carregar (.json do estúdio ou .hex da Lospec), mapear e consultar."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from .nucleo import CONFIG, carregar_json, distancia, hex_de, rgb_de


@dataclass
class Paleta:
    nome: str
    cores: dict  # nome -> (r,g,b)
    rampas: dict  # nome da rampa -> [nomes]

    def __post_init__(self):
        self._por_rgb = {v: k for k, v in self.cores.items()}
        self._cache = {}

    def contem(self, rgb) -> bool:
        return tuple(rgb[:3]) in self._por_rgb

    def nome_da_cor(self, rgb):
        return self._por_rgb.get(tuple(rgb[:3]))

    def mais_proxima(self, rgb):
        """Retorna (nome, rgb, distancia) da cor da paleta mais próxima."""
        chave = tuple(rgb[:3])
        if chave not in self._cache:
            melhor = min(self.cores.items(), key=lambda kv: distancia(chave, kv[1]))
            self._cache[chave] = (melhor[0], melhor[1], distancia(chave, melhor[1]))
        return self._cache[chave]

    def rampa_de(self, rgb):
        nome = self.nome_da_cor(rgb)
        for r, membros in self.rampas.items():
            if nome in membros:
                return r
        return None


def carregar_paleta(ref: str | Path) -> Paleta:
    """`ref` pode ser o nome de uma paleta em config/ (ex.: 'nocthera-32') ou um caminho .json/.hex."""
    p = Path(ref)
    if not p.exists():
        p = CONFIG / f"paleta-{ref}.json"
    if not p.exists():
        raise FileNotFoundError(f"Paleta não encontrada: {ref}")
    if p.suffix == ".hex":  # formato Lospec: uma cor hexadecimal por linha
        cores = {}
        for i, linha in enumerate(p.read_text().split()):
            if linha.strip():
                cores[f"cor-{i:02d}"] = rgb_de(linha.strip())
        return Paleta(p.stem, cores, {})
    d = carregar_json(p)
    return Paleta(d["nome"], {k: rgb_de(v) for k, v in d["cores"].items()}, d.get("rampas", {}))


def exportar_hex(paleta: Paleta) -> str:
    return "\n".join(hex_de(v).lstrip("#") for v in paleta.cores.values()) + "\n"
