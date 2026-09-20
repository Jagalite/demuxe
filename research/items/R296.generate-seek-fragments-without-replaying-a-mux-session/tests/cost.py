# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import ast,json,subprocess,struct,hashlib,time,statistics,random
h=Path(__file__).resolve().parents[1];r=h/'evidence/20260919T213100Z-stateless-cost';r.mkdir(exist_ok=False);source=h/'evidence/20260919T212400Z-dependent-gop/source.mp4';exe=h/'evidence/20260919T212900Z-native-mux-cost/mux-cost';requests=[(73,3,2),(4,0,5),(74,3,3),(4,0,5)]
(r/'plan.json').write_text(json.dumps(dict(declared_before_sampling=True,workload='Same four out-of-order dependent-GOP requests73,4,74,4. Each emits precedingRAP-throughrequestedpacket as independent fragment, relative decode origin0, original composition deltas. Baseline fresh native libavformat demux/mux process per request; candidate one full cold source+FFprobe packet index followed by stateless direct construction for4requests.',metric='End-to-end caller elapsed per4request batch, including native subprocess launch, source/index helper launch, parsing/copies/outputwrite/teardown. Elevenalternating pairs; median saving>=5percent. Native baseline internal times also exposed; do not confuse process orchestration saving with muxCPU.',scope='Host prototype caller under warm OS filesystem cache; not browser/Wasm, no network or memory claim. Cold map cost charged eachbatch, not amortized away. Generated source preparation and independent oracle common/excluded.'),indent=2)+'\n')
module=ast.parse((h/'tests/gop.py').read_text());functions=[x for x in module.body if isinstance(x,ast.FunctionDef) and x.name in ['box','construct']];ns=dict(struct=struct,hashlib=hashlib);exec(compile(ast.Module(body=functions,type_ignores=[]),'<original-constructor>','exec'),ns)
def prepare():
 b=source.read_bytes();p=0
 while b[p+4:p+8]!=b'moof':p+=int.from_bytes(b[p:p+4],'big')
 packets=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_data_hash','sha256','-of','json',str(source)]))['packets'];ns.update(b=b,init=b[:p],packets=packets,identity=hashlib.sha256(b).hexdigest())
def emit(index):
 data,chosen=ns['construct'](index,ns['identity']);offset=data.find(b'tfdt');assert offset>0;data=bytearray(data);data[offset+8:offset+16]=bytes(8);return bytes(data),chosen
prepare();checks=[]
for index,target,count in requests:
 cb=r/f'candidate-{index}.mp4';base=r/f'baseline-{index}.mp4';data,chosen=emit(index);cb.write_bytes(data);subprocess.run([str(exe),str(source),str(target),str(count),str(base)],check=True,capture_output=True)
 def probe(path):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_data_hash','sha256','-of','json',str(path)]))['packets']
 a=probe(cb);b=probe(base);assert len(a)==len(b)==count
 for x,y,z in zip(a,b,chosen):
  assert all(x[k]==y[k] for k in ['pts','dts','duration','data_hash']);assert x['pts']==z['pts']-chosen[0]['dts'] and x['dts']==z['dts']-chosen[0]['dts']
 raw=lambda p:subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-']);assert raw(cb)==raw(base);checks.append(dict(index=index,packets=count,fullPixelsExact=True,packetTimingExact=True))
rows=[]
for pair in range(11):
 row={}
 for variant in (['baseline','candidate'] if pair%2==0 else ['candidate','baseline']):
  t=time.perf_counter_ns();internal=[];outputs=[]
  if variant=='candidate':prepare()
  for index,target,count in requests:
   path=r/'scratch.mp4'
   if variant=='candidate':data,chosen=emit(index);path.write_bytes(data)
   else:internal.append(json.loads(subprocess.check_output([str(exe),str(source),str(target),str(count),str(path)])))
   outputs.append(hashlib.sha256(path.read_bytes()).hexdigest())
  row[variant]=dict(microseconds=(time.perf_counter_ns()-t)/1000,baselineInternal=internal,outputHashes=outputs)
 row['saving']=1-row['candidate']['microseconds']/row['baseline']['microseconds'];rows.append(row)
# Every repeated output equals its independently qualified variant; no timing-only fast path.
for variant in ['baseline','candidate']:
 assert all(x[variant]['outputHashes']==rows[0][variant]['outputHashes'] for x in rows)
xs=[x['saving'] for x in rows];random.seed(296);boots=sorted(statistics.median(random.choices(xs,k=11)) for _ in range(10000));median=statistics.median(xs);result=dict(correctnessPassed=True,checks=checks,pairs=rows,medianSaving=median,bootstrap95Median=[boots[250],boots[9749]],threshold=.05,performancePassed=median>=.05,limits='Caller end-to-end process orchestration and coldFFprobe indexing included. Internalnative microseconds separately available; cannot infer nativeWasm muxCPU benefit. No arbitrarysource/codec/track/routing qualification.')
(r/'results.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k!='pairs'},indent=2))
