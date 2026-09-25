#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
# Matched playback variants without per-component clock probes.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$ROOT"
SDK=${DEMUXE_SDK:-$ROOT/build/emsdk-4.0.14}
source "$SDK/emsdk_env.sh" >/dev/null
export EM_CONFIG="${WEBMPV_EM_CONFIG:-$ROOT/build/gap.emscripten}"
export PKG_CONFIG_LIBDIR="$ROOT/build/prefix/lib/pkgconfig"
export PKG_CONFIG_PATH="$PKG_CONFIG_LIBDIR"
BUILD="$ROOT/build/experiments/prores-real-packet-webgpu"
python3 experiments/prores-real-packet-webgpu/bridge.py
python3 experiments/prores-real-packet-webgpu/bridge.py --direct
python3 experiments/prores-real-packet-webgpu/direct.py
read -r -a LIBS <<< "$(pkg-config --cflags --libs --static mpv)"
for i in "${!LIBS[@]}"; do
  case "${LIBS[$i]}" in
    -lavcodec) LIBS[$i]="$BUILD/libavcodec-fast.a";;
    -lavformat|-lavfilter|-lavutil|-lswresample|-lswscale)
      name=${LIBS[$i]#-l}; LIBS[$i]="$ROOT/build/obj-software-full-ffmpeg/lib$name/lib$name.a";;
  esac
done
source scripts/decoder-simd.sh
for variant in engine direct; do
  OUT="$BUILD/$variant-fast"
  mkdir -p "$OUT"
  source_file="$BUILD/proresdec.c"
  bridge_file="$BUILD/vd_live.c"
  if [ "$variant" = direct ]; then
    source_file="$BUILD/proresdec-direct.c"
    bridge_file="$BUILD/vd_direct.c"
  fi
  "$SDK/upstream/emscripten/emcc" -O2 -pthread -msimd128 -DHAVE_AV_CONFIG_H \
    -DPRORES_STAGE_PROFILE=0 -I"$ROOT/experiments/prores-real-packet-webgpu" \
    -I"$ROOT/native" -I"$BUILD" -I"$ROOT/build/obj-software-full-ffmpeg" \
    -I"$ROOT/build/sources/ffmpeg/libavcodec" -I"$ROOT/build/sources/ffmpeg" \
    -c "$source_file" -o "$OUT/proresdec.o"
  cp build/obj-software-full-ffmpeg/libavcodec/libavcodec.a "$BUILD/libavcodec-fast.a"
  "$SDK/upstream/emscripten/emar" rcs "$BUILD/libavcodec-fast.a" "$OUT/proresdec.o"
  "$SDK/upstream/emscripten/emcc" -O2 -pthread -msimd128 \
    -Inative -Ibuild/sources/mpv -Ibuild/obj-mpv \
    "$BUILD/player.c" native/subtitles/bitmap.c build/retained-subs/vo_libmpv.o \
    native/events.c native/stream_bridge.c "$bridge_file" "${DECODER_SIMD_SOURCES[@]}" \
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
done
