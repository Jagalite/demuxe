# SPDX-License-Identifier: Apache-2.0
"""Register a reviewed bounded result without modifying historical campaign ledgers."""
from pathlib import Path
import json,hashlib,datetime,os,subprocess
ROOT=Path(__file__).resolve().parents[3]
def read(p):return json.loads(p.read_text())
def write(p,x):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(x,indent=2)+'\n')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def register(folder, records, commands, artifacts, acceptance, limits, executed=True):
 folder=ROOT/folder;folder.mkdir(parents=True,exist_ok=True);now=datetime.datetime.now(datetime.timezone.utc).isoformat();runid=folder.name
 manifest={'schema':1,'run_id':runid,'path_base':'repository_root','artifacts':[]}
 for name,role,license,provenance in artifacts:
  p=ROOT/name;manifest['artifacts'].append({'path':name,'role':role,'sha256':sha(p),'bytes':p.stat().st_size,'license':license,'provenance':provenance})
 write(folder/'manifest.json',manifest)
 run={'schema':1,'run_id':runid,'item_keys':[r['key'] for r in records],'stage':'screen','status':'passed','recorded_at_utc':now,'working_directory':str(ROOT),'commands':commands,'environment':{'git_revision':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'dirty_diff_sha256':hashlib.sha256(subprocess.check_output(['git','diff','--binary'],cwd=ROOT)).hexdigest(),'os_device':subprocess.check_output(['uname','-a'],text=True).strip(),'runtime_manifest':str((folder/'manifest.json').relative_to(ROOT))},'candidate':{'executed':executed,'fallback_observed':False if executed else None},'acceptance':acceptance,'performance':{'applicable':False,'basis':'Bounded feasibility/correctness decision; no timing or resource-saving qualification requested in this run.'},'limits':limits,'decisions':records}
 write(folder/'run.json',run);(folder/'commands.log').write_text('\n'.join(commands)+'\n');(folder/'analysis.md').write_text('<!-- SPDX-License-Identifier: CC-BY-4.0 -->\n\n'+ '\n\n'.join(r['reason'] for r in records)+'\n\nLimits: '+'; '.join(limits)+'\n')
 for r in records:
  home=ROOT/'research/items'/r['key'];item=read(home/'item.json');evpath=str((folder/'run.json').relative_to(ROOT));event={**r,'run_id':runid,'recorded_at_utc':now,'evidence':[evpath],'stage':'decision'}
  with (home/'history.jsonl').open('a') as f:f.write(json.dumps(event)+'\n')
  item['current_decision']=event;item['next_action']=r['next_action']
  for stage in ['define','prepare','screen','results','decision']:
   item['stages'][stage]={'status':r.get(stage,'passed'),'basis': {'define':acceptance['contract'],'prepare':'Pinned inputs, actual commands, tool identities and independent references captured in run manifest.','screen':r['reason'],'results':'Positive/negative evidence and limitations captured in immutable run.','decision':r['disposition']+': '+r['reason']}[stage],'evidence':[evpath]}
  item['stages']['correctness']={'status':r.get('correctness','passed'),'basis':r.get('correctness_basis',acceptance['oracle']+'; '+acceptance['adverse_control']),'evidence':[evpath]}
  item['stages']['performance']={'status':r.get('performance','not_applicable'),'basis':'Current endpoint is scoped feasibility, not a measured performance claim; reopen for a predeclared equivalent-work benchmark after complete relevant correctness.','evidence':[evpath]};write(home/'item.json',item)
  index=read(home/'evidence/index.json');existing={a['path'] for a in index['artifacts']}
  for p in [folder/'manifest.json',folder/'run.json',folder/'commands.log',folder/'analysis.md']+[ROOT/a['path'] for a in manifest['artifacts']]:
   path=str(p.relative_to(ROOT))
   if path not in existing:index['artifacts'].append({'path':path,'sha256':sha(p),'bytes':p.stat().st_size,'uses':[{'run_id':runid}]});existing.add(path)
  write(home/'evidence/index.json',index)
  text=(home/'README.md').read_text();start=text.find('## Definition and contract');end=text.find('## Stages');definition=text[start:end] if start>=0 and end>start else ''
  table='\n'.join(f"| {s} | {v['status']} | {v['basis'].replace('|','/')} |" for s,v in item['stages'].items())
  (home/'README.md').write_text(f"<!-- SPDX-License-Identifier: CC-BY-4.0 -->\n\n# {item['title']}\n\nFull identity: `{r['key']}`.\n\nCurrent decision: **{r['disposition']}** ({r['evidence_level']}).\n\n{r['reason']}\n\nNext action: {r['next_action']}\n\n"+definition+'## Stages\n\n| Stage | Status | Basis |\n|---|---|---|\n'+table+f"\n\n[New run]({os.path.relpath(folder/'run.json',home)}) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)\n")
