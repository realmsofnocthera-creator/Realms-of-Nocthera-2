#!/usr/bin/env bash
# Prepara o estúdio: confirma Python >= 3.10, instala/valida o Pillow e roda os testes.
set -euo pipefail
cd "$(dirname "$0")"
PY="${PYTHON:-python3}"
"$PY" - <<'PYEOF'
import sys
if sys.version_info < (3, 10):
    sys.exit(f"Python >= 3.10 necessário (encontrado {sys.version.split()[0]})")
PYEOF
if ! "$PY" -c "import PIL" 2>/dev/null; then
  echo ">> Instalando Pillow..."
  "$PY" -m pip install --quiet -r requirements.txt || "$PY" -m pip install --quiet --break-system-packages -r requirements.txt
fi
"$PY" -c "import PIL, sys; print('Python', sys.version.split()[0], '| Pillow', PIL.__version__)"
mkdir -p assets/{entrada,bruto,candidatos,aprovados,relatorios,previews}
if [ "${1:-}" != "--sem-testes" ]; then
  "$PY" -m unittest discover -s tests -t . -v 2>&1 | tail -n 15
fi
echo ">> Estúdio pronto. Veja studio/README.md"
