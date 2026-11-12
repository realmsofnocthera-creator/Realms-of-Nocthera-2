"""Diagnóstico das ferramentas integradas: cada linha vem de uma sonda executada agora, não de memória.

"Gera imagem?" tem três respostas honestas:
  sim              gera imagem a partir de texto/referência neste ambiente, agora;
  por código       desenha por código (sem modelo de imagem): arte declarada como `origem: codigo`;
  não              falta rota, chave, login ou rede (a coluna `pendencia` diz o quê).
Nenhuma sonda gera conteúdo pago: só dry-run, resolução de rota e exemplos locais gratuitos.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

from .nucleo import RAIZ

SKILLS = RAIZ.parent / ".claude" / "skills"
FAL_MCP = "https://mcp.fal.ai/mcp-relay"
SAIDA_JSON = RAIZ / "docs" / "diagnostico_ferramentas.json"


def _run(args, timeout=120, env=None, cwd=None):
    try:
        r = subprocess.run([str(a) for a in args], capture_output=True, text=True, timeout=timeout,
                           env=env or os.environ.copy(), cwd=cwd)
        return r.returncode, (r.stdout + r.stderr).strip()
    except Exception as e:  # noqa: BLE001
        return 99, f"{type(e).__name__}: {e}"


def _linha(nome, instalada, funciona, gera, custo, pendencia, evidencia):
    return {"ferramenta": nome, "instalada": instalada, "funciona_offline": funciona, "gera_imagem": gera,
            "custo": custo, "pendencia": pendencia, "evidencia": evidencia}


def sondar_estudio(tmp: Path):
    from .auditoria import auditar_arquivo
    from PIL import Image
    p = tmp / "s.png"
    Image.new("RGBA", (128, 128), (0, 0, 0, 0)).save(p)
    rel = auditar_arquivo(p, "monstro")
    ok = rel["veredito_tecnico"] == "reprovado"  # imagem vazia TEM de reprovar
    return _linha("Nocthera studio (auditor/pós-processo/viewer)", True, ok, "não (processa, não gera)", "grátis",
                  "nenhuma", "auditor reprova imagem vazia: " + ("ok" if ok else "FALHOU"))


def sondar_pixel_art_studio(tmp: Path):
    d = SKILLS / "pixel-art-studio"
    if not d.exists():
        return _linha("Pixel Art Studio", False, False, "não", "grátis", "instalar", "pasta ausente")
    shutil.copy(d / "examples" / "slime-build.py", tmp / "slime-build.py")
    c, out = _run([sys.executable, "slime-build.py"], cwd=tmp)
    gif = (tmp / "slime.gif").exists() and (tmp / "slime.png").exists()
    return _linha("Pixel Art Studio (Pillow, desenho por código)", True, c == 0 and gif, "por código", "grátis",
                  "nenhuma (revisão visual obrigatória: arte desenhada por código não é geração por modelo)",
                  f"exemplo slime: exit {c}, PNG+GIF {'criados' if gif else 'AUSENTES'}")


def sondar_asf(tmp: Path):
    d = SKILLS / "generate2dmedia" / "scripts" / "route_media.py"
    if not d.exists():
        return _linha("Agent Sprite Forge", False, False, "não", "n/a", "instalar", "route_media.py ausente")
    env = {k: v for k, v in os.environ.items() if not k.endswith("_API_KEY") and k != "FAL_KEY"}
    c, out = _run([sys.executable, d, "resolve", "--kind", "image"], env=env, timeout=60)
    try:
        j = json.loads(out.splitlines()[-1])
    except ValueError:
        j = {"status": "erro", "raw": out[:200]}
    tem_rota = j.get("status") == "ok"
    chaves = [k for k in ("OPENAI_API_KEY", "GOOGLE_API_KEY", "GEMINI_API_KEY", "XAI_API_KEY", "ARK_API_KEY", "FAL_KEY")
              if os.environ.get(k)]
    codex, grok = bool(shutil.which("codex")), bool(shutil.which("grok"))
    motivo = "" if tem_rota else ("nenhuma chave configurada (" + ", ".join(
        ["OPENAI", "GEMINI", "XAI", "ARK/BytePlus", "FAL"]) + "), Codex CLI e Grok CLI ausentes")
    ffm = bool(shutil.which("ffmpeg"))
    return _linha("Agent Sprite Forge (generate2dmedia/2dsprite/video2dsprite/2dmap)", True, True,
                  "sim (rota: %s)" % j.get("route") if tem_rota else "não",
                  "pago por chave / cota de assinatura (exige --autorizo-gasto)",
                  motivo or "autorizar teto de gasto antes de gerar",
                  f"route_media resolve → {j.get('status')}; chaves={len(chaves)}; codex={codex}; grok={grok}; ffmpeg={ffm}")


def sondar_codeart(tmp: Path):
    d = SKILLS / "codeart2d" / "scripts" / "render_pixelspec.py"
    ex = SKILLS / "codeart2d" / "examples" / "slime.pixelspec.json"
    if not d.exists():
        return _linha("codeart2d", False, False, "não", "grátis", "instalar", "ausente")
    c, out = _run([sys.executable, d, "--spec", ex, "--output-dir", tmp / "ca", "--preview-scale", 8, "--strict-qc"])
    ok = c == 0 and '"qa": "pass"' in out
    return _linha("codeart2d (ASF, arte por código)", True, ok, "por código", "grátis",
                  "saída 32px/paleta própria: precisa de PixelSpec 96/128 + paleta nocthera-32",
                  f"slime.pixelspec → exit {c}, qa pass={ok}")


def sondar_pixelpipe(tmp: Path):
    d = SKILLS / "pixel-art-studio" / "scripts" / "pixelpipe.py"
    if not d.exists():
        return _linha("pixelpipe", False, False, "não", "grátis", "instalar", "ausente")
    from PIL import Image
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    for x in range(16, 48):
        for y in range(16, 48):
            img.putpixel((x, y), ((x * 5) % 256, (y * 5) % 256, 120, 255))
    img.save(tmp / "t.png")
    c, out = _run([sys.executable, d, tmp / "t.png", "--max-colors", 8])
    ok = c == 0 and (tmp / "t_pipe" / "clean.png").exists()
    return _linha("pixelpipe (limpeza/paleta de PNG sujo)", True, ok, "não (limpa, não gera)", "grátis", "nenhuma",
                  f"exit {c}, clean.png {'criado' if ok else 'AUSENTE'}")


def sondar_fal_mcp(rede=True):
    if not rede:
        return _linha("fal MCP remoto", True, False, "não", "pago (créditos fal)", "OAuth do usuário", "rede não sondada")
    req = urllib.request.Request(FAL_MCP, data=json.dumps({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {
        "protocolVersion": "2025-03-26", "capabilities": {}, "clientInfo": {"name": "diag", "version": "0"}}}).encode(),
        headers={"Content-Type": "application/json", "Accept": "application/json, text/event-stream"}, method="POST")
    try:
        urllib.request.urlopen(req, timeout=20)
        status, ev = 200, "respondeu 200 sem autenticação (inesperado)"
    except urllib.error.HTTPError as e:
        status = e.code
        meta = e.headers.get("www-authenticate", "")
        ev = f"HTTP {e.code}; OAuth anunciado: {'resource_metadata' in meta}"
    except Exception as e:  # noqa: BLE001
        status, ev = 0, f"inalcançável: {type(e).__name__} (host fora da allowlist do ambiente?)"
    return _linha("fal MCP remoto (mcp.fal.ai/mcp-relay)", True, status == 401, "não (OAuth pendente)",
                  "pago (créditos fal)", "usuário autorizar o OAuth no navegador (conector claude.ai ou /mcp)", ev)


def diagnosticar(rede=True) -> list:
    with tempfile.TemporaryDirectory() as t:
        tmp = Path(t)
        return [sondar_estudio(tmp), sondar_pixel_art_studio(tmp), sondar_pixelpipe(tmp), sondar_asf(tmp),
                sondar_codeart(tmp), sondar_fal_mcp(rede)]


def tabela(linhas) -> str:
    cab = "| Ferramenta | Instalada | Funciona aqui | Gera imagem? | Custo | Pendência | Evidência |\n|---|---|---|---|---|---|---|\n"
    sim = lambda b: "sim" if b else "não"  # noqa: E731
    return cab + "\n".join(f"| {l['ferramenta']} | {sim(l['instalada'])} | {sim(l['funciona_offline'])} | {l['gera_imagem']} | "
                           f"{l['custo']} | {l['pendencia']} | {l['evidencia']} |" for l in linhas)
