# SPDX-License-Identifier: Apache-2.0
"""Reconcile completed source-only stops and missing-definition gates, without running experiments."""
from pathlib import Path
import json,datetime,hashlib,os,subprocess
root=Path(__file__).resolve().parents[3];now=datetime.datetime.now(datetime.timezone.utc);runid=now.strftime('%Y%m%dT%H%M%SZ')+'-source-stage-reconciliation';run=root/'research/shared/runs'/runid;run.mkdir()
def write(p,x):p.write_text(json.dumps(x,indent=2)+'\n')
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
selected=[];assets={}
for home in sorted((root/'research/items').iterdir()):
 item=json.loads((home/'item.json').read_text());decision=item['current_decision']
 if 'ledger' not in decision:continue
 r=decision['record'];state=r.get('state','');level=r.get('evidence_level','')
 missing=item['definition']['definition_status']=='DEFINITION_NOT_RECOVERED'
 if not missing and not (level in ['SOURCE_REVIEW','REUSED_SOURCE_REVIEW'] and state.startswith(('STOP','ALREADY','CLOSED'))):continue
 index=json.loads((home/'evidence/index.json').read_text());mismatches=[]
 for a in index['artifacts']:
  p=root/a['path'];assert p.is_file() and digest(p)==a['sha256'],a['path']
  if any(u.get('declared_sha256') and u['declared_sha256']!=a['sha256'] for u in a.get('uses',[])):mismatches.append(a['path'])
 # Do not reconcile stage acceptance from historically mismatched bytes automatically.
 if mismatches:continue
 disposition='blocked' if missing else ('already_implemented' if state.startswith('ALREADY') else 'stop_current_profile')
 selected.append({'key':item['key'],'disposition':disposition,'prior_decision':decision,'reason':r.get('reason',r.get('rationale','No readable definition recovered.')),'missing_definition':missing,'evidence':[a['path'] for a in index['artifacts']]})
 for a in index['artifacts']:assets[a['path']]={'path':a['path'],'sha256':a['sha256'],'bytes':(root/a['path']).stat().st_size,'role':'existing_source_or_report_or_audit','license':'NOASSERTION','provenance':'Retained historical source; existing notice controls. No relicensing.'}
write(run/'results.json',{'run_id':runid,'recorded_at_utc':now.isoformat(),'scope':'Imported source gate/stage reconciliation only; zero new candidate executions, no changed scientific verdicts.','items':selected,'new_experiments':0})
write(run/'manifest.json',{'schema':1,'run_id':runid,'path_base':'repository_root','artifacts':list(assets.values())})
write(run/'run.json',{'schema':1,'run_id':runid,'item_keys':[r['key'] for r in selected],'stage':'results','status':'passed','recorded_at_utc':now.isoformat(),'working_directory':str(root),'commands':['python3 research/shared/tooling/reconcile-source-gates.py'],'environment':{'git_revision':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()},'candidate':{'executed':False,'fallback_observed':None},'acceptance':{'contract':'No-opportunity/already-present source decisions need no new candidate test. Missing definitions block experimental stages. Retain per-item reason, next action and all historical evidence.','passed':True},'limits':['No playback or new source-code audit performed by this reconciliation.','Stage completion means the requested source screen ended, not candidate correctness.','Source identity and current retained bytes checked; historically mismatched items excluded.']})
(run/'commands.log').write_text('python3 research/shared/tooling/reconcile-source-gates.py\n')
(run/'analysis.md').write_text('<!-- SPDX-License-Identifier: CC-BY-4.0 -->\n\n# Completed source gates\n\nThis records existing item-specific source decisions in the stage checklist. It does not add experiments or change the original scoped findings.\n\n'+'\n\n'.join('## '+r['key']+'\n\n'+r['reason'] for r in selected)+'\n')
refs=[str(p.relative_to(root)) for p in run.iterdir() if p.is_file()]
for row in selected:
 home=root/'research/items'/row['key'];item=json.loads((home/'item.json').read_text());event={'key':row['key'],'disposition':row['disposition'],'blocker_category':'definition' if row['missing_definition'] else None,'evidence_level':'source_review','kind':'stage_reconciliation','run_id':runid,'stage':'decision','recorded_at_utc':now.isoformat(),'reason':row['reason'],'basis':'Retained prior source gate; no new experiment and no broadened claim.','prior_decision':row['prior_decision'],'next_action':item['next_action'],'evidence':refs}
 with (home/'history.jsonl').open('a') as f:f.write(json.dumps(event)+'\n')
 item['current_decision']=event
 for stage in ['prepare','correctness','performance']:
  status='blocked' if row['missing_definition'] else 'not_applicable'
  basis=('No readable mechanism definition: do not invent inputs, outputs, or experiments.' if row['missing_definition'] else 'This investigation ended at a source-only '+row['disposition']+' decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition.')
  item['stages'][stage]={'status':status,'basis':basis,'evidence':refs[:1]}
 item['stages']['decision']={'status':'passed','basis':'Prior scoped decision reconciled into the current checklist: '+row['disposition'],'evidence':refs[:1]}
 write(home/'item.json',item)
 index=json.loads((home/'evidence/index.json').read_text())
 for ref in refs:
  p=root/ref;index['artifacts'].append({'path':ref,'sha256':digest(p),'bytes':p.stat().st_size,'uses':[{'run_id':runid}]})
 write(home/'evidence/index.json',index)
 text=(home/'README.md').read_text();text=text.replace('Current imported decision:', 'Prior imported decision:');a=text.index('## Stages');b=text.find('## Working files',a)
 table='\n'.join(f"| {s} | {v['status']} | {v['basis'].replace('|','/')} |" for s,v in item['stages'].items())
 text=text[:a]+'## Current stage reconciliation\n\n**'+row['disposition']+'** — retained source decision, no new experiment. [Run]('+os.path.relpath(run/'run.json',home)+').\n\n## Stages\n\n| Stage | Status | Basis |\n|---|---|---|\n'+table+'\n\n'+text[b:]
 (home/'README.md').write_text(text)
print(json.dumps({'run_id':runid,'reconciled':len(selected),'missing_definitions':sum(r['missing_definition'] for r in selected),'source_stops_or_already_present':sum(not r['missing_definition'] for r in selected),'new_experiments':0},indent=2))
