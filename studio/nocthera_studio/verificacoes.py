"""Verificações técnicas: dimensões, transparência, paleta e pixels.

Nenhuma verificação aqui "aprova" arte. Elas só encontram defeitos mecânicos. A aprovação final
exige revisão visual registrada (ver manifesto.aprovar).
"""
from __future__ import annotations

from collections import Counter, deque
from math import gcd, sqrt

from .nucleo import (AVISO, ERRO, INFO, VIZ4, VIZ8, Imagem, Resultado, distancia, hex_de,
                     luminancia, padroes)
from .paleta import Paleta

AMOSTRAS = 40  # máximo de coordenadas guardadas por achado


def _alfa0(p):
    return p[3] == 0


def _norm(p):
    """Pixels transparentes são todos iguais, independentemente do RGB escondido."""
    return (0, 0, 0, 0) if p[3] == 0 else p


# ----------------------------------------------------------------------------- dimensões
def fator_de_ampliacao(img: Imagem):
    """Detecta ampliação por vizinho mais próximo.

    Retorna (fator_exato, fator_provavel, n_transicoes). Em arte nativa as transições de cor
    ocorrem em qualquer coluna/linha; numa arte 32x32 ampliada 4x só ocorrem em múltiplos de 4.
    """
    w, h = img.largura, img.altura
    posicoes = []
    for y in range(h):
        linha = img.px[y]
        ant = _norm(linha[0])
        for x in range(1, w):
            atual = _norm(linha[x])
            if atual != ant:
                posicoes.append(x)
            ant = atual
    for x in range(w):
        ant = _norm(img.px[0][x])
        for y in range(1, h):
            atual = _norm(img.px[y][x])
            if atual != ant:
                posicoes.append(y)
            ant = atual
    if not posicoes:
        return 1, 1, 0
    g = 0
    for p in set(posicoes):
        g = gcd(g, p)
    g = gcd(g, gcd(w, h))
    prov = 1
    prop = padroes()["limiares"]["ampliacao_proporcao"]
    if len(posicoes) >= 30:
        for f in range(2, 9):
            if sum(1 for p in posicoes if p % f == 0) / len(posicoes) >= prop:
                prov = f
                break
    return g, max(g, prov), len(posicoes)


def verificar_dimensoes(img: Imagem, cfg: dict, pad: dict | None = None) -> Resultado:
    pad = pad or padroes()
    r = Resultado("dimensoes")
    validos = [tuple(t) for t in pad["tamanhos_nativos"]]
    tam = (img.largura, img.altura)
    r.metricas.update(largura=img.largura, altura=img.altura, formato=img.formato,
                      modo_original=img.modo_original)
    if img.formato != "PNG":
        r.add("formato_invalido", ERRO, f"Formato {img.formato}; o padrão é PNG.")
    if tam not in validos:
        r.add("dimensao_invalida", ERRO,
              f"{tam[0]}x{tam[1]} não é uma resolução nativa permitida "
              f"({', '.join('%dx%d' % t for t in validos)}).", encontrado=list(tam))
    exato, provavel, n = fator_de_ampliacao(img)
    r.metricas.update(fator_ampliacao=exato, fator_ampliacao_provavel=provavel)
    if exato > 1:
        r.add("ampliado_inteiro", ERRO,
              f"A imagem é uma arte de {img.largura // exato}x{img.altura // exato} ampliada {exato}x "
              "(vizinho mais próximo). A resolução nativa real não é a declarada.", fator=exato)
    elif provavel > 1:
        r.add("provavel_ampliacao", AVISO,
              f"{n} transições de cor quase todas em múltiplos de {provavel}: provável ampliação "
              f"{provavel}x com ruído. Confirme a resolução nativa.", fator=provavel)
    if img.modo_original not in ("RGBA", "P", "LA", "PA"):
        r.add("modo_sem_alfa", INFO, f"Modo original {img.modo_original}.")
    return r


