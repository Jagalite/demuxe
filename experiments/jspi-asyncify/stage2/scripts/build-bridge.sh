#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p stage2/artifacts stage2/logs
"${CLANG:-clang}" --target=wasm32 -O2 -g "-ffile-prefix-map=$PWD=/demuxe-asyncify-study" -ffreestanding -fno-builtin -nostdlib \
 -DDEMUXE_COOP_THREADS=1 -Istage2/tests/support -Itests/support -Iruntime -Iupstream \
 runtime/threads-coop.c runtime/asyncify-stacks.c runtime/stack.s tests/support.c \
 stage2/native/stream-coop.c stage2/tests/bridge-probe.c \
 -Wl,--no-entry -Wl,--export=demuxe_asyncify_count -Wl,--export=demuxe_asyncify_data -Wl,--export=demuxe_asyncify_base -Wl,--export=demuxe_asyncify_end -Wl,--export=bridge_setup -Wl,--export=bridge_open -Wl,--export=bridge_bad_uri \
 -Wl,--export=bridge_read -Wl,--export=bridge_seek -Wl,--export=bridge_size \
 -Wl,--export=bridge_cancel -Wl,--export=bridge_close -Wl,--export=bridge_fill -Wl,--export=bridge_ptr \
 -Wl,--export=demuxe_source_live -Wl,--export=demuxe_coop_invoke -Wl,--export=demuxe_coop_get_sp \
 -Wl,--export=demuxe_coop_set_sp -Wl,--export=demuxe_coop_stack_base -Wl,--export=demuxe_coop_stack_count -Wl,--export=demuxe_coop_stack_top \
 -Wl,--export-memory -Wl,-z,stack-size=1048576 -Wl,--initial-memory=33554432 -Wl,--max-memory=67108864 \
 -o stage2/artifacts/range-bridge.wasm 2>&1 | tee stage2/logs/build-bridge.log
