"""Cavaleiro das Cinzas — guerreiro 100% autoral de Realms of Nocthera. 128x128, desenhado por código (origem: codigo).

Conceito: guerreiro de armadura azul-aço com elmo de chifres e viseira âmbar, tabardo carmesim rasgado,
escudo redondo com a lua crescente de Nocthera e uma montante cravada à direita.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from _nocthera import C, crescente, forma, novo, salvar  # noqa: E402

S0, S1, S2, S3 = (C[f"sombra-{i}"] for i in range(4))
A0, A1, A2, G0 = C["aco-0"], C["aco-1"], C["aco-2"], C["gelo-0"]
R0, R1, R2, R3 = (C[f"sangue-{i}"] for i in range(4))
U0, U1, U2 = C["ouro-0"], C["ouro-1"], C["ouro-2"]
O1, O2 = C["osso-1"], C["osso-2"]
B2 = C["brasa-2"]
P0 = C["pele-0"]

s = novo(128, 128)

# ------------------------------------------------------------------ manto carmesim curto (atrás)
manto = [(80, 32), (92, 34), (100, 46), (104, 70), (102, 92), (98, 86), (95, 96), (90, 84), (86, 92), (82, 70)]
forma(s, manto, R1, luz=[[(80, 32), (92, 34), (97, 46), (88, 50)]], sombra=[[(104, 70), (102, 92), (98, 86), (95, 96), (96, 70)]], luzc=R2, sombrac=R0)
for (x0, y0, x1, y1) in [(88, 38, 92, 90), (94, 44, 98, 86)]:
    s.line(x0, y0, x1, y1, R0)

# ------------------------------------------------------------------ pernas largas (postura firme)
for x0, lado in ((50, -1), (71, 1)):
    forma(s, [(x0, 84), (x0 + 11, 84), (x0 + 11, 118), (x0, 118)], A1,
          luz=[[(x0, 84), (x0 + 4, 84), (x0 + 4, 118), (x0, 118)]], sombra=[[(x0 + 8, 84), (x0 + 11, 84), (x0 + 11, 118), (x0 + 8, 118)]], luzc=A2, sombrac=A0)
    s.polygon([(x0 - 1, 92), (x0 + 12, 92), (x0 + 11, 100), (x0, 100)], A2)             # joelheira
    s.polygon([(x0 - 1, 92), (x0 + 5, 92), (x0 + 4, 97), (x0, 98)], G0)
    s.line(x0, 100, x0 + 11, 100, A0)
    s.px(x0 + 5, 96, U1)
    for y in (106, 112):
        s.line(x0 + 1, y, x0 + 10, y, A0)
    s.line(x0 + 1, 104, x0 + 1, 117, G0)
    # sabatão (pé) apontando para fora
    s.polygon([(x0 - 2 + lado * 0, 117), (x0 + 12, 117), (x0 + 12 + (4 if lado > 0 else 0), 123), (x0 + 12 + (4 if lado > 0 else 0), 126),
               (x0 - 6 + (0 if lado > 0 else 0), 126), (x0 - 6, 123), (x0 - 2, 120)], A1)
    s.polygon([(x0 - 6, 123), (x0 + 3, 119), (x0 + 4, 122), (x0 - 6, 126)], A2)
    s.line(x0 - 5, 124, x0 + 14, 124, A0)

# ------------------------------------------------------------------ tabardo carmesim rasgado entre as pernas
tab = [(57, 66), (75, 66), (78, 92), (76, 100), (73, 94), (70, 106), (66, 96), (62, 108), (59, 96), (55, 100), (54, 90)]
forma(s, tab, R1, luz=[[(57, 66), (60, 66), (58, 90), (54, 90)]], sombra=[[(72, 66), (75, 66), (78, 92), (76, 100), (73, 94), (73, 80)]], luzc=R2, sombrac=R0)
for x in (62, 66, 70):
    s.line(x, 70, x + (x - 66) // 3, 96, R0)
# emblema: lua crescente dourada no tabardo
s.polygon(crescente(66, 82, 6, 100, 300, 4), U1)
s.px(70, 79, U2)

# ------------------------------------------------------------------ saiote de placas (tassets) e cinto
for i in range(5):
    x = 51 + i * 6
    forma(s, [(x, 70), (x + 5, 70), (x + 5, 84), (x + 2, 87), (x, 84)], A1, luz=[[(x, 70), (x + 1, 70), (x + 1, 84), (x, 84)]], sombra=[[(x + 4, 70), (x + 5, 70), (x + 5, 84), (x + 4, 84)]], luzc=A2, sombrac=A0)
    s.line(x, 77, x + 4, 77, A0)
s.polygon([(49, 64), (83, 64), (83, 70), (49, 70)], S1)
s.line(49, 64, 83, 64, S3)
s.circle(66, 67, 4, U1, fill=True)
s.circle(66, 67, 2, U0, fill=True)
s.px(65, 66, U2)

# ------------------------------------------------------------------ peitoral com lua crescente e gola
forma(s, [(50, 30), (82, 30), (86, 46), (82, 64), (50, 64), (46, 46)], A1,
      luz=[[(50, 30), (60, 30), (54, 46), (50, 62), (46, 46)]], sombra=[[(76, 30), (82, 30), (86, 46), (82, 64), (74, 64), (78, 46)]], luzc=A2, sombrac=A0)
s.line(66, 32, 66, 63, A0)                                                          # quilha
s.line(52, 52, 80, 52, A0)
s.polygon(crescente(66, 44, 9, 110, 320, 6), U1)                                     # lua crescente
s.polygon(crescente(66, 44, 9, 120, 300, 2), U2, only=U1)
s.px(71, 40, U2)
s.polygon([(56, 28), (76, 28), (78, 33), (54, 33)], A2)                               # gorjal
s.line(56, 28, 76, 28, G0)

# ------------------------------------------------------------------ ombreiras com espinhos
for pts in ([(34, 28), (48, 26), (52, 38), (46, 46), (34, 44), (30, 36)], [(80, 26), (96, 28), (102, 36), (98, 44), (86, 46), (80, 38)]):
    forma(s, pts, A2, luz=[[pts[0], pts[1], (pts[1][0] - 2, pts[1][1] + 6), (pts[0][0] + 2, pts[0][1] + 8)]],
          sombra=[[pts[3], pts[4], (pts[4][0], pts[4][1] - 3), (pts[3][0] - 2, pts[3][1] - 3)]], luzc=G0, sombrac=A1)
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    s.line(min(xs) + 2, min(ys) + 8, max(xs) - 2, min(ys) + 8, A0)
    s.line(min(xs) + 2, min(ys) + 12, max(xs) - 2, min(ys) + 12, A0)
s.polygon([(33, 28), (31, 20), (38, 26)], A1)                                        # espinhos
s.polygon([(97, 28), (101, 20), (95, 27)], A1)

# ------------------------------------------------------------------ montante cravada à direita (braço direito)
s.polygon([(103, 2), (107, 8), (107, 72), (101, 72), (101, 8)], A2)                   # lâmina longa
s.polygon([(103, 2), (101, 8), (101, 72), (103, 72)], G0, only=A2)
s.line(104, 8, 104, 72, A1)
s.polygon([(107, 8), (107, 72), (105, 72), (105, 10)], A0, only=A2)
s.polygon([(92, 72), (116, 72), (118, 76), (90, 76)], U1)                              # guarda
s.line(92, 72, 116, 72, U2)
s.polygon([(104, 76), (104, 76), (107, 98), (101, 98)], S1)                            # empunhadura
s.rect(101, 78, 107, 96, S1)
for y in range(80, 96, 4):
    s.line(101, y, 107, y, S3)
s.circle(104, 100, 3, U1, fill=True)
s.px(103, 99, U2)
# braço direito (manga de malha + manopla)
forma(s, [(90, 44), (98, 44), (104, 56), (104, 72), (96, 74), (92, 60)], A1, luz=[[(90, 44), (96, 44), (92, 58)]], sombra=[[(104, 56), (104, 72), (98, 73), (100, 58)]], luzc=A2, sombrac=A0)
s.rect(97, 70, 108, 80, A2)                                                            # punho
s.rect(97, 70, 99, 80, G0)
for y in (73, 76):
    s.line(100, y, 108, y, A0)

# ------------------------------------------------------------------ escudo redondo com lua (braço esquerdo)
cx, cy = 28, 70
s.circle(cx, cy, 21, S1, fill=True)
s.circle(cx, cy, 20, U1, fill=True)                                                    # aro dourado
s.circle(cx, cy, 18, A1, fill=True)
s.circle(cx, cy, 14, R1, fill=True)
s.circle(cx - 2, cy - 2, 13, R2, fill=True, only=R1)
s.polygon(crescente(cx, cy, 10, 100, 320, 8), O1)                                       # lua crescente
s.polygon(crescente(cx, cy, 10, 110, 300, 3), O2, only=O1)
s.circle(cx, cy, 3, U1, fill=True)                                                      # umbigo do escudo
s.circle(cx - 1, cy - 1, 1, U2, fill=True)
for ang in range(0, 360, 45):
    import math
    s.px(round(cx + 19 * math.cos(math.radians(ang))), round(cy + 19 * math.sin(math.radians(ang))), U2)   # rebites no aro
s.polygon(crescente(cx, cy, 20, 200, 290, 3), G0, only=U1)

# ------------------------------------------------------------------ elmo de chifres com viseira âmbar
forma(s, [(54, 8), (60, 4), (72, 4), (78, 8), (80, 22), (76, 30), (56, 30), (52, 22)], A1,
      luz=[[(54, 8), (60, 4), (66, 4), (60, 14), (56, 28), (52, 22)]], sombra=[[(72, 4), (78, 8), (80, 22), (76, 30), (70, 30), (74, 14)]], luzc=A2, sombrac=A0)
s.line(66, 4, 66, 30, A0)                                                               # crista central
# viseira em cruz: fenda horizontal com brilho âmbar + fenda vertical
s.rect(57, 16, 75, 18, S0)
s.rect(65, 18, 67, 29, S0)
s.line(58, 17, 63, 17, B2); s.line(69, 17, 74, 17, B2)
s.px(66, 17, C["brasa-1"])
for x in (59, 61, 71, 73):
    s.px(x, 23, A0)                                                                      # furos de respiro
# penacho carmesim de crina, arqueando para trás (autoral: sem chifres)
pena = [(64, 5), (70, 2), (79, 2), (89, 6), (96, 15), (99, 28), (97, 40), (93, 31), (90, 22), (84, 15), (76, 11), (68, 11)]
forma(s, pena, R1, luz=[[(64, 5), (70, 2), (79, 2), (89, 6), (92, 9), (82, 7), (72, 8), (66, 10)]],
      sombra=[[(99, 28), (97, 40), (93, 31), (92, 20), (96, 18)]], luzc=R2, sombrac=R0)
for (x0, y0, x1, y1) in [(72, 9, 94, 18), (74, 11, 96, 28), (80, 13, 96, 34)]:
    s.line(x0, y0, x1, y1, R0)
for (x0, y0, x1, y1) in [(70, 4, 88, 8), (76, 5, 93, 12)]:
    s.line(x0, y0, x1, y1, R3)
s.circle(66, 5, 2, U1, fill=True)                                                       # florão dourado do penacho
s.px(65, 4, U2)
s.polygon(crescente(66, 12, 5, 190, 350, 3), U1)                                         # crescente na testa do elmo

from _nocthera import garantir_margem  # noqa: E402
garantir_margem(s)
s.outline(S0, where="outside")
out = Path(__file__).resolve().parent.parent.parent / "assets" / "candidatos" / "monstros" / "arte-cavaleiro-das-cinzas.png"
salvar(s, "guerreiro", out)
s.stats()