# ----------------------------------------------------------------------------- transparência
def componentes(mascara, w, h, viz=VIZ8):
    """Componentes conexos de uma máscara booleana (lista de listas). Retorna lista de listas de (x,y)."""
    visto = [[False] * w for _ in range(h)]
    saida = []
    for y0 in range(h):
        for x0 in range(w):
            if mascara[y0][x0] and not visto[y0][x0]:
                visto[y0][x0] = True
                fila = deque([(x0, y0)])
                comp = []
                while fila:
                    x, y = fila.popleft()
                    comp.append((x, y))
                    for dx, dy in viz:
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < w and 0 <= ny < h and mascara[ny][nx] and not visto[ny][nx]:
                            visto[ny][nx] = True
                            fila.append((nx, ny))
                saida.append(comp)
    return saida


def mascara_opaca(img: Imagem):
    return [[img.px[y][x][3] > 0 for x in range(img.largura)] for y in range(img.altura)]


def verificar_transparencia(img: Imagem, cfg: dict, pad: dict | None = None) -> Resultado:
    pad = pad or padroes()
    lim = pad["limiares"]
    r = Resultado("transparencia")
    w, h = img.largura, img.altura
    total = w * h
    alfas = Counter(p[3] for linha in img.px for p in linha)
    parciais = [(x, y) for y in range(h) for x in range(w) if 0 < img.px[y][x][3] < 255]
    transp = alfas.get(0, 0)
    opacos = alfas.get(255, 0)
    r.metricas.update(pixels_transparentes=transp, pixels_opacos=opacos,
                      pixels_semitransparentes=len(parciais),
                      proporcao_transparente=round(transp / total, 4))
    if not img.alfa_nativo:
        r.add("sem_canal_alfa", ERRO, "O arquivo não tem canal alfa: não é PNG transparente.")
    if len(parciais) >= lim["alfa_parcial_erro"]:
        r.add("alfa_parcial", ERRO,
              f"{len(parciais)} pixels semitransparentes (bordas suavizadas/antialiasing). "
              "Só são permitidos alfa 0 e 255.", locais=parciais[:AMOSTRAS], total=len(parciais))
    if transp == 0:
        r.add("sem_transparencia", ERRO, "Nenhum pixel transparente: o fundo está embutido.")
    else:
        perim = [img.px[0][x] for x in range(w)] + [img.px[h - 1][x] for x in range(w)] + \
                [img.px[y][0] for y in range(h)] + [img.px[y][w - 1] for y in range(h)]
        if all(p[3] == 255 for p in perim) and len(set(perim)) <= 3:
            r.add("fundo_embutido", ERRO, "A borda inteira é opaca e quase uniforme: fundo sólido embutido.")
    # xadrez falso (o "fundo transparente" desenhado de verdade)
    bloco = {img.px[y][x] for y in range(min(16, h)) for x in range(min(16, w))}
    if len(bloco) == 2 and all(p[3] == 255 and abs(p[0] - p[1]) < 6 and abs(p[1] - p[2]) < 6 for p in bloco):
        r.add("xadrez_falso", ERRO, "Canto superior com padrão de xadrez cinza opaco: transparência falsa.")
    ocultos = [(x, y) for y in range(h) for x in range(w)
               if img.px[y][x][3] == 0 and img.px[y][x][:3] != (0, 0, 0)]
    r.metricas["pixels_rgb_oculto"] = len(ocultos)
    if ocultos:
        r.add("rgb_oculto", AVISO,
              f"{len(ocultos)} pixels transparentes carregam cor escondida; podem vazar em filtros "
              "bilineares. Normalize para (0,0,0,0).", total=len(ocultos))
    # enquadramento
    xs = [x for y in range(h) for x in range(w) if img.px[y][x][3] > 0]
    ys = [y for y in range(h) for x in range(w) if img.px[y][x][3] > 0]
    if xs:
        bx0, bx1, by0, by1 = min(xs), max(xs), min(ys), max(ys)
        bw, bh = bx1 - bx0 + 1, by1 - by0 + 1
        ext = max(bw, bh) / max(w, h)
        r.metricas.update(caixa=[bx0, by0, bx1, by1], largura_sprite=bw, altura_sprite=bh,
                          extensao=round(ext, 3), ocupacao=round(len(xs) / total, 3))
        lados = [n for n, c in (("esquerda", bx0 == 0), ("direita", bx1 == w - 1),
                                ("topo", by0 == 0), ("base", by1 == h - 1)) if c]
        if lados:
            r.add("encosta_na_borda", AVISO,
                  f"O sprite toca a borda ({', '.join(lados)}): possível corte. Deixe ≥1 px de margem.",
                  lados=lados)
        lo, hi = cfg["extensao"]
        if not lo <= ext <= hi:
            r.add("extensao_fora_do_padrao", AVISO,
                  f"O sprite ocupa {ext:.0%} da maior dimensão da tela; esperado entre "
                  f"{lo:.0%} e {hi:.0%} para esta categoria.", extensao=ext)
    else:
        r.add("imagem_vazia", ERRO, "Nenhum pixel visível.")
    return r


