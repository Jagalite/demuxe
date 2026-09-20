# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import sys,json,statistics,random
p=Path(sys.argv[1]);j=json.loads((p/'browser-results.json').read_text());prep=json.loads((p/'prepare-results.json').read_text());rows=j['pairs'];b=statistics.mean(r['baseline']for r in rows);c=statistics.mean(r['candidate']for r in rows);rng=random.Random(84);boot=[]
for _ in range(10000):
 s=rng.choices(rows,k=len(rows));boot.append((1-statistics.mean(r['candidate']for r in s)/statistics.mean(r['baseline']for r in s))*100)
boot.sort();v={'baseline_mean_ms':b,'candidate_mean_ms':c,'saving_percent':(1-c/b)*100,'saving_ci95':[boot[250],boot[9749]],'performance_passed':boot[250]>=10,'tile_preparation_seconds':sum(prep[f'tile{q}']['encode_seconds']for q in range(4)),'full_preparation_seconds':prep['full']['encode_seconds'],'all_tile_encoded_bytes':sum(prep[f'tile{q}']['encoded_bytes']for q in range(4)),'full_encoded_bytes':prep['full']['encoded_bytes'],'single_tile_bytes':prep['tile0']['encoded_bytes'],'bootstrap':'10000 paired resamples seed84'};(p/'results.json').write_text(json.dumps(v,indent=2)+'\n');print(v)
