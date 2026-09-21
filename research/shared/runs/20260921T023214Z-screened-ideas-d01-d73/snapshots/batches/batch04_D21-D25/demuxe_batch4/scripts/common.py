"""Bounded research helpers. SPDX-License-Identifier: MIT."""
from pathlib import Path
import subprocess, json, hashlib, struct, zlib
R=Path(__file__).resolve().parents[1]; F=R/'fixtures'; E=R/'evidence'
F.mkdir(exist_ok=True); E.mkdir(exist_ok=True)
def sha(b):return hashlib.sha256(b).hexdigest()
def run(args,check=True,timeout=35):
 p=subprocess.run(list(map(str,args)),capture_output=True,timeout=timeout)
 log=E/'commands.jsonl'
 with log.open('a') as f:f.write(json.dumps({'argv':list(map(str,args)),'rc':p.returncode,'stderr':p.stderr.decode(errors='replace')})+'\n')
 if check and p.returncode:raise RuntimeError(p.stderr.decode(errors='replace'))
 return p.stdout
def ff(*a,**kw):return run(['ffmpeg','-hide_banner','-nostdin','-y','-v','error',*a],**kw)
def save(name,obj):(E/name).write_text(json.dumps(obj,indent=2))
def crc(data,bits,poly):
 v=0; mask=(1<<bits)-1
 for x in data:
  v^=x<<(bits-8)
  for _ in range(8):v=((v<<1)^poly if v&(1<<(bits-1)) else v<<1)&mask
 return v
def chunk(kind,payload):return struct.pack('>I',len(payload))+kind+payload+struct.pack('>I',zlib.crc32(kind+payload)&0xffffffff)
def png(w,h,data,ct=6,palette=None,alpha=None):
 out=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,ct,0,0,0))
 if palette is not None:out+=chunk(b'PLTE',palette)
 if alpha is not None:out+=chunk(b'tRNS',alpha)
 return out+chunk(b'IDAT',data)+chunk(b'IEND',b'')
def reject(fn):
 try:fn();return {'rejected':False}
 except (ValueError,IndexError) as ex:return {'rejected':True,'error':str(ex)}
