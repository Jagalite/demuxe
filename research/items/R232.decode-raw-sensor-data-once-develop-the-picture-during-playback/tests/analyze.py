# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import sys,json,statistics,random
p=Path(sys.argv[1]);j=json.loads((p/'browser-results.json').read_text());rows=j['data']['pairs'];b=statistics.mean(r['baseline']['wallMs']for r in rows);c=statistics.mean(r['candidate']['wallMs']for r in rows);rng=random.Random(232);boot=[]
for _ in range(10000):
 s=rng.choices(rows,k=len(rows));boot.append((1-statistics.mean(r['candidate']['wallMs']for r in s)/statistics.mean(r['baseline']['wallMs']for r in s))*100)
boot.sort();v={'baseline_mean_ms':b,'candidate_mean_ms':c,'saving_percent':(1-c/b)*100,'saving_ci95':[boot[250],boot[9749]],'performance_passed':boot[250]>=10,'method':'10000pairedresamples seed232;9alternating coldGPUdevice30framejobs'};v['first_use_baseline_ms']=j['data']['correctness'][0]['wallMs'];v['first_use_candidate_ms']=j['data']['correctness'][1]['wallMs'];v['observed_initial_plus_nine_jobs_baseline_ms']=v['first_use_baseline_ms']+sum(r['baseline']['wallMs']for r in rows);v['observed_initial_plus_nine_jobs_candidate_ms']=v['first_use_candidate_ms']+sum(r['candidate']['wallMs']for r in rows);v['observed_initial_plus_nine_jobs_saving_percent']=(1-v['observed_initial_plus_nine_jobs_candidate_ms']/v['observed_initial_plus_nine_jobs_baseline_ms'])*100;
(p/'results.json').write_text(json.dumps(v,indent=2)+'\n');print(v)
