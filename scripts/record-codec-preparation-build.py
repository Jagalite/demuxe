#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Bind exact decoder-specific streaming builds and retain all source/relink inputs."""
import argparse, json, shutil, hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def sha(data):return hashlib.sha256(data).hexdigest()
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--builds',type=Path,required=True);p.add_argument('--profiles',nargs='+',choices=['truehd-mlp','dts-hd','ac3-eac3'],required=True);p.add_argument('--runtimes',nargs='+',choices=['jspi','asyncify'],required=True);p.add_argument('--sdk-record',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();out=a.output.resolve();out.mkdir(parents=True,exist_ok=True)
sdk=json.loads(a.sdk_record.read_bytes());inputs={};configurations={};artifacts={};sourceSpec=None;transformations={};inputs['scripts/record-codec-preparation-build.py']=sha(Path(__file__).read_bytes())
for profile in a.profiles:
 for runtime in a.runtimes:
  name=profile+'-'+runtime;build=a.builds.resolve()/(name+'-01');record=json.loads((build/'build-result.json').read_bytes());info=json.loads((build/'inputs.json').read_bytes())
  if record.get('status')!='build_completed_only' or record.get('codecProfile')!=profile or record.get('suspension')!=runtime:raise ValueError('Incomplete or mismatched codec build: '+name)
  sourceSpec=info['source'] if sourceSpec is None else sourceSpec
  if info['source']!=sourceSpec:raise ValueError('Codec upstream pins differ')
  expected=set({'truehd-mlp':['TRUEHD','MLP'],'dts-hd':['DCA'],'ac3-eac3':['AC3','EAC3']}[profile])
  if set(record['enabledDecoders'])!=expected:raise ValueError('Decoder set mismatch')
  def retain(relative,digest=None,configuration=False):
   path=build/relative;data=path.read_bytes()
   if digest is not None and sha(data)!=digest:raise ValueError('Build input drift: '+str(path))
   target=out/'inputs'/name/relative;target.parent.mkdir(parents=True,exist_ok=True)
   if target.exists() and target.read_bytes()!=data:raise ValueError('Retained material differs')
   target.write_bytes(data);key=str(target.relative_to(ROOT));inputs[key]=sha(data)
   if configuration:configurations[key]=sha(data)
  for key,digest in record['sourceSHA256'].items():retain(key,digest)
  for key,digest in record['relinkInputsSHA256'].items():retain(key,digest,True)
  retain('codec-build-recipe.py',info['currentIntegrationSHA256']['scripts/build-codec-preparation.py'])
  for key in ['inputs.json','build-result.json','commands.json','emscripten.config','ffmpeg-read.patch','objects/ffbuild/config.mak','engine/remux.map']:retain(key,configuration=True)
  flags=(build/'objects/config.h').read_text()
  for flag in ['GPL','VERSION3','NONFREE']:
   if '#define CONFIG_'+flag+' 0' not in flags:raise ValueError('Unapproved FFmpeg license configuration')
  folder=ROOT/'web/providers/preparation'/name/('engine-adaptation-'+runtime);folder.mkdir(parents=True,exist_ok=True)
  for leaf in ['remux.mjs','remux.wasm']:
   data=(build/'engine'/leaf).read_bytes()
   if sha(data)!=record['artifacts'][leaf]:raise ValueError('Codec artifact drift')
   if leaf=='remux.mjs':
    retain('engine/remux.mjs',record['artifacts'][leaf])
    notice=b'// SPDX-License-Identifier: LGPL-2.1-or-later\n'
    if not data.startswith(notice):data=notice+data
    transformations[str((folder/leaf).relative_to(ROOT))]={'linkedSHA256':record['artifacts'][leaf],'distributedSHA256':sha(data),'operation':'prepend LGPL SPDX notice; executable bytes unchanged','recipe':'scripts/record-codec-preparation-build.py'}
   target=folder/leaf
   if target.exists() and target.read_bytes()!=data:raise ValueError('Refusing to replace existing codec runtime')
   target.write_bytes(data);artifacts[str(target.relative_to(ROOT))]={'sha256':sha(data),'bytes':len(data)}
archive=ROOT/'build/downloads/ffmpeg-adaptation.tar.gz'
if sha(archive.read_bytes())!=sourceSpec['sha256']:raise ValueError('Upstream archive drift')
# Record uses the source/build SDK identity, not whichever SDK happens to be active.
for name,digest in sdk['sdkSources'].items():
 if sha((Path(sdk['sdk'])/'upstream/emscripten'/name).read_bytes())!=digest:raise ValueError('SDK source drift: '+name)
engine={'schema':1,'clean':False,'qualification':'native-build-only','inputs':inputs,'configurations':configurations,'sdk':sdk['sdk'],'sdkSources':sdk['sdkSources'],'sources':{'ffmpeg-adaptation':sourceSpec['sha256']},'artifacts':artifacts,'artifactTransformations':transformations}
for name,value in [('engine-build.json',engine),('recovered.json',{'recovered':{key:str(ROOT/key) for key in inputs}})]:
 target=out/name;data=(json.dumps(value,indent=2,sort_keys=True)+'\n').encode()
 if target.exists() and target.read_bytes()!=data:raise ValueError('Existing native record differs')
 target.write_bytes(data)
print(out/'engine-build.json')
