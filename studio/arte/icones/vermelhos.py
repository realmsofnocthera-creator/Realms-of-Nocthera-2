"""Ícones 5-8 (série Sangue/Ronin) — 96x96, desenhados por código (origem: codigo)."""
from _lib import *  # noqa: F401,F403


def ronin(s, cx, base, escala=1.0, inclina=0, capa=True):
    """Silhueta de ronin de kasa: chapéu, rosto sombrio, lenço, capa esfarrapada (sem espada)."""
    top = base - round(66 * escala)
    # capa esfarrapada
    hem = [(cx - 26, base), (cx - 22, base - 8), (cx - 18, base + 2), (cx - 12, base - 8), (cx - 6, base + 2), (cx, base - 8), (cx + 6, base + 2),
           (cx + 12, base - 8), (cx + 18, base + 2), (cx + 22, base - 8), (cx + 26, base)]
    corpo = [(cx - 8 + inclina, top + 28), (cx - 24, top + 40), (cx - 26, base)] + hem[1:-1] + [(cx + 26, base), (cx + 24, top + 40), (cx + 8 + inclina, top + 28)]
    forma(s, corpo, S2, luz=[[(cx - 8 + inclina, top + 28), (cx - 24, top + 40), (cx - 26, base), (cx - 14, base - 6), (cx - 10, top + 44)]],
          sombra=[[(cx + 8 + inclina, top + 28), (cx + 24, top + 40), (cx + 26, base), (cx + 14, base - 8), (cx + 10, top + 44)]], luzc=S4, sombrac=S1)
    for dx in (-12, -4, 6, 14):
        s.line(cx + dx, top + 44, cx + dx + dx // 4, base - 6, S1)
    for (x0, y0, x1, y1) in [(cx - 24, top + 42, cx - 26, base - 4), (cx - 18, top + 50, cx - 20, base - 8)]:
        s.line(x0, y0, x1, y1, O0)                                   # fio desgastado
    # cabeça sob o chapéu
    s.polygon([(cx - 7, top + 20), (cx + 7, top + 20), (cx + 6, top + 32), (cx - 6, top + 32)], S1)
    s.px(cx - 3, top + 25, R3); s.px(cx + 3, top + 25, R3)             # olhos rubros
    # lenço vermelho
    s.polygon([(cx - 9, top + 29), (cx + 9, top + 29), (cx + 10, top + 36), (cx - 10, top + 36)], R2)
    s.polygon([(cx - 9, top + 29), (cx + 9, top + 29), (cx + 9, top + 31), (cx - 9, top + 31)], R3)
    s.polygon([(cx + 8, top + 33), (cx + 22, top + 40), (cx + 30, top + 36), (cx + 18, top + 46), (cx + 8, top + 38)], R2)   # ponta ao vento
    s.line(cx + 10, top + 36, cx + 28, top + 38, R1)
    kasa(s, cx, top + 20, round(24 * escala), round(18 * escala))
    return top


def respingos(s, pts, c=R3, c2=R2):
    for (x, y) in pts:
        s.circle(x, y, 1, c, fill=True)
        s.px(x + 1, y + 1, c2)


def icone_ronin_kasa():
    s = novo(96, 96)
    top = ronin(s, 46, 88)
    katana(s, (58, 56), (88, 92), w=5)
    respingos(s, [(80, 10), (86, 18), (74, 6), (88, 30), (14, 60), (20, 76), (74, 86), (60, 92)])
    for (x, y) in ((76, 14), (84, 24)):
        s.line(x, y, x + 1, y + 4, R2)
    return s


def icone_golpe():
    s = novo(96, 96)
    # guerreiro em investida (à direita), desenhado antes do golpe
    kasa(s, 62, 24, 17, 13, claro=S4, medio=S2, escuro=S0)
    forma(s, [(54, 28), (70, 28), (78, 44), (84, 72), (66, 82), (50, 72), (46, 48)], S2,
          luz=[[(54, 28), (46, 48), (50, 72), (58, 66), (54, 44)]], sombra=[[(78, 44), (84, 72), (66, 82), (72, 60)]], luzc=S4, sombrac=S1)
    s.polygon([(58, 28), (70, 28), (71, 35), (57, 35)], S1)
    s.px(62, 31, R3); s.px(67, 31, R3)
    s.polygon([(60, 36), (76, 38), (76, 44), (60, 42)], R2)                              # lenço
    s.polygon([(74, 40), (90, 46), (94, 40), (82, 52)], R2)
    # golpe crescente achatado cruzando o tronco, vermelho → branco no núcleo
    s.polygon(crescente(46, 68, 46, 188, 352, 24, ry=26), R1)
    s.polygon(crescente(46, 68, 46, 194, 346, 17, ry=26), R2, only=R1)
    s.polygon(crescente(46, 68, 46, 200, 340, 10, ry=26), R3, only=R2)
    s.polygon(crescente(46, 68, 46, 208, 334, 4, ry=26), O2, only=R3)
    s.polygon(crescente(40, 84, 34, 190, 350, 10, ry=14), R2)
    s.polygon(crescente(40, 84, 34, 198, 342, 5, ry=14), O1, only=R2)
    s.line(8, 52, 74, 58, O1); s.line(8, 53, 74, 59, S4)                                   # lâmina
    s.rect(74, 56, 80, 60, U0)
    for (x0, y0, x1, y1) in [(4, 62, 20, 62), (2, 72, 14, 72), (80, 90, 94, 88)]:
        s.line(x0, y0, x1, y1, R3); s.line(x0, y0 + 1, x1, y1 + 1, R1)
    respingos(s, [(12, 24), (24, 14), (86, 12), (90, 30), (10, 88), (84, 70)])
    return s


def icone_redemoinho():
    s = novo(96, 96)
    aneis = ((46, 34, 9, 6), (62, 40, 10, 7), (78, 34, 9, 6))   # (cy, rx, ry, largura)
    deslocs = (0, 20, -10)
    # trechos traseiros (atrás da figura)
    for (cy_, rx, ry, w), d in zip(aneis, deslocs):
        s.polygon(crescente(48, cy_, rx, 200 + d, 340 + d, w, ry=ry), R1)
        s.polygon(crescente(48, cy_, rx, 208 + d, 332 + d, max(1, w - 3), ry=ry), R2, only=R1)
    ronin(s, 48, 88, escala=1.0)
    # trechos dianteiros (na frente), com vãos para o personagem aparecer
    for (cy_, rx, ry, w), d in zip(aneis, deslocs):
        s.polygon(crescente(48, cy_, rx, 15 + d, 150 + d, w + 1, ry=ry), R1)
        s.polygon(crescente(48, cy_, rx, 22 + d, 143 + d, max(1, w - 2), ry=ry), R3, only=R1)
        s.polygon(crescente(48, cy_, rx, 32 + d, 133 + d, max(1, w - 5), ry=ry), O2, only=R3)
    respingos(s, [(10, 14), (86, 20), (8, 58), (88, 74), (20, 92), (76, 8)])
    return s


def icone_lua():
    s = novo(96, 96)
    cx, cy, r = 48, 40, 34
    s.circle(cx, cy, r, R1, fill=True)
    s.circle(cx - 3, cy - 3, r - 4, R2, fill=True)
    s.circle(cx - 7, cy - 7, r - 14, R3, fill=True)
    s.circle(cx - 9, cy - 9, r - 24, R2, fill=True)
    for (x, y, rr) in ((cx + 10, cy + 10, 5), (cx - 12, cy + 12, 3), (cx + 16, cy - 8, 3)):
        s.circle(x, y, rr, R1, fill=True)                    # crateras
    s.noise(cx - r, cy - r, cx + r, cy + r, R1, density=0.04, seed=4, only=R2)
    # torii
    for x0 in (20, 70):
        s.rect(x0, 34, x0 + 4, 84, S1)
        s.line(x0, 34, x0, 84, S3)
    s.polygon([(10, 30), (16, 26), (80, 26), (86, 30), (84, 34), (12, 34)], S1)
    s.line(12, 28, 84, 28, S3)
    s.polygon([(10, 30), (14, 28), (14, 31), (10, 32)], S1)
    s.rect(16, 42, 80, 46, S1)
    s.line(16, 42, 80, 42, S3)
    s.rect(46, 34, 50, 42, S1)
    # chão de névoa e sangue
    s.polygon([(4, 84), (92, 84), (94, 95), (2, 95)], S1)                                   # chão
    s.dither(4, 80, 92, 86, S1, S4, mix=0.35)
    s.line(4, 84, 92, 84, S3)
    s.polygon([(6, 90), (90, 90), (92, 95), (4, 95)], R1)
    s.line(8, 92, 88, 92, R2)
    ronin(s, 48, 83, escala=0.55)
    respingos(s, [(8, 50), (88, 54), (14, 20), (84, 10), (30, 70)])
    return s


if __name__ == "__main__":
    for nome, fn in (("ronin-kasa", icone_ronin_kasa), ("golpe-carmesim", icone_golpe), ("redemoinho-sangue", icone_redemoinho), ("lua-de-sangue", icone_lua)):
        s = fn()
        salvar_icone(s, nome)
        print(nome, "ok")
