"""Manifesto de ativos e portão de aprovação.

Um ativo só vira `aprovado` quando: (1) a auditoria técnica do arquivo ATUAL não tem erros;
(2) o revisor registra a leitura fria e TODOS os itens do checklist visual; (3) o hash do arquivo
confere. Qualquer alteração posterior do PNG invalida a aprovação.
"""
from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

from .auditoria import PENDENTE, auditar_arquivo, salvar_relatorio
from .nucleo import ASSETS, sha256_arquivo

ARQUIVO = ASSETS / "manifesto.json"
STATUS = ("rascunho", "auditado", "reprovado", "aprovado")

ORIGENS = {
    "modelo": "gerada por modelo de imagem (API/CLI) e pós-processada",
    "codigo": "desenhada por código (pixel-art-studio, codeart2d, pxl) — declarar ao exibir/publicar",
    "humano": "pixel art feita por pessoa (Aseprite etc.)",
    "referencia": "pixelada a partir de imagem de referência real/licenciada (método Codixel)",
}

CATEGORIA_DA_PASTA = {"monstros": "monstro", "armas": "arma", "icones": "icone"}

CHECKLIST_VISUAL = {
    "leitura_fria": "Descrevi o sprite como alguém que nunca viu o briefing e a descrição bate com o briefing.",
    "silhueta": "A silhueta preta (teste 1x e 0,5x) identifica o objeto/criatura sem o interior.",
    "clusters": "Os tons formam massas deliberadas; não há granulado, lama ou ruído de gerador.",
    "contorno": "O contorno é de 1 px, contínuo e coerente (seletivo ou único), sem bordas borradas.",
    "paleta": "As rampas separam materiais com contraste claro; luz vem do canto superior esquerdo.",
    "leitura_1x": "No tamanho nativo (1x) o olho e a forma principal continuam legíveis.",
    "direcao_de_arte": "Combina com a direção de arte do jogo (dark fantasy, contraste, raridade correta).",
    "originalidade": "Não copia obra protegida nem arte de terceiros sem licença.",
}


def agora():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def carregar_manifesto() -> dict:
    if ARQUIVO.exists():
        return json.loads(ARQUIVO.read_text(encoding="utf-8"))
    return {"versao": 1, "ativos": []}


def salvar_manifesto(m: dict):
    ARQUIVO.parent.mkdir(parents=True, exist_ok=True)
    m["atualizado_em"] = agora()
    ARQUIVO.write_text(json.dumps(m, ensure_ascii=False, indent=2), encoding="utf-8")


def _raiz() -> Path:
    """Pasta que contém assets/ (e viewer/). Os caminhos do manifesto são relativos a ela."""
    return ASSETS.parent


def _rel(p: Path) -> str:
    try:
        return str(p.resolve().relative_to(_raiz().resolve()))
    except ValueError:
        return str(p)


def achar(m: dict, ativo_id: str):
    for a in m["ativos"]:
        if a["id"] == ativo_id:
            return a
    return None


def registrar(caminho, categoria: str, ativo_id: str | None = None, origem: dict | None = None,
              auditar: bool = True) -> dict:
    caminho = Path(caminho)
    ativo_id = ativo_id or caminho.stem
    m = carregar_manifesto()
    a = achar(m, ativo_id)
    if a is None:
        a = {"id": ativo_id, "status": "rascunho", "criado_em": agora()}
        m["ativos"].append(a)
    a.update(categoria=categoria, arquivo=_rel(caminho), sha256=sha256_arquivo(caminho))
    if origem:
        a["origem"] = origem
    if a.get("revisao") and a["revisao"].get("sha256") != a["sha256"]:
        a["status"] = "rascunho"
        a["revisao_invalidada"] = "arquivo alterado depois da aprovação"
    if auditar:
        rel = auditar_arquivo(caminho, categoria)
        rel_path = salvar_relatorio(rel, ASSETS / "relatorios" / f"{ativo_id}.audit.json")
        a["auditoria"] = {"veredito": rel["veredito_tecnico"], "erros": rel["erros"], "avisos": rel["avisos"],
                          "relatorio": _rel(rel_path), "sha256": rel["sha256"]}
        if a["status"] != "aprovado":
            a["status"] = "reprovado" if rel["erros"] else "auditado"
    salvar_manifesto(m)
    return a


def aprovar(ativo_id: str, revisor: str, leitura_fria: str, itens_confirmados: list[str], notas: str = "") -> dict:
    m = carregar_manifesto()
    a = achar(m, ativo_id)
    if a is None:
        raise ValueError(f"Ativo desconhecido: {ativo_id}")
    caminho = _raiz() / a["arquivo"]
    if not caminho.exists():
        raise ValueError(f"Arquivo não encontrado: {a['arquivo']}")
    if len(leitura_fria.strip()) < 30:
        raise ValueError("A leitura fria precisa descrever o sprite (≥30 caracteres), sem copiar o briefing.")
    if not revisor.strip():
        raise ValueError("Informe o revisor.")
    tipo = (a.get("origem") or {}).get("tipo")
    if tipo not in ORIGENS:
        raise ValueError("Origem da arte não declarada. Rode `origem <id> --tipo " + "|".join(ORIGENS) +
                         " --detalhe '...'` (a arte por código precisa ser divulgada como tal).")
    faltam = [k for k in CHECKLIST_VISUAL if k not in itens_confirmados and k != "leitura_fria"]
    if faltam:
        raise ValueError("Itens do checklist visual não confirmados: " + ", ".join(faltam))
    rel = auditar_arquivo(caminho, a["categoria"])
    if rel["veredito_tecnico"] != PENDENTE:
        raise ValueError(f"A auditoria técnica atual reprova o arquivo ({rel['erros']} erros). Corrija antes.")
    destino = ASSETS / "aprovados" / a["categoria"] / caminho.name
    destino.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(caminho, destino)
    a.update(status="aprovado", arquivo_aprovado=_rel(destino), sha256=rel["sha256"],
             revisao={"revisor": revisor, "data": agora(), "leitura_fria": leitura_fria.strip(),
                      "checklist": {k: (k in itens_confirmados or k == "leitura_fria") for k in CHECKLIST_VISUAL},
                      "notas": notas, "sha256": rel["sha256"]})
    a.pop("revisao_invalidada", None)
    salvar_manifesto(m)
    return a


def declarar_origem(ativo_id: str, tipo: str, detalhe: str = "") -> dict:
    if tipo not in ORIGENS:
        raise ValueError(f"tipo de origem inválido: {tipo} (use {', '.join(ORIGENS)})")
    m = carregar_manifesto()
    a = achar(m, ativo_id)
    if a is None:
        raise ValueError(f"Ativo desconhecido: {ativo_id}")
    a.setdefault("origem", {}).update(tipo=tipo, detalhe=detalhe, declarada_em=agora())
    salvar_manifesto(m)
    return a


def reconstruir(auditar: bool = True) -> dict:
    """Varre candidatos/ e aprovados/ e atualiza o manifesto (o visualizador lê este arquivo)."""
    for pasta in ("candidatos", "aprovados"):
        for p in sorted((ASSETS / pasta).rglob("*.png")):
            if pasta == "aprovados":
                continue  # cópias; o ativo continua apontando para o candidato
            existente = achar(carregar_manifesto(), p.stem)
            cat = CATEGORIA_DA_PASTA.get(p.parent.name) or (existente or {}).get("categoria") or "generico"
            registrar(p, cat, auditar=auditar)
    return carregar_manifesto()
