# SPDX-License-Identifier: Apache-2.0
"""Build isolated archive/link variants; never publish into production web/."""
from pathlib import Path
import os,subprocess,json,shutil,re,hashlib,gzip,time
ROOT=Path.cwd();BASE=ROOT/'research/items/granular-engine-loading';OUT=ROOT/(BASE/'active-run.txt').read_text().strip();PIN=ROOT/'build/head-to-head/engine-build-01';OBJ=PIN/'build/obj-software-full-ffmpeg';SRC=PIN/'build/sources/ffmpeg'
SDK=Path('/Volumes/seed2/Projects/demuxe-release-closeout-20260916/build/emsdk-4.0.14');EM=SDK/'upstream/emscripten';ENV={**os.environ,'EM_CONFIG':str(PIN/'build/beta.emscripten'),'PATH':str(EM)+':'+os.environ['PATH'],'PKG_CONFIG_LIBDIR':str(PIN/'build/prefix/lib/pkgconfig'),'PKG_CONFIG_PATH':str(PIN/'build/prefix/lib/pkgconfig')}
commands=json.loads((OUT/'commands.json').read_text()) if (OUT/'commands.json').exists() else []
def run(args):
 start=time.time();p=subprocess.run([str(x) for x in args],env=ENV,cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True);commands.append({'argv':[str(x) for x in args],'exit':p.returncode,'seconds':time.time()-start});(OUT/f'command-{len(commands):02d}.log').write_text(p.stdout);(OUT/'commands.json').write_text(json.dumps(commands,indent=2));
 if p.returncode:raise RuntimeError(p.stdout[-5000:])
 return p.stdout
snap=OUT/'snapshots';runtime=snap/'runtime';(runtime/'web').mkdir(parents=True,exist_ok=True)
for p in (ROOT/'web').glob('*.js'):shutil.copy2(p,runtime/'web'/p.name)
shutil.copytree(ROOT/'web/generated',runtime/'web/generated',dirs_exist_ok=True)
for name in ['engine-remux','engine-software-full']:
 shutil.copytree(ROOT/'web'/name,runtime/'web'/name,dirs_exist_ok=True)
(runtime/'fixtures').mkdir(exist_ok=True);shutil.copy2(ROOT/'fixtures/DejaVuSans.ttf',runtime/'fixtures/DejaVuSans.ttf');shutil.copy2(ROOT/'fixtures/FONT-LICENSE.txt',runtime/'fixtures/FONT-LICENSE.txt')
for p in ['native/vd_browser.c','native/events.c','native/stream_bridge.c','native/browser_decoder_bridge.h','experiments/retained-subtitles/player.c','experiments/retained-subtitles/subtitles.c','scripts/link-hybrid.sh','scripts/decoder-simd.sh']:
 target=snap/p;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(ROOT/p,target)
shutil.copytree(ROOT/'native/simd',snap/'native/simd',dirs_exist_ok=True)
variants=OUT/'variants'
for variant in ['shipping','stripped','baseline','lean']:(variants/variant).mkdir(parents=True,exist_ok=True)
for p in (ROOT/'web/engine-hybrid').glob('player.*'):
 if p.suffix in ['.mjs','.wasm']:
  shutil.copy2(p,variants/'shipping'/p.name);shutil.copy2(p,variants/'stripped'/p.name)
# Remove only the optional name/producers metadata; preserve all executable bytes.
def leb(data,p):
 n=0;shift=0
 while True:
  c=data[p];p+=1;n|=(c&127)<<shift
  if c<128:return n,p
  shift+=7
wasm=(variants/'shipping/player.wasm').read_bytes();p=8;stripped=bytearray(wasm[:8]);sections=[]
while p<len(wasm):
 start=p;kind=wasm[p];size,body=leb(wasm,p+1);end=body+size;name=''
 if kind==0:n,q=leb(wasm,body);name=wasm[q:q+n].decode(errors='replace')
 remove=kind==0 and name in ['name','producers'];sections.append({'id':kind,'name':name,'bytes':end-start,'removed':remove})
 if not remove:stripped.extend(wasm[start:end])
 p=end