# ----------------------------------------------------------------------------- paleta
def contagem_cores(img: Imagem) -> Counter:
    return Counter(p[:3] for linha in img.px for p in linha if p[3] > 0)


def verificar_paleta(img: Imagem, cfg: dict, paleta: Paleta | None, pad: dict | None = None) -> Resultado:
    pad = pad or padroes()
    lim = pad["limiares"]
    r = Resultado("paleta")
    cont = contagem_cores(img)
    n = len(cont)
    total = sum(cont.values()) or 1
    r.metricas["cores_unicas"] = n
    r.metricas["max_cores"] = cfg["max_cores"]
    r.metricas["cores"] = [{"hex": hex_de(c), "pixels": k,
                            "nome": paleta.nome_da_cor(c) if paleta else None}
                           for c, k in cont.most_common()]
    if n > cfg["max_cores"]:
        fator = n / cfg["max_cores"]
        extra = " Quantidade típica de gradiente suave, JPEG ou antialiasing." \
            if fator >= lim["cores_excessivas_fator_erro"] else ""
        r.add("cores_demais", ERRO, f"{n} cores opacas; o limite desta categoria é {cfg['max_cores']}.{extra}",
              encontradas=n, limite=cfg["max_cores"])
    if paleta:
        fora = [(c, k) for c, k in cont.items() if not paleta.contem(c)]
        r.metricas["pixels_fora_da_paleta"] = sum(k for _, k in fora)
        r.metricas["cores_fora_da_paleta"] = len(fora)
        if fora:
            exemplos = [{"hex": hex_de(c), "pixels": k, "mais_proxima": paleta.mais_proxima(c)[0],
                         "distancia": round(paleta.mais_proxima(c)[2], 1)}
                        for c, k in sorted(fora, key=lambda t: -t[1])[:12]]
            pix = sum(k for _, k in fora)
            r.add("fora_da_paleta", ERRO,
                  f"{len(fora)} cores ({pix / total:.0%} dos pixels) não pertencem à paleta "
                  f"'{paleta.nome}'.", exemplos=exemplos)
        usadas = Counter()
        for c, k in cont.items():
            rampa = paleta.rampa_de(c)
            if rampa:
                usadas[rampa] += k
        r.metricas["uso_por_rampa"] = dict(usadas.most_common())
    cores = list(cont)[:200]  # com >200 cores a análise de pares é redundante (já reprovado por cores_demais)
    quase = []
    for i in range(len(cores)):
        for j in range(i + 1, len(cores)):
            d = distancia(cores[i], cores[j])
            if d <= lim["cores_quase_iguais_distancia"]:
                quase.append((hex_de(cores[i]), hex_de(cores[j]), round(d, 1)))
    r.metricas["pares_quase_iguais"] = len(quase)
    if quase:
        r.add("cores_quase_iguais", AVISO,
              f"{len(quase)} pares de cores quase idênticas (resíduo de blur/JPEG ou rampa sem contraste).",
              pares=quase[:10])
    raras = [(hex_de(c), k) for c, k in cont.items() if k <= lim["cores_raras_pixels"]]
    r.metricas["cores_raras"] = len(raras)
    if len(raras) >= lim["cores_raras_aviso"]:
        r.add("cores_raras", AVISO,
              f"{len(raras)} cores usadas em ≤{lim['cores_raras_pixels']} pixels: paleta dispersa.",
              cores=raras[:10])
    return r


