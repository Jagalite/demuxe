#!/usr/bin/env python3
"""Serial exact-archive streaming matrices; separate from clean source/release verification."""
import argparse,hashlib,json,os,signal,subprocess,time
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
for name in ['archive','ladder','large','subtitles','discontinuity','output']:p.add_argument('--'+name,required=True,type=Path)
groups=['timeline','rolling-hls','rolling-dash','endurance','discontinuity','subtitles','quality','network','container-errors','integrated-seek','live-edge','discovery','large','delayed']
p.add_argument('--group',choices=groups,action='append',help='Run only these independently reviewable groups')
p.add_argument('--keep-going',action='store_true',help='Preserve failures and continue independent cases')
a=p.parse_args();out=a.output.resolve();out.mkdir();root=Path(__file__).resolve().parent
sha=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
archive=a.archive.resolve();digest=sha(archive);selected=set(a.group or groups)
fixture_inputs={}
for f in [a.ladder/'fixture-manifest.json',a.large/'fixture-manifest.json',a.subtitles/'fixture-manifest.json',a.discontinuity/'fixture-manifest.json']:
 if not f.exists():raise SystemExit('Missing fixture input: '+str(f))
 manifest=json.loads(f.read_text());assert manifest['files'],str(f)
 for name,entry in manifest['files'].items():
  file=(f.parent/name).resolve();assert file.is_relative_to(f.parent.resolve()),name
  assert file.stat().st_size==entry['bytes'] and sha(file)==entry['sha256'],str(file)
 fixture_inputs[str(f.resolve())]={'sha256':sha(f),'verifiedFiles':len(manifest['files'])}
(out/'driver.py').write_bytes(Path(__file__).read_bytes())
base=dict(os.environ,BETA_ARCHIVE=str(archive),STREAM_FIXTURES=str(a.ladder.resolve()),LARGE_FIXTURE=str(a.large.resolve()))
for key in ['ONE','CASES','TRACE_PACKETS','TRACE_EVENTS','CANDIDATE_DELAY_MS','DIRECT_ENGINE_SEEK','UNIFIED_PLAYER_OVERRIDE','EXPIRE_PAUSE_MS','ENDURANCE_SECONDS','PERIOD_MANIFEST']:
 base.pop(key,None)
base['ENDURANCE_SECONDS']='300'
jobs=[]
def node(group,name,harness,browser,fixture=None,extra=None,timeout=300):
 jobs.append({'group':group,'name':name,'command':['node',str(root/harness)],'environment':{'BROWSER':browser,**({'STREAM_FIXTURES':str(fixture.resolve())} if fixture else {}),**(extra or {})},'timeout':timeout})
def rolling(group,subdir,formats):
 for format in formats:
  for browser in ['chrome','firefox']:
   for mode in ['hybrid','software']:
    name=f'{group}-{format}-{browser}-{mode}';command=['python3',str(root/'live'/subdir/'run-browser.py'),'--format',format,'--archive',str(archive),'--fixtures',str(a.ladder.resolve()),'--output',str(out/name),'--browser',browser,'--mode',mode]
    if group.startswith('rolling-'):command+=['--expiry']
    jobs.append({'group':group,'name':name,'command':command,'environment':{'BROWSER':browser},'timeout':480 if group=='endurance' else 210})
rolling('discovery','discovery',['dash'])
rolling('live-edge','edge',['hls','dash'])
rolling('timeline','timeline',['hls','dash'])
rolling('rolling-hls','rolling-discontinuity',['hls'])
rolling('rolling-dash','periods',['dash'])
rolling('endurance','endurance',['hls','dash'])
for browser in ['chrome','firefox']:
 node('discontinuity','discontinuity-'+browser,'live/discontinuity/probe-browser.mjs',browser,a.discontinuity)
 node('subtitles','subtitles-'+browser,'live/subtitles/probe-browser.mjs',browser,a.subtitles)
 for name,harness in [('public-api','quality/probe-quality.mjs'),('component','quality/probe-component.mjs'),('abr','integration/probe-abr.mjs'),('audio-relay','integration/probe-audio-relay.mjs')]:
  node('quality',name+'-'+browser,harness,browser,timeout=650 if name=='abr' else 300)
 node('network','network-'+browser,'live/network/probe-browser.mjs',browser)
 node('container-errors','container-errors-'+browser,'live/network/container-errors.mjs',browser)
 node('integrated-seek','integrated-seek-'+browser,'live/network/accepted-seek.mjs',browser)
 node('large','large-'+browser,'live/large-browser.mjs',browser)
 node('delayed','delayed-'+browser,'integration/probe-mpv-session.mjs',browser,extra={'CANDIDATE_DELAY_MS':'3000'})
assert len(jobs)==58,len(jobs)
plan=[j for j in jobs if j['group'] in selected]
record={'scope':__doc__,'releaseQualified':False,'archive':str(archive),'archiveSHA256':digest,'driverSHA256':sha(Path(__file__)),
 'fixtureInputs':fixture_inputs,'groups':sorted(selected),'completeMatrix':selected==set(groups),'expectedJobs':[j['name'] for j in plan],'jobs':[],'passed':False}
(out/'plan.json').write_text(json.dumps(plan,indent=2)+'\n')
for job in plan:
 name=job['name'];env={**base,**job['environment'],'OUT':str(out/name)};began=time.monotonic()
 entry={**job,'harnessSHA256':sha(Path(job['command'][1]))};record['active']=name;(out/'result.json').write_text(json.dumps(record,indent=2)+'\n');print('START '+name,flush=True)
 with (out/(name+'.log')).open('w') as log:
  process=subprocess.Popen(job['command'],env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
  try:entry['exit']=process.wait(timeout=job['timeout'])
  except subprocess.TimeoutExpired:
   entry['exit']=None;entry['error']='Qualification process exceeded its deadline'
   os.killpg(process.pid,signal.SIGTERM)
   try:process.wait(timeout=10)
   except subprocess.TimeoutExpired:os.killpg(process.pid,signal.SIGKILL);process.wait()
 entry['seconds']=time.monotonic()-began;entry['logSHA256']=sha(out/(name+'.log'))
 file=out/name/'result.json'
 try:
  result=json.loads(file.read_text());actual=result['browser'] if isinstance(result.get('browser'),dict) else result
  entry['resultSHA256']=sha(file);entry['browserResult']=str((out/name/'browser/result.json') if actual is not result else file)
  entry['passed']=entry['exit']==0 and result['passed'] and actual['passed'] and actual.get('browserClosed') is True and actual['archiveSHA256']==digest and all(c['passed'] and c.get('remainingWorkers')==0 for c in actual['cases'])
 except Exception as error:entry['passed']=False;entry['resultError']=repr(error)
 record['jobs'].append(entry);record.pop('active',None);(out/'result.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps({'name':name,'passed':entry['passed'],'seconds':entry['seconds']}),flush=True)
 if not entry['passed'] and not a.keep_going:break
record['passed']=len(record['jobs'])==len(plan) and all(j['passed'] for j in record['jobs']);(out/'result.json').write_text(json.dumps(record,indent=2)+'\n');raise SystemExit(0 if record['passed'] else 1)
