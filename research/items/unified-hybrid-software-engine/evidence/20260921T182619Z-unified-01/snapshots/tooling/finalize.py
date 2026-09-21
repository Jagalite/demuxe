# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import json,hashlib,datetime,shutil
b=Path('research/items/unified-hybrid-software-engine');o=Path((b/'active-run.txt').read_text().strip());now=datetime.datetime.now(datetime.timezone.utc).isoformat();performance=json.loads((o/'performance-analysis.json').read_text()) if (o/'performance-analysis.json').exists() else None
size=json.loads((o/'sizes.json').read_text());d={x['variant']:x for x in size};combined=d['baseline']['gzipBytes']+d['software-baseline']['gzipBytes'];saving=100*(1-d['unified']['gzipBytes']/combined)
report=f'''<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Unified Hybrid and Software engine

## Decision

Pursue a single full engine asset with selectable Hybrid and Software modes. The isolated player prototype works with a small mode-dependent mpv presentation adapter patch and JavaScript asset/cache changes. **No FFmpeg source, codec-registration or decoder-algorithm changes were needed.** Codec splitting, dynamic linking and shared live memory remain deferred.

This is an executed lab integration, not a shipping/default-route change. Production integration remains a separate maintained-source and packaging task.

## Size and implementation

| Engine | Raw bytes | gzip-6 bytes |
| --- | ---: | ---: |
| Existing full Hybrid | {d['baseline']['bytes']:,} | {d['baseline']['gzipBytes']:,} |
| Existing full Software | {d['software-baseline']['bytes']:,} | {d['software-baseline']['gzipBytes']:,} |
| Unified, used by both modes | {d['unified']['bytes']:,} | {d['unified']['gzipBytes']:,} |

Combined compressed engine bytes fall from **{combined:,} to {d['unified']['gzipBytes']:,} ({saving:.2f}% less)**. The unified binary is only 471 raw bytes / 344 gzip bytes larger than full Hybrid. Software-only users load about 2.31% more gzip bytes than the previous full Software engine. First use of one engine is therefore not inherently smaller or faster.

Hybrid already linked the full Software FFmpeg libraries. Its existing browser-decoder enable switch leaves normal mpv Software decoding active when disabled. The native patch adds 15 lines and replaces two in the existing retained VO adapter: skip retained-only subtitle/frame callbacks in Software, and clear ROTATE90 on a per-VO driver copy for Software so mpv applies its existing pixel rotation. Hybrid retains its presenter rotation. The original const driver is not mutated.

Two worker imports now target one engine-unified URL. The per-Player preparation cache coalesces Hybrid and Software requests to one fetch, one compilation and one WebAssembly.Module. On-demand opening initializes the same cache, allowing source replacement and fallback to reuse code even under HTTP no-store. Each mode still creates a fresh instance, heap, worker pool and presenter; recovery still reopens the source. No shared-memory or seamless-switching benefit is claimed.

See [integration.patch]({o.name}/integration.patch) in the run directory and tests/REVIEW.md for the implementation and production-port boundaries. The run contains the actual compiled candidate.

## Correctness

Chrome Hybrid and explicit Software, plus Firefox explicit Software, passed the user's HEVC file. H.264/AAC/ASS passed Chrome Hybrid/Software and Firefox Software. Verified 90-degree display-matrix fixtures passed Chrome Hybrid/Software and Firefox Software, including seek and subtitle checks. Successful trials include forward/backward seek, pause/resume, source replacement, audio progress, synthetic tone checks, and worker/process teardown. Automatic Chrome Hybrid trials injected a runtime failure and verified actual Software recovery with advancing audio.

All 22 completed picture comparisons passed the independent host-FFmpeg RGB oracle and inverted adverse control. Where a new-run matched baseline exists, candidate-to-baseline image MAE is exactly zero. Five of those comparisons are an initial nonrotated control generated while preparing the rotation fixture; actual rotation qualification uses only rotation90. This is bounded H.264/HEVC/rotation coverage, not all-codec, HDR, streaming or endurance qualification.

Every successful candidate trial asserts exactly one unified engine download and one engine compilation, and no old Hybrid/Software Wasm requests. All six accepted candidate prepare-all trials marked both modes ready after one engine request and compilation. Earlier focus-invalidated timing attempts remain excluded. Four separate cache contract controls cover concurrent requests, a shared HTTP failure, destroy during fetch, and a late compilation after destroy. The last must not repopulate the cache.

## Timing

'''
if performance:
 report+='Qualified paired runs use aggregate gzip Wasm bandwidth of 10 Mbps plus an 80 ms initial response delay. JS, fonts and the local media are not paced. Fresh browser profiles and HTTP no-store are used; OS caches are not flushed. Browser launch is excluded. Selection measures advancing media time, not exact first-photon latency.\n\n| Browser / scenario | Baseline median | Unified median | Reduction |\n| --- | ---: | ---: | ---: |\n'
 for row in performance['summary']:
  metric=('totalMs' if row['browser']=='firefox' else 'prepareMs') if row['stage']=='policy' else 'fallbackMs' if row['stage']=='recovery' else 'selectionMs';v=row['metrics'][metric];report+=f"| {row['browser']} / {row['stage']} / {row['network']} | {v['baselineMedian']/1000:.3f} s | {v['unifiedMedian']/1000:.3f} s | {v['reductionPercent']:.1f}% |\n"
 report+='\nFor Firefox policy rows, the metric is preparation start through playback progress, including any original 15-second preparation timeout and Software refetch; it is not completed all-engine preparation time. Chrome policy rows measure completed preparation. See FIREFOX-TIMEOUT-AMENDMENT.md and per-trial preparationStatuses.\n\nThe predeclared matrix contains 22 successful trials: three alternating pairs per browser for prepare-all, three Chrome recovery pairs, and one local first-use pair per browser. Local single pairs are regression screens, not reliable speedup estimates. performance-analysis.json preserves selection/preparation totals, paired ranges and transfer counts. The on-demand cache also changes fetch/compile scheduling compared with the baseline streaming instantiation path; the local single pairs check that combined implementation, not binary layout alone. Already-cached repeat visits are not measured. Small samples and a simulated network limit generalization; memory/CPU/power benefits are not established.\n'
