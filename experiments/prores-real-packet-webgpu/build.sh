#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$ROOT"
SDK=${DEMUXE_SDK:-$ROOT/build/emsdk-4.0.14}
source "$SDK/emsdk_env.sh" >/dev/null
export EM_CONFIG="${WEBMPV_EM_CONFIG:-$ROOT/build/gap.emscripten}"
export PKG_CONFIG_LIBDIR="$ROOT/build/prefix/lib/pkgconfig"
export PKG_CONFIG_PATH="$PKG_CONFIG_LIBDIR"
BUILD="$ROOT/build/experiments/prores-real-packet-webgpu"
OUT="$BUILD/engine"
mkdir -p "$BUILD" "$OUT"
python3 experiments/prores-real-packet-webgpu/bridge.py
python3 experiments/prores-real-packet-webgpu/bridge.py --direct
python3 experiments/prores-real-packet-webgpu/direct.py
python3 - <<'PY'
from pathlib import Path
root=Path('build/experiments/prores-real-packet-webgpu')
player=Path('experiments/retained-subtitles/player.c').read_text()
assert player.count('{"vd-lavc-threads","2"}') == 1
(root/'player.c').write_text(player.replace('{"vd-lavc-threads","2"}', '{"vd-lavc-threads","1"}'))
prores=Path('build/experiments/prores-coefficients/source/libavcodec/proresdec.c').read_text()
assert prores.count('#include "probe.h"') == 1
(root/'proresdec-profile.c').write_text(prores.replace('#include "probe.h"','#include "probe-profile.h"'))
PY
cp build/experiments/prores-coefficients/source/libavcodec/proresdec.c "$BUILD/proresdec.c"
"$SDK/upstream/emscripten/emcc" -O2 -pthread -msimd128 -DHAVE_AV_CONFIG_H \
  -I"$ROOT/experiments/prores-real-packet-webgpu" -I"$BUILD" -I"$ROOT/build/obj-software-full-ffmpeg" \
  -I"$ROOT/build/sources/ffmpeg/libavcodec" -I"$ROOT/build/sources/ffmpeg" \
  -c "$BUILD/proresdec.c" -o "$BUILD/proresdec.o"
