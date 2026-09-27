#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Install explicit local JSPI/Asyncify assets from verified component builds."""
import argparse,hashlib,json,pathlib,shutil
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def install(builds,runtime_root):
 verified=[]
 for backend in ['jspi','asyncify']:
  for profile,attempt,name in [('remux','02','remux'),('transcode','05','adaptation')]:
   build=builds/f'{profile}-{backend}-{attempt}';record=json.loads((build/'build-result.json').read_text())
   if record.get('status')!='build_completed_only' or record.get('suspension')!=backend:raise ValueError('Wrong build identity: '+str(build))
   for filename,digest in record['artifacts'].items():
    if sha(build/'engine'/filename)!=digest:raise ValueError('Artifact drift: '+filename)
   for filename,digest in record['sourceSHA256'].items():
    source=pathlib.Path(filename);source=source if source.is_absolute() else build/source
    if sha(source)!=digest:raise ValueError('Build source drift: '+str(source))
   target=runtime_root/'web'/f'engine-{name}-{backend}'
   if target.exists():raise ValueError('Refusing to overwrite existing runtime: '+str(target))
   verified.append((build,target,backend,profile,record))
 for build,target,backend,profile,record in verified:
  target.mkdir(parents=True)
  for filename in ['remux.mjs','remux.wasm']:shutil.copyfile(build/'engine'/filename,target/filename)
  (target/'manifest.json').write_text(json.dumps({'schema':1,'backend':backend,'profile':profile,'experimental':True,
   'buildRecordSHA256':sha(build/'build-result.json'),'files':{n:record['artifacts'][n] for n in ['remux.mjs','remux.wasm']},
   'qualification':'Explicit local Player remux/transcode opt-in only; not private mpv playback or release qualification.'},indent=2)+'\n')
  print(target)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--builds',type=pathlib.Path,required=True);p.add_argument('--runtime-root',type=pathlib.Path,required=True)
 a=p.parse_args();install(a.builds.resolve(),a.runtime_root.resolve())