# ----------------------------------------------------------------------------- pixels
def _opacos_vizinhos(img, x, y, viz):
    n = 0
    for dx, dy in viz:
        nx, ny = x + dx, y + dy
        if img.dentro(nx, ny) and img.px[ny][nx][3] > 0:
            n += 1
    return n


def pixels_de_mistura(img: Imagem, lim: dict):
    """Pixels cuja cor é a média de dois vizinhos opostos distintos: assinatura de antialiasing/blur.

    Retorna (lista de pixels, nº de cores que só aparecem como mistura).
    """
    tol = lim["mistura_aa_tolerancia"]
    contraste = lim["mistura_aa_contraste_min"]
    achados = []
    por_cor = Counter()
    mistura_por_cor = Counter()
    for y in range(img.altura):
        for x in range(img.largura):
            p = img.px[y][x]
            if p[3] == 0:
                continue
            c = p[:3]
            por_cor[c] += 1
            for (ax, ay), (bx, by) in (((x - 1, y), (x + 1, y)), ((x, y - 1), (x, y + 1))):
                if not (img.dentro(ax, ay) and img.dentro(bx, by)):
                    continue
                a, b = img.px[ay][ax], img.px[by][bx]
                if a[3] == 0 or b[3] == 0 or a[:3] == b[:3] or c == a[:3] or c == b[:3]:
                    continue
                if distancia(a, b) < contraste:
                    continue
                if all(min(a[i], b[i]) - tol <= c[i] <= max(a[i], b[i]) + tol for i in range(3)):
                    meio = tuple((a[i] + b[i]) / 2 for i in range(3))
                    if distancia(c, meio) <= tol:
                        achados.append((x, y))
                        mistura_por_cor[c] += 1
                        break
    so_mistura = sum(1 for c, k in mistura_por_cor.items() if k >= 0.8 * por_cor[c])
    return achados, so_mistura


