#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Build an audio-timestamped mpv archive and separate selective engine.

The locked mpv source and ordinary Hybrid archive remain untouched. Source
replacement is anchored to the same functions used in the qualified PoC.
"""
import json
import hashlib
import os
from pathlib import Path
import shlex
import shutil
import subprocess

root = Path(__file__).resolve().parent.parent
out = root / 'build/selective-audio'
out.mkdir(parents=True, exist_ok=True)
sdk = Path(os.environ.get('DEMUXE_SDK', root / 'build/emsdk-4.0.14'))
env = os.environ.copy()
env.setdefault('EM_CONFIG', str(root / 'build/beta.emscripten' if (root / 'build/beta.emscripten').exists() else sdk / '.emscripten'))
env.setdefault('EM_CACHE', str(root / 'build/cache'))

def replace_once(value, old, new):
    if value.count(old) != 1:
        raise RuntimeError(f'Selective audio patch anchor changed: {old[:80]}')
    return value.replace(old, new)

ao = (root / 'native/ao_browser.c').read_text()
ao = replace_once(ao, 'struct web_audio_ring web_audio;', '''struct web_audio_ring web_audio;
static double sync_ring[8192][2], sync_stage[8192][2];
uintptr_t web_sync_ptr(void);
EMSCRIPTEN_KEEPALIVE uintptr_t web_sync_ptr(void) { return (uintptr_t)sync_ring; }
void web_sync_stage(int offset, int count, double pts, double effective_rate, double speed);
void web_sync_stage(int offset, int count, double pts, double effective_rate, double speed) {
 for(int i=0;i<count && offset+i<8192;i++) {
  sync_stage[offset+i][0]=pts+i/effective_rate;
  sync_stage[offset+i][1]=speed;
 }
}''')
ao = replace_once(ao, 'unsigned at = ((w+n) % WEB_AUDIO_CAPACITY)*web_audio_channels;', '''unsigned index=(w+n)%WEB_AUDIO_CAPACITY;
        sync_ring[index][0]=sync_stage[n][0];
        sync_ring[index][1]=sync_stage[n][1];
        unsigned at = index*web_audio_channels;''')
buffer = (root / 'build/sources/mpv/audio/out/buffer.c').read_text()
buffer = replace_once(buffer, 'static int read_buffer(', 'extern void web_sync_stage(int offset, int count, double pts, double effective_rate, double speed);\nstatic int read_buffer(')
buffer = replace_once(buffer, '        mp_aframe_skip_samples(p->pending, copy);', '        web_sync_stage(pos, copy, mp_aframe_get_pts(p->pending), mp_aframe_get_effective_rate(p->pending), mp_aframe_get_speed(p->pending));\n        mp_aframe_skip_samples(p->pending, copy);')

commands = json.loads((root / 'build/obj-mpv/compile_commands.json').read_text())
objects = []
for name, source, suffix in [('ao_browser', ao, 'audio/out/ao_browser.c'), ('buffer', buffer, 'audio/out/buffer.c')]:
    entry = next(e for e in commands if e['file'].endswith(suffix))
    args = shlex.split(entry['command'])
    src = out / (name + '.c')
    src.write_text(source)
    obj = out / Path(entry['output']).name
    subprocess.run([*args[:args.index('-MD')], '-I' + str(root / 'native'), '-I' + str(root / 'build/sources/mpv/audio/out'), '-c', str(src), '-o', str(obj)], cwd=entry['directory'], env=env, check=True)
    objects.append(obj)

archive = out / 'libmpv-selective.a'
shutil.copy2(root / 'build/prefix/lib/libmpv.a', archive)
subprocess.run([str(sdk / 'upstream/bin/llvm-ar'), 'r', str(archive), *map(str, objects)], check=True)
env['DEMUXE_MPV_ARCHIVE'] = str(archive)
env['DEMUXE_HYBRID_OUTPUT'] = str(root / 'web/engine-selective')
env['DEMUXE_HYBRID_LINK_MAP'] = str(root / 'build/link-maps/selective.map')
env['DEMUXE_HYBRID_EXPORTS'] = '["_web_create","_web_command_args","_web_event","_web_render","_web_presented","_web_destroy","_web_audio_ptr","_web_sync_ptr","_malloc","_free"]'
subprocess.run(['bash', 'scripts/link-hybrid.sh'], cwd=root, env=env, check=True)
def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
files = [root / 'native/ao_browser.c', root / 'build/sources/mpv/audio/out/buffer.c',
         root / 'build/prefix/lib/libmpv.a', root / 'scripts/build-selective-audio.py',
         root / 'scripts/link-hybrid.sh', archive, root / 'build/link-maps/selective.map',
         root / 'web/engine-selective/player.mjs', root / 'web/engine-selective/player.wasm']
(out / 'manifest.json').write_text(json.dumps({'schema':1,'engine':'selective-audio',
    'sourcesAndArtifacts':{str(path.relative_to(root)):digest(path) for path in files}},indent=2)+'\n')
