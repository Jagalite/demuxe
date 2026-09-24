#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Retire cached objects when locked source or patch inputs change."""
import hashlib
import json
import pathlib
import time

root = pathlib.Path(__file__).resolve().parent.parent
build = root / 'build'
inputs = [root / 'sources.lock.json', *sorted((root / 'patches').rglob('*.patch'))]
digest = hashlib.sha256()
for path in inputs:
    digest.update(str(path.relative_to(root)).encode())
    digest.update(hashlib.sha256(path.read_bytes()).digest())
current = digest.hexdigest()
marker = build / 'source-build-inputs.json'
previous = json.loads(marker.read_text()).get('sha256') if marker.exists() else None
if previous == current:
    print('Source build inputs unchanged:', current)
    raise SystemExit(0)

backup = build / 'source-build-backups' / ((previous or 'legacy')[:12] + '-' + str(time.time_ns()))
names = ['obj-zlib-static', 'obj-freetype', 'obj-fribidi', 'obj-harfbuzz',
         'obj-libxml2', 'obj-ffmpeg', 'obj-software-full-ffmpeg', 'obj-mpv', 'obj-dav1d',
         'obj-libass', 'obj-libplacebo', 'obj-zimg-cmake', 'zimg-cmake',
         'prefix', 'prefix-playback', 'prefix-software-full', 'software-vo',
         'software-yuv', 'retained-subs', 'subtitle-service']
for name in names:
    path = build / name
    if path.exists() or path.is_symlink():
        destination = backup / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        path.rename(destination)
remux = build / 'native-remux/ffmpeg'
if remux.exists():
    destination = backup / 'native-remux/ffmpeg'
    destination.parent.mkdir(parents=True, exist_ok=True)
    remux.rename(destination)
marker.write_text(json.dumps({'sha256': current, 'sourceLockSHA256': hashlib.sha256(inputs[0].read_bytes()).hexdigest(), 'retiredTo': str(backup.relative_to(root)) if backup.exists() else None}, indent=2) + '\n')
print('Prepared source build:', current, 'retired caches:', backup if backup.exists() else 'none')
