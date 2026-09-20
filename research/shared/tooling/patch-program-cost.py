# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,time,json,statistics,random,hashlib,subprocess
out=pathlib.Path(sys.argv[1]);src=pathlib.Path('results/top100/patch-mux/probe.py').read_text();prefix=src.split('rebuilt=bytearray(init)')[0];raw=pathlib.Path('results/top100/mse/red.mp4').read_bytes();ns={'__file__':'results/top100/patch-mux/probe.py'};exec(prefix,ns);jobs=[]
for seq,(p,n) in enumerate(ns['moofs'],1):
 header=raw[p:p+n];mdat=p+n;size=int.from_bytes(raw[mdat:mdat+4],'big');payload=raw[mdat+8:mdat+size];dp,dn=ns['fields']['duration'];tp,tn=ns['fields']['dts'];jobs.append((seq,int.from_bytes(header[dp:dp+dn],'big'),int.from_bytes(header[tp:tp+tn],'big'),payload))
def box(t,p):return (len(p)+8).to_bytes(4,'big')+t+p
def u(v):return v.to_bytes(4,'big')
def ordinary(seq,duration,dts,payload):
 if not(1<=seq<2**32 and 0<duration<2**32 and 0<=dts<2**64 and 0<len(payload)<1048576):raise ValueError('parameter bound')
 mfhd=box(b'mfhd',u(0)+u(seq));tfhd=box(b'tfhd',bytes.fromhex('00020038')+u(1)+u(duration)+u(len(payload))+bytes.fromhex('01010000'));tfdt=box(b'tfdt',u(1<<24)+dts.to_bytes(8,'big'));trun=box(b'trun',u(5)+u(1)+u(112)+bytes.fromhex('02000000'));return box(b'moof',mfhd+box(b'traf',tfhd+tfdt+trun))+box(b'mdat',payload)
expected=ns['init']+b''.join(ordinary(*j) for j in jobs);assert expected==pathlib.Path('results/top100/patch-mux/rebuilt.mp4').read_bytes()
result={'plan':json.loads((out/'plan.json').read_text()),'rows':[]}
for pair in range(11):
 row={'pair':pair}
 for mode in (['baseline','candidate'] if pair%2==0 else ['candidate','baseline']):
  start=time.perf_counter();local={'__file__':'results/top100/patch-mux/probe.py'}
  # Both read source/config; candidate additionally parses and compiles fixed offsets.
  data=pathlib.Path('results/top100/mse/red.mp4').read_bytes()
  if mode=='candidate':exec(prefix,local);emit=local['emit'];init=local['init']
  else:emit=ordinary;init=ns['init']
  hashes=[]
  for movie in range(200):
   built=init+b''.join(emit(*j) for j in jobs);hashes.append(hashlib.sha256(built).hexdigest())
  ms=(time.perf_counter()-start)*1000;assert set(hashes)=={hashlib.sha256(expected).hexdigest()};row[mode]={'ms':ms,'movies':200,'fragments':4800,'exact':True,'outputBytes':len(expected)*200,'templateBytes':len(ns['template']) if mode=='candidate' else 0}
 result['rows'].append(row)
vals=[1-r['candidate']['ms']/r['baseline']['ms'] for r in result['rows']];rng=random.Random(162);bs=sorted(statistics.median(rng.choices(vals,k=11)) for _ in range(10000));result['analysis']={'medianSaving':statistics.median(vals),'bootstrap95':[bs[250],bs[9750]],'accepted':bs[250]>.05};(out/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(result['analysis'])
