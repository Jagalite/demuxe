# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import struct,json,subprocess,hashlib
p=Path(__file__).resolve().parents[1];r=p/'evidence/20260919T200000Z-hierarchy';r.mkdir(parents=True,exist_ok=True)
b=Path('results/top100/mse/red.mp4').read_bytes();at=0;parts=[]
while at<len(b):
 n=int.from_bytes(b[at:at+4],'big');assert n>=8
 parts.append((b[at+4:at+8],at,n));at+=n
moofs=[(a,n) for t,a,n in parts if t==b'moof'];init=b[:moofs[0][0]];leaves=[]
for a,n in moofs:
 m=int.from_bytes(b[a+n:a+n+4],'big');leaves.append(b[a:a+n+m])
def sidx(entries,first_time):
 payload=struct.pack('>IIIIIIHH',0,1,12288,first_time,0,0,0,len(entries)) if False else struct.pack('>IIIIIHH',0,1,12288,first_time,0,0,len(entries))
 for typ,size,duration in entries:payload+=struct.pack('>III',(typ<<31)|size,duration,0x90000000)
 return struct.pack('>I4s',len(payload)+8,b'sidx')+payload
children=[]
for j in range(2):
 group=leaves[j*12:(j+1)*12];children.append(sidx([(0,len(x),1024) for x in group],j*12288)+b''.join(group))
root=sidx([(1,len(c),12288) for c in children],0);data=init+root+b''.join(children);(r/'source.mp4').write_bytes(data);identity=hashlib.sha256(data).hexdigest();reads=[]
def read(a,n,version):
 if version!=identity:raise ValueError('stale source')
 if a<0 or n<0 or a+n>len(data):raise ValueError('source bounds')
 reads.append((a,n));return data[a:a+n]
def index(a,version):
 size,typ=struct.unpack('>I4s',read(a,8,version));assert typ==b'sidx'
 raw=read(a+8,size-8,version);v,track,scale,time,offset,reserved,count=struct.unpack('>IIIIIHH',raw[:24]);assert v==0 and scale==12288 and count<=24 and len(raw)==24+12*count
 pos=a+size+offset;rows=[]
 for i in range(count):
  field,duration,sap=struct.unpack('>III',raw[24+12*i:36+12*i]);n=field&0x7fffffff
  if n<=0 or duration<=0 or pos+n>len(data):raise ValueError('reference bounds')
  rows.append((field>>31,pos,n,time,duration));pos+=n;time+=duration
 return rows
def seek(t,version):
 rows=index(len(init),version);row=next(x for x in rows if x[3]<=t<x[3]+x[4]);assert row[0]==1
 children=index(row[1],version);leaf=next(x for x in children if x[3]<=t<x[3]+x[4]);assert leaf[0]==0 and leaf[1]+leaf[2]<=row[1]+row[2]
 return leaf,read(leaf[1],leaf[2],version)
packets=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_data_hash','sha256','-of','json','results/top100/mse/red.mp4']))['packets'];observed=[]
for i in [20,3,21,3]:
 reads.clear();leaf,segment=seek(i*1024,identity);assert segment==leaves[i];f=r/f'leaf-{i}.mp4';f.write_bytes(init+segment)
 oracle=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_data_hash','sha256','-of','json',str(f)]))['packets'];assert len(oracle)==1
 for k in ['pts','dts','duration','data_hash']:assert oracle[0][k]==packets[i][k]
 observed.append({'sample':i,'logicalReadBytes':sum(n for _,n in reads),'requests':len(reads),'ranges':reads.copy()})
controls=[]
try:seek(0,'stale');raise AssertionError('stale')
except ValueError:controls.append('stale identity')
original=data;bad=bytearray(data);off=len(init)+32;bad[off:off+4]=(0xffffffff).to_bytes(4,'big');data=bytes(bad)
try:seek(0,identity);raise AssertionError('bad reference')
except ValueError:controls.append('out-of-source reference')
data=original
(r/'results.json').write_text(json.dumps({'passed':True,'candidateExecuted':True,'fallback':False,'sourceBytes':len(data),'rootLocationSupplied':len(init),'queries':observed,'controls':controls,'scope':'Authored two-level version-0 SIDX, finite immutable AVC all-intra source. Independent packet/timing oracle plus exact leaf-byte comparison. Logical local reads only; cold init cost excluded from query count; no remote transfer latency, browser playback, cancellation or real deployment opportunity qualification.'},indent=2)+'\n')
