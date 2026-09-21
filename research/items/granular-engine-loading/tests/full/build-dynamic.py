# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
exec((Path(__file__).parent/'build.py').read_text().split("snap=OUT/'snapshots'")[0])
D=OUT/'dynamic';D.mkdir(exist_ok=True);SRC=PIN/'build/sources/ffmpeg';FF=PIN/'build/obj-software-full-ffmpeg';PROBE=ROOT/'research/items/granular-engine-loading/tests/full/codec-probe.c';HOST=PROBE.with_name('module-host.c')
# Try the existing production archives first. Preserve their actual linker failure.
try:run([EM/'emcc','-O2','-pthread','-msimd128','-sSIDE_MODULE=2','-I'+str(SRC),'-I'+str(FF),PROBE,FF/'libavcodec/libavcodec.a',FF/'libavutil/libavutil.a','-sEXPORTED_FUNCTIONS=["_decode_fixture","_get_checksum"]','-o',D/'existing-archives.wasm'])
except RuntimeError:(D/'existing-archives-status.txt').write_text('Rejected by linker; see build command log. Rebuild actual H264 component as PIC next.\n')
# Build the smallest real H264/parser FFmpeg component as position independent code.
OBJ=D/'ffmpeg-pic';OBJ.mkdir(exist_ok=True)
if not (OBJ/'config.h').exists():run([SRC/'configure','--target-os=none','--arch=wasm32','--enable-cross-compile','--cc='+str(EM/'emcc'),'--cxx='+str(EM/'em++'),'--ar='+str(EM/'emar'),'--ranlib='+str(EM/'emranlib'),'--nm='+str(EM/'emnm'),'--disable-everything','--disable-autodetect','--disable-programs','--disable-doc','--disable-debug','--disable-network','--disable-asm','--disable-avformat','--disable-avfilter','--disable-swscale','--disable-swresample','--disable-postproc','--disable-avdevice','--enable-decoder=h264','--enable-parser=h264','--enable-pthreads','--enable-pic','--extra-cflags=-O2 -pthread -msimd128 -fPIC','--extra-ldflags=-pthread'],OBJ)
run(['make','-j','4'],OBJ)
libs=[OBJ/'libavcodec/libavcodec.a',OBJ/'libavutil/libavutil.a']
run([EM/'emcc','-O2','-pthread','-msimd128','-sSIDE_MODULE=2','-I'+str(SRC),'-I'+str(OBJ),PROBE,*libs,'-sEXPORTED_FUNCTIONS=["_decode_fixture","_get_checksum"]','-o',D/'codec.wasm'])
# Load-time declaration retains the system imports needed by the side module.
# Then remove dynamicLibraries in the JS harness to measure explicit runtime loading.
run([EM/'emcc','-O2','-pthread','-msimd128','-sMAIN_MODULE=2',HOST,D/'codec.wasm','-sMODULARIZE=1','-sEXPORT_ES6=1','-sENVIRONMENT=worker,node','-sEXPORT_NAME=createHost','-sPTHREAD_POOL_SIZE=2','-sINITIAL_MEMORY=33554432','-sALLOW_MEMORY_GROWTH=1','-sEXPORTED_FUNCTIONS=["_load_codec","_run_codec","_codec_checksum","_unload_codec","_malloc","_free"]','-sEXPORTED_RUNTIME_METHODS=["FS","PThread","HEAPU8"]','-o',D/'host.mjs'])
# Equivalent statically linked decode component for size/correctness comparison.
run([EM/'emcc','-O2','-pthread','-msimd128','-I'+str(SRC),'-I'+str(OBJ),PROBE,*libs,'-sMODULARIZE=1','-sEXPORT_ES6=1','-sENVIRONMENT=worker,node','-sEXPORT_NAME=createCodec','-sPTHREAD_POOL_SIZE=2','-sINITIAL_MEMORY=33554432','-sALLOW_MEMORY_GROWTH=1','-sEXPORTED_FUNCTIONS=["_decode_fixture","_get_checksum","_malloc","_free"]','-sEXPORTED_RUNTIME_METHODS=["FS","PThread","HEAPU8"]','-o',D/'static.mjs'])
rows=[]
for p in D.glob('*.wasm'):
 b=p.read_bytes();rows.append({'file':p.name,'bytes':len(b),'gzipBytes':len(gzip.compress(b,compresslevel=6,mtime=0)),'sha256':hashlib.sha256(b).hexdigest()})
(D/'sizes.json').write_text(json.dumps(rows,indent=2));print(json.dumps(rows,indent=2))
