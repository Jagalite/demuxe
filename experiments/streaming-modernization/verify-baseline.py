#!/usr/bin/env python3
"""Verify correspondence of an experimental baseline; never authorize release."""
import argparse, hashlib, json, os, subprocess, tarfile
from pathlib import Path, PurePosixPath
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--checks',type=Path,required=True);p.add_argument('--source',type=Path,required=True)
p.add_argument('--output',type=Path,required=True)
p.add_argument('--transport',action='store_true',help='Verify the incremental transport stage gate set')
p.add_argument('--integration',action='store_true',help='Verify the integrated-session stage, including compatibility streaming')
p.add_argument('--resource-errors',action='append',type=Path,default=[],help='Transport browser resource-error result directory; supply Chrome and Firefox')
p.add_argument('--consumer-rechecks',type=Path,help='Recorded repeated Firefox consumer runs after the wait-draining fix')
a=p.parse_args();a.transport=a.transport or a.integration;checks=a.checks.resolve();source=a.source.resolve();out=a.output.resolve()
if out.exists():raise SystemExit('Use a new verification evidence directory')
out.mkdir(parents=True)
sha=lambda data:hashlib.sha256(data).hexdigest()
result={'scope':'Experimental clean baseline correspondence, not release qualification','releaseQualified':False,'passed':False}
try:
 q=json.loads((checks/'result.json').read_text());runtime=checks/q['archive']
 assert q['passed'] and all(c['passed'] and c['exit']==0 for c in q['checks'])
 expected={'consumer-chrome','consumer-firefox','api-component-cli-types','compatibility-chrome','archived-deadline'}
 expected |= {prefix+'-'+browser for prefix in ['accepted-seek','incremental-playback'] for browser in ['chrome','firefox']} if a.transport else {'streaming-chrome','streaming-firefox'}
 if a.integration:expected|={'streaming-chrome','streaming-firefox','seek-queue','integrated-session-chrome','integrated-session-firefox'}
 assert {c['name'] for c in q['checks']}==expected and len(q['checks'])==len(expected)
 assert q['stage']==('adaptive-integration' if a.integration else 'incremental-transport' if a.transport else 'baseline-restoration')
 result['stage']=q['stage']
 if a.integration:
  integration=[]
  for browser in ['chrome','firefox']:
   name='integrated-session-'+browser;file=checks/name/'result.json';data=file.read_bytes();e=json.loads(data)
   assert e['passed'] and e['archiveSHA256']==q['archiveSHA256'] and e['family']==browser
   assert len(e['cases'])==4 and all(c['passed'] and c['remainingWorkers']==0 for c in e['cases'])
   assert {c['name'] for c in e['cases']}=={'hybrid:hls','hybrid:dash','software:hls','software:dash'}
   check=next(c for c in q['checks'] if c['name']==name);assert check['harnessSHA256']==e['harnessSHA256']
   # Only recorded measurement hooks may differ; manifests and native engine
   # bytes must come from the tested archive.
   assert set(e['overrides'])=={'web/filter-retained-engine-worker.js','web/software-full-engine-worker.js','web/retained-video.js'}
   with tarfile.open(runtime) as measured:
    for n,h in e['overrides'].items():
     recorded=(checks/name/'overrides'/n).read_bytes();assert sha(recorded)==h
     text=measured.extractfile('package/'+n).read().decode()
     if n=='web/retained-video.js':
      before='  context.drawImage(frame,'
      after='  globalThis.probeFrame={width:frame.displayWidth,height:frame.displayHeight,pts:frame.timestamp/1e6};if(globalThis.probeDraws?.length<10000)probeDraws.push({wall:performance.timeOrigin+performance.now(),pts:frame.timestamp/1e6,kind:"retained-frame"});\n  context.drawImage(frame,'
      assert text.count(before)==1;text=text.replace(before,after,1)
     else:
      text='const probeLifetime={id:crypto.randomUUID(),creates:0,destroys:0};globalThis.probeDraws=[];\n'+text
      for before,after in [
       ('const result = engine._web_create(data.sampleRate);','probeLifetime.creates++;const result = engine._web_create(data.sampleRate);'),
       ('engine?._web_destroy();','probeLifetime.destroys++;engine?._web_destroy();'),
       ("type:'diagnostics', data:{","type:'diagnostics', data:{probeLifetime:{...probeLifetime},probeThreads:{running:engine.PThread.runningWorkers.length,unused:engine.PThread.unusedWorkers.length},probeFrame:globalThis.probeFrame,probeDraws:globalThis.probeDraws,")]:
       assert text.count(before)==1;text=text.replace(before,after,1)
      text=text.replace("post({type:'log',message})","(console.log('native:',message),post({type:'log',message}))")
      text=text.replace('context.putImageData(frameImage, 0, 0);','context.putImageData(frameImage, 0, 0);if(probeDraws.length<10000)probeDraws.push({wall:performance.timeOrigin+performance.now(),position,kind:"software-clock-estimate"});',1)
     assert text.encode()==recorded,'Unapproved measurement override: '+n
   for c in e['cases']:
    lifetime=c['initial']['diagnostics']['backend']['probeLifetime'];assert lifetime['creates']==1 and lifetime['destroys']==0
    assert len(c['switches'])==3 and all(x['after']['diagnostics']['backend']['probeLifetime']==lifetime for x in c['switches'])
    for index, switch in zip([2,1,0],c['switches']):
     quality=switch['after']['diagnostics']['backend']['quality']
     assert quality['demuxed']==index and quality['presented']==index
    assert c['remainingWorkers']==0
    assert c['continuity']['maxDrawGap']<.5 and c['continuity']['maxReportedAVSync']<.2 and c['continuity']['underruns']==0
   integration.append({'family':browser,'resultSHA256':sha(data),'scope':e['scope'],'overrides':e['overrides']})
  result['integratedSessionChecks']=integration
 if a.transport:
  assert len(a.resource_errors)==2,'Transport verification requires both browser resource-error runs'
  resource_evidence=[]
  for directory in a.resource_errors:
   data=(directory/'result.json').read_bytes();evidence=json.loads(data)
   assert evidence['passed'] and evidence['archiveSHA256']==q['archiveSHA256']
   assert len(evidence['cases'])==8 and all(c['passed'] for c in evidence['cases'])
   resource_evidence.append(evidence)
  assert {e['family'] for e in resource_evidence}=={'chrome','firefox'}
  result['resourceErrorChecks']=[{'path':str(d.resolve()),'resultSHA256':sha((d/'result.json').read_bytes()),'family':e['family'],'browser':e['browser'],'harnessSHA256':e['testHarnessSHA256'],'passed':True} for d,e in zip(a.resource_errors,resource_evidence)]
  for prefix in ['accepted-seek','incremental-playback']:
   for browser in ['chrome','firefox']:
    evidence=json.loads((checks/(prefix+'-'+browser)/'result.json').read_text())
    assert evidence['passed'] and evidence['archiveSHA256']==q['archiveSHA256']
    assert not evidence.get('overrides') and not evidence.get('directEngineSeek')
    check=next(c for c in q['checks'] if c['name']==prefix+'-'+browser)
    assert check['harnessSHA256']==evidence['testHarnessSHA256']
    assert len(evidence['cases'])==(8 if prefix=='accepted-seek' else 4)
 assert q['archiveSHA256']==sha(runtime.read_bytes())
 if a.consumer_rechecks:
  repeats=json.loads(a.consumer_rechecks.read_text())
  assert repeats['archiveSHA256']==q['archiveSHA256'] and repeats['passed'] and len(repeats['runs'])==2
  for run in repeats['runs']:
   data=Path(run['result']).read_bytes();assert sha(data)==run['resultSHA256'] and run['exit']==0
   evidence=json.loads(data);assert evidence['passed'] and evidence['family']=='firefox' and evidence['archiveSHA256']==q['archiveSHA256'] and len(evidence['checks'])==8
  result['consumerRechecks']={'recordSHA256':sha(a.consumer_rechecks.read_bytes()),'runs':repeats['runs'],'passed':True}
 for c in q['checks']:assert sha((checks/(c['name']+'.log')).read_bytes())==c['logSHA256']
 def members(tar):
  found={}
  for m in tar.getmembers():
   n=PurePosixPath(m.name)
   assert not n.is_absolute() and '..' not in n.parts and not m.issym() and not m.islnk(),m.name
   assert m.name not in found,m.name
   assert m.isfile(),m.name
   found[m.name]=m
  return found
 with tarfile.open(runtime) as tar:
  rm=members(tar);manifest=json.loads(tar.extractfile(rm['package/release-manifest.json']).read())
  for n,e in manifest['files'].items():
   data=tar.extractfile(rm['package/'+n]).read();assert len(data)==e['bytes'] and sha(data)==e['sha256'],n
  assert set(rm)=={'package/'+n for n in manifest['files']}|{'package/release-manifest.json'}
  metadata=json.loads(tar.extractfile(rm['package/package.json']).read())
  (out/'extracted').mkdir();tar.extractall(out/'extracted',filter='data')
  result['runtime']={'file':runtime.name,'bytes':runtime.stat().st_size,'sha256':q['archiveSHA256'],'unpackedBytes':sum(m.size for m in rm.values()),'fileCount':len(rm),'metadata':metadata}
 with tarfile.open(source) as tar:
  sm=members(tar);m=json.loads(tar.extractfile(sm['source-manifest.json']).read())
  assert m['runtimeSHA256']==q['archiveSHA256'] and m['sourceTag'] is None and not m['releaseQualified']
  assert set(sm)==set(m['files'])|{'source-manifest.json'}
  for n,h in m['files'].items():assert sha(tar.extractfile(sm[n]).read())==h,n
  if q.get('fixtureInputsSHA256'):
   assert m['files']['build-materials/qualification-fixture-inputs.json']==q['fixtureInputsSHA256']
  reuse={}
  if q.get('engineReuseSHA256'):
   assert m['files']['build-materials/native-build-reuse.json']==q['engineReuseSHA256']
   reuse=json.loads(tar.extractfile(sm['build-materials/native-build-reuse.json']).read())
   assert reuse['engineBuildRecordSHA256']==q['buildRecordSHA256'] and not reuse['freshNativeBuild'] and not reuse['releaseQualified']
   for n,e in reuse['changedRuntimeFiles'].items():
    assert n.startswith('web/') and n.endswith('.js') and m['files']['demuxe/'+n]==e['after']
   for n,e in reuse.get('changedPublicFiles',{}).items():
    assert n.startswith('src/') and n.endswith('.ts') and m['files']['demuxe/'+n]==e['after']
   for n,e in reuse.get('changedDocumentationFiles',{}).items():
    assert n == 'README.md' or (n.startswith('docs/') and n.endswith('.md') and '..' not in Path(n).parts)
    assert m['files']['demuxe/'+n]==e['after']
   assert set(reuse.get('changedPackagingFiles',{})) <= {'scripts/package-beta.py'}
   for n,e in reuse.get('changedPackagingFiles',{}).items():
    assert m['files']['demuxe/'+n]==e['after'] and m['files']['build-materials/reused-inputs/'+n]==e['before']
   result['engineReuse']={'origin':reuse['engineBuildOrigin'],'freshNativeBuild':False,'recordSHA256':q['engineReuseSHA256'],**{key:reuse.get(key,{}) for key in ['changedRuntimeFiles','changedPublicFiles','changedDocumentationFiles','changedPackagingFiles']}}
  if a.transport:
   for evidence in resource_evidence:
    assert m['files']['experiment/transport/resource-errors-browser.mjs']==evidence['testHarnessSHA256']
  data=tar.extractfile(sm['build-materials/beta-build.json']).read();assert sha(data)==q['buildRecordSHA256']==m['buildRecordSHA256']
  b=json.loads(data);assert b['clean']
  for n,h in b['inputs'].items():
   change=reuse.get('changedPackagingFiles',{}).get(n)
   if change:assert change['before']==h and m['files']['build-materials/reused-inputs/'+n]==h,n
   else:assert m['files']['demuxe/'+n]==h,n
  for n,h in b['sources'].items():assert m['files']['demuxe/build/downloads/'+n+'.tar.gz']==h,n
  for n,h in b['configurations'].items():assert m['files']['build-materials/'+n]==h,n
  for n,e in b['artifacts'].items():assert manifest['files'][n]==e,n
  wrappers={name+extension:("export * from './web/generated/"+target+".js';\n").encode()
            for name,target in [('index','index'),('player','player/index')] for extension in ['.js','.d.ts']}
  project=json.loads(tar.extractfile(sm['demuxe/package.json']).read())
  for key in ['name','version','description','repository','bugs','homepage','keywords']:
   assert metadata[key]==project[key],('Package metadata/source mismatch',key)
  for n,e in manifest['files'].items():
   if n in b['artifacts'] or n=='package.json':continue
   if n in wrappers:
    assert sha(wrappers[n])==e['sha256'],('Generated entrypoint mismatch',n)
    continue
   assert 'demuxe/'+n in sm,('Missing runtime source',n)
   content=tar.extractfile(sm['demuxe/'+n]).read()
   if n=='README.md':
    for doc in ['RELEASE.md','LICENSING.md','COMPATIBILITY-EXPANSION.md']:
     content=content.replace((']('+doc+')').encode(),('](docs/'+doc+')').encode())
   assert sha(content)==e['sha256'],('Runtime/source mismatch',n)
  capabilities={}
  for label,name in [('software','build/obj-software-full-ffmpeg/config_components.h'),('remux','build/native-remux/ffmpeg/config_components.h')]:
   content=tar.extractfile(sm['build-materials/'+name]).read().decode()
   capabilities[label]=sorted(line.split()[1] for line in content.splitlines() if line.startswith('#define CONFIG_') and line.endswith(' 1'))
  result['source']={'file':source.name,'bytes':source.stat().st_size,'sha256':sha(source.read_bytes()),'unpackedBytes':sum(m.size for m in sm.values()),'fileCount':len(sm)}
  result['build']={'recordSHA256':q['buildRecordSHA256'],'clean':True,'sources':b['sources'],'artifacts':b['artifacts'],'licenses':b['licenses'],'compiledCapabilities':capabilities}
 env={**os.environ,'npm_config_cache':str(out/'npm-cache')}
 process=subprocess.run(['npm','pack','--dry-run','--ignore-scripts','--json'],cwd=out/'extracted/package',env=env,capture_output=True,text=True)
 (out/'npm-pack.json').write_text(process.stdout);(out/'npm-pack.log').write_text(process.stderr)
 assert process.returncode==0,process.stderr
 pack=json.loads(process.stdout)[0];assert pack['name']==metadata['name'] and pack['version']==metadata['version']
 assert {f['path'] for f in pack['files']}=={n.removeprefix('package/') for n in rm}
 result['npmPack']={k:pack[k] for k in ['name','version','size','unpackedSize','entryCount']}
 result['checks']=q['checks'];result['passed']=True
except Exception as error:
 result['error']=repr(error)
finally:
 (out/'result.json').write_text(json.dumps(result,indent=2)+'\n')
 if 'runtime' in result and 'source' in result:
  (out/'SHA256SUMS').write_text(''.join(f"{result[k]['sha256']}  {result[k]['file']}\n" for k in ['runtime','source']))
 print(json.dumps({k:v for k,v in result.items() if k not in ['build','checks']},indent=2))
raise SystemExit(0 if result['passed'] else 1)
