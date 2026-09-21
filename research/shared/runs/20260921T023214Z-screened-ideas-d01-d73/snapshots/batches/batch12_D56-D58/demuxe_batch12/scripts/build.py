# SPDX-License-Identifier: MIT
"""Bounded independent component fixtures; never modifies the Demuxe repository."""
from pathlib import Path
import json,struct,hashlib,subprocess,math,platform
import numpy as np
R=Path(__file__).resolve().parents[1];F=R/'fixtures';E=R/'evidence'
F.mkdir(exist_ok=True);E.mkdir(exist_ok=True)
def save(n,o): (E/n).write_text(json.dumps(o,indent=2))
def sha(b): return hashlib.sha256(b).hexdigest()
def run(args,ok=True):
 p=subprocess.run(list(map(str,args)),capture_output=True,timeout=35)
 with (E/'commands.jsonl').open('a') as f:f.write(json.dumps({'argv':list(map(str,args)),'returncode':p.returncode,'stderr':p.stderr.decode(errors='replace'),'stdout_bytes':len(p.stdout),'stdout_sha256':sha(p.stdout)})+'\n')
 if ok and p.returncode:raise RuntimeError(p.stderr.decode(errors='replace'))
 return p

def ff(*args):return run(['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y',*args]).stdout
def vi(n):
 for w in range(1,9):
  if n<(1<<(7*w))-1:return ((1<<(7*w))|n).to_bytes(w,'big')
 raise ValueError('EBML size too large')
def elem(i,b):
 x=bytes.fromhex(i);return x+vi(len(b))+b
