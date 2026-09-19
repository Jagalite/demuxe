# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import json,subprocess
r=Path(__file__).parent;source=Path('results/top100/transport/avc.ts').read_bytes();mod=1<<33
probe=lambda file:json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_data_hash','sha256','-of','json',str(file)]))['packets']
original=probe('results/top100/transport/avc.ts');first=min(p['pts'] for p in original);shift=mod-180000-first;out=bytearray(source);rawpts=[]
def tsread(b):return ((b[0]>>1&7)<<30)|(b[1]<<22)|((b[2]>>1)<<15)|(b[3]<<7)|(b[4]>>1)
def tswrite(b,v):return bytes([(b[0]&240)|((v>>30&7)<<1)|1,(v>>22)&255,((v>>15&127)<<1)|1,(v>>7)&255,((v&127)<<1)|1])
for off in range(0,len(out),188):
 p=out[off:off+188];at=4
 if p[3]&32:
  if p[4]>=7 and p[5]&16:
   value=(p[6]<<25)|(p[7]<<17)|(p[8]<<9)|(p[9]<<1)|(p[10]>>7);value=(value+shift)%mod;p[6:11]=bytes([(value>>25)&255,(value>>17)&255,(value>>9)&255,(value>>1)&255,((value&1)<<7)|(p[10]&127)])
  at+=1+p[4]
 if p[3]&16 and p[1]&64 and p[at:at+3]==b'\0\0\1' and at+14<=188 and p[at+7]&128:
  count=2 if p[at+7]&64 else 1
  for j in range(count):
   pos=at+9+j*5;v=(tsread(p[pos:pos+5])+shift)%mod;p[pos:pos+5]=tswrite(p[pos:pos+5],v)
   if j==0:rawpts.append(v)
 out[off:off+188]=p
(r/'rollover.ts').write_bytes(out);actual=probe(r/'rollover.ts');assert len(actual)==len(original);offsets={b['pts']-a['pts'] for a,b in zip(original,actual)};assert len(offsets)==1;assert all(a['data_hash']==b['data_hash'] and b['dts']-a['dts'] in offsets for a,b in zip(original,actual));assert any(a>mod-180000 and b<180000 for a,b in zip(rawpts,rawpts[1:]))
def normalize(raw,last):
 epoch=round((last-raw)/mod);options=[raw+(epoch+k)*mod for k in [-1,0,1] if abs(raw+(epoch+k)*mod-last)<=180000]
 if len(options)!=1:raise ValueError('ambiguous or discontinuous')
 return options[0]
assert normalize(100,mod-100)==mod+100;assert normalize(mod-150,mod+100)==mod-150;assert normalize(45000,mod)==mod+45000
for raw in [mod//2,900000]:
 try:normalize(raw,0);raise AssertionError('jump normalized')
 except ValueError:pass
(r/'result.json').write_text(json.dumps({'scope':'Actual raw PES/PCR33-bit rollover versus independent FFmpeg demux, plus bounded continuity policy. No second normalizer inserted after demux.','rawRolloverObserved':True,'packetPayloadIdentity':True,'oneCommonPTSAndDTSOffset':list(offsets),'avOffsetPreserved':True,'lateReorderPolicyPassed':True,'largeUnmarkedAndHalfModulusJumpsRejected':True,'demuxAlreadyUnwrapped':True,'passed':True},indent=2)+'\n')
