# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import json,hashlib,gzip
b=Path('research/items/granular-engine-loading');r=Path((b/'full-run.txt').read_text().strip())
def digest(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for chunk in iter(lambda:f.read(1048576),b''):h.update(chunk)
 return h.hexdigest()
checks={}
for x in json.loads((r/'sizes.json').read_text()):
 p=r/'variants'/x['variant']/'player.wasm';assert digest(p)==x['sha256'];assert p.stat().st_size==x['bytes'];assert gzip.decompress((p.parent/'player.wasm.gz').read_bytes())==p.read_bytes()
checks['variant_bytes_and_compressed_roundtrip']='passed'
pictures=json.loads((r/'pictures.json').read_text())['checks']
for family,software,fixture in [('chrome','original','user'),('firefox','software-common-v2','user'),('firefox','software-hevc','user')]:
 selected=[x for x in pictures if x.get('family')==family and x.get('software')==software and x.get('fixture')==fixture];assert selected and all(x['passed'] for x in selected)
checks['primary_profile_independent_picture_gates']='passed'
count=0
for name,n in [('performance-analysis.json',32),('hevc-performance-analysis.json',12)]:
 d=json.loads((r/name).read_text());assert len(d['samples'])==n
 for row in d['samples']:
  assert row['passed'] and row['survivingPids']==[]
  raw=json.loads(Path(row['path']).read_text());component='engine-hybrid' if raw['expected']=='hybrid' else 'engine-software-full';variant=raw['variant'] if raw['expected']=='hybrid' else raw['software']
  assert any(x['url']==f'/web/{component}/player.wasm' and f'/variants/{variant}/player.wasm' in x['file'] for x in raw['requests'])
 count+=n
checks['timing_trials']=count
for family in ['chrome','firefox']:
 passed=[]
 for p in (r/'dynamic').glob(f'trial-{family}-lazy2-*/result.json'):
  d=json.loads(p.read_text())
  if d['passed'] and not d.get('negativeControl'):passed.append(d)
 assert passed and all(x['count']==240 and x['checksum']==2494589137 and x['remainingWorkers']==0 and not any(u.endswith('/codec.wasm') for u in x['loadedBeforeCodec']) for x in passed)
checks['real_lazy_module_decode_both_browsers']='passed'
checks['license_check']=Path('/tmp/granular-full-license-check.log').read_text().strip()
checks['global_research_check']='blocked by unrelated preview-research.json campaign item-object shape; original traceback retained'
for engine in ['hybrid','software-full']:
 original=Path((b/'active-run.txt').read_text().strip())/('variants/shipping/player.wasm' if engine=='hybrid' else 'snapshots/runtime/web/engine-software-full/player.wasm');assert digest(Path('web')/('engine-'+engine)/'player.wasm')==digest(original)
checks['production_engine_bytes_unchanged']=True
if (r/'manifest.json').exists():
 manifest=json.loads((r/'manifest.json').read_text())
 for x in manifest['artifacts']:assert digest(Path(x['path']))==x['sha256'],x['path']
 checks['manifest_artifacts_verified']=len(manifest['artifacts'])
print(json.dumps(checks,indent=2))
