#!/usr/bin/env python3
"""Bind complete streaming, public quality, unit and clean-source gates to one archive."""
import argparse,hashlib,json,tarfile
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
for name in ['runtime','source','baseline-verification','quality-verification','units','output']:p.add_argument('--'+name,required=True,type=Path)
p.add_argument('--matrix',required=True,action='append',type=Path)
p.add_argument('--native-evidence',required=True,type=Path,help='JSON map of bridge/read-errors/wait/order/control/preroll/discovery result directories')
a=p.parse_args();out=a.output.resolve();out.mkdir();sha=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
read=lambda d:json.loads((d/'result.json').read_text())
record={'scope':__doc__,'passed':False,'releaseQualified':False,'sourceTag':None,'gates':[]}
try:
 runtime_hash=sha(a.runtime);source_hash=sha(a.source);base=read(a.baseline_verification)
 assert base['passed'] and base['build']['clean'] and not base['releaseQualified']
 assert base['runtime']['sha256']==runtime_hash and base['source']['sha256']==source_hash
 with tarfile.open(a.source) as archive:source_manifest=json.load(archive.extractfile('source-manifest.json'))
 assert source_manifest['runtimeSHA256']==runtime_hash
 sources=source_manifest['files']
 native_map=json.loads(a.native_evidence.read_text())
 assert set(native_map)=={'bridge','read-errors','wait','order','control','preroll','discovery'}
 def native_input(result,basename,source):
  matches=[digest for name,digest in result['inputs'].items() if Path(name).name==basename]
  assert matches==[sources[source]],(basename,source)
 for name,directory in native_map.items():
  directory=Path(directory);n=read(directory);assert n['passed'],name
  if name in ['bridge','read-errors','control','preroll','discovery']:assert '-fsanitize=address,undefined' in n['command'],name
  if name=='bridge':
   assert n['compileExit']==n['testExit']==0 and sha(directory/'test.log')==n['testLogSHA256']
   for file in ['stream_bridge.c','stream_bridge.h']:native_input(n,file,'demuxe/native/'+file)
   native_input(n,'native-test.c','experiment/concurrent/native-test.c')
  elif name=='discovery':
   assert n['exit']==0 and n['expiredDiscoveryRequests']==0 and n['observed']=={'openError':0,'video':3,'audio':2}
   assert n['initialMediaResources']==[f'dash/chunk-stream{i}-00010.m4s' for i in [0,3,4]]
   assert sha(directory/'stderr.log')==n['stderrSHA256']
   for file in ['probe.c','probe-native.py']:native_input(n,file,'experiment/live/discovery/'+file)
   assert sources['experiment/live/discovery/fixture-server.py'] in n['inputs'].values()
   native_records=[(Path(path),digest) for path,digest in n['inputs'].items() if Path(path).name=='build-record.json'];assert len(native_records)==1
   path,digest=native_records[0];assert sha(path)==digest;native_build=json.loads(path.read_text())
   assert native_build['source']['sha256']==base['build']['sources']['ffmpeg']
   assert all(digest in sources.values() for digest in native_build['patches'].values())
  elif name=='control':
   assert n['exit']==0 and sha(directory/'test.log')==n['logSHA256']
   assert sha(directory/'generated.patch')==sources['demuxe/patches/0018-demuxe-live-components.patch']
   native_input(n,'control-error-probe.c','experiment/live/timeline/control-error-probe.c')
   native_input(n,'track-startup-probe.c','experiment/live/timeline/track-startup-probe.c')
   assert n['startup']['exit']==0 and not n['startup']['baseline']
   assert '-fsanitize=address,undefined' in n['startup']['command']
   assert sha(directory/'startup-test.log')==n['startup']['logSHA256']
   assert sha(directory/'track-refresh-function.c')==n['startup']['functionSHA256']
  else:
   for file in ['container-task.c','webvtt-map.c']:native_input(n,file,'experiment/live/subtitles/task/'+file)
   native_input(n,'rewind-reader.c','experiment/integration/task/rewind-reader.c')
   if name=='read-errors':
    assert len(n['cases'])==11 and all(c['passed'] and c['exit']==0 for c in n['cases'])
    native_input(n,'read-error-probe.c','experiment/live/timeline/read-error-probe.c')
   elif name=='preroll':
    assert n['exit']==0 and sha(directory/'stderr.log')==n['stderrSHA256']
    for file in ['adaptive-session.c','component-group.c']:native_input(n,file,'experiment/live/subtitles/task/'+file)
    for file in ['preroll-probe.c','probe-preroll.py']:native_input(n,file,'experiment/live/edge/'+file)
    packets=n['packets'];assert packets['error']==0 and packets['strictRejected'] and packets['endRejected'] and packets['prerollAccepted'] and packets['audioPackets']>0
    assert packets['windowStart']<=packets['firstVideo']<=packets['windowStart']+250000
    native_records=[(Path(path),digest) for path,digest in n['inputs'].items() if Path(path).name=='build-record.json'];assert len(native_records)==1
    path,digest=native_records[0];assert sha(path)==digest;native_build=json.loads(path.read_text())
    assert native_build['source']['sha256']==base['build']['sources']['ffmpeg']
    assert all(digest in sources.values() for digest in native_build['patches'].values())
    record['nativeProbeBuild']={'recordSHA256':sha(path),'source':native_build['source'],'toolchain':native_build['toolchain'],'scope':native_build['scope']}
   else:
    assert n['exit']==0
    for file in ['adaptive-session.c','component-group.c']:native_input(n,file,'experiment/live/subtitles/task/'+file)
    native_input(n,'coordination-probe.c','experiment/live/timeline/coordination-probe.c')
    packets=json.loads(n['packets']);assert packets['error']==0
    if name=='wait':assert n['fault']=='wait' and 0<packets['readCalls']<=100 and packets['video']==packets['audio']==0
    else:assert n['fault']=='none' and packets['switches']==3 and packets['maxVideoLeadUs']<=250000 and packets['videoTimeUs']>8500000
  record['gates'].append({'name':'native-'+name,'result':str((directory/'result.json').resolve()),'sha256':sha(directory/'result.json'),'browserPlayback':False})
 with tarfile.open(a.runtime) as archive:runtime_manifest=json.load(archive.extractfile('package/release-manifest.json'))
 record.update(runtime=base['runtime'],source=base['source'],build=base['build'],npmPack=base['npmPack'])
 if base.get('engineReuse'):record['engineReuse']=base['engineReuse']
 for name,directory in [('clean-source-consumers',a.baseline_verification),('public-quality',a.quality_verification),('injected-units',a.units)]:
  r=read(directory);assert r['passed'],name
  if name!='clean-source-consumers':assert r['archiveSHA256']==runtime_hash,name
  if name=='injected-units':
   assert r['tests']==r['pass'] and r['tests']>=126 and not r['fail'] and not r['cancelled'] and not r['skipped']
   assert r['driverSHA256']==sources['experiment/unit-suite.py']
   for file,digest in r['harnesses'].items():assert sources['experiment/'+file]==digest,file
  record['gates'].append({'name':name,'result':str((directory/'result.json').resolve()),'sha256':sha(directory/'result.json')})
 expected={}
 for group,formats in [('discovery',['dash']),('live-edge',['hls','dash']),('timeline',['hls','dash']),('rolling-hls',['hls']),('rolling-dash',['dash']),('endurance',['hls','dash'])]:
  for format in formats:
   for browser in ['chrome','firefox']:
    for mode in ['hybrid','software']:expected[f'{group}-{format}-{browser}-{mode}']=1
 for browser in ['chrome','firefox']:
  for name,count in [('discontinuity',2),('subtitles',2),('public-api',4),('component',4),('abr',4),('audio-relay',4),('network',10),('container-errors',4),('integrated-seek',4),('large',4),('delayed',4)]:expected[name+'-'+browser]=count
 assert len(expected)==58
 found={}
 for directory in a.matrix:
  matrix=read(directory);assert matrix['passed'] and matrix['archiveSHA256']==runtime_hash
  assert sha(directory/'driver.py')==matrix['driverSHA256']==sources['experiment/qualify-streaming.py']
  for job in matrix['jobs']:
   name=job['name'];assert name in expected and name not in found and job['passed'] and job['exit']==0,name
   file=directory/name/'result.json';assert sha(file)==job['resultSHA256'] and sha(directory/(name+'.log'))==job['logSHA256']
   wrapper=json.loads(file.read_text());result=wrapper['browser'] if isinstance(wrapper.get('browser'),dict) else wrapper
   actual=directory/name/'browser' if result is not wrapper else directory/name
   assert result['passed'] and result['browserClosed'] and result['archiveSHA256']==runtime_hash,name
   assert result['family']==job['environment']['BROWSER'] and len(result['cases'])==expected[name],name
   assert all(c['passed'] and c['remainingWorkers']==0 for c in result['cases']),name
   harness=result.get('harnessSHA256',result.get('testHarnessSHA256'));assert sha(actual/'harness.mjs')==harness,name
   assert harness in sources.values(),name+' harness missing from source companion'
   for asset,entry in runtime_manifest['files'].items():assert sha(actual/'extracted/package'/asset)==entry['sha256'],(name,asset)
   overrides=result.get('overrides',{})
   assert not overrides or set(overrides)=={'web/filter-retained-engine-worker.js','web/software-full-engine-worker.js','web/retained-video.js'},name
   for asset,digest in overrides.items():assert sha(actual/'overrides'/asset)==digest,(name,asset)
   if job['group']=='discovery':
    assert wrapper['expiredDiscoveryRequests']==0
    c=result['cases'][0];assert c['initial']['diagnostics']['backend']['probeLifetime']['creates']==1
    assert c['initial']['diagnostics']['backend']['probeLifetime']==c['final']['diagnostics']['backend']['probeLifetime']
    assert c['final']['state']['quality']['presentedId']==c['final']['state']['quality']['qualities'][1]['id']
    assert c['final']['audio']['rms']>.001 and not c['final']['errors']
   if job['group']=='timeline':
    c=result['cases'][0];assert c['finished']['state']['streamType']=='vod' and c['ended']['state']['status']=='ended'
    assert c['finalWindowRecovery']['diagnostics']['backend']['streamingRecovery']['reason']=='expired-pause'
   if job['group']=='endurance':
    c=result['cases'][0];assert c['seconds']>=300 and len(c['switches'])>=15 and c['initial']['lifetime']==c['final']['lifetime']
    assert c['initial']['lifetime']['creates']==1 and c['maxDrawGapSeconds']<1
    assert 0<c['drawBatchPeak']<=128
    assert all(abs(s['avsync'])<.2 and s['io']['identityRecords']<=256 and not s['errors'] for s in c['samples'])
    assert all(not s.get('decoder') or s['decoder']['errors']==c['initial']['decoder']['errors'] for s in c['samples'])
    assert c['decoderHealth']['samples']==len(c['samples']) and c['decoderHealth']['unhealthySamples']==sum(not s['adaptation']['decoderHealthy'] for s in c['samples'])
   found[name]={'result':str(file.resolve()),'sha256':sha(file),'cases':len(result['cases'])}
  record['gates'].append({'name':'streaming-matrix','result':str((directory/'result.json').resolve()),'sha256':sha(directory/'result.json')})
 assert set(found)==set(expected),sorted(set(expected)-set(found))
 record['streaming']=found;record['passed']=True
except Exception as error:record['error']=repr(error)
(out/'result.json').write_text(json.dumps(record,indent=2)+'\n')
if record['passed']:(out/'SHA256SUMS').write_text(f'{runtime_hash}  {a.runtime.name}\n{source_hash}  {a.source.name}\n')
print(json.dumps({k:v for k,v in record.items() if k not in ['build','streaming']},indent=2));raise SystemExit(0 if record['passed'] else 1)
