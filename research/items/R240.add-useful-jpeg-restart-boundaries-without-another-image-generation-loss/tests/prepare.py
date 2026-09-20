# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import subprocess,json,sys,shutil
r=Path(sys.argv[1]);source=Path(sys.argv[2]);shutil.copy(source,r/'original.jpg');subprocess.run(['jpegtran','-copy','none','-restart','1','-outfile',str(r/'restart.jpg'),str(source)],check=True)
def parse(d):
 i=2;sof=None;dri=None
 while i<len(d):
  t=d[i+1];n=int.from_bytes(d[i+2:i+4],'big')
  if t==0xc0:sof=i
  if t==0xdd:dri=int.from_bytes(d[i+4:i+6],'big')
  i+=n+2
  if t==0xda:break
 assert dri==64;scan=d[i:];segments=[];start=0;j=0
 while j<len(scan)-1:
  if scan[j]==255 and 0xd0<=scan[j+1]<=0xd7:segments.append(scan[start:j]);start=j+2;j+=2
  elif scan[j:j+2]==b'\xff\xd9':segments.append(scan[start:j]);break
  else:j+=1
 assert len(segments)==64;return d[:i],segments,sof
header,segments,sof=parse((r/'restart.jpg').read_bytes());a=json.loads(subprocess.check_output(['build/catalogue-tools/jpeg-coefficients',str(r/'original.jpg')]));b=json.loads(subprocess.check_output(['build/catalogue-tools/jpeg-coefficients',str(r/'restart.jpg')]));assert a==b
full=subprocess.check_output(['ffmpeg','-v','error','-i',str(r/'original.jpg'),'-f','rawvideo','-pix_fmt','gray','-']);regions=[]
for start in [0,16,32,48]:
 h=bytearray(header);h[sof+5:sof+7]=(64).to_bytes(2,'big');data=bytes(h)+b''.join(segments[start+k]+(b'\xff'+bytes([0xd0+k]) if k<7 else b'\xff\xd9') for k in range(8));f=r/f'region{start}.jpg';f.write_bytes(data);actual=subprocess.check_output(['ffmpeg','-v','error','-i',str(f),'-f','rawvideo','-pix_fmt','gray','-']);expected=full[start*8*512:(start*8+64)*512];assert actual==expected;regions.append({'row':start,'pixels_exact':True,'bytes':len(data)})
(r/'prepare-results.json').write_text(json.dumps({'all_coefficients_exact':len(a['blocks'])*64,'regions':regions,'original_bytes':(r/'original.jpg').stat().st_size,'restart_bytes':(r/'restart.jpg').stat().st_size,'restart_interval_MCUs':64},indent=2))
