#!/usr/bin/env python3
"""Local catalogue/ledger utility. It never builds, tests, uploads, or modifies Demuxe.
Python 3.10+ standard library. Run from anywhere; root defaults to this package.
"""
from __future__ import annotations
import argparse, collections, contextlib, datetime, hashlib, json, os, re, sys
from pathlib import Path

DECISIONS={'ADVANCE_CONFIRMATION','DEFER_SETUP','STOP_PROFILE','ALREADY_IMPLEMENTED','DUPLICATE','INCONCLUSIVE','HOLD_SOURCE','HOLD_ENV','REOPEN'}
LEVELS={'SOURCE_REVIEW','PREREQUISITE_PROBE','COMPONENT_TEST','REAL_PATH_SCREEN','IMPORTED_LOCAL_EVIDENCE','NONE'}
BANDS={5:[1,1,2,3],4:[1,2,2,3],3:[2,2,3,4],2:[3,3,4,5],1:[4,4,5,5]}
RELEVANCE={'core-playback':0,'conditional':1,'specialty-or-prepared':2,'unknown':3}

def digest(path:Path)->str:
 h=hashlib.sha256()
 with path.open('rb') as f:
  for block in iter(lambda:f.read(1<<20),b''):h.update(block)
 return h.hexdigest()

def jread(path):return json.loads(path.read_text(encoding='utf-8'))
def lines(path):
 if not path.exists():return []
 ans=[]
 for n,line in enumerate(path.read_text(encoding='utf-8').splitlines(),1):
  if line.strip():
   try:ans.append(json.loads(line))
   except json.JSONDecodeError as e:raise ValueError(f'{path}:{n}: invalid JSON; do not silently discard ledger history') from e
 return ans

def safe_path(root:Path,value:str)->Path:
 if not isinstance(value,str) or not value:raise ValueError('Evidence paths must be nonempty package-relative paths')
 p=Path(value)
 if p.is_absolute() or '..' in p.parts:raise ValueError('Use a package-relative path without traversal: '+value)
 q=(root/p).resolve()
 if not q.is_relative_to(root.resolve()):raise ValueError('Path escapes package root: '+value)
 return q

def load(root):
 return jread(root/'catalogue/research_items.json')['items']
def inherited(root):return {x['key']:x for x in jread(root/'state/inherited_findings.json')['findings']}
def latest(root):
 d={}
 for row in lines(root/'state/decisions.jsonl'):d[row['key']]=row
 return d

def resolve(items,query):
 for i in items:
  if i['key']==query:return i
 hits=[i for i in items if i['legacy_id'].lower()==query.lower() or query in i.get('legacy_guide_aliases',[])]
 if re.fullmatch(r'R\d+',query,re.I):hits=[i for i in items if i['legacy_number']==int(query[1:])]
 if len(hits)==1:return hits[0]
 if len(hits)>1:raise ValueError('Ambiguous legacy ID; choose one stable key:\n'+'\n'.join('  '+i['key']+' — '+str(i['title']) for i in hits))
 raise ValueError('Unknown record: '+query)

def effective_items(root):
 items=[dict(x) for x in load(root)]
 updates={}
 for row in lines(root/'state/priority_updates.jsonl'):updates[row['key']]=row
 for i in items:
  u=updates.get(i['key'])
  if u:
   for field in ['impact','screen_effort','qualification_burden','target_relevance']:i[field]=u[field]
   i['priority_band']=BANDS[i['impact']][int(i['screen_effort'][1:])]
   i['ranking_update_reason']=u['reason']
 return items

def order(i):
 return (i['priority_band'] if i['priority_band'] is not None else 99,RELEVANCE.get(i.get('target_relevance'),3),-(i.get('impact') or 0),int(i['screen_effort'][1:]),int((i.get('qualification_burden') or 'Q9')[1:]),i['legacy_number'],i['key'])

