#!/usr/bin/env python3
"""Build pristine pinned FFmpeg for native characterization, independent of Wasm."""
import argparse
import hashlib
import json
import os
import platform
from pathlib import Path
import shlex
import subprocess

HERE = Path(__file__).resolve().parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--patch', action='append', type=Path, default=[], help='Explicit experimental patch; recorded separately from upstream')
parser.add_argument('--archive', required=True, type=Path)
parser.add_argument('--output', required=True, type=Path)
parser.add_argument('--jobs', default=4, type=int)
args = parser.parse_args()
pin = next(p for p in json.loads((HERE / 'baseline/profile.json').read_text())['upstream'] if p['name'] == 'ffmpeg')
if hashlib.sha256(args.archive.read_bytes()).hexdigest() != pin['sha256']:
    raise SystemExit('Archive differs from pinned FFmpeg source')
out = args.output.resolve()
if out.exists():
    raise SystemExit('Use a new output directory')
source, build = out / 'source', out / 'build'
source.mkdir(parents=True)
(out / 'build-native-probe.py').write_bytes(Path(__file__).read_bytes())
build.mkdir()
subprocess.run(['tar', '-xf', str(args.archive.resolve()), '--strip-components=1', '-C', str(source)], check=True)
with (out / 'patch.log').open('w') as log:
    for patch in args.patch:
        subprocess.run(['patch', '-p1', '--batch', '--forward', '-i', str(patch.resolve())], cwd=source,
                       stdout=log, stderr=subprocess.STDOUT, check=True)
configure = [str(source / 'configure'), '--disable-autodetect', '--disable-everything',
             '--disable-doc', '--disable-debug', '--disable-asm', '--enable-ffprobe',
             '--enable-ffmpeg', '--enable-network', '--enable-protocol=file,http,tcp',
             '--enable-demuxer=hls,dash,mov,mpegts,webvtt', '--enable-parser=h264,aac',
             '--enable-decoder=h264,aac,webvtt', '--enable-libxml2', '--enable-muxer=null',
             '--enable-encoder=wrapped_avframe,pcm_s16le', '--enable-filter=anull,null,aresample,format']
env = {**os.environ, 'GIT_CEILING_DIRECTORIES': str(out)}
(out / 'configure-command.json').write_text(json.dumps(configure, indent=2) + '\n')
with (out / 'build.log').open('w') as log:
    subprocess.run(configure, cwd=build, env=env, stdout=log, stderr=subprocess.STDOUT, check=True)
    subprocess.run(['make', '-j', str(args.jobs)], cwd=build, env=env, stdout=log, stderr=subprocess.STDOUT, check=True)
    libs = shlex.split(subprocess.check_output(['pkg-config', '--libs', 'libxml-2.0'], text=True))
    command = [os.environ.get('CC', 'cc'), '-O2', '-I' + str(build), '-I' + str(source),
               str(HERE / 'switch-probe.c'),
               *[str(build / lib / (lib + '.a')) for lib in ['libavformat', 'libavcodec', 'libswresample', 'libavutil']],
               *libs, '-lm', '-lpthread', '-o', str(out / 'switch-probe')]
    subprocess.run(command, stdout=log, stderr=subprocess.STDOUT, check=True)
(out / 'build-record.json').write_text(json.dumps({
    'scope': 'native demux characterization; not production or browser playback', 'source': pin,
    'configure': configure, 'switchProbeCommand': command,
    'toolchain': {'compiler': subprocess.check_output([os.environ.get('CC','cc'),'--version'],text=True),
                  'python': platform.python_version(), 'platform': platform.platform(),
                  'hostLibxml2': subprocess.check_output(['pkg-config','--modversion','libxml-2.0'],text=True).strip(),
                  'libxmlLinkFlags': libs, 'builderSHA256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()},
    'patches': {str(p.resolve()): hashlib.sha256(p.read_bytes()).hexdigest() for p in args.patch},
    'artifacts': {str(p.relative_to(out)): hashlib.sha256(p.read_bytes()).hexdigest()
                  for p in [build / 'ffprobe', build / 'ffmpeg', out / 'switch-probe', build / 'config.h', build / 'config_components.h']},
}, indent=2) + '\n')
print(out)
