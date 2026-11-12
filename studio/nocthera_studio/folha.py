"""Folha de revisão: uma única PNG para olhar o sprite do jeito certo (e para um modelo visual ler).

Contém: 4x sobre xadrez com marcadores dos achados, 1x real, teste de silhueta (escuro sobre claro)
e a faixa de paleta. É material de interface (não é arte do jogo), por isso pode ter texto.
"""
from __future__ import annotations

import unicodedata
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from .nucleo import ASSETS, carregar, luminancia


def _t(texto: str) -> str:
    """A fonte embutida do Pillow não tem acentos: a folha usa texto sem diacríticos."""
    return unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()


def _fonte(tam):
    try:
        return ImageFont.load_default(size=tam)
    except TypeError:  # Pillow antigo
        return ImageFont.load_default()


def xadrez(w, h, lado=8, c1=(70, 66, 82), c2=(96, 92, 110)):
    im = Image.new("RGB", (w, h), c1)
    d = ImageDraw.Draw(im)
    for y in range(0, h, lado):
        for x in range(0, w, lado):
            if (x // lado + y // lado) % 2:
                d.rectangle([x, y, x + lado - 1, y + lado - 1], fill=c2)
    return im


def gerar_folha(caminho, relatorio: dict | None = None, destino: Path | None = None, escala: int = 4) -> Path:
    img = carregar(caminho)
    w, h = img.largura, img.altura
    pagina = Image.new("RGB", (w * escala + 300, max(h * escala, 360) + 150), (24, 20, 32))
    d = ImageDraw.Draw(pagina)
    f, fp = _fonte(14), _fonte(11)
    d.text((8, 4), _t(f"{Path(caminho).name}  {w}x{h}  ({escala}x, vizinho mais proximo)"), fill=(230, 224, 240), font=f)
    fundo = xadrez(w * escala, h * escala, lado=escala * 4)
    grande = img.rgba.resize((w * escala, h * escala), Image.NEAREST)
    fundo.paste(grande, (0, 0), grande)
    dm = ImageDraw.Draw(fundo)
    if relatorio:
        for v in relatorio.get("verificacoes", []):
            for a in v["achados"]:
                cor = (255, 0, 80) if a["severidade"] == "erro" else (255, 200, 0)
                for x, y in a.get("dados", {}).get("locais", [])[:40]:
                    dm.rectangle([x * escala - 1, y * escala - 1, (x + 1) * escala, (y + 1) * escala], outline=cor)
    pagina.paste(fundo, (0, 24))
    x0 = w * escala + 12
    d.text((x0, 24), _t("1x real"), fill=(230, 224, 240), font=fp)
    um = xadrez(w, h, lado=4)
    um.paste(img.rgba, (0, 0), img.rgba)
    pagina.paste(um, (x0, 40))
    sil = Image.new("RGB", (w, h), (236, 232, 222))
    mascara = img.rgba.split()[3].point(lambda a: 255 if a else 0)
    sil.paste(Image.new("RGB", (w, h), (20, 16, 28)), (0, 0), mascara)
    d.text((x0 + w + 12, 24), _t("silhueta 1x"), fill=(230, 224, 240), font=fp)
    pagina.paste(sil, (x0 + w + 12, 40))
    d.text((x0, 40 + h + 8), _t("silhueta 0,5x (teste de leitura)"), fill=(230, 224, 240), font=fp)
    pagina.paste(sil.resize((w // 2, h // 2), Image.NEAREST), (x0, 56 + h))
    cont = {}
    for linha in img.px:
        for p in linha:
            if p[3]:
                cont[p[:3]] = cont.get(p[:3], 0) + 1
    ordem = sorted(cont, key=luminancia)
    ypal = h * escala + 40
    d.text((8, ypal), _t(f"{len(ordem)} cores (do mais escuro ao mais claro)"), fill=(230, 224, 240), font=fp)
    lado = max(10, min(28, (w * escala) // max(len(ordem), 1)))
    for i, c in enumerate(ordem):
        d.rectangle([8 + i * lado, ypal + 16, 8 + (i + 1) * lado - 2, ypal + 16 + lado], fill=c)
    if relatorio:
        d.text((8, ypal + 24 + lado), _t(f"veredito tecnico: {relatorio['veredito_tecnico']}  "
               f"({relatorio['erros']} erros / {relatorio['avisos']} avisos)"), fill=(255, 220, 140), font=fp)
    destino = destino or ASSETS / "previews" / (Path(caminho).stem + ".folha.png")
    destino.parent.mkdir(parents=True, exist_ok=True)
    pagina.save(destino)
    return destino
