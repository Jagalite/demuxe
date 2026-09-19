# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import json,subprocess,hashlib
r=Path(__file__).parent;source=Path('results/full-completion/continuity/green-ordered.webm');b=source.read_bytes()
def vint(b,p,tag=False):
 n=1
 while n<=8 and not b[p]&(128>>(n-1)):n+=1
 if n>8:raise ValueError('vint')
 v=int.from_bytes(b[p:p+n],'big');return (v if tag else v&((1<<(7*n))-1)),p+n
def elems(b):
 p=0
 while p<len(b):
  t,q=vint(b,p,True);n,q=vint(b,q);end=min(q+n,len(b));yield t,b[q:end];p=end
def box(t,b):
 n=1
 while len(b)>=(1<<(7*n))-1:n+=1
 return t.to_bytes((t.bit_length()+7)//8,'big')+((1<<(7*n))|len(b)).to_bytes(n,'big')+b
track=None
for t,p in elems(b):
 if t==0x18538067:
  for t2,p2 in elems(p):
   if t2==0x1654ae6b:
    for te,pe in elems(p2):
     if te!=0xae:continue
     f=dict(elems(pe))
     if f.get(0x86)==b'A_OPUS':track=int.from_bytes(f[0xd7],'big')
assert track;changed=False
trimNs=-10000000
def change(t,p):
 global changed
 if t in [0x114d9b74,0x1c53bb6b,0xbf]:return b''
 if t==0xa3:
  tn,q=vint(p,0)
  if tn==track and not changed:
   assert not p[q+2]&6;block=p[:q+2]+bytes([p[q+2]&~128])+p[q+3:];changed=True;return box(0xa0,box(0xa1,block)+box(0x75a2,trimNs.to_bytes(8,'big',signed=True)))
 if t in [0x18538067,0x1f43b675]:return box(t,b''.join(change(a,c) for a,c in elems(p)))
 return box(t,p)
output=b''.join(change(t,p) for t,p in elems(b));assert changed;(r/'negative-padding.webm').write_bytes(output)
decode=lambda path:subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-map','0:a:0','-f','f32le','-'])
a=decode(source);c=decode(r/'negative-padding.webm');expected=a[480*4:];matches=[n for n in [0,168,312,480,792,960] if c==a[n*4:]]
probe=lambda path:json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_streams','-show_data_hash','sha256','-of','json',str(path)]))
x=probe(source);y=probe(r/'negative-padding.webm');identity=[p['data_hash'] for p in x['packets']]==[p['data_hash'] for p in y['packets']];assert identity
(r/'result.json').write_text(json.dumps({'scope':'Requested10ms negative first-Opus-block DiscardPadding with original CodecDelay/pre-skip and tail trim retained; host complete PCM oracle. Browser composition not qualified.','packetPayloadIdentity':identity,'baselineSamples':len(a)//4,'candidateSamples':len(c)//4,'expectedSamples':len(expected)//4,'exactAdditional480SampleHeadTrim':c==expected,'observedExactPrefixRemovalSamples':matches,'baselineFirstAudioPacket':next(p for p in x['packets'] if p['codec_type']=='audio'),'candidateFirstAudioPacket':next(p for p in y['packets'] if p['codec_type']=='audio'),'candidatePCM_SHA256':hashlib.sha256(c).hexdigest()},indent=2)+'\n')
