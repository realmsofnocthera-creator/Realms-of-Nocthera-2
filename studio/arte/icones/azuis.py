"""Ícones 1-4 (série Água/Lâmina) — 96x96, desenhados por código (origem: codigo)."""
from _lib import *  # noqa: F401,F403


def icone_meditacao():
    s = novo(96, 96)
    cx, cy = 48, 46
    # halo azul (anel espesso com brilho)
    for r, c in ((41, A1), (40, A2), (39, G0), (38, A2), (37, A1), (36, A0)):
        s.circle(cx, cy, r, c, fill=False)
    s.circle(cx, cy, 35, A0, fill=False)
    # névoa/respingos azuis atrás
    for (x0, y0, x1, y1) in [(8, 66, 30, 54), (88, 66, 66, 54), (14, 80, 34, 72), (82, 80, 62, 72)]:
        s.line(x0, y0, x1, y1, A2); s.line(x0, y0 + 1, x1, y1 + 1, A1)
    # corpo sentado (quimono azul) — base larga de pernas cruzadas
    forma(s, [(18, 84), (24, 70), (34, 60), (48, 56), (62, 60), (72, 70), (78, 84), (62, 88), (34, 88)], A1,
          luz=[[(18, 84), (24, 70), (34, 60), (44, 58), (36, 70), (28, 84)]], sombra=[[(78, 84), (72, 70), (62, 60), (58, 70), (64, 84)]], luzc=A2, sombrac=A0)
    for (x0, y0, x1, y1) in [(30, 84, 40, 66), (48, 88, 48, 66), (66, 86, 58, 66)]:
        s.line(x0, y0, x1, y1, A0)
    # torso e ombros
    forma(s, [(32, 58), (38, 44), (48, 40), (58, 44), (64, 58), (48, 64)], A1,
          luz=[[(32, 58), (38, 44), (46, 41), (40, 56)]], sombra=[[(64, 58), (58, 44), (54, 56)]], luzc=A2, sombrac=A0)
    s.polygon([(44, 42), (48, 40), (52, 42), (50, 52), (46, 52)], O2)             # gola branca
    s.polygon([(42, 44), (46, 41), (48, 56), (44, 58)], O1, only=A1)
    s.line(36, 62, 60, 62, S2)                                                     # obi
    s.rect(34, 61, 62, 63, S1)
    s.rect(46, 60, 50, 64, U1)
    # mangas largas caindo sobre as mãos
    s.polygon([(30, 54), (24, 62), (22, 76), (34, 74), (38, 60)], A2)
    s.polygon([(30, 54), (24, 62), (22, 70), (28, 62)], G0, only=A2)
    s.polygon([(66, 54), (72, 62), (74, 76), (62, 74), (58, 60)], A2)
    s.polygon([(66, 54), (72, 62), (74, 76), (68, 72)], A1, only=A2)
    s.line(22, 76, 34, 74, O2); s.line(62, 74, 74, 76, O2)
    # cabeça baixa com coque
    s.circle(48, 24, 8, S1, fill=True)                                             # cabelo
    s.circle(48, 12, 4, S1, fill=True)                                             # coque
    s.circle(46, 11, 1, S4, fill=True)
    s.polygon([(42, 26), (54, 26), (52, 36), (44, 36)], P1)                        # rosto
    s.polygon([(44, 22), (52, 22), (54, 27), (42, 27)], S1)                        # franja
    s.polygon([(42, 36), (54, 36), (52, 40), (44, 40)], P0)
    s.px(45, 30, S0); s.px(51, 30, S0)
    s.line(44, 33, 52, 33, P0)
    # katana vertical, ponta para baixo, mãos no cabo
    s.rect(47, 52, 49, 58, S1)
    s.rect(46, 51, 50, 52, U1)
    s.polygon([(47, 60), (49, 60), (49, 88), (48, 92), (47, 88)], A2)
    s.line(47, 60, 47, 88, G0); s.line(49, 62, 49, 88, A1)
    s.polygon([(45, 58), (51, 58), (51, 64), (45, 64)], P1)                        # mãos
    s.line(45, 61, 51, 61, P0)
    # pétalas
    for (x, y) in ((10, 20), (20, 8), (80, 14), (88, 34), (8, 46), (88, 52), (30, 94), (66, 92), (14, 36), (82, 24)):
        petala(s, x, y)
    return s


def faixa_agua(s, cx, cy, r, a0, a1, larg, cores):
    """Faixa de água: núcleo claro dentro de bordas mais escuras (3 crescentes encaixados)."""
    for i, c in enumerate(cores):
        s.polygon(crescente(cx, cy, r - i, a0 + 4 * i, a1 - 4 * i, max(1, larg - 3 * i)), c)


def icone_onda():
    s = novo(96, 96)
    # várias faixas finas de água em espiral ao redor da lâmina (não uma massa única)
    faixa_agua(s, 50, 56, 44, 150, 335, 9, (A1, A2, G0))
    faixa_agua(s, 50, 56, 35, 165, 320, 8, (A0, A1, A2))
    faixa_agua(s, 50, 56, 26, 185, 305, 7, (A1, A2, G0))
    faixa_agua(s, 54, 52, 50, 240, 380, 7, (A0, A1, A2))
    faixa_agua(s, 30, 30, 22, 205, 30, 6, (A1, A2, O2))
    for (x0, y0, x1, y1) in [(8, 78, 26, 84), (62, 86, 88, 78), (72, 70, 90, 62)]:
        s.line(x0, y0, x1, y1, G0); s.line(x0, y0 + 1, x1, y1 + 1, A2)
    for (x, y) in ((14, 78), (22, 88), (74, 84), (84, 72), (40, 90), (62, 92), (10, 62), (88, 50), (76, 20)):
        s.circle(x, y, 1, O2, fill=True)
    katana(s, (22, 76), (86, 14), w=7)
    for (x, y) in ((12, 14), (32, 8), (84, 38), (78, 54), (14, 50), (44, 14), (70, 30)):
        petala(s, x, y)
    return s


