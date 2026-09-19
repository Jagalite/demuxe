#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Diagnostic-only incremental rewind relink. Never a clean build/release record."""
import argparse,hashlib,json,os,shlex,shutil,subprocess,tarfile
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--built',type=Path,required=True);p.add_argument('--rewind',type=Path,required=True);p.add_argument('--archive',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
root=a.built.resolve();rewind=a.rewind.resolve();out=a.output.resolve()
if out.exists():raise SystemExit('Use a new evidence directory')
out.mkdir(parents=True);sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();record={'scope':__doc__,'releaseQualified':False,'freshNativeBuild':False,'inputs':{},'commands':[]}
config=root/'build/beta.emscripten';values={};exec(config.read_text(),values)
env=dict(os.environ,EM_CONFIG=str(config),WEBMPV_EM_CONFIG=str(config),DEMUXE_SDK=str(Path(values['EMSCRIPTEN_ROOT']).parents[1]),DEMUXE_DECODER_SIMD='1')
def run(cmd,cwd,log):
 record['commands'].append({'command':cmd,'cwd':str(cwd)})
 with (out/log).open('w') as f:subprocess.run(cmd,cwd=cwd,env=env,stdout=f,stderr=subprocess.STDOUT,check=True)
try:
 # Only two objects may differ. All existing declarations shared with the old
 # adaptive coordinator must remain identical, including prepared packet layout.
 for name in ['container-task.h','adaptive-session.h']:
  assert sha(root/'build/sources/mpv/demux'/name)==sha(rewind/'build/sources/mpv/demux'/name),name
 for name in ['container-task.c','rewind-reader.c','rewind-reader.h','container-task.h']:
  f=rewind/'build/sources/mpv/demux'/name;record['inputs'][str(f)]=sha(f)
 source=next(c for c in json.loads((root/'build/obj-mpv/compile_commands.json').read_text()) if c['file'].endswith('/container-task.c'))
 command=shlex.split(source['command']);objects=[]
 for name in ['container-task.c','rewind-reader.c']:
  dest=out/('demux_'+name+'.o');cmd=list(command)
  for flag in ['-MQ','-MF','-o']:
   cmd[cmd.index(flag)+1]=str(dest)+('.d' if flag=='-MF' else '')
  cmd[cmd.index('-c')+1]=str(rewind/'build/sources/mpv/demux'/name)
  run(cmd,Path(source['directory']),name+'.log');objects.append(dest)
 library=out/'libmpv.a';original=root/'build/obj-mpv/libmpv.a';shutil.copy2(original,library);record['inputs'][str(original)]=sha(original)
 run([str(Path(values['EMSCRIPTEN_ROOT'])/'emar'),'r',str(library),*map(str,objects)],root,'archive.log')
 for kind in ['hybrid','software-full']:
  destination=out/kind;destination.mkdir()
  if kind=='hybrid':s=(root/'scripts/link-hybrid.sh').read_text();s=s.replace('OUTPUT="$ROOT/web/engine-hybrid"','OUTPUT="'+str(destination)+'"')
  else:
   s=(root/'experiments/software-full/build.sh').read_text();start=s.index('# Do not install over the accepted prefix.');s=s[:s.index('OBJ="$ROOT/build/obj-software-full-ffmpeg"')]+ 'OBJ="$ROOT/build/obj-software-full-ffmpeg"\n'+s[start:];s=s.replace('python3 scripts/compile-software-vo.py','').replace('python3 experiments/software-full/inventory.py','').replace('-o web/engine-software-full/player.mjs','-o '+shlex.quote(str(destination/'player.mjs')))
  start=s.index('ROOT=');end=s.index('\n',start);s=s[:start]+'ROOT='+shlex.quote(str(root))+s[end:]
  s=s.replace('done\nsource scripts/decoder-simd.sh','done\nfor i in "${!LIBS[@]}"; do if [ "${LIBS[$i]}" = -lmpv ]; then LIBS[$i]='+shlex.quote(str(library))+'; fi; done\nsource scripts/decoder-simd.sh')
  script=out/(kind+'.sh');script.write_text(s);record['inputs'][str(script)]=sha(script);run(['bash',str(script)],root,kind+'.log')
 # Retain the known external JS fix and update every consumer-visible asset hash.
 record['inputs'][str(a.archive.resolve())]=sha(a.archive)
 with tarfile.open(a.archive) as tar:tar.extractall(out/'extracted',filter='data')
 package=out/'extracted/package';manifest=json.loads((package/'release-manifest.json').read_text())
 for kind in ['hybrid','software-full']:
  for suffix in ['mjs','wasm']:
   name=f'web/engine-{kind}/player.{suffix}';f=out/kind/('player.'+suffix);shutil.copy2(f,package/name);manifest['files'][name]={'bytes':f.stat().st_size,'sha256':sha(f)}
 manifest['status']='diagnostic-incremental-relink-not-qualified';manifest['engineBuildRecord']=None
 (package/'release-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 archive=out/'diagnostic.tgz'
 with tarfile.open(archive,'w:gz') as tar:tar.add(package,arcname='package')
 record['archiveSHA256']=sha(archive);record['passed']=True;print(archive,flush=True)
finally:
 (out/'result.json').write_text(json.dumps(record,indent=2)+'\n')
