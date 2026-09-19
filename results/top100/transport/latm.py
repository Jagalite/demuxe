# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import json,subprocess,hashlib
r=Path(__file__).parent
class Bits:
 def __init__(self,b):self.b=b;self.p=0
 def get(self,n):
  if self.p+n>len(self.b)*8:raise ValueError('Truncated LATM')
  v=0
  for _ in range(n):v=v*2+((self.b[self.p//8]>>(7-self.p%8))&1);self.p+=1
  return v

def unwrap(data):
 pos=0;config=None;frames=[]
 while pos<len(data):
  if pos+3>len(data) or data[pos]!=0x56 or data[pos+1]&0xe0!=0xe0:raise ValueError('LOAS sync')
  size=((data[pos+1]&31)<<8)|data[pos+2];pos+=3
  if pos+size>len(data):raise ValueError('LOAS length')
  b=Bits(data[pos:pos+size]);pos+=size
  reuse=b.get(1)
  if not reuse:
   if b.get(1)!=0:raise ValueError('audioMuxVersion unsupported')
   if b.get(1)!=1 or b.get(6)!=0 or b.get(4)!=0 or b.get(3)!=0:raise ValueError('Only same-time single program/layer/subframe')
   obj=b.get(5);freq=b.get(4);ch=b.get(4)
   if obj!=2 or freq>=13 or ch<1 or ch>7:raise ValueError('Only explicit AAC LC indexed-rate channel layout')
   if b.get(1)!=0 or b.get(1)!=0 or b.get(1)!=0:raise ValueError('GA flags unsupported')
   if b.get(3)!=0:raise ValueError('frameLengthType unsupported')
   b.get(8)
   if b.get(1):raise ValueError('otherData unsupported')
   if b.get(1):raise ValueError('CRC configuration unsupported')
   nextconfig=(obj,freq,ch)
   if config and config!=nextconfig:raise ValueError('Configuration changed')
   config=nextconfig
  if config is None:raise ValueError('Missing stream mux config')
  size=0
  while True:
   v=b.get(8);size+=v
   if v!=255:break
  if size>8191-7:raise ValueError('ADTS budget')
  payload=bytes(b.get(8) for _ in range(size));obj,freq,ch=config;n=size+7
  hdr=bytes([255,241,((obj-1)<<6)|(freq<<2)|(ch>>2),((ch&3)<<6)|(n>>11),(n>>3)&255,((n&7)<<5)|31,252]);frames.append(hdr+payload)
 return b''.join(frames),config,len(frames)
b=(r/'audio.latm').read_bytes();out,config,frames=unwrap(b);(r/'unwrapped.aac').write_bytes(out)
def decode(path):return subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','f32le','-'])
a=decode(r/'audio.latm');c=decode(r/'unwrapped.aac');assert a==c
controls={}
for name,bad in [('truncated',b[:-1]),('bad-sync',bytes([0])+b[1:]),('missing-initial-config',b[:3]+bytes([b[3]|128])+b[4:])]:
 try:unwrap(bad);controls[name]=False
 except ValueError:controls[name]=True
assert all(controls.values())
(r/'latm-result.json').write_text(json.dumps({'scope':'Restricted LOAS/LATM AAC-LC single program/layer/subframe unwrapping; byte-aligned output extracted from bit-aligned payload, not general LATM parser.','frames':frames,'configuration':config,'pcmBytes':len(a),'pcmSHA256':hashlib.sha256(a).hexdigest(),'independentDecodedPCMExact':True,'adverseRejected':controls,'passed':True},indent=2)+'\n')