else:
 report+='**The paired latency matrix is incomplete and no latency speedup is accepted.** An unrelated `experiments/mpv-subtitle-service/run.mjs` repeatedly launched competing Chrome windows, causing foreground PID checks to fail. Failed timing trials and partial orders are retained. A quiet-window retry was attempted; available successful isolated samples do not establish the declared paired comparison. Transfer-size and playback-correctness conclusions above remain supported. Resume the predeclared matrix in a new run when the host is available.\n'
if (o/'global-checks.json').exists():
 global_checks=json.loads((o/'global-checks.json').read_text());report+='\n## Repository checks\n\n'+''.join(f"- {r['command']}: exit {r['exit']}; see {r['log']}.\n" for r in global_checks)+'\nThe license failures are in the unrelated mpv-subtitle-service experiment and captures. Research verification was stopped after independently confirming the existing preview-research campaign schema blocker; see research-preflight-blocker.json. These repository-wide checks are separate from the run-specific playback, cache, binary and teardown validation. Unrelated failures are not repaired by this experiment.\n'
report+='''
## Preserved failures and limits

- An initial forced-Hybrid test incorrectly expected automatic fallback. The test was corrected to automatic mode; the failed original remains.
- The first rotate metadata command produced no display matrix. A new fixture uses the host FFmpeg display_rotation input option and its 90-degree matrix is explicitly verified. Original nonrotated files/results remain.
- Firefox foreground setup and competing Chrome runs caused rejected trials. Firefox focusing was made explicit before measurements; no failed foreground sample is used as a performance win.
- A Firefox baseline browser closed unexpectedly during repeat-open. Its cause remains unconfirmed; a diagnostic retry completed and exposed the preparation timeout/refetch path. The failed attempt remains outside the accepted pairs.\n- The first Node cache test counted an internal Node Response/undici Wasm compilation. Instrumentation was narrowed to the exact probe module, while independently asserting actual engine-fetch count.
- The prototype edits only the frozen lab runtime's generated JavaScript. Production work must port cache logic to maintained TypeScript, add a unified build/deployment target and immutable asset identity, and represent shared preparation progress/bytes once. Current logical alias reports contain duplicate byte values; measured transfer uses unique HTTP requests.
- Shared-fetch failure and cancellation are tested. Firefox default-timeout behavior is measured as recorded above; comprehensive preparation timeout/retry policy is not qualified. Multi-Player/tab reuse, experimental YUV and broader release behavior are outside scope.

## Evidence and reproduction

The run PLAN.md predates builds and measurements. build-commands.json, change-summary.json, sizes.json, pictures.json, cache-contract.json, per-trial result.json files, validation.json and manifest.json capture inputs, execution and acceptance. tests/REPRODUCE.md documents replay in a new run. Historical granular-engine-loading runs were not modified. The user's MKV remains outside the repository. Original notices and fixture provenance are described in NOTICES.md.
'''
# Run report links must remain local; canonical copy gets a relative run prefix.
report=report.replace(f'({o.name}/integration.patch)','(integration.patch)');(o/'REPORT.md').write_text(report);(b/'REPORT.md').write_text(report.replace('(integration.patch)',f'(evidence/{o.name}/integration.patch)'))
reason='Unified full engine shares download/compilation with 49.43 percent combined gzip savings and qualified bounded playback; '+('paired preparation/recovery timings completed.' if performance else 'latency comparison remains environment-blocked.')
decision={'at':now,'state':'pursue','key':b.name,'run':str(o),'reason':reason,'evidence_level':'actual-route correctness and binary-size measurement'+(' with paired timing' if performance else ''),'integration':'lab only','latency_qualified':bool(performance)};(o/'decision.json').write_text(json.dumps(decision,indent=2));(b/'history.jsonl').write_text(json.dumps(decision)+'\n');item=json.loads((b/'item.json').read_text());item['definition']['reporting_amendment']=str(o/'FIREFOX-TIMEOUT-AMENDMENT.md');item['current_decision']={'record':decision};item['next_action']='Port the small unified engine/cache changes to maintained source and qualify production packaging; codec modules remain deferred.' if performance else 'Complete the predeclared paired latency matrix on a quiet host, then port the small unified engine/cache changes to maintained source.'
for k in item['stages']:
 item['stages'][k]={'status':'blocked' if k=='performance' and not performance else 'passed','basis':reason if k in ['performance','results','decision'] else item['stages'][k]['basis'],'evidence':[f'evidence/{o.name}/REPORT.md',f'evidence/{o.name}/validation.json']}