def queue(root,lane='first-pass',family=None):
 items=effective_items(root);last=latest(root);old=inherited(root);ans=[]
 for i in items:
  k=i['key'];d=last.get(k);done=d is not None and d['decision']!='REOPEN'
  if family and i['family']!=family:continue
  if lane=='first-pass':take=bool(i['title']) and not done and (k not in old or bool(d and d['decision']=='REOPEN'))
  elif lane=='source':take=not i['title'] and not done
  elif lane=='import':take=k in old and k not in last
  elif lane=='followup':take=(done and d['decision']=='ADVANCE_CONFIRMATION') or (not d and old.get(k,{}).get('decision')=='ADVANCE_CONFIRMATION')
  elif lane=='all':take=True
  else:raise ValueError('Unknown lane')
  if take:ans.append(i)
 return sorted(ans,key=order)

@contextlib.contextmanager
def lock(root):
 p=root/'state/.ledger.lock'
 try:p.mkdir()
 except FileExistsError as e:raise ValueError('Ledger is locked. Only one coordinator may write. Check for a live writer before removing a stale state/.ledger.lock directory.') from e
 try:
  (p/'owner.json').write_text(json.dumps({'pid':os.getpid(),'created_utc':datetime.datetime.now(datetime.timezone.utc).isoformat()}))
  yield
 finally:
  (p/'owner.json').unlink(missing_ok=True);p.rmdir()

def append(root,relative,data):
 with lock(root):
  p=root/relative;p.parent.mkdir(exist_ok=True,parents=True)
  with p.open('a',encoding='utf-8') as f:
   f.write(json.dumps(data,ensure_ascii=False,sort_keys=True)+'\n');f.flush();os.fsync(f.fileno())

def template(item):
 s=item['definition_source']
 return {'key':item['key'],'decision':None,'evidence_level':None,'source_checked':False,'source_sha256':s['sha256'] if s else None,'hypothesis':item['title'],'tested_profile':None,'requested_output_contract':None,'current_code_paths':[],'observed_gap':None,'baseline':{'git_sha':None,'artifact_manifest':None,'plan':None},'candidate':{'revision':None,'executed':False,'silent_fallback':None},'probe':{'method':None,'positive_control':None,'negative_control':None,'outcome':None},'measurement':{'primary_metric':None,'worthwhile_change':None,'paired_runs':None,'result':None,'uncertainty':None,'excluded_costs':[]},'evidence':[],'reason':None,'next_test':None,'reopen_condition':None,'limits':[],'effort':{'new_fixture_count':0,'candidate_revisions':0,'shared_rebuilds':0,'scope_escalated':False},'duplicate_of':None}

def validate_record(root,items,d):
 item=resolve(items,d.get('key',''))
 if d.get('key')!=item['key']:raise ValueError('Record must use the full stable key, not a legacy alias')
 decision=d.get('decision');level=d.get('evidence_level')
 if decision not in DECISIONS:raise ValueError('Unknown or missing decision')
 if level not in LEVELS:raise ValueError('Unknown or missing evidence_level')
 for field in ['reason','reopen_condition']:
  if not isinstance(d.get(field),str) or len(d[field].strip())<20:raise ValueError(field+' must explain a concrete scoped decision (at least 20 characters)')
 if not item['title'] and decision not in ['HOLD_SOURCE','REOPEN']:raise ValueError('A missing definition cannot receive a scientific/runtime verdict')
 s=item['definition_source']
 if s and d.get('source_sha256')!=s['sha256']:raise ValueError('Source digest does not match this mechanism record')
 if s and digest(safe_path(root,s['path']))!=s['sha256']:raise ValueError('Definition source bytes changed; resolve the source revision before recording')
 if decision not in ['HOLD_SOURCE','REOPEN']:
  for field in ['tested_profile','requested_output_contract']:
   if not isinstance(d.get(field),str) or len(d[field].strip())<10:raise ValueError(field+' must state the audited/tested scope')
 if decision not in ['HOLD_SOURCE','REOPEN'] and d.get('source_checked') is not True:raise ValueError('Read and confirm the definition before this decision')
 if decision=='REOPEN':
  if item['key'] not in latest(root) and item['key'] not in inherited(root):raise ValueError('Cannot reopen an untouched record')
  return item
 ev=d.get('evidence')
 if not isinstance(ev,list) or not ev:raise ValueError('Attach at least one local evidence file (a source audit/recovery note is sufficient; a runtime claim needs its actual logs)')
 for e in ev:
  p=safe_path(root,e.get('path',''))
  if not p.is_file():raise ValueError('Evidence file missing: '+str(p))
  actual=digest(p)
  if e.get('sha256') not in [None,actual]:raise ValueError('Evidence digest mismatch: '+e['path'])
  e['sha256']=actual
  if not isinstance(e.get('note'),str) or not e['note'].strip():raise ValueError('Each evidence entry needs a note')
 if level=='REAL_PATH_SCREEN':
  if not d.get('candidate',{}).get('executed'):raise ValueError('REAL_PATH_SCREEN requires observed candidate execution')
  if d.get('candidate',{}).get('silent_fallback') is not False:raise ValueError('REAL_PATH_SCREEN cannot silently fall back')
  if not d.get('baseline',{}).get('git_sha') or not d.get('baseline',{}).get('artifact_manifest'):raise ValueError('REAL_PATH_SCREEN requires baseline revision and artifact manifest')
  if not d.get('probe',{}).get('negative_control'):raise ValueError('REAL_PATH_SCREEN requires a declared negative control')
 if decision=='ADVANCE_CONFIRMATION' and (not isinstance(d.get('next_test'),str) or len(d['next_test'].strip())<20):raise ValueError('Advancement requires a bounded next test, not a production pass')
 if decision=='DUPLICATE':
  target=resolve(items,d.get('duplicate_of',''))
  if target['key']==item['key']:raise ValueError('A record cannot duplicate itself')
  d['duplicate_of']=target['key']
 if (d.get('effort',{}).get('candidate_revisions',0)>2 or d.get('effort',{}).get('new_fixture_count',0)>1) and not d.get('effort',{}).get('scope_escalated'):raise ValueError('The first-pass candidate/fixture budget was exceeded; explicitly record the scope escalation')
 return item

