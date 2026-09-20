# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,struct,json,hashlib,subprocess,array,time,statistics
p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True)
source=pathlib.Path('results/top100/mp3/source.mp3');data=source.read_bytes();identity=hashlib.sha256(data).hexdigest()
(p/'protocol.json').write_text(json.dumps({'scope':'MPEG1 LayerIII 48k stereo128kbps noCRC noXing; coded decoding units gathered from main-data reservoir and rebuilt as ordinary320kbps zero-reservoir frames. Preserve all side information except main_data_begin, coded data bits and synthesis preroll.','correctness':'Whole reconstruction and repeated excerpts exact continuous PCM; missing reservoir dependency, source identity, corrupted unit proof, cancellation and no synthesis preroll controls.','performance':'After correctness five alternating complete cold parse/rebuild20 excerpts (targets100/220 with3 preroll frames) and host decode/crop versus direct original complete-frame suffix with same preroll and decode/crop. Include all index/setup; <=0.9cost and <=1.25bytes.'},indent=2))
def bits(b,at,n):return (int.from_bytes(b,'big')>>(len(b)*8-at-n))&((1<<n)-1)
def units(data,claimed):
 if hashlib.sha256(data).hexdigest()!=claimed:raise ValueError('source identity')
 at=0
 if data[:3]==b'ID3':at=10+sum((data[6+i]&127)<<(21-7*i)for i in range(4))
 frames=[];slots=b''
 while at<len(data):
  h=data[at:at+4]
  if len(h)!=4 or h[0]!=255 or h[1]!=251 or (h[2]>>4)!=9 or ((h[2]>>2)&3)!=1 or (h[3]>>6)==3:raise ValueError('restricted MPEG1 stereo48k128 noCRC profile')
  size=384+((h[2]>>1)&1);frame=data[at:at+size]
  if len(frame)!=size:raise ValueError('bounds')
  side=frame[4:36];back=bits(side,0,9);length=sum(bits(side,20+i*59,12)for i in range(4));start=len(slots)-back;slots+=frame[36:]
  if start<0 or start*8+length>len(slots)*8:raise ValueError('missing reservoir dependency')
  coded=slots[start:start+(length+7)//8];header=bytearray(h);header[2]=(14<<4)|(h[2]&12);outside=bytearray(side);outside[0]=0;outside[1]&=127
  if len(coded)>924:raise ValueError('320kbps frame capacity')
  rebuilt=bytes(header)+outside+coded+bytes(924-len(coded));frames.append({'offset':at,'original':frame,'rebuilt':rebuilt,'back':back,'codedBits':length,'proof':hashlib.sha256(rebuilt).hexdigest()});at+=size
 return frames
def materialize(frames,claimed_proofs=None,cancelled=False):
 if cancelled:raise ValueError('cancelled')
 if claimed_proofs is not None and claimed_proofs!=[x['proof']for x in frames]:raise ValueError('coded unit identity')
 return b''.join(x['rebuilt']for x in frames)
def decode(path):return subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','f32le','-'],stderr=subprocess.DEVNULL)
frames=units(data,identity);full=decode(source);fb=1152*2*4;rebuilt=p/'whole.mp3';rebuilt.write_bytes(materialize(frames));actual=decode(rebuilt);whole=actual==full;rows=[]
for target in [100,220]:
 for prior in [0,1,2,3]:
  path=p/f'target{target}-prior{prior}.mp3';path.write_bytes(materialize(frames[target-prior:]));raw=decode(path)[prior*fb:];rows.append({'target':target,'prior':prior,'exact':raw==full[target*fb:],'decodedBytes':len(raw)})
controls={}
for name,fn in [('missingReservoir',lambda:units(b''.join(x['original']for x in frames[97:]),hashlib.sha256(b''.join(x['original']for x in frames[97:])).hexdigest())),('identity',lambda:units(data,'wrong')),('unitProof',lambda:materialize(frames,['wrong'])),('cancel',lambda:materialize(frames,cancelled=True))]:
 try:fn();controls[name]=False
 except ValueError:controls[name]=True
passed=whole and all(x['exact']for x in rows if x['prior']==3)and any(not x['exact']for x in rows if x['prior']==0)and all(controls.values())
result={'wholeExact':whole,'sourceFrames':len(frames),'sourceBytes':len(data),'rebuiltBytes':rebuilt.stat().st_size,'reservoirFrames':sum(bool(x['back'])for x in frames),'maxReservoirBytes':max(x['back']for x in frames),'rows':rows,'controls':controls,'correctnessPassed':passed,'sourceSHA256':identity}
(p/'results.json').write_text(json.dumps(result,indent=2));(p/'commands.log').write_text('python3 research/shared/tooling/audio-stage-probes/mp3_reservoir_units.py '+str(p)+'\nffmpeg -v error -i EACH.mp3 -f f32le -\n');print(result,flush=True)
if passed:
 times={'candidate':[],'baseline':[]};targets=[100,220]*10
 for trial in range(6):
  for variant in (['candidate','baseline']if trial%2==0 else ['baseline','candidate']):
   start=time.perf_counter_ns();fresh=units(source.read_bytes(),identity)
   for target in targets:
    path=p/'timed.mp3';path.write_bytes(materialize(fresh[target-3:])if variant=='candidate' else b''.join(x['original']for x in fresh[target-3:]));raw=decode(path)[3*fb:];assert raw==full[target*fb:]
   ms=(time.perf_counter_ns()-start)/1e6
   if trial:times[variant].append(ms)
 med={k:statistics.median(v)for k,v in times.items()};ratio=med['candidate']/med['baseline'];result={'timesMS':times,'medianMS':med,'ratio':ratio,'byteRatio':960/384,'passed':ratio<=.9 and 960/384<=1.25};(p/'cost-results.json').write_text(json.dumps(result,indent=2));print(result)