cp build/obj-software-full-ffmpeg/libavcodec/libavcodec.a "$BUILD/libavcodec.a"
"$SDK/upstream/emscripten/emar" rcs "$BUILD/libavcodec.a" "$BUILD/proresdec.o"
read -r -a LIBS <<< "$(pkg-config --cflags --libs --static mpv)"
for i in "${!LIBS[@]}"; do
  case "${LIBS[$i]}" in
    -lavcodec) LIBS[$i]="$BUILD/libavcodec.a";;
    -lavformat|-lavfilter|-lavutil|-lswresample|-lswscale)
      name=${LIBS[$i]#-l}; LIBS[$i]="$ROOT/build/obj-software-full-ffmpeg/lib$name/lib$name.a";;
  esac
done
source scripts/decoder-simd.sh
"$SDK/upstream/emscripten/emcc" -O2 -pthread -msimd128 \
  -Inative -Ibuild/sources/mpv -Ibuild/obj-mpv \
  "$BUILD/player.c" native/subtitles/bitmap.c build/retained-subs/vo_libmpv.o \
  native/events.c native/stream_bridge.c "$BUILD/vd_live.c" "${DECODER_SIMD_SOURCES[@]}" \
  "${LIBS[@]}" "$ROOT/build/prefix-playback/lib/libdav1d.a" \
  "$ROOT/build/prefix-playback/lib/libzimg.a" -lstdc++ -fexceptions \
  -sMODULARIZE=1 -sEXPORT_ES6=1 -sEXPORT_NAME=createEngine -sENVIRONMENT=worker \
  -sPTHREAD_POOL_SIZE=8 -sPTHREAD_POOL_SIZE_STRICT=2 \
  -sINITIAL_MEMORY=134217728 -sMAXIMUM_MEMORY=1073741824 -sALLOW_MEMORY_GROWTH=1 \
  -sSTACK_SIZE=2097152 -sDEFAULT_PTHREAD_STACK_SIZE=2097152 \
  -sWASM_BIGINT=1 -sWASMFS=1 -sFORCE_FILESYSTEM=1 -sEXIT_RUNTIME=0 \
  -sEXPORTED_FUNCTIONS='["_web_create","_web_command_args","_web_event","_web_render","_web_presented","_web_destroy","_web_audio_ptr","_web_experiment_skip_render","_web_selected_pts","_web_selected_serial","_web_selected_redraw","_web_selected_delay","_web_decoder_ptr","_web_decoder_enable","_web_decoder_wakeup","_malloc","_free"]' \
  -sEXPORTED_RUNTIME_METHODS='["ccall","UTF8ToString","FS","PThread","HEAPU8","HEAPU32","HEAPF32"]' \
  -o "$OUT/player.mjs"
mkdir -p "$BUILD/software"
SOFTWARE_LIBS=("${LIBS[@]}")
for i in "${!SOFTWARE_LIBS[@]}"; do
  if [ "${SOFTWARE_LIBS[$i]}" = "$BUILD/libavcodec.a" ]; then
    SOFTWARE_LIBS[$i]="$ROOT/build/obj-software-full-ffmpeg/libavcodec/libavcodec.a"
  fi
done
"$SDK/upstream/emscripten/emcc" -O2 -pthread -msimd128 \
  -Inative -Ibuild/sources/mpv -Ibuild/obj-mpv \
  "$BUILD/player.c" native/subtitles/bitmap.c build/retained-subs/vo_libmpv.o \
  native/events.c native/stream_bridge.c native/vd_browser.c "${DECODER_SIMD_SOURCES[@]}" \
  "${SOFTWARE_LIBS[@]}" "$ROOT/build/prefix-playback/lib/libdav1d.a" \
  "$ROOT/build/prefix-playback/lib/libzimg.a" -lstdc++ -fexceptions \
  -sMODULARIZE=1 -sEXPORT_ES6=1 -sEXPORT_NAME=createEngine -sENVIRONMENT=worker \
  -sPTHREAD_POOL_SIZE=8 -sPTHREAD_POOL_SIZE_STRICT=2 \
  -sINITIAL_MEMORY=134217728 -sMAXIMUM_MEMORY=1073741824 -sALLOW_MEMORY_GROWTH=1 \
  -sSTACK_SIZE=2097152 -sDEFAULT_PTHREAD_STACK_SIZE=2097152 \
  -sWASM_BIGINT=1 -sWASMFS=1 -sFORCE_FILESYSTEM=1 -sEXIT_RUNTIME=0 \
  -sEXPORTED_FUNCTIONS='["_web_create","_web_command_args","_web_event","_web_render","_web_presented","_web_destroy","_web_audio_ptr","_web_experiment_skip_render","_web_selected_pts","_web_selected_serial","_web_selected_redraw","_web_selected_delay","_malloc","_free"]' \
  -sEXPORTED_RUNTIME_METHODS='["ccall","UTF8ToString","FS","PThread","HEAPU8","HEAPU32","HEAPF32"]' \
  -o "$BUILD/software/player.mjs"

for variant in direct profile; do
  mkdir -p "$BUILD/$variant"
  "$SDK/upstream/emscripten/emcc" -O2 -pthread -msimd128 -DHAVE_AV_CONFIG_H \
    -I"$ROOT/experiments/prores-real-packet-webgpu" -I"$ROOT/native" -I"$BUILD" \
    -I"$ROOT/build/obj-software-full-ffmpeg" \
    -I"$ROOT/build/sources/ffmpeg/libavcodec" -I"$ROOT/build/sources/ffmpeg" \
    -c "$BUILD/proresdec-$variant.c" -o "$BUILD/$variant/proresdec.o"
  cp build/obj-software-full-ffmpeg/libavcodec/libavcodec.a "$BUILD/libavcodec-$variant.a"
  "$SDK/upstream/emscripten/emar" rcs "$BUILD/libavcodec-$variant.a" "$BUILD/$variant/proresdec.o"
done
DIRECT_LIBS=("${LIBS[@]}")
PROFILE_LIBS=("${LIBS[@]}")
for i in "${!LIBS[@]}"; do
  if [ "${LIBS[$i]}" = "$BUILD/libavcodec.a" ]; then
    DIRECT_LIBS[$i]="$BUILD/libavcodec-direct.a"
    PROFILE_LIBS[$i]="$BUILD/libavcodec-profile.a"
  fi
done
mkdir -p "$BUILD/direct" "$BUILD/software-profile"
"$SDK/upstream/emscripten/emcc" -O2 -pthread -msimd128 \
  -Inative -Ibuild/sources/mpv -Ibuild/obj-mpv \
  "$BUILD/player.c" native/subtitles/bitmap.c build/retained-subs/vo_libmpv.o \
  native/events.c native/stream_bridge.c "$BUILD/vd_direct.c" "${DECODER_SIMD_SOURCES[@]}" \
  "${DIRECT_LIBS[@]}" "$ROOT/build/prefix-playback/lib/libdav1d.a" \
  "$ROOT/build/prefix-playback/lib/libzimg.a" -lstdc++ -fexceptions \
  -sMODULARIZE=1 -sEXPORT_ES6=1 -sEXPORT_NAME=createEngine -sENVIRONMENT=worker \
  -sPTHREAD_POOL_SIZE=8 -sPTHREAD_POOL_SIZE_STRICT=2 \
  -sINITIAL_MEMORY=134217728 -sMAXIMUM_MEMORY=1073741824 -sALLOW_MEMORY_GROWTH=1 \
  -sSTACK_SIZE=2097152 -sDEFAULT_PTHREAD_STACK_SIZE=2097152 \
  -sWASM_BIGINT=1 -sWASMFS=1 -sFORCE_FILESYSTEM=1 -sEXIT_RUNTIME=0 \
  -sEXPORTED_FUNCTIONS='["_web_create","_web_command_args","_web_event","_web_render","_web_presented","_web_destroy","_web_audio_ptr","_web_experiment_skip_render","_web_selected_pts","_web_selected_serial","_web_selected_redraw","_web_selected_delay","_web_decoder_ptr","_web_decoder_enable","_web_decoder_wakeup","_malloc","_free"]' \
  -sEXPORTED_RUNTIME_METHODS='["ccall","UTF8ToString","FS","PThread","HEAPU8","HEAPU32","HEAPF32"]' \
  -o "$BUILD/direct/player.mjs"
"$SDK/upstream/emscripten/emcc" -O2 -pthread -msimd128 \
  -Inative -Ibuild/sources/mpv -Ibuild/obj-mpv \
  "$BUILD/player.c" native/subtitles/bitmap.c build/retained-subs/vo_libmpv.o \
  native/events.c native/stream_bridge.c native/vd_browser.c "${DECODER_SIMD_SOURCES[@]}" \
  "${PROFILE_LIBS[@]}" "$ROOT/build/prefix-playback/lib/libdav1d.a" \
  "$ROOT/build/prefix-playback/lib/libzimg.a" -lstdc++ -fexceptions \
  -sMODULARIZE=1 -sEXPORT_ES6=1 -sEXPORT_NAME=createEngine -sENVIRONMENT=worker \
  -sPTHREAD_POOL_SIZE=8 -sPTHREAD_POOL_SIZE_STRICT=2 \
  -sINITIAL_MEMORY=134217728 -sMAXIMUM_MEMORY=1073741824 -sALLOW_MEMORY_GROWTH=1 \
  -sSTACK_SIZE=2097152 -sDEFAULT_PTHREAD_STACK_SIZE=2097152 \
  -sWASM_BIGINT=1 -sWASMFS=1 -sFORCE_FILESYSTEM=1 -sEXIT_RUNTIME=0 \
  -sEXPORTED_FUNCTIONS='["_web_create","_web_command_args","_web_event","_web_render","_web_presented","_web_destroy","_web_audio_ptr","_web_experiment_skip_render","_web_selected_pts","_web_selected_serial","_web_selected_redraw","_web_selected_delay","_web_prores_profile_ptr","_malloc","_free"]' \
  -sEXPORTED_RUNTIME_METHODS='["ccall","UTF8ToString","FS","PThread","HEAPU8","HEAPU32","HEAPF32"]' \
  -o "$BUILD/software-profile/player.mjs"