def icone_saque():
    s = novo(96, 96)
    faixa_agua(s, 50, 54, 44, 110, 300, 8, (A1, A2, G0))
    faixa_agua(s, 46, 60, 34, 140, 340, 7, (A0, A1, A2))
    for (x0, y0, x1, y1) in [(56, 84, 90, 74), (60, 90, 88, 84), (8, 60, 24, 52)]:
        s.line(x0, y0, x1, y1, A2); s.line(x0, y0 + 1, x1, y1 + 1, A1)
    # ombros/manto
    forma(s, [(22, 70), (28, 52), (42, 44), (62, 44), (78, 52), (86, 70), (70, 76), (38, 76)], A1,
          luz=[[(22, 70), (28, 52), (42, 44), (50, 44), (36, 56), (30, 72)]], sombra=[[(86, 70), (78, 52), (70, 48), (72, 66), (76, 76)]], luzc=A2, sombrac=A0)
    s.line(36, 76, 52, 56, A0); s.line(60, 76, 58, 56, A0)
    s.polygon([(38, 50), (60, 50), (58, 58), (40, 58)], O2)                          # gola
    # capuz redondo com abertura sombria e olhos
    s.ellipse(34, 4, 70, 46, A1)
    s.ellipse(34, 4, 56, 40, A2, only=A1)
    s.ellipse(36, 6, 50, 24, G0, only=A2)
    s.polygon([(52, 6), (68, 14), (70, 30), (62, 46), (58, 30)], A0, only=A1)
    s.ellipse(42, 18, 62, 40, S1)
    s.rect(46, 26, 48, 28, O2); s.rect(55, 26, 57, 28, O2)
    s.line(44, 16, 50, 14, A1)
    # bainha à direita
    s.polygon([(66, 80), (74, 74), (92, 50), (95, 54), (80, 80), (70, 84)], S1)
    s.line(74, 74, 92, 50, S4)
    s.rect(88, 48, 93, 55, U1)
    # mão no cabo, sacando
    s.polygon([(44, 56), (58, 54), (62, 64), (48, 68)], P1)
    s.line(46, 61, 60, 59, P0)
    s.polygon([(38, 58), (46, 54), (52, 62), (44, 70)], O2)
    s.line(38, 58, 44, 70, O1)
    katana(s, (66, 46), (10, 90), w=6, fio_lado=-1)
    for (x, y) in ((16, 22), (30, 12), (84, 82), (90, 22), (18, 56), (8, 38), (78, 6)):
        petala(s, x, y)
    return s


def icone_explosao():
    s = novo(96, 96)
    # espinhos de cristal (azuis à esquerda/cima, vermelhos à direita/baixo)
    azuis = [((44, 52), (6, 20), 5), ((46, 48), (22, 4), 5), ((50, 44), (40, 2), 4), ((40, 56), (4, 44), 4), ((52, 40), (64, 6), 4)]
    verm = [((52, 60), (92, 64), 5), ((50, 64), (82, 88), 5), ((46, 66), (62, 92), 4), ((54, 56), (94, 46), 4), ((44, 62), (30, 92), 4)]
    for (a, b, w) in azuis:
        ux, uy, n = vec(a, b); nx, ny = -uy, ux
        s.polygon([(a[0] + nx * w, a[1] + ny * w), b, (a[0] - nx * w, a[1] - ny * w)], A1)
        s.polygon([(a[0] + nx * w, a[1] + ny * w), b, (a[0], a[1])], A2, only=A1)
        s.line(round(a[0]), round(a[1]), b[0], b[1], G0)
    for (a, b, w) in verm:
        ux, uy, n = vec(a, b); nx, ny = -uy, ux
        s.polygon([(a[0] + nx * w, a[1] + ny * w), b, (a[0] - nx * w, a[1] - ny * w)], R1)
        s.polygon([(a[0] + nx * w, a[1] + ny * w), b, (a[0], a[1])], R3, only=R1)
        s.line(round(a[0]), round(a[1]), b[0], b[1], O1)
    # respingo de sangue na base
    for (x0, y0, x1, y1) in [(24, 84, 70, 78), (30, 88, 62, 90), (36, 80, 60, 84)]:
        s.line(x0, y0, x1, y1, R2); s.line(x0, y0 + 1, x1, y1 + 1, R1)
    for (x, y) in ((20, 74), (74, 72), (28, 92), (66, 94), (84, 80), (14, 86)):
        s.circle(x, y, 1, R3, fill=True)
    katana(s, (82, 14), (22, 84), w=8)
    return s


if __name__ == "__main__":
    for nome, fn in (("meditacao-agua", icone_meditacao), ("onda-katana", icone_onda), ("saque-agua", icone_saque), ("explosao-cristal", icone_explosao)):
        s = fn()
        salvar_icone(s, nome)
        print(nome, "ok")
