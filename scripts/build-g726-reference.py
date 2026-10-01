#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Build a scalar independent G.726 reference from a freshly extracted pinned archive."""
import argparse,hashlib,json,pathlib,subprocess,tarfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--archive',type=pathlib.Path,default=ROOT/'build/downloads/ffmpeg-adaptation.tar.gz');p.add_argument('--out',type=pathlib.Path,default=pathlib.Path('/tmp/demuxe-g726-reference'));a=p.parse_args()
lock=next(s for s in json.loads((ROOT/'sources.lock.json').read_text())['sources'] if s['name']=='ffmpeg-adaptation');assert lock['revision']=='n9.0.2';archive=a.archive.resolve();assert sha(archive)==lock['sha256'],'Pinned FFmpeg archive drift'
out=a.out.resolve();out.mkdir(parents=True,exist_ok=False);source_root=out/'source';source_root.mkdir()
with tarfile.open(archive) as tar:
 for m in tar.getmembers():
  name=pathlib.PurePosixPath(m.name);assert not name.is_absolute() and '..' not in name.parts and name.parts[0]=='FFmpeg-n9.0.2';assert m.isfile() or m.isdir(),'Unexpected archive link/special file'
 tar.extractall(source_root,filter='data')
source=source_root/'FFmpeg-n9.0.2';inputs={str(f.relative_to(source)):sha(f) for f in source.rglob('*') if f.is_file()};build=out/'build';build.mkdir()
configure=[str(source/'configure'),'--disable-everything','--disable-doc','--disable-debug','--disable-autodetect','--disable-network','--disable-asm','--enable-ffmpeg','--enable-ffprobe','--enable-decoder=adpcm_g726,adpcm_g726le,pcm_s16le','--enable-encoder=adpcm_g726,adpcm_g726le,pcm_s32le,pcm_f32le','--enable-demuxer=g726,g726le,wav,pcm_s16le','--enable-muxer=g726,g726le,wav,pcm_s32le,pcm_f32le','--enable-protocol=file,pipe','--enable-filter=asetpts,aresample,aformat,anull']
commands=[configure,['make','-j4']]
with (out/'build.log').open('w') as log:
 for command in commands:subprocess.run(command,cwd=build,stdout=log,stderr=subprocess.STDOUT,check=True)
assert inputs=={str(f.relative_to(source)):sha(f) for f in source.rglob('*') if f.is_file()},'Fresh reference source changed during build'
record={'schema':1,'source':lock,'commands':commands,'qualification':'independent-scalar-host-reference-only','scriptSHA256':sha(pathlib.Path(__file__)),'sourceInputs':inputs,'effectiveConfig':{n:sha(build/n) for n in ['config.h','config_components.h','ffbuild/config.mak']},'artifacts':{n:{'sha256':sha(build/n),'bytes':(build/n).stat().st_size} for n in ['ffmpeg','ffprobe']}}
(out/'build-record.json').write_text(json.dumps(record,indent=2)+'\n');print(out)
