# SPDX-License-Identifier: Apache-2.0
"""Audit the canonical cohort, append-only histories and newly captured evidence."""
import pathlib,json,hashlib,subprocess,sys,datetime
root=pathlib.Path.cwd();campaign=json.loads((root/'research/campaigns/whole-player-tier-classification.json').read_text());keys=campaign['priority_order'];cache={};checked=[]
def sha(p):
 p=p.resolve()
 if p not in cache:
  with p.open('rb') as f:cache[p]=hashlib.file_digest(f,'sha256').hexdigest()
 return cache[p]
parents=[root/'research/shared/runs']+[root/'research/items'/k/'evidence' for k in keys]
for base in parents:
 for folder in base.iterdir():
  if not folder.is_dir() or not folder.name.startswith('20260920T') or folder.name<'20260920T120000':continue
  p=folder/'manifest.json'
  if not p.exists():continue
  m=json.loads(p.read_text())
  if 'artifacts' not in m:continue
  for a in m['artifacts']:
   q=root/a['path'];assert sha(q)==a['sha256'],str(q)
   if 'bytes'in a:assert q.stat().st_size==a['bytes'],str(q)
  checked.append({'manifest':str(p.relative_to(root)),'artifacts':len(m['artifacts'])})
histories=[]
for key in keys:
 h=pathlib.Path('research/items')/key/'history.jsonl';current=(root/h).read_bytes();old=subprocess.check_output(['git','show','HEAD:'+str(h)]);assert current.startswith(old),key
 item=json.loads((root/h.parent/'item.json').read_text());assert item['current_decision']==json.loads(current.splitlines()[-1]),key
 q=item.get('whole_player_qualification',{});assert q.get('status'),key
 if q['status']in['correctness_failed','benefit_gate_failed','measured_lab_benefit']:assert q.get('production_admission_changed')is False,key
 histories.append({'key':key,'prefix_preserved':True,'current_matches_latest_event':True,'whole_player_status':q['status']})
p=root/'research/items/R023.fuse-qualified-video-effects-into-one-gpu-presentation-pass/evidence/20260920T134029Z-whole-player-fused-effects/runtime-provenance.json';runtime=[]
for r in json.loads(p.read_text())['runtime']:
 assert sha(root/r['base_path'])==r['historical_sha256'],r['base_path']
 for c in r['copies']:assert sha(root/c['path'])==r['historical_sha256'],c['path']
 runtime.append({'base_path':r['base_path'],'copies_verified':len(r['copies']),'sha256':r['historical_sha256']})
assert len(campaign['items'])==148 and len(set(campaign['items']))==148
assert len(keys)==11
for profile in ['policy-player-performance-02','policy-player-latency-performance-02']:
 r=json.loads((root/'results/head-to-head'/profile/'result.json').read_text());assert r['passed']
 if 'latency' in profile:
  assert len(r['trials'])==10 and len(r['pairs'])==5
  for t in r['trials']:
   a,b=t['open']['state']['video'],t['active']['state']['video'];assert b['dropped']-a['dropped']<=max(2,(b['total']-a['total'])*.01)
result={'passed':True,'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'manifests':checked,'unique_artifact_paths_hashed':len(cache),'histories':histories,'r023_bulk_runtime_revalidated_after_timing':runtime,'scope':'Evidence byte identity, cohort consistency, immutable history prefixes and declared results; not a new playback or performance experiment.'}
pathlib.Path(sys.argv[1]).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'passed':True,'manifests':len(checked),'unique_artifact_paths_hashed':len(cache),'histories':len(histories),'runtime_entries':len(runtime)}))
