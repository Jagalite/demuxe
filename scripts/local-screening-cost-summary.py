#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Summarize the declared packed-PCM paired screen without dropping measured runs."""
import json,pathlib,random,statistics,sys
source=pathlib.Path(sys.argv[1]);data=json.loads(source.read_text());assert data.get('passed')
runs=[r for r in data['runs'] if not r['warmup']]
pairs=[]
for i in range(data['pairs']):
 pair={r['variant']:r for r in runs if r['pair']==i};assert set(pair)=={'reference','candidate'}
 a,b=pair['reference'],pair['candidate']
 pairs.append({'pair':i,'referenceCPUSeconds':a['cpuSeconds'],'candidateCPUSeconds':b['cpuSeconds'],'savedCPUSeconds':a['cpuSeconds']-b['cpuSeconds'],'savedFraction':1-b['cpuSeconds']/a['cpuSeconds'],'referenceWallMs':a['wallMs'],'candidateWallMs':b['wallMs'],'exited':a['exitedBeforeSnapshot']+b['exitedBeforeSnapshot']})
def saving(ps):return 1-sum(p['candidateCPUSeconds'] for p in ps)/sum(p['referenceCPUSeconds'] for p in ps)
rng=random.Random(7401)
boot=sorted(saving(rng.choices(pairs,k=len(pairs))) for _ in range(20000))
interval=[boot[500],boot[19499]];gate=data['minimumWorthwhileFraction']
missing=any(r['command']!='<defunct>' for p in pairs for r in p['exited'])
# A process already defunct before the operation cannot accrue further CPU; retain its record.
decision='INCONCLUSIVE' if missing or interval[0]<=gate<=interval[1] else 'PROMISING_RUNTIME' if interval[0]>gate else 'NO_CURRENT_OPPORTUNITY'
summary={'source':str(source),'primary':data['primary'],'minimumWorthwhileFraction':gate,'pairs':pairs,'referenceMeanCPUSeconds':statistics.mean(p['referenceCPUSeconds'] for p in pairs),'candidateMeanCPUSeconds':statistics.mean(p['candidateCPUSeconds'] for p in pairs),'pairedAggregateSavedFraction':saving(pairs),'pairedMedianSavedFraction':statistics.median(p['savedFraction'] for p in pairs),'pairedBootstrap95Interval':interval,'bootstrapResamples':20000,'bootstrapSeed':7401,'disposition':decision,'limits':['Seven pairs in one warm browser on one synthetic source; approximate bootstrap interval, not broad confirmation.','Includes harness, server and browser descendant CPU; excludes external system audio/driver services and physical energy.','Terminated processes between snapshots can be undercounted. Before-snapshot exits are recorded; newly started and exited processes are not recoverable from snapshots.','Both variants retain the stage observer; no observer-free deployment or cold-device benefit established.']}
source.with_name('summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps({k:v for k,v in summary.items() if k not in ['pairs','limits']},indent=2))
