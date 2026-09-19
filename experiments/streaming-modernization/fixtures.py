#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Generate aligned, original synthetic media; refuse to overwrite a prior run."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import xml.etree.ElementTree as ET

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', required=True, type=Path)
parser.add_argument('--ffmpeg', default='ffmpeg')
parser.add_argument('--timing', action='store_true', help='Add aligned one-second video flashes and audio pulses')
parser.add_argument('--duration', type=int, default=24, help='Even ladder duration in seconds, 12 through 3600')
parser.add_argument('--segment-seconds', type=int, default=2, help='Even segment duration dividing the ladder duration')
args = parser.parse_args()
if not 12 <= args.duration <= 3600 or args.duration % 2:
    parser.error('duration must be an even number from 12 through 3600')
if args.segment_seconds < 2 or args.segment_seconds % 2 or args.duration % args.segment_seconds:
    parser.error('segment-seconds must be positive, even, and divide duration')
out = args.output.resolve()
if out.exists():
    raise SystemExit('Use a new fixture directory to preserve evidence')
out.mkdir(parents=True)
commands = []

def ff(*argv):
    command = [args.ffmpeg, '-hide_banner', '-loglevel', 'error', '-nostdin',
               '-filter_threads', '1', *map(str, argv)]
    subprocess.run(command, check=True, timeout=180)
    commands.append(command)

# All variants share a 24 Hz clock, two-second closed GOPs and an explicit span.
# Separate audio resources make unselected-rendition requests observable.
# Timing fixtures omit B frames so independently muxed HLS video/audio do not
# acquire different negative-DTS normalization offsets. The standard ladder
# retains B frames for switching/preroll qualification.
for name, size, bitrate in [('low', '320x180', '350k'), ('medium', '640x360', '900k'),
                            ('high', '960x540', '2200k')]:
    folder = out / name
    folder.mkdir()
    video=f'testsrc2=size={size}:rate=24'
    if args.timing:
        video+=",drawbox=x=0:y=0:w=48:h=48:color=black:t=fill,drawbox=x=0:y=0:w=48:h=48:color=white:t=fill:enable='lt(mod(t,1),0.05)'"
    ff('-f', 'lavfi', '-i', video, '-t', args.duration,
       '-an', '-c:v', 'libx264', '-preset', 'fast', '-threads', '2',
       '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-b:v', bitrate,
       '-g', '48', '-keyint_min', '48', '-sc_threshold', '0', '-bf', '0' if args.timing else '2',
       '-flags', '+cgop', '-movflags', '+faststart', folder / 'source.mp4')
    ff('-i', folder / 'source.mp4', '-map', '0:v', '-c', 'copy', '-f', 'hls',
       '-hls_time', args.segment_seconds, '-hls_playlist_type', 'vod', '-hls_segment_type', 'fmp4',
       '-hls_fmp4_init_filename', 'init.mp4', '-hls_segment_filename', folder / '%03d.m4s',
       folder / 'media.m3u8')
for name, frequency in [('english', 440), ('alternate', 880)]:
    folder = out / name
    folder.mkdir()
    audio=(f'aevalsrc=if(lt(mod(t\\,1)\\,0.04)\\,0.5*sin(2*PI*{frequency}*t)\\,0):s=48000' if args.timing else f'sine=frequency={frequency}:sample_rate=48000')
    ff('-f', 'lavfi', '-i', audio,
       '-t', args.duration, '-c:a', 'aac', '-ac', '2', '-b:a', '96k', folder / 'source.m4a')
    ff('-i', folder / 'source.m4a', '-c', 'copy', '-f', 'hls', '-hls_time', args.segment_seconds,
       '-hls_playlist_type', 'vod', '-hls_segment_type', 'fmp4',
       '-hls_fmp4_init_filename', 'init.mp4', '-hls_segment_filename', folder / '%03d.m4s',
       folder / 'media.m3u8')
def timestamp(seconds):
    return f'{seconds//3600:02d}:{seconds//60%60:02d}:{seconds%60:02d}.000'