(variants/'stripped/player.wasm').write_bytes(stripped);(OUT/'wasm-sections.json').write_text(json.dumps(sections,indent=2))
allcodecs=(SRC/'libavcodec/allcodecs.c').read_text();video=set(re.findall(r'extern (?:const )?FFCodec (ff_\w+_decoder);',allcodecs.split('/* audio codecs */')[0]));video.add('ff_libdav1d_decoder')
registry=(OBJ/'libavcodec/codec_list.c').read_text();names=re.findall(r'&(ff_\w+)',registry);drop=[n for n in names if n in video];keep=[n for n in names if n not in video]
inc=snap/'lean-ffmpeg';(inc/'libavcodec').mkdir(parents=True,exist_ok=True);(inc/'libavcodec/codec_list.c').write_text('/* Generated experimental registration list; FFmpeg declarations retain upstream license. */\nstatic const FFCodec * const codec_list[] = {\n'+''.join('    &'+n+',\n' for n in keep)+'    NULL };\n');shutil.copy2(SRC/'libavcodec/allcodecs.c',inc/'allcodecs.c');shutil.copy2(OBJ/'libavcodec/codec_list.c',snap/'full-codec-list.c');(OUT/'registry.json').write_text(json.dumps({'kept':keep,'removed':drop},indent=2))
# Match FFmpeg compilation flags and dependency headers, replacing only the registry include.
config=(OBJ/'ffbuild/config.mak').read_text();import shlex
flags=[]
for key in ['CPPFLAGS','CFLAGS']:
 value=re.search(r'^'+key+r'=(.*)$',config,re.M).group(1).replace('$(SRC_PATH)',str(SRC));flags+=shlex.split(value)
run([EM/'emcc','-DHAVE_AV_CONFIG_H','-DBUILDING_avcodec','-I'+str(inc),'-I'+str(OBJ),'-I'+str(SRC),'-I'+str(SRC/'libavcodec'),*flags,'-c',inc/'allcodecs.c','-o',inc/'allcodecs.o'])
archive=inc/'libavcodec.a';shutil.copy2(OBJ/'libavcodec/libavcodec.a',archive);run([EM/'emar','rcs',archive,inc/'allcodecs.o'])
libs=shlex.split(run(['pkg-config','--cflags','--libs','--static','mpv']).strip())
libs=[str(OBJ/('lib'+arg[2:])/('lib'+arg[2:]+'.a')) if arg in ['-lavcodec','-lavformat','-lavfilter','-lavutil','-lswresample','-lswscale','-lpostproc'] else arg for arg in libs]
# Match production flags and sources for both builds; all writes go under this run.
sources=[snap/'experiments/retained-subtitles/player.c',snap/'experiments/retained-subtitles/subtitles.c',PIN/'build/retained-subs/vo_libmpv.o',snap/'native/events.c',snap/'native/stream_bridge.c',snap/'native/vd_browser.c']
simd=[snap/'native/simd'/n for n in ['h264-chroma.c','h264-biweight.c','h264-deblock.c','h264-dsp.c','h264-qpel.c']]
common=['-O2','--profiling-funcs','-pthread','-msimd128','-I'+str(ROOT/'native'),'-I'+str(PIN/'build/sources/mpv'),'-I'+str(PIN/'build/obj-mpv'),'-I'+str(SRC),*sources,*simd,'-Wl,--wrap=ff_h264chroma_init','-Wl,--wrap=ff_h264dsp_init','-Wl,--wrap=ff_h264qpel_init']
settings=['-lstdc++','-fexceptions','-sMODULARIZE=1','-sEXPORT_ES6=1','-sEXPORT_NAME=createEngine','-sENVIRONMENT=worker','-sPTHREAD_POOL_SIZE=8','-sPTHREAD_POOL_SIZE_STRICT=2','-sINITIAL_MEMORY=134217728','-sMAXIMUM_MEMORY=1073741824','-sALLOW_MEMORY_GROWTH=1','-sSTACK_SIZE=2097152','-sDEFAULT_PTHREAD_STACK_SIZE=2097152','-sWASM_BIGINT=1','-sWASMFS=1','-sFORCE_FILESYSTEM=1','-sEXIT_RUNTIME=0','-sEXPORTED_FUNCTIONS=["_web_create","_web_command_args","_web_event","_web_render","_web_presented","_web_destroy","_web_audio_ptr","_malloc","_free"]','-sEXPORTED_RUNTIME_METHODS=["ccall","UTF8ToString","FS","PThread","HEAPU8","HEAPU32","HEAPF32"]']
for variant in ['baseline','lean']:
 chosen=[str(archive) if variant=='lean' and arg==str(OBJ/'libavcodec/libavcodec.a') else arg for arg in libs]
 run([EM/'emcc',*common,*chosen,OBJ/'libpostproc/libpostproc.a',PIN/'build/prefix-playback/lib/libdav1d.a',PIN/'build/prefix-playback/lib/libzimg.a',*settings,'-o',variants/variant/'player.mjs'])
rows=[]
for variant in ['shipping','stripped','baseline','lean']:
 data=(variants/variant/'player.wasm').read_bytes();z=gzip.compress(data,compresslevel=6,mtime=0);(variants/variant/'player.wasm.gz').write_bytes(z);rows.append({'variant':variant,'bytes':len(data),'gzipBytes':len(z),'sha256':hashlib.sha256(data).hexdigest()})
(OUT/'sizes.json').write_text(json.dumps(rows,indent=2));print(json.dumps({'sizes':rows,'removedVideoDecoders':len(drop),'retainedDecoders':len(keep)},indent=2))
