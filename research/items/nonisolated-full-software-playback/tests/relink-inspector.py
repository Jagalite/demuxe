#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Research inspector relink with recorded existing libraries; not a clean release build."""
import argparse,datetime,hashlib,importlib.util,json,os,shutil,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main(a):
 out=a.out.resolve();out.mkdir()
 spec=importlib.util.spec_from_file_location('prepare',ROOT/'experiments/jspi-asyncify/ffmpeg/scripts/prepare-ffmpeg.py');prepare=importlib.util.module_from_spec(spec);spec.loader.exec_module(prepare)
 for runtime in ['jspi','asyncify']:
  base=a.builds.resolve()/f'remux-{runtime}-02';folder=out/runtime;folder.mkdir();target=out/'web'/f'engine-remux-{runtime}';target.mkdir(parents=True)
  previous=json.loads((base/'build-result.json').read_text())
  if previous['status']!='build_completed_only':raise ValueError('Incomplete base build')
  for name,digest in previous['artifacts'].items():
   if sha(base/'engine'/name)!=digest:raise ValueError('Base artifact drift')
  source=folder/'remux.c';source.write_text(prepare.patch_remux((ROOT/'native/remux/remux.c').read_text()))
  commands=json.loads((base/'commands.json').read_text());command=next(c['argv'] for c in commands if '-sMODULARIZE=1' in c['argv'])
  command=[str(a.sdk.resolve()/'upstream/emscripten/emcc') if x=='emcc' else str(source) if x.endswith('/native/remux/remux.c') else str(target/'remux.mjs') if x==str(base/'engine/remux.mjs') else '-Wl,-Map,'+str(folder/'remux.map') if x.startswith('-Wl,-Map,') else x for x in command]
  for i,arg in enumerate(command):
   if arg.startswith('-sJSPI_EXPORTS=') or arg.startswith('-sEXPORTED_FUNCTIONS='):
    key,value=arg.split('=',1);names=json.loads(value);names.append('_rm_set_demuxer' if key=='-sEXPORTED_FUNCTIONS' else 'rm_set_demuxer');command[i]=key+'='+json.dumps(names)
  inputs=[Path(x) for x in command if x.endswith('.a')]+[source,base/'build-result.json',base/'commands.json',base/'objects/config.h',base/'objects/config_components.h',ROOT/'native/remux/remux.c',ROOT/'experiments/jspi-asyncify/ffmpeg/scripts/prepare-ffmpeg.py',Path(__file__).resolve()]
  record={'scope':'Research relink from recorded existing FFmpeg libraries; clean release build still required','startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'runtime':runtime,'command':command,'inputs':{str(p):sha(p) for p in inputs},'status':'building'}
  config=folder/'emscripten.config';sdk=a.sdk.resolve();config.write_text(f'LLVM_ROOT={str(sdk/"upstream/bin")!r}\nBINARYEN_ROOT={str(sdk/"upstream")!r}\nNODE_JS={shutil.which("node")!r}\nCACHE={str(folder/"em-cache")!r}\n')
  env={**os.environ,'EM_CONFIG':str(config),'EM_CACHE':str(folder/'em-cache'),'EMCC_CFLAGS':''};env.pop('EMMAKEN_CFLAGS',None)
  result=folder/'result.json';result.write_text(json.dumps(record,indent=2)+'\n')
  with (folder/'link.log').open('w') as log:subprocess.run(command,cwd=ROOT,env=env,stdout=log,stderr=subprocess.STDOUT,check=True)
  with (folder/'audit.json').open('w') as audit:subprocess.run(['node',str(ROOT/'experiments/jspi-asyncify/scripts/audit-wasm.mjs'),str(target/'remux.wasm'),'--emscripten','--backend='+runtime,'--profile=remux'],stdout=audit,check=True)
  for name,digest in record['inputs'].items():
   if sha(Path(name))!=digest:raise ValueError('Relink input changed: '+name)
  record.update(status='linked-and-audited',artifacts={p.name:sha(p) for p in target.iterdir()});result.write_text(json.dumps(record,indent=2)+'\n')
  (target/'manifest.json').write_text(json.dumps({'schema':1,'backend':runtime,'profile':'remux','experimental':True,'files':record['artifacts'],'buildRecordSHA256':sha(result),'qualification':record['scope']},indent=2)+'\n');print(target,flush=True)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--builds',type=Path,required=True);p.add_argument('--sdk',type=Path,required=True);p.add_argument('--out',type=Path,required=True);main(p.parse_args())
