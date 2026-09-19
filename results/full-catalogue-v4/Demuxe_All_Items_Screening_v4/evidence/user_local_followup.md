<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Follow-up: work available without the missing reports

This follow-up reopens incomplete attribution and oracle work from the initial screen. It does not turn every deferred design into an implementation project. The guide explicitly stops broad subsystems at E3; those are engineering/design dependencies, not missing-report dependencies.

## R74: a longer workload changed the initial decision

The 30-second S24 fixture passed exact decoded PCM, packet identity, timestamp and sample-count checks with the observer. The serialized reference measured 44.843 ms in allocation/validation/copy/FIFO work out of 661.495 ms of remux worker elapsed time (6.779%). This crosses the original effort gate, unlike the short fixtures. The earlier low-opportunity decision must therefore not be generalized.

`scripts/local-screening-packed.py` creates a copied-source candidate under `build/local-screening/adaptation-packed`. It bypasses the temporary converted frame only for packed lossless PCM, checks every S24 sample before FIFO publication, retains the real copying FIFO, and leaves planar and Opus branches unchanged. Production native sources and served adaptation assets remain unchanged.

Five correctness cases pass, including 30-second S24, selected S16 mono, B frames, nonzero starts, offsets and unequal ends. Nine lifecycle cases pass, including authenticated ranges, seeks, cancellation, changed source identity, stale generation and denied precision/layout. An injected overwrite of decoded source storage immediately after FIFO write preserves exact output in S16/S24 controls. Injected nonzero S24 low bits reject before any `moof` media publication. These are actual Wasm/browser controls, not a replacement FIFO model.

The candidate and all control sources, patches and artifact hashes are retained with their build manifests. Cost sampling follows the separately recorded 5% complete-playback CPU gate in `screen-contracts.md`; stage timing alone is not a whole-player benefit.

Cost decision: **NO_CURRENT_OPPORTUNITY for the declared complete-playback CPU gate.** After one warmup per variant, seven alternating pairs measured 5.1514 seconds mean reference CPU versus 5.1929 seconds candidate CPU for each full 30-second playback operation. Aggregate saving is −0.80% (the candidate used slightly more CPU); the approximate paired bootstrap 95% interval is −2.97% to +1.23%, below the predeclared 5% worthwhile threshold. This does not prove zero benefit on every workload. It does not justify promoting the candidate or starting survivor qualification for this profile. The long reference/candidate captured output is also byte-identical.

Raw complete operations, process snapshots, stage counters and artifact hashes: `runs/r74-packed-cost-01/result.json`; paired analysis: `summary.json`. An already-defunct zero-CPU child disappeared in one measured snapshot; it could accrue no further CPU. A 0.02-second updater exit occurred only in an excluded warmup. Processes that start and exit entirely between snapshots and external system audio/driver services remain accounting limits. The observer was present in both variants; an observer-free deployment benefit was not established.

## R01 and R27: attribution completed, integration not justified by these measurements

`module-separated-01` splits response headers, body consumption, compilation and instance construction. Pure compilation was 3.26–6.87 ms per instance in this diagnostic run. A separate research page in `module-reuse-01` constructs one immutable module from the exact engine asset and clones it to ten fresh instances across cold, repeated and concurrent players. All present video and terminate their workers; the module is populated once, including its initial fetch/body/compile cost. Mutable engines remain independent. This is a research harness, not a production cache service, and the two runs are not a statistically paired startup benchmark.

The R01 observer also times application File reads. Repeated sequential startups reread 277,304 identical requested range bytes (including overlap within those ranges); those repeated reads totaled 1.455–3.185 ms across the two runs. Concurrent consumers are recorded separately and include overlapping waits. This is an upper bound on avoided read wall time before charging storage, copies, authority and handoff costs, not physical disk I/O or a measured cache saving. A source-owned cache/handoff remains E3 work; no generic broker or URL-keyed cache is introduced.

