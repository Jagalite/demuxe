#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
for c in python ffmpeg ffprobe flac; do command -v "$c" >/dev/null || { echo "Missing dependency: $c" >&2; exit 1; }; done
if [[ -z "${CHROMIUM_EXECUTABLE:-}" ]]; then command -v chromium >/dev/null || { echo 'Set CHROMIUM_EXECUTABLE or install Chromium' >&2; exit 1; }; fi
python -c 'import numpy; import playwright.sync_api'
stamp=$(date -u +%Y%m%dT%H%M%SZ)
archive="runs/$stamp"
mkdir -p "$archive"
cp -a evidence fixtures "$archive/"
cp -a REPORT.md checksums.sha256 "$archive/" 2>/dev/null || true
python scripts/build.py > evidence/build_stdout.txt 2>&1
python scripts/run_browser.py audio > evidence/audio_stdout.txt 2>&1
python scripts/run_browser.py routes > evidence/routes_stdout.txt 2>&1
python scripts/run_browser.py reference > evidence/reference_stdout.txt 2>&1
python scripts/pixel_check.py > evidence/pixel_stdout.txt 2>&1
python scripts/verify.py | tee evidence/verify_stdout.txt
python scripts/write_report.py
python scripts/checksums.py
