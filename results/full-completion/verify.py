# SPDX-License-Identifier: Apache-2.0
"""Read-only validation of captured campaign evidence. No playback or builds."""
from pathlib import Path
import json,hashlib
root=Path(__file__).resolve().parent;repo=root.parent.parent
manifest=json.loads((root/'provenance.json').read_text())
for name,digest in manifest['sha256'].items():
 p=repo/name
 assert p.is_file(),f'Missing {name}'
 assert hashlib.sha256(p.read_bytes()).hexdigest()==digest,f'Changed evidence: {name}'
rows=json.loads((root/'decisions-latest.json').read_text());assert len(rows)==425 and len({x['key'] for x in rows})==425
inventory=json.loads((root/'probe-inventory.json').read_text())
for probe in inventory['probes']:
 for file in probe['canonical_results']:
  r=json.loads((root/file).read_text())
  if probe['outcome']=='SETUP_BLOCKED':
   assert 'Failed to fetch dynamically imported module' in r['error'] and '/web/engine-ass/subtitles.mjs' in r['error']
  elif file.startswith('continuity/native-delivery'):
   assert r['completed']
   assert all(c['cleanup'] and (c['name']=='hls-bad-boundary' or (c['ended'] and not c['failed'] and c['av']>0)) for c in r['cases'])
   if file.endswith('-long.json'):assert r['ongoingPursue'] is True
   else:assert r['hlsPursue'] and r['badHlsRejected'] and not r['ongoingPursue']
  elif file=='r95/result.json':
   assert r['completed'] and r['equivalent'] and r['adverseDetected']
   assert all(c['ended'] and c['seeked'] and not c['error'] for c in r['cases'])
  elif probe.get('case_predicate'):
   assert r.get('completed') and all(x.get('passed') for x in r['cases']),file
  else:assert r.get('passed') is True,file
remote=json.loads((root/'remote-index/result.json').read_text())
assert len({x['output']['pixelHash'] for x in remote['cases'] if x['target']==20})==1
lace=json.loads((root/'webm-boundaries/lacing-result.json').read_text())
assert lace['cases'][0]['eof'] and lace['cases'][0]['tones']>3
assert lace['cases'][1]['mediaError']==lace['cases'][2]['mediaError']
assert 'Lacing 1 is not supported' in lace['cases'][1]['mediaError']['message']
pol=json.loads((root/'remux-policies/result.json').read_text())
assert all(x['fastSeek']['playbackRate']==4 and x['changedIdentity']['rejected'] and x['cleanup'] for x in pol['cases'])
for r in rows:
 paths=r['evidence'] if isinstance(r['evidence'],list) else [r['evidence']]
 assert all((root/p).is_file() for p in paths),r['key']
print(f"Verified {len(manifest['sha256'])} hashed files, 425 decision identities, canonical probe predicates, source-change controls, matching remote target pixels, and exact lacing failure predicate.")
