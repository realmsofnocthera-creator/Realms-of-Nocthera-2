"""Interface de linha de comando: `python3 -m nocthera_studio <comando>`."""
from __future__ import annotations

import argparse
import functools
import http.server
import json
import socketserver
import sys
from pathlib import Path

from PIL import Image

from . import manifesto
from .auditoria import PENDENTE, auditar_arquivo, resumo_texto, salvar_relatorio
from .folha import gerar_folha
from .nucleo import (ASSETS, RAIZ, ERRO, Resultado, carregar, cfg_categoria, padroes)
from .paleta import carregar_paleta, exportar_hex
from .verificacoes import (verificar_dimensoes, verificar_paleta, verificar_pixels,
                           verificar_transparencia)


def _expandir(caminhos):
    saida = []
    for c in caminhos:
        p = Path(c)
        saida += sorted(p.rglob("*.png")) if p.is_dir() else [p]
    return saida


def _rodar_verificacao(nome, args) -> int:
    pad = padroes()
    cfg = cfg_categoria(args.categoria, pad)
    codigo, saida = 0, []
    for arq in _expandir(args.arquivos):
        img = carregar(arq)
        if nome == "dimensoes":
            r = verificar_dimensoes(img, cfg, pad)
        elif nome == "transparencia":
            r = verificar_transparencia(img, cfg, pad)
        elif nome == "paleta":
            pal = None if args.sem_paleta else carregar_paleta(args.paleta or pad["paleta_padrao"])
            r = verificar_paleta(img, cfg, pal, pad)
        else:
            r = verificar_pixels(img, cfg, pad)
        saida.append({"arquivo": str(arq), **r.para_dict()})
        if r.erros:
            codigo = 1
        if not args.json:
            marca = "✖ REPROVADO" if r.erros else ("▲ avisos" if r.avisos else "✔ ok")
            print(f"{arq.name}: {marca}")
            for a in r.achados:
                print(f"   [{a.severidade}] {a.codigo}: {a.mensagem}")
            if getattr(args, "metricas", False):
                print("   métricas:", json.dumps({k: v for k, v in r.metricas.items() if k != "cores"},
                                                  ensure_ascii=False))
    if args.json:
        print(json.dumps(saida, ensure_ascii=False, indent=2))
    return codigo


def executar_verificacao(nome, argv=None) -> int:
    ap = argparse.ArgumentParser(prog=f"verificar_{nome}", description=f"Verificação técnica de {nome}.")
    ap.add_argument("arquivos", nargs="+", help="PNG(s) ou pastas")
    ap.add_argument("-c", "--categoria", choices=["monstro", "arma", "icone", "generico"], default="generico")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--metricas", action="store_true")
    if nome == "paleta":
        ap.add_argument("--paleta", help="nome em config/ ou caminho .json/.hex")
        ap.add_argument("--sem-paleta", action="store_true", help="só limite de cores, sem paleta alvo")
    return _rodar_verificacao(nome, ap.parse_args(argv))


def cmd_auditar(a) -> int:
    codigo = 0
    relatorios = []
    for arq in _expandir(a.arquivos):
        rel = auditar_arquivo(arq, a.categoria, a.paleta or "padrao")
        relatorios.append(rel)
        if not a.json:
            print(resumo_texto(rel))
        if a.salvar:
            salvar_relatorio(rel)
        if a.folha:
            print("   folha de revisão:", gerar_folha(arq, rel))
        if rel["veredito_tecnico"] != PENDENTE:
            codigo = 1
    if a.json:
        print(json.dumps(relatorios, ensure_ascii=False, indent=2))
    return codigo


def cmd_posprocessar(a) -> int:
    pad = padroes()
    cfg = cfg_categoria(a.categoria, pad)
    pal = carregar_paleta(a.paleta or pad["paleta_padrao"])
    img = posprocessar_fn(Image.open(a.entrada), a.tamanho, pal, a.max_cores or cfg["max_cores"], a.metodo,
                          a.margem, tirar_fundo=not a.manter_fundo, contorno=a.contorno or cfg.get("contorno", False))
    destino = Path(a.saida)
    destino.parent.mkdir(parents=True, exist_ok=True)
    img.save(destino)
    print(f"salvo {destino}")
    print(resumo_texto(auditar_arquivo(destino, a.categoria, pal)))
    return 0


def posprocessar_fn(*args, **kw):
    from .posprocessar import posprocessar
    return posprocessar(*args, **kw)


def cmd_gerar(a) -> int:
    from .fluxo import gerar_ativo
    from .geracao import AguardandoImagem, ProvedorNaoConfigurado
    try:
        res = gerar_ativo(a.briefing, a.provedor, a.metodo)
    except (AguardandoImagem, ProvedorNaoConfigurado) as e:
        print(f"⏸ {e}")
        return 2
    for s in res["saidas"]:
        print(s["resumo"])
        print("   candidato:", s["candidato"], "\n   folha:", s["folha"])
    return 0


