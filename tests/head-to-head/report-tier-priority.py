# SPDX-License-Identifier: Apache-2.0
"""Summarize completed whole-player tier trials without changing recorded decisions."""
import argparse,hashlib,json,statistics
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('runs',nargs='+');parser.add_argument('--output',required=True);args=parser.parse_args()
rows=[]
for name in args.runs:
 p=Path(name);manifest=json.loads((p/'manifest.json').read_text())
 for rel,digest in manifest['sha256'].items():
  assert hashlib.sha256((p/rel).read_bytes()).hexdigest()==digest, str(p/rel)
 d=json.loads((p/'result.json').read_text());row={'case':d['caseID'],'evidence':str(p),'execution_passed':d['passed'],'error':d.get('error'),'benefit_gate':d.get('benefitGate'),'rounds':len(d['rounds']),'limits':d['limits']}
 if d['passed']:
  row['paired_metrics']={metric:{'median_delta_percent':statistics.median(pair['metrics'][metric]['deltaPercent'] for pair in d['pairs']),'all_deltas_percent':[pair['metrics'][metric]['deltaPercent'] for pair in d['pairs']]} for metric in d['pairs'][0]['metrics']}
  row['seek_medians_ms']={v:statistics.median(s['wallMs'] for r in d['rounds'] if r['variant']==v for s in r['seeks']) for v in ['baseline','candidate']}
  row['player_lifecycle_observed_cpu_seconds']={v:statistics.median(r['playerLifecycle']['observedCPUSeconds'] for r in d['rounds'] if r['variant']==v) for v in ['baseline','candidate']}
  row['observed_routes']={v:sorted({r['open']['state']['route'] for r in d['rounds'] if r['variant']==v}) for v in ['baseline','candidate']}
  row['process_exit_passed']=all(not r['browserTeardown']['remainingProcessIDs'] for r in d['rounds'])
 rows.append(row)
out=Path(args.output);out.mkdir(parents=True,exist_ok=False)
(out/'summary.json').write_text(json.dumps({'scope':'Whole-player browser-process measurements on frozen authored-fixture routes; explicit lab substitutions, not current-production or release qualification.','results':rows},indent=2)+'\n')
lines=['<!-- SPDX-License-Identifier: CC-BY-4.0 -->','','# Prioritized whole-player tier measurements','','Five alternating fresh-browser pairs per completed case, with matched prior output/lifecycle qualification. Positive primary gate: all five steady CPU pairs improve and median saving is at least 10%. Runtime and fixture hashes are frozen. Lower tier number is not assumed to mean better performance.','','| Case | Observed route | CPU delta | Startup delta | Peak summed RSS delta | Main-thread task delta | Primary gate |','|---|---|---:|---:|---:|---:|---|']
for r in rows:
 if not r['execution_passed']:lines.append(f"| {r['case']} | Failed execution | — | — | — | — | {r['error']} |");continue
 m=r['paired_metrics'];route=' / '.join(r['observed_routes']['baseline'])+' → '+' / '.join(r['observed_routes']['candidate']);lines.append(f"| {r['case']} | {route} | {m['oneCorePercent']['median_delta_percent']:.1f}% | {m['startupWallMs']['median_delta_percent']:.1f}% | {m['peakSummedRssKiB']['median_delta_percent']:.1f}% | {m['mainThreadTaskSeconds']['median_delta_percent']:.1f}% | {'Pass' if r['benefit_gate']['passed'] else 'Fail'} |")
lines+=['','Negative percentage means lower cost. CPU covers all CDP-listed Chrome processes, not server or external media services. RSS is summed process RSS and may double-count shared pages. Startup ends after API play and 0.5 seconds of progression, not physical first sound or photon. Browser launch is outside player lifecycle measurements. Five pairs on a shared host are a bounded confirmation, not a population confidence guarantee.','','The baseline and candidate observe the same player API, media, timeline and required subtitle behavior. An explicit Native A/V lab route can still include a JS extractor or independent libass renderer. The benefit belongs to the whole substitution; do not multiply or attribute it independently to every related research item. Production extraction cancellation/range budgets, broader subtitle support and deployment remain separate gates.','','## Evidence','']
for r in rows:lines.append(f"- `{r['case']}`: `{r['evidence']}/result.json`; all manifest hashes verified.")
(out/'REPORT.md').write_text('\n'.join(lines)+'\n');print(json.dumps(rows,indent=2))
