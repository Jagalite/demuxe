#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
# Retain prior evidence. Original included inputs are never overwritten.
mkdir -p reruns
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
cp -a evidence "reruns/evidence-$stamp"
python scripts/build_first.py > evidence/build_first_stdout.txt 2>&1
python scripts/build_images.py > evidence/build_images_stdout.txt 2>&1
cp evidence/animation_manifest.json fixtures/animation_manifest.json
python scripts/test_row_reuse.py > evidence/row_reuse_stdout.txt 2>&1
python scripts/run_browser.py first > evidence/browser_first_stdout.txt 2>&1
python scripts/run_browser.py images > evidence/browser_images_final_stdout.txt 2>&1
python scripts/verify.py > evidence/verify_stdout.txt 2>&1
cat evidence/verify_stdout.txt
# Recorded originals are now in reruns/. Do not claim the old checksum manifest
# certifies a new run; hash and review the new bytes separately.