R27 now also has paired startup evidence. The decomposed-hook comparison suggested a signal, so it was followed by the proper unchanged maintained worker baseline. After one warmup per variant and seven alternating pairs, the maintained-reference suite averaged 1,220.90 ms versus 1,048.70 ms for the prototype, a 14.10% aggregate reduction. The approximate paired 95% bootstrap interval is 9.89–18.39%, crossing the predeclared 10% worthwhile threshold: **INCONCLUSIVE**, not promotion. Both sets remain saved; only `runs/module-maintained-pairs-01/summary.json` controls this decision. This measures a cold/repeated/concurrent startup suite, including cold module population, not sustained playback CPU. The local development server uses `Cache-Control: no-store`; deployment HTTP caching and other engines may change marginal value.

The additional authority check abandons one preparation while a second consumer waits for the same paused compilation, then resumes compilation: the abandoned open rejects, the live consumer presents, and the population count stays one. A subsequent source change presents from the actual replacement File with fresh mutable engines. All workers terminate. These controls do not establish remote credential rotation, all asset-change/failure cases, retained native compiled-code memory or cross-browser qualification.

R27 remains inconclusive for net whole-player value, with a functional bounded prototype available. Production reuse still needs exact engine identity, failure/retention ownership and applicable concurrency/cancellation coverage. The bounded initial screen is complete; confirmation across representative assets/cache conditions and a production hash-identified ownership design would be a distinct next phase.

## R48: caption boundary discrepancy explained

`caption-boundary-02` compares Demuxe's browser-owned track with an independent plain HTML video/track on the same exact media and VTT. All ten comparisons match, including backward seeks and times immediately around the boundary. On this Chrome build, the cue ending at 2.100 seconds remains active at exactly 2.100 and disappears at 2.100001. The earlier exclusive-end JavaScript oracle therefore disagreed with the browser's native behavior; this is not evidence of a Demuxe cue virtualization defect. No cross-browser or standards-conformance claim follows.

The first boundary diagnostic also exposed the maintained 1 ms same-position seek tolerance in `src/internal/native-player.ts`: micro-seeks were intentionally skipped. The corrected diagnostic moves away before each target, records actual media time and compares independent browser behavior. Both runs are preserved. Interior overlap/long-cue and 10,001-cue checks remain valid. Virtualizing the browser-owned complete cue list still requires an explicit API/lifecycle design.

## Baseline movie rejection: exact cause established

The previous audit incorrectly attributed FFmpeg -68 to `rm_start`. The saved worker stack line 41 is actually `_rm_step`. The input's first video DTS is −7.933333 seconds, while format origin is zero. The maintained path adds one second of mux bias; its existing guard rejects the remaining negative DTS.

A copied-source diagnostic changes only the rejection message and confirms `stream=0 shifted_dts=-208000 shift=-30000 origin=0 time_base=1/30000`, i.e. −6.933333 seconds after bias. See `runs/preroll-diagnostic-01/result.json` and its exact diagnostic source/manifest. This is an intentional unsupported deep-preroll boundary, not an unexplained R47 failure. Supporting it would require a broader timeline/edit/preroll contract; the guard and source bytes were preserved. Native direct already passes this source.

## Larger delivery/allocation workload

The previously captured 26-second 1080p movie trace was also assessed for R04/R34/R42. It contains 137 native emissions, 53 batches, 7,123,719 bytes and at most nine pieces per batch. Maximum first-emission-to-flush delay is 1.725 ms for the header and 0.320 ms for media; peak queue depth is one. These counters do not demonstrate useful waiting inside mux emission/batch formation or a trickle producer schedule. They do not measure every later browser scheduling delay. R47 leaves 6,485,429 gather bytes, so pooling is not made obsolete; however this trace has no GC/allocator-pressure evidence that justifies a new buffer-return protocol. Raw summary: `runs/follow-up/opportunity-summary.json`.

## Missing reports and remaining design boundaries

A broader filename search included `/Volumes/seed2/Projects`, `/Users/jagatranvo/Projects` and the attachment store. No matching R239–R246, R116–R131 or R268–R275 report file was found. macOS denied access to Downloads, Documents and Desktop; the search does not establish absence there. The earlier external connector was not signed in. No accessible report link has been established.

R242-A, R131, R274 and R272 remain identity-unresolved. R72/R73 still lack maintained preview services; the guide says not to build broad services just to complete a cheap screen. R01/R48 remain design-heavy, and R27 needs stronger net-value evidence before integration. These stops are distinct from the four missing-report gates. Full browser/device, required-subtitle and release qualification remain outside the existing local qualification claim.
