# SPDX-License-Identifier: Apache-2.0
"""Ordinary ZIP/DEFLATE process-local inflate snapshots, including cold CRC pass."""
import pathlib,sys,json,zipfile,zlib,io,hashlib,struct,random,time,tracemalloc,gc,statistics
out=pathlib.Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True);source=pathlib.Path(sys.argv[2]).read_bytes();sha=lambda b:hashlib.sha256(b).hexdigest();buf=io.BytesIO()
with zipfile.ZipFile(buf,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as f:f.writestr('movie.mp4',source)
archive=buf.getvalue();(out/'movie.zip').write_bytes(archive)
plan={'scope':'Conventional single deflated fMP4 ZIP entry; zlib copy includes bit/Huffman/history state. Complete initial inflation/CRC and 100 deterministic range queries charged. Cheapest baseline inflates and retains whole entry once. No browser-native persistent snapshot or network claim.','gate':'All bytes, CRC/source/generation/range controls, native destination seek; for performance pursue only if at least50percent measured owned live allocation saved and total cold task no more than1.25times cached full inflate baseline. 9 alternating pairs; tracemalloc separate from timing and not processRSS.'};(out/'plan.json').write_text(json.dumps(plan,indent=2))
rng=random.Random(147);queries=[(rng.randrange(len(source)-4096),4096) for _ in range(100)]
class Index:
 def __init__(self,blob,identity):
  if sha(blob)!=identity:raise ValueError('source')
  with zipfile.ZipFile(io.BytesIO(blob)) as f:
   i=f.getinfo('movie.mp4');assert i.compress_type==8;at=i.header_offset;name,extra=struct.unpack_from('<HH',blob,at+26);start=at+30+name+extra;self.comp=blob[start:start+i.compress_size];self.size=i.file_size;crc=i.CRC
  self.states=[];self.closed=False;self.epoch=1;d=zlib.decompressobj(-15);pos=produced=check=0
  while produced<self.size:
   self.states.append((produced,pos,d.copy()));data=self.comp[pos:];b=d.decompress(data,min(32768,self.size-produced));pos+=len(data)-len(d.unconsumed_tail)-len(d.unused_data);produced+=len(b);check=zlib.crc32(b,check)
   if not b:raise ValueError('short')
  if not d.eof or check!=crc:raise ValueError('CRC/end')
 def read(self,at,n,epoch=1):
  if self.closed or epoch!=self.epoch:raise ValueError('owner')
  if at<0 or n<0 or at+n>self.size:raise ValueError('range')
  base,pos,state=self.states[min(at//32768,len(self.states)-1)];d=state.copy();b=d.decompress(self.comp[pos:],at-base+n)
  if len(b)!=at-base+n:raise ValueError('short')
  return b[at-base:]
 def close(self):self.closed=True;self.epoch+=1;self.states=[];self.comp=b''
def cached(blob):
 with zipfile.ZipFile(io.BytesIO(blob)) as f:return f.read('movie.mp4')
identity=sha(archive);idx=Index(archive,identity);assert cached(archive)==source
for a,n in queries:assert idx.read(a,n)==source[a:a+n]
recovered=b''.join(idx.read(a,min(32768,len(source)-a)) for a in range(0,len(source),32768));assert recovered==source;(out/'recovered.mp4').write_bytes(recovered)
controls={}
for name,fn in [('negative',lambda:idx.read(-1,1)),('overrun',lambda:idx.read(len(source),1)),('stale',lambda:idx.read(0,10,0)),('changed',lambda:Index(archive[:-1]+bytes([archive[-1]^1]),identity))]:
 try:fn();raise AssertionError(name+' accepted')
 except ValueError:controls[name]=True
# A compressed cursor without its saved inflate dictionary/state must not be accepted.
_,pos,_=idx.states[len(idx.states)//2]
try:
 wrong=zlib.decompress(idx.comp[pos:],-15);assert wrong!=source[(len(idx.states)//2)*32768:];controls['bareCursorInvalid']=True
except zlib.error:controls['bareCursorInvalid']=True
idx.close()
try:idx.read(0,1);raise AssertionError('closed')
except ValueError:controls['closed']=True
bad=bytearray(archive)
with zipfile.ZipFile(io.BytesIO(archive)) as f:offset=f.getinfo('movie.mp4').header_offset
struct.pack_into('<I',bad,offset+14,0) # Central CRC is authoritative; mutate it too.
c=bad.index(b'PK\x01\x02');struct.pack_into('<I',bad,c+16,0)
try:Index(bytes(bad),sha(bad));raise AssertionError('badCRC')
except ValueError:controls['CRCRejected']=True
rows=[]
for pair in range(9):
 row={'pair':pair}
 for mode in (['index','cached'] if pair%2 else ['cached','index']):
  t=time.perf_counter();obj=Index(archive,identity) if mode=='index' else cached(archive);answers=[obj.read(a,n) if mode=='index' else obj[a:a+n] for a,n in queries];assert all(b==source[a:a+n] for b,(a,n) in zip(answers,queries));
  if mode=='index':obj.close()
  del obj,answers;row[mode]=(time.perf_counter()-t)*1000
 rows.append(row)
alloc={}
for mode in ['cached','index']:
 gc.collect();tracemalloc.start();base=tracemalloc.get_traced_memory()[0];obj=Index(archive,identity) if mode=='index' else cached(archive);live,peak=tracemalloc.get_traced_memory();alloc[mode]={'liveBytes':live-base,'peakBytes':peak-base};
 if mode=='index':obj.close()
 del obj;tracemalloc.stop()
ratio=statistics.median(r['index']/r['cached'] for r in rows);saving=1-alloc['index']['liveBytes']/alloc['cached']['liveBytes'];result={'plan':plan,'sourceSHA256':sha(source),'archiveSHA256':identity,'sourceBytes':len(source),'archiveBytes':len(archive),'queries':queries,'controls':controls,'rows':rows,'allocation':alloc,'analysis':{'medianCostRatio':ratio,'ownedAllocationSaving':saving,'accepted':ratio<=1.25 and saving>=.5},'passed':True};(out/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:result[k] for k in ['analysis','allocation','controls']}))
