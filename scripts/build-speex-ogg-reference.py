#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Build the pinned independent scalar Speex reference with actual Ogg framing."""
import argparse
import hashlib
import json
import pathlib
import subprocess
import tarfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source', type=pathlib.Path, required=True)
parser.add_argument('--out', type=pathlib.Path, default=pathlib.Path('/tmp/demuxe-speex-ogg-nofma-reference'))
args = parser.parse_args()
source, out = args.source.resolve(), args.out.resolve()
out.mkdir(parents=True, exist_ok=True)
sha = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
lock = next(item for item in json.loads((ROOT / 'sources.lock.json').read_text())['sources'] if item['name'] == 'ffmpeg-adaptation')
assert lock['revision'] == 'n9.0.2'
archive = ROOT / 'build/downloads/ffmpeg-adaptation.tar.gz'
assert sha(archive) == lock['sha256']
names = ['configure', 'libavcodec/speexdec.c', 'libavcodec/speexdata.h', 'libavformat/oggdec.c', 'libavformat/oggparsespeex.c']
with tarfile.open(archive) as tar:
    for name in names:
        assert hashlib.sha256(tar.extractfile('FFmpeg-n9.0.2/' + name).read()).hexdigest() == sha(source / name), 'Pinned reference source drift: ' + name
configure = [str(source / 'configure'), '--disable-everything', '--disable-doc', '--disable-debug', '--disable-autodetect', '--disable-network', '--disable-x86asm', '--extra-cflags=-ffp-contract=off -fno-vectorize -fno-slp-vectorize', '--enable-ffmpeg', '--enable-ffprobe', '--enable-decoder=speex', '--enable-demuxer=ogg', '--enable-encoder=pcm_s32le,pcm_f32le', '--enable-muxer=pcm_s32le,pcm_f32le', '--enable-protocol=file,pipe', '--enable-filter=asetpts,aresample,aformat,anull']
commands = [configure, ['make', '-j4']]
with (out / 'build.log').open('w') as log:
    for command in commands:
        subprocess.run(command, cwd=out, stdout=log, stderr=subprocess.STDOUT, check=True)
record = dict(source=lock, commands=commands, qualification='independent-host-reference-only', inputSHA256=sha(pathlib.Path(__file__)), sourceInputs={name: sha(source / name) for name in names}, effectiveConfig={name: sha(out / name) for name in ['config.h', 'config_components.h', 'ffbuild/config.mak']}, artifacts={name: {'sha256': sha(out / name), 'bytes': (out / name).stat().st_size} for name in ['ffmpeg', 'ffprobe']})
(out / 'build-record.json').write_text(json.dumps(record, indent=2) + '\n')
print(out)
