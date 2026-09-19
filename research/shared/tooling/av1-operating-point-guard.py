# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import json,struct,subprocess,hashlib
repo=Path(__file__).resolve().parents[3];r=repo/'research/shared/runs/20260919T194500Z-av1'
def ivf(b):
 assert b[:4]==b'DKIF';rows=[];p=32
 while p<len(b):
  n,t=struct.unpack_from('<IQ',b,p);p+=12;assert p+n<=len(b);rows.append((t,b[p:p+n]));p+=n
 return rows
def obus(b):
 p=0;rows=[]
 while p<len(b):
  start=p;h=b[p];p+=1;assert not h&0x81 and h&2
  typ=(h>>3)&15;tid=sid=0
  if h&4:tid=b[p]>>5;sid=(b[p]>>3)&3;p+=1
  n=shift=0
  while True:
   v=b[p];p+=1;n|=(v&127)<<shift;shift+=7;assert shift<=56
   if not v&128:break
  assert p+n<=len(b);rows.append({'type':typ,'temporal':tid,'spatial':sid,'bytes':b[start:p+n],'payload':b[p:p+n]});p+=n
 return rows
def seq_mask(payload):
 bits=''.join(f'{x:08b}' for x in payload);p=0
 def get(n):
  nonlocal p
  v=int(bits[p:p+n],2);p+=n;return v
 profile=get(3);still=get(1);reduced=get(1);assert not reduced
 timing=get(1);assert not timing,'timing unsupported in restricted pilot'
 delay=get(1);count=get(5)+1;masks=[]
 for _ in range(count):
  masks.append(get(12));level=get(5)
  if level>7:get(1)
  if delay:
   if get(1):get(4)
 return masks

original=r
r=repo/'research/shared/runs/20260919T202700Z-av1-guard'
b=(original/'temporal.ivf').read_bytes();frames=ivf(b);seq=next(o for _,packet in frames for o in obus(packet) if o['type']==1);masks=seq_mask(seq['payload'])
def extract(selected):
 if selected not in masks:raise ValueError('requested operating point not advertised')
 if selected==0:raise ValueError('unrestricted operating point excluded from bounded subset pilot')
 out=[]
 for t,packet in frames:
  pieces=[];hasframe=False
  for o in obus(packet):
   if o['type'] in (1,2) or ((selected&(1<<o['temporal'])) and (selected&(1<<(o['spatial']+8)))):
    pieces.append(o['bytes']);hasframe|=o['type'] in (3,6)
  if hasframe:out.append((t,b''.join(pieces)))
 header=bytearray(b[:32]);struct.pack_into('<I',header,24,len(out))
 return bytes(header)+b''.join(struct.pack('<IQ',len(packet),t)+packet for t,packet in out)
valid=extract(257);assert valid==(original/'extracted.ivf').read_bytes()
rejected=False
try:extract(258)
except ValueError:rejected=True
assert rejected
(r/'selected.ivf').write_bytes(valid)
result={'advertisedMasks':masks,'requestedValidMask':257,'invalidMask':258,'invalidMaskRejectedByExtractor':rejected,'candidateByteIdenticalToPreviouslyDecodedStream':True,'candidateSHA256':hashlib.sha256(valid).hexdigest(),'passed':True,'scope':'Real selector/extractor invocation now rejects an unadvertised mask before producing bytes. Prior unsupportedMaskRejected boolean was only a membership observation, not rejection evidence.'}
(r/'results.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
