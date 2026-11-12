"""Pós-processamento: converte a saída bruta de um modelo (ou de outra ferramenta) em candidato nativo.

Isto NÃO desenha nada: só remove fundo, enquadra, reduz a resolução, mapeia para a paleta, tira
pixels soltos e garante alfa binário. A qualidade artística vem da fonte; aqui só se corrige o formato.
O resultado continua precisando de auditoria e de revisão visual.
"""
from __future__ import annotations

from collections import Counter, deque

from PIL import Image

from .nucleo import VIZ4, VIZ8, distancia, luminancia
from .paleta import Paleta


def remover_fundo(img: Image.Image, tolerancia: int = 40) -> Image.Image:
    """Remove fundo liso por inundação a partir das bordas (cor estimada pelos cantos)."""
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    cantos = [px[0, 0][:3], px[w - 1, 0][:3], px[0, h - 1][:3], px[w - 1, h - 1][:3]]
    fundo = Counter(cantos).most_common(1)[0][0]
    if px[0, 0][3] == 0:  # já transparente
        return img
    visto = set()
    fila = deque()
    for x in range(w):
        fila += [(x, 0), (x, h - 1)]
    for y in range(h):
        fila += [(0, y), (w - 1, y)]
    while fila:
        x, y = fila.popleft()
        if (x, y) in visto or not (0 <= x < w and 0 <= y < h):
            continue
        if distancia(px[x, y], fundo) > tolerancia:
            continue
        visto.add((x, y))
        px[x, y] = (0, 0, 0, 0)
        for dx, dy in VIZ4:
            fila.append((x + dx, y + dy))
    return img


def _reduzir(img: Image.Image, tam: tuple, metodo: str) -> Image.Image:
    if metodo == "nearest":
        return img.resize(tam, Image.NEAREST)
    if metodo == "box":
        # alfa premultiplicado para que a cor de pixels transparentes não contamine as bordas
        pre = Image.new("RGBA", img.size)
        pre.paste(img, (0, 0))
        return pre.resize(tam, Image.BOX)
    if metodo == "moda":  # cor mais frequente de cada célula: preserva cores já quantizadas
        w, h = img.size
        src = img.load()
        out = Image.new("RGBA", tam)
        po = out.load()
        for y in range(tam[1]):
            y0, y1 = y * h // tam[1], max((y + 1) * h // tam[1], y * h // tam[1] + 1)
            for x in range(tam[0]):
                x0, x1 = x * w // tam[0], max((x + 1) * w // tam[0], x * w // tam[0] + 1)
                celula = [src[i, j] for j in range(y0, y1) for i in range(x0, x1)]
                visiveis = [c for c in celula if c[3] >= 128]
                if len(visiveis) * 2 >= len(celula):  # maioria visível → pixel opaco
                    po[x, y] = Counter(visiveis).most_common(1)[0][0]
                else:
                    po[x, y] = (0, 0, 0, 0)
        return out
    raise ValueError(f"método de redução desconhecido: {metodo}")


def _mapear_paleta(img: Image.Image, paleta: Paleta, max_cores: int) -> Image.Image:
    px = img.load()
    w, h = img.size
    uso = Counter()
    for y in range(h):
        for x in range(w):
            if px[x, y][3]:
                uso[paleta.mais_proxima(px[x, y])[1]] += 1
    mantidas = [c for c, _ in uso.most_common(max_cores)]
    for y in range(h):
        for x in range(w):
            if px[x, y][3]:
                alvo = paleta.mais_proxima(px[x, y])[1]
                if alvo not in mantidas:
                    alvo = min(mantidas, key=lambda c: distancia(alvo, c))
                px[x, y] = alvo + (255,)
    return img


def _limpar(img: Image.Image) -> Image.Image:
    px = img.load()
    w, h = img.size

    def op(x, y):
        return 0 <= x < w and 0 <= y < h and px[x, y][3] > 0

    soltos = [(x, y) for y in range(h) for x in range(w)
              if px[x, y][3] and not any(op(x + dx, y + dy) for dx, dy in VIZ8)]
    for x, y in soltos:
        px[x, y] = (0, 0, 0, 0)
    # buracos de 1 px: preenchidos com a cor mais comum dos vizinhos
    for y in range(h):
        for x in range(w):
            if px[x, y][3] == 0 and all(op(x + dx, y + dy) for dx, dy in VIZ4):
                px[x, y] = Counter(px[x + dx, y + dy] for dx, dy in VIZ4).most_common(1)[0][0]
    return img


def _contorno(img: Image.Image, cor: tuple) -> Image.Image:
    px = img.load()
    w, h = img.size
    novos = []
    for y in range(h):
        for x in range(w):
            if px[x, y][3] == 0 and any(0 <= x + dx < w and 0 <= y + dy < h and px[x + dx, y + dy][3]
                                        for dx, dy in VIZ4):
                novos.append((x, y))
    for x, y in novos:
        px[x, y] = cor + (255,)
    return img


def posprocessar(origem: Image.Image, tamanho: int = 128, paleta: Paleta | None = None, max_cores: int = 24,
                 metodo: str = "box", margem: int = 4, limiar_alfa: int = 128, tirar_fundo: bool = True,
                 tolerancia_fundo: int = 40, contorno: bool = False, limpar: bool = True) -> Image.Image:
    img = origem.convert("RGBA")
    if tirar_fundo:
        img = remover_fundo(img, tolerancia_fundo)
    caixa = img.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    if not caixa:
        raise ValueError("A imagem não tem conteúdo visível após remover o fundo.")
    img = img.crop(caixa)
    alvo = tamanho - 2 * margem - (2 if contorno else 0)
    esc = alvo / max(img.size)
    tam = (max(1, round(img.width * esc)), max(1, round(img.height * esc)))
    img = _reduzir(img, tam, metodo)
    px = img.load()
    for y in range(img.height):  # alfa binário
        for x in range(img.width):
            r, g, b, a = px[x, y]
            px[x, y] = (r, g, b, 255) if a >= limiar_alfa else (0, 0, 0, 0)
    if paleta:
        img = _mapear_paleta(img, paleta, max_cores)
    else:
        rgb = Image.new("RGB", img.size, (0, 0, 0))
        rgb.paste(img.convert("RGB"), mask=img.getchannel("A"))
        q = rgb.quantize(colors=max_cores, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
        a = img.getchannel("A")
        img = q.convert("RGBA")
        img.putalpha(a)
        px = img.load()
        for y in range(img.height):
            for x in range(img.width):
                if px[x, y][3] == 0:
                    px[x, y] = (0, 0, 0, 0)
    if limpar:
        img = _limpar(img)
    if contorno:
        escura = (paleta and min(paleta.cores.values(), key=luminancia)) or (10, 8, 18)
        tela = Image.new("RGBA", (img.width + 2, img.height + 2), (0, 0, 0, 0))
        tela.paste(img, (1, 1))
        img = _contorno(tela, tuple(escura))
    tela = Image.new("RGBA", (tamanho, tamanho), (0, 0, 0, 0))
    tela.paste(img, ((tamanho - img.width) // 2, (tamanho - img.height) // 2))
    return tela
