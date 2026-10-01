#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Build all private engines from HEAD and bind their materials to the beta record.

Dependencies, objects and caches use a fresh external directory. The source
companion retains the recipes, locked upstream archives, transformed inputs,
configuration files and link commands needed to reproduce these engines.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
EXP = ROOT / 'experiments/jspi-asyncify'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main(args):
    materials = ROOT / 'build/private-runtime-materials'
    if materials.exists():
        raise ValueError('Private release materials already exist; use a fresh build')
    start = json.loads((ROOT / 'build/beta-build-start.json').read_text())
    revision = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    base = Path(tempfile.mkdtemp(prefix='demuxe-private-release-', dir=ROOT.parent))
    materials.mkdir()
    (materials / 'location.json').write_text(json.dumps({'buildRoot': str(base), 'revision': revision})+'\n')
    record = {'configurations': {}, 'artifacts': {}, 'privateRemux': {}, 'privateMpv': {}}
    sdk = args.sdk.resolve()

    def run(*argv):
        subprocess.run([str(v) for v in argv], cwd=ROOT, check=True)

    def retain(source, name):
        target = materials / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
        rel = str(target.relative_to(ROOT))
        record['configurations'][rel] = sha(target)
        return rel

    def bind(folder, group, configs, prefixes):
        inputs = [n for n in start['inputs'] if any(n.startswith(p) for p in prefixes)]
        if not inputs or not configs:
            raise ValueError('Empty private build binding')
        record[group][folder] = {'inputs': inputs, 'configurations': configs}
        for path in (ROOT / folder).iterdir():
            record['artifacts'][str(path.relative_to(ROOT))] = {'bytes': path.stat().st_size, 'sha256': sha(path)}

    for profile, attempt, target in [('remux', '02', 'remux'), ('transcode', '05', 'adaptation')]:
        for backend in ['jspi', 'asyncify']:
            name = f'{profile}-{backend}-{attempt}'
            out = base / name
            run(sys.executable, EXP/'ffmpeg/scripts/prepare-ffmpeg.py', '--repo', ROOT,
                '--out', out, '--profile', profile, '--suspension', backend, '--revision', revision)
            run(sys.executable, out/'build-ffmpeg.py', '--sdk', sdk, '--jobs', args.jobs, '--flac-level', 0)
            config = (out/'objects/config.h').read_text()
            for flag in ['GPL', 'VERSION3', 'NONFREE']:
                if f'#define CONFIG_{flag} 0' not in config:
                    raise ValueError('Unexpected private FFmpeg license configuration')
    run(sys.executable, ROOT/'scripts/install-private-remux.py', '--builds', base, '--runtime-root', ROOT)
    for profile, attempt, target in [('remux', '02', 'remux'), ('transcode', '05', 'adaptation')]:
        for backend in ['jspi', 'asyncify']:
            name = f'{profile}-{backend}-{attempt}'
            out = base/name
            paths = ['inputs.json', 'build-result.json', 'commands.json', 'emscripten.config', 'ffmpeg-read.patch',
                     'objects/config.h', 'objects/config_components.h', 'objects/ffbuild/config.mak', 'engine/remux.map',
                     'native/remux/remux.c', 'native/adaptation/flac.h']
            configs = [retain(out/p, name+'/'+p) for p in paths]
            bind(f'web/engine-{target}-{backend}', 'privateRemux', configs,
                 ['native/remux/', 'native/adaptation/', 'patches/ffmpeg', 'sources.lock.json',
                  'scripts/build-private-release.py', 'scripts/install-private-remux.py',
                  'experiments/jspi-asyncify/ffmpeg/scripts/', 'experiments/jspi-asyncify/scripts/audit-wasm.mjs'])

    for profile in ['subtitles', 'audio', 'playback-full']:
        deps = base/f'mpv-deps-{profile}'
        service = base/f'mpv-review-{profile}-01'
        run(sys.executable, EXP/'mpv/scripts/build-dependencies.py', '--out', deps, '--sdk', sdk,
            '--downloads', ROOT/'build/downloads', '--tools', args.tools.resolve(), '--profile', profile, '--jobs', args.jobs)
        config = (deps/'objects/ffmpeg/config.h').read_text()
        for flag in ['GPL', 'VERSION3', 'NONFREE']:
            if f'#define CONFIG_{flag} 0' not in config:
                raise ValueError('Unexpected private mpv FFmpeg license configuration')
        options = json.loads((deps/'objects/mpv/meson-info/intro-buildoptions.json').read_text())
        if next(v['value'] for v in options if v['name'] == 'gpl'):
            raise ValueError('Private mpv GPL configuration enabled')
        if profile == 'playback-full':
            run(sys.executable, EXP/'mpv/scripts/link-playback.py', '--deps', deps, '--out', service, '--sdk', sdk, '--hybrid')
            run(sys.executable, ROOT/'scripts/install-private-playback.py', '--build', service, '--runtime-root', ROOT)
        else:
            run(sys.executable, EXP/'mpv/scripts/link-subtitles.py', '--deps', deps, '--out', service, '--sdk', sdk, '--profile', profile)
    run(sys.executable, ROOT/'scripts/install-private-mpv.py', '--builds', base, '--runtime-root', ROOT)
    for profile in ['subtitles', 'audio', 'playback-full']:
        deps = base/f'mpv-deps-{profile}'
        service = base/f'mpv-review-{profile}-01'
        configs = []
        for directory in [deps, service]:
            selected = set(directory.glob('*.json')) | set(directory.glob('*.ini')) | set(directory.glob('*.config')) | set(directory.glob('*.log'))
            for folder in ['inputs', 'logs']:
                selected.update(p for p in (directory/folder).rglob('*') if p.is_file())
            if directory == deps:
                selected.update(directory/p for p in ['objects/ffmpeg/config.h', 'objects/ffmpeg/config_components.h',
                    'objects/ffmpeg/ffbuild/config.mak', 'objects/mpv/config.h', 'objects/mpv/compile_commands.json',
                    'objects/mpv/meson-info/intro-buildoptions.json'])
            else:
                selected.add(directory/('playback.map' if profile == 'playback-full' else 'service.map'))
            configs.extend(retain(p, str(p.relative_to(base))) for p in sorted(selected))
        for backend in ['jspi', 'asyncify']:
            bind(f'web/engine-mpv-{"playback" if profile == "playback-full" else profile}-{backend}', 'privateMpv', configs,
                 ['native/', 'patches/', 'sources.lock.json', 'experiments/jspi-asyncify/',
                  'scripts/build-private-release.py', 'scripts/install-private-mpv.py', 'scripts/install-private-playback.py'])
    # Revalidate source inputs after all compiles, before making a usable record.
    for name, wanted in start['inputs'].items():
        if sha(ROOT/name) != wanted:
            raise ValueError('Private build input changed: '+name)
    (materials/'record.json').write_text(json.dumps(record, indent=2)+'\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--sdk', type=Path, required=True)
    parser.add_argument('--tools', type=Path, required=True)
    parser.add_argument('--jobs', type=int, default=4)
    main(parser.parse_args())
