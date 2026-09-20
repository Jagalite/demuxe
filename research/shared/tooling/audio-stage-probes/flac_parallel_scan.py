# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,struct,array,subprocess,json,time,statistics,hashlib
from flac_bits import Bits,crc,header
p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);source=pathlib.Path('research/shared/runs/20260919T225529Z-flac-reverse/source.flac');identity=hashlib.sha256(source.read_bytes()).hexdigest();N=257;W=17
(p/'protocol.json').write_text(json.dumps({'scope':'Actual fixed-order1 FLAC entropy traversal of escape17bit residuals,24blocks257samples, followed by4-thread local prefix scans, block carry computation and4-thread correction. All source read/identity/entropy parse/intermediate serialization/execution/output read included.','baseline':'Same real entropy parser and transfer with compiled serial first-order recurrence, not Python-loop straw baseline. Independent FFmpegPCM oracle.','performance':'Five alternating cold complete jobs after one warmup; candidate<=0.9baseline. Compile setup excluded and recorded. Thread creation/join included; no pool amortization claims.','guards':'Invalid source identity/CRC/truncation and wrong predictor reject. Signed16 extrema exact, omitted carry produces wrong output.'},indent=2));exe=p/'scan';build=['c++','-std=c++17','-O2','-pthread','research/shared/tooling/audio-stage-probes/flac_parallel_scan.cpp','-o',str(exe)];start=time.perf_counter_ns();subprocess.run(build,check=True);(p/'build.json').write_text(json.dumps({'command':build,'milliseconds':(time.perf_counter_ns()-start)/1e6},indent=2))
def signed(v,n):return v-(1<<n)if v&(1<<(n-1))else v
def parse(data,claimed):
 if hashlib.sha256(data).hexdigest()!=claimed:raise ValueError('identity')
 at=42;values=[];i=0;size=8+(39+(N-1)*W+7)//8+2
 while at<len(data):
  b=data[at:at+size]
  if len(b)!=size or b[:8]!=header(i,N,1,16)or int.from_bytes(b[-2:],'big')!=crc(b[:-2],16):raise ValueError('header/CRC')
  bits=Bits.frombytes(b[8:-2])
  if bits.read(8)!=18:raise ValueError('predictor')
  values.append(signed(bits.read(16),16))
  if [bits.read(2),bits.read(4),bits.read(4),bits.read(5)]!=[0,0,15,W]:raise ValueError('residual')
  values.extend(signed(bits.read(W),W)for _ in range(N-1));i+=1;at+=size
 return struct.pack('<II',i,N)+array.array('i',values).tobytes()
def job(mode):
 packed=parse(source.read_bytes(),identity);inp=p/'input.bin';inp.write_bytes(packed);dst=p/(mode+'.s32');subprocess.run([str(exe),mode,str(inp),str(dst)],check=True);return dst.read_bytes()
raw=array.array('h');raw.frombytes(subprocess.check_output(['ffmpeg','-v','error','-i',str(source),'-f','s16le','-'],stderr=subprocess.DEVNULL));expected=array.array('i',raw).tobytes();serial=job('serial');parallel=job('parallel');assert serial==parallel==expected;controls={};data=source.read_bytes()
for name,bad,claim in [('identity',data,'wrong'),('truncated',data[:-1],hashlib.sha256(data[:-1]).hexdigest()),('CRC',data[:-3]+bytes([data[-3]^1])+data[-2:],None)]:
 try:parse(bad,claim or hashlib.sha256(bad).hexdigest());controls[name]=False
 except ValueError:controls[name]=True
wrong=bytearray(data);size=8+(39+(N-1)*W+7)//8+2;wrong[50]=16;wrong[42+size-2:42+size]=struct.pack('>H',crc(wrong[42:42+size-2],16))
try:parse(bytes(wrong),hashlib.sha256(wrong).hexdigest());controls['predictor']=False
except ValueError:controls['predictor']=True
packed=parse(data,identity);res=array.array('i');res.frombytes(packed[8:]);wrong=[]
for at in range(0,len(res),N):
 wrong.append(res[at])
 for chunk in range(4):
  state=0
  for r in res[at+1+chunk*64:at+1+(chunk+1)*64]:state+=r;wrong.append(state)
assert array.array('i',wrong).tobytes()!=expected and all(controls.values());(p/'results.json').write_text(json.dumps({'samples':len(raw),'independentFFmpegExact':True,'serialParallelExact':True,'controls':controls,'omittedCarryMismatch':True,'workerThreadsPerPhase':4,'phases':2,'intermediateBytes':len(packed),'sourceSHA256':identity},indent=2));times={'parallel':[],'serial':[]}
for trial in range(6):
 for mode in (['parallel','serial']if trial%2==0 else ['serial','parallel']):
  start=time.perf_counter_ns();out=job(mode);ms=(time.perf_counter_ns()-start)/1e6;assert out==expected
  if trial:times[mode].append(ms)
med={k:statistics.median(v)for k,v in times.items()};ratio=med['parallel']/med['serial'];cost={'timesMS':times,'medianMS':med,'ratio':ratio,'passed':ratio<=.9};(p/'cost-results.json').write_text(json.dumps(cost,indent=2));(p/'commands.log').write_text(json.dumps(build)+'\npython3 research/shared/tooling/audio-stage-probes/flac_parallel_scan.py '+str(p)+'\n'+str(exe)+' MODE '+str(p/'input.bin')+' OUTPUT.s32\n');print(cost)
