#!/usr/bin/env python3
"""Auditoria técnica completa. Equivale a `python3 -m nocthera_studio auditar`."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from nocthera_studio.cli import main  # noqa: E402

sys.exit(main(["auditar", *sys.argv[1:]]))
