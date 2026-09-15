#!/usr/bin/env python3
"""Real FFmpeg MOV/software decode at short-read boundaries; no mpv playback claim."""
import argparse,hashlib,json,os,shlex,subprocess
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--build',type=Path,required=True)
p.add_argument('--fixtures',type=Path,required=True)
p.add_argument('--output',type=Path,required=True)
p.add_argument('--wasm',action='store_true')
a=p.parse_args();root=a.build.resolve();out=a.output.resolve();source=Path(__file__).resolve().parent/'task'
if out.exists():raise SystemExit('Use a new evidence directory')
out.mkdir(parents=True);env=dict(os.environ)
files=[source/'rewind-reader.c',source/'rewind-reader.h',source/'container-read-probe.c']
fixtures=[a.fixtures.resolve()/'low/init.mp4',a.fixtures.resolve()/'low/000.m4s']
if a.wasm:
 config=root/'build/beta.emscripten';values={};exec(config.read_text(),values)
 compiler=str(Path(values['EMSCRIPTEN_ROOT'])/'emcc');env['EM_CONFIG']=str(config)
 obj=root/'build/obj-software-full-ffmpeg';headers=root/'build/sources/ffmpeg';executable=out/'probe.cjs'
 extra=['-L'+str(root/'build/prefix/lib'),'-L'+str(root/'build/prefix-playback/lib'),'-lxml2','-ldav1d','-lz','-lm','-pthread','-msimd128','-sWASMFS=1','-sSTACK_SIZE=2097152','-sPTHREAD_POOL_SIZE=4','-sALLOW_MEMORY_GROWTH=1','-sENVIRONMENT=node','-sEXIT_RUNTIME=1','-sASSERTIONS=1']
 for f in fixtures:extra+=['--embed-file',str(f)+'@/'+f.name]
 runner=[values['NODE_JS'],str(executable)];names=['/'+f.name for f in fixtures]
else:
 compiler='cc';obj=root/'build';headers=root/'source';executable=out/'probe'
 extra=[*shlex.split(subprocess.check_output(['pkg-config','--libs','libxml-2.0'],text=True)),'-lm','-lpthread','-fsanitize=address,undefined','-fno-omit-frame-pointer']
 runner=[str(executable)];names=list(map(str,fixtures))
libs=[obj/lib/(lib+'.a') for lib in ['libavformat','libavcodec','libswresample','libavutil']]
cmd=[compiler,'-O1','-g','-I'+str(headers),'-I'+str(obj),'-I'+str(source),str(files[0]),str(files[2]),*map(str,libs),*extra,'-o',str(executable)]
record={'scope':__doc__,'wasm':a.wasm,'releaseQualified':False,'compile':cmd,'inputs':{str(f):hashlib.sha256(f.read_bytes()).hexdigest() for f in [Path(__file__),*files,*fixtures,*libs]},'cases':[]}
try:
 with (out/'compile.log').open('w') as log:subprocess.run(cmd,env=env,stdout=log,stderr=subprocess.STDOUT,check=True)
 record['executableSHA256']=hashlib.sha256(executable.read_bytes()).hexdigest()
 for chunk in [1,7,127,511,512,513,1024,4096,32768]:
  command=[*runner,*names,str(chunk)];r=subprocess.run(command,capture_output=True,text=True,timeout=60)
  (out/f'{chunk}.log').write_text(r.stdout+r.stderr);events=[json.loads(line) for line in r.stdout.splitlines() if line.startswith('{')]
  record['cases'].append({'command':command,'passed':r.returncode==0 and bool(events) and events[-1].get('passed',False),'events':events})
  print(chunk,record['cases'][-1]['passed'],flush=True)
finally:
 record['passed']=len(record['cases'])==9 and all(c['passed'] for c in record['cases'])
 (out/'result.json').write_text(json.dumps(record,indent=2)+'\n')
raise SystemExit(0 if record['passed'] else 1)
