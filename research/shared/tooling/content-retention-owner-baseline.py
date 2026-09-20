# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import json,subprocess,hashlib,tracemalloc,time,gc,statistics,sys
r=Path(sys.argv[1]);paths=[Path('results/top100/mse/red.mp4'),Path('results/top100/ownership/rewrapped.mp4')];indexes=[];digest=lambda b:hashlib.sha256(b).hexdigest()
for p in paths:
 d=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_streams','-show_data','-of','json',str(p)]));indexes.append((digest(d['streams'][0]['extradata'].encode()),[(int(x['pos']),int(x['size'])) for x in d['packets']]))
assert digest(paths[0].read_bytes())!=digest(paths[1].read_bytes());expected=[]
for p,(_,spans) in zip(paths,indexes):
 b=p.read_bytes();expected.append([digest(b[a:a+n]) for a,n in spans])
assert expected[0]==expected[1]
def build(shared):
 owners=[];cache={};ownerCaches=[]
 for p,(config,spans) in zip(paths,indexes):
  raw=p.read_bytes();packets=[]
  if not shared:cache={}
  ownerCaches.append(cache)
  for pos,size in spans:
   b=raw[pos:pos+size]
   if True:
    key=(config,digest(b));known=cache.get(key)
    if known is not None:
     if known!=b:raise ValueError('corrupt digest claim')
     b=known
    else:cache[key]=b
   packets.append(b)
  owners.append(packets)
 return owners,cache if shared else ownerCaches
result={'plan':json.loads((r/'plan.json').read_text()),'pairs':[],'sourceHashes':[digest(p.read_bytes()) for p in paths]}
for i in range(9):
 row={'pair':i}
 for name in (['candidate','baseline'] if i%2 else ['baseline','candidate']):
  gc.collect();tracemalloc.start();t=time.perf_counter_ns();owners,cache=build(name=='candidate');elapsed=time.perf_counter_ns()-t;live,peak=tracemalloc.get_traced_memory();tracemalloc.stop();assert [[digest(b) for b in x] for x in owners]==expected
  row[name]={'liveTracedBytes':live,'peakTracedBytes':peak,'wallNs':elapsed,'logicalPayloadBytes':sum(map(len,sum(owners,[]))),'uniquePayloadBytes':sum(map(len,{id(b):b for x in owners for b in x}.values()))};owners.clear();cache.clear();assert not owners and not cache
 result['pairs'].append(row)
values=[1-p['candidate']['liveTracedBytes']/p['baseline']['liveTracedBytes'] for p in result['pairs']];result['analysis']={'medianLiveSaving':statistics.median(values),'minLiveSaving':min(values),'maxLiveSaving':max(values),'accepted':statistics.median(values)>=.1,'baselineLiveBytes':statistics.median(p['baseline']['liveTracedBytes'] for p in result['pairs']),'candidateLiveBytes':statistics.median(p['candidate']['liveTracedBytes'] for p in result['pairs'])};result['allOwnerRefsReleased']=True;result['passed']=True;(r/'results.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result['analysis']))
