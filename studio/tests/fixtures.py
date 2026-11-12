"""Imagens SINTÉTICAS usadas só para testar os validadores.

Não são arte e nunca entram em assets/. O "sprite válido" é um blob feito de elipses apenas para
ter silhueta, contorno de 1 px, clusters grandes e cores da paleta; ele exercita o auditor, não o
estúdio. Os defeitos (antialiasing, ampliação, fundo, ruído...) são produzidos a partir dele.
"""
from __future__ import annotations

import random

from PIL import Image, ImageDraw, ImageFilter

from nocthera_studio.paleta import carregar_paleta

PAL = carregar_paleta("nocthera-32")
C = PAL.cores


def sprite_valido(tam=128) -> Image.Image:
    im = Image.new("RGBA", (tam, tam), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    k = tam / 128

    def e(x0, y0, x1, y1, cor):
        d.ellipse([round(x0 * k), round(y0 * k), round(x1 * k), round(y1 * k)], fill=C[cor] + (255,))

    def r(x0, y0, x1, y1, cor):
        d.rectangle([round(x0 * k), round(y0 * k), round(x1 * k), round(y1 * k)], fill=C[cor] + (255,))

    e(16, 20, 112, 112, "sombra-0")
    e(17, 21, 111, 111, "musgo-1")
    e(26, 30, 94, 90, "musgo-2")
    e(34, 38, 72, 66, "musgo-3")
    r(50, 70, 78, 84, "sangue-2")
    r(51, 71, 77, 73, "sangue-3")
    return im


def com_antialiasing() -> Image.Image:
    return sprite_valido().rotate(7, resample=Image.BICUBIC)


def ampliado() -> Image.Image:
    return sprite_valido(32).resize((128, 128), Image.NEAREST)


def borrado() -> Image.Image:
    return sprite_valido().filter(ImageFilter.GaussianBlur(1.2))


def fundo_opaco() -> Image.Image:
    fundo = Image.new("RGBA", (128, 128), (255, 0, 255, 255))
    fundo.alpha_composite(sprite_valido())
    return fundo


def fora_da_paleta() -> Image.Image:
    im = sprite_valido()
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a:
                px[x, y] = (min(r + 3, 255), min(g + 5, 255), b, a)
    return im


def com_ruido(semente=1) -> Image.Image:
    im = sprite_valido()
    px = im.load()
    rnd = random.Random(semente)
    cores = list(C.values())
    for _ in range(2200):
        x, y = rnd.randrange(128), rnd.randrange(128)
        if px[x, y][3]:
            px[x, y] = rnd.choice(cores) + (255,)
    return im


def xadrez_falso() -> Image.Image:
    im = Image.new("RGBA", (128, 128), (255, 255, 255, 255))
    d = ImageDraw.Draw(im)
    for y in range(0, 128, 8):
        for x in range(0, 128, 8):
            if (x // 8 + y // 8) % 2:
                d.rectangle([x, y, x + 7, y + 7], fill=(204, 204, 204, 255))
    im.alpha_composite(sprite_valido())
    return im


def com_pixel_solto() -> Image.Image:
    im = sprite_valido()
    px = im.load()
    for x, y in [(2, 2), (3, 120), (120, 3), (124, 124), (60, 1), (1, 60), (126, 60), (60, 126)]:
        px[x, y] = C["osso-2"] + (255,)
    return im


def alfa_parcial() -> Image.Image:
    im = sprite_valido()
    px = im.load()
    for y in range(40, 80):
        px[64, y] = C["musgo-3"] + (128,)
    return im


def tamanho_errado() -> Image.Image:
    return sprite_valido(100)


def bruto_de_modelo(tam=640) -> Image.Image:
    """Simula a SAÍDA BRUTA de um gerador: grande, suave, com fundo magenta. Só para testar o pós-processo."""
    base = sprite_valido(tam // 2).resize((tam, tam), Image.BICUBIC).filter(ImageFilter.GaussianBlur(2))
    fundo = Image.new("RGBA", (tam, tam), (255, 0, 255, 255))
    fundo.alpha_composite(base)
    return fundo.convert("RGB").convert("RGBA")


def retangulo_cena() -> Image.Image:
    """Cena/moldura: um retângulo quase cheio com cantos cortados (caso real: arte de cena enviada como sprite)."""
    im = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rectangle([8, 8, 119, 119], fill=C["sombra-0"] + (255,))
    d.rectangle([12, 12, 115, 115], fill=C["aco-1"] + (255,))
    d.rectangle([30, 30, 90, 90], fill=C["aco-2"] + (255,))
    for x, y in ((8, 8), (119, 8), (8, 119), (119, 119)):
        im.putpixel((x, y), (0, 0, 0, 0))
    return im
