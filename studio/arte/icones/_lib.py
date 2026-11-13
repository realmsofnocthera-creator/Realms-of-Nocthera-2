import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from _nocthera import C, crescente, faixa, forma, novo, salvar, sh  # noqa: E402,F401

S0, S1, S2, S3, S4, S5 = (C[f"sombra-{i}"] for i in range(6))
O0, O1, O2 = C["osso-0"], C["osso-1"], C["osso-2"]
R0, R1, R2, R3 = (C[f"sangue-{i}"] for i in range(4))
B0, B1, B2 = C["brasa-0"], C["brasa-1"], C["brasa-2"]
U0, U1, U2 = C["ouro-0"], C["ouro-1"], C["ouro-2"]
A0, A1, A2, G0 = C["aco-0"], C["aco-1"], C["aco-2"], C["gelo-0"]
P0, P1 = C["pele-0"], C["pele-1"]
SAIDA = Path(__file__).resolve().parent.parent.parent / "assets" / "candidatos" / "icones"


def vec(p0, p1):
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    n = math.hypot(dx, dy)
    return dx / n, dy / n, n


def ponto(p0, p1, t, off=0.0):
    ux, uy, n = vec(p0, p1)
    return (p0[0] + ux * n * t - uy * off, p0[1] + uy * n * t + ux * off)


def katana(s, p0, p1, w=5.0, lamina=(A1, A2, G0, O2), cabo=S1, tsuba=U1, fio_lado=1):
    """p0 = ponta do cabo, p1 = ponta da lâmina. Lâmina com fio claro, dorso escuro e hamon."""
    ux, uy, n = vec(p0, p1)
    tcabo, ttsuba = 0.0, 0.26
    # cabo com tsukamaki
    pts = [ponto(p0, p1, 0, -w * 0.55), ponto(p0, p1, ttsuba, -w * 0.55), ponto(p0, p1, ttsuba, w * 0.55), ponto(p0, p1, 0, w * 0.55)]
    s.polygon(pts, cabo)
    k = 5
    for i in range(k):
        t = (i + 0.5) / k * ttsuba
        a, b = ponto(p0, p1, t, -w * 0.55), ponto(p0, p1, t, w * 0.55)
        s.line(round(a[0]), round(a[1]), round(b[0]), round(b[1]), S3)
    s.circle(round(p0[0]), round(p0[1]), 2, tsuba, fill=True)                 # kashira
    # lâmina
    ta, tb = ttsuba + 0.01, 1.0
    corpo = [ponto(p0, p1, ta, -w * 0.5), ponto(p0, p1, 0.93, -w * 0.45), ponto(p0, p1, tb, 0), ponto(p0, p1, 0.93, w * 0.5), ponto(p0, p1, ta, w * 0.5)]
    s.polygon(corpo, lamina[0])
    fio = [ponto(p0, p1, ta, 0), ponto(p0, p1, 0.94, 0), ponto(p0, p1, tb, 0), ponto(p0, p1, 0.93, w * 0.5 * fio_lado), ponto(p0, p1, ta, w * 0.5 * fio_lado)]
    s.polygon(fio, lamina[1], only=lamina[0])
    a, b = ponto(p0, p1, ta + 0.03, w * 0.32 * fio_lado), ponto(p0, p1, 0.95, w * 0.12 * fio_lado)
    s.line(round(a[0]), round(a[1]), round(b[0]), round(b[1]), lamina[2])
    a, b = ponto(p0, p1, ta + 0.03, w * 0.5 * fio_lado), ponto(p0, p1, 0.98, w * 0.05 * fio_lado)
    s.line(round(a[0]), round(a[1]), round(b[0]), round(b[1]), lamina[3])
    # tsuba (guarda) dourada
    c = ponto(p0, p1, ttsuba, 0)
    nx, ny = -uy, ux
    g = [(c[0] - nx * w * 1.1 - ux * 1.5, c[1] - ny * w * 1.1 - uy * 1.5), (c[0] + nx * w * 1.1 - ux * 1.5, c[1] + ny * w * 1.1 - uy * 1.5),
         (c[0] + nx * w * 1.1 + ux * 1.5, c[1] + ny * w * 1.1 + uy * 1.5), (c[0] - nx * w * 1.1 + ux * 1.5, c[1] - ny * w * 1.1 + uy * 1.5)]
    s.polygon(g, tsuba)
    s.line(round(g[0][0]), round(g[0][1]), round(g[3][0]), round(g[3][1]), U2)


def petala(s, x, y, c=O2, c2=G0):
    s.px(x, y, c); s.px(x + 1, y, c); s.px(x, y + 1, c2)


def kasa(s, cx, cy, r, h, claro=O0, medio=U1, escuro=U0):
    """Chapéu de palha cônico (cx,cy = centro da aba)."""
    s.polygon([(cx - r, cy), (cx, cy - h), (cx + r, cy)], medio)
    s.polygon([(cx - r, cy), (cx, cy - h), (cx - r // 3, cy)], claro, only=medio)
    s.polygon([(cx + r // 2, cy), (cx, cy - h), (cx + r, cy)], escuro, only=medio)
    for i in range(1, 4):
        yy = cy - round(h * i / 4)
        half = round(r * (1 - i / 4))
        s.line(cx - half, yy, cx + half, yy, escuro)
    s.line(cx - r, cy, cx + r, cy, escuro)
    s.line(cx - r + 2, cy - 1, cx + r - 2, cy - 1, claro)


def salvar_icone(s, nome):
    from _nocthera import garantir_margem
    garantir_margem(s)
    s.outline(S0, where="outside")
    return salvar(s, nome, SAIDA / f"arte-icone-{nome}.png", escala=6)
