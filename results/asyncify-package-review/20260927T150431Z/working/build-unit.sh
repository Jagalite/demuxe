#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
set -euo pipefail
cd "$(dirname "$0")"
CC=${CLANG:-clang}
mkdir -p artifacts logs
"$CC" --target=wasm32 -O2 -g "-ffile-prefix-map=$PWD=/demuxe-asyncify-study" -ffreestanding -fno-builtin -nostdlib \
 -DDEMUXE_COOP_THREADS=1 -Itests/support -Iruntime -Iupstream -Iupstream/misc \
 runtime/threads-coop.c runtime/asyncify-stacks.c runtime/stack.s tests/support.c tests/probe.c \
 upstream/misc/dispatch.c upstream/misc/thread_pool.c \
 -Wl,--no-entry -Wl,--export=demuxe_asyncify_count -Wl,--export=demuxe_asyncify_data -Wl,--export=demuxe_asyncify_base -Wl,--export=demuxe_asyncify_end -Wl,--export=test_run -Wl,--export=test_allocations \
 -Wl,--export=demuxe_coop_invoke -Wl,--export=demuxe_coop_get_sp \
 -Wl,--export=demuxe_coop_set_sp -Wl,--export=demuxe_coop_stack_base \
 -Wl,--export=demuxe_coop_stack_count -Wl,--export=demuxe_coop_stack_top -Wl,--export-memory \
 -Wl,-z,stack-size=1048576 -Wl,--initial-memory=33554432 -Wl,--max-memory=67108864 \
 -o artifacts/mpv-coop-units.wasm 2>&1 | tee logs/build-unit.log
