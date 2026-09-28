import base64,hashlib,json,pathlib,subprocess
root=pathlib.Path.cwd();release=root/'build/release-rc15';gates=root/'build/release-browser-gates-rc15';pipeline=root/'build/release-pipeline-rc15'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def load(p):return json.loads(p.read_text())
archive=release/'demuxe-0.3.0-beta.4.tgz';digest=sha(archive)
# Keep the failed first attempt intact; require a complete fresh optional gate.
g=load(gates/'gates.json');assert not g['passed'] and g['archiveSHA256']==digest
assert len(g['checks'])==8
assert [(x['name'],x['exit'])for x in g['checks']if x['exit']!=0]==[('optional',1)]
p=load(pipeline/'pipeline.json');assert not p['passed'] and p['archive']['sha256']==digest
assert len(p['stages'])==10
assert [(x['name'],x['exit'])for x in p['stages']if x['exit']!=0 and x['name']!='catalogue']==[('browser-gates',1)]
failed_result=root/'results/optimization-final/automatic-firefox-1790584791822/result.json'
failed=load(failed_result);assert len(failed['cases'])==11
failures=[c for c in failed['cases']if not c.get('passed')]
assert len(failures)==1 and failures[0]['name']=='lossless' and failures[0]['diagnostics'] is None
assert failures[0]['error'].startswith('page.goto: Timeout 20000ms exceeded.')
diagroot=pathlib.Path('/Volumes/seed2/Projects/demuxe-runtime-commit-check/build/rc15-navigation-diagnostics')
diag=load(diagroot/'diagnostics.json')
assert diag['passed'] and diag['officialExit']==0 and len(diag['trials'])==2
assert diag['archiveSHA256']==digest
assert sha(gates/'optional/qualification.json')==diag['originalFailureSHA256']
assert sha(diagroot/'automatic-diagnostic.mjs')==diag['diagnosticHarnessSHA256']
for trial in diag['trials']:
 assert trial['exit']==0 and trial['cases']==trial['passed']==11
 result=pathlib.Path(trial['result']);assert sha(result)==trial['resultSHA256']
 assert all(c.get('passed')for c in load(result)['cases'])
 assert sha(diagroot/f"trial-{trial['index']}.log")==trial['logSHA256']
assert sha(diagroot/'official-optional.log')==diag['officialLogSHA256']
optional=root/'build/release-optional-rc15-navigation-recheck/qualification.json'
assert pathlib.Path(diag['officialRequalification'])==optional.parent
fresh=load(optional);assert fresh['passed'] and fresh['archiveSHA256']==digest and len(fresh['checks'])==27
assert all(c['passed'] and c['exitCode']==0 for c in fresh['checks'])
rate_root=pathlib.Path('/Volumes/seed2/Projects/demuxe-runtime-commit-check/build/rc15-rate-diagnostics')
rate=load(rate_root/'requalification.json');assert rate['passed'] and rate['comparisonStatus']=='qualified' and len(rate['trials'])==3
initial_catalogue=root/'build/release-catalogue-comparison-rc15.json'
assert sha(initial_catalogue)==rate['initialComparisonSHA256']
original=load(initial_catalogue);assert original['status']=='review-required'
regressions=[c for c in original['cases']if c['candidateRegression']]
assert len(regressions)==1 and regressions[0]['fixture']=='pcm-ass' and regressions[0]['candidate']['firstFailureStage']=='playback-rate'
for trial in rate['trials']:
 trial_path=pathlib.Path(trial['path']);assert sha(trial_path)==trial['sha256']
 result=load(trial_path);assert len(result['cases'])==1 and result['cases'][0]['status']=='passed'
assert sha(rate_root/'catalogue-requalification.log')==rate['logSHA256']
assert sha(pathlib.Path(rate['comparison']))==rate['comparisonSHA256']
assert pathlib.Path(rate['comparison'])==root/'build/release-catalogue-comparison-rc15-recheck.json'
for group,items in [(gates,g['checks']),(pipeline,p['stages'])]:
 for item in items:
  log=group/(item.get('log') or item['name']+'.log');assert sha(log)==item['logSHA256']
def report(name):
 candidates=[]
 for line in (gates/(name+'.log')).read_text().splitlines():
  path=pathlib.Path(line.strip());path=path if path.is_absolute()else root/path
  try:
   result=path/'result.json'
   if result.is_file() and load(result).get('archiveSHA256')==digest:candidates.append(result)
  except OSError:pass
 assert len(candidates)==1,(name,candidates)
 return candidates[0]
