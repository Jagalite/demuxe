#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Independent scalar native reference for the pinned AAC profile packet decoder family."""
import argparse,pathlib,json,subprocess,hashlib,tarfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source',type=pathlib.Path,required=True);p.add_argument('--out',type=pathlib.Path,default=pathlib.Path('/tmp/demuxe-aac-profile-native-reference'));a=p.parse_args()
source=a.source.resolve();out=a.out.resolve();out.mkdir(parents=True,exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
lock=next(s for s in json.loads((ROOT/'sources.lock.json').read_text())['sources'] if s['name']=='ffmpeg-adaptation')
assert lock['revision']=='n9.0.2'
archive=ROOT/'build/downloads/ffmpeg-adaptation.tar.gz';assert sha(archive)==lock['sha256']
with tarfile.open(archive) as tar:
 for name in ['configure','libavcodec/aac/aacdec.c','libavcodec/aac/aacdec_usac.c','libavcodec/aac/aacdec_lpd.c']:
  assert hashlib.sha256(tar.extractfile('FFmpeg-n9.0.2/'+name).read()).hexdigest()==sha(source/name),'Pinned reference source drift: '+name
configure=[str(source/'configure'),'--disable-everything','--disable-doc','--disable-debug','--disable-autodetect','--disable-network','--disable-x86asm','--enable-ffmpeg','--enable-ffprobe','--enable-decoder=aac','--enable-demuxer=mov,aac','--enable-parser=aac','--enable-encoder=pcm_s32le,pcm_f32le','--enable-muxer=pcm_s32le,pcm_f32le','--enable-protocol=file,pipe','--enable-filter=asetpts,aresample,aformat,anull']
commands=[configure,['make','-j2']]
with (out/'build.log').open('w') as log:
 for command in commands:subprocess.run(command,cwd=out,stdout=log,stderr=subprocess.STDOUT,check=True)
record=dict(source=lock,commands=commands,qualification='independent-host-reference-only',inputSHA256=sha(pathlib.Path(__file__)),sourceInputs={str(f.relative_to(source)):sha(f) for f in [source/'configure',source/'libavcodec/aac/aacdec.c',source/'libavcodec/aac/aacdec_usac.c',source/'libavcodec/aac/aacdec_lpd.c']},effectiveConfig={n:sha(out/n) for n in ['config.h','config_components.h','ffbuild/config.mak']},artifacts={n:{'sha256':sha(out/n),'bytes':(out/n).stat().st_size} for n in ['ffmpeg','ffprobe']})
(out/'build-record.json').write_text(json.dumps(record,indent=2)+'\n');print(out)
