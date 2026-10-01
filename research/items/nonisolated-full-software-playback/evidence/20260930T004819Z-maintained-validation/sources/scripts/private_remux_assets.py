# SPDX-License-Identifier: Apache-2.0
"""Collect the complete, hash-verified private runtime set for local beta archives."""
import hashlib
import json
from pathlib import Path


def private_remux_assets(root):
    root = Path(root)
    files = {}
    for backend in ('jspi', 'asyncify'):
        for name, profile in (('remux', 'remux'), ('adaptation', 'transcode')):
            folder = f'web/engine-{name}-{backend}'
            manifest_name = folder + '/manifest.json'
            manifest_bytes = (root / manifest_name).read_bytes()
            manifest = json.loads(manifest_bytes)
            if (manifest.get('schema') != 1 or manifest.get('backend') != backend
                    or manifest.get('profile') != profile):
                raise ValueError('Private runtime identity mismatch: ' + folder)
            for filename in ('remux.mjs', 'remux.wasm'):
                data = (root / folder / filename).read_bytes()
                if hashlib.sha256(data).hexdigest() != manifest['files'].get(filename):
                    raise ValueError('Private runtime artifact mismatch: ' + folder + '/' + filename)
                files[folder + '/' + filename] = data
            files[manifest_name] = manifest_bytes
    for filename in ('private-remux.js', 'private-ffmpeg/bridge.js',
                     'private-ffmpeg/range-source.js', 'private-ffmpeg/single-owner.js',
                     'private-ffmpeg/LICENSE.txt'):
        files['web/' + filename] = (root / 'web' / filename).read_bytes()
    return files


def verify_private_release(files, build):
    """Private engines must belong to the clean build/source record, not just an install."""
    if not build.get('clean'):
        raise ValueError('Private runtime release requires a clean engine build')
    for backend in ('jspi', 'asyncify'):
        for profile in ('remux', 'adaptation'):
            folder = f'web/engine-{profile}-{backend}'
            evidence = build.get('privateRemux', {}).get(folder, {})
            for group in ('inputs', 'configurations'):
                names = evidence.get(group, [])
                if not names or not all(isinstance(n, str) and n in build.get(group, {}) for n in names):
                    raise ValueError('Private runtime release lacks recorded ' + group + ': ' + folder)
            for ext in ('mjs', 'wasm'):
                name = folder + '/remux.' + ext
                actual = hashlib.sha256(files[name]).hexdigest()
                if build.get('artifacts', {}).get(name, {}).get('sha256') != actual:
                    raise ValueError('Private runtime release lacks matching build artifact: ' + name)


def private_mpv_assets(root):
    """Service and playback profiles are optional complete sets."""
    root = Path(root)
    if not any((root / 'web').glob('engine-mpv-*-*')):
        return {}
    profiles = []
    if any((root / 'web').glob('engine-mpv-subtitles-*')) or any((root / 'web').glob('engine-mpv-audio-*')):
        profiles.extend(('subtitles', 'audio'))
    if any((root / 'web').glob('engine-mpv-playback-*')):
        profiles.append('playback')
    if not profiles:
        raise ValueError('Unknown private mpv asset profile')
    files = {}
    playback_capacities = set()
    for backend in ('jspi', 'asyncify'):
        for profile in profiles:
            folder = f'web/engine-mpv-{profile}-{backend}'
            name = folder + '/manifest.json'
            data = (root / name).read_bytes()
            manifest = json.loads(data)
            if manifest.get('schema') != 1 or manifest.get('backend') != backend or manifest.get('profile') != profile:
                raise ValueError('Private mpv identity mismatch: ' + folder)
            files[name] = data
            if profile == 'playback':
                capacity = manifest.get('audioCapacity')
                if capacity not in (8192, 32768):
                    raise ValueError('Private playback PCM capacity mismatch: ' + folder)
                playback_capacities.add(capacity)
            stem = 'player' if profile == 'playback' else 'service'
            for filename in (stem + '.mjs', stem + '.wasm'):
                name = folder + '/' + filename
                data = (root / name).read_bytes()
                if hashlib.sha256(data).hexdigest() != manifest['files'].get(filename):
                    raise ValueError('Private mpv artifact mismatch: ' + name)
                files[name] = data
    if len(playback_capacities) > 1:
        raise ValueError('Private playback runtime capacities differ')
    runtime_files = ['private-mpv.js', 'private-mpv/LICENSE.txt', 'private-mpv/engine.js',
                     'private-mpv/scheduler.js', 'private-mpv/continuations.js',
                     'private-mpv/range-source.js', 'private-mpv/audio-worklet.js']
    if 'audio' in profiles:
        runtime_files.append('private-mpv/audio-worker.js')
    if 'playback' in profiles:
        runtime_files.extend(('private-mpv/playback-worker.js', 'private-mpv/playback-host.js', 'private-mpv/playback-pcm.js'))
    for filename in runtime_files:
        files['web/' + filename] = (root / 'web' / filename).read_bytes()
    return files


def verify_private_mpv_release(files, build):
    if not any(name.startswith('web/engine-mpv-') for name in files):
        return
    if not build.get('clean'):
        raise ValueError('Private mpv release requires a clean engine build')
    for backend in ('jspi', 'asyncify'):
        for profile in ('subtitles', 'audio', 'playback'):
            folder = f'web/engine-mpv-{profile}-{backend}'
            if folder + '/manifest.json' not in files:
                continue
            record = build.get('privateMpv', {}).get(folder, {})
            for group in ('inputs', 'configurations'):
                names = record.get(group, [])
                if not names or not all(isinstance(n, str) and n in build.get(group, {}) for n in names):
                    raise ValueError('Private mpv release lacks recorded ' + group + ': ' + folder)
            for ext in ('mjs', 'wasm'):
                name = folder + ('/player.' if profile == 'playback' else '/service.') + ext
                if name not in files or build.get('artifacts', {}).get(name, {}).get('sha256') != hashlib.sha256(files[name]).hexdigest():
                    raise ValueError('Private mpv release lacks matching build artifact: ' + name)
