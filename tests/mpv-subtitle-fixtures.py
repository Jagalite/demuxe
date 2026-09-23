# SPDX-License-Identifier: Apache-2.0
"""Small, reproducible subtitle-service fixtures from the existing catalogue."""
from pathlib import Path
import subprocess

root = Path('build/head-to-head/assets-component-isolation-01/fixtures')
out = Path('build/mpv-subtitle-service/generalization')
out.mkdir(parents=True, exist_ok=True)
base = root / 'h264-srt/index.mkv'
second = out / 'second.srt'
second.write_text('1\n00:00:00,500 --> 00:00:35,800\nSECOND TRACK 456\n', encoding='utf-8')

def make(name, args):
    target = out / name
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *args, str(target)], check=True)
    print(target)

make('multi-srt.mkv', ['-i', str(base), '-i', str(second), '-map', '0:v:0', '-map', '0:a:0', '-map', '0:s:0', '-map', '1:s:0', '-c', 'copy', '-metadata:s:s:1', 'language=spa', '-disposition:s:0', 'default', '-disposition:s:1', '0'])
make('default-second-srt.mkv', ['-i', str(out / 'multi-srt.mkv'), '-map', '0', '-c', 'copy', '-disposition:s:0', '0', '-disposition:s:1', 'default'])
late = out / 'late.srt'
late.write_text('1\n00:00:33,000 --> 00:00:35,800\nLATE CUE 789\n', encoding='utf-8')
make('late-srt.mkv', ['-i', str(base), '-i', str(late), '-map', '0:v:0', '-map', '0:a:0', '-map', '1:s:0', '-c', 'copy', '-disposition:s:0', 'default'])
for name, source in [('pgs', 'hevc-pgs/index.mkv'), ('vobsub', 'h264-vobsub/index.mkv')]:
    make(f'h264-aac-{name}.mkv', ['-i', str(base), '-i', str(root / source), '-map', '0:v:0', '-map', '0:a:0', '-map', '1:s:0', '-c', 'copy', '-disposition:s:0', 'default'])
make('unsupported-webvtt.mkv', ['-i', str(base), '-map', '0', '-c', 'copy', '-c:s', 'webvtt'])
bad = (out / 'malformed-subrip.mkv')
media = base.read_bytes()
marker = b'DE MUXE TEST 123'
if media.count(marker) != 1:
    raise RuntimeError('Unexpected SubRip packet marker count')
bad.write_bytes(media.replace(marker, b'\xffE MUXE TEST 123', 1))
print(bad)
