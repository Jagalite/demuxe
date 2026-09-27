#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Freeze current Player sources, exact catalogue fixtures and verified private builds."""
import argparse,hashlib,json,pathlib,shutil,subprocess
ROOT=pathlib.Path(__file__).resolve().parents[2]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def prepare(a):
 out=a.out.resolve();out.mkdir(parents=True,exist_ok=False)
 parent=a.fixtures.resolve();original=json.loads((parent/'manifest.json').read_text())
 catalogue=json.loads((parent/'fixtures/catalogue.json').read_text())
 keys=['h264-ts','h264-ac3-stereo','hevc10-ac3']
 sources=sorted((ROOT/'src').rglob('*.ts'))+sorted((ROOT/'web').glob('*.js'))+sorted((ROOT/'web/private-ffmpeg').glob('*.js'))
 before={str(p.relative_to(ROOT)):sha(p) for p in sources}
 web=out/'demuxe/web';web.mkdir(parents=True)
 for p in (ROOT/'web').glob('*.js'):shutil.copyfile(p,web/p.name)
 shutil.copytree(ROOT/'web/private-ffmpeg',web/'private-ffmpeg')
 command=['node','node_modules/typescript/bin/tsc','--project','tsconfig.json','--outDir',str(web/'generated')]
 subprocess.run(command,cwd=ROOT,check=True)
 engines={};builds={}
 for runtime in ['jspi','asyncify']:
  for profile,attempt,target in [('remux','02','remux'),('transcode','05','adaptation')]:
   build=a.builds/f'{profile}-{runtime}-{attempt}';record=json.loads((build/'build-result.json').read_text())
   assert record['status']=='build_completed_only' and record['suspension']==runtime
   for name,digest in record['artifacts'].items():assert sha(build/'engine'/name)==digest,(build,name)
   for name,digest in record['sourceSHA256'].items():
    p=pathlib.Path(name);p=p if p.is_absolute() else build/p
    assert sha(p)==digest,p
   folder=f'engine-{target}-{runtime}';destination=web/folder;destination.mkdir()
   for name in ['remux.mjs','remux.wasm']:shutil.copyfile(build/'engine'/name,destination/name)
   (destination/'build-result.json').write_text(json.dumps(record,indent=2)+'\n')
   engines[folder]=True;builds[folder]={'build':str(build.resolve()),'recordSHA256':sha(build/'build-result.json')}
 # Freeze the maintained pthread reference from the supplied current runtime.
 for folder in ['engine-remux','engine-adaptation']:
  source=a.runtime/'web'/folder
  shutil.copytree(source,web/folder);engines[folder]=True
 for name in ['engine-hybrid','engine-selective','engine-subtitles','engine-software-full','engine-software-yuv','engine-ass']:engines[name]=False
 fixtures=out/'fixtures';fixtures.mkdir()
 for key in keys:
  name='fixtures/'+catalogue[key]['file'];source=parent/name
  assert sha(source)==original['files'][name]['sha256'],name
  destination=out/name;destination.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,destination)
 (fixtures/'catalogue.json').write_text(json.dumps({k:catalogue[k] for k in keys},indent=2)+'\n')
 (out/'commands.json').write_text(json.dumps([{'argv':command,'cwd':str(ROOT),'exit':0}],indent=2)+'\n')
 assert before=={str(p.relative_to(ROOT)):sha(p) for p in sources},'Source changed during snapshot'
 preparation=out/'preparation';preparation.mkdir()
 shutil.copyfile(__file__,preparation/'prepare-private-remux.py')
 shutil.copyfile(parent/'manifest.json',preparation/'fixture-parent-manifest.json')
 for p in sources:
  destination=preparation/'sources'/p.relative_to(ROOT);destination.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,destination)
 manifest={'schema':1,'fixture':original['fixture'],'fixture_parent':{'path':str(parent),'sha256':sha(parent/'manifest.json')},
  'git_revision':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'source_sha256':before,
  'engines':engines,'privateBuilds':builds,'limits':['Private runtime opt-in: file remux and FLAC24 only; no mpv private playback qualification.'],
  'files':{str(p.relative_to(out)):{'sha256':sha(p),'bytes':p.stat().st_size} for p in sorted(out.rglob('*')) if p.is_file()}}
 (out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(out)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--out',type=pathlib.Path,required=True);p.add_argument('--fixtures',type=pathlib.Path,required=True);p.add_argument('--runtime',type=pathlib.Path,required=True);p.add_argument('--builds',type=pathlib.Path,required=True);prepare(p.parse_args())
