#!/usr/bin/env python3
"""Compile the real transport bridge with a native simulated mailbox peer."""
import argparse, hashlib, json, subprocess
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--work',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
a=p.parse_args();w=a.work.resolve();o=a.output.resolve();test=Path(__file__).resolve().parent/'native-test';bridge=test.parent/'files/native'
if o.exists():raise SystemExit('Use a new evidence directory')
o.mkdir(parents=True)
command=['clang','-std=c11','-g','-O1','-fsanitize=address,undefined','-pthread','-I'+str(test),'-I'+str(bridge),'-I'+str(w/'native'),'-I'+str(w/'build/prefix/include'),str(test/'bridge.c'),'-o',str(o/'bridge-test')]
record={'scope':'Native C with injected AVIO and mailbox peer; no browser playback claim','command':command,'inputs':{}}
for f in [test/'bridge.c',test/'emscripten.h',test/'emscripten/threading.h',bridge/'stream_bridge.c',w/'native/stream_bridge.h']:
 record['inputs'][str(f)]=hashlib.sha256(f.read_bytes()).hexdigest()
with (o/'compile.log').open('w') as log:record['compileExit']=subprocess.run(command,stdout=log,stderr=subprocess.STDOUT).returncode
if record['compileExit']==0:
 with (o/'test.log').open('w') as log:record['testExit']=subprocess.run([str(o/'bridge-test')],stdout=log,stderr=subprocess.STDOUT,timeout=20).returncode
record['passed']=record.get('testExit')==0
(o/'result.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record,indent=2));raise SystemExit(0 if record['passed'] else 1)
