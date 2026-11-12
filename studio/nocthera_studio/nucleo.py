"""Carregamento de imagens, configuração e tipos compartilhados."""
from __future__ import annotations

import hashlib
import json
import os
from dataclasses import dataclass, field
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent  # .../studio
CONFIG = RAIZ / "config"
ASSETS = Path(os.environ.get("NOCTHERA_ASSETS", RAIZ / "assets"))  # sobrescrevível para demos/testes

ERRO, AVISO, INFO = "erro", "aviso", "info"
Pixel = tuple  # (r, g, b, a)
VIZ4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
VIZ8 = VIZ4 + ((1, 1), (-1, -1), (1, -1), (-1, 1))


@dataclass
class Achado:
    verificacao: str
    codigo: str
    severidade: str
    mensagem: str
    dados: dict = field(default_factory=dict)


@dataclass
class Resultado:
    nome: str
    achados: list[Achado] = field(default_factory=list)
    metricas: dict = field(default_factory=dict)

    def add(self, codigo, severidade, mensagem, **dados):
        self.achados.append(Achado(self.nome, codigo, severidade, mensagem, dados))

    @property
    def erros(self):
        return [a for a in self.achados if a.severidade == ERRO]

    @property
    def avisos(self):
        return [a for a in self.achados if a.severidade == AVISO]

    def para_dict(self):
        return {
            "nome": self.nome,
            "metricas": self.metricas,
            "achados": [a.__dict__ for a in self.achados],
        }


@dataclass
class Imagem:
    caminho: Path
    formato: str | None
    modo_original: str
    alfa_nativo: bool
    rgba: Image.Image
    largura: int
    altura: int
    px: list  # px[y][x] = (r, g, b, a); transparentes normalizados em (0,0,0,0)? não: bruto
    sha256: str

    def opaco(self, x, y):
        return self.px[y][x][3] > 0

    def dentro(self, x, y):
        return 0 <= x < self.largura and 0 <= y < self.altura


def sha256_arquivo(caminho: Path) -> str:
    h = hashlib.sha256()
    with open(caminho, "rb") as f:
        for bloco in iter(lambda: f.read(65536), b""):
            h.update(bloco)
    return h.hexdigest()


def carregar(caminho) -> Imagem:
    caminho = Path(caminho)
    with Image.open(caminho) as im:
        formato = im.format
        modo = im.mode
        alfa = modo in ("RGBA", "LA", "PA") or "transparency" in im.info
        rgba = im.convert("RGBA")
    rgba.load()
    w, h = rgba.size
    dados = list(rgba.get_flattened_data() if hasattr(rgba, 'get_flattened_data') else rgba.getdata())
    px = [dados[y * w:(y + 1) * w] for y in range(h)]
    return Imagem(caminho, formato, modo, alfa, rgba, w, h, px, sha256_arquivo(caminho))


def carregar_json(caminho) -> dict:
    with open(caminho, encoding="utf-8") as f:
        return json.load(f)


def padroes() -> dict:
    return carregar_json(CONFIG / "padroes.json")


def cfg_categoria(categoria: str | None, pad: dict | None = None) -> dict:
    pad = pad or padroes()
    cats = pad["categorias"]
    return cats.get(categoria or "generico", cats["generico"])


def hex_de(rgb) -> str:
    return "#%02x%02x%02x" % tuple(rgb[:3])


def rgb_de(hexa: str) -> tuple:
    h = hexa.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def distancia(a, b) -> float:
    return sum((a[i] - b[i]) ** 2 for i in range(3)) ** 0.5


def luminancia(c) -> float:
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
