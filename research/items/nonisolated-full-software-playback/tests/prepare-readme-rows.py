#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Prepare independent picture/audio references for the six existing row files."""
import argparse, hashlib, json, subprocess
from pathlib import Path
p = argparse.ArgumentParser();p.add_argument('fixtures', type=Path);p.add_argument('output', type=Path)
a = p.parse_args();a.output.mkdir(exist_ok=False, parents=True)
rows = [('mpeg2-ac3', 'ts'), ('mpeg2-interlaced-ac3', 'ts'), ('mpeg2-mp2', 'mpg'),
        ('mpeg4-mp3', 'avi'), ('prores-pcm', 'mov'), ('mpeg2-video-only', 'ts')]
record = {'ffmpeg': subprocess.check_output(['ffmpeg', '-version'], text=True), 'rows': []}
for key, suffix in rows:
    source = (a.fixtures/key/('index.'+suffix)).resolve()
    probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(source)], text=True))
    video = next(s for s in probe['streams'] if s['codec_type'] == 'video')
    numerator, denominator = map(int, video['r_frame_rate'].split('/'))
    profile = {'width': video['width'], 'height': video['height'], 'fps': numerator/denominator,
               'duration': float(probe['format']['duration']), 'key': key,
               'fixture': str(source), 'fixtureSHA256': hashlib.sha256(source.read_bytes()).hexdigest()}
    out = a.output/key;out.mkdir()
    (out/'profile.json').write_text(json.dumps(profile, indent=2)+'\n')
    commands = [['ffmpeg', '-v', 'error', '-i', str(source), '-map', '0:v:0', '-an', '-sws_flags', 'fast_bilinear', '-pix_fmt', 'rgb24', '-f', 'rawvideo', str(out/'reference.rgb')]]
    if any(s['codec_type'] == 'audio' for s in probe['streams']):
        commands.append(['ffmpeg', '-v', 'error', '-i', str(source), '-map', '0:a:0', '-vn', '-ac', '2', '-ar', '48000', '-f', 'f32le', str(out/'reference.f32')])
    for command in commands:subprocess.run(command, check=True)
    record['rows'].append({'profile': profile, 'probe': probe, 'commands': commands,
                           'artifacts': {f.name: hashlib.sha256(f.read_bytes()).hexdigest() for f in out.iterdir()}})
    print(key, flush=True)
(a.output/'references.json').write_text(json.dumps(record, indent=2)+'\n')
