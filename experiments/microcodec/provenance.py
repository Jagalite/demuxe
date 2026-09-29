#!/usr/bin/env python3
import pathlib,json,hashlib,subprocess,platform,os
r=pathlib.Path.cwd();out=r/'results/microcodec';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();base=r/'build/microcodec'
files=[p for p in (r/'experiments/microcodec').iterdir() if p.is_file()]+[r/'sources.lock.json',r/'native/remux/remux.c',r/'native/adaptation/flac.h',r/'web/engine-adaptation/manifest.json',r/'web/engine-adaptation/remux.wasm',r/'web/engine-remux/remux.wasm']
builds={}
for p in base.iterdir():
 if not (p/'provenance.json').exists():continue
 builds[p.name]=json.loads((p/'provenance.json').read_text())
 if (p/'config_components.h').exists():builds[p.name]['enabledComponents']=[x for x in (p/'config_components.h').read_text().splitlines() if x.endswith(' 1')]
 if (p/'ffbuild/config.mak').exists():builds[p.name]['effectiveCflags']=next(x for x in (p/'ffbuild/config.mak').read_text().splitlines() if x.startswith('CFLAGS='))
 for f in ['module.wasm','module.mjs','config.h','config_components.h','ffbuild/config.mak']:
  if (p/f).exists():files.append(p/f)
fixture=json.loads((base/'fixtures/manifest.json').read_text())
sdk=(r/'build/emsdk-4.0.14').resolve();env={**os.environ,'EM_CONFIG':str(base/'emscripten.config')}
data={'gitHead':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'platform':platform.platform(),'machine':subprocess.check_output(['sysctl','-n','machdep.cpu.brand_string'],text=True).strip(),'node':subprocess.check_output(['node','--version'],text=True).strip(),'emscripten':subprocess.check_output([str(sdk/'upstream/emscripten/emcc'),'--version'],text=True,env=env),'sdkResolved':str(sdk),'files':{str(p.relative_to(r)):{'sha256':sha(p),'bytes':p.stat().st_size} for p in files},'builds':builds,'fixtures':fixture,'scope':'Dirty shared checkout; only experiments/microcodec, MICROCODEC-POC.md, build/microcodec and results/microcodec written by this task.'}
(out/'provenance.json').write_text(json.dumps(data,indent=2)+'\n')
