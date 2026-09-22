# SPDX-License-Identifier: Apache-2.0
"""Read-only validation of this follow-up, including immutable final runtimes."""
import pathlib,json,hashlib,sys,collections
root=pathlib.Path(__file__).resolve().parents[3];c=json.loads(pathlib.Path(sys.argv[1]).read_text());run=root/c['run'];errors=[];cache={}
def read(p):return json.loads(p.read_text())
def sha(p):
 p=p.resolve()
 if p not in cache:cache[p]=hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None
 return cache[p]
def check(test,message):
 if not test:errors.append(message)
m=read(run/'manifest.json')
for a in m['artifacts']:check(sha(root/a['path'])==a['sha256'],'Artifact mismatch: '+a['path'])
triage=read(run/'triage.json');check(len(triage['records'])==73 and len({r['id']for r in triage['records']})==73,'External ID coverage')
prior=read(run/'prior-item-state.json');decisions=read(run/'decisions.json');active={r['key'] for r in decisions}
for key,p in prior.items():
 home=root/'research/items'/key;item=read(home/'item.json');history=(home/'history.jsonl').read_bytes();check(hashlib.sha256(history[:p['history_bytes']]).hexdigest()==p['history_sha256'],'Historical prefix changed: '+key)
 check(len([x for x in history.decode().splitlines() if json.loads(x).get('run_id')==c['run_id']])==1,'Missing/duplicate follow-up: '+key)
 if key not in active:
  check(item['current_decision']==p['item']['current_decision'] and item['stages']==p['item']['stages'],'Unselected decision/stages changed: '+key)
 check(set(item['stages'])=={'define','prepare','screen','correctness','performance','results','decision'},'Stage set: '+key)
 for stage,v in item['stages'].items():check(v['status'] in ['passed','failed','pending','blocked','not_applicable'] and bool(v['basis']),'Invalid stage '+key+'/'+stage)
 check(item['stages']['performance']['status']!='passed' or item['stages']['correctness']['status']=='passed','Performance before correctness: '+key)
 for a in read(home/'evidence/index.json')['artifacts']:
  if any(u.get('run_id')==c['run_id'] for u in a.get('uses',[])):check(sha(root/a['path'])==a['sha256'],'Registered evidence mismatch: '+a['path'])
for correct,perf,count in [('correctness-final','performance-final',5),('ogg-selection-v2','ogg-performance',2)]:
 a=read(run/correct/'results.json');b=read(run/perf/'results.json');check(a['passed'],'Final correctness failed: '+correct);check(len(b['profiles'])==count,'Performance profile count: '+perf)
 assets={x['path']:x for x in a['assets']}
 for x in a['assets']+b['assets']:check(sha(root/x['snapshot'])==x['sha256'],'Final runtime snapshot mismatch: '+x['path'])
 for x in b['assets']:
  if x['path'] in assets:check(x['sha256']==assets[x['path']]['sha256'],'Correctness/performance runtime drift: '+x['path'])
 for p in b['profiles']:
  check(len(p['pairs'])==7 and p.get('passed')==(p['total']['medianRatio']<=1.15 and p['startup']['medianRatio']<=1.25),'Incomplete or misclassified final pairs: '+p['id'])
  for pair in p['pairs']:
   check('error' not in pair,'Trial error: '+p['id'])
   for arm in ['candidate','reference']:check(pair.get(arm,{}).get('workersAfterDestroy')==0,'Worker survived: '+p['id'])
 check(read(run/perf/'process-exit.json')['passed'],'Browser process survived: '+perf)
check(read(run/'aac-parser-contracts.json')['passed'],'AAC parser contracts')
check(all(x['exact']for x in read(run/'finite-audio-host-oracles.json')),'Finite audio host output')
check(all(x['exact']for x in read(run/'ogg-selection/host.json')),'Ogg host output')
check(read(run/'sync-repair-reproduction.json')['all_dependents_rejected'],'Sync-label negative controls')
check(read(run/'boundary-checks/results.json')['syncRepair']['exactCheckedPictures'],'Sync-label maintained output')
for id in ['D35','D42','D55','D57','D61']:
 key=next(x['key']for x in triage['records']if x['id']==id);j=read(root/'research/items'/key/'item.json');check(j['stages']['correctness']['status']=='pending' and j['stages']['performance']['status']=='pending','Deferred owner falsely completed: '+id)
# Fixture members are recoverable from the original hashed archives, not only scratch.
fixture_count=0
for name in ['fixture-index.json','additional-fixtures.json']:
 for x in read(run/name):check(sha(root/x['path'])==x['sha256'],'Scratch fixture drift: '+x['path']);check((root/x['archive']).is_file(),'Missing source archive: '+x['archive']);fixture_count+=1
result={'passed':not errors,'external_ids':73,'histories_preserved':len(prior),'current_decisions_updated':len(active),'artifacts_checked':len(m['artifacts']),'fixtures_checked':fixture_count,'final_pairs':49,'deferred_new_owners':5,'explicit_preliminary_snapshot_collisions':len(read(run/'legacy-runtime-collisions.json')),'failures':errors,'scope':'New follow-up and historical-prefix preservation. Not release qualification; prior unrelated full-repository evidence mismatches are not restamped.'}
print(json.dumps(result,indent=2));sys.exit(bool(errors))
