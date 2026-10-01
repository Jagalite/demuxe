#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Normalize verified local audio builds for the existing provider/source auditor.

This retains each native build record and verifies the exact SDK source inventory;
no composition qualification is granted and no engine is installed into core.
"""
import argparse,json,shutil
from pathlib import Path
from license_policy import ROOT,encoded,sha
from audio_source_policy import verify_audio_build_source
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--builds',type=Path,default=ROOT/'build/audio-providers')
p.add_argument('--sdk',type=Path,help='Actual SDK directory used by this build')
p.add_argument('--sdk-record',type=Path,required=True)
p.add_argument('--source-archive',type=Path,required=True)
p.add_argument('--output',type=Path,default=ROOT/'build/audio-providers/provenance')
p.add_argument('--profiles',nargs='+',choices=['ac3','dts','flac','common','truehd-mlp','dts-hd','aac','opus-vorbis','lossless','mp3','pcm','legacy','archive','archive-more','archive-next','archive-historical','adpcm-wave', 'adpcm-qt','g726','telephony','speech','wma-advanced','opus-encoder'],default=['ac3','dts','flac','common'])
p.add_argument('--preferred-inputs',type=Path,help='Hash-verified retained native input locations; original record names and digests are preserved')
p.add_argument('--replace-runtime',action='store_true',help='Retain prior runtime bytes in output before replacing verified generated assets')
a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
preferred=json.loads(a.preferred_inputs.read_bytes())['recovered'] if a.preferred_inputs else {}
input_locations={}
def input_bytes(name):
 return Path(input_locations.get(name,ROOT/name)).read_bytes()
sdk_record=json.loads(a.sdk_record.read_bytes());sdk_path=a.sdk.resolve() if a.sdk else Path(sdk_record['sdk']);inputs={'scripts/record-audio-provider-build.py':sha(Path(__file__).read_bytes()),'scripts/audio_source_policy.py':sha((ROOT/'scripts/audio_source_policy.py').read_bytes())};configurations={};artifacts={};transformations={};source=None;keys=set()
# Validate every profile/source pair before installing any runtime artifact.
verified={}
for profile in a.profiles:
 pointer=json.loads((a.builds/(profile+'.json')).read_bytes());directory=Path(pointer['directory']);raw=(directory/'build-record.json').read_bytes()
 if sha(raw)!=pointer['recordSHA256']:raise ValueError('Build record drift: '+profile)
 record=json.loads(raw);verify_audio_build_source(profile,record)
 if sha(a.source_archive.read_bytes())!=record['source']['sha256']:raise ValueError('Pinned upstream source mismatch')
 for name,digest in record['inputs'].items():
  location=Path(preferred.get(name,ROOT/name))
  if sha(location.read_bytes())!=digest:raise ValueError('Native input drift: '+name)
  if name in input_locations and Path(input_locations[name]).read_bytes()!=location.read_bytes():raise ValueError('Incompatible retained native input: '+name)
  input_locations[name]=location
 verified[profile]=(directory,raw,record)
for profile in a.profiles:
 directory,raw,record=verified[profile];keys.add(record['sourceKey'])
 if source and source!=record['source']:raise ValueError('Incompatible FFmpeg sources')
 source=record['source']
 for name,digest in record['inputs'].items():
  if sha(input_bytes(name))!=digest:raise ValueError('Native input drift: '+name)
  inputs[name]=digest
 for name,digest in record['effectiveConfig'].items():
  local=directory/name
  if sha(local.read_bytes())!=digest:raise ValueError('Native configuration drift: '+name)
  retained=a.output/'native-configurations'/profile/name
  retained.parent.mkdir(parents=True,exist_ok=True)
  if retained.exists() and retained.read_bytes()!=local.read_bytes():raise ValueError('Retained configuration differs: '+str(retained))
  retained.write_bytes(local.read_bytes())
  configurations[str(retained.resolve().relative_to(ROOT))]=digest
 retained=a.output/'native-configurations'/profile/'build-record.json'
 if retained.exists() and retained.read_bytes()!=raw:raise ValueError('Retained build record differs: '+profile)
 retained.write_bytes(raw)
 configurations[str(retained.resolve().relative_to(ROOT))]=sha(raw)
 runtime=ROOT/'web/providers/audio'/profile;runtime.mkdir(parents=True,exist_ok=True)
 for name,item in record['artifacts'].items():
  data=(directory/name).read_bytes()
  if len(data)!=item['bytes'] or sha(data)!=item['sha256']:raise ValueError('Native artifact drift: '+name)
  target=runtime/name
  if name.endswith('.mjs'):
   notice=b'// SPDX-License-Identifier: '+(b'BSD-3-Clause' if source['name']=='opus-audio' else b'LGPL-2.1-or-later')+b'\n'
   if not data.startswith(notice):
    linked=sha(data);data=notice+data
    transformations[str(target.relative_to(ROOT))]={'linkedSHA256':linked,'distributedSHA256':sha(data),'operation':'prepend native SPDX notice; executable bytes unchanged','recipe':'scripts/record-audio-provider-build.py'}
  if target.exists() and target.read_bytes()!=data:
   if not a.replace_runtime:raise ValueError('Refusing to replace different audio artifact: '+str(target))
   previous=target.read_bytes();backup=a.output/'replaced-runtime'/profile/(sha(previous)+'-'+name);backup.parent.mkdir(parents=True,exist_ok=True)
   if not backup.exists():backup.write_bytes(previous)
  target.write_bytes(data);artifacts[str(target.relative_to(ROOT))]={'sha256':sha(data),'bytes':len(data)}
if len(keys)!=1:raise ValueError('Fine/bundled sources diverged')
if sha(a.source_archive.read_bytes())!=source['sha256']:raise ValueError('Pinned upstream source mismatch')
source_name=source['name']
if source_name not in ['ffmpeg-adaptation','opus-audio']:raise ValueError('Unapproved audio source')
archive=ROOT/'build/downloads'/(source_name+'.tar.gz');archive.parent.mkdir(parents=True,exist_ok=True)
if archive.exists() and sha(archive.read_bytes())!=source['sha256']:raise ValueError('Existing source archive mismatch')
if not archive.exists():shutil.copyfile(a.source_archive,archive)
for name,digest in sdk_record['sdkSources'].items():
 if sha((sdk_path/'upstream/emscripten'/name).read_bytes())!=digest:raise ValueError('SDK source drift: '+name)
# Retain preferred input bytes before later family edits can change the checkout.
# Original names/hashes stay in the native record; recovery locations may differ.
recovered={}
for name,digest in inputs.items():
 data=input_bytes(name)
 if sha(data)!=digest:raise ValueError('Native input changed during normalization: '+name)
 retained=a.output/'preferred-inputs'/name;retained.parent.mkdir(parents=True,exist_ok=True)
 if retained.exists() and retained.read_bytes()!=data:raise ValueError('Retained native input differs: '+name)
 retained.write_bytes(data);recovered[name]=str(retained.resolve())
engine={'schema':1,'clean':False,'qualification':'native-build-only','inputs':inputs,'configurations':configurations,'sdk':str(sdk_path),'sdkSources':sdk_record['sdkSources'],'sources':{source_name:source['sha256']},'artifacts':artifacts,'sourceKeys':sorted(keys),'artifactTransformations':transformations}
(a.output/'engine-build.json').write_bytes(encoded(engine));(a.output/'recovered.json').write_bytes(encoded({'recovered':recovered}));print(a.output/'engine-build.json')
