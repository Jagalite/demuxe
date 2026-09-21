# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import json,hashlib,gzip
b=Path('research/items/unified-hybrid-software-engine');o=Path((b/'active-run.txt').read_text().strip());checks=[]
def passed(name,condition):
 assert condition,name
 checks.append({'name':name,'passed':True})
pictures=json.loads((o/'pictures.json').read_text());rows=[r for r in pictures['checks'] if 'oracleMAE' in r];passed('All completed picture checks match independent reference and available baseline',all(r['passed'] for r in rows));qualified={(r['variant'],r['family'],r['mode'],r['fixture']) for r in rows if r['passed']}
for browser,mode in [('chrome','hybrid'),('chrome','software'),('firefox','software')]:
 for variant in ['baseline','unified']:
  for fixture in ['user','rotation90']:passed(f'{browser} {mode} {variant} {fixture} picture/lifecycle gate',(variant,browser,mode,fixture) in qualified)
for size in json.loads((o/'sizes.json').read_text()):
 p=o/'variants'/size['variant']/'player.wasm';data=p.read_bytes();passed(size['variant']+' binary identity',hashlib.sha256(data).hexdigest()==size['sha256']);passed(size['variant']+' gzip roundtrip',gzip.decompress(Path(str(p)+'.gz').read_bytes())==data)
passed('Concurrent preparation and cancellation cache contracts',json.loads((o/'cache-contract.json').read_text())['passed'])
trials=[json.loads(p.read_text()) for p in o.glob('*/result.json')];candidate=[r for r in trials if r.get('variant')=='unified' and r['passed']]
for r in candidate:
 passed('One unified engine request '+str(r['startedAt']),len([q for q in r['requests'] if q['url'].endswith('/engine-unified/player.wasm')])==1)
 passed('One engine compilation '+str(r['startedAt']),len([q for q in r['compilePhases'] if q['bytes']>20000000])==1)
 passed('No legacy engine request '+str(r['startedAt']),not any('/engine-hybrid/player.wasm' in q['url'] or '/engine-software-full/player.wasm' in q['url'] for q in r['requests']))
passed('No sampled browser processes or workers survive successful trials',all(r['remainingWorkers']==0 and not r.get('survivingPids') for r in trials if r['passed']))
identities=json.loads((o/'production-identities-before.json').read_text());changes=[r['path'] for r in identities if hashlib.sha256(Path(r['path']).read_bytes()).hexdigest()!=r['sha256']];passed('Recorded production binaries and sources unchanged',not changes)
performance=None
if (o/'performance-analysis.json').exists():
 performance=json.loads((o/'performance-analysis.json').read_text());passed('All 22 declared performance trials complete',len(performance['rows'])==22)
 passed('All unified preparation trials and Chrome baselines prepared every requested asset',all(a['status']=='ready' for row in performance['rows'] if row['prepare']=='all' and (row['variant']=='unified' or row['browser']=='chrome') for a in json.loads(Path(row['path']).read_text())['preparation']['report']['assets']))
 passed('Combined engine gzip benefit exceeds 40 percent',performance['size']['savedPercent']>=40)
 passed('Chrome all-ready prepare-all median reduction exceeds 25 percent',all(r['metrics']['prepareMs']['reductionPercent']>=25 for r in performance['summary'] if r['stage']=='policy' and r['browser']=='chrome'))
result={'passed':True,'checks':checks,'successfulBrowserTrials':sum(r['passed'] for r in trials),'failedBrowserTrialsPreserved':sum(not r['passed'] for r in trials),'candidateBrowserTrials':len(candidate),'performanceComplete':performance is not None,'scope':'Bounded lab acceptance, not production or release qualification'};(o/'validation.json').write_text(json.dumps(result,indent=2));print(json.dumps({k:v for k,v in result.items() if k!='checks'},indent=2))
