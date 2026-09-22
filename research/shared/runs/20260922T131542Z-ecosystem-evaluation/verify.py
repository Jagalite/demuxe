#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Read-only integrity and integration checks for this bounded evaluation run."""
from pathlib import Path
import hashlib,json,re,collections
RUN=Path(__file__).resolve().parent
ROOT=RUN.parents[3]
def read(p):return json.loads(p.read_text())
def sha(b):return hashlib.sha256(b).hexdigest()
def check(condition,message):
 if not condition:raise AssertionError(message)
def main():
 manifest=read(RUN/'manifest.json')
 for entry in manifest['artifacts']:
  p=ROOT/entry['path'];check(p.is_file(),f'missing {p}');check(sha(p.read_bytes())==entry['sha256'],f'changed {p}')
 evaluations=read(RUN/'evaluations.json')['items']
 expected={f'EB{i:02}' for i in range(1,23)}
 check(len(evaluations)==22 and {e['id'] for e in evaluations}==expected,'proposal coverage')
 campaign=read(ROOT/'research/campaigns/ecosystem-expansion-2026-09-21.json')
 check(campaign['evaluation_status']=='complete','campaign not evaluated')
 check(set(campaign['items'])=={e['owner'] for e in evaluations},'campaign ownership')
 check(len(campaign['proposals'])==22,'campaign proposal count')
 prior=read(RUN/'prior-state.json')
 for owner,before in prior.items():
  folder=ROOT/'research/items'/owner;old=read(ROOT/before['item_snapshot']);item=read(folder/'item.json')
  check(item['current_decision']==old['current_decision'],f'overwritten decision {owner}')
  check(item['stages']==old['stages'],f'overwritten parent gates {owner}')
  check(sha((folder/'history.jsonl').read_bytes()[:before['history_bytes']])==before['history_sha256'],f'overwritten history {owner}')
 index=read(ROOT/'research/index.json')['items'];keys={x['key'] for x in index}
 for e in evaluations:
  check(e['owner'] in keys,'owner missing from index')
  folder=ROOT/'research/items'/e['owner'];item=read(folder/'item.json')
  scoped=folder/'evidence'/RUN.name/'evaluation.json'
  check(read(scoped)==e,f'scoped mismatch {e["id"]}')
  matches=[f for f in item['research_followups'] if f['id']==e['id'] and f['run_id']==RUN.name]
  check(len(matches)==1 and matches[0]['outcome']==e['outcome'],f'follow-up missing {e["id"]}')
  proposal=next(p for p in campaign['proposals'] if p['id']==e['id'])
  check(proposal['owner']==e['owner'] and proposal['outcome']==e['outcome'],'campaign decision mismatch')
  events=[json.loads(s) for s in (folder/'history.jsonl').read_text().splitlines()]
  check(any(x.get('run_id')==RUN.name and x.get('id')==e['id'] for x in events),'history missing')
  check(e['next_action'] and e['finding'] and e['novelty'],'empty assessment')
  check(not e['browser_executed'] and not e['performance_executed'],'unsupported qualification')
  for s in e['reviewed_sources']:
   check(sha((ROOT/s['path']).read_bytes())==s['sha256'],'reviewed source changed')
  artifacts=read(folder/'evidence/index.json')['artifacts']
  for p in [scoped,RUN/'manifest.json',RUN/'run.json',RUN/'REPORT.md']:
   rel=p.relative_to(ROOT).as_posix()
   check(any(a['path']==rel and a['sha256']==sha(p.read_bytes()) for a in artifacts),'evidence index missing '+rel)
 check(sum(e['mapping']=='new_item' for e in evaluations)==3,'novelty count')
 counts=collections.Counter(e['outcome'] for e in evaluations)
 check(dict(counts)==read(RUN/'results.json')['outcomes'],'result totals')
 status=(ROOT/'research/STATUS.md').read_text()
 for outcome,n in counts.items():check(f'| {outcome} | {n} |' in status,'hidden follow-up outcome '+outcome)
 # Check new Markdown links without fetching historical upstream URLs.
 docs=[RUN/'REPORT.md',RUN/'oracle-matrix.md',ROOT/'research/campaigns/ecosystem-expansion-2026-09-21.md']
 docs += [ROOT/'research/items'/e['owner']/'README.md' for e in evaluations]
 for p in docs:
  # Existing item content can have historical dead links; validate only our appended section.
  content=p.read_text();content=content.split('## Ecosystem follow-up',1)[-1] if p.name=='README.md' else content
  for target in re.findall(r'\]\(([^)]+)\)',content):
   if '://' in target or target.startswith('#'):continue
   check((p.parent/target.split('#')[0]).exists(),f'broken link {p}: {target}')
 print(json.dumps({'passed':True,'evaluated':22,'existing_owners_preserved':len(prior),'new_homes':3,'outcomes':dict(counts),'hashed_artifacts':len(manifest['artifacts']),'scope':'Research identity, evidence integrity and integration only'},indent=2))
if __name__=='__main__':main()
