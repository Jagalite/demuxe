# SPDX-License-Identifier: Apache-2.0
import json,random,statistics,subprocess,sys,time
from pathlib import Path
out=Path(sys.argv[1]);exe=Path('build/catalogue-tools/tenbit-tile-owner');rows=[]
for n in range(9):
 pair={}
 for mode in (['baseline','candidate'] if n%2==0 else ['candidate','baseline']):
  start=time.perf_counter_ns();p=subprocess.run([str(exe),str(out/'decoded.yuv'),str(out/'filter-oracle.u16'),mode],capture_output=True,text=True,check=True);ms=(time.perf_counter_ns()-start)/1e6
  j=json.loads(p.stdout);assert j['owners_released'];pair[mode]={'wall_ms':ms,**j}
 assert pair['baseline']['digest']==pair['candidate']['digest'];rows.append(pair)
 (out/'timings.json').write_text(json.dumps(rows,indent=2)+'\n')
b=statistics.mean(x['baseline']['wall_ms'] for x in rows);c=statistics.mean(x['candidate']['wall_ms'] for x in rows);rng=random.Random(211);boot=[]
for _ in range(10000):
 sample=rng.choices(rows,k=len(rows));boot.append((statistics.mean(x['candidate']['wall_ms'] for x in sample)/statistics.mean(x['baseline']['wall_ms'] for x in sample)-1)*100)
boot.sort();reduction=(1-max(x['candidate']['owned_peak_bytes'] for x in rows)/max(x['baseline']['owned_peak_bytes'] for x in rows))*100
j={'pairs':9,'baseline_mean_ms':b,'candidate_mean_ms':c,'whole_cost_regression_percent':(c/b-1)*100,'regression_ci95':[boot[250],boot[9749]],'owned_capacity_reduction_percent':reduction,'gate_passed':reduction>=25 and boot[9749]<=25,'raw':'timings.json','bootstrap':'10000 paired resamples, seed211'}
(out/'results.json').write_text(json.dumps(j,indent=2)+'\n');print(json.dumps(j,indent=2))
