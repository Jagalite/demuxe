#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Link existing Software RGB entry points against verified private mpv libraries.

Experimental playback build; no public format qualification follows from linking.
All outputs and Emscripten caches must be in a fresh external directory.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shlex
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[4]
EXP = ROOT / 'experiments/jspi-asyncify'

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main(a):
    deps, sdk, out = a.deps.resolve(), a.sdk.resolve(), a.out.resolve()
    if out.exists() or out == ROOT or ROOT in out.parents:
        raise ValueError('A fresh external output directory is required')
    spec = importlib.util.spec_from_file_location('private_provenance', EXP / 'mpv/scripts/provenance.py')
    provenance = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(provenance)
    build = provenance.verify_dependencies(deps, sdk)
    if build['profile'] not in ('playback','playback-full'):
        raise ValueError('Video-enabled private playback dependencies required')
    if a.hybrid and build['profile'] != 'playback-full':
        raise ValueError('Retained Hybrid requires the full codec dependency profile')
    out.mkdir(parents=True)
    files = ['native/player.c', 'native/events.c', 'native/audio_bridge.h', 'native/stream_bridge.h',
             'experiments/jspi-asyncify/stage2/native/stream-coop.c',
             'experiments/jspi-asyncify/runtime/stack.s',
             'experiments/jspi-asyncify/runtime/asyncify-stacks.c',
             'experiments/jspi-asyncify/mpv/native/context.c',
             'experiments/jspi-asyncify/mpv/native/finite-source.c',
             'experiments/jspi-asyncify/mpv/runtime/imports.js',
             'native/ao_browser.c',
             'experiments/jspi-asyncify/scripts/audit-wasm.mjs']
    if a.hybrid:
        files[0]='experiments/retained-subtitles/player.c'
        files[-1:-1]=['native/vd_browser.c','native/browser_decoder_bridge.h',
                     'experiments/retained-subtitles/vo_libmpv.c','native/subtitles/bitmap.c']
    inputs = out / 'inputs'
    for rel in files:
        dest = inputs / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / rel, dest)
    player = inputs / files[0]
    player.write_text(player.read_text().replace('{"vd-lavc-threads","2"}', '{"vd-lavc-threads","1"}'))
    player.write_text(player.read_text().replace('#include "audio_bridge.h"', '#include "audio_bridge.h"\nEMSCRIPTEN_KEEPALIVE int web_audio_capacity(void) { return WEB_AUDIO_CAPACITY; }'))
    if a.audio_capacity == 32768:
        audio_header = inputs / 'native/audio_bridge.h'
        original = audio_header.read_text()
        adapted = original.replace('#define WEB_AUDIO_CAPACITY 8192', '#define WEB_AUDIO_CAPACITY 32768')
        if original == adapted:
            raise ValueError('Audio capacity header adaptation failed')
        audio_header.write_text(adapted)
        player.write_text(player.read_text().replace('{"audio-buffer","0.1"}', '{"audio-buffer","0.5"}'))
    source_hashes = {rel: digest(ROOT / rel) for rel in files}
    stream = inputs / files[4]
    stream.write_text(stream.read_text().replace('import_name(#name)', 'import_name("demuxe_source_" #name)'))
    if a.hybrid:
        text=player.read_text()
        anchor='EMSCRIPTEN_KEEPALIVE void web_experiment_skip_render(int value) { experiment_skip_render=value; }'
        if anchor not in text:raise ValueError('Selected-frame oracle adaptation failed')
        text=text.replace(anchor,anchor+'''
struct private_selected_frame {
    double pts,delay;
    int serial,redraw;
    uintptr_t subtitle;
    int composites;
};
EMSCRIPTEN_KEEPALIVE uintptr_t web_selected_snapshot(void) {
    extern uintptr_t web_subtitle_ptr(void);
    extern int web_subtitle_composite_count(void);
    static struct private_selected_frame snapshot;
    snapshot.pts=selected_pts;
    snapshot.delay=selected_target>0?(selected_target-mpv_get_time_us(player))/1000:0;
    snapshot.serial=selected_serial;snapshot.redraw=selected_redraw;
    snapshot.subtitle=web_subtitle_ptr();snapshot.composites=web_subtitle_composite_count();
    return (uintptr_t)&snapshot;
}
''')
        player.write_text(text)
        decoder=inputs/'native/vd_browser.c'
        original=decoder.read_text()
        start=original.index('static int request(int operation) {')
        end=original.index('struct browser_priv {',start)
        replacement='''__attribute__((import_module("demuxe_decoder"), import_name("demuxe_decoder_request")))
int private_decoder_request(uintptr_t pointer, int operation);
static int request(int operation) {
    web_decoder.operation=operation;
    return private_decoder_request((uintptr_t)&web_decoder,operation);
}
'''
        adapted=(original[:start]+replacement+original[end:]).replace('#include <emscripten/threading.h>','').replace('#include <pthread.h>','#include "osdep/threads.h"')
        adapted=adapted.replace('pthread_mutex_t owner_lock=PTHREAD_MUTEX_INITIALIZER','mp_static_mutex owner_lock=MP_STATIC_MUTEX_INITIALIZER').replace('pthread_mutex_lock','mp_mutex_lock').replace('pthread_mutex_unlock','mp_mutex_unlock').replace('software->thread_count=2','software->thread_count=1')
        if any(word in adapted for word in ['pthread','futex']):raise ValueError('Threaded decoder adaptation incomplete')
        decoder.write_text(adapted)
        imports=inputs/'experiments/jspi-asyncify/mpv/runtime/imports.js'
        imports.write_text(imports.read_text()+"\naddToLibrary({demuxe_decoder_request:function(){throw new Error('Unbound decoder import');}});\n")
    config = out / 'em.config'
    config.write_text(f'LLVM_ROOT={str(sdk / "upstream/bin")!r}\nBINARYEN_ROOT={str(sdk / "upstream")!r}\nNODE_JS={shutil.which("node")!r}\nCACHE={str(out / "cache")!r}\n')
    env = {**os.environ, 'EM_CONFIG': str(config), 'EM_CACHE': str(out / 'cache'),
           'PKG_CONFIG_LIBDIR': str(deps / 'prefix/lib/pkgconfig'), 'PKG_CONFIG_PATH': '', 'EMCC_CFLAGS': ''}
    env.pop('EMMAKEN_CFLAGS', None)
    entries = json.loads((deps / 'objects/mpv/compile_commands.json').read_text())
    client = next(e for e in entries if e['file'].endswith('player/client.c'))
    flags = shlex.split(client['command'])[1:]
    flags = flags[:flags.index('-MD')]
    libs = shlex.split(subprocess.check_output(['pkg-config', '--cflags', '--libs', '--static', 'mpv'], env=env, text=True))
    if '-pthread' in flags + libs:
        raise ValueError('Threaded dependency contamination')
    exports = ['demuxe_context_errno', 'demuxe_context_enter', 'demuxe_context_stack_base', 'demuxe_context_stack_end',
               'demuxe_coop_invoke', 'demuxe_coop_get_sp', 'demuxe_coop_set_sp', 'demuxe_coop_stack_base',
               'demuxe_coop_stack_top', 'demuxe_coop_stack_count', 'demuxe_asyncify_count', 'demuxe_asyncify_data',
               'demuxe_asyncify_base', 'demuxe_asyncify_end', 'demuxe_source_live', 'malloc', 'free']
    sources = [inputs / p for p in files if p.endswith(('.c', '.s'))]
    command = [sdk / 'upstream/emscripten/emcc', *flags, '-I' + str(inputs / 'native'), *sources, *libs,
               '--js-library', inputs / 'experiments/jspi-asyncify/mpv/runtime/imports.js', '-g2', '-sMODULARIZE=1', '-sEXPORT_ES6=1', '-sENVIRONMENT=worker',
               '-sALLOW_MEMORY_GROWTH=1', '-sINITIAL_MEMORY=67108864', '-sMAXIMUM_MEMORY=134217728',
               '-sSTACK_SIZE=2097152', '-sSTACK_OVERFLOW_CHECK=0', '-sASSERTIONS=1', '-sWASM_BIGINT=1',
               '-sFORCE_FILESYSTEM=1', '-sEXIT_RUNTIME=0', '-sEXPORTED_FUNCTIONS=' + json.dumps(['_' + n for n in exports]),
               '-sEXPORTED_RUNTIME_METHODS=["FS","HEAPU8","HEAP32","UTF8ToString"]', '-Wl,--export-memory',
               '-Wl,-Map,' + str(out / 'playback.map'), '-o', out / 'playback.mjs']
    if a.hybrid:
        command.insert(1,'-I'+str(deps/'sources/mpv/video/out'))
    if (deps/'prefix/lib/libzimg.a').is_file():command.insert(1,'-fexceptions')
    suspending='demuxe_coop.demuxe_coop_wait,demuxe_coop.demuxe_coop_join,demuxe_coop.demuxe_coop_yield,demuxe_source.demuxe_source_read'
    if a.hybrid:suspending+=',demuxe_decoder.demuxe_decoder_request'
    # Optimize before instrumentation: the upstream VP9 block decoder otherwise
    # exceeds V8's local-variable limit after Asyncify expands its temporaries.
    commands = [command, [sdk / 'upstream/bin/wasm-opt', out / 'playback.wasm', '-O2', '--asyncify',
                '--pass-arg=asyncify-imports@'+suspending,
                '--enable-bulk-memory', '--enable-nontrapping-float-to-int', '--enable-sign-ext', '--enable-simd',
                '-g', '-o', out / 'playback.asyncify.wasm'],
                [shutil.which('node'), inputs / files[-1], out / 'playback.wasm'],
                [shutil.which('node'), inputs / files[-1], out / 'playback.asyncify.wasm', '--asyncify']]
    record = {'scope': 'Experimental private finite-file Software playback; runtime correctness must be tested separately',
              'dependencyPath': str(deps), 'dependencyRecordSHA256': digest(deps / 'build-result.json'),
              'dependencyProfile': build['profile'], 'sourceSHA256': source_hashes,
              'audioCapacity': a.audio_capacity,
              'retainedDecoder': a.hybrid,
              'adaptedSourceSHA256': {p: digest(inputs / p) for p in files},
              'builderSHA256': digest(Path(__file__)), 'commands': []}
    try:
        for i, argv in enumerate(commands, 1):
            argv = list(map(str, argv))
            with (out / f'{i}.log').open('w') as log:
                rc = subprocess.run(argv, cwd=client['directory'], env=env, stdout=log, stderr=subprocess.STDOUT).returncode
            record['commands'].append({'argv': argv, 'cwd': client['directory'], 'returncode': rc, 'log': f'{i}.log'})
            if rc:
                raise RuntimeError(f'Command {i} failed; see {out / f"{i}.log"}')
        provenance.verify_dependencies(deps, sdk)
        record['status'] = 'built_candidate_only'
        record['artifacts'] = {p.name: digest(p) for p in out.glob('playback.*')}
    except Exception as error:
        record.update(status='failed', error=str(error))
        raise
    finally:
        (out / 'build.json').write_text(json.dumps(record, indent=2) + '\n')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    for name in ['deps', 'sdk', 'out']:
        parser.add_argument('--' + name, type=Path, required=True)
    parser.add_argument('--audio-capacity', type=int, choices=[8192, 32768], default=32768)
    parser.add_argument('--hybrid', action='store_true')
    main(parser.parse_args())
