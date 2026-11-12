#!/usr/bin/env bash
# Prepara o estúdio: confirma Python >= 3.10, instala/valida o Pillow e roda os testes.
set -euo pipefail
cd "$(dirname "$0")"
PY="${PYTHON:-python3}"
COMPLETO=0; TESTES=1
for arg in "$@"; do
  case "$arg" in
    --completo) COMPLETO=1 ;;
    --sem-testes) TESTES=0 ;;
    *) echo "uso: ./setup.sh [--completo] [--sem-testes]"; exit 2 ;;
  esac
done
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
if [ "$COMPLETO" = 1 ]; then
  echo ">> Instalando dependências das ferramentas externas (ASF / Pixel Art Studio)..."
  "$PY" -m pip install --quiet -r requirements-ferramentas.txt || "$PY" -m pip install --quiet --break-system-packages -r requirements-ferramentas.txt
  "$PY" -c "import numpy, scipy, resvg_py; print('numpy', numpy.__version__, '| scipy', scipy.__version__, '| resvg-py ok')"
  command -v ffmpeg >/dev/null && echo "ffmpeg: $(ffmpeg -version | head -1)" || echo "AVISO: ffmpeg ausente (só necessário para vídeo → sprite)"
  command -v node >/dev/null && echo "node: $(node --version)" || echo "AVISO: node ausente (só necessário para FX pixelfx/fx_verify)"
fi
if [ "$TESTES" = 1 ]; then
  "$PY" -m unittest discover -s tests -t . -v 2>&1 | tail -n 15
fi
echo ">> Estúdio pronto. Veja studio/README.md (ferramentas externas: ./setup.sh --completo e o comando diagnostico)"
