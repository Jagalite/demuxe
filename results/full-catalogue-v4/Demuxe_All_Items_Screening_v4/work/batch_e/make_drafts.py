# SPDX-License-Identifier: Apache-2.0
import pathlib,json,hashlib,subprocess,importlib.util
P=pathlib.Path('results/full-catalogue-v4/Demuxe_All_Items_Screening_v4'); W=P/'work/batch_e'; A=json.loads((W/'assignment.json').read_text())
# Index: decision, owner ranges, specific current gap, bounded next experiment, stop/reopen trigger.
from data import D
spec=importlib.util.spec_from_file_location('screen',P/'tools/screening.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
sha=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();(W/'audits').mkdir(exist_ok=True);(W/'snapshots').mkdir(exist_ok=True)
used={}
for _,refs,_,_,_ in D.values():
 for ref in refs:
  f=ref.split(':')[0]
  if f not in used:
   b=pathlib.Path(f).read_bytes(); out=W/'snapshots'/f.replace('/','__');out.write_bytes(b);used[f]={'path':str(out.relative_to(P)),'sha256':hashlib.sha256(b).hexdigest()}
rows=[]
for i,x in enumerate(A):
 dec,refs,gap,nxt,reopen=D[i];s=x['definition_source'];d=m.template(x)
 d.update(decision=dec,evidence_level='SOURCE_REVIEW',source_checked=True,tested_profile='Source/current-owner first-pass audit: '+x['title']+'. No local runtime experiment executed for this record.',requested_output_contract=x['scope_contract'],current_code_paths=refs,observed_gap=gap,reason=gap,next_test=nxt,reopen_condition=reopen)
 d['hypothesis']=x['source_excerpt'].split('Smallest')[0]
 d['baseline'].update(git_sha=sha,artifact_manifest='work/batch_e/source-snapshot-manifest.json',plan='Current checkout behavior at cited owners; historical report bodies inform the comparison but their raw runs were not revalidated.')
 d['probe'].update(method='Read full definition section, cited related report sections and current owner code; compare proposal precondition against actual maintained ownership.',positive_control='Future experiment: '+nxt,negative_control=x['negative_control'],outcome=gap)
 d['measurement'].update(primary_metric=x['primary_metric'],worthwhile_change='An output-correct reduction or added requested capability at the identified boundary without expanding first-pass setup.',result='No timing or runtime result collected; source review only.',uncertainty='Historical component observations are not current complete-path validation; read code establishes applicability, not measured benefit.',excluded_costs=['No performance estimate made.'])
 d['limits']=['Source review only; no builds, browser runs, candidate edits or qualification performed.','Scope is this full stable key; reused legacy numbers retain separate decisions.','Historical reports are supplied source evidence; referenced raw archives were not inspected.']
 lines=['<!-- SPDX-License-Identifier: CC-BY-4.0 -->',f'# {x["key"]}',f'Decision draft: **{dec}**. Evidence: SOURCE_REVIEW.',f'Checkout HEAD: `{sha}`; current owner bytes preserved in the batch snapshot manifest.','## Hypothesis and requested output',d['hypothesis'],d['requested_output_contract'],'## Current opportunity and decision',gap,'## Cheapest baseline',d['baseline']['plan'],'## Bounded next test and falsifier',nxt,'Adverse control/falsifier: '+x['negative_control'],'## Reopen condition',reopen,'## Current code evidence']
 for ref in refs:
  f,rr=ref.split(':');lo,hi=map(int,rr.split('-'));body=pathlib.Path(f).read_text().splitlines();lines += [f'### `{ref}`',f'Snapshot: `{used[f]["path"]}` SHA256 `{used[f]["sha256"]}`','```',*[(str(n+1)+': '+body[n]) for n in range(lo-1,min(hi,len(body)))],'```']
 lines+=['## Full cited definition',f'`{s["path"]}:{s["line_start"]}-{s["line_end"]}` SHA256 `{s["sha256"]}`',*(P/s['path']).read_text().splitlines()[s['line_start']-1:s['line_end']]]
 for r in x['related_reports']:
  lines += ['## Related historical report read',f'`{r["path"]}:{r["line_start"]}-{r["line_end"]}` (raw report runs not independently inspected)',*(P/r['path']).read_text().splitlines()[r['line_start']-1:r['line_end']]]
 lines+=['## Limits',*d['limits']]
 audit=W/'audits'/(x['key']+'.md');audit.write_text('\n\n'.join(lines)+'\n');d['evidence']=[{'path':str(audit.relative_to(P)),'sha256':hashlib.sha256(audit.read_bytes()).hexdigest(),'note':'Per-key source/current-owner audit with exact definition and owner excerpts; no runtime claim.'},{'path':s['path'],'sha256':s['sha256'],'note':'Full definition source checked against supplied catalogue identity.'}];rows.append(d)
(W/'source-snapshot-manifest.json').write_text(json.dumps({'git_sha':sha,'files':used},indent=2)+'\n')
(W/'decisions.json').write_text(json.dumps(rows,indent=2)+'\n');print('Wrote',len(rows),'drafts',len(used),'owner snapshots')
