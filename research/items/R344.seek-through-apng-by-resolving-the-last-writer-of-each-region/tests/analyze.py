# SPDX-License-Identifier: Apache-2.0
import json,random,statistics,sys
from pathlib import Path
p=Path(sys.argv[1]);j=json.loads((p/'browser-results.json').read_text());rows=j['pairs'];means={m:statistics.mean(r[m]['ms'] for r in rows)for m in ['candidate','forward','native']};baseline=min(['native','forward'],key=lambda m:means[m]);rng=random.Random(344);boot=[]
for _ in range(10000):
 s=rng.choices(rows,k=len(rows));boot.append((1-statistics.mean(r['candidate']['ms'] for r in s)/statistics.mean(r[baseline]['ms'] for r in s))*100)
boot.sort();v={'means_ms':means,'cheapest_baseline':baseline,'saving_percent':(1-means['candidate']/means[baseline])*100,'saving_ci95':[boot[250],boot[9749]],'performance_passed':boot[250]>=10,'method':'10000 paired bootstrap resamples, seed344;9alternating wholejobs'};(p/'results.json').write_text(json.dumps(v,indent=2)+'\n');print(json.dumps(v))
