#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT=$PWD
OUTPUT=${1:-build/container-result}
mkdir -p "$OUTPUT"
OUTPUT=$(cd "$OUTPUT" && pwd)
docker build --platform linux/arm64 -t deplexr-m0-toolchain .
docker image inspect deplexr-m0-toolchain --format '{"id":"{{.Id}}","architecture":"{{.Architecture}}","os":"{{.Os}}"}' > "$OUTPUT/toolchain-image.json"
docker run --rm --platform linux/arm64 \
  --mount "type=bind,src=$ROOT,dst=/input,readonly" \
  --mount "type=bind,src=$OUTPUT,dst=/output" \
  deplexr-m0-toolchain bash /input/scripts/container-build.sh
