# SPDX-License-Identifier: Apache-2.0
"""Join exact hash-bound semantic annotations; never infer approval."""
import ast,json,re,subprocess,sys
from pathlib import Path
root=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path(__file__).resolve().parent.parent
out=Path(sys.argv[2]).resolve() if len(sys.argv)>2 else root/'docs/functional-core-audit'
annotation_path=Path(sys.argv[3]).resolve() if len(sys.argv)>3 else root/'docs/functional-core-audit/reviewed-annotations.json'
rows=json.loads((out/'mutable-fields.raw.json').read_text())
annotations={(r['file'],r['scope'],r['field']):r for r in json.loads(annotation_path.read_text())}
generated=json.loads(subprocess.check_output(['node','scripts/generated-runtime-files.mjs'],cwd=root,text=True))
supported={name.replace('web/generated/','src/')[:-3]+'.ts' for name in generated if name.endswith('.js')}
package=(root/'scripts/package-beta.py').read_text()
for match in re.finditer(r"for name in (\[[^\n]+\]):\n add\('web/'\+name\)",package):supported.update('web/'+name for name in ast.literal_eval(match.group(1)))
supported.add('web/yuv-presenter.js')
dormant={'web/webgpu/runtime.js','web/webgpu/mailbox-service.js','web/webgpu/presenter.js'}
for row in rows:
 file=row['file'];row['scopeCategory']='dormant-qualified-codec' if file in dormant else 'supported-runtime' if file in supported or file.startswith('web/private-mpv/') else 'historical-or-development'
 annotation=annotations.get((file,row['scope'],row['field']))
 if annotation:
  row.update({k:v for k,v in annotation.items() if k in ['classification','authority','bound','review','liveness','exception','reviewEvidence','explicitSourceReview']})
  row['reviewStatus']='reviewed' if annotation.get('sourceHash')==row['sourceHash'] else 'sourceChanged'
 else:row.update(reviewStatus='reviewPending',classification='unreviewed',authority=None,bound=None)
counts={}
for row in rows:
 key=row['scopeCategory']+':'+row['reviewStatus'];counts[key]=counts.get(key,0)+1
(out/'ownership-fields.json').write_text(json.dumps({'schema':2,'sourceRoot':'.','counts':counts,'entries':rows},indent=2)+'\n')
pending=[r for r in rows if r['scopeCategory']=='supported-runtime' and r['reviewStatus']!='reviewed']
(out/'supported-review-pending.json').write_text(json.dumps(pending,indent=2)+'\n')
print(json.dumps(counts,indent=2))
current=json.loads((out/'source-hashes.json').read_text())
reviewed=json.loads((annotation_path.parent/'reviewed-source-hashes.json').read_text())
changed=[{'file':file,'reviewedHash':reviewed.get(file),'currentHash':current.get(file)} for file in sorted(set(current)|set(reviewed)) if current.get(file)!=reviewed.get(file)]
(out/'source-review-pending.json').write_text(json.dumps(changed,indent=2)+'\n')
dynamic_annotations={(r['file'],r['line'],r['expression']):r for r in json.loads((annotation_path.parent/'reviewed-dynamic-writes.json').read_text())}
dynamic=[]
for row in json.loads((out/'dynamic-writes.raw.json').read_text()):
 annotation=dynamic_annotations.get((row['file'],row['line'],row['expression']))
 row['reviewStatus']='reviewPending' if annotation is None else 'sourceChanged' if annotation['sourceHash']!=row['sourceHash'] else annotation['reviewStatus']
 if annotation:row['review']=annotation['review']
 dynamic.append(row)
(out/'dynamic-writes.json').write_text(json.dumps(dynamic,indent=2)+'\n')
dynamic_pending=[r for r in dynamic if r['reviewStatus'] in ['reviewPending','sourceChanged']]
print(json.dumps({'changedSources':len(changed),'pendingDynamicWrites':len(dynamic_pending)}))
if pending or changed or dynamic_pending:sys.exit(1)
