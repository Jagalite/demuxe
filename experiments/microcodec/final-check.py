#!/usr/bin/env python3
import pathlib,json,hashlib
r=pathlib.Path.cwd();out=r/'results/microcodec';load=lambda n:json.loads((out/n).read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
sizes={x['name']:x for x in load('sizes.json')}
for row in load('runtime-audit.json'):
 assert row['sha256']==sizes[row['name']]['wasm']['sha256'],row['name']
for name,row in sizes.items():
 base=r/('web/engine-'+name.removeprefix('current-')+'/remux' if name.startswith('current-') else 'build/microcodec/'+name+'/module')
 for key,ext in [('wasm','.wasm'),('glue','.mjs')]:assert sha(pathlib.Path(str(base)+ext))==row[key]['sha256']
assert len(load('correctness.json'))==11
assert all(x['exact'] and x['metadataExact'] for x in load('correctness.json'))
assert len(load('encoders.json'))==8 and all(x['roundtripExact'] for x in load('encoders.json'))
ref=(out/'current-adaptation.f32').read_bytes();assert len(ref)==144384*2*4
comparison={name:{'exact':(out/(name+'.f32')).read_bytes()==ref,'bytes':len((out/(name+'.f32')).read_bytes())} for name in ['minimized-adaptation','decomposed-remux']}
assert all(x['exact'] for x in comparison.values())
controls={'mp4AacMatchesInstalled':(out/'mp4.f32').read_bytes()==(out/'current-mp4.f32').read_bytes()};assert controls['mp4AacMatchesInstalled']
for x in load('remux-correctness.json'):
 assert not x['error'],x
 for kind,v in x['streams'].items():assert v['exact'] or (x['name']=='mp4' and kind=='audio'),x
(out/'comparison-correctness.json').write_text(json.dumps({'repair':comparison,'controls':controls},indent=2))
print('PASS: artifact identity, runtime audit, 11 decoder comparisons, 8 encoder roundtrips, 3-arm PCM identity, remux controls')
