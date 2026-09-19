#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Native ownership/control tests with sanitizers; no playback qualification."""
import argparse,hashlib,json,shlex,subprocess
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--native',type=Path,required=True);p.add_argument('--fixtures',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
here=Path(__file__).resolve().parent;root=a.native.resolve();out=a.output.resolve()
if out.exists():raise SystemExit('Use a new evidence directory')
out.mkdir(parents=True)
libs=[root/'build'/lib/(lib+'.a') for lib in ['libavformat','libavcodec','libswresample','libavutil']]
cases={'control':['session-control.c','control-test.c'],'history':['quality-history-test.c'],'rewind':['rewind-reader.c','rewind-reader-test.c'],'random-access':['random-access.c','random-access-test.c'],'task-cancel':['container-task.c','rewind-reader.c','task-cancel-test.c'],'plan-metadata':['plan-metadata-test.c']}
record={'scope':__doc__,'releaseQualified':False,'inputs':{str(f):hashlib.sha256(f.read_bytes()).hexdigest() for f in [Path(__file__),*here.glob('task/*.[ch]'),*here.glob('include/common/*.h'),*libs]},'cases':[]}
try:
 for name,names in cases.items():
  cmd=['cc','-O1','-g','-fsanitize=address,undefined','-fno-omit-frame-pointer','-I'+str(root/'source'),'-I'+str(root/'build'),'-I'+str(here/'include'),*[str(here/'task'/n) for n in names],*map(str,libs),*shlex.split(subprocess.check_output(['pkg-config','--libs','libxml-2.0'],text=True)),'-lpthread','-lm','-o',str(out/name)]
  with (out/(name+'-compile.log')).open('w') as log:subprocess.run(cmd,stdout=log,stderr=subprocess.STDOUT,check=True)
  run=[str(out/name)]+([str(a.fixtures.resolve())] if name=='task-cancel' else [str(a.fixtures.resolve()/'dash/manifest.mpd')] if name=='plan-metadata' else [])
  r=subprocess.run(run,capture_output=True,text=True,timeout=30);(out/(name+'.log')).write_text(r.stdout+r.stderr)
  record['cases'].append({'name':name,'compile':cmd,'run':run,'passed':r.returncode==0});print(name,r.returncode==0,flush=True)
finally:
 record['passed']=len(record['cases'])==len(cases) and all(c['passed'] for c in record['cases']);(out/'result.json').write_text(json.dumps(record,indent=2)+'\n')
raise SystemExit(0 if record['passed'] else 1)
