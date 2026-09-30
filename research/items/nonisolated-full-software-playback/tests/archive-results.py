#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Append completed qualification records; never rewrite archived evidence."""
import datetime, hashlib, json
from pathlib import Path
ITEM=Path(__file__).resolve().parents[1]
ROOT=ITEM.parents[2]
EVIDENCE=ITEM/'evidence'
def digest(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
 return h.hexdigest()
def write(p,value):p.write_text(json.dumps(value,indent=2)+'\n')
index=json.loads((EVIDENCE/'index.json').read_text())
existing={r['run_id'] for r in index['runs']}
artifacts={a['path']:a for a in index['artifacts']}
new=[]
for run in sorted(EVIDENCE.iterdir()):
 if not run.is_dir() or run.name in existing or (run/'manifest.json').exists() or not (run/'result.json').exists():continue
 result=json.loads((run/'result.json').read_text())
 if ('cases' in result or 'checks' in result) and not result.get('finishedAt'):continue
 if 'rows' in result and len(result['rows'])!=6:continue
 cases=result.get('cases',[])
 if 'cases' in result:
  passed=bool(cases) and not result.get('error') and all(c.get('passed',False) for c in cases)
 elif 'rows' in result:
  passed=len(result['rows'])==6 and all(r['returncode']==0 for r in result['rows'])
 else:
  passed=result.get('passed') is True
 passed=passed and result.get('passed',True) is not False
 now=datetime.datetime.now(datetime.timezone.utc).isoformat()
 command=result.get('command', [r.get('command') for r in result.get('rows',[])])
 scope=result.get('scope','Focused regression execution')
 record={'schema':1,'run_id':run.name,'item_keys':[ITEM.name],'stage':'correctness','status':'passed' if passed else 'failed','recordedAt':now,
 'working_directory':str(ROOT),'candidate':{'executed':True,'execution_scope':scope,'public_player_executed':False},
 'acceptance':{'passed':passed,'oracle':'Recorded exact-run thresholds and independent RGB/PCM references where applicable'},
 'performance':{'applicable':False,'reason':'No CPU benchmark or release qualification'},
 'limits':['Experimental private Software; browser and workload recorded in raw result. Native avsync is an internal diagnostic.'],
 'commands':command,'environment':{'browserKind':result.get('browserKind'),'continuous':bool(cases and cases[0].get('continuity'))},
 'analysis':'Retain every case and failure, including cadence, underruns, startup timing and teardown. No automatic admission follows.'}
 write(run/'run.json',record)
 (run/'commands.log').write_text(json.dumps(command,indent=2)+'\n')
 summary=[{'backend':c.get('backend'), 'key':c.get('key'), 'passed':c.get('passed'), 'error':c.get('error'),
 'continuity':{k:v for k,v in c.get('continuity',{}).items() if not isinstance(v,list)},
 'audio':{k:v for k,v in c.get('audio',{}).items() if k not in ['underrunEvents']}} for c in cases]
 (run/'analysis.md').write_text('<!-- SPDX-License-Identifier: CC-BY-4.0 -->\n# Qualification record\n\n'+scope+'\n\nStatus: '+record['status']+'. Raw failures remain retained. Public routing and CPU qualification are separate.\n\n```json\n'+json.dumps(summary,indent=2)+'\n```\n')
 files={str(p.relative_to(run)):digest(p) for p in sorted(run.rglob('*')) if p.is_file()}
 write(run/'manifest.json',{'schema':1,'recordedAt':now,'licenses':'Reports/results CC-BY-4.0; copied code retains original SPDX. Synthetic fixture provenance remains recorded.','artifacts':files})
 index['runs'].append({'run_id':run.name,'path':run.name,'stage':'correctness','evidence_level':scope,'manifest_sha256':digest(run/'manifest.json'),'result':record['status']})
 for p in sorted(run.rglob('*')):
  if p.is_file():
   name=str(p.relative_to(ROOT));wanted=digest(p)
   if name in artifacts and artifacts[name]['sha256']!=wanted:raise ValueError('Archived artifact drift: '+name)
   artifacts[name]={'path':name,'sha256':wanted}
 new.append(run.name);print(run.name,record['status'],flush=True)
index['artifacts']=list(artifacts.values());write(EVIDENCE/'index.json',index)
if new:
 with (ITEM/'history.jsonl').open('a') as f:f.write(json.dumps({'timestamp':datetime.datetime.now(datetime.timezone.utc).isoformat(),'event':'qualification_records_appended','run_ids':new,'public_admission_changed':False,'cpu_measured':False})+'\n')
