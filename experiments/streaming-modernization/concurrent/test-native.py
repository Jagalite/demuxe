#!/usr/bin/env python3
"""Sanitize the actual native bridge with an injected concurrent mailbox peer."""
import argparse,hashlib,json,subprocess
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--work',required=True,type=Path);p.add_argument('--headers',required=True,type=Path);p.add_argument('--output',required=True,type=Path)
a=p.parse_args();work=a.work.resolve();headers=a.headers.resolve();out=a.output.resolve();out.mkdir()
root=Path(__file__).resolve().parent;mock=root.parent/'transport/native-test';bridge=work/'native/stream_bridge.c'
cmd=['clang','-std=c11','-g','-O1','-fsanitize=address,undefined','-pthread',f'-DDEMUXE_BRIDGE_SOURCE="{bridge}"','-I'+str(mock),'-I'+str(work/'native'),'-I'+str(headers),str(root/'native-test.c'),'-o',str(out/'test')]
files=[bridge,work/'native/stream_bridge.h',root/'native-test.c',mock/'emscripten.h',mock/'emscripten/threading.h',Path(__file__)]
sha=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
r={'scope':__doc__,'browserPlayback':False,'command':cmd,'inputs':{str(f):sha(f) for f in files}}
with (out/'compile.log').open('w') as log:r['compileExit']=subprocess.run(cmd,stdout=log,stderr=subprocess.STDOUT).returncode
if r['compileExit']==0:
 with (out/'test.log').open('w') as log:r['testExit']=subprocess.run([str(out/'test')],stdout=log,stderr=subprocess.STDOUT,timeout=30).returncode
 r['binarySHA256']=sha(out/'test');r['testLogSHA256']=sha(out/'test.log')
r['passed']=r.get('testExit')==0;r['compileLogSHA256']=sha(out/'compile.log');(out/'result.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({'passed':r['passed'],'compileExit':r['compileExit'],'testExit':r.get('testExit')}));raise SystemExit(0 if r['passed'] else 1)
