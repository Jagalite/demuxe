#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Resume an interrupted FFmpeg make in a provenance-bound private build."""
import argparse,datetime,hashlib,json,os,shutil,subprocess
from pathlib import Path
from provenance import link_inputs

def digest(path):return hashlib.file_digest(path.open('rb'),'sha256').hexdigest()
def main(args):
 out=args.out.resolve();record_path=out/'build-result.json';state=json.loads(record_path.read_text())
 if state.get('status')!='building' or state.get('profile') not in ('playback','playback-full'):raise ValueError('Interrupted playback build required')
 last=state['commands'][-1]
 if last['argv'][:2]!=['make','-j'] or Path(last['cwd'])!=out/'objects/ffmpeg' or 'returncode' in last:raise ValueError('Only interrupted FFmpeg compilation is resumable')
 sdk=Path(state['toolchain']['sdk']);em=sdk/'upstream/emscripten';prefix=out/'prefix'
 for name,wanted in state['inputSHA256'].items():
  if digest(out/name)!=wanted:raise ValueError('Recorded input drift: '+name)
 for key,rel in [('clangSHA256','upstream/bin/clang'),('wasmOptSHA256','upstream/bin/wasm-opt'),('emccSHA256','upstream/emscripten/emcc.py')]:
  if digest(sdk/rel)!=state['toolchain'][key]:raise ValueError('SDK drift')
 tag=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
 (out/('interrupted-build-'+tag+'.json')).write_bytes(record_path.read_bytes());last['interrupted']=True
 state['resumedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat()
 flags=['-O2','-msimd128','-ffile-prefix-map='+str(out)+'=/demuxe-mpv-private']
 env={**os.environ,'PATH':str(em)+os.pathsep+str(args.tools.resolve())+os.pathsep+os.environ['PATH'],'EM_CONFIG':str(out/'emscripten.config'),'EM_CACHE':str(out/'em-cache'),'PKG_CONFIG_LIBDIR':str(prefix/'lib/pkgconfig'),'PKG_CONFIG_PATH':'','EM_PKG_CONFIG_PATH':str(prefix/'lib/pkgconfig'),'SOURCE_DATE_EPOCH':'1740000000','CFLAGS':' '.join(flags),'CXXFLAGS':' '.join(flags),'LDFLAGS':'','CPPFLAGS':'','LIBS':'','EMCC_CFLAGS':''};env.pop('EMMAKEN_CFLAGS',None)
 def save():record_path.write_text(json.dumps(state,indent=2)+'\n')
 def run(argv,cwd=out):
  argv=list(map(str,argv));log=f'{len(state["commands"])+1:03d}.log';entry={'argv':argv,'cwd':str(cwd),'log':log};state['commands'].append(entry);save()
  with (out/'logs'/log).open('w') as f:entry['returncode']=subprocess.run(argv,cwd=cwd,env=env,stdout=f,stderr=subprocess.STDOUT).returncode
  save()
  if entry['returncode']:raise RuntimeError('Build failed: '+log)
 try:
  run(['make','-j',args.jobs],out/'objects/ffmpeg');run(['make','install'],out/'objects/ffmpeg')
  obj=out/'objects/mpv'
  if obj.exists():raise ValueError('mpv build already exists; unexpected resume phase')
  run(['meson','setup',obj,out/'sources/mpv','--cross-file',out/'cross.ini','--prefix',prefix,'--libdir','lib','--default-library','static','--buildtype','release','--wrap-mode','nofallback','-Dauto_features=disabled','-Dgpl=false','-Dlibmpv=true','-Dcplayer=false','-Dgl=disabled','-Dlua=disabled','-Dbuild-date=false','-Dzlib=enabled'])
  header=obj/'config.h';header.write_text(header.read_text().replace(str(out),'/demuxe-mpv-private'))
  run(['ninja','-C',obj,'-j',args.jobs]);run(['meson','install','-C',obj])
  state['archives']={str(p.relative_to(out)):digest(p) for p in (prefix/'lib').glob('*.a')};state['linkInputSHA256']=link_inputs(out);state['status']='built_dependencies_only'
 except Exception as error:state.update(status='failed',error=str(error));raise
 finally:save()

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--out',type=Path,required=True);p.add_argument('--tools',type=Path,required=True);p.add_argument('--jobs',type=int,default=4);main(p.parse_args())
