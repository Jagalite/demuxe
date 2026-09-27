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
