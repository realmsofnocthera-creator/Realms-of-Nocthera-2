#!/usr/bin/env python3
"""Verifica pixels de PNGs. Uso: scripts/verificar_pixels.py [-c monstro|arma|icone] [--json] arquivo_ou_pasta..."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from nocthera_studio.cli import executar_verificacao  # noqa: E402

sys.exit(executar_verificacao("pixels"))
