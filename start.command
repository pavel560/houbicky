#!/bin/bash
# Houbičky — dvojklikem spustí místní server a otevře prohlížeč (macOS).
cd "$(dirname "$0")" || exit 1
if ! command -v python3 >/dev/null 2>&1; then
  osascript -e 'display alert "Houbičky" message "Chybí python3. V Terminálu spusťte: xcode-select --install"' >/dev/null 2>&1
  exit 1
fi
exec python3 serve.py --open
