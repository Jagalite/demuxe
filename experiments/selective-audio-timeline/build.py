# SPDX-License-Identifier: Apache-2.0
import pathlib,json,shlex,subprocess,os,shutil
r=pathlib.Path.cwd();out=r/'build/selective-audio-timeline';out.mkdir(exist_ok=True)
env=os.environ.copy();env['EM_CONFIG']=str(r/'build/beta.emscripten');env['EM_CACHE']=str(r/'build/cache')
ao=(r/'native/ao_browser.c').read_text()
ao=ao.replace('struct web_audio_ring web_audio;', '''struct web_audio_ring web_audio;
static double sync_ring[8192][2], sync_stage[8192][2];
EMSCRIPTEN_KEEPALIVE uintptr_t web_sync_ptr(void) { return (uintptr_t)sync_ring; }
void web_sync_stage(int offset, int count, double pts, double effective_rate, double speed);
void web_sync_stage(int offset, int count, double pts, double effective_rate, double speed) {
 for(int i=0;i<count && offset+i<8192;i++) { sync_stage[offset+i][0]=pts+i/effective_rate; sync_stage[offset+i][1]=speed; }
}''')
ao=ao.replace('unsigned at = ((w+n) % WEB_AUDIO_CAPACITY)*web_audio_channels;', '''unsigned index=(w+n)%WEB_AUDIO_CAPACITY;
        sync_ring[index][0]=sync_stage[n][0];sync_ring[index][1]=sync_stage[n][1];
        unsigned at = index*web_audio_channels;''')
buf=(r/'build/sources/mpv/audio/out/buffer.c').read_text()
buf=buf.replace('static int read_buffer(', 'extern void web_sync_stage(int offset, int count, double pts, double effective_rate, double speed);\nstatic int read_buffer(',1)
buf=buf.replace('        mp_aframe_skip_samples(p->pending, copy);','        web_sync_stage(pos, copy, mp_aframe_get_pts(p->pending), mp_aframe_get_effective_rate(p->pending), mp_aframe_get_speed(p->pending));\n        mp_aframe_skip_samples(p->pending, copy);',1)
commands=json.loads((r/'build/obj-mpv/compile_commands.json').read_text());objs=[]
for name,source,suffix in [('ao_browser',ao,'audio/out/ao_browser.c'),('buffer',buf,'audio/out/buffer.c')]:
 entry=next(e for e in commands if e['file'].endswith(suffix));args=shlex.split(entry['command']);src=out/(name+'.c');src.write_text(source);obj=out/pathlib.Path(entry['output']).name
 subprocess.run([*args[:args.index('-MD')],'-I'+str(r/'native'),'-I'+str(r/'build/sources/mpv/audio/out'),'-c',str(src),'-o',str(obj)],cwd=entry['directory'],env=env,check=True);objs.append(obj)
archive=out/'libmpv-sync.a';shutil.copy2(r/'build/prefix/lib/libmpv.a',archive)
ar=r/'build/emsdk-4.0.14/upstream/bin/llvm-ar';subprocess.run([str(ar),'r',str(archive),*map(str,objs)],check=True)
link=(r/'scripts/link-hybrid.sh').read_text().replace('ROOT=$(cd "$(dirname "$0")/.." && pwd)','ROOT="$PWD"').replace('OUTPUT="$ROOT/web/engine-hybrid"','OUTPUT="$ROOT/build/selective-audio-timeline/engine"')
link=link.replace('source scripts/decoder-simd.sh','for i in "${!LIBS[@]}"; do if [ "${LIBS[$i]}" = -lmpv ]; then LIBS[$i]="$ROOT/build/selective-audio-timeline/libmpv-sync.a"; fi; done\nsource scripts/decoder-simd.sh')
link=link.replace('"_web_audio_ptr",','"_web_audio_ptr","_web_sync_ptr",').replace('$ROOT/build/link-maps/hybrid.map','$ROOT/build/selective-audio-timeline/hybrid.map')
f=out/'link.sh';f.write_text(link);subprocess.run(['bash',str(f)],env=env,check=True)
