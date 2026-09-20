# SPDX-License-Identifier: Apache-2.0
"""Refresh current whole-player results while preserving the original assessed cohort."""
import json,pathlib,collections,datetime
root=pathlib.Path(__file__).resolve().parents[3];p=root/'research/campaigns/whole-player-tier-classification.json';x=json.loads(p.read_text())
statusmap={'measured_lab_benefit':'completed_measured_lab_benefit','correctness_failed':'completed_correctness_failed','benefit_gate_failed':'completed_benefit_gate_failed','deferred_integration_not_prioritized':'deferred_integration_not_prioritized','deferred_prerequisite':'deferred_prerequisite'}
current=collections.Counter()
for row in x['results']:
 j=json.loads((root/'research/items'/row['key']/'item.json').read_text());d=j['current_decision'];d=d.get('record',d);row['current_disposition']=d.get('disposition',d.get('decision',d.get('state')));current[row['current_disposition']]+=1
 for stage in ['correctness','performance']:
  row['research_'+stage+'_status']=j['stages'][stage]['status'];row['research_'+stage+'_basis']=j['stages'][stage]['basis']
 row['research_next_action']=j.get('next_action');row['research_evidence']=d.get('evidence',row.get('research_evidence',[]))
 q=j.get('whole_player_qualification')
 if q:
  row['whole_player_qualification']=q
  if q.get('status') in statusmap:
   row['queue_status']=statusmap[q['status']];row['next_measurement_prerequisite']=j.get('next_action');row['assessment_reason']=d.get('reason',row['assessment_reason'])
  row['production_qualification']='Not production-qualified by this campaign; shipping automatic admission unchanged.'
x['updated_at_utc']=datetime.datetime.now(datetime.timezone.utc).isoformat();x['counts']=dict(collections.Counter(r['queue_status'] for r in x['results']));x['current_cohort_dispositions']=dict(current);x['scope']='Original148-pursue selection cohort, all assessed. Current canonical decisions can change after actual whole-player qualification; original membership remains stable. Measured positives, correctness failures, failed benefit gates and deferred integration are separate. Other assessed mechanisms retain specific workload/capability/prerequisite decisions. No blanket whole-player or production qualification.'
p.write_text(json.dumps(x,indent=2)+'\n')
bykey={r['key']:r for r in x['results']};priority=[bykey[k] for k in x['priority_order']];done=[r for r in priority if r['queue_status'].startswith('completed_')]
lines=['<!-- SPDX-License-Identifier: CC-BY-4.0 -->','','# Whole-player tier assessment and results','',x['scope'],'',f"Original cohort: **{len(x['items'])}**. Current dispositions: "+', '.join(f'**{n} {s}**' for s,n in sorted(current.items()))+'.', '',f'**{len(done)} of {len(priority)} prioritized candidates** have completed actual-player qualification outcomes. Deferred integration is not an experimental negative. Earlier component savings remain historical and must not be substituted for whole-player results.','', 'Exact CPU, latency and memory metrics and limitations are retained in each item and the [machine-readable assessment](whole-player-tier-classification.json). No production routing changes were made. Browser-process CPU excludes server and OS media-service CPU unless separately reported; summed RSS can double-count shared pages. Latency-emulation results are not real-WAN measurements. Shared route gains must not be added across related items.','','## Prioritized outcomes','','| Screen order | Item | Intended opportunity | Tested tier scope | Current outcome | Next action / scope |','|---:|---|---|---|---|---|']
qualified=['## Qualified benefits','']
for r in priority:
 q=r.get('whole_player_qualification',{})
 if q.get('status')!='measured_lab_benefit':continue
 if 'oneCorePercent' in q.get('metrics',{}):metric=f"{-q['metrics']['oneCorePercent']:.2f}% lower steady Chrome CPU"
 elif 'medianSavingPercent' in q.get('benefit_gate',{}):metric=f"{q['benefit_gate']['medianSavingPercent']:.2f}% lower player lifecycle latency, index construction included"
 else:metric='Declared scoped benefit gate passed; see item metrics'
 qualified.append(f"- [{r['key'].split('.')[0]}](../items/{r['key']}/README.md): **{metric}**. Tested scope: {q.get('tier_effect','read item')}.")
qualified+=['','ASS also increased main-thread task duration by35.69%; CPU reductions are not energy measurements. WebM indexing is the bounded server-assisted video-only profile. These gains qualify further pursuit at the stated scope, not broad production admission.','']
position=lines.index('## Prioritized outcomes');lines[position:position]=qualified
friendly={'completed_measured_lab_benefit':'Benefit gate passed','completed_correctness_failed':'Fidelity gate failed','completed_benefit_gate_failed':'Benefit threshold not met','deferred_integration_not_prioritized':'Deferred: integration cost'}
clean=lambda s:str(s or '').replace('|','/').replace('\n',' ').replace('max8/p994','max 8 / p99 4').replace('maximum114,p9944','maximum 114, p99 44')
for n,r in enumerate(priority,1):lines.append(f"| {n} | [{r['key'].split('.')[0]}](../items/{r['key']}/README.md) | {clean(', '.join(r['intended_tier_effects']))} | {clean(r.get('whole_player_qualification',{}).get('tier_effect','Not executed'))} | {friendly.get(r['queue_status'],r['queue_status'])} | {clean(r['next_measurement_prerequisite'])} |")
lines+=['','## Assessment categories','']
for s,n in sorted(x['counts'].items()):lines.append(f'- {s}: **{n}**')
lines+=['','## All assessed records','','Capability-only, specialized-workload and deferred integration entries are relevance assessments, not claims of measured full-player savings. Per-item evidence remains authoritative.','','| Item | Current decision | Research performance | Whole-player queue | Assessment |','|---|---|---|---|---|']
for r in x['results']:lines.append(f"| [{r['key']}](../items/{r['key']}/README.md) | {r['current_disposition']} | {r['research_performance_status']} | {r['queue_status']} | {clean(r['assessment_reason'])} |")
p.with_suffix('.md').write_text('\n'.join(lines)+'\n');print(json.dumps({'cohort':len(x['items']),'priority':len(priority),'actual_player_outcomes':len(done),'current_dispositions':dict(current)},indent=2))