def verify(root):
 items=load(root);errors=[];keys=set();numbers=set();sources=jread(root/'catalogue/source_register.json')['sources']
 for src in sources:
  try:
   p=safe_path(root,src['path'])
   if not p.is_file():errors.append('Missing source '+src['path']);continue
   if digest(p)!=src['bundle_sha256']:errors.append('Source hash mismatch '+src['path'])
  except ValueError as e:errors.append(str(e))
 for i in items:
  if i['key'] in keys:errors.append('Duplicate key '+i['key'])
  keys.add(i['key']);numbers.add(i['legacy_number'])
  if i['title'] and not i['definition_source']:errors.append('Named definition without source '+i['key'])
  s=i['definition_source']
  if s:
   try:
    p=safe_path(root,s['path']);ls=p.read_text().splitlines()
    if not (1<=s['line_start']<=s['line_end']<=len(ls)):errors.append('Invalid source lines '+i['key'])
    if digest(p)!=s['sha256']:errors.append('Item source digest mismatch '+i['key'])
   except (ValueError,OSError) as e:errors.append(str(e))
  for r in i.get('related_reports',[]):
   try:
    if not safe_path(root,r['path']).is_file():errors.append('Missing related report '+r['path'])
   except ValueError as e:errors.append(str(e))
 if numbers!=set(range(1,367)):errors.append('Legacy ID coverage differs from R01–R366')
 for row in lines(root/'state/decisions.jsonl'):
  if row.get('key') not in keys:errors.append('Ledger contains unknown key '+str(row.get('key')))
  if row.get('decision') not in DECISIONS:errors.append('Ledger has invalid decision')
  for e in row.get('evidence',[]):
   try:
    p=safe_path(root,e['path'])
    if not p.exists() or digest(p)!=e.get('sha256'):errors.append('Changed/missing recorded evidence '+e['path'])
   except (ValueError,OSError) as x:errors.append(str(x))
 return {'ok':not errors,'legacy_ids':len(numbers),'records':len(items),'named_records':sum(bool(i['title']) for i in items),'source_documents':len(sources),'errors':errors}

