# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import subprocess,json,hashlib,re
r=Path(__file__).parent
odd=lambda x:x if x.bit_count()%2 else x|128
triples=bytes([0xfc,odd(0x14),odd(0x20),0xfc,odd(0x48),odd(0x49),0xfc,odd(0x14),odd(0x2f)])
payload=b'\xb5\0\x31GA94\x03'+bytes([0x43,0xff])+triples+b'\xff';rbsp=bytes([4,len(payload)])+payload+b'\x80';escaped=bytearray();zero=0
for x in rbsp:
 if zero>=2 and x<=3:escaped.append(3);zero=0
 escaped.append(x);zero=zero+1 if x==0 else 0
source=Path('results/top100/configuration/small.h264').read_bytes();candidate=b'\0\0\0\1\x06'+escaped+source;(r/'caption.h264').write_bytes(candidate)
subprocess.run(['ffmpeg','-v','error','-y','-fflags','+genpts','-r','24','-i',str(r/'caption.h264'),'-c','copy',str(r/'caption.mp4')],check=True)
cmd=['ffmpeg','-v','error','-y','-f','lavfi','-i',f'movie={r}/caption.mp4[out0+subcc]','-map','0:s:0','-c:s','srt',str(r/'reference.srt')];p=subprocess.run(cmd,capture_output=True,text=True);(r/'oracle.log').write_text(p.stderr);p.check_returncode();print((r/'reference.srt').read_text())
decode=lambda path:subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-'])
assert decode(r/'caption.h264')==decode('results/top100/configuration/small.h264')
def extract(t35):
 if t35[:8]!=b'\xb5\0\x31GA94\x03':raise ValueError('unrecognized provider')
 count=t35[8]&31;assert t35[8]&64;data=t35[10:10+count*3];text='';display='';enabled=False
 for i in range(0,len(data),3):
  flag,a,b=data[i:i+3]
  if not flag&4 or flag&3:continue
  if a.bit_count()%2!=1 or b.bit_count()%2!=1:raise ValueError('parity')
  a&=127;b&=127
  if (a,b)==(0x14,0x20):enabled=True;text=''
  elif (a,b)==(0x14,0x2f):display=text
  elif enabled and a>=32 and b>=32:text+=chr(a)+chr(b)
 return display
def find_registered(data):
 found=[]
 for nal in re.split(b'\x00\x00(?:\x00)?\x01',data):
  if not nal or nal[0]&31!=6:continue
  rbsp=nal[1:].replace(b'\x00\x00\x03',b'\x00\x00');at=0
  while at<len(rbsp) and rbsp[at]!=128:
   typ=0
   while rbsp[at]==255:typ+=255;at+=1
   typ+=rbsp[at];at+=1;size=0
   while rbsp[at]==255:size+=255;at+=1
   size+=rbsp[at];at+=1
   if at+size>len(rbsp):raise ValueError('SEI bounds')
   if typ==4:found.append(rbsp[at:at+size])
   at+=size
 return found
registered=find_registered(candidate);assert len(registered)==1 and registered[0]==payload
assert extract(registered[0])=='HI' and 'HI' in (r/'reference.srt').read_text();wrong=bytearray(payload);wrong[11]^=128
try:extract(wrong);raise AssertionError('bad parity accepted')
except ValueError:pass
(r/'result.json').write_text(json.dumps({'scope':'Authored valid H264 A53 registered SEI carrying restricted CEA608 pop-on HI, independent FFmpeg608-to-SRT oracle. No full caption renderer/seek state machine.','caption':'HI','independentCaptionOracle':True,'videoPixelsUnchanged':True,'badParityRejected':True,'existingNALBytesUnchanged':candidate.endswith(source),'fixtureSHA256':hashlib.sha256(candidate).hexdigest(),'oracleCommand':cmd,'passed':True},indent=2)+'\n')
