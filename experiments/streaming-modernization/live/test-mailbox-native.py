#!/usr/bin/env python3
"""ASan/UBSan checks of the eight-lane bridge with a simulated mailbox peer."""
import argparse,hashlib,json,subprocess
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--work',required=True,type=Path);p.add_argument('--output',required=True,type=Path);a=p.parse_args();a.output=a.output.resolve();a.output.mkdir();a.work=a.work.resolve();here=Path(__file__).resolve().parent
bridge=here/'files/native/stream_bridge.c';test=here.parent/'concurrent/native-test.c';stub=here.parent/'transport/native-test'
cmd=['clang','-std=c11','-g','-O1','-fsanitize=address,undefined','-pthread',f'-DDEMUXE_BRIDGE_SOURCE="{bridge}"',f'-I{stub}',f'-I{here}/files/native',f'-I{a.work}/build/prefix/include',str(test),'-o',str(a.output/'test')]
result={'scope':__doc__,'command':cmd,'inputs':{str(f):hashlib.sha256(f.read_bytes()).hexdigest() for f in [bridge,bridge.with_suffix('.h'),test,stub/'emscripten.h',stub/'emscripten/threading.h']},'passed':False}
try:
 with (a.output/'compile.log').open('w')as log:subprocess.run(cmd,stdout=log,stderr=subprocess.STDOUT,check=True)
 with (a.output/'test.log').open('w')as log:subprocess.run([str(a.output/'test')],stdout=log,stderr=subprocess.STDOUT,timeout=30,check=True)
 result['passed']=True
except Exception as e:result['error']=str(e)
(a.output/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(result);raise SystemExit(0 if result['passed'] else 1)
