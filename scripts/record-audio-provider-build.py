#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Normalize verified local audio builds for the existing provider/source auditor.

This retains each native build record and verifies the exact SDK source inventory;
no composition qualification is granted and no engine is installed into core.
"""
import argparse,json,shutil
from pathlib import Path
from license_policy import ROOT,encoded,sha
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--builds',type=Path,default=ROOT/'build/audio-providers')
p.add_argument('--sdk-record',type=Path,required=True)
p.add_argument('--source-archive',type=Path,required=True)
p.add_argument('--output',type=Path,default=ROOT/'build/audio-providers/provenance')
a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
sdk_record=json.loads(a.sdk_record.read_bytes());inputs={};configurations={};artifacts={};source=None;keys=set()
for profile in ['ac3','dts','flac','common']:
 pointer=json.loads((a.builds/(profile+'.json')).read_bytes());directory=Path(pointer['directory']);raw=(directory/'build-record.json').read_bytes()
 if sha(raw)!=pointer['recordSHA256']:raise ValueError('Build record drift: '+profile)
 record=json.loads(raw);keys.add(record['sourceKey'])
 if source and source!=record['source']:raise ValueError('Incompatible FFmpeg sources')
 source=record['source']
 for name,digest in record['inputs'].items():
  if sha((ROOT/name).read_bytes())!=digest:raise ValueError('Native input drift: '+name)
  inputs[name]=digest
 for name,digest in record['effectiveConfig'].items():
  local=directory/name
  if sha(local.read_bytes())!=digest:raise ValueError('Native configuration drift: '+name)
  configurations[str(local.relative_to(ROOT))]=digest
 configurations[str((directory/'build-record.json').relative_to(ROOT))]=sha(raw)
 runtime=ROOT/'web/providers/audio'/profile;runtime.mkdir(parents=True,exist_ok=True)
 for name,item in record['artifacts'].items():
  data=(directory/name).read_bytes()
  if len(data)!=item['bytes'] or sha(data)!=item['sha256']:raise ValueError('Native artifact drift: '+name)
  target=runtime/name
  if target.exists() and target.read_bytes()!=data:raise ValueError('Refusing to replace different audio artifact: '+str(target))
  target.write_bytes(data);artifacts[str(target.relative_to(ROOT))]={'sha256':sha(data),'bytes':len(data)}
if len(keys)!=1:raise ValueError('Fine/bundled sources diverged')
if sha(a.source_archive.read_bytes())!=source['sha256']:raise ValueError('Pinned upstream source mismatch')
archive=ROOT/'build/downloads'/('ffmpeg-adaptation.tar.gz');archive.parent.mkdir(parents=True,exist_ok=True)
if archive.exists() and sha(archive.read_bytes())!=source['sha256']:raise ValueError('Existing source archive mismatch')
if not archive.exists():shutil.copyfile(a.source_archive,archive)
for name,digest in sdk_record['sdkSources'].items():
 if sha((Path(sdk_record['sdk'])/'upstream/emscripten'/name).read_bytes())!=digest:raise ValueError('SDK source drift: '+name)
engine={'schema':1,'clean':False,'qualification':'native-build-only','inputs':inputs,'configurations':configurations,'sdk':sdk_record['sdk'],'sdkSources':sdk_record['sdkSources'],'sources':{'ffmpeg-adaptation':source['sha256']},'artifacts':artifacts,'sourceKeys':sorted(keys)}
(a.output/'engine-build.json').write_bytes(encoded(engine));(a.output/'recovered.json').write_bytes(encoded({'recovered':{name:str(ROOT/name) for name in inputs}}));print(a.output/'engine-build.json')
