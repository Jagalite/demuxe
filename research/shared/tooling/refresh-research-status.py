# SPDX-License-Identifier: Apache-2.0
"""Refresh derived navigation from canonical item homes; never owns a decision."""
from pathlib import Path
import json,collections,datetime
root=Path(__file__).resolve().parents[3];area=root/'research';rows=[]
for entry in json.load(open(area/'index.json'))['items']:
 j=json.load(open(area/entry['path']/'item.json'));r=j['current_decision'].get('record',j['current_decision']);state=r.get('disposition',r.get('state',r.get('decision','unknown')))
 rows.append({'key':j['key'],'rank':j['definition'].get('initial_rank'),'state':state,'stages':{k:v['status'] for k,v in j['stages'].items()},'next_action':j.get('next_action'),'imported_current':'ledger' in j['current_decision']})
rows.sort(key=lambda x:(x['rank'] or 10000,x['key']));counts=collections.Counter(r['state'] for r in rows);stagecounts={s:dict(collections.Counter(r['stages'][s] for r in rows)) for s in rows[0]['stages']};updated=sum(not r['imported_current'] for r in rows);stamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
lines=['<!-- SPDX-License-Identifier: CC-BY-4.0 -->','','# Current research status','',f'Derived from all {len(rows)} canonical item homes at {stamp}. Run `python3 research/shared/tooling/refresh-research-status.py` to refresh. Item folders remain authoritative.','',f'{updated} items have post-migration updates; {len(rows)-updated} retain imported decisions. Updates include new experiments and source/evidence reconciliation; this is not an experiment count.','','| Stage | Passed | Failed | Blocked | Pending | Not applicable |','|---|---:|---:|---:|---:|---:|']
for s,c in stagecounts.items():lines.append('| '+s+' | '+' | '.join(str(c.get(k,0)) for k in ['passed','failed','blocked','pending','not_applicable'])+' |')
lines+=['','A passed screen or decision records a scoped finding, not production readiness. Passed correctness applies only to the stated run profile. Blocked prerequisites and failed outputs are distinct.','', '[Every ranked item](ITEMS.md) · [Process and stage meanings](PROCESS.md)','','## Next high-priority incomplete gates','']
nextrows=[r for r in rows if r['state'].lower().startswith('pursue') and (r['stages']['correctness'] in ['pending','blocked'] or r['stages']['performance']=='pending')][:20]
for r in nextrows:lines.append(f"- Rank {r['rank']}: [{r['key']}](items/{r['key']}/README.md) — {r['next_action'] or 'Read the scoped missing gate in the item record.'}")
(area/'STATUS.md').write_text('\n'.join(lines)+'\n')
lines=['<!-- SPDX-License-Identifier: CC-BY-4.0 -->','','# Research item directory','',f'Current derived view of {len(rows)} item homes, ranked by the original catalogue. Open each item for scope, evidence, stages and next action. [Aggregate stages](STATUS.md). Historical import metadata remains in index.json.','','| Rank | Item | Current decision | Prepare | Correctness | Performance |','|---:|---|---|---|---|---|']
for r in rows:lines.append(f"| {r['rank'] or '—'} | [{r['key']}](items/{r['key']}/README.md) | {r['state']} | {r['stages']['prepare']} | {r['stages']['correctness']} | {r['stages']['performance']} |")
(area/'ITEMS.md').write_text('\n'.join(lines)+'\n');print(json.dumps({'items':len(rows),'post_migration_updated_items':updated,'stages':stagecounts,'decisions':dict(counts)},indent=2))
