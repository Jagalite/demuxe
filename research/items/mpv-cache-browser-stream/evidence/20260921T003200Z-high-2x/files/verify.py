# SPDX-License-Identifier: Apache-2.0
"""Verify frozen media/runtime/evidence hashes; does not run media tests."""
from pathlib import Path
import json,hashlib,sys
home=Path(__file__).resolve().parent.parent
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()
errors=[];verified=0;resolved=[]
def check(p,want):
 global verified
 if not p.is_file() or sha(p)!=want:errors.append(str(p))
 else:verified+=1
for name,want in json.loads((home/'runtime/manifest.json').read_text()).items():check(home/'runtime'/name,want)
fixtures=json.loads((home/'fixtures/manifest.json').read_text())
check(home/'fixtures/bbb_sunflower_1080p_30fps_normal.mp4',fixtures['sourceSHA256'])
for f in fixtures['fixtures'].values():
 check(Path(f['path']),f['sha256'])
 for ref in f['references'].values():check(Path(ref['path']),ref['sha256'])
for manifest in sorted((home/'evidence').glob('*/manifest.json')):
 m=json.loads(manifest.read_text())
 for name,want in m.get('sha256',{}).items():
  p=manifest.parent/name
  if name.startswith('../../tests/') and (not p.is_file() or sha(p)!=want):
   # Original runs recorded mutable source paths. Later snapshots preserve the
   # exact historical bytes without changing the original manifests.
   candidates=[manifest.parent/'files'/Path(name).name,home/'evidence/harness-snapshots'/want/Path(name).name]
   p=next((x for x in candidates if x.is_file() and sha(x)==want),p)
   resolved.append({'manifest':str(manifest.relative_to(home)),'source':name,'resolved':str(p.relative_to(home))})
  check(p,want)
print(json.dumps({'passed':not errors,'verifiedFiles':verified,'historicalSourceResolutions':resolved,'errors':errors},indent=2))
sys.exit(bool(errors))
