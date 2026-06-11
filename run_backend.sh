#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_PY="$ROOT_DIR/.venv/bin/python"

if [[ -x "$VENV_PY" ]]; then
  if ! "$VENV_PY" - <<'PY'
import importlib.util
import sys

missing = [m for m in ("fastapi", "uvicorn") if importlib.util.find_spec(m) is None]
if missing:
    print("Missing modules in .venv: " + ", ".join(missing))
    sys.exit(1)
PY
  then
    echo "Install dependencies:"
    echo "  $VENV_PY -m pip install -r $ROOT_DIR/requirements.txt"
    exit 1
  fi

  exec "$VENV_PY" -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8000 --app-dir "$ROOT_DIR"
fi

echo "Virtual environment not found at $ROOT_DIR/.venv."
echo "Create it and install requirements:"
echo "  python3 -m venv $ROOT_DIR/.venv"
echo "  $ROOT_DIR/.venv/bin/pip install -r $ROOT_DIR/requirements.txt"
exit 1
