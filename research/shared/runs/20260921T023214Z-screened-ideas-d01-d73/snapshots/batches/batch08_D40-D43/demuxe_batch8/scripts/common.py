"""SPDX-License-Identifier: MIT. Bounded experimental utilities, not a production parser."""
from pathlib import Path
import json,subprocess,struct,hashlib,sys,time,platform
import numpy as np
R=Path(__file__).resolve().parents[1];F=R/'fixtures';E=R/'evidence'
for p in [F,E]:p.mkdir(exist_ok=True)
def save(n,x): (E/n).write_text(json.dumps(x,indent=2))
def sha(b):return hashlib.sha256(b).hexdigest()
def run(args,check=True,input=None):
 a=list(map(str,args));p=subprocess.run(a,input=input,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=40)
 with (E/'commands.jsonl').open('a') as w:w.write(json.dumps({'argv':a,'returncode':p.returncode,'stderr':p.stderr.decode(errors='replace'),'stdout_bytes':len(p.stdout),'stdout_sha256':sha(p.stdout)})+'\n')
 if check and p.returncode:raise RuntimeError(p.stderr.decode(errors='replace'))
 return p.stdout

def ff(*args,check=True,input=None):return run(['ffmpeg','-hide_banner','-loglevel','error','-y',*args],check=check,input=input)
def reject(fn):
 try:fn();return {'rejected':False}
 except (ValueError,RuntimeError) as e:return {'rejected':True,'reason':str(e)}
def cmp(a,b):
 a=np.asarray(a);b=np.asarray(b);af=a.reshape(-1);bf=b.reshape(-1);n=min(len(af),len(bf));diff=af[:n]!=bf[:n];ii=np.flatnonzero(diff)
 return {'shape_a':list(a.shape),'shape_b':list(b.shape),'compared':n,'mismatches':int(diff.sum()),'first':int(ii[0]) if len(ii) else None,'max_error':float(np.max(np.abs(af[:n].astype(float)-bf[:n].astype(float)))) if n else 0,'exact':a.shape==b.shape and not bool(diff.any())}
def wav_float(a,rate):
 a=np.asarray(a,dtype='<f4');channels=1 if a.ndim==1 else a.shape[1];raw=a.tobytes();fmt=struct.pack('<HHIIHH',3,channels,rate,rate*channels*4,channels*4,32)
 body=b'WAVEfmt '+struct.pack('<I',len(fmt))+fmt+b'data'+struct.pack('<I',len(raw))+raw
 return b'RIFF'+struct.pack('<I',len(body))+body
