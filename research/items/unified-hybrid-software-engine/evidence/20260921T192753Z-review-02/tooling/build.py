# SPDX-License-Identifier: Apache-2.0
from run_guard import resolve_run, require_writable_run
from pathlib import Path
import os,json,subprocess,shlex,shutil,hashlib,gzip,time
ROOT=Path.cwd();BASE=ROOT/'research/items/unified-hybrid-software-engine';OUT=resolve_run(BASE);OLD=ROOT/'research/items/granular-engine-loading/evidence/20260921T162900Z-screen-01';PIN=ROOT/'build/head-to-head/engine-build-01';OBJ=PIN/'build/obj-mpv';EM=Path('/Volumes/seed2/Projects/demuxe-release-closeout-20260916/build/emsdk-4.0.14/upstream/emscripten');ENV={**os.environ,'EM_CONFIG':str(PIN/'build/beta.emscripten'),'PATH':str(EM)+':'+os.environ['PATH']}
require_writable_run(OUT)
commands=[]
def run(args,cwd=ROOT):
 t=time.time();p=subprocess.run(list(map(str,args)),cwd=cwd,env=ENV,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True);i=len(commands)+1;(OUT/f'build-{i:02}.log').write_text(p.stdout);commands.append({'argv':list(map(str,args)),'cwd':str(cwd),'exit':p.returncode,'seconds':time.time()-t});(OUT/'build-commands.json').write_text(json.dumps(commands,indent=2));print('command',i,'exit',p.returncode,flush=True)
 if p.returncode:raise RuntimeError(p.stdout[-6000:])
snap=OUT/'snapshots';source=(ROOT/'experiments/retained-subtitles/vo_libmpv.c').read_text();(snap/'vo_libmpv.original.c').write_text(source)
source=source.replace('    web_subtitle_render(subtitle_osd,frame->current?frame->current->pts:0);\n    if(frame->current) web_experiment_frame(frame->current->pts,frame->pts,frame->redraw);','''    extern int web_decoder_enabled(void);
    if (web_decoder_enabled() == 2) {
        web_subtitle_render(subtitle_osd,frame->current?frame->current->pts:0);
        if(frame->current) web_experiment_frame(frame->current->pts,frame->pts,frame->redraw);
    }''')
marker='static int preinit(struct vo *vo)\n{';assert marker in source
source=source.replace(marker,marker+'''
    // Each Wasm instance owns a fixed mode. Software RGB requires mpv rotation;
    // Hybrid retained frames are rotated by the JavaScript presenter.
    extern int web_decoder_enabled(void);
    if (web_decoder_enabled() != 2) {
        struct vo_driver *driver = talloc_memdup(vo, vo->driver, sizeof(*driver));
        if (!driver) return -1;
        driver->caps &= ~VO_CAP_ROTATE90;
        vo->driver = driver;
    }
''');(snap/'vo_libmpv.c').write_text(source)
entry=next(x for x in json.loads((OBJ/'compile_commands.json').read_text()) if x['file'].endswith('/vo_libmpv.c'));args=shlex.split(entry['command']);filtered=[];skip=False
for a in args:
 if skip:skip=False;continue
 if a in ['-o','-MQ','-MF']:skip=True;continue
 if a in ['-MD','-c'] or a==entry['file']:continue
 filtered.append(a)
obj=snap/'vo_libmpv.o';run([*filtered,'-I'+str(PIN/'build/sources/mpv/video/out'),'-c',snap/'vo_libmpv.c','-o',obj],OBJ)
cmd=json.loads((OLD/'commands.json').read_text())[-2]['argv'];cmd=[str(obj) if a.endswith('/build/retained-subs/vo_libmpv.o') else a for a in cmd];dest=OUT/'variants/unified';dest.mkdir();cmd[-1]=str(dest/'player.mjs');run(cmd)
rows=[]
for p in (OUT/'variants').iterdir():
 data=(p/'player.wasm').read_bytes();(p/'player.wasm.gz').write_bytes(gzip.compress(data,compresslevel=6,mtime=0));rows.append({'variant':p.name,'bytes':len(data),'gzipBytes':(p/'player.wasm.gz').stat().st_size,'sha256':hashlib.sha256(data).hexdigest()})
(OUT/'sizes.json').write_text(json.dumps(rows,indent=2));print(json.dumps(rows,indent=2))
