# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import os,json,subprocess,shlex,shutil,hashlib,gzip
ROOT=Path.cwd();BASE=ROOT/'research/items/granular-engine-loading';OUT=ROOT/(BASE/'full-run.txt').read_text().strip();OLD=ROOT/(BASE/'active-run.txt').read_text().strip();PIN=ROOT/'build/head-to-head/engine-build-01';OBJ=PIN/'build/obj-mpv';EM=Path('/Volumes/seed2/Projects/demuxe-release-closeout-20260916/build/emsdk-4.0.14/upstream/emscripten');ENV={**os.environ,'EM_CONFIG':str(PIN/'build/beta.emscripten'),'PATH':str(EM)+':'+os.environ['PATH']}
commands=json.loads((OUT/'build-commands.json').read_text()) if (OUT/'build-commands.json').exists() else []
def run(args,cwd=ROOT):
 import time
 t=time.time();p=subprocess.run(list(map(str,args)),cwd=cwd,env=ENV,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True);i=len(commands)+1;(OUT/f'build-{i:02}.log').write_text(p.stdout);commands.append({'argv':list(map(str,args)),'cwd':str(cwd),'exit':p.returncode,'seconds':time.time()-t});(OUT/'build-commands.json').write_text(json.dumps(commands,indent=2));print('command',i,'exit',p.returncode,flush=True)
 if p.returncode:raise RuntimeError(p.stdout[-6000:])
 return p.stdout
snap=OUT/'snapshots';snap.mkdir(exist_ok=True)
source=(OLD/'snapshots/mpv/filters/f_decoder_wrapper.c').read_text()
inside='''#ifdef __EMSCRIPTEN__
        extern const struct mp_decoder_fns vd_browser __attribute__((weak));
        if (driver == &vd_lavc && &vd_browser)
            p->decoder = vd_browser.create(p->decf, p->codec, sel->decoder);
#endif
'''
assert inside in source;source=source.replace(inside,'')
marker='    for (int n = 0; n < list->num_entries; n++) {'
assert marker in source
source=source.replace(marker,'''#ifdef __EMSCRIPTEN__
    // Research: browser admission must not depend on software decoder registration.
    extern const struct mp_decoder_fns vd_browser __attribute__((weak));
    if (driver == &vd_lavc && &vd_browser) {
        p->decoder = vd_browser.create(p->decf, p->codec, "browser");
        if (p->decoder) {
            p->codec->decoder = talloc_strdup(p, "browser");
            p->codec->decoder_desc = talloc_strdup(p, "Browser WebCodecs");
        }
    }
#endif
    for (int n = 0; !p->decoder && n < list->num_entries; n++) {''',1)
(snap/'f_decoder_wrapper.c').write_text(source)
entry=next(x for x in json.loads((OBJ/'compile_commands.json').read_text()) if x['file'].endswith('/f_decoder_wrapper.c'))
args=shlex.split(entry['command']);filtered=[];skip=False
for a in args:
 if skip:skip=False;continue
 if a in ['-o','-MQ','-MF']:skip=True;continue
 if a in ['-MD','-c'] or a==entry['file']:continue
 filtered.append(a)
obj=snap/'filters_f_decoder_wrapper.c.o';run([*filtered,'-I'+str(PIN/'build/sources/mpv/filters'),'-c',snap/'f_decoder_wrapper.c','-o',obj],OBJ)
archive=snap/'libmpv.a';shutil.copy2(PIN/'build/prefix/lib/libmpv.a',archive);run([EM/'emar','rcs',archive,obj])
basecmd=json.loads((OLD/'commands.json').read_text())[-2]['argv'];assert '/variants/baseline/' in basecmd[-1]
for variant in ['baseline','admission','lean']:
 dest=OUT/'variants'/variant;dest.mkdir(parents=True,exist_ok=True)
 if variant=='baseline':
  for n in ['player.mjs','player.wasm','player.wasm.gz']:shutil.copy2(OLD/'variants/baseline'/n,dest/n)
 else:
  cmd=[str(archive) if a=='-lmpv' else a for a in basecmd]
  if variant=='lean':cmd=[str(OLD/'snapshots/lean-ffmpeg/libavcodec.a') if a==str(PIN/'build/obj-software-full-ffmpeg/libavcodec/libavcodec.a') else a for a in cmd]
  cmd[-1]=str(dest/'player.mjs');run(cmd)
 data=(dest/'player.wasm').read_bytes();(dest/'player.wasm.gz').write_bytes(gzip.compress(data,compresslevel=6,mtime=0))
rows=[{'variant':p.name,'bytes':(p/'player.wasm').stat().st_size,'gzipBytes':(p/'player.wasm.gz').stat().st_size,'sha256':hashlib.sha256((p/'player.wasm').read_bytes()).hexdigest()} for p in (OUT/'variants').iterdir()]
(OUT/'sizes.json').write_text(json.dumps(rows,indent=2));print(json.dumps(rows,indent=2))
