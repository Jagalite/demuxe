#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
PYTHON="${PYTHON:-python3}"
if [[ -f evidence/verification.json ]]; then
  archive="runs/recorded-before-$(date -u +%Y%m%dT%H%M%SZ)"
  mkdir -p "$archive"
  cp -R evidence "$archive/"
fi
"$PYTHON" scripts/build_fixtures.py
"$PYTHON" scripts/aac_pce_screen.py
"$PYTHON" scripts/island_screen.py
for stage in projection widths audio pce inflate islands decode; do
  "$PYTHON" scripts/run_browser.py "$stage"
done
"$PYTHON" scripts/verify_results.py
