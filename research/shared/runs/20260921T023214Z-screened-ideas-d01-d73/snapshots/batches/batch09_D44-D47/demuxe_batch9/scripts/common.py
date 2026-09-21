"""SPDX-License-Identifier: MIT. Bounded experimental utilities; not a production demuxer."""
from pathlib import Path
import json,subprocess,struct,hashlib,time,sys
R=Path(__file__).resolve().parents[1];F=R/'fixtures';E=R/'evidence'
F.mkdir(exist_ok=True);E.mkdir(exist_ok=True)
def save(n,x): (E/n).write_text(json.dumps(x,indent=2))
def sha(b):return hashlib.sha256(b).hexdigest()
def run(args,check=True,input=None):
 a=list(map(str,args));p=subprocess.run(a,input=input,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=40)
 with (E/'commands.jsonl').open('a') as w:w.write(json.dumps({'args':a,'returncode':p.returncode,'stderr':p.stderr.decode(errors='replace'),'stdout_bytes':len(p.stdout)})+'\n')
 if check and p.returncode:raise RuntimeError(p.stderr.decode(errors='replace'))
 return p.stdout
u16=lambda b,p=0:struct.unpack_from('>H',b,p)[0]
u32=lambda b,p=0:struct.unpack_from('>I',b,p)[0]
p16=lambda v:struct.pack('>H',v)
p32=lambda v:struct.pack('>I',v)
def box(t,b):return p32(len(b)+8)+t.encode()+b
def full(t,b,flags=0,version=0):return box(t,bytes([version])+flags.to_bytes(3,'big')+b)
def boxes(b,start=0,end=None):
 end=len(b) if end is None else end;p=start;o=[]
 while p<end:
  if p+8>end:raise ValueError('truncated box header')
  z=u32(b,p);t=b[p+4:p+8].decode('ascii');h=8
  if z==1:
   if p+16>end:raise ValueError('truncated large box')
   z=int.from_bytes(b[p+8:p+16],'big');h=16
  if z==0:z=end-p
  if z<h or p+z>end:raise ValueError('bad box bound')
  o.append({'type':t,'start':p,'end':p+z,'payload':p+h,'size':z});p+=z
 return o
def find(b,path):
 q=None;a=0;e=len(b)
 for t in path.split('/'):
  matches=[x for x in boxes(b,a,e) if x['type']==t]
  if len(matches)!=1:raise ValueError('expected one '+t)
  q=matches[0];a=q['payload'];e=q['end']
 return q
def raw(b,q):return b[q['start']:q['end']]
def payload(b,q):return b[q['payload']:q['end']]
def probe(n):
 x=json.loads(run(['ffprobe','-v','error','-show_streams','-show_packets','-show_data_hash','sha256','-of','json',F/n]));save(n+'.probe.json',x);return x
