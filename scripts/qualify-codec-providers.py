#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Seal exact codec provider evidence only after all maintained gates pass."""
import argparse,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--core',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--apply',action='store_true');a=p.parse_args()
def sha(b):return hashlib.sha256(b).hexdigest()
def read(name):return json.loads((ROOT/name).read_bytes())
core=json.loads(a.core.read_bytes());core_digest=sha(Path(core['archive']).read_bytes());assert core_digest==core['archiveSHA256']
config=read('licensing/provider-packages.json');inventory=json.loads(Path(core['record']).read_bytes())
for source in config['playerCoreSources']:assert inventory['sources'][source]['sha256']==sha((ROOT/source).read_bytes()),'Core was built from different source: '+source
small={'truehd-stereo','truehd-51','mlp-stereo','mlp-51','truehd-71','dtshd-71'}
large={'avc-bframes-truehd','large-truehd','multi-lossless','hevc-truehd','hevc-dtshd'}
gates=[]
def gate(name,ids=None,exact_core=False):
 r=read(name);assert r.get('passed') is True,'Unsuccessful gate: '+name
 assert not r.get('cleanupError') and not r.get('error'),'Gate retained an error: '+name
 if ids is not None:assert {c['id'] for c in r['cases']}==ids,'Incomplete case matrix: '+name
 if exact_core:assert r.get('setup',r)['archives'][0]['archiveSHA256']==core_digest,'Gate used a different core: '+name
 gates.append({'path':name,'sha256':sha((ROOT/name).read_bytes()),'scope':r.get('scope','Exact codec provider production gate')})
for runtime,family in [('asyncify','chrome'),('asyncify','firefox'),('jspi','chrome')]:
 base='results/media-components/production-preparation/'
 gate(base+'full-'+runtime+'-'+family+'.json',small)
 gate(base+'player-'+runtime+'-'+family+'.json',small,True)
 gate(base+'real-player-'+runtime+'-'+family+'.json',large,True)
 gate(base+'soak-'+runtime+'-'+family+'.json',{'truehd','dtshd'},True)
for family in ['chrome','firefox']:
 base='results/media-components/production-audio/'
 gate(base+'installed-'+family+'.json',exact_core=True)
 gate(base+'player-'+family+'.json',small,True)
 gate('results/media-components/production-preparation/faults-asyncify-'+family+'.json')
 gate('results/media-components/production-preparation/runtime-regressions/'+family+'.json',exact_core=True)
for name in ['host-recipes','stream']:
 gate('results/media-components/production-audio/'+name+'.json')
for runtime in ['asyncify','jspi']:
 gate('results/media-components/production-audio/performance-'+runtime+'.json')
 gate('results/media-components/production-preparation/performance-'+runtime+'.json')
gate('results/media-components/production-preparation/file-sizes.json')
gate('results/media-components/production-preparation/source-gates.json')
gate('results/media-components/production-preparation/release-guards.json')
for source,digest in read('results/media-components/production-preparation/release-guards.json')['sourceSHA256'].items():
 assert sha((ROOT/source).read_bytes())==digest,'Release guard changed after verification: '+source
assert read('results/media-components/production-preparation/source-gates.json')['sourceSHA256']=={source:sha((ROOT/source).read_bytes())for source in config['playerCoreSources']},'Source contracts changed after verification'
qualification=read('licensing/provider-runtime-qualification.json');packages=[]
for target in ['audio-ac3','audio-dts','audio-common','audio-flac','audio-truehd-mlp','audio-dts-hd','container']+['ffmpeg-'+profile+'-'+runtime for profile in ['truehd-mlp','dts-hd'] for runtime in ['asyncify','jspi']]:
 folder='provider-'+target+'-production-'+('09' if target=='container' else '02' if target.startswith('audio-') else '01')
 assembly=read('build/media-components/'+folder+'/assembly.json');digest=sha(Path(assembly['archive']).read_bytes());assert digest==assembly.get('sha256',assembly.get('archiveSHA256'))
 id='ts-container' if target=='container' else target
 assert qualification['providers'][id]==assembly['implementationIdentity'],'Registry/package identity mismatch: '+id
 packages.append({'target':target,**assembly})
snapshot=ROOT/'results/media-components/production-preparation'/('qualified-'+core_digest[:12]+'-'+sha(json.dumps(gates,sort_keys=True).encode())[:12])
for item in gates:
 original=item['path'];target=snapshot/Path(original).relative_to('results/media-components');data=(ROOT/original).read_bytes();assert sha(data)==item['sha256'],'Evidence changed while sealing: '+original
 target.parent.mkdir(parents=True,exist_ok=True)
 if target.exists():assert target.read_bytes()==data,'Immutable evidence snapshot differs'
 else:target.write_bytes(data)
 item['path']=str(target.relative_to(ROOT));item['originalPath']=original
report={'schema':1,'passed':True,'scope':'Initial production codec contracts: 48 kHz TrueHD stereo/5.1/7.1, MLP stereo/5.1, DTS-HD MA 7.1; finite existing plans and browser support; atomic mpv unchanged','coreArchiveSHA256':core_digest,'evidenceSnapshot':str(snapshot.relative_to(ROOT)),'packages':packages,'gates':gates,'publication':'not committed, pushed or published'}
a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(report,indent=2)+'\n')
if a.apply:
 qualification['status']='qualified'
 qualification['evidence']=[e for e in qualification['evidence'] if not e['path'].startswith(('results/media-components/production-audio/','results/media-components/production-preparation/'))]+gates
 config=read('licensing/provider-packages.json');qualification['sources']={source:sha((ROOT/source).read_bytes())for source in config['playerCoreSources']}
 qualification['limits']=['Existing source, planAdmission, runtime, track and subtitle gates remain mandatory','Initial codec contracts and exact browser/package evidence are defined in docs/CODEC-SPLIT-PRODUCTION.md','Chrome JSPI/Asyncify and Firefox Asyncify codec preparation qualified; Firefox JSPI absence remains a capability rejection','No Atmos object, arbitrary codec/rate/layout, physical-device or broad media corpus claim','No performance ranking; download-size savings are distinct from startup, CPU and RAM','mpv remains atomic; subtitle/fallback compositions retain their existing requirements']
 (ROOT/'licensing/provider-runtime-qualification.json').write_text(json.dumps(qualification,indent=2)+'\n')
print(json.dumps({'passed':True,'gates':len(gates),'packages':len(packages),'coreArchiveSHA256':core_digest,'applied':a.apply},indent=2))
