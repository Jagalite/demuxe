# SPDX-License-Identifier: Apache-2.0
"""Append an immutable actual-stage run; preserve all unrelated stage evidence."""
import pathlib,json,hashlib,datetime,subprocess,sys,os
ROOT=pathlib.Path(__file__).resolve().parents[3]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def dump(p,x):p.write_text(json.dumps(x,indent=2)+'\n')
def record(spec):
 folder=ROOT/spec['folder'];folder.mkdir(parents=True,exist_ok=True)
 if (folder/'run.json').exists():raise ValueError('Immutable run already registered')
 now=datetime.datetime.now(datetime.timezone.utc).isoformat();runid=folder.name
 artifacts=[]
 for a in spec['artifacts']:
  p=ROOT/a['path'];artifacts.append({**a,'sha256':sha(p),'bytes':p.stat().st_size})
 manifest={'schema':1,'run_id':runid,'path_base':'repository_root','artifacts':artifacts};dump(folder/'manifest.json',manifest)
 run={**{k:v for k,v in spec.items() if k not in ('folder','artifacts')},'schema':1,'run_id':runid,'recorded_at_utc':now,'working_directory':str(ROOT),'environment':{'git_revision':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'dirty_diff_sha256':hashlib.sha256(subprocess.check_output(['git','diff','--binary'],cwd=ROOT)).hexdigest(),'os_device':subprocess.check_output(['uname','-a'],text=True).strip()}}
 dump(folder/'run.json',run);(folder/'commands.log').write_text('\n'.join(spec['commands'])+'\n');(folder/'analysis.md').write_text('<!-- SPDX-License-Identifier: CC-BY-4.0 -->\n\n'+spec['analysis']+'\n')
 ep=str((folder/'run.json').relative_to(ROOT))
 for decision in spec['decisions']:
  home=ROOT/'research/items'/decision['key'];item=json.loads((home/'item.json').read_text())
  event={**decision,'recorded_at_utc':now,'run_ids':[runid],'stage':'decision','evidence':[ep]}
  with (home/'history.jsonl').open('a') as f:f.write(json.dumps(event)+'\n')
  item['current_decision']=event;item['next_action']=decision['next_action']
  for stage,value in decision['stages'].items():item['stages'][stage]={**value,'evidence':[ep]}
  for stage in ('results','decision'):item['stages'][stage]={'status':'passed','basis':decision['reason'],'evidence':[ep]}
  dump(home/'item.json',item)
  index=json.loads((home/'evidence/index.json').read_text());known={a['path'] for a in index['artifacts']}
  for p in [folder/'manifest.json',folder/'run.json',folder/'commands.log',folder/'analysis.md']+[ROOT/a['path'] for a in artifacts]:
   name=str(p.relative_to(ROOT))
   if name not in known:index['artifacts'].append({'path':name,'sha256':sha(p),'bytes':p.stat().st_size,'uses':[{'run_id':runid}]});known.add(name)
  dump(home/'evidence/index.json',index)
  text=(home/'README.md').read_text();start=text.find('## Definition and contract');end=text.find('## Stages');definition=text[start:end] if start>=0 and end>start else ''
  table='\n'.join(f"| {s} | {v['status']} | {v['basis'].replace('|','/')} |" for s,v in item['stages'].items())
  (home/'README.md').write_text(f"<!-- SPDX-License-Identifier: CC-BY-4.0 -->\n\n# {item['title']}\n\nFull identity: `{decision['key']}`.\n\nCurrent decision: **{decision['disposition']}** ({decision['evidence_level']}).\n\n{decision['reason']}\n\nNext action: {decision['next_action']}\n\n"+definition+'## Stages\n\n| Stage | Status | Basis |\n|---|---|---|\n'+table+f"\n\n[New run]({os.path.relpath(folder/'run.json',home)}) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)\n")
if __name__=='__main__':record(json.loads(pathlib.Path(sys.argv[1]).read_text()))
