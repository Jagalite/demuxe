# SPDX-License-Identifier: Apache-2.0
"""Recover exact historical source blobs without rewriting old manifests or live source."""
import pathlib,sys,json,hashlib,subprocess,datetime
ROOT=pathlib.Path(__file__).resolve().parents[3]
input_path=pathlib.Path(sys.argv[1]);out=pathlib.Path(sys.argv[2]);revision=sys.argv[3]
assert not out.exists(),'New audit directory required';out.mkdir(parents=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT)
def rel(p):return str(p.relative_to(ROOT))
raw=input_path.read_bytes();(out/'verification-input.json').write_bytes(raw);audit=json.loads(raw);head=git('rev-parse','HEAD').decode().strip();mappings=[];sources={};manifests={}
for failure in audit['failures']:
 if failure['failure']!='hash mismatch':continue
 live=pathlib.Path(failure['path']);path=rel(live);manifest=ROOT/failure['manifest'];m=json.loads(manifest.read_bytes());entry=next(a for a in m['artifacts']if a['path']in[path,str(live)])
 expected=git('show',revision+':'+path);assert sha(expected)==failure['expected'];assert len(expected)==entry['bytes']
 blob=git('rev-parse',revision+':'+path).decode().strip()
 assert git('cat-file','blob',blob)==expected
 snapshot=out/'snapshots'/path;snapshot.parent.mkdir(parents=True,exist_ok=True)
 if snapshot.exists():assert snapshot.read_bytes()==expected
 else:snapshot.write_bytes(expected)
 license=expected.splitlines()[0].decode().split('SPDX-License-Identifier: ',1)[1]
 current=live.read_bytes();head_bytes=git('show',head+':'+path);assert current==head_bytes,'unexpected uncommitted source drift'
 changes=git('log','--format=%H %s',revision+'..'+head,'--',path).decode().splitlines()
 sources[path]={'historical_commit':revision,'historical_blob':blob,'snapshot':rel(snapshot),'sha256':sha(expected),'bytes':len(expected),'license_from_preserved_spdx':license,'current_head':head,'current_sha256':sha(current),'current_bytes':len(current),'current_equals_head':True,'source_changing_commits_since_historical_snapshot':changes}
 manifests[rel(manifest)]=sha(manifest.read_bytes())
 mappings.append({'old_manifest':rel(manifest),'old_manifest_sha256':sha(manifest.read_bytes()),'original_artifact_path':entry['path'],'expected_sha256':entry['sha256'],'expected_bytes':entry['bytes'],'historical_commit':revision,'historical_blob':blob,'snapshot':rel(snapshot),'snapshot_sha256':sha(expected),'snapshot_bytes':len(expected),'classification':'committed_production_source_drift_with_byte_exact_historical_recovery','old_manifest_license':entry.get('license'),'preserved_source_spdx':license,'license_metadata_discrepancy':entry.get('license')!=license})
# Every mismatch is covered by an exact same manifest/path mapping; no generic exception.
covered={(a['old_manifest'],str(ROOT/a['original_artifact_path'])if not pathlib.Path(a['original_artifact_path']).is_absolute()else a['original_artifact_path'])for a in mappings}
assert all((f['manifest'],f['path'])in covered and f['failure']in['hash mismatch','size mismatch']for f in audit['failures'])
result={'schema':1,'audited_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'input_verification':rel(out/'verification-input.json'),'input_sha256':sha(raw),'input_failure_rows':len(audit['failures']),'affected_manifest_count':len(manifests),'artifact_references':len(mappings),'unique_source_files':len(sources),'all_expected_hashes_and_sizes_recovered':True,'historical_manifests_unchanged':all(sha((ROOT/p).read_bytes())==h for p,h in manifests.items()),'source_bytes_unchanged':all(sha((ROOT/p).read_bytes())==v['current_sha256']for p,v in sources.items()),'sources':sources,'mappings':mappings,'scope':'Exact historical artifact identity recovery. Matching commit is not asserted as original experiment execution revision. No replay or requalification of media findings. Original verifier result remains a failure against drifting live paths; no old manifest or production byte was changed.'}
(out/'mapping.json').write_text(json.dumps(result,indent=2)+'\n')
for name in ['GPL-3.0-or-later.txt','Apache-2.0.txt']:(out/name).write_bytes((ROOT/'LICENSES'/name).read_bytes())
print(json.dumps({k:v for k,v in result.items()if k not in ['sources','mappings']},indent=2))
