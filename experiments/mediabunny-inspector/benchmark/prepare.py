#!/usr/bin/env python3
"""Small synthetic format-screen fixtures. Preserve commands and hashes beside outputs."""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

out = Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/demuxe-mediabunny-fixtures').resolve()
out.mkdir(parents=True, exist_ok=True)
commands = []

def run(name, args):
    target = out / name
    command = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *args, str(target)]
    completed = subprocess.run(command, capture_output=True, text=True)
    commands.append({'name': name, 'argv': command, 'returncode': completed.returncode, 'stderr': completed.stderr})
    if completed.returncode:
        print('FAILED', name, completed.stderr[-500:])
        return None
    return target

video = {
    'h264': ['-c:v','libx264','-preset','ultrafast','-crf','27','-pix_fmt','yuv420p'],
    'hevc': ['-c:v','libx265','-preset','ultrafast','-x265-params','log-level=error','-crf','30','-pix_fmt','yuv420p'],
    'vp9': ['-c:v','libvpx-vp9','-deadline','realtime','-cpu-used','8','-b:v','600k','-pix_fmt','yuv420p'],
    'av1': ['-c:v','libsvtav1','-preset','12','-crf','42','-pix_fmt','yuv420p'],
    'prores': ['-c:v','prores_ks','-profile:v','0','-pix_fmt','yuv422p10le'],
}
for codec, args in video.items():
    run(codec+'.mkv', ['-f','lavfi','-i','testsrc2=size=640x360:rate=30','-t','4',*args,'-an'])
run('h264-480p.mp4',['-f','lavfi','-i','testsrc2=size=854x480:rate=30','-t','4',*video['h264'],'-an'])
run('h264-4k.mp4',['-f','lavfi','-i','testsrc2=size=3840x2160:rate=24','-t','2',*video['h264'],'-an'])
audio = {'aac':['-c:a','aac','-b:a','96k'],'opus':['-c:a','libopus','-b:a','96k'],
         'pcm':['-c:a','pcm_s16le'],'flac':['-c:a','flac'],'ac3':['-c:a','ac3','-b:a','192k'],
         'eac3':['-c:a','eac3','-b:a','192k']}
for codec,args in audio.items():
    run(codec+'.mka' if codec != 'pcm' else codec+'.wav',
        ['-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','4',*args])
run('aac-only.mp4',['-i',str(out/'aac.mka'),'-c','copy'])
matrix = [
    ('h264-aac.mp4','h264','aac'),('h264-aac.mkv','h264','aac'),
    ('hevc-aac.mkv','hevc','aac'),('av1-opus.mkv','av1','opus'),('vp9-opus.webm','vp9','opus'),
    ('h264-pcm.mov','h264','pcm'),('prores-pcm.mov','prores','pcm'),
    ('h264-flac.mkv','h264','flac'),('h264-ac3.mkv','h264','ac3'),
    ('hevc-eac3.mkv','hevc','eac3'),('h264-aac.ts','h264','aac')]
for name,v,a in matrix:
    audio_name = a+'.wav' if a == 'pcm' else a+'.mka'
    run(name,['-i',str(out/(v+'.mkv')),'-i',str(out/audio_name),'-map','0:v:0','-map','1:a:0','-c','copy','-shortest'])
manifest = {}
for name,_,_ in matrix:
    file=out/name
    if file.is_file():
        manifest[name]={'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()}
for name in ['h264-480p.mp4','h264-4k.mp4','aac-only.mp4']:
    file=out/name
    if file.is_file():
        manifest[name]={'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()}
(out/'manifest.json').write_text(json.dumps({'files':manifest,'commands':commands},indent=2)+'\n')
print(out/'manifest.json')