middle, end = timestamp(args.duration//2), timestamp(args.duration)
(out / 'captions.vtt').write_text(f'WEBVTT\n\n00:00:00.000 --> {middle}\nFIRST HALF\n\n{middle} --> {end}\nSECOND HALF\n')
(out / 'captions.m3u8').write_text(f'#EXTM3U\n#EXT-X-TARGETDURATION:{args.duration}\n#EXTINF:{args.duration},\ncaptions.vtt\n#EXT-X-ENDLIST\n')
master = ['#EXTM3U', '#EXT-X-VERSION:7', '#EXT-X-INDEPENDENT-SEGMENTS',
          '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",NAME="English",LANGUAGE="en",DEFAULT=YES,AUTOSELECT=YES,URI="english/media.m3u8"',
          '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",NAME="Alternate",LANGUAGE="fr",DEFAULT=NO,AUTOSELECT=YES,URI="alternate/media.m3u8"',
          '#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="s",NAME="English",LANGUAGE="en",DEFAULT=YES,AUTOSELECT=YES,URI="captions.m3u8"']
for name, bandwidth, resolution in [('low', 500000, '320x180'), ('medium', 1100000, '640x360'), ('high', 2500000, '960x540')]:
    master += [f'#EXT-X-STREAM-INF:BANDWIDTH={bandwidth},RESOLUTION={resolution},CODECS="avc1.64001f,mp4a.40.2",AUDIO="a",SUBTITLES="s"', f'{name}/media.m3u8']
(out / 'master.m3u8').write_text('\n'.join(master) + '\n')
dash = out / 'dash'
dash.mkdir()
inputs = []
for name in ['low', 'medium', 'high']:
    inputs += ['-i', out / name / 'source.mp4']
inputs += ['-i', out / 'english/source.m4a', '-i', out / 'alternate/source.m4a']
ff(*inputs, '-map', '0:v', '-map', '1:v', '-map', '2:v', '-map', '3:a', '-map', '4:a',
   '-c', 'copy', '-f', 'dash', '-seg_duration', args.segment_seconds, '-use_template', '1', '-use_timeline', '1',
   '-adaptation_sets', 'id=0,streams=0,1,2 id=1,streams=3 id=2,streams=4', dash / 'manifest.mpd')

# Deliberately distinct periods make "only one period played" observable.
periods = []
ns = '{urn:mpeg:dash:schema:mpd:2011}'
ET.register_namespace('', ns[1:-1])
for index, color in enumerate(['red', 'blue']):
    folder = out / f'period-{index}'
    folder.mkdir()
    ff('-f', 'lavfi', '-i', f'color={color}:size=320x180:rate=24',
       '-f', 'lavfi', '-i', f'sine=frequency={440 + index * 440}:sample_rate=48000',
       '-t', '6', '-c:v', 'libx264', '-preset', 'fast', '-threads', '2', '-g', '48',
       '-sc_threshold', '0', '-c:a', 'aac', '-f', 'dash', '-seg_duration', '2',
       '-adaptation_sets', 'id=0,streams=v id=1,streams=a', folder / 'manifest.mpd')
    period = ET.parse(folder / 'manifest.mpd').getroot().find(ns + 'Period')
    period.set('id', str(index))
    period.set('start', f'PT{index * 6}S')
    period.set('duration', 'PT6S')
    base = ET.Element(ns + 'BaseURL')
    base.text = f'period-{index}/'
    period.insert(0, base)
    periods.append(period)
mpd = ET.Element(ns + 'MPD', {'type': 'static', 'profiles': 'urn:mpeg:dash:profile:isoff-live:2011',
                            'mediaPresentationDuration': 'PT12S', 'minBufferTime': 'PT2S'})
mpd.extend(periods)
ET.ElementTree(mpd).write(out / 'periods.mpd', encoding='utf-8', xml_declaration=True)
manifest = {'kind': 'synthetic-original-media', 'timingMarkers': args.timing,
            'durationSeconds': args.duration, 'segmentSeconds': args.segment_seconds,
            'generatorSHA256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            'generatorVersion': subprocess.check_output([args.ffmpeg, '-version'], text=True).splitlines()[0],
            'commands': commands,
            'files': {str(p.relative_to(out)): {'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
                      for p in sorted(out.rglob('*')) if p.is_file()}}
(out / 'fixture-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(out)
