#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Retain exact historical private FFmpeg build inputs without changing engines.

Artifact/source record hashes are checked, including relink dependency builds.
Saved configuration files are retained as observed build materials; this does
not retroactively claim a clean release build or grant playback qualification.
"""
import argparse,json,shutil
from pathlib import Path
from license_policy import ROOT,sha,encoded
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--builds',type=Path,required=True);p.add_argument('--sdk-record',type=Path,required=True);p.add_argument('--output',type=Path,default=ROOT/'build/private-provider-materials');a=p.parse_args();out=a.output.resolve();out.mkdir(parents=True,exist_ok=True)
sdk=json.loads(a.sdk_record.read_bytes());records={sha(p.read_bytes()):p for p in a.builds.glob('*/build-result.json')};inputs={};configs={};artifacts={};sources={};seen=set()
def retain(source,expected=None):
 source=source.resolve()
 if not source.is_relative_to(a.builds.resolve()):raise ValueError('Build material outside explicit build root: '+str(source))
 data=source.read_bytes()
 if expected and sha(data)!=expected:raise ValueError('Recorded source drift: '+str(source))
 target=out/'inputs'/source.relative_to(a.builds.resolve());target.parent.mkdir(parents=True,exist_ok=True)
 if target.exists() and target.read_bytes()!=data:raise ValueError('Existing retained material differs')
 target.write_bytes(data);name=str(target.relative_to(ROOT));inputs[name]=sha(data);return name

def visit(build):
 build=build.resolve()
 if build in seen:return
 seen.add(build);record=json.loads((build/'build-result.json').read_bytes())
 if record.get('status')!='build_completed_only':raise ValueError('Incomplete producer build')
 retain(build/'build-result.json')
 for name,digest in record['sourceSHA256'].items():retain(Path(name) if Path(name).is_absolute() else build/name,digest)
 if record.get('libraryBuild'):visit(Path(record['libraryBuild']))
 for name in ['commands.json','inputs.json','emscripten.config','ffmpeg-read.patch','objects/config.h','objects/config_components.h','objects/ffbuild/config.mak','engine/remux.map']:
  if (build/name).is_file():key=retain(build/name);configs[key]=inputs[key]
 configuration=build/'objects/config.h'
 if configuration.is_file():
  text=configuration.read_text()
  for flag in ['GPL','VERSION3','NONFREE']:
   if f'#define CONFIG_{flag} 0' not in text:raise ValueError('Unexpected FFmpeg license configuration')
 info=json.loads((build/'inputs.json').read_bytes());source=info['source'];archive=ROOT/'build/downloads'/(source['name']+'.tar.gz')
 if not archive.exists():
  existing=ROOT/'build/downloads/ffmpeg-adaptation.tar.gz'
  if sha(existing.read_bytes())!=source['sha256']:raise ValueError('Missing matching upstream source')
  shutil.copyfile(existing,archive)
 if sha(archive.read_bytes())!=source['sha256']:raise ValueError('Upstream source mismatch')
 sources[source['name']]=source['sha256']
for runtime in ['jspi','asyncify']:
 for profile in ['remux','adaptation']:
  folder=ROOT/f'web/engine-{profile}-{runtime}';manifest=json.loads((folder/'manifest.json').read_bytes());record_path=records.get(manifest['buildRecordSHA256'])
  if not record_path:raise ValueError('No exact producer record: '+str(folder))
  record=json.loads(record_path.read_bytes())
  if record['suspension']!=runtime:raise ValueError('Suspension identity mismatch')
  for name,digest in manifest['files'].items():
   data=(folder/name).read_bytes()
   if sha(data)!=digest or record['artifacts'][name]!=digest or sha((record_path.parent/'engine'/name).read_bytes())!=digest:raise ValueError('Artifact drift')
   artifacts[str((folder/name).relative_to(ROOT))]={'sha256':digest,'bytes':len(data)}
  visit(record_path.parent)
engine={'schema':1,'clean':False,'qualification':'recovered-native-build-only','inputs':inputs,'configurations':configs,'sdk':sdk['sdk'],'sdkSources':sdk['sdkSources'],'sources':sources,'artifacts':artifacts,'configurationEvidence':'producer-recorded hashes where present; otherwise retained observed build materials'}
(out/'engine-build.json').write_bytes(encoded(engine));(out/'recovered.json').write_bytes(encoded({'recovered':{name:str(ROOT/name) for name in inputs}}));print(out/'engine-build.json')
