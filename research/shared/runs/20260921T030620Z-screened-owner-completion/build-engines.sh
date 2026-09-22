#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail
ROOT="$PWD"
SDK=/Volumes/seed2/Projects/webmpv/build/emsdk-4.0.14
source "$SDK/emsdk_env.sh" >/dev/null
export PATH="$SDK/upstream/emscripten:$SDK:$PATH"
export EM_CONFIG=/Volumes/seed2/Projects/webmpv/build/gap.emscripten
export EM_CACHE="$ROOT/build/research-prefix-emcache"
OBJ=/Volumes/seed2/Projects/webmpv/build/native-remux/ffmpeg
LINK_OUT="$ROOT/build/screened-owner-completion/20260921T030620Z-screened-owner-completion/engine-baseline"
emcc -O2 "-ffile-prefix-map=$ROOT=/demuxe" -pthread -msimd128 -I"$OBJ" -Ibuild/sources/ffmpeg \
 research/shared/runs/20260921T030620Z-screened-owner-completion/snapshots/remux-baseline.c \
 "$OBJ/libavformat/libavformat.a" "$OBJ/libavcodec/libavcodec.a" "$OBJ/libavutil/libavutil.a" \
 -sMODULARIZE=1 -sEXPORT_ES6=1 -sEXPORT_NAME=createRemux -sENVIRONMENT=worker \
 -sINITIAL_MEMORY=67108864 -sMAXIMUM_MEMORY=134217728 -sALLOW_MEMORY_GROWTH=1 \
 -sSTACK_SIZE=2097152 -sWASM_BIGINT=1 -sFILESYSTEM=0 \
 -sEXPORTED_FUNCTIONS='["_rm_error","_rm_probe","_rm_open","_rm_start","_rm_set_container","_rm_step","_rm_close","_rm_duration","_rm_video_codec","_rm_audio_codec","_malloc","_free"]' \
 -sEXPORTED_RUNTIME_METHODS='["HEAPU8","ccall","UTF8ToString"]' \
 -o "$LINK_OUT/remux.mjs"

LINK_OUT="$ROOT/build/screened-owner-completion/20260921T030620Z-screened-owner-completion/engine-aac"
emcc -O2 "-ffile-prefix-map=$ROOT=/demuxe" -pthread -msimd128 -I"$OBJ" -Ibuild/sources/ffmpeg \
 research/shared/runs/20260921T030620Z-screened-owner-completion/snapshots/remux-aac.c \
 "$OBJ/libavformat/libavformat.a" "$OBJ/libavcodec/libavcodec.a" "$OBJ/libavutil/libavutil.a" \
 -sMODULARIZE=1 -sEXPORT_ES6=1 -sEXPORT_NAME=createRemux -sENVIRONMENT=worker \
 -sINITIAL_MEMORY=67108864 -sMAXIMUM_MEMORY=134217728 -sALLOW_MEMORY_GROWTH=1 \
 -sSTACK_SIZE=2097152 -sWASM_BIGINT=1 -sFILESYSTEM=0 \
 -sEXPORTED_FUNCTIONS='["_rm_error","_rm_probe","_rm_open","_rm_start","_rm_set_container","_rm_step","_rm_close","_rm_duration","_rm_video_codec","_rm_audio_codec","_malloc","_free"]' \
 -sEXPORTED_RUNTIME_METHODS='["HEAPU8","ccall","UTF8ToString"]' \
 -o "$LINK_OUT/remux.mjs"

