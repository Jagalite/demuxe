# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json,subprocess,array,struct,time,statistics,random,hashlib
from ima_wav_logical import parse,decode,advance,STEP
p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);base=pathlib.Path('research/shared/runs/20260919T232859Z-ima-fixture');exe=p/'scan';table=p/'steps.s32';table.write_bytes(array.array('i',STEP).tobytes());build=['c++','-std=c++17','-O2','-pthread','research/shared/tooling/audio-stage-probes/ima_clipped_scan.cpp','-o',str(exe)];subprocess.run(build,check=True)
(p/'protocol.json').write_text(json.dumps({'scope':'Actual IMA WAV mono/stereo nibble parsing; two associative clipped-transition scans: step-index then predictor. Work-efficient four-chunk local-prefix/carry/correction scan in compiledC++,actual4threads perphase; current per-shift delta rule matchesFFmpeg8.1.2, older product-rounding rule explicitly excluded.','correctness':'Compiled serial/parallel outputs exactly matchFFmpeg,25synthetic controls startingindices0/1/44/87/88 and predictors min/max/zero, nibbleextremes. Invalidheader/code guards.','performance':'Five alternating complete mono+stereo jobs source read/hash/WAVparse/nibble serialization/compiled process/tableload/threadcreation/shutdown/output read/reinterleave versus same compiled serial ordinary decode. <=0.9cost; intermediate storage reported, compilation excluded.'},indent=2))
def pack(parsed):
 records=[]
 for block in parsed['blocks']:
  for (pred,index),codes in zip(block['headers'],block['codes']):records.append(struct.pack('<iiI',pred,index,len(codes))+bytes(codes))
 return struct.pack('<I',len(records))+b''.join(records)
def run(mode,packed,name):
 inp=p/(name+'.bin');inp.write_bytes(packed);out=p/(name+'-'+mode+'.s16');subprocess.run([str(exe),mode,str(table),str(inp),str(out)],check=True);a=array.array('h');a.frombytes(out.read_bytes());return a
def job(mode,ch):
 f=base/f'{ch}ch.wav';raw=f.read_bytes();hashlib.sha256(raw).digest();parsed=parse(raw);a=run(mode,pack(parsed),f'{ch}ch');n=parsed['samplesPerBlock'];out=array.array('h')
 for block in range(len(parsed['blocks'])):
  for i in range(n):
   for c in range(ch):out.append(a[(block*ch+c)*n+i])
 return out
rows=[];refs={}
for ch in[1,2]:
 ref=array.array('h');ref.frombytes(subprocess.check_output(['ffmpeg','-v','error','-i',str(base/f'{ch}ch.wav'),'-f','s16le','-'],stderr=subprocess.DEVNULL));refs[ch]=ref
 for mode in['serial','parallel']:assert job(mode,ch)==ref
 rows.append({'channels':ch,'frames':len(ref)//ch,'serialParallelHostExact':True})
synthetic=[]
for idx in[0,1,44,87,88]:
 for pred in[-32768,-32767,0,32766,32767]:
  codes=([7]*32+[15]*64+[0,8,1,9,2,10,3,11]*16);state=(pred,idx);expected=[pred]
  for code in codes:state=advance(*state,code);expected.append(state[0])
  packed=struct.pack('<IiiI',1,pred,idx,len(codes))+bytes(codes);out=run('parallel',packed,'synthetic');assert list(out)==expected;synthetic.append({'index':idx,'predictor':pred,'samples':len(expected),'exact':True})
bad=p/'invalid.bin';bad.write_bytes(struct.pack('<IiiI',1,0,89,1)+b'\0');r=subprocess.run([str(exe),'parallel',str(table),str(bad),str(p/'invalid-output.s16')]);assert r.returncode==4 and not(p/'invalid-output.s16').exists();(p/'results.json').write_text(json.dumps({'rows':rows,'synthetic':synthetic,'invalidIndexReject':True,'noInvalidOutput':True,'workerThreadsPerScanPhase':4,'scanPhasesPerChannelBlock':4,'deltaRule':'per-shift normative/currentFFmpeg8.1.2; not older product rounding'},indent=2));times={'parallel':[],'serial':[]}
for trial in range(6):
 for mode in (['parallel','serial']if trial%2==0 else ['serial','parallel']):
  start=time.perf_counter_ns();outputs=[job(mode,ch)for ch in[1,2]];ms=(time.perf_counter_ns()-start)/1e6;assert all(out==refs[ch]for out,ch in zip(outputs,[1,2]))
  if trial:times[mode].append(ms)
med={k:statistics.median(v)for k,v in times.items()};ratio=med['parallel']/med['serial'];cost={'timesMS':times,'medianMS':med,'ratio':ratio,'passed':ratio<=.9};(p/'cost-results.json').write_text(json.dumps(cost,indent=2));(p/'commands.log').write_text(json.dumps(build)+'\npython3 research/shared/tooling/audio-stage-probes/ima_clipped_scan.py '+str(p)+'\n');print(cost)
