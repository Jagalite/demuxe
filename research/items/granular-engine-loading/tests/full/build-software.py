# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
exec((Path(__file__).parent/'build.py').read_text().split("snap=OUT/'snapshots'")[0])
import re
snap=OUT/'snapshots/software';snap.mkdir(parents=True,exist_ok=True)
FF=PIN/'build/obj-software-full-ffmpeg';SRC=PIN/'build/sources/ffmpeg'
registry=json.loads((OLD/'registry.json').read_text());common={'ff_h264_decoder','ff_hevc_decoder','ff_vp8_decoder','ff_vp9_decoder','ff_av1_decoder','ff_libdav1d_decoder'};keep=registry['kept']+[x for x in registry['removed'] if x in common]
(snap/'libavcodec').mkdir(exist_ok=True);(snap/'libavcodec/codec_list.c').write_text('/* Research registration subset, original FFmpeg notices retained. */\nstatic const FFCodec * const codec_list[] = {\n'+''.join(' &'+n+',\n' for n in keep)+'NULL };\n');shutil.copy2(SRC/'libavcodec/allcodecs.c',snap/'allcodecs.c')
config=(FF/'ffbuild/config.mak').read_text();flags=[]
for key in ['CPPFLAGS','CFLAGS']:flags+=shlex.split(re.search(r'^'+key+r'=(.*)$',config,re.M).group(1).replace('$(SRC_PATH)',str(SRC)))
run([EM/'emcc','-DHAVE_AV_CONFIG_H','-DBUILDING_avcodec','-I'+str(snap),'-I'+str(FF),'-I'+str(SRC),'-I'+str(SRC/'libavcodec'),*flags,'-c',snap/'allcodecs.c','-o',snap/'allcodecs.o'])
archive=snap/'libavcodec.a';shutil.copy2(FF/'libavcodec/libavcodec.a',archive);run([EM/'emar','rcs',archive,snap/'allcodecs.o'])
shutil.copy2(ROOT/'native/player.c',snap/'player.c')
basecmd=json.loads((OLD/'commands.json').read_text())[-2]['argv'];cmd=[]
for a in basecmd:
 if a.endswith('/snapshots/experiments/retained-subtitles/subtitles.c') or a.endswith('/snapshots/native/vd_browser.c') or a=='--profiling-funcs':continue
 if a.endswith('/snapshots/experiments/retained-subtitles/player.c'):a=str(snap/'player.c')
 if a.endswith('/build/retained-subs/vo_libmpv.o'):a=str(PIN/'build/software-vo/vo_libmpv.o')
 cmd.append(a)
for variant in ['software-baseline','software-common']:
 dest=OUT/'variants'/variant;dest.mkdir(parents=True,exist_ok=True);args=[str(archive) if variant=='software-common' and a==str(FF/'libavcodec/libavcodec.a') else a for a in cmd];args[-1]=str(dest/'player.mjs');run(args)
 data=(dest/'player.wasm').read_bytes();(dest/'player.wasm.gz').write_bytes(gzip.compress(data,compresslevel=6,mtime=0))
rows=[{'variant':p.name,'bytes':(p/'player.wasm').stat().st_size,'gzipBytes':(p/'player.wasm.gz').stat().st_size,'sha256':hashlib.sha256((p/'player.wasm').read_bytes()).hexdigest()} for p in (OUT/'variants').iterdir() if (p/'player.wasm').exists()];(OUT/'sizes.json').write_text(json.dumps(rows,indent=2));(OUT/'software-registry.json').write_text(json.dumps({'videoKept':list(common),'kept':keep,'removed':[x for x in registry['removed'] if x not in common]},indent=2));print(json.dumps(rows,indent=2))
