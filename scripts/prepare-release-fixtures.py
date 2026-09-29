#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Prepare release-suite synthetic media on a fresh CI checkout, recording recipes."""
import hashlib
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
commands = []


def run(args):
    subprocess.run(list(map(str, args)), cwd=ROOT, check=True)


def ff(target, *args):
    path = ROOT / target
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        raise ValueError('Use fresh fixture outputs: ' + target)
    command = ['ffmpeg', '-nostdin', '-v', 'error', '-n', *args, str(path)]
    run(command)
    commands.append({'command': command, 'file': target,
                     'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})


def main():
    (ROOT / 'results/optimization-integration/stage3').mkdir(parents=True, exist_ok=True)
    run(['python3', 'experiments/optimization-integration/fixtures.py'])
    base = 'build/optimization-fixtures/'
    # Explicit recipes replace previously hand-prepared automatic-policy fixtures.
    for name, channels in [('automatic-lossless', 6), ('automatic-lossless-stereo', 2)]:
        ff(base + name + '.mkv', '-i', base + 'long-pcm.mkv', '-map', '0:v', '-map', '0:a',
           '-c:v', 'copy', '-c:a', 'pcm_s24le', '-ac', str(channels))
    ff(base + 'opus-multi-audio.mkv', '-i', base + 'multi-audio.mkv', '-map', '0',
       '-c:v', 'copy', '-c:a', 'pcm_s16le', '-ar', '48000')
    ff(base + 'video-tail.mkv', '-f', 'lavfi', '-i', 'testsrc2=s=160x90:r=30:d=30',
       '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=1',
       '-c:v', 'libx264', '-preset', 'veryfast', '-g', '30', '-bf', '2', '-threads', '2', '-c:a', 'pcm_s24le')
    for kind in ['audio-tail', 'video-tail']:
        ff(base + kind + '-start2.mkv', '-i', base + kind + '.mkv', '-map', '0', '-c', 'copy', '-output_ts_offset', '2')
    ff('build/fixtures/tracks.mkv', '-i', base + 'gain.mp4', '-f', 'lavfi', '-i', 'sine=frequency=880:sample_rate=48000:duration=12',
       '-i', 'fixtures/m0.ass', '-i', 'fixtures/qualification.ass', '-t', '12',
       '-map', '0:v', '-map', '0:a', '-map', '1:a', '-map', '2:s', '-map', '3:s',
       '-c:v', 'copy', '-c:a', 'aac', '-ac', '2', '-c:s', 'ass',
       '-metadata:s:a:0', 'language=eng', '-metadata:s:a:1', 'language=jpn',
       '-metadata:s:s:0', 'language=eng', '-metadata:s:s:1', 'language=ara', '-disposition:s:0', 'default',
       '-attach', 'fixtures/DejaVuSans.ttf', '-metadata:s:t', 'mimetype=application/x-truetype-font')
    ff('build/routing-completion/fixtures/vp9-opus.mkv', '-i', base + 'gain.mp4',
       '-c:v', 'libvpx-vp9', '-deadline', 'realtime', '-cpu-used', '6', '-threads', '2', '-c:a', 'libopus')
    # Streaming seeks require >500 seconds; repeat original synthetic picture/audio.
    ff('build/fixtures/playback-performance/bbb-stream.mp4', '-stream_loop', '-1', '-i', base + 'gain.mp4',
       '-t', '600', '-map', '0', '-c', 'copy', '-movflags', '+faststart')
    # This mode generates the fixtures consumed by beta-consumer, without unrelated
    # native color-reference or codec-matrix setup prerequisites.
    subprocess.run(['python3', 'scripts/compatibility-fixtures.py'], cwd=ROOT,
                   env={**os.environ, 'DEMUXE_RELEASE_FIXTURES': '1'}, check=True)
    (ROOT / 'build/release-fixture-recipes.json').write_text(json.dumps({
        'scope': 'Synthetic fixture preparation only; browser qualification is separate',
        'ffmpeg': subprocess.check_output(['ffmpeg', '-version'], text=True).splitlines()[0],
        'commands': commands}, indent=2) + '\n')


if __name__ == '__main__':
    main()