(b/'item.json').write_text(json.dumps(item,indent=2)+'\n');(b/'README.md').write_text('<!-- SPDX-License-Identifier: CC-BY-4.0 -->\n# Unified full Hybrid and Software engine\n\n'+reason+'\n\nSee [REPORT.md](REPORT.md), [NOTICES.md](NOTICES.md), and [reproduction](tests/REPRODUCE.md). Shipping integration has not started; the executed prototype is isolated under evidence.\n')
shutil.copytree(b/'tests',o/'snapshots/tooling');shutil.copy2(b/'NOTICES.md',o/'NOTICES.md')
artifacts=[]
for p in sorted(o.rglob('*')):
 if p.is_file() and p.name!='manifest.json':artifacts.append({'path':str(p),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
manifest={'schema':1,'key':b.name,'sealedAt':now,'artifacts':artifacts,'source_references':json.loads((o/'input-references.json').read_text()),'licenses':'Per-file retained SPDX and NOTICES.md; generated data CC-BY-4.0; user media/derived frames NOASSERTION; dependency notices retained.'};(o/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');pins=[o/n for n in ['PLAN.md','REPORT.md','decision.json','validation.json','manifest.json']];(b/'evidence/index.json').write_text(json.dumps({'schema':1,'key':b.name,'artifacts':[{'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in pins]},indent=2)+'\n');print(json.dumps({'run':str(o),'artifacts':len(artifacts),'performanceComplete':bool(performance)},indent=2))
