# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import json,struct,subprocess,hashlib,time,statistics,random,sys
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
r=Path(sys.argv[1]);original=Path('research/shared/runs/20260919T194500Z-av1/temporal.ivf').read_bytes();source=ivf(original);head=bytearray(original[:32]);struct.pack_into('<I',head,24,len(source)*20);b=bytes(head)+b''.join(struct.pack('<IQ',len(p),t+j*24)+p for j in range(20) for t,p in source);(r/'source.ivf').write_bytes(b)
result={'plan':json.loads((r/'plan.json').read_text()),'pairs':[],'sourceBytes':len(b),'ffmpeg':subprocess.check_output(['ffmpeg','-version'],text=True).splitlines()[0]}
def job(candidate):
 global b,frames,masks
 start=time.perf_counter_ns();b=(r/'source.ivf').read_bytes()
 if candidate:
  frames=ivf(b);seq=next(o for _,p in frames for o in obus(p) if o['type']==1);masks=seq_mask(seq['payload']);b=extract(257)
 args=['ffmpeg','-v','error','-f','ivf','-i','pipe:0']
 if not candidate:args+=['-vf','select=not(mod(n\\,2))']
 args+=['-fps_mode','passthrough','-pix_fmt','yuv420p','-f','rawvideo','pipe:1'];output=subprocess.check_output(args,input=b);elapsed=time.perf_counter_ns()-start
 return {'ns':elapsed,'inputBytes':len(b),'outputBytes':len(output),'sha256':hashlib.sha256(output).hexdigest()}
try:
 for i in range(11):
  row={'pair':i}
  for mode in (['candidate','baseline'] if i%2 else ['baseline','candidate']):row[mode]=job(mode=='candidate')
  assert row['candidate']['sha256']==row['baseline']['sha256'];assert row['candidate']['outputBytes']==240*160*96*3//2;result['pairs'].append(row)
 values=[1-x['candidate']['ns']/x['baseline']['ns'] for x in result['pairs']];rng=random.Random(7891);bs=sorted(statistics.median(rng.choices(values,k=len(values))) for _ in range(10000));result['analysis']={'medianSaving':statistics.median(values),'bootstrap95':[bs[250],bs[9750]],'accepted':bs[250]>.1,'baselineMedianMs':statistics.median(x['baseline']['ns']/1e6 for x in result['pairs']),'candidateMedianMs':statistics.median(x['candidate']['ns']/1e6 for x in result['pairs'])};result['passed']=True
except Exception as e:result['error']=repr(e);raise
finally:(r/'results.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result.get('analysis',result)))
