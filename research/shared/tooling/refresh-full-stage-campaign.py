# SPDX-License-Identifier: Apache-2.0
"""Refresh campaign membership and append-only advancement references, not verdicts."""
from pathlib import Path
import json,subprocess,datetime
root=Path(__file__).resolve().parents[3];file=root/'research/campaigns/2026-09-19-full-stage-completion.json';campaign=json.loads(file.read_text());base=campaign['baseline_revision'];homes=sorted((root/'research/items').glob('*/history.jsonl'));refs=[base+':'+str(p.relative_to(root)) for p in homes];proc=subprocess.Popen(['git','cat-file','--batch'],cwd=root,stdin=subprocess.PIPE,stdout=subprocess.PIPE);raw,_=proc.communicate(('\n'.join(refs)+'\n').encode());at=0;advanced=[]
for p in homes:
 end=raw.index(b'\n',at);header=raw[at:end].split();size=int(header[-1]);old=raw[end+1:end+1+size];at=end+1+size+1;current=p.read_bytes()
 if not current.startswith(old):raise ValueError('History prefix changed: '+str(p))
 suffix=current[len(old):];events=[json.loads(line) for line in suffix.splitlines() if line.strip()]
 if not events:continue
 runs=set();flags=[]
 for event in events:
  record=event.get('record',event);runs.update(record.get('run_ids',event.get('run_ids',[])));flag=record.get('new_media_execution',event.get('new_media_execution'))
  if flag is not None:flags.append(flag)
 advanced.append({'key':p.parent.name,'new_decision_records':len(events),'run_ids':sorted(runs),'new_execution_claimed':any(flags) if flags else 'not_declared_in_event'})
campaign['updated_at_utc']=datetime.datetime.now(datetime.timezone.utc).isoformat();campaign['items']=[p.parent.name for p in homes];campaign['advanced_items']=advanced;campaign['scope']='All425 catalogue items. Membership includes the complete catalogue; advanced_items records appended decisions so far, not experiment count or full completion. Canonical item homes own current verdicts.';file.write_text(json.dumps(campaign,indent=2)+'\n')
file.with_suffix('.md').write_text(f'''<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Full-stage campaign in progress

User endpoint: complete applicable research stages for viable ideas; resolve practical setup gaps. Production integration is separate.

Updated {campaign['updated_at_utc']}. {len(advanced)} item homes have appended decisions since `{base[:7]}`. Every baseline history prefix was verified intact. This is an item-advancement count, not an experiment count and not all425 complete.

[Live aggregate](../STATUS.md) · [Every ranked item](../ITEMS.md) · [Membership and run references](2026-09-19-full-stage-completion.json)

The initial state had44 pending correctness and101 pending performance gates. Actual experiments now include independent output controls, owner/lifecycle checks and predeclared cost comparisons. Negative experiments end their tested profile; missing definitions and unavailable independent references remain distinct blockers. Capability-only cards can conclude without a speed benchmark when the original source makes no cost claim.
''');print(json.dumps({'advanced_item_homes':len(advanced),'history_prefixes_preserved':len(homes),'scope':'Advancement count, not experiments or full completion.'}))
