#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT=$PWD
OUTPUT=${1:-build/container-result}
mkdir -p "$OUTPUT"
OUTPUT=$(cd "$OUTPUT" && pwd)
docker build --platform linux/arm64 -t demuxe-m0-toolchain .
docker image inspect demuxe-m0-toolchain --format '{"id":"{{.Id}}","architecture":"{{.Architecture}}","os":"{{.Os}}"}' > "$OUTPUT/toolchain-image.json"
docker run --rm --platform linux/arm64 \
  --mount "type=bind,src=$ROOT,dst=/input,readonly" \
  --mount "type=bind,src=$OUTPUT,dst=/output" \
  demuxe-m0-toolchain bash /input/scripts/container-build.sh
