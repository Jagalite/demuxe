#!/usr/bin/env python3
"""Create the two extra comparison files without changing repository fixtures."""
import hashlib
import json
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[3]
base = root / 'build/hybrid-cpu-attribution/assets-paired-simple-draw-20260923/fixtures'
jobs = [
    (
        Path('/tmp/demuxe-mediabunny-fixtures/aac-only.adts'),
        ['-i', str(root / 'fixtures/example.mp4'), '-vn', '-c:a', 'copy', '-f', 'adts'],
    ),
    (
        Path('/tmp/demuxe-fast-inspector-fixtures/h264-ac3-ass.mkv'),
        ['-i', str(base / 'h264-ac3/index.mkv'), '-i', str(base / 'captions.ass'),
         '-map', '0:v:0', '-map', '0:a:0', '-map', '1:0', '-c', 'copy',
         '-metadata:s:s:0', 'language=eng'],
    ),
]
manifest = []
for target, args in jobs:
    target.parent.mkdir(parents=True, exist_ok=True)
    argv = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *args, str(target)]
    subprocess.run(argv, check=True)
    manifest.append({'path': str(target), 'bytes': target.stat().st_size,
                     'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'argv': argv})
print(json.dumps(manifest, indent=2))
