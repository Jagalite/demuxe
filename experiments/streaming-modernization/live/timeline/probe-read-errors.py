#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Sanitized native child MOV reads: short chunks, cancellation, timeout and EOF."""
import argparse, hashlib, json, subprocess, shutil
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
for name in ['native','fixtures','output']:p.add_argument('--'+name,type=Path,required=True)
p.add_argument('--task',type=Path)
a=p.parse_args();out=a.output.resolve();out.mkdir();here=Path(__file__).resolve().parent
task=a.task.resolve() if a.task else here.parent/'subtitles/task';native=a.native.resolve()
files=[here/'read-error-probe.c',task/'container-task.c',task/'webvtt-map.c',here.parents[1]/'integration/task/rewind-reader.c']
libraries=[native/'build'/name/(name+'.a') for name in ['libavformat','libavcodec','libswresample','libavutil']]
cmd=['cc','-g','-fsanitize=address,undefined','-fno-omit-frame-pointer','-I'+str(task),'-I'+str(here.parents[1]/'integration/task'),'-I'+str(native/'source'),'-I'+str(native/'build'),*map(str,files+libraries),'-lxml2','-lm','-lpthread','-o',str(out/'probe')]
sha=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
inputs={str(f):sha(f) for f in files+libraries+[Path(__file__),*sorted(task.glob('*.h')),here.parents[1]/'integration/task/rewind-reader.h',a.fixtures/'low/000.m4s',a.fixtures/'low/init.mp4']}
with (out/'compile.log').open('w') as log:subprocess.run(cmd,stdout=log,stderr=subprocess.STDOUT,check=True)
for f in files+[Path(__file__),*sorted(task.glob('*.h'))]:shutil.copy2(f,out/f.name)
cases=[]
for chunk,fault,phase in [(1,'none','packet'),(13,'none','packet'),(8192,'none','packet')]+[(13,fault,phase) for phase in ['packet','header'] for fault in ['cancel','timeout','io','eof']]:
    name=f'{chunk}-{fault}-{phase}'
    with (out/(name+'.stdout')).open('w') as stdout,(out/(name+'.stderr')).open('w') as stderr:
        r=subprocess.run([str(out/'probe'),str(a.fixtures.resolve()),str(chunk),fault,phase],stdout=stdout,stderr=stderr,timeout=20)
    cases.append({'name':name,'exit':r.returncode,'stdout':(out/(name+'.stdout')).read_text(),'stderrSHA256':sha(out/(name+'.stderr')),'passed':r.returncode==0})
record={'scope':__doc__,'inputs':inputs,'command':cmd,'cases':cases,'passed':all(c['passed'] for c in cases)}
(out/'result.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps({'passed':record['passed'],'cases':cases}));raise SystemExit(0 if record['passed'] else 1)
