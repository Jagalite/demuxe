# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,subprocess,json,hashlib,struct,time,statistics,array,math

def sha(b):return hashlib.sha256(b).hexdigest()
def blocks(raw):
 rows=[];at=0
 while at<len(raw):
  if raw[at:at+4]!=b'wvpk' or at+32>len(raw):raise ValueError('block framing')
  size=int.from_bytes(raw[at+4:at+8],'little')+8;index=int.from_bytes(raw[at+16:at+20],'little');n=int.from_bytes(raw[at+20:at+24],'little')
  if size<32 or at+size>len(raw):raise ValueError('truncation')
  rows.append({'offset':at,'bytes':size,'index':index,'samples':n,'sha256':sha(raw[at:at+size])});at+=size
 return rows
commands=[]
def run(args):
 r=subprocess.run(args,capture_output=True);commands.append({'args':args,'exit':r.returncode,'stderr':r.stderr.decode(errors='replace')});assert r.returncode==0,commands[-1];return r.stdout
def decode(path,start=0,count=None,ignore=False):
 args=['wvunpack','-q','-r','-y',f'--skip={start}']+([f'--until=+{count}']if count else[])+(['-i']if ignore else[])+[str(path),'-o','-'];return run(args)
def fetch(path,rows,start,identity,actualbase,expectedbase,cancel=False):
 if cancel or actualbase!=expectedbase or identity!=sha(json.dumps(rows,sort_keys=True).encode()):raise ValueError('identity or cancellation')
 if start not in[x['index']for x in rows]:raise ValueError('not block boundary')
 out=[];count=0
 with path.open('rb')as f:
  for row in rows:
   if row['index']<start and row['index']!=0:continue
   f.seek(row['offset']);b=f.read(row['bytes']);count+=len(b)
   if sha(b)!=row['sha256']:raise ValueError('correction hash')
   out.append(b)
 return b''.join(out),count
p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True)
(p/'protocol.json').write_text(json.dumps({'scope':'Explicit lossy first192000 samples, exact suffix after aligned block at192000,48kstereoS16 hybrid WavPack. Trusted base-bound correction block map; absent/stale/truncated or unaligned correction never claims exact. Local seek/read is a range source, no network latency claim.','cost':'After correctness five paired jobs of10 identical mode-switch playbacks. Candidate includes reading/hashing entire correction once to prepare block map and then10 requested suffix reads, baseline10 entire correction reads. Both decode same lossy prefix and exact suffix. Primary correction bytes<=0.7 baseline; count base bytes separately and report CPU without claiming speedup.'},indent=2))
run(['ffmpeg','-v','error','-y','-f','lavfi','-i','aevalsrc=0.4*sin(2*PI*(431*t+37*t*t))|0.3*sin(2*PI*(617*t+21*t*t)):s=48000:d=8','-sample_fmt','s16',str(p/'source.wav')]);run(['wavpack','-q','-y','-b3','-c','--blocksize=48000',str(p/'source.wav'),'-o',str(p/'source.wv')]);reference=run(['ffmpeg','-v','error','-i',str(p/'source.wav'),'-f','s16le','-']);base=(p/'source.wv').read_bytes();corr=(p/'source.wvc').read_bytes();rows=blocks(corr);identity=sha(json.dumps(rows,sort_keys=True).encode());baseid=sha(base);start=192000;selected,n=fetch(p/'source.wvc',rows,start,identity,baseid,baseid);(p/'partial.wv').write_bytes(base);(p/'partial.wvc').write_bytes(selected);full=decode(p/'source.wv');assert full==reference;lossy=decode(p/'source.wv',ignore=True);assert lossy!=reference;suffix=decode(p/'partial.wv',start);assert suffix==reference[start*4:];prefix=decode(p/'source.wv',0,start,True);expected=prefix+suffix
controls={}
for name,kwargs in [('wrongBase',{'actualbase':'wrong'}),('cancel',{'cancel':True}),('unaligned',{'start':start+1}),('wrongManifest',{'identity':'wrong'})]:
 args=dict(path=p/'source.wvc',rows=rows,start=start,identity=identity,actualbase=baseid,expectedbase=baseid);args.update(kwargs)
 try:fetch(**args);controls[name]=False
 except ValueError:controls[name]=True
(p/'truncated.wvc').write_bytes(corr[:-1])
try:fetch(p/'truncated.wvc',rows,start,identity,baseid,baseid);controls['truncation']=False
except ValueError:controls['truncation']=True
assert all(controls.values());times={'candidate':[],'baseline':[]};counts={}
for trial in range(5):
 for variant in (['candidate','baseline']if trial%2==0 else ['baseline','candidate']):
  begin=time.perf_counter_ns();bytesRead=0
  if variant=='candidate':
   raw=(p/'source.wvc').read_bytes();bytesRead+=len(raw);table=blocks(raw);ident=sha(json.dumps(table,sort_keys=True).encode())
  for job in range(10):
   rawbase=(p/'source.wv').read_bytes();assert sha(rawbase)==baseid;(p/'timed.wv').write_bytes(rawbase)
   if variant=='candidate':payload,amount=fetch(p/'source.wvc',table,start,ident,sha(rawbase),baseid)
   else:payload=(p/'source.wvc').read_bytes();amount=len(payload)
   bytesRead+=amount;(p/'timed.wvc').write_bytes(payload);got=decode(p/'timed.wv',0,start,True)+decode(p/'timed.wv',start);assert got==expected
  times[variant].append((time.perf_counter_ns()-begin)/1e6);counts[variant]=bytesRead
med={k:statistics.median(v)for k,v in times.items()};ratio=counts['candidate']/counts['baseline'];(p/'results.json').write_text(json.dumps({'fullExact':True,'suffixExact':True,'baseOnlyIntentionallyDifferent':True,'switchSample':start,'frames':len(full)//4,'correctionBlockMap':rows,'selectedCorrectionBytes':n,'totalCorrectionBytes':len(corr),'controls':controls,'scope':'libwavpack5.9 local dual-source range adapter; no native-browser codec or network claim'},indent=2));(p/'cost-results.json').write_text(json.dumps({'timesMS':times,'medianMS':med,'wallTimeRatio':med['candidate']/med['baseline'],'correctionBytesIncludingMapSetup':counts,'correctionByteRatio':ratio,'baseBytesBoth':len(base)*10,'totalBytesRatio':(counts['candidate']+len(base)*10)/(counts['baseline']+len(base)*10),'passed':ratio<=.7},indent=2));(p/'commands.log').write_text('\n'.join(json.dumps(x)for x in commands));print(med,counts,ratio)