def status(root):
 items=load(root);last=latest(root);old=inherited(root)
 decisions=collections.Counter(d['decision'] for d in last.values() if d['decision']!='REOPEN')
 return {'legacy_id_slots':366,'named_mechanism_records':sum(bool(i['title']) for i in items),'missing_definition_slots':sum(not i['title'] for i in items),'first_pass_remaining':len(queue(root)),'source_gates_remaining':len(queue(root,'source')),'inherited_local_findings_not_reimported':len(queue(root,'import')),'followup_candidates':len(queue(root,'followup')),'new_recorded_dispositions':dict(decisions),'new_real_path_screen_records':sum(d.get('evidence_level')=='REAL_PATH_SCREEN' for d in last.values()),'completion_note':'A HOLD_SOURCE/HOLD_ENV is accounted for but is not an executed or successful test. Inherited reports are not newly verified evidence.'}

def main(argv=None):
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);sub=ap.add_subparsers(dest='cmd',required=True)
 sub.add_parser('verify');sub.add_parser('status')
 p=sub.add_parser('next');p.add_argument('--lane',choices=['first-pass','source','import','followup','all'],default='first-pass');p.add_argument('--family');p.add_argument('--limit',type=int,default=12);p.add_argument('--json',action='store_true')
 p=sub.add_parser('show');p.add_argument('key')
 p=sub.add_parser('template');p.add_argument('key')
 p=sub.add_parser('record');p.add_argument('file',type=Path)
 p=sub.add_parser('reprioritize');p.add_argument('key');p.add_argument('--impact',type=int,choices=range(1,6),required=True);p.add_argument('--effort',choices=['E0','E1','E2','E3'],required=True);p.add_argument('--qualification',choices=['Q1','Q2','Q3','Q4'],required=True);p.add_argument('--relevance',choices=list(RELEVANCE),required=True);p.add_argument('--reason',required=True)
 p=sub.add_parser('reopen');p.add_argument('key');p.add_argument('--reason',required=True)
 args=ap.parse_args(argv);root=args.root.resolve()
 try:
  if args.cmd=='verify':
   v=verify(root);print(json.dumps(v,indent=2));return 0 if v['ok'] else 1
  if args.cmd=='status':print(json.dumps(status(root),indent=2));return 0
  items=load(root)
  if args.cmd=='next':
   if args.limit<1:raise ValueError('--limit must be positive')
   q=queue(root,args.lane,args.family)[:args.limit]
   if args.json:print(json.dumps(q,indent=2,ensure_ascii=False))
   else:
    print('Lane: '+args.lane+'; ranks are initial editorial positions, not test results.')
    for i in q:print(f"{i.get('initial_rank') or '-':>3} B{i.get('priority_band') or '-'} I{i.get('impact') or '-'} {i['screen_effort']} {i.get('qualification_burden') or '-'} | {i['key']}\n    {i['title'] or 'Source recovery only'}")
   return 0
  if args.cmd=='show':
   i=resolve(items,args.key);print((root/'catalogue/cards'/f"{i['key']}.md").read_text());return 0
  if args.cmd=='template':print(json.dumps(template(resolve(items,args.key)),indent=2,ensure_ascii=False));return 0
  if args.cmd=='record':
   d=jread(args.file);validate_record(root,items,d);d['recorded_at_utc']=datetime.datetime.now(datetime.timezone.utc).isoformat();append(root,'state/decisions.jsonl',d);print('Recorded '+d['key']+' → '+d['decision']);return 0
  if args.cmd=='reprioritize':
   i=resolve(items,args.key)
   if not i['title']:raise ValueError('Recover a definition before assigning impact or qualification effort')
   if len(args.reason.strip())<20:raise ValueError('Explain the actual reason for reprioritizing (at least 20 characters)')
   d={'key':i['key'],'impact':args.impact,'screen_effort':args.effort,'qualification_burden':args.qualification,'target_relevance':args.relevance,'reason':args.reason,'recorded_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat()};append(root,'state/priority_updates.jsonl',d);print('Priority update recorded');return 0
  if args.cmd=='reopen':
   i=resolve(items,args.key);d=template(i);d.update({'decision':'REOPEN','evidence_level':'NONE','reason':args.reason,'reopen_condition':args.reason});validate_record(root,items,d);d['recorded_at_utc']=datetime.datetime.now(datetime.timezone.utc).isoformat();append(root,'state/decisions.jsonl',d);print('Reopened '+i['key']);return 0
 except (ValueError,OSError,KeyError,TypeError) as e:print('ERROR: '+str(e),file=sys.stderr);return 2
 return 0
if __name__=='__main__':raise SystemExit(main())
