# SPDX-License-Identifier: MIT
from pathlib import Path
import base64, hashlib, json, os, struct, subprocess, sys, time
import numpy as np
R=Path(os.environ.get('DEMUXE_BATCH_DIR',Path(__file__).resolve().parents[1]))
F=R/'fixtures';E=R/'evidence'
F.mkdir(parents=True,exist_ok=True);E.mkdir(parents=True,exist_ok=True)
def sha(data):return hashlib.sha256(data).hexdigest()
def save(name,data):
 (E/name).write_text(json.dumps(data,indent=2,allow_nan=False)+'\n')
def cmd(args,*,out=None,timeout=30,check=True):
 t=time.time();p=subprocess.run([str(x) for x in args],capture_output=True,timeout=timeout)
 with (E/'commands.jsonl').open('a') as f:f.write(json.dumps({'args':[str(x) for x in args],'returncode':p.returncode,'elapsed_s':time.time()-t,'stderr':p.stderr.decode(errors='replace')})+'\n')
 if check and p.returncode:raise RuntimeError(p.stderr.decode(errors='replace'))
 if out:(F/out).write_bytes(p.stdout)
 return p
FF=['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y']
def pcm(path,fmt='f32le'):
 return cmd(FF+['-i',F/path,'-map','0:a:0','-f',fmt,'-c:a','pcm_'+fmt,'-']).stdout

def wave(data,rate,ch,bits,fp=False):
 align=ch*bits//8
 fmt=struct.pack('<HHIIHH',3 if fp else 1,ch,rate,rate*align,align,bits)
 def ck(t,b):return t+struct.pack('<I',len(b))+b+(b'\0' if len(b)&1 else b'')
 body=b'WAVE'+ck(b'fmt ',fmt)
 if fp:body+=ck(b'fact',struct.pack('<I',len(data)//align))
 body+=ck(b'data',data)
 return b'RIFF'+struct.pack('<I',len(body))+body

def caf_chunks(data):
 if data[:8]!=b'caff\x00\x01\x00\x00':raise ValueError('CAF version/profile')
 p=8;cs={};order=[]
 while p<len(data):
  if p+12>len(data):raise ValueError('truncated CAF chunk header')
  typ=data[p:p+4];n=struct.unpack_from('>q',data,p+4)[0]
  if n<0:raise ValueError('unknown-size CAF excluded')
  if n>len(data)-p-12:raise ValueError('CAF chunk outside source')
  if typ in cs:raise ValueError('duplicate CAF chunk')
  cs[typ]=(p+12,data[p+12:p+12+n]);order.append(typ);p+=12+n
 if not order or order[0]!=b'desc' or b'data' not in cs:raise ValueError('missing/out-of-order description or audio')
 if len(cs[b'desc'][1])!=32:raise ValueError('bad desc length')
 if len(cs[b'data'][1])<4 or cs[b'data'][1][:4]!=b'\0'*4:raise ValueError('nonzero edit count excluded')
 return cs

def desc(cs):return struct.unpack('>d4sIIIII',cs[b'desc'][1])
def source_guard(data,identity):
 if sha(data)!=identity:raise ValueError('source identity changed')

def check_channel(cs,ch):
 if ch not in [1,2]:raise ValueError('multichannel layout not qualified')
 if b'chan' in cs:
  c=cs[b'chan'][1]
  if len(c)!=12 or struct.unpack('>III',c)!=(0x00640001 if ch==1 else 0x00650002,0,0):raise ValueError('unqualified CAF channel layout')

TABLE=[]
for i in range(256):
 r=i<<24
 for j in range(8):r=((r<<1)^0x04c11db7) & 0xffffffff if r & 0x80000000 else (r<<1)&0xffffffff
 TABLE.append(r)
def ogg_crc(d):
 c=0
 for x in d:c=((c<<8)&0xffffffff)^TABLE[((c>>24)^x)&255]
 return c
def ogg_page(payload,gp,seq,serial=0xD06816,flags=0):
 lace=[255]*(len(payload)//255)+[len(payload)%255]
 if len(lace)>255:raise ValueError('page continuation excluded')
 d=bytearray(b'OggS'+bytes([0,flags])+struct.pack('<QII',gp,serial,seq)+b'\0'*4+bytes([len(lace)])+bytes(lace)+payload)
 struct.pack_into('<I',d,22,ogg_crc(d));return bytes(d)
def ogg_packets(d):
 p=0;out=[];cur=b'';g=[]
 while p<len(d):
  if d[p:p+5]!=b'OggS\0' or p+27>len(d):raise ValueError('invalid Ogg page')
  n=d[p+26];ls=d[p+27:p+27+n];size=27+n+sum(ls)
  if len(ls)!=n or p+size>len(d):raise ValueError('Ogg bounds')
  q=bytearray(d[p:p+size]);old=struct.unpack_from('<I',q,22)[0];q[22:26]=b'\0'*4
  if ogg_crc(q)!=old:raise ValueError('Ogg checksum')
  pos=p+27+n
  for n in ls:
   cur+=d[pos:pos+n];pos+=n
   if n<255:out.append(cur);cur=b''
  g.append(struct.unpack_from('<Q',d,p+6)[0]);p+=size
 if cur:raise ValueError('incomplete Ogg packet')
 return out,g

def compare(a,b):
 if a.shape!=b.shape:return {'exact':False,'shapeA':list(a.shape),'shapeB':list(b.shape)}
 err=np.abs(a.astype(np.float64)-b.astype(np.float64))
 return {'exact':bool(np.array_equal(a,b)),'values':a.size,'different':int(np.count_nonzero(a!=b)),'maxAbs':float(err.max(initial=0))}
