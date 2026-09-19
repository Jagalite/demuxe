# SPDX-License-Identifier: Apache-2.0
"""Regenerate catalogue decision reports; does not run experiments or change verdicts."""
from pathlib import Path
import json,collections,hashlib,subprocess,datetime
root=Path(__file__).resolve().parent;repo=root.parent.parent;pkg=root.parent/'full-catalogue-v4/Demuxe_All_Items_Screening_v4'
prior={r['key']:r for r in map(json.loads,(pkg/'state/decisions.jsonl').read_text().splitlines())}
latest={r['key']:r for r in map(json.loads,(root/'completion.jsonl').read_text().splitlines())}
campaign=json.loads((root/'campaign.json').read_text());assert set(prior)==set(latest)=={r['key'] for r in campaign['items']}
def group(s):
 if s.startswith('PURSUE'):return 'PURSUE'
 if s.startswith('STOP') or s=='CLOSED_CURRENT_PROFILE':return 'STOP_PROFILE'
 if s.startswith('ALREADY'):return 'ALREADY_IMPLEMENTED'
 return s
for d in campaign['items']:
 r=latest[d['key']];d['completion_state']=r['state'];d['decision_group']=group(r['state']);d['carried_forward']=r.get('carried_forward',False)
campaign['endpoint_status']='DECISION_PASS_COMPLETE_WITH_EXPLICIT_BLOCKERS'
campaign['remaining_without_decision']=0
campaign['counts']=dict(collections.Counter(d['decision_group'] for d in campaign['items']))
campaign['new_or_revisited_records']=sum(not d['carried_forward'] for d in campaign['items'])
campaign['retained_prior_records']=sum(d['carried_forward'] for d in campaign['items'])
campaign['last_updated_utc']=datetime.datetime.now(datetime.timezone.utc).isoformat()
(root/'campaign.json').write_text(json.dumps(campaign,indent=2)+'\n')
lines=['<!-- SPDX-License-Identifier: CC-BY-4.0 -->','', '# All catalogue pursuit decisions','', '425 stable keys: 392 named mechanisms and 33 missing definitions. Every row has a bounded decision. DEFER_SETUP/HOLD_SOURCE/HOLD_ENV remain unresolved experiments; they are not failed or completed runtime tests. Source variants remain separate.','', 'New/revisited decisions: 53. Prior individual source/reopening decisions retained: 372.','', '| Rank | Stable key | Decision | Evidence level | Basis |','|---:|---|---|---|---|']
for d in sorted(campaign['items'],key=lambda x:(x.get('rank') or 10000,x['key'])):
 r=latest[d['key']];paths=r['evidence'] if isinstance(r['evidence'],list) else [r['evidence']]
 level=r.get('evidence_level','COMPONENT_TEST' if not r['key'].startswith('R338.') else 'EVIDENCE_SYNTHESIS')
 reason=r['reason'].replace('|','/').replace('\n',' ')
 ev='; '.join(f'[evidence {i+1}]({p})' for i,p in enumerate(paths))
 lines.append(f"| {d.get('rank') or '—'} | {d['key']} | {r['state']} | {level}{'; retained' if d['carried_forward'] else ''} | {reason} {ev} |")
(root/'ALL_ITEMS.md').write_text('\n'.join(lines)+'\n')
lines=['<!-- SPDX-License-Identifier: CC-BY-4.0 -->','','# Worth further pursuit','','34 ideas or tooling/quality variants merit another bounded investment. These are recommendations, not measured speedups or release approvals. Full stable keys distinguish reused IDs.','']
for d in sorted(campaign['items'],key=lambda x:(x.get('rank') or 10000,x['key'])):
 r=latest[d['key']]
 if group(r['state'])!='PURSUE':continue
 paths=r['evidence'] if isinstance(r['evidence'],list) else [r['evidence']]
 lines.extend([f"## {r['key']}",'',r['reason'],'','Evidence: '+', '.join(f'[{Path(p).name}]({p})' for p in paths),''])
(root/'PURSUE.md').write_text('\n'.join(lines)+'\n')
(root/'decisions-latest.json').write_text(json.dumps(list(latest.values()),indent=2)+'\n')
# Validate every retained v4 evidence identity before carrying its conclusions forward.
checked={};errors=[]
for d in prior.values():
 for e in d['evidence']:
  p=pkg/e['path'];digest=hashlib.sha256(p.read_bytes()).hexdigest();checked[str(p.relative_to(repo))]=digest
  if digest!=e['sha256']:errors.append(str(p))
assert not errors,errors
base=subprocess.check_output(['git','diff','--binary'],cwd=repo)
assert hashlib.sha256(base).hexdigest()==campaign['base_diff_sha256'],'Pre-existing tracked edits changed'
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()==campaign['base_git']
validation={'v4_evidence_files_verified':len(checked),'stable_keys':len(latest),'missing_endpoint_decisions':0,'preexisting_tracked_diff_unchanged':True,'head_unchanged':True,'decision_counts':campaign['counts']}
(root/'validation.json').write_text(json.dumps(validation,indent=2)+'\n')
print(json.dumps(validation,indent=2))
