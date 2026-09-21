#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [ -f evidence/verification.json ]; then
  stamp="$(date -u +%Y%m%dT%H%M%S)-$$"
  mkdir -p "runs/$stamp"
  cp -a evidence "runs/$stamp/evidence"
fi
python scripts/build.py > evidence/build_stdout.txt 2>&1
for stage in routes direct combinations audio cancellation audible; do
  python scripts/run_browser.py "$stage" > "evidence/${stage}_stdout.txt" 2>&1
done
python scripts/verify.py
