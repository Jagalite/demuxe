# SPDX-License-Identifier: MIT
from pathlib import Path
import subprocess,json,hashlib,struct,time
R=Path(__file__).resolve().parents[1]; F=R/'fixtures'; E=R/'evidence'
F.mkdir(exist_ok=True);E.mkdir(exist_ok=True)
def sha(b):return hashlib.sha256(b).hexdigest()
def save(n,x): (E/n).write_text(json.dumps(x,indent=2))
def run(a,timeout=35):
 p=subprocess.run(list(map(str,a)),capture_output=True,timeout=timeout)
 with (E/'commands.jsonl').open('a') as f:f.write(json.dumps({'argv':list(map(str,a)),'returncode':p.returncode,'stderr':p.stderr.decode(errors='replace')[-8000:]})+'\n')
 if p.returncode:raise RuntimeError(p.stderr.decode(errors='replace'))
 return p.stdout
def ff(*a):return run(['ffmpeg','-hide_banner','-loglevel','error','-y',*a])
def boxes(b,start=0,end=None):
 end=len(b) if end is None else end;p=start;out=[]
 while p<end:
  if p+8>end:raise ValueError('short box')
  n=int.from_bytes(b[p:p+4],'big');h=8;t=b[p+4:p+8].decode('ascii')
  if n==1:n=int.from_bytes(b[p+8:p+16],'big');h=16
  if n==0:n=end-p
  if n<h or p+n>end:raise ValueError('bad box')
  out.append((t,p,p+n,p+h));p+=n
 return out
def find(b,path):
 q=('',0,len(b),0)
 for t in path.split('/'):
  m=[x for x in boxes(b,q[3],q[2]) if x[0]==t]
  if len(m)!=1:raise ValueError('ambiguous '+path)
  q=m[0]
 return q
def split(n):
 b=(F/(n+'.mp4')).read_bytes();z=boxes(b);p=next(q[1] for q in z if q[0]=='moof');(F/(n+'.init')).write_bytes(b[:p]);fs=[]
 for i,q in enumerate(z):
  if q[0]!='moof':continue
  if z[i+1][0]!='mdat':raise ValueError('not adjacent')
  name=f'{n}_{len(fs)}.m4s';s=b[q[1]:z[i+1][2]];(F/name).write_bytes(s);t=find(s,'moof/traf/tfdt');o=t[3];k=8 if s[o] else 4
  fs.append({'file':name,'tfdt':int.from_bytes(s[o+4:o+4+k],'big'),'bytes':len(s)})
 return {'init':n+'.init','fragments':fs}
def packet_summary(n):
 return json.loads(run(['ffprobe','-v','error','-show_packets','-show_data_hash','sha256','-of','json',F/n]))['packets']
