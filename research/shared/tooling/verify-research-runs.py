# SPDX-License-Identifier: Apache-2.0
"""Read-only verification of new run manifests, plus harness syntax (no media reruns)."""
from pathlib import Path
import json,hashlib,ast,subprocess,datetime
root=Path(__file__).resolve().parents[3];failures=[];checked={};manifests=[]
for p in sorted((root/'research').rglob('manifest.json')):
 if 'templates' in p.parts:continue
 j=json.loads(p.read_text());manifests.append(str(p.relative_to(root)))
 for a in j.get('artifacts',j.get('assets',[])):
  path=Path(a['path']);path=path if path.is_absolute() else root/path
  if not path.is_file():failures.append({'manifest':str(p.relative_to(root)),'path':str(path),'failure':'missing'});continue
  current=hashlib.sha256(path.read_bytes()).hexdigest();checked[str(path)]={'sha256':current,'bytes':path.stat().st_size}
  if current!=a['sha256']:failures.append({'manifest':str(p.relative_to(root)),'path':str(path),'failure':'hash mismatch','expected':a['sha256'],'actual':current})
  if a.get('bytes') is not None and path.stat().st_size!=a['bytes']:failures.append({'manifest':str(p.relative_to(root)),'path':str(path),'failure':'size mismatch'})
py=list((root/'research/shared/tooling').rglob('*.py'))+list((root/'research/items').glob('*/tests/**/*.py'));js=list((root/'research/shared/tooling').rglob('*.mjs'))+list((root/'research/items').glob('*/tests/**/*.mjs'))
for p in py:
 try:ast.parse(p.read_text())
 except Exception as e:failures.append({'path':str(p),'failure':str(e)})
diagnostics={}
for classification in (root/'research/items').glob('*/evidence/*/diagnostic-sources.json'):
 for entry in json.loads(classification.read_text()).get('entries',[]):
  path=root/entry['path'];snapshot=root/entry['snapshot'];successor=root/entry['valid_successor']
  # Only immutable registered classifications with a byte-identical archived draft
  # and a separately checked valid successor can exempt draft syntax.
  identities=[(classification,None),(path,entry['sha256']),(snapshot,entry['snapshot_sha256']),(successor,entry['successor_sha256'])]
  valid=entry.get('role')=='non_executable_diagnostic' and entry.get('execution')=='rejected_before_module_evaluation' and entry['sha256']==entry['snapshot_sha256'] and successor in js and successor!=path
  valid=valid and all(str(f) in checked and (digest is None or checked[str(f)]['sha256']==digest) for f,digest in identities)
  if not valid:failures.append({'path':str(classification),'failure':'invalid or unregistered syntax diagnostic classification'})
  else:diagnostics[str(path)]=str(classification.relative_to(root))
for p in js:
 if str(p) in diagnostics:continue
 out=subprocess.run(['node','--check',str(p)],capture_output=True,text=True)
 if out.returncode:failures.append({'path':str(p),'failure':out.stderr})
result={'verified_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'new_run_manifests':len(manifests),'distinct_artifacts':len(checked),'python_syntax_checked':len(py),'node_syntax_checked':len(js)-len(diagnostics),'nonexecuted_syntax_diagnostics':diagnostics,'failures':failures,'passed':not failures,'scope':'Run manifest identity and harness syntax; no new media execution, quality or performance qualification.'}
print(json.dumps(result,indent=2));raise SystemExit(bool(failures))