def cmd_aprovar(a) -> int:
    try:
        r = manifesto.aprovar(a.id, a.revisor, a.leitura_fria, a.confirmo or [], a.notas or "")
    except ValueError as e:
        print(f"✖ aprovação recusada: {e}")
        return 1
    print(f"✔ {r['id']} aprovado por {a.revisor}: {r['arquivo_aprovado']}")
    return 0


def cmd_checklist(_a) -> int:
    for k, v in manifesto.CHECKLIST_VISUAL.items():
        print(f"- {k}: {v}")
    return 0


def cmd_manifesto(a) -> int:
    m = manifesto.reconstruir(auditar=not a.sem_auditoria)
    print(f"{len(m['ativos'])} ativo(s) em {manifesto.ARQUIVO}")
    for x in m["ativos"]:
        print(f"  {x['id']:<28} {x['categoria']:<8} {x['status']}")
    return 0


def cmd_folha(a) -> int:
    for arq in _expandir(a.arquivos):
        rel = auditar_arquivo(arq, a.categoria)
        print(gerar_folha(arq, rel))
    return 0


def cmd_paleta(a) -> int:
    pal = carregar_paleta(a.paleta)
    if a.exportar_hex:
        print(exportar_hex(pal), end="")
    else:
        print(f"{pal.nome}: {len(pal.cores)} cores, {len(pal.rampas)} rampas")
    return 0


def cmd_servir(a) -> int:
    h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(RAIZ))
    with socketserver.TCPServer(("0.0.0.0", a.porta), h) as srv:
        print(f"Visualizador: http://localhost:{a.porta}/viewer/  (Ctrl+C para parar)")
        try:
            srv.serve_forever()
        except KeyboardInterrupt:
            pass
    return 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="nocthera_studio", description="Estúdio de Pixel Art de Realms of Nocthera")
    sub = ap.add_subparsers(dest="cmd", required=True)
    cats = ["monstro", "arma", "icone", "generico"]

    s = sub.add_parser("auditar", help="auditoria técnica completa (nunca aprova sozinha)")
    s.add_argument("arquivos", nargs="+"); s.add_argument("-c", "--categoria", choices=cats, default="generico")
    s.add_argument("--paleta"); s.add_argument("--json", action="store_true")
    s.add_argument("--salvar", action="store_true"); s.add_argument("--folha", action="store_true")
    s.set_defaults(f=cmd_auditar)

    s = sub.add_parser("posprocessar", help="bruto de modelo → PNG nativo com paleta e alfa binário")
    s.add_argument("entrada"); s.add_argument("saida"); s.add_argument("-c", "--categoria", choices=cats, default="generico")
    s.add_argument("--tamanho", type=int, choices=[96, 128], default=128); s.add_argument("--paleta")
    s.add_argument("--max-cores", type=int); s.add_argument("--metodo", choices=["box", "nearest", "moda"], default="box")
    s.add_argument("--margem", type=int, default=4); s.add_argument("--manter-fundo", action="store_true")
    s.add_argument("--contorno", action="store_true")
    s.set_defaults(f=cmd_posprocessar)

    s = sub.add_parser("gerar", help="briefing JSON → prompt → provedor → pós-processo → auditoria")
    s.add_argument("briefing"); s.add_argument("--provedor", choices=["manual", "comando_externo", "http_api"])
    s.add_argument("--metodo", choices=["box", "nearest", "moda"], default="box")
    s.set_defaults(f=cmd_gerar)

    s = sub.add_parser("aprovar", help="registra a revisão visual e libera o ativo (exige checklist completo)")
    s.add_argument("id"); s.add_argument("--revisor", required=True); s.add_argument("--leitura-fria", required=True)
    s.add_argument("--confirmo", nargs="*", help="chaves do checklist (veja `checklist`)"); s.add_argument("--notas")
    s.set_defaults(f=cmd_aprovar)

    sub.add_parser("checklist", help="lista o checklist de revisão visual").set_defaults(f=cmd_checklist)

    s = sub.add_parser("manifesto", help="reconstrói assets/manifesto.json (usado pelo visualizador)")
    s.add_argument("--sem-auditoria", action="store_true"); s.set_defaults(f=cmd_manifesto)

    s = sub.add_parser("folha", help="gera a folha de revisão (PNG) de um sprite")
    s.add_argument("arquivos", nargs="+"); s.add_argument("-c", "--categoria", choices=cats, default="generico")
    s.set_defaults(f=cmd_folha)

    s = sub.add_parser("paleta", help="inspeciona/exporta uma paleta")
    s.add_argument("paleta", nargs="?", default="nocthera-32"); s.add_argument("--exportar-hex", action="store_true")
    s.set_defaults(f=cmd_paleta)

    s = sub.add_parser("servir", help="serve studio/ para abrir o visualizador no navegador/celular")
    s.add_argument("--porta", type=int, default=8000); s.set_defaults(f=cmd_servir)

    a = ap.parse_args(argv)
    return a.f(a)


if __name__ == "__main__":
    sys.exit(main())
