# SPDX-License-Identifier: Apache-2.0
import subprocess,concurrent.futures,hashlib,json,time
from pathlib import Path
root=Path(__file__).parent;commands=[]
def ff(args,capture=False):
 cmd=['ffmpeg','-v','error','-y']+args;commands.append(cmd)
 return subprocess.check_output(cmd) if capture else subprocess.run(cmd,check=True)
ff(['-f','lavfi','-i','testsrc=s=160x96:r=12:d=1','-pix_fmt','bgr0','-c:v','ffv1',str(root/'whole.mkv')])
for i,(x,y) in enumerate([(0,0),(80,0),(0,48),(80,48)]):ff(['-i',str(root/'whole.mkv'),'-vf',f'crop=80:48:{x}:{y}','-c:v','ffv1',str(root/f'q{i}.mkv')])
def decode(file):return ff(['-i',str(file),'-pix_fmt','bgr0','-fps_mode','passthrough','-f','rawvideo','-'],True)
reference=decode(root/'whole.mkv')
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:parts=list(pool.map(decode,[root/f'q{i}.mkv' for i in range(4)]))
def assemble(parts):
 output=bytearray()
 for n in range(12):
  for row in range(96):
   for col in range(2):
    q=(row//48)*2+col;off=(n*48+row%48)*80*4;output.extend(parts[q][off:off+80*4])
 return bytes(output)
actual=assemble(parts);assert actual==reference
bad=parts.copy();bad[0],bad[1]=bad[1],bad[0];assert assemble(bad)!=reference
result={'scope':'Prepared independent FFV1 quadrant streams; four separate host decoder processes, not extraction from original bitstream slices or browser integration. No timing claim.','frames':12,'exact':True,'swappedQuadrantRejected':True,'wholeBytes':(root/'whole.mkv').stat().st_size,'quadrantBytes':sum((root/f'q{i}.mkv').stat().st_size for i in range(4)),'rawSha256':hashlib.sha256(actual).hexdigest(),'commands':commands}
(root/'result.json').write_text(json.dumps(result,indent=2)+'\n')
