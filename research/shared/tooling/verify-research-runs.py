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
for p in js:
 out=subprocess.run(['node','--check',str(p)],capture_output=True,text=True)
 if out.returncode:failures.append({'path':str(p),'failure':out.stderr})
result={'verified_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'new_run_manifests':len(manifests),'distinct_artifacts':len(checked),'python_syntax_checked':len(py),'node_syntax_checked':len(js),'failures':failures,'passed':not failures,'scope':'Run manifest identity and harness syntax; no new media execution, quality or performance qualification.'}
print(json.dumps(result,indent=2));raise SystemExit(bool(failures))