args=['python3','scripts/verify-beta-release.py','--archive',str(archive),'--source',str(release/'demuxe-0.3.0-beta.4-source.tar.gz'),'--lgpl-catalogue',str(root/'build/release-catalogue-comparison-rc15-recheck.json')]
for flag,name in [('consumer','beta-consumer'),('streaming','beta-streaming'),('shaka','shaka-package')]:args.extend(['--'+flag,*[str(report(name+'-'+browser))for browser in ['chrome','firefox']]])
args.extend(['--extra',str(report('release-extra')),'--optional',str(optional)])
print('Verifying exact release archive',flush=True)
subprocess.run(args,check=True)
assets=root/'build/release-private-player-assets-rc15';manifest=load(assets/'manifest.json');assert manifest['runtimePackage']['sha256']==digest
for name,item in manifest['files'].items():assert sha(assets/name)==item['sha256'],name
records=[]
for name,count in [('correctness',31),('routes',12),('lifecycle',18)]:
 path=root/f'build/release-private-player-{name}-rc15/result.json';data=load(path)
 assert data['passed'] and data['assetsSHA256']==sha(assets/'manifest.json'),name
 assert len(data['cases'])==count and all(c.get('passed') for c in data['cases']),(name,len(data['cases']))
 harness='tests/private-mpv-'+('lifecycle' if name=='lifecycle' else 'campaign')+'.mjs'
 tagged=subprocess.check_output(['git','show',p['source']+':'+harness])
 assert (path.parent/'harness.mjs').read_bytes()==tagged== (root/harness).read_bytes(),harness
 records.append({'suite':name,'path':str(path),'sha256':sha(path),'cases':len(data['cases']),'harness':harness,'harnessSHA256':sha(path.parent/'harness.mjs')})
record={'status':'release-preparation-verified','archiveSHA256':digest,'sourceCommit':p['source'],'sourceTag':p['tag'],'releaseVerificationSHA256':sha(release/'verification.json'),'privatePlayerAssets':{'path':str(assets),'manifestSHA256':sha(assets/'manifest.json')},'privatePlayer':records,'performance':'Not run by this agent; user assigned CPU and README measurements to another agent.','publication':'Not published','scope':'Developer beta archive; no broad production or physical audio/video qualification claim.'}
dry_path=release/'npm-publish-dry-run.json';dry=load(dry_path)
assert dry['name']=='demuxe' and dry['version']=='0.3.0-beta.4'
assert dry['shasum']==hashlib.sha1(archive.read_bytes()).hexdigest()
assert dry['integrity']=='sha512-'+base64.b64encode(hashlib.sha512(archive.read_bytes()).digest()).decode()
record['npmPublishDryRun']={'path':str(dry_path),'sha256':sha(dry_path),'archiveIntegrity':dry['integrity'],'entryCount':dry['entryCount'],'published':False}
record['retainedInitialFailure']={'gates':{'path':str(gates/'gates.json'),'sha256':sha(gates/'gates.json')},'optional':{'path':str(gates/'optional/qualification.json'),'sha256':sha(gates/'optional/qualification.json')},'case':{'path':str(failed_result),'sha256':sha(failed_result)},'reason':'First Firefox automatic lossless test timed out loading the test page before Player construction. Cause not established; no product fix claimed.'}
record['optionalRequalification']={'path':str(optional),'sha256':sha(optional),'diagnostics':str(diagroot/'diagnostics.json'),'diagnosticsSHA256':sha(diagroot/'diagnostics.json'),'policy':'Two fixed complete diagnostic trials passed, followed by one full official optional gate using unchanged tagged tests, timeout, assertions and exact archive. Original failed records remain unmodified.'}
record['catalogueRequalification']={'initialComparison':str(initial_catalogue),'initialComparisonSHA256':sha(initial_catalogue),'diagnostics':str(rate_root/'requalification.json'),'diagnosticsSHA256':sha(rate_root/'requalification.json'),'finalComparison':rate['comparison'],'finalComparisonSHA256':rate['comparisonSHA256'],'policy':rate['plan'],'interpretation':'Three fixed diagnostic cases passed. Public-clock quantization observed alongside continuous media time, but original failure cause not established; no product fix claimed. Full fresh unchanged 80-case comparison qualified.'}
record['verifierSHA256']=sha(pathlib.Path(__file__))
(release/'verify-release-preparation.py').write_bytes(pathlib.Path(__file__).read_bytes())
(release/'release-preparation.json').write_text(json.dumps(record,indent=2)+'\n');print(release/'release-preparation.json')
