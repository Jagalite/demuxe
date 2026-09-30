#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Link existing Software RGB entry points against verified private mpv libraries.

This is a renderer lifecycle prerequisite probe, not a decoder or playback build.
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
    out.mkdir(parents=True)
    files = ['native/player.c', 'native/events.c', 'native/audio_bridge.h', 'native/stream_bridge.h',
             'experiments/jspi-asyncify/stage2/native/stream-coop.c',
             'experiments/jspi-asyncify/runtime/stack.s',
             'experiments/jspi-asyncify/runtime/asyncify-stacks.c',
             'experiments/jspi-asyncify/mpv/native/context.c',
             'experiments/jspi-asyncify/mpv/native/finite-source.c',
             'experiments/jspi-asyncify/mpv/runtime/imports.js']
    inputs = out / 'inputs'
    for rel in files:
        dest = inputs / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / rel, dest)
    source_hashes = {rel: digest(inputs / rel) for rel in files}
    stream = inputs / files[4]
    stream.write_text(stream.read_text().replace('import_name(#name)', 'import_name("demuxe_source_" #name)'))
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
               '--js-library', inputs / files[-1], '-g2', '-sMODULARIZE=1', '-sEXPORT_ES6=1', '-sENVIRONMENT=worker',
               '-sALLOW_MEMORY_GROWTH=1', '-sINITIAL_MEMORY=67108864', '-sMAXIMUM_MEMORY=134217728',
               '-sSTACK_SIZE=2097152', '-sSTACK_OVERFLOW_CHECK=0', '-sASSERTIONS=1', '-sWASM_BIGINT=1',
               '-sFORCE_FILESYSTEM=1', '-sEXIT_RUNTIME=0', '-sEXPORTED_FUNCTIONS=' + json.dumps(['_' + n for n in exports]),
               '-sEXPORTED_RUNTIME_METHODS=["FS","HEAPU8","HEAP32","UTF8ToString"]', '-Wl,--export-memory',
               '-Wl,-Map,' + str(out / 'probe.map'), '-o', out / 'probe.mjs']
    commands = [command, [sdk / 'upstream/bin/wasm-opt', out / 'probe.wasm', '--asyncify',
                '--pass-arg=asyncify-imports@demuxe_coop.demuxe_coop_wait,demuxe_coop.demuxe_coop_join,demuxe_coop.demuxe_coop_yield,demuxe_source.demuxe_source_read',
                '--enable-bulk-memory', '--enable-nontrapping-float-to-int', '--enable-sign-ext', '--enable-simd',
                '-g', '-o', out / 'probe.asyncify.wasm']]
    record = {'scope': 'Private RGB renderer create/render/destroy; no media or decoder qualification',
              'dependencyPath': str(deps), 'dependencyRecordSHA256': digest(deps / 'build-result.json'),
              'dependencyProfile': build['profile'], 'sourceSHA256': source_hashes,
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
        record['status'] = 'built_prerequisite_only'
        record['artifacts'] = {p.name: digest(p) for p in out.glob('probe.*')}
    except Exception as error:
        record.update(status='failed', error=str(error))
        raise
    finally:
        (out / 'build.json').write_text(json.dumps(record, indent=2) + '\n')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    for name in ['deps', 'sdk', 'out']:
        parser.add_argument('--' + name, type=Path, required=True)
    main(parser.parse_args())
