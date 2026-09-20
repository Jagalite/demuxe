# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import sys,json,struct,subprocess
p=Path(sys.argv[1]);j=json.loads((p/'browser-results.json').read_text());rows={}
for name in ['baseline','candidate']:
 chunks=j[name]['chunks'];header=struct.pack('<4sHH4sHHIIII',b'DKIF',0,32,b'VP90',128,96,24,1,len(chunks),0);body=b''.join(struct.pack('<IQ',len(c['bytes']),n)+bytes(c['bytes'])for n,c in enumerate(chunks));(p/f'{name}.ivf').write_bytes(header+body);cmd=['ffmpeg','-v','error','-i',str(p/f'{name}.ivf'),'-f','rawvideo','-pix_fmt','yuv420p','-y',str(p/f'{name}-host.yuv')];q=subprocess.run(cmd,capture_output=True,text=True);assert q.returncode==0,q.stderr;rows[name]={'command':cmd,'bytes':(p/f'{name}-host.yuv').stat().st_size}
a=(p/'baseline-host.yuv').read_bytes();b=(p/'candidate-host.yuv').read_bytes();rows['comparison']={'equal':a==b,'mismatches':sum(x!=y for x,y in zip(a,b)),'maximum_error':max(abs(x-y)for x,y in zip(a,b)),'first_differences':[(i,x,y)for i,(x,y)in enumerate(zip(a,b))if x!=y][:20]};(p/'host-output.json').write_text(json.dumps(rows,indent=2)+'\n');print(rows['comparison'])
