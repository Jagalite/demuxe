#!/usr/bin/env python3
"""Compile isolated generalized container tasks and parse real AAC/WebVTT packets."""
import argparse,hashlib,json,subprocess
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--native',required=True,type=Path);p.add_argument('--fixtures',required=True,type=Path);p.add_argument('--output',required=True,type=Path);a=p.parse_args();a.output=a.output.resolve();a.output.mkdir();a.native=a.native.resolve();a.fixtures=a.fixtures.resolve()
here=Path(__file__).resolve().parent;task=here/'task';original=here.parent/'integration/task'
cmd=['cc','-O2','-g',f'-I{task}',f'-I{original}',f'-I{a.native}/build',f'-I{a.native}/source',str(task/'media-task-probe.c'),str(task/'container-task.c'),str(original/'rewind-reader.c')]+[str(a.native/'build'/lib/f'{lib}.a') for lib in ['libavformat','libavcodec','libswresample','libavutil']]+['-lxml2','-lm','-lpthread','-o',str(a.output/'probe')]
with (a.output/'compile.log').open('w')as log:subprocess.run(cmd,stdout=log,stderr=subprocess.STDOUT,check=True)
for i in range(3):(a.output/f'cue-{i}.vtt').write_text(f'WEBVTT\n\n{i}\n00:00:{i*2+.25:06.3f} --> 00:00:{i*2+1.75:06.3f}\nCue {i}\n')
oversized=a.output/'oversized';oversized.mkdir();(oversized/'cue-0.vtt').write_text('WEBVTT\n\nNOTE\n'+'x'*100000+'\n')
results=[]
for kind,fixture in [('audio',a.fixtures),('subtitle',a.output),('oversized',oversized)]:
 with (a.output/(kind+'.stdout')).open('w')as out,(a.output/(kind+'.stderr')).open('w')as err:r=subprocess.run([str(a.output/'probe'),kind,str(fixture)],stdout=out,stderr=err,timeout=20)
 results.append({'kind':kind,'exit':r.returncode,'output':(a.output/(kind+'.stdout')).read_text()})
inputs={str(f):hashlib.sha256(f.read_bytes()).hexdigest() for f in [task/'container-task.c',task/'container-task.h',task/'media-task-probe.c',original/'rewind-reader.c',original/'rewind-reader.h']}
(a.output/'result.json').write_text(json.dumps({'scope':__doc__,'compile':cmd,'inputs':inputs,'results':results,'passed':all(r['exit']==0 for r in results)},indent=2)+'\n');print(results);raise SystemExit(0 if all(r['exit']==0 for r in results) else 1)
