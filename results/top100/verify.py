# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import ast,json,hashlib,subprocess,collections,datetime
root=Path(__file__).resolve().parent;repo=root.parents[1];campaign=json.loads((root/'campaign.json').read_text());rows={r['key']:r for r in map(json.loads,(root/'decisions.jsonl').read_text().splitlines())};failures=[];evidence={}
if len(rows)!=100 or set(rows)!={r['key'] for r in campaign['items']}:failures.append('catalogue coverage')
if sorted(r['rank'] for r in rows.values())!=list(range(1,101)):failures.append('original rank coverage')
for row in rows.values():
 for entry in row['evidence']:
  path=(root/entry['path']).resolve()
  if not path.is_file():failures.append(f"missing evidence: {row['key']} {entry['path']}");continue
  digest=hashlib.sha256(path.read_bytes()).hexdigest()
  if digest!=entry['sha256']:failures.append(f"changed evidence: {row['key']} {entry['path']}")
  evidence[entry['path']]={'sha256':digest,'bytes':path.stat().st_size}
current_head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip();current_diff=hashlib.sha256(subprocess.check_output(['git','diff','--binary'],cwd=repo)).hexdigest()
if subprocess.run(['git','merge-base','--is-ancestor',campaign['base_git'],current_head],cwd=repo).returncode:failures.append('campaign base is not an ancestor of checkout HEAD')
if current_diff!=campaign['base_diff_sha256']:failures.append('preexisting tracked changes changed')
python_files=sorted(root.rglob('*.py'));node_files=sorted((repo/'tests').glob('top100-*.mjs'));source_manifest={}
for path in python_files:
 try:ast.parse(path.read_text())
 except Exception as e:failures.append(f'{path}: {e}')
for path in node_files:
 r=subprocess.run(['node','--check',str(path)],capture_output=True,text=True)
 if r.returncode:failures.append(f'{path}: {r.stderr}')
for path in python_files+node_files:
 source_manifest[str(path.relative_to(repo))]=hashlib.sha256(path.read_bytes()).hexdigest()
for name in ['build/top100-ass/runtime/subtitles.mjs','build/top100-ass/runtime/subtitles.wasm','build/top100-jspi/runtime/remux.mjs','build/top100-jspi/runtime/remux.wasm','build/top100-lossless/runtime/lossless.mjs','build/top100-lossless/runtime/lossless.wasm','native/remux/remux.c','web/audio-worklet.js','sources.lock.json']:
 path=repo/name
 if not path.is_file():failures.append('missing runtime/source: '+name)
 else:source_manifest[name]=hashlib.sha256(path.read_bytes()).hexdigest()
result={'verified_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'items':len(rows),'original_ranks_exact':True,'current_head':current_head,'tracked_diff_sha256':current_diff,'tracked_diff_unchanged':current_diff==campaign['base_diff_sha256'],'evidence_paths':len(evidence),'python_syntax_checked':len(python_files),'node_harness_syntax_checked':len(node_files),'failures':failures,'passed':not failures,'scope':'Coverage, referenced evidence byte identity, executable syntax and preserved checkout boundary. This does not turn expected-negative or blocked experiments into passes.'}
(root/'evidence-manifest.json').write_text(json.dumps(evidence,indent=2)+'\n');(root/'source-runtime-manifest.json').write_text(json.dumps(source_manifest,indent=2)+'\n');(root/'verification.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2));raise SystemExit(bool(failures))
