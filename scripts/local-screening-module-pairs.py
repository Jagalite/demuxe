#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Rotated startup suites for the two already-checked module hook variants."""
import pathlib,subprocess,os,json,random,statistics
maintained=os.environ.get('MAINTAINED_BASELINE')=='1'
root=pathlib.Path(os.environ.get('RESULT_ROOT','results/local-screening/runs/module-pairs-01'));root.mkdir(exist_ok=False)
runs=[]
for pair in range(-1,7):
 for variant in (['reference','candidate'] if pair%2==0 else ['candidate','reference']):
  out=root/f'{pair+1:02d}-{variant}'
  subprocess.run(['node','tests/local-screening-module.mjs'],env={**os.environ,'RESULT_ROOT':str(out),'MODULE_REUSE':'1' if variant=='candidate' else '0','MAINTAINED_REFERENCE':'1' if maintained and variant=='reference' else '0'},check=True)
  data=json.loads((out/'result.json').read_text());assert not data.get('error') and all(c.get('passed') for c in data['cases'])
  runs.append({'pair':pair,'variant':variant,'warmup':pair==-1,'suiteMs':sum(c['openPlayDestroyMs'] for c in data['cases']),'result':str(out/'result.json')})
  (root/'runs.json').write_text(json.dumps(runs,indent=2)+'\n')
pairs=[]
for i in range(7):
 p={r['variant']:r['suiteMs'] for r in runs if r['pair']==i};pairs.append({'pair':i,**p})
def saving(ps):return 1-sum(p['candidate'] for p in ps)/sum(p['reference'] for p in ps)
rng=random.Random(2701);boot=sorted(saving(rng.choices(pairs,k=7)) for _ in range(20000));ci=[boot[500],boot[19499]]
summary={'maintainedBaseline':maintained,'scope':'Fresh Chrome profiles, warm OS/file cache; complete cold/repeated/concurrent startup suite includes initial immutable-module population. Research hooks only; no sustained CPU or production cache qualification.','pairs':pairs,'referenceMeanSuiteMs':statistics.mean(p['reference'] for p in pairs),'candidateMeanSuiteMs':statistics.mean(p['candidate'] for p in pairs),'minimumWorthwhileFraction':.10,'pairedAggregateSavedFraction':saving(pairs),'pairedBootstrap95Interval':ci,'bootstrapSeed':2701,'bootstrapResamples':20000,'disposition':'PROMISING_RUNTIME' if ci[0]>.1 else 'NO_CURRENT_OPPORTUNITY' if ci[1]<.1 else 'INCONCLUSIVE'}
(root/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))