def uint(i,v):return elem(i,v.to_bytes(max(1,(v.bit_length()+7)//8),'big'))
def webm(records,name,default_ns):
 ebml=uint('4286',1)+uint('42F7',1)+uint('42F2',4)+uint('42F3',8)+elem('4282',b'webm')+uint('4287',4)+uint('4285',2)
 info=uint('2AD7B1',1000000)+elem('4489',struct.pack('>d',3000))+elem('4D80',b'Demuxe bounded research')+elem('5741',b'Demuxe bounded research')
 tr=uint('D7',1)+uint('73C5',1)+uint('83',1)+uint('9C',0)+elem('86',b'V_VP9')+uint('23E383',default_ns)+elem('E0',uint('B0',128)+uint('BA',80))
 init=elem('1A45DFA3',ebml)+bytes.fromhex('18538067')+b'\x01'+b'\xff'*7+elem('1549A966',info)+elem('1654AE6B',elem('AE',tr))
 chunks=[]
 for base in [0,1000,2000]:
  data=uint('E7',base)
  for t,p,key,d in records:
   if base<=t<base+1000:
    block=b'\x81'+struct.pack('>h',t-base)+bytes([128 if key else 0])+p
    if d is None:data+=elem('A3',block)
    else:data+=elem('A0',elem('A1',block[:3]+b'\x00'+block[4:])+uint('9B',d))
  chunks.append(elem('1F43B675',data))
 b=init+b''.join(chunks);(F/name).write_bytes(b);(F/(name+'.init')).write_bytes(init)
 fs=[]
 for i,bx in enumerate(chunks):fn=f'{name}.{i}.cluster';(F/fn).write_bytes(bx);fs.append(fn)
 return {'file':name,'bytes':len(b),'init':name+'.init','clusters':fs,'records':len(records),'payload_bytes':sum(len(x[1]) for x in records),'sha256':sha(b)}
def ivf_packets(b):
 if b[:4]!=b'DKIF' or len(b)<32:raise ValueError('IVF header')
 out=[];p=32
 while p<len(b):
  if p+12>len(b):raise ValueError('IVF record')
  n,t=struct.unpack_from('<IQ',b,p);p+=12
  if p+n>len(b):raise ValueError('IVF payload')
  out.append(b[p:p+n]);p+=n
 return out

def build_video():
 ff('-f','lavfi','-i','testsrc2=size=128x80:rate=1:duration=3','-an','-c:v','libvpx-vp9','-threads','1','-g','1','-lossless','1','-deadline','good','-cpu-used','4','-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv','-f','ivf',F/'keyframes.ivf')
 ps=ivf_packets((F/'keyframes.ivf').read_bytes());assert len(ps)==3
 # Profile-0 shown keyframes refresh every reference slot. Only this producer is admitted.
 def guard(p):
  if len(p)<10 or p[0]>>6!=2 or ((p[0]>>4)&3)!=0 or p[0]&8 or p[0]&4 or not p[0]&2 or p[1:4]!=b'\x49\x83\x42':raise ValueError('not an admitted shown profile0 keyframe')
 for p in ps:guard(p)
 variants={}
 for name,kind in [('repeat','repeat'),('recall','recall'),('stale','stale'),('cold','cold')]:
  rs=[]
  for j,p in enumerate(ps):
   for k in range(20):
    iskey=kind=='repeat' or (k==0 and (kind=='recall' or kind=='cold' and j!=0 or kind=='stale' and j==0))
    rs.append((j*1000+k*50,p if iskey else b'\x88',iskey,None))
  variants[name]=webm(rs,name+'.webm',50000000)
 variants['hold']=webm([(j*1000,p,True,1000) for j,p in enumerate(ps)],'hold.webm',1000000000)
 oracle=ff('-i',F/'keyframes.ivf','-fps_mode','passthrough','-pix_fmt','yuv420p','-f','rawvideo','-');fs=128*80*3//2;assert len(oracle)==fs*3
 expected=b''.join(oracle[j*fs:(j+1)*fs]*20 for j in range(3));(F/'video_reference.yuv').write_bytes(expected)
 host={}
 for name in variants:
  host[name]={}
  for decoder in ['vp9','libvpx-vp9']:
   q=run(['ffmpeg','-nostdin','-v','error','-c:v',decoder,'-i',F/(name+'.webm'),'-fps_mode','passthrough','-pix_fmt','yuv420p','-f','rawvideo','-'],ok=False)
   ref=oracle if name=='hold' else expected
   host[name][decoder]={'returncode':q.returncode,'frames':len(q.stdout)//fs,'exact':q.stdout==ref,'sha256':sha(q.stdout),'stderr':q.stderr.decode(errors='replace')}
   (E/f'{name}_{decoder}_framehashes.json').write_text(json.dumps([sha(q.stdout[i:i+fs]) for i in range(0,len(q.stdout),fs)]))
 neg=[]
 for x in [b'\x88',ps[0][:-len(ps[0])+1],bytes([ps[0][0]|4])+ps[0][1:]]:
  try:guard(x);neg.append(False)
  except ValueError:neg.append(True)
 save('video_manifest.json',{'variants':variants,'host':host,'width':128,'height':80,'fps':20,'duration':3,'source_packets':[{'bytes':len(p),'sha256':sha(p)} for p in ps],'keyframe_guard_negatives':neg,'times':[.025,.275,.575,.975,1.025,1.575,1.975,2.025,2.575,2.925,1.275,.125],'scope':'one-byte profile0 recall after a keyframe; keyframes overwrite all reference slots; VFR hold compared as cheaper baseline'})

def chunk(tag,b):return tag+struct.pack('<I',len(b))+b+(b'\x00' if len(b)%2 else b'')
def wav(data,sr=48000):
 fmt=struct.pack('<HHIIHH',1,2,sr,sr*4,4,16)
 b=b'WAVE'+chunk(b'fmt ',fmt)+chunk(b'data',data);return b'RIFF'+struct.pack('<I',len(b))+b

def parse_wavl(b,max_frames=500000):
 if b[:4]!=b'RIFF' or b[8:12]!=b'WAVE' or len(b)!=struct.unpack_from('<I',b,4)[0]+8:raise ValueError('RIFF extent')
 def chunks(lo,hi):
  p=lo
  while p<hi:
   if p+8>hi:raise ValueError('truncated chunk')
   n=struct.unpack_from('<I',b,p+4)[0];end=p+8+n
   if end+(n&1)>hi:raise ValueError('chunk bounds')
   yield b[p:p+4],p+8,end;p=end+(n&1)
 fmt=False;parts=[];total=0;last=[0,0];seen=False;fact=None
 for tag,a,z in chunks(12,len(b)):
  if tag==b'fmt ':
   if fmt or b[a:z]!=struct.pack('<HHIIHH',1,2,48000,192000,4,16):raise ValueError('format')
   fmt=True
  elif tag==b'fact':
   if fact is not None or z-a!=4:raise ValueError('fact extent/duplicate')
   fact=struct.unpack_from('<I',b,a)[0]
  elif tag==b'LIST':
   if not fmt or seen or b[a:a+4]!=b'wavl':raise ValueError('wavl order/type')
   seen=True
   for t,x,y in chunks(a+4,z):
    if t==b'data':
     if (y-x)%4 or y==x:raise ValueError('unaligned/empty data')
     n=(y-x)//4;parts.append({'kind':'data','offset':x,'bytes':y-x,'start':total,'frames':n});last=list(struct.unpack_from('<hh',b,y-4))
    elif t==b'slnt':
     if y-x!=4:raise ValueError('slnt length')
     n=struct.unpack_from('<I',b,x)[0]
     if n==0:raise ValueError('zero hold')
     parts.append({'kind':'hold','values':last.copy(),'start':total,'frames':n})
    else:raise ValueError('unqualified wavl subchunk')
    total+=n
    if total>max_frames:raise ValueError('resource cap')
  else:raise ValueError('unqualified top chunk')
 if not (fmt and seen) or fact is None:raise ValueError('missing mandatory chunk')
 if fact!=total:raise ValueError('fact sample count')
 return {'sample_rate':48000,'channels':2,'total_frames':total,'parts':parts}

def build_sparse():
 rng=np.random.default_rng(25657)
 a=rng.integers(-17000,17001,(1003,2),dtype=np.int16).astype('<i2');a[-1]=[8192,-12288]
 c=rng.integers(-9000,9001,(2051,2),dtype=np.int16).astype('<i2');c[-1]=[-16384,4096]
 # This independent source plan is also the oracle, not the parser's output.
 source=[('hold',257),('data',a),('hold',48003),('data',c),('hold',7211)]
 payload=b'wavl';reference=[];last=np.zeros((1,2),dtype='<i2')
 for k,x in source:
  if k=='data':payload+=chunk(b'data',x.tobytes());reference.append(x);last=x[-1:]
  else:payload+=chunk(b'slnt',struct.pack('<I',x));reference.append(np.repeat(last,x,axis=0))
 count=sum(len(x) if k=='data' else x for k,x in source)
 b=b'WAVE'+chunk(b'fmt ',struct.pack('<HHIIHH',1,2,48000,192000,4,16))+chunk(b'fact',struct.pack('<I',count))+chunk(b'LIST',payload);b=b'RIFF'+struct.pack('<I',len(b))+b
 (F/'sparse.wav').write_bytes(b);ref=np.concatenate(reference);(F/'sparse_reference.s16').write_bytes(ref.tobytes());(F/'dense.wav').write_bytes(wav(ref.tobytes()))
 float_ref=(ref.astype(np.float32)/32768).astype('<f4')
 fbody=b'WAVE'+chunk(b'fmt ',struct.pack('<HHIIHHH',3,2,48000,384000,8,32,0))+chunk(b'fact',struct.pack('<I',len(ref)))+chunk(b'data',float_ref.tobytes())
 (F/'dense_float.wav').write_bytes(b'RIFF'+struct.pack('<I',len(fbody))+fbody)
 plan=parse_wavl(b);assert plan['total_frames']==len(ref)
 parsed=[]
 for p in plan['parts']:
  if p['kind']=='data':parsed.append(np.frombuffer(b[p['offset']:p['offset']+p['bytes']],dtype='<i2').reshape(-1,2))
  else:parsed.append(np.tile(p['values'],(p['frames'],1)).astype('<i2'))
 assert np.array_equal(np.concatenate(parsed),ref)
 negatives={}
 missing=b[:36]+b[48:];missing=missing[:4]+struct.pack('<I',len(missing)-8)+missing[8:]
 (F/'sparse_without_fact.wav').write_bytes(missing)
 wrong_fact=bytearray(b);wrong_fact[44:48]=struct.pack('<I',count+1)
 bads={'truncated':b[:-1],'missing_fact':missing,'wrong_fact':bytes(wrong_fact),'wrong_format':b[:20]+b'\x03\x00'+b[22:]}
 sl=b.index(b'slnt');bad=bytearray(b);bad[sl+8:sl+12]=struct.pack('<I',0xffffffff);bads['duration_cap']=bytes(bad)
 for n,v in bads.items():
  try:parse_wavl(v);negatives[n]=False
  except ValueError as e:negatives[n]=str(e)
 host=run(['ffmpeg','-nostdin','-v','error','-i',F/'sparse.wav','-f','s16le','-'],ok=False)
 save('sparse_manifest.json',{'plan':plan,'source_bytes':len(b),'dense_bytes':len(wav(ref.tobytes())),'input_data_frames':len(a)+len(c),'reference_frames':len(ref),'scalar_samples':int(ref.size),'reference_sha256':sha(ref.tobytes()),'parser_matches_author_reference':True,'host_sparse':{'returncode':host.returncode,'frames':len(host.stdout)//4,'matches':host.stdout==ref.tobytes(),'stderr':host.stderr.decode(errors='replace')},'guards':negatives,'windows':[[0,333],[59000,60500]] if len(ref)>60500 else [[0,333],[500,2033],[20000,20667],[len(ref)-1000,len(ref)]],'semantics':'initial slnt uses zero; later slnt holds last sample per channel, not necessarily zero'})

def build_iir():
 n=120013;sr=48000;i=np.arange(n);rng=np.random.default_rng(25558)
 xs={}
 x=np.stack([.55*np.sin(2*np.pi*137*i/sr)+.15*rng.uniform(-1,1,n),.45*np.cos(2*np.pi*211*i/sr)+.12*rng.uniform(-1,1,n)],1).astype('<f4');x[35000:45000]=0;x[80000:82000]=[.75,-.5];xs['mixed']=x
 x=np.empty((n,2),dtype='<f4');x[:60000]=[1,-1];x[60000:]=[-1,1];xs['worst_step']=x
 records=[];eps=1e-5
 for name,x in xs.items():
  (F/(name+'.f32')).write_bytes(x.tobytes());assert np.max(np.abs(x))<=1
  for r in [.8,.98,.999]:
   P=math.ceil(math.log(eps/4)/math.log(r))
   # Real-arithmetic omitted-history bound <= r^(P+1). Numeric allowance is separate.
   out=np.empty_like(x);s=np.zeros(2,dtype=np.float64)
   for k in range(n):s=(1-r)*x[k].astype(np.float64)+r*s;out[k]=s
   stem=f'{name}_{str(r).replace(".","_")}';(F/(stem+'_reference.f32')).write_bytes(out.tobytes())
   records.append({'name':name,'r':r,'preroll':P,'state_bound':r**(P+1),'source':name+'.f32','reference':stem+'_reference.f32','frames':n,'channels':2,'intervals':[[0,257],[25000,25337],[59990,60777],[100003,102002]],'max_declared_abs_input':1,'source_hash':sha(x.tobytes())})
 save('iir_manifest.json',{'sample_rate':sr,'total_tolerance':eps,'analytic_state_budget':eps/4,'numeric_reserve':3*eps/4,'formula':'y[n]=(1-r)*x[n]+r*y[n-1], 0<r<1, |x|<=1, start state zero; warmup P gives |error|<=r**(P+1)','records':records,'not_general':'Not higher-order, time-varying, nonlinear, arbitrary decoder, or bit-exact.'})

def main():
 build_video();build_sparse();build_iir()
 save('environment.json',{'utc':run(['date','-u','+%Y-%m-%dT%H:%M:%SZ']).stdout.decode().strip(),'python':platform.python_version(),'platform':platform.platform(),'ffmpeg':run(['ffmpeg','-version']).stdout.decode().splitlines()[0],'chromium':run(['chromium','--version']).stdout.decode().strip(),'repo_commit':'0060c26c23290d20041f8433452e2eb088b31f59','maintained_player_executed':False,'scope':'synthetic preliminary standalone components'})
 print('Built VP9, sparse WAVE and IIR fixtures.')
if __name__=='__main__':main()
