# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import subprocess,json,hashlib,struct,time,statistics,random
h=Path(__file__).resolve().parents[1];r=h/'evidence/20260919T212300Z-source-map-cost';r.mkdir(exist_ok=False);origin=Path('research/items/R044.play-an-exact-requested-excerpt-without-re-encoding-its-edge-gop/evidence/20260919T203300Z-preroll-excerpt');source=origin/'source.mp4';exe=h/'evidence/20260919T212200Z-avio-map/avio-cost';targets=[6,2,8,4,2,6,4,8,2,6]
(r/'plan.json').write_text(json.dumps(dict(declared_before_measurement=True,pilot='One successful packet-identical source-bound fragment pilot precedes plan; no sampling thresholds selected from repeated costs.',workload='Ten regenerated seek sessions targets6,2,8,4,2,6,4,8,2,6sec. Each requests24video packets from preceding fragment. Baseline freshly opens complete source; candidate once fully reads/hashes/parses immutable source then writes selected init+fragment for each fresh demux owner. Same actual host libavformat custom AVIO.',sampling='11alternating-order paired batches, cold new map eachbatch; sourcefile cache warm. Candidate selection/hash/copy/write cost included plus actual libavformat file read/open/findstream/seek/read/hash/close. Process launch common and excluded.',threshold='Median totalbatch elapsed saving>=5percent; total userspace source-file read bytes including candidate cold source read >=50percent lower. AVIO logical reads separately reported; not physicaldisk/network transfer.',correctness='Every24packet digest includes payload,PTS,DTS,duration, compared separately to fullsource and independentFFprobe packet oracle. Source hash,span hash,bounds hostile controls. No audio playback or actualWasm admission claim.'),indent=2)+'\n')
def boxes(data,a,z):
 while a<z:
  n=int.from_bytes(data[a:a+4],'big');t=data[a+4:a+8]
  if n<8 or a+n>z:raise ValueError('box bounds')
  yield t,a,n;a+=n
def build(data):
 entries=[]
 for t,a,n in boxes(data,0,len(data)):
  if t!=b'moof':continue
  end=a+n;md=int.from_bytes(data[end:end+4],'big');assert data[end+4:end+8]==b'mdat' and end+md<=len(data);stamp=None
  for tt,b,w in boxes(data,a+8,end):
   if tt!=b'traf':continue
   track=when=None
   for k,c,z in boxes(data,b+8,b+w):
    if k==b'tfhd':track=int.from_bytes(data[c+12:c+16],'big')
    if k==b'tfdt':when=int.from_bytes(data[c+12:c+20] if data[c+8]==1 else data[c+12:c+16],'big')
   if track==1:stamp=when
  assert stamp is not None;entries.append(dict(start=a,size=n+md,dts=stamp,hash=hashlib.sha256(data[a:a+n+md]).hexdigest()))
 return dict(identity=hashlib.sha256(data).hexdigest(),initEnd=entries[0]['start'],entries=entries)
def select(data,m,target,identity):
 if identity!=m['identity']:raise ValueError('source identity')
 e=max((e for e in m['entries'] if e['dts']<=target*12288),key=lambda e:e['dts']);a,n=e['start'],e['size']
 if a<0 or n<8 or a+n>len(data):raise ValueError('span bounds')
 part=data[a:a+n]
 if hashlib.sha256(part).hexdigest()!=e['hash']:raise ValueError('span integrity')
 return data[:m['initEnd']]+part
packets=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_data','-of','json',str(source)]))['packets']
# FFprobe payload hashes independently verify exact raw packets below; C digest includes host little-endian timing words.
packethashes=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_data_hash','sha256','-of','json',str(source)]))['packets']
def run(path,target):return json.loads(subprocess.check_output([str(exe),str(path),str(target)]))
data=source.read_bytes();m=build(data);identity=m['identity'];controls=[]
for name,changed,ver in [('source identity',data,'changed'),('span corruption',data[:m['entries'][1]['start']+100]+bytes([data[m['entries'][1]['start']+100]^1])+data[m['entries'][1]['start']+101:],identity)]:
 try:select(changed,m,2,ver);raise AssertionError(name)
 except ValueError:controls.append(name)
wrong=json.loads(json.dumps(m));wrong['entries'][1]['size']=len(data)+1
try:select(data,wrong,2,identity);raise AssertionError('bounds')
except ValueError:controls.append('bounds')
oracles={}
for target in sorted(set(targets)):
 output=select(data,m,target,identity);file=r/f'fragment-{target}.mp4';file.write_bytes(output);a=run(source,target);b=run(file,target);assert a['sha256']==b['sha256'] and a['packets']==b['packets']==24
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_data_hash','sha256','-of','json',str(file)]))['packets'];pv=[p for p in probe if p['stream_index']==0][:24];full=[p for p in packethashes if p['stream_index']==0 and p['dts']>=b['firstDTS']][:24];assert len(pv)==len(full)==24
 for x,y in zip(pv,full):
  assert all(x[k]==y[k] for k in ['pts','dts','duration','data_hash'])
 oracles[target]=a['sha256']
rows=[]
for pair in range(11):
 row={}
 for variant in (['baseline','candidate'] if pair%2==0 else ['candidate','baseline']):
  cpu=0;filebytes=logical=0;records=[]
  if variant=='candidate':
   start=time.perf_counter_ns();data=source.read_bytes();m=build(data);identity=m['identity'];cpu+=(time.perf_counter_ns()-start)/1000;filebytes+=len(data)
  for target in targets:
   path=source
   if variant=='candidate':
    start=time.perf_counter_ns();out=select(data,m,target,identity);path=r/'scratch.mp4';path.write_bytes(out);cpu+=(time.perf_counter_ns()-start)/1000
   outcome=run(path,target);assert outcome['sha256']==oracles[target];cpu+=outcome['microseconds'];filebytes+=outcome['sourceBytes'];logical+=outcome['avioReadBytes'];records.append(outcome)
  row[variant]=dict(microseconds=cpu,userspaceSourceFileReadBytes=filebytes,logicalAVIOReadBytes=logical,queries=records)
 row['saving']=1-row['candidate']['microseconds']/row['baseline']['microseconds'];row['readSaving']=1-row['candidate']['userspaceSourceFileReadBytes']/row['baseline']['userspaceSourceFileReadBytes'];rows.append(row)
xs=[x['saving'] for x in rows];random.seed(45);boots=sorted(statistics.median(random.choices(xs,k=11)) for _ in range(10000));median=statistics.median(xs);read=rows[0]['readSaving'];result=dict(correctnessPassed=True,allQueryPacketsExact=True,independentFFprobe=True,adverse=controls,paired=rows,medianSaving=median,bootstrap95Median=[boots[250],boots[9749]],userspaceReadSaving=read,thresholds=dict(latency=.05,read=.50),performancePassed=median>=.05 and read>=.50,limits='Host fresh demux owner model; current preserved same-contextMOV index already avoids some rescans. Not measured browser/Wasm/remoteRange or physicaldisk, no source-bound map integration.')
(r/'results.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k!='paired'},indent=2))