def verificar_pixels(img: Imagem, cfg: dict, pad: dict | None = None) -> Resultado:
    pad = pad or padroes()
    lim = pad["limiares"]
    r = Resultado("pixels")
    w, h = img.largura, img.altura
    opacos = [(x, y) for y in range(h) for x in range(w) if img.px[y][x][3] > 0]
    n_op = len(opacos) or 1

    # --- antialiasing / blur
    mist, so_mistura = pixels_de_mistura(img, lim)
    prop_aa = len(mist) / n_op
    r.metricas.update(pixels_de_mistura=len(mist), proporcao_mistura=round(prop_aa, 4),
                      cores_so_de_mistura=so_mistura)
    if prop_aa >= lim["mistura_aa_erro"]:
        r.add("antialiasing", ERRO,
              f"{len(mist)} pixels ({prop_aa:.0%}) são mistura exata de dois vizinhos: antialiasing/blur. "
              f"{so_mistura} cores existem só como transição.", locais=mist[:AMOSTRAS], total=len(mist))
    elif prop_aa >= lim["mistura_aa_aviso"]:
        r.add("antialiasing_suspeito", AVISO,
              f"{len(mist)} pixels ({prop_aa:.1%}) parecem transições suavizadas. Revise as bordas.",
              locais=mist[:AMOSTRAS], total=len(mist))

    # --- pixels soltos (sem nenhum vizinho opaco nos 8 sentidos)
    soltos = [(x, y) for x, y in opacos if _opacos_vizinhos(img, x, y, VIZ8) == 0]
    r.metricas["pixels_soltos"] = len(soltos)
    if len(soltos) > lim["pixels_soltos_erro"]:
        r.add("pixels_soltos", ERRO, f"{len(soltos)} pixels flutuando sem contato com o sprite.",
              locais=soltos[:AMOSTRAS], total=len(soltos))
    elif len(soltos) >= lim["pixels_soltos_aviso"]:
        r.add("pixels_soltos", AVISO, f"{len(soltos)} pixel(s) solto(s): confirme se é intencional (faísca).",
              locais=soltos[:AMOSTRAS], total=len(soltos))

    # --- clusters de cor (4-conexo): ruído de 1 px vs agrupamentos deliberados
    visto = [[False] * w for _ in range(h)]
    tamanhos, isolados = [], []
    for x0, y0 in opacos:
        if visto[y0][x0]:
            continue
        cor = img.px[y0][x0][:3]
        visto[y0][x0] = True
        fila, tam, comp = deque([(x0, y0)]), 0, [(x0, y0)]
        while fila:
            x, y = fila.popleft()
            tam += 1
            for dx, dy in VIZ4:
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and not visto[ny][nx] and img.px[ny][nx][3] > 0 \
                        and img.px[ny][nx][:3] == cor:
                    visto[ny][nx] = True
                    fila.append((nx, ny))
        tamanhos.append(tam)
        if tam == 1:
            isolados.append((x0, y0))
    prop_1px = len(isolados) / n_op
    medio = sum(tamanhos) / len(tamanhos) if tamanhos else 0
    tamanhos.sort()
    r.metricas.update(clusters=len(tamanhos), cluster_medio=round(medio, 2),
                      cluster_mediano=tamanhos[len(tamanhos) // 2] if tamanhos else 0,
                      proporcao_clusters_1px=round(prop_1px, 4))
    if prop_1px >= lim["ruido_1px_erro"]:
        r.add("ruido", ERRO, f"{prop_1px:.0%} dos pixels formam clusters de 1 px: ruído, não clusters deliberados.",
              locais=isolados[:AMOSTRAS], total=len(isolados))
    elif prop_1px >= lim["ruido_1px_aviso"]:
        r.add("ruido", AVISO, f"{prop_1px:.0%} dos pixels são clusters de 1 px. Agrupe os tons em manchas.",
              locais=isolados[:AMOSTRAS], total=len(isolados))
    if tamanhos and medio < lim["cluster_medio_aviso"]:
        r.add("clusters_pequenos", AVISO,
              f"Tamanho médio de cluster {medio:.1f} px: aparência de granulado em vez de massas de cor.")

    # --- dither em xadrez (informativo; excesso vira aviso)
    xadrez = 0
    for x, y in opacos:
        c = img.px[y][x][:3]
        viz = [img.px[y + dy][x + dx] for dx, dy in VIZ4
               if img.dentro(x + dx, y + dy)]
        if len(viz) == 4 and all(v[3] > 0 for v in viz) and len({v[:3] for v in viz}) == 1 \
                and viz[0][:3] != c:
            xadrez += 1
    r.metricas["proporcao_dither_xadrez"] = round(xadrez / n_op, 4)
    if xadrez / n_op >= lim["xadrez_dither_aviso"]:
        r.add("dither_excessivo", AVISO, f"{xadrez / n_op:.0%} dos pixels em dither de xadrez. "
              "Use com intenção e em áreas específicas.")

    # --- contorno
    borda = [(x, y) for x, y in opacos
             if any((not img.dentro(x + dx, y + dy)) or img.px[y + dy][x + dx][3] == 0 for dx, dy in VIZ4)]
    escuros = 0
    for x, y in borda:
        viz = [img.px[y + dy][x + dx] for dx, dy in VIZ4
               if img.dentro(x + dx, y + dy) and img.px[y + dy][x + dx][3] > 0]
        lum = luminancia(img.px[y][x])
        ref = sum(luminancia(v) for v in viz) / len(viz) if viz else 255
        if lum <= ref or lum < 60:
            escuros += 1
    prop_esc = escuros / len(borda) if borda else 0
    r.metricas.update(pixels_de_borda=len(borda), contorno_mais_escuro=round(prop_esc, 3))
    if cfg.get("contorno") and borda:
        if prop_esc < lim["contorno_escuro_erro"]:
            r.add("sem_contorno", ERRO, f"Só {prop_esc:.0%} da borda é mais escura que o interior: "
                  "falta contorno que defina a silhueta.")
        elif prop_esc < lim["contorno_escuro_aviso"]:
            r.add("contorno_irregular", AVISO,
                  f"{prop_esc:.0%} da borda é mais escura que o interior; contorno incompleto.")

    # --- silhueta
    masc = mascara_opaca(img)
    comps = componentes(masc, w, h, VIZ8)
    comps.sort(key=len, reverse=True)
    if comps:
        maior = len(comps[0]) / n_op
        fragmentos = [c for c in comps[1:] if len(c) < 4]
        r.metricas.update(componentes=len(comps), maior_componente=round(maior, 3),
                          fragmentos_pequenos=len(fragmentos))
        if len(fragmentos) >= lim["silhueta_fragmentos_aviso"]:
            r.add("fragmentos", AVISO, f"{len(fragmentos)} fragmentos de silhueta com <4 px.",
                  locais=[c[0] for c in fragmentos][:AMOSTRAS])
        if maior < lim["silhueta_maior_fracao_min"]:
            r.add("silhueta_fragmentada", AVISO,
                  f"O maior corpo contínuo tem só {maior:.0%} dos pixels: silhueta partida em ilhas.")
    # buracos minúsculos dentro da silhueta
    transp = [[not v for v in linha] for linha in masc]
    buracos = [c for c in componentes(transp, w, h, VIZ4)
               if len(c) <= 2 and not any(x in (0, w - 1) or y in (0, h - 1) for x, y in c)]
    r.metricas["buracos_minusculos"] = len(buracos)
    if buracos:
        r.add("buracos_minusculos", AVISO, f"{len(buracos)} buraco(s) de 1-2 px dentro da silhueta.",
              locais=[c[0] for c in buracos][:AMOSTRAS])
    area = len(opacos)
    if area:
        xs = [x for x, _ in opacos]; ys = [y for _, y in opacos]
        preench = area / ((max(xs) - min(xs) + 1) * (max(ys) - min(ys) + 1))
        r.metricas["preenchimento_da_caixa"] = round(preench, 3)
        if preench >= lim["retangular_erro"]:
            r.add("silhueta_retangular", ERRO,
                  f"O sprite preenche {preench:.0%} da própria caixa: é um retângulo/cena/moldura, não uma "
                  "silhueta de criatura ou objeto.")
        elif preench >= lim["retangular_aviso"]:
            r.add("silhueta_quase_retangular", AVISO,
                  f"O sprite preenche {preench:.0%} da própria caixa: provável cena ou fundo embutido. "
                  "Confira a silhueta na folha de revisão.")
    if area and borda:
        compl = len(borda) / sqrt(area)
        r.metricas["complexidade_perimetro"] = round(compl, 2)
        if compl > lim["complexidade_perimetro_aviso"]:
            r.add("borda_serrilhada", AVISO,
                  f"Perímetro/√área = {compl:.1f}: contorno muito picotado, silhueta ilegível em tamanho pequeno.")
    return r
