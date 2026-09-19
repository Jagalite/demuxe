#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Verify exact-archive quality evidence; does not replace source/build/release verification."""
import argparse,hashlib,json,math,tarfile
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--archive',required=True,type=Path);p.add_argument('--evidence',required=True,type=Path,help='JSON map of suite names to result directories');p.add_argument('--output',required=True,type=Path);a=p.parse_args()
sha=lambda data:hashlib.sha256(data).hexdigest()
def measured_worker(text,filename,kind):
 def once(before,after):
  nonlocal text
  assert text.count(before)==1,(filename,before)
  text=text.replace(before,after,1)
 if filename=='web/retained-video.js':
  once('  context.drawImage(frame,','  globalThis.probeFrame={width:frame.displayWidth,height:frame.displayHeight,pts:frame.timestamp/1e6};if(globalThis.probeDraws?.length<10000)probeDraws.push({wall:performance.timeOrigin+performance.now(),pts:frame.timestamp/1e6,kind:"retained-frame"});\n  context.drawImage(frame,')
 else:
  prefix='const probeLifetime={id:crypto.randomUUID(),creates:0,destroys:0};globalThis.probeDraws=[];\n'
  if kind=='audio-relay':prefix='self.addEventListener("message",({data})=>{if(data.type==="probe-audio-stall"){const until=performance.now()+750;while(performance.now()<until){};}});\n'+prefix
  text=prefix+text
  once('const result = engine._web_create(data.sampleRate);','probeLifetime.creates++;const result = engine._web_create(data.sampleRate);')
  once('engine?._web_destroy();','probeLifetime.destroys++;engine?._web_destroy();')
  text=text.replace("post({type:'log',message})","(console.log('native:',message),post({type:'log',message}))")
  text=text.replace('context.putImageData(frameImage, 0, 0);','context.putImageData(frameImage, 0, 0);if(probeDraws.length<10000)probeDraws.push({wall:performance.timeOrigin+performance.now(),position,kind:"software-clock-estimate"});',1)
  tail='.splice(0)' if kind=='abr' else ''
  once("type:'diagnostics', data:{","type:'diagnostics', data:{probeLifetime:{...probeLifetime},probeThreads:{running:engine.PThread.runningWorkers.length,unused:engine.PThread.unusedWorkers.length},probeFrame:globalThis.probeFrame,probeDraws:globalThis.probeDraws"+tail+",")
 return text.encode()

archive_hash=sha(a.archive.read_bytes());suite_map=json.loads(a.evidence.read_text());expected={kind+'-'+browser for kind in ['public-api','component','abr','audio-relay'] for browser in ['chrome','firefox']}
a.output.mkdir();result={'scope':__doc__,'archiveSHA256':archive_hash,'passed':False,'releaseQualified':False,'suites':[]}
try:
 assert set(suite_map)==expected,'Require both browsers for every suite'
 for name in sorted(expected):
  directory=Path(suite_map[name]).resolve();data=(directory/'result.json').read_bytes();r=json.loads(data);kind,browser=name.rsplit('-',1)
  assert r['passed'] and r['browserClosed'] and r['family']==browser,name
  assert r['archiveSHA256']==archive_hash,name+' tested different archive bytes'
  assert sha((directory/'harness.mjs').read_bytes())==r['harnessSHA256'],name+' harness correspondence'
  assert len(r['cases'])==4 and {c['name'] for c in r['cases']}=={'hybrid:hls','hybrid:dash','software:hls','software:dash'},name
  assert set(r['overrides'])=={'web/filter-retained-engine-worker.js','web/software-full-engine-worker.js','web/retained-video.js'}
  for filename,digest in r['overrides'].items():
   assert filename in {'web/filter-retained-engine-worker.js','web/software-full-engine-worker.js','web/retained-video.js'},name+' unexpected runtime override'
   overridden=(directory/'overrides'/filename).read_bytes()
   assert sha(overridden)==digest,name+' override correspondence'
   with tarfile.open(a.archive)as archive:
    expected_bytes=measured_worker(archive.extractfile('package/'+filename).read().decode(),filename,kind)
   assert overridden==expected_bytes,name+' unapproved playback implementation override'
  for c in r['cases']:
   assert c['passed'] and c['remainingWorkers']==0,(name,c['name'])
   if kind in ['public-api','component']:
    assert c['playingSamples'] and all(type(s.get('avsync')) in (int,float) and math.isfinite(s['avsync']) for s in c['playingSamples'])
    lifetime=c['initial']['diagnostics']['backend']['probeLifetime'];assert lifetime['creates']==1 and lifetime['destroys']==0
    assert len(c['switches'])==3
    for target,switch in zip([2,1,0],c['switches']):
     after=switch['after'];assert after['diagnostics']['backend']['probeLifetime']==lifetime
     assert after['diagnostics']['backend']['quality']['presented']==target
    assert c['sourceReplacement']['code']=='INVALID_ARGUMENT' and c['sourceReplacement']['old']!=c['sourceReplacement']['current']
    assert c['publicQuality']['capability']['availability']=='available'
    assert c['continuity']['maxDrawGap']<.5 and c['continuity']['underruns']==0 and c['continuity']['maxReportedAVSync']<.2
    if kind=='component':assert c['escapeFocus']=='settings-toggle' and c['component']['qualityHidden'] and c['component']['qualityDisabled']
   elif kind=='abr':
    assert c['samples'] and all(type(s.get('avsync')) in (int,float) and math.isfinite(s['avsync']) for s in c['samples'])
    assert r['fixture']['durationSeconds']>=120 and r['sampleThroughSeconds']>=114
    assert r['networkPhases']==[{'start':0,'bitsPerSecond':12000000},{'start':30,'bitsPerSecond':2000000},{'start':60,'bitsPerSecond':8000000}]
    assert c['initial']['lifetime']==c['final']['lifetime'] and c['initial']['lifetime']['creates']==1 and c['final']['lifetime']['destroys']==0
    fast,slow,recovery=c['presentedByPhase'];assert 2 in fast and any(0<=i<2 for i in slow) and 2 in recovery
    assert c['final']['adaptation']['acceptedSamples']>=3
    assert c['continuity']['maxDrawGap']<.5 and c['continuity']['underruns']==0 and c['continuity']['maxReportedAVSync']<.2
    assert c['manualAfter']['adaptation']['policy']['mode']=='manual' and c['manualAfter']['quality']['presented']==0 and c['manualAfter']['quality']['request']==c['manual']['quality']['request']
   else:
    assert c['before']['lifetime']==c['after']['lifetime'] and c['before']['lifetime']['creates']==1 and c['before']['lifetime']['destroys']==0
    assert c['during']['audio']['mediaFrames']-c['before']['audio']['mediaFrames']>16000
    assert c['after']['audio']['underruns']==c['before']['audio']['underruns'] and not c['after']['errors']
  result['suites'].append({'name':name,'directory':str(directory),'resultSHA256':sha(data),'harnessSHA256':r['harnessSHA256'],'overrides':r['overrides'],'scope':r['scope'],'browser':r['browser']})
 result['passed']=True
except Exception as error:
 result['error']=repr(error)
finally:
 (a.output/'result.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2));raise SystemExit(0 if result['passed'] else 1)
