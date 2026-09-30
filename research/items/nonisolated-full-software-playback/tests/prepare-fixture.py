#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Generate a bounded moving MPEG-2 fixture and independent FFmpeg RGB oracle."""
import argparse, gzip, hashlib, json, subprocess
from pathlib import Path
p = argparse.ArgumentParser()
p.add_argument('output', type=Path)
p.add_argument('--audio', action='store_true')
p.add_argument('--width', type=int, default=320)
p.add_argument('--height', type=int, default=180)
p.add_argument('--fps', type=int, default=24)
p.add_argument('--duration', type=int, default=4)
p.add_argument('--gop', type=int, default=12)
p.add_argument('--compressed-reference', action='store_true')
p.add_argument('--matrix', choices=['bt709'])
a = p.parse_args()
if not 1 <= a.width <= 1920 or not 1 <= a.height <= 1080 or not 1 <= a.fps <= 60 or not 3 <= a.duration <= 60 or not 1 <= a.gop <= 600:
    p.error('Fixture exceeds the declared bounds')
a.output.mkdir(exist_ok=False, parents=True)
commands = [
    ['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', f'testsrc2=size={a.width}x{a.height}:rate={a.fps}:duration={a.duration}',
     '-c:v', 'mpeg2video', '-g', str(a.gop), '-sc_threshold', '1000000000', '-bf', '2', '-q:v', '2', '-an', '-f', 'mpegts', str(a.output/'mpeg2.ts')],
    ['ffmpeg', '-v', 'error', '-i', str(a.output/'mpeg2.ts'), '-an', '-sws_flags', 'fast_bilinear',
     '-pix_fmt', 'rgb24', '-f', 'rawvideo', str(a.output/'reference.rgb')],
]
if a.audio:
    commands[0][7:7] = ['-f', 'lavfi', '-i', f'aevalsrc=0.1*sin(2*PI*440*t)|0.1*sin(2*PI*660*t):s=48000:d={a.duration}']
    commands[0][commands[0].index('-an'):commands[0].index('-an')+1] = ['-c:a', 'ac3', '-b:a', '192k', '-shortest']
    commands.append(['ffmpeg', '-v', 'error', '-i', str(a.output/'mpeg2.ts'), '-vn', '-ac', '2', '-ar', '48000', '-f', 'f32le', str(a.output/'reference.f32')])
if a.matrix:
    commands[0][-3:-3] = ['-colorspace', a.matrix, '-color_primaries', a.matrix, '-color_trc', a.matrix]
for index, command in enumerate(commands):
    if index == 1 and a.compressed_reference:
        command[-1] = 'pipe:1'
        process = subprocess.Popen(command, stdout=subprocess.PIPE)
        with (a.output/'reference.rgb.gz').open('wb') as output, gzip.GzipFile(fileobj=output, mode='wb', mtime=0) as compressed:
            for block in iter(lambda: process.stdout.read(1024*1024), b''):
                compressed.write(block)
        process.stdout.close()
        if process.wait(): raise RuntimeError('Reference decoder failed')
    else:
        subprocess.run(command, check=True)
record = {'generator': 'FFmpeg lavfi testsrc2; synthetic fixture', 'license': 'CC0-1.0',
          'size': [a.width, a.height], 'fps': a.fps, 'duration': a.duration, 'gop': a.gop, 'commands': commands,
          'ffmpeg': subprocess.check_output(['ffmpeg', '-version'], text=True),
          'referenceEncoding': 'gzip-lossless-rgb24' if a.compressed_reference else 'rgb24',
          'declaredColorMatrix': a.matrix,
          'artifacts': {n: hashlib.sha256((a.output/n).read_bytes()).hexdigest() for n in ['mpeg2.ts', 'reference.rgb.gz' if a.compressed_reference else 'reference.rgb'] + (['reference.f32'] if a.audio else [])}}
(a.output/'fixture.json').write_text(json.dumps(record, indent=2)+'\n')
(a.output/'profile.json').write_text(json.dumps({'width': a.width, 'height': a.height, 'fps': a.fps, 'duration': a.duration}, indent=2)+'\n')
