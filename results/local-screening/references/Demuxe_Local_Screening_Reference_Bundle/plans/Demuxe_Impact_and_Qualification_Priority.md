# Demuxe: local testing ranked by impact and qualification effort

**Revision 2.0 · 18 September 2026 · Local-agent execution plan**

> **Optimize for useful, trustworthy decisions per unit of agent work—not for the biggest laboratory percentage, the newest R-number, or the shortest demonstration.**

This replaces the ordering in *Demuxe Ranked Local Testing Guide*, revision 1.0. It ranks bounded work packages by likely value to Demuxe **and the total work needed to judge them fairly**. It is not a claim that these candidates are production-qualified. No builds, playback tests, benchmarks, or repository edits were performed while preparing this revision.

## 1. Recommendation

First qualify the valuable paths Demuxe already implements. Then test localized changes against those working baselines. Defer new transport architectures, decoder internals, and exotic representations until they have both a concrete workload and an affordable correctness oracle.

**Recommended first decisions:**

1. Establish the real Native/direct/remux coverage and cost on the target laptop.
2. Qualify existing lossless audio adaptation and external Native ASS using matching optional assets.
3. Profile and, only where justified, test the packed-PCM staging bypass and application-side seek coalescing.
4. Investigate incremental mux delivery, charging the full worker/parser integration cost.
5. Re-rank subsequent work using measured route failures, stage costs, and representative media—not experimental hit rates.

The first three ranked entries are **qualification of existing functionality**, not three new inventions or automatically three new performance gains. Their value is establishing which expensive fallbacks can already be avoided and providing credible baselines for everything else.

## 2. What the ranking means

### Impact

Impact is conditional on the stated workload. No representative source-frequency dataset was supplied, so this document does not assign numerical adoption probabilities or predict percentage whole-player gains.

| Grade | Meaning |
|---|---|
| **I5 — route-changing** | Can avoid an expensive video fallback or preserve a required feature on an efficient route for a useful media class. |
| **I4 — substantial operation** | Can materially improve startup, seeking, preview work, memory, or sustained presentation on its target workload. |
| **I3 — useful, conditional** | Benefits a particular interaction, content family, or demonstrated bottleneck. |
| **I2 — narrow/component** | A smaller stage or specialized feature; whole-player benefit may be small. |
| **I1 — research infrastructure** | Knowledge/tooling value rather than an immediate playback improvement. |

An I5 deployment improvement is not necessarily an I5 CPU improvement. A preview optimization does not accelerate ordinary playback. An existing I5 route can have **zero incremental optimization gain** if Demuxe already selects it correctly.

### Agent coding/build burden

| Grade | Work needed before a fair comparison |
|---|---|
| **C0** | Existing runtime and tests; configure, run, inspect, and record evidence. |
| **C1** | Localized implementation or test instrumentation; no new subsystem. Native changes still require a matching rebuild. |
| **C2** | Bounded adapter/controller plus tests, fixtures, or worker integration. |
| **C3** | Several coupled boundaries, a new stateful path, or native build/profile changes with substantial regression work. |
| **C4** | New runtime architecture, codec/parser internals, transport integration, or specialized executor. |

### Qualification burden

| Grade | Work needed to make a favorable result trustworthy |
|---|---|
| **Q1** | Existing end-to-end path, established observer, narrow supported profile. |
| **Q2** | New correctness controls and lifecycle cases, but most harnesses and references already exist. |
| **Q3** | New output/transport/state oracle, interaction matrix, or substantial device-specific evidence. |
| **Q4** | Difficult asynchronous/stateful behavior, a broad fidelity surface, or hardware/long-session qualification that cannot be replaced by a small fixture. |

**Speed in the table means relative effort to a fair local end-to-end verdict**, assuming a healthy baseline and usable test machine. It includes source audit, fixture creation, implementation, native rebuilds, independent checks, debugging, and comparative runs. It is not an elapsed-time promise. Cross-device release qualification is additional.

A one-call API probe may reject an idea quickly. It does **not** make positive qualification fast. Conversely, a clean `ALREADY_IMPLEMENTED`, `BLOCKED`, or `NO_BENEFIT` outcome can save substantial work.

### Ordering rule

Prefer higher likely impact and broader relevant reach, then lower coding **and** qualification burden. Use prior evidence to reduce uncertainty, not to manufacture a probability. Dependencies override rank. Higher-cost candidates move up only when a real source class, user operation, or measured bottleneck justifies them.

Do not divide invented percentage speedups by guessed implementation hours. Re-estimate the effort after the first source audit.

## 3. Shared groundwork: mandatory, but not a ranked optimization

Complete this once and reuse it. Do not spend the first campaign building a general research platform.

- **Freeze the comparison:** record repository revision, local diff, dependency/toolchain locks, runtime hashes, optional assets, browser/OS/device and origin/isolation configuration. Current GitHub `main` was rechecked at `9abfd1b22300cf273fc0bd1a8290261281c8f3f3`. Recheck the local checkout independently. [C1]
- **Make the existing test harness trustworthy:** observe actual execution-plan IDs, selected tracks, frame/time identity, sample counts and required subtitles. Inject at least a stale-generation fault and a wrong-output fault. Reuse R192/R222-style checks; do not first build a generic proof engine or complete witness optimizer. Do not treat a hard-coded zero counter as independent evidence that decoding was avoided; check the actual path and compiled profile. [D1; C5]
- **Run the relevant unchanged baseline:** separate pre-existing failures from candidate regressions. Preserve the documented fallback, fidelity, source-authority and browser guards. [C2–C4]
- **Collect an initial real-media profile:** note which sources select Native, Hybrid or Software and why. A small held-out corpus is useful for prioritization, not a population prevalence estimate.

**Common release gates stay mandatory for every candidate:** seek, pause/resume, EOF/tails, cancellation, source replacement, teardown, bounded resources, and denied-profile fallback. Moving these outside the benefit ranking does not make them optional. A reproducible serious correctness/security defect preempts optimization work.

## 4. Ranked queue

The rank is the recommended **work order**, not a ranking of theoretical maximum speedups. “Fast” assumes the required baseline engines and optional assets already exist; otherwise add their build and validation cost first.

| Rank | Bounded task | Impact and reach | Coding | Qualification | Fair-verdict speed |
|---:|---|---|:---:|:---:|---|
| **1** | Qualify existing Native/direct/packet-copy paths | **I5**, supported video in real files; establishes current ceiling | C0–1 | Q1–2 | **Fast** |
| **2** | Qualify the already-admitted lossless audio path | **I5**, incompatible integer audio beside usable video | C0–1 | Q2 | **Fast–medium** with assets |
| **3** | Qualify existing external Native ASS + gain combinations | **I5** for subtitle users; **I3** otherwise | C0–1 | Q2 | **Fast–medium** with assets |
| **4** | Remove redundant packed-PCM staging, if material | **I2–3**, audio-preparation stage only | C1 + rebuild | Q2 | **Fast–medium** |
| **5** | Coalesce obsolete application seek/preview work | **I3**, rapid scrubbing/start-stop interaction | C1–2 | Q2 | **Fast–medium** |
| **6** | Deliver emitted mux bytes incrementally | **I4**, remux startup/refill; conditional on actual withholding | C2–3 | Q3 | **Medium** |
| **7** | Remove one measured duplicate startup/read operation | **I3–4**, repeated open/probe/fallback/seek | C2–3 | Q3 | **Medium**, audit can close early |
| **8** | Add or narrow simple native-caption/cue virtualization | **I3–4**, simple-caption and very large cue sets | C2 | Q2–3 | **Medium** |
| **9** | Extract embedded ASS/fonts into the existing Native renderer | **I5**, subtitle-rich local media | C2–3 | Q3 | **Medium–slow** |
| **10** | Use truthful source-bound indexes for remote seeking | **I4**, poorly indexed or repeatedly scanned sources | C2–3 | Q3 | **Medium–slow** |
| **11** | Eliminate one verified gather copy or fresh-buffer churn | **I2–3**, allocation/transfer-limited routes | C2 | Q3 | **Medium** |
| **12** | Add bounded GOP-batched/coarse preview execution | **I4** for previews; no steady-playback claim | C2–3 | Q3 | **Medium–slow** |
| **13** | Extend lossless adaptation to ALAC/TrueHD, one profile first | **I5**, those source classes; not current admission | C3 + rebuild | Q3 | **Slow** relative to #2 |
| **14** | Integrate one retained-session track transaction | **I4**, audio switches/configuration changes | C3 | Q4 | **Slow** |
| **15** | Qualify the existing Software YUV/GPU presenter | **I4**, sources that still need software decoding | C2–3 + rebuild | Q4 | **Slow**, device-dependent |
| **16** | Integrate one exact restart/crop dependency window | **I3–4**, seeks, clips and localized audio work | C3 | Q3–4 | **Slow** |
| **17** | Move MSE ownership to a worker | **I3**, when UI contention is measured | C3 | Q4 | **Slow** despite a cheap API probe |
| **18** | Preserve WebCodecs sessions across ordinary transport batches | **I3–4**, only if unnecessary resets are demonstrated | C2–3 | Q4 | **Medium–slow**; audit first |
| **19** | Build non-pthread asynchronous remux | **I5 deployment**, CPU benefit unknown | C4 + new build | Q4 | **Very slow** |
| **20** | Integrate a verified partial-media byte provider | **I4** for torrent/rescue sources; low general reach | C3–4 | Q4 | **Slow–very slow** |
| **21** | Integrate one virtual edit/packaging representation | **I3–4**, editing/selected-track use cases | C3 | Q4 | **Slow** |
| **22** | Reuse immutable prepared groups across sources | **I3**, repeat/shared-content workloads only | C3 | Q4 | **Slow** |
| **23** | Optimize a requested native audio graph/filter operation | **I3**, filter-heavy or channel-processing workloads | C2–3 | Q3–4 | **Medium–slow**, demand-gated |
| **24** | Implement one compressed-domain audio operation | **I2–3**, narrow codec tools and requested operations | C3–4 | Q4 | **Slow–very slow** |

**Read this table correctly:** #4 outranks #9 because it is a concrete, localized comparison—not because saving one PCM copy is more important than preserving embedded subtitles. #19 has a high deployment ceiling but a poor initial payoff per unit of qualification work. #18 can move near the front only if its audit finds a demonstrably unnecessary operation that can be removed without rebuilding session ownership.

## 5. Fair-verdict contract

A positive decision requires **both** real integration and an adequate comparison:

`original source → Demuxe public API and selection → candidate workers/runtime → required A/V/subtitles → interaction/recovery → teardown`

A candidate must not silently use Software fallback and be counted as a successful Native optimization. Preconverting the file with a host CLI and then playing the result is a destination test, not an end-to-end adaptation test.

For each task:

1. **Audit before coding.** Identify the current source location, actual opportunity, closest maintained baseline and available oracle. State the smallest useful supported profile.
2. **Close missing prerequisites first.** A capability probe can yield `BLOCKED`. An already-correct implementation can yield `ALREADY_IMPLEMENTED`. Neither requires a speculative rewrite.
3. **Build the smallest realistic integration.** Reuse existing parsers, controllers and tests. Rebuild touched compiled interfaces. Do not compare an intentionally naive baseline with a heavily specialized candidate.
4. **Check equivalent complete output.** Preserve selected tracks, timing, geometry, color, subtitles and requested fidelity. Packet identity alone is insufficient. Same-decoder PCM/pixel identity may be appropriate; differing browser output implementations need a declared comparison boundary and justified tolerances.
5. **Exercise interactions and failures.** Run the relevant common gates and the card-specific controls below. A stable object ID does not prove retained internal hardware state.
6. **Measure complete work.** Include startup, indexing, conversion, copies, buffering and teardown. Record cold and warm behavior, absolute deltas, unchanged controls and observer overhead.

Separate verdicts:

- `VIABLE_COMPONENT`: preliminary only; not a fair positive end-to-end decision.
- `ALREADY_IMPLEMENTED`: no new optimization opportunity found; retain qualification evidence.
- `BLOCKED`: missing exact runtime, source profile, fixture, device or oracle.
- `INCORRECT`: candidate violates the declared contract; preserve the reproducer.
- `NO_BENEFIT`: equivalent integrated paths were compared adequately and no worthwhile benefit was established.
- `INCONCLUSIVE`: measurements are noisy, the baseline is unfair, or essential output cannot be observed.
- `QUALIFIED_LOCAL_PROFILE`: complete scoped local correctness and repeatable value established; further release/device gates remain explicit.

A rough, allocation-heavy proof of concept losing to optimized upstream code warrants `INCONCLUSIVE` about the general technique—not a universal rejection. Conversely, proving a tiny kernel faster does not qualify the complete route.

## 6. Detailed assignments

### 01 — Qualify existing Native/direct/packet-copy coverage

**Type:** existing-route qualification. **Related:** R07, R09, R65 and the maintained Native registry. **Dependency:** shared groundwork.

**Why first:** it answers the central question with little speculative coding: which actual sources avoid application-side software video decoding today? It also prevents later experiments from claiming improvements over an unnecessarily expensive baseline.

**Agent work:** reuse automatic-selection, remux-negotiation and regression tests; add a small fixture/plan manifest and missing observations. Start with H.264/AAC MP4 and matched MKV/TS/fMP4 sources. Include HEVC/AV1 only with actual destination/configuration evidence. A missing adapter is a separately estimated extension, not permission to turn this task into a general codec port.

**Fair judgment:** observe accepted plan, selected A/V, first output, middle/end seeks, EOF and cleanup. Check copied packet/configuration/timeline invariants where applicable. Compare automatic routing with the cheapest correct explicit route. Record hardware evidence separately; native playback is not by itself hardware proof.

**Stop/re-rank:** if selection is already correct, conclude `ALREADY_IMPLEMENTED` and keep the matrix. Unsupported browser codecs are not remedied by relabeling the container. [C2; L1]

### 02 — Qualify existing lossless audio adaptation

**Type:** existing-route qualification. **Related:** maintained `native-flac`; R51/R57 are extension leads, not current blanket admission. **Dependency:** #01 plus matching preparation assets.

**Why high value:** audio incompatibility can otherwise force a more expensive complete playback route while the video is already usable.

**Agent work:** exercise the exact admitted 16/24-bit integer mono/stereo path, beginning with known-compatible PCM fixtures. Check the actual decoded format and runtime manifest. Reuse the optional-runtime harness. The current wrapper restricts source codecs, precision and layout: it explicitly rejects ALAC/TrueHD and more than two channels. Those belong to #13 or a separate multichannel task. [C5]

**Fair judgment:** source PCM versus adapted decode-back, accurate counts/priming/tails, unchanged copied video, selected-track identity, seeking and cancellation. Include Native+FLAC+external ASS/gain combinations after #03. Measure the whole preparation and playback interval, not just encoder time.

**Stop/re-rank:** missing matching assets increases the cost before any trial. Preserve explicit rejection and fallback for unsupported precision/layout. Do not infer preserved object-audio metadata from matching PCM. [C3–C5]

### 03 — Qualify existing external Native ASS and gain

**Type:** existing-route qualification. **Related:** existing Native ASS; R19–R22 are broader follow-ons. **Dependency:** #01 and matching subtitle assets.

**Why high value:** a required subtitle feature should not unnecessarily force a different video path. Existing integration makes this a better first investment than a new subtitle parser or presenter.

**Agent work:** run the current external ASS/SSA route with static text, Unicode shaping, attached fonts, karaoke, drawings, overlap and active-cue seeks. Reuse pinned libass references and existing tests. Qualify gain combinations without redesigning audio.

**Fair judgment:** compare authored subtitle output at identical geometry/time; verify hide/show, paused resize, seek, source replacement and teardown. Include extraction/attachment startup where relevant to the tested path and report total overlay cost.

**Stop/re-rank:** embedded subtitle extraction is #09, not an implicit part of this fast task. Unsupported PiP/fullscreen/casting behavior must stay explicit. Existing external ASS support is not a newly discovered optimization. [C2–C4; D1]

### 04 — Bypass redundant packed-PCM staging

**Type:** localized new candidate. **Related:** R74. **Dependency:** #02 and a measured stage opportunity.

**Why early despite modest impact:** the current `adaptation_frames()` allocates a converted AVFrame and copies samples before FIFO insertion even for admitted packed lossless input. That is a concrete source target with a straightforward sample oracle. [C5]

**Agent work:** profile that stage first. Add a packed-lossless fast branch that writes validated original frame data into the existing FIFO. Preserve timestamp/layout/sample-count/capacity checks, validate all S24 low bits before publication, and leave planar and Opus conversion behavior unchanged. Rebuild the matching preparation engine.

**Fair judgment:** exact PCM, malformed-precision rejection without partial FIFO mutation, source ownership after insertion, seek/drain/cancel behavior, and complete-session A/B measurements. Use the existing compiled implementation as the baseline.

**Stop/re-rank:** the reported 84.8–90.4% reduction was a modeled stage, not total playback. If that stage is negligible locally, record no compelling whole-player opportunity and stop; do not construct a benchmark that artificially makes it dominant. [L2]

### 05 — Coalesce obsolete application-side seek work

**Type:** localized scheduler candidate. **Related:** R40, R26 and cancellation portions of R55. **Dependency:** observable request/generation counters.

**Why early:** it can improve interaction latency by avoiding work rather than creating a new decoding path. It also admits a cheap negative decision when existing coalescing already handles the workload.

**Agent work:** trace a reproducible scrub burst through public API, workers and source reader. Suppress obsolete uncommitted work at one owner, retain the final exact request, and preserve pause/play intent. Do not build a general scheduling framework for this test.

**Fair judgment:** same final frame/audio position, no stale publication, bounded cancellation and source replacement, fewer actual reads/decodes or lower interaction latency. Include ordinary single seeks and sparse unrelated seeks as controls.

**Stop/re-rank:** the earlier MSE experiment already observed browser-side coalescing. Fewer JavaScript assignments alone are not a benefit. Close this task if the existing application/browser combination performs no meaningful obsolete work. [L1]

### 06 — Incremental delivery of already-emitted mux bytes

**Type:** worker/append integration candidate. **Related:** R04, R34, R47, R132–R135-C. **Dependency:** #01 and trusted timing/output checks.

**Why potentially substantial:** reduces avoidable startup/refill waiting if usable bytes are held until a larger application batch completes.

**Agent work:** instrument native emission, worker batching, message delivery, timing validation and append completion. The inspected worker collects emitted chunks, concatenates them in `flush()`, then posts results after `_rm_start()`/`_rm_step()`. It also supplies timing records and optional split buffers. This is not just a change to the append chunk size. [C6]

**Fair judgment:** keep mux/GOP/timestamp behavior unchanged first. Deliver bounded chunks only when required correctness validation allows it. Test partial samples/boxes, B-frames, backpressure, parser state, cancellation and unsupported profiles. Measure first correct video **and** selected audio plus total CPU, bytes and queue maxima.

**Stop/re-rank:** if native output itself arrives too late, or validation requires full batches, charge the necessary muxer/parser redesign and downgrade speed. Do not silently switch to tiny fragments or expose unvalidated output to rescue the benchmark. [L1; L4]

### 07 — Remove one measured duplicate startup/read operation

**Type:** instrument-first optimization. **Related:** R01–R03, R18, R27, R66. **Dependency:** #01 and source-authority traces.

**Why useful:** repeated probing, reopening, compilation or overlapping reads can affect many sources—but the existence of those costs must be established locally.

**Agent work:** identify one duplication across open, fallback or distant resume. Reuse an existing immutable result or source range with explicit lifetime. Do not start by building a shared global broker or worker pool. Separate compiling a reusable module from sharing mutable codec/session state.

**Fair judgment:** compare cold/warm paths and failed-candidate fallbacks with the same source/permissions. Charge first construction and hashing. Test changed bytes, validator changes, independent consumer cancellation, revocation and late responses. Count server bytes as well as application requests.

**Stop/re-rank:** no duplicated work means no optimization. A new authorization/caching subsystem changes C2 into C3/C4 and requires a new estimate. Multipart-range support from R216 is a separate transport extension; first compare against efficient separate useful ranges, not a deliberately wasteful contiguous download. [L1; L8]

### 08 — Simple native captions and cue virtualization

**Type:** bounded subtitle adapter. **Related:** R41, R48; R21 only for already-observed renderer work. **Dependency:** #01.

**Why here:** simpler caption semantics offer a smaller implementation surface than arbitrary subtitle rendering. Virtualization may help unusually large cue sets without changing video.

**Agent work:** first determine which native text paths already exist. Implement only the declared SRT/plain-cue subset, or only bounded instantiation of existing logical cues. Keep unsupported markup explicit. Avoid writing a second rich-caption engine.

**Fair judgment:** timing, Unicode, overlaps, seek into active cues, backwards restoration, clear/hide/show, source replacement and boundary lookahead. Check large and ordinary cue counts. Compare full output and total cost with the cheapest existing correct subtitle path.

**Stop/re-rank:** if normal caption workloads are already inexpensive, keep virtualization conditional. Fewer cue objects is a memory observation, not automatically a CPU improvement. Do not simplify authored ASS into plain text and call it equivalent. [L1]

### 09 — Embedded ASS/font extraction into the existing Native renderer

**Type:** high-impact extension. **Related:** R19; independently scoped R20/R60 are not included. **Dependency:** #03.

**Why below the cheapest patches:** it can preserve an efficient video path for an important source class, but extraction adds real demux, track-identity and attachment ownership work.

**Agent work:** reuse the maintained demux inspection and existing ASS worker. Carry codec-private script data, event timing, selected subtitle identity and authorized font attachments through a bounded API. Do not rebuild the renderer. External ASS success does not implement embedded extraction. [C4]

**Fair judgment:** use actual subtitle-bearing containers, complex scripts/fonts and both synthetic/held-out real files. Compare with the full correct reference path, including first appearance, active-cue seeks, track switching, malformed/oversized attachments, replacement and cleanup. Include extraction cost in startup.

**Stop/re-rank:** preserve an explicit fallback when attachments or styles are unsupported. Bitmap subtitles and in-band caption extraction have different parsers/oracles and receive separate estimates. This is a stronger potential feature win than #04, but a slower fair decision. [D1; L1]

### 10 — Truthful source-bound indexes for remote seeks

**Type:** indexing/byte-provider integration. **Related:** R44–R45, R131, R274. **Dependency:** #01 and a traceable range server.

**Why worthwhile:** seek latency and downloaded bytes can be dominated by scanning, even when decoding is efficient.

**Agent work:** reuse existing demux indexes first. Only add the missing source-bound index or byte-view mapping. Compare indexed and deliberately missing-index controls using unchanged media payloads. Implement stale-index, offset and validator rejection before claiming a reusable sidecar.

**Fair judgment:** early/middle/late seeks, open/closed GOPs, B-frame preroll, configuration changes, variable rate, nonzero starts and offsets beyond 4 GiB. Count initial scan/index-build/acquisition bytes, not just warm indexed lookups. Compare against the best already-indexed path too.

**Stop/re-rank:** R274 preserved normal Cues versus a Void control; it did not implement production index synthesis. A whole-file scan to create a one-use index may erase savings. A new MP4/WebM parser or virtual HTTP provider moves this toward the slower end of the estimate. [L1; L3; L13]

### 11 — Remove one gather copy or allocation hotspot

**Type:** ownership optimization. **Related:** R42, R47, R100 and R133-C. **Dependency:** #01; coordinate with #06.

**Why not higher:** copies can matter, but correct ownership and extra-message overhead can consume the expected savings. Some Hybrid copy elimination is already implemented. [C4]

**Agent work:** measure one specific copy or repeated allocation, then change its ownership contract. Reuse safely after the documented consumer boundary; do not transfer the shared Wasm heap or assume internal browser copies disappeared. Keep the candidate independent of simultaneous chunking changes where possible.

**Fair judgment:** output equality, mutation/detachment controls, outstanding consumer acknowledgments, cancellation, source replacement, allocation counts, maximum live bytes and full-session CPU. Include small and large batches.

**Stop/re-rank:** similar CPU with fewer allocations can still be useful, but label it correctly. If the removed gather copy is replaced by many costlier appends/messages, reject that implementation or report the tradeoff. Do not implement the existing Hybrid optimization twice. [L1; L3; L4]

### 12 — Bounded preview work reuse

**Type:** feature-specific execution path. **Related:** R55, R64, R72–R73; R272 only when decoder-frame copying is needed. **Dependency:** usable persistent preview execution and oracle.

**Why not a quick 8× win:** the host GOP experiment combined process/probe/seek/decode savings. A persistent Wasm preview decoder is a different baseline; a missing preview service adds coding and lifecycle cost. [L2]

**Agent work:** implement one preview contract first: coarse keyframe storyboard or exact requested-frame batch. Share only already-pending work, keep memory bounded, and avoid starving playback. Add ROI copying only where real decoder-frame layout permits it.

**Fair judgment:** exact output against a persistent correct reference; clustered and distant requests, cold and revisited content, long/open GOPs, variable frame rate, rapid cancellation and concurrent playback. Charge cache/decode initialization and measure first-result latency, not only batch throughput.

**Stop/re-rank:** no waiting to fill an interactive batch. Approximate previews must be labeled. Canvas-RGBA `copyTo` results do not establish hardware-frame or YUV savings. [L2; L13]
### 13 — Extend ALAC/TrueHD lossless adaptation, one source profile at a time

**Type:** native/profile extension. **Related:** R51, later R57. **Dependency:** #02.

**Agent work:** audit the maintained preparation build's compiled decoders and actual integer outputs, extend the explicit admission contract, rebuild, and reuse the working adaptation controller. Start with one stereo integer source profile; multichannel and immersive metadata are separate.

**Fair judgment:** preserve complete PCM, video payload/configuration/timing, rate, precision, selected language, seeking, tails and cancellation. Compare the whole adapted route against current Hybrid/Software and any already-working direct route. Include long-form real sources.

**Why slower:** the current wrapper rejects these codecs, so browser playback of host-converted FLAC is insufficient. Decoder availability, sample format, build manifests and failure handling all need real work. Do not “support” a float-output profile by quantizing silently. [C5; L1]

### 14 — One retained-session track transaction

**Type:** stateful player integration. **Related:** R15, R35, R43, R52, R58, R62, R126–R127, R138–R139-C, R262. **Dependency:** #01–#03 as applicable.

**Agent work:** start with one audio change while retaining video, not every codec pair. Implement prepare/validate/commit/rollback, source epochs, queues and timing ownership. Source-authored configuration changes and arbitrary user-selected changes are separate cases.

**Fair judgment:** exact intended output across the boundary, failed preparation before commit, rapid selection, cancel, paused changes, backwards/forwards seeks across epochs, EOF and teardown. Compare with the existing correct transition, not an intentionally wasteful full restart.

**Why slow:** a successful SourceBuffer switch does not establish continuity, rollback or decoder identity. Failure handling may take more work than the happy-path feature. If only the lab harness works, keep `VIABLE_COMPONENT`. [L1; L3; L4; L12]

### 15 — Existing Software YUV/GPU presentation

**Type:** qualification/repair of an existing experimental path. **Related:** R23–R24; ROI/layout ideas only as separate follow-ons. **Dependency:** matching presenter build and a real GPU target.

**Agent work:** reproduce the current RGB and experimental YUV paths before modifying either. Fix only the bounded identified issue. Test actual decoded planes, strides, crop, chroma siting, color range, resolution changes and subtitle composition.

**Fair judgment:** complete timed A/V output with the same scaling/fidelity contract, seeks, device/context loss, cleanup, sustained CPU and memory. Record actual graphics backend; software graphics emulation is not physical-GPU qualification.

**Why worthwhile but slower:** this helps unavoidable software-decoded sources; it does not remove software decoding. Historical seek/presentation failures and changed native artifacts make it more than an upload microbenchmark. GPU effects and arbitrary new presenters require new estimates. [C4; D1]

### 16 — One codec-aware exact restart or smart cut

**Type:** codec/state integration. **Related:** R94, R150, R161, R166, R223–R231-C, R270. **Dependency:** real parser/decoder and a defined exactness contract.

**Agent work:** begin with the simplest source/profile that serves a real feature—such as complete FLAC-frame extraction or qualified AVC random access. Reuse production indexing. Add edge processing and header/CRC repair only for the requested operation.

**Fair judgment:** compare target output and later suffix against uninterrupted decoding, including seek accuracy, priming, metadata truth and unsupported-state rejection. Test boundaries and pathological profiles, not only one target offset.

**Why slow:** empirical Opus/AAC/MP3 recovery windows are fixture/build-specific. R270's first FLAC construction decoded linearly yet sought incorrectly. A fixed warm-up constant or a linear-playback-only pass is not qualification. No state rollback can undo output already heard or displayed. [L5; L6; L8; L13]

### 17 — Worker-owned MSE

**Type:** execution-ownership change. **Related:** R05, R136–R137-C. **Dependency:** real API/origin support and measured main-thread contention.

**Agent work:** retain the existing byte producer and move MSE ownership with bounded queues and clear shutdown semantics. Ensure a worker servicing asynchronous media callbacks is not blocked by synchronous native work. Build fallback behavior for unsupported deployment.

**Fair judgment:** equal media, synthetic repeatable UI load, correct A/V, seeks, stalls, cancellation, worker failure, source replacement and total resource use. Measure long tasks, deadline misses and total CPU—not just main-thread relief.

**Why slow despite cheap preflight:** constructing/transferring a handle tests availability, not a maintainable production ownership boundary. A lightly loaded page with no actual contention may have no useful upside. [L4; D1]

### 18 — Continuous WebCodecs sessions across transport batches

**Type:** audit-first session optimization. **Related:** **R242-A**, not R242-C. **Dependency:** matching Hybrid runtime and decode-state instrumentation.

**Agent work:** log real configure/flush/reset calls and their reasons. Ordinary transport batches are not necessarily decoder reset boundaries. However, seek/configuration/lifecycle resets may be essential. Remove only a proven redundant operation, with a flag and a reference path.

**Fair judgment:** predictive streams, B-frame reordering, delayed output, configuration changes, seeks, cancellation, backpressure and EOF drain. Match output identities and timing; compare against current maintained behavior.

**Re-rank rule:** if the audit exposes a small avoidable operation, this can move into the first patch wave. If it requires new session ownership or no redundant reset exists, leave it late or close it. The original-card evidence did not execute this production continuity hypothesis. [D1]

### 19 — Non-pthread asynchronous remux

**Type:** new build/runtime architecture. **Related:** R06, R176. **Dependency:** pinned toolchain viability and a deployment need.

**Agent work:** build a real bounded demux/read/seek/remux worker without relying on the current shared-memory transport. Integrate asynchronous suspension with cancellation and parser errors; verify imports, exports and compiled dependencies. Do not rewrite all of mpv or remove isolation checks from the existing pthread build.

**Fair judgment:** real sources and range access, backwards seeks, suspended-call cancellation, reentrancy, worker death, memory and complete packaging output. Compare end-to-end with the maintained remux path on environments supporting both.

**Why late:** R176's tiny Wasm suspension test does not qualify FFmpeg integration. A broader deployment capability may justify the work even without a CPU reduction, but this is not a quick performance win. [L6; C3; C7]

### 20 — Verified partial-media delivery

**Type:** source-provider integration. **Related:** R188, R207, R261. **Dependency:** an actual trusted block/range provider.

**Agent work:** connect the source reader to verified media dependencies. Preserve authorization, source identity, proof/hash provenance and cancellation. Keep retrieval units, verification units and codec dependencies distinct. Use the existing provider where available rather than building a torrent client to qualify one player idea.

**Fair judgment:** play actual required A/V before unrelated source data completes; reject corrupt blocks/proofs and stale source identities; test retries, delayed dependencies, seeks and teardown. Compare with a well-scheduled existing provider and charge verification/request overhead.

**Why conditional:** it can matter greatly with your torrent-related use case, but it adds little to an already-local complete file. R261 is loopback/hash-manifest evidence, not a production trust-distribution or WAN result. [L7; L8; L12]

### 21 — One virtual edit or packaging representation

**Type:** container/byte-provider feature. **Related:** R59, R109–R125, R162, R240-C, R242-C, R245-C. **Dependency:** a requested edit/selection feature.

**Agent work:** choose one finite operation, preserve original media payloads where claimed, and implement truthful metadata plus source-bound byte mapping. Reuse parsers and existing stream-copy facilities. Avoid a general virtual-filesystem/editor architecture for the first test.

**Fair judgment:** original authorized source through the actual Demuxe feature; compare timing, samples, geometry, configuration, seek, EOF and cancellation. Charge metadata parsing, index work, bytes served and any data copied.

**Why lower priority:** an edit-list loop can save storage while the decoder still decodes repeated samples. A selected-track view can be useful without accelerating normal one-track playback. Simple metadata surgery may be easy; general correct seeking and feature composition are not. [L3; L4; L6; L11]

### 22 — Cross-source immutable work reuse

**Type:** content-addressed cache feature. **Related:** R18, R200, R227-C. **Dependency:** repeated/shared-content demand and stable source authority.

**Agent work:** cache one verified immutable representation—such as prepared closed groups or thumbnails. Include decoder configuration, dependencies and output semantics in the identity while keeping timeline mapping source-specific. Do not share mutable live decoder state.

**Fair judgment:** same coded content in different files, changed color/configuration, authorization changes, cancellation and eviction; include no-hit, cold-build and low-reuse controls. Measure hashing, retention, lookup, invalidation and reuse together.

**Why slow/conditional:** the codec identity proof is only part of the work. Correct caching and access boundaries can outweigh the media operation. Zero natural reuse means little or no payoff regardless of a perfect cache-hit benchmark. [L7; L8]

### 23 — A requested native audio graph or filter optimization

**Type:** effect-specific integration. **Related:** R14, R61, R170, R219, R233, R238, R245-A, R265. **Dependency:** an actual requested audio operation and sample-phase oracle.

**Agent work:** choose one existing linear/filter path and preserve its state/latency contract. Use the real AudioWorklet/Wasm implementation, not a standalone NumPy or matrix substitute. Separate timing-estimator research from changing the DSP graph.

**Fair judgment:** sample phase, counts, tails, chunk boundaries, seek/reset, gain, rate, clipping and cancellation; compare complete identical operations at equal buffering latency. Digital channel tests do not establish physical surround correctness.

**Why demand-gated:** shared transforms or correction-only filtering can help processing-heavy workflows but may do nothing for ordinary playback. Linear identities do not authorize reordered nonlinear stages, implicit downmixing or altered fidelity. [L6; L8; L9; L12]

### 24 — One compressed-domain audio operation

**Type:** specialized codec implementation. **Related:** R103–R104, R174, R180, R196, R203–R204, R217, R268. **Dependency:** a real source profile and requested channel/gain/analysis operation.

**Agent work:** parse actual coded structure, prove the admitted independence/alignment requirements, perform the operation and serialize valid headers/configuration/checksums. Use the matching runtime. Channel extraction, channel assembly, mixing and waveform summarization are separate assignments, not one generic pass.

**Fair judgment:** compare the intended output with a correct decoded reference; test coupled channels, coding tools, priming, mismatched rates/block lengths, malformed data and unsupported profiles. Include full parse/write/decode cost and an ordinary no-operation control.

**Why late:** selecting one independent AAC element can avoid reconstruction, but many media files do not have that prepared independent structure. A smaller packet count is not proof of fewer bytes or lower CPU. Generic input admission and trustworthy rejection can cost more than the transform itself. [L3; L6; L7; L8; L13]

## 7. Conditional work not promoted into the first queue

These are not declared failures or permanently abandoned. They need a concrete demand signal, a missing prerequisite, or a better executor before competing with the ranked work.

| Work | Why it is not a fast, high-confidence first investment | Condition that raises its priority |
|---|---|---|
| Browser AudioEncoder replacing permitted lossy audio adaptation (R12) | New encoder integration, delay/padding accounting and cross-device behavior; not a lossless route | Current authorized audio encoding is measured as a material bottleneck and the real encoder path is available |
| PGS/in-band captions, PiP/fullscreen/casting retention (R20/R22/R60/R198) | Different parsers, trusted fixtures or presentation destinations; do not hide under external ASS qualification | A common source or required destination is blocked specifically by that feature |
| Explicit multichannel and HDR/Dolby Vision/multiview | Physical-output and metadata contracts, source diversity and trusted reference equipment | A defined target device/profile and fixtures are available; qualification is a product requirement |
| Hap, FLIC, RAW, deep images, JPEG 2000/JXL and prepared AV1 tiles | Specialized parsing/execution, often prepared input; workload reach may be small | Real user media needs the route and an end-to-end baseline exists |
| Decoder rewrites, GPU entropy, state caches, precision guards | Models are not optimized decoder integrations; benchmark and correctness baselines are expensive | An unavoidable software bottleneck is large enough to justify touching the codec |
| Hibernation, queue/loop extensions, compressed rewind caches | Lifecycle correctness can be costly and long-pause/queue use may be uncommon | Real memory pressure or repeated queue/rewind demand warrants a separate bounded feature |
| XOR/coefficient/texture compression caches | Preparation, hit rate and reconstruction penalties can dominate | An explicit memory budget and representative revisit trace establish net value |
| Research reducers, witness optimizers, deadline/slack tools | Useful infrastructure, but a general framework can delay actual decisions | Repeated failures or test duplication make a targeted tool cheaper than continuing manually |
| Unresolved or newly proposed R-cards | Number or request-to-test is not reliable execution evidence | Retrieve the exact mechanism, report, runtime and independent checks first |

**Preserve established negative controls:** R33/R50/R56/R69 do not justify new subsystems under their old mechanisms; R179's font subset changed output; naive AAC splice R228-C is not exact; naive CENC packet-copy R159 lost essential protection metadata. Do not rebrand these as quick wins. R71's compression-level tradeoff and R75/R226-C's index compactness require absolute benefit, not only a percentage. [L1; L2; L6; L8; D1]

R206/R213/R244-A/R266 did not establish a faster complete implementation under their tested executors. A new executor is a new qualification cost. Film-grain removal, interpolation, concealment, downmixing and approximate previews must retain explicit output-policy distinctions. [D1; L12; L13]

## 8. Make the agent's judgment fair without overbuilding

### Use the stage-cost ceiling to reject weak opportunities early

If a measured stage consumes fraction `s` of total CPU and a candidate removes fraction `r` of that stage, the maximum attributable CPU saving is approximately `s × r` before its new overhead. This is bookkeeping, not a prediction of battery life or elapsed playback speed.

For example, a stage consuming 2% of total CPU cannot deliver a 50% whole-player CPU reduction. Removing 90% of that stage yields at most about 1.8% total CPU reduction before overhead. R74's report explicitly uses this distinction. [L2]

This is the right reason to stop a low-impact candidate early. An unavailable observer or unfairly slow prototype is not.

### Shared work and candidate-specific work

Build the reusable source/route/output observer once. Share immutable fixtures, source archives and validated baselines. Keep each candidate's implementation, runtime identity and raw results separate. Reuse identical compiled artifacts for browser-only changes where the build contract allows it; rebuild changed native code or interfaces. Do not force unrelated clean engine rebuilds for every JavaScript-only test, but do not skip required source/runtime correspondence checks.

Do not compare candidates measured simultaneously under heavy competing compilation, decoding or GPU load. Parallel development does not imply concurrent performance scoring.

### Require an effort re-estimate before an assignment grows

At the audit checkpoint, the agent records:

| Work category | Required account |
|---|---|
| Source/code | Actual functions, modules and interfaces touched; whether the feature already exists |
| Build/runtime | New native profiles, rebuilt artifacts, toolchain prerequisites and reuse boundaries |
| Fixtures/oracle | Missing files, reference outputs, negative controls and observer implementation |
| Integration | Routing, timestamps, ownership, cancellation, API and source-security changes |
| Qualification | Browser/device combinations, performance comparisons, lifecycle and endurance coverage |
| Ongoing burden | Guards, new parser/state complexity, regression fixtures and maintenance cost |

If a C1 task becomes a new parser, a new runtime ABI, or a second clock/scheduler, stop and re-rank before pursuing it. Report the dependency rather than silently consuming the campaign on an unplanned rewrite. A narrowly scoped prototype can still be worth building, but its verdict stays at its actual evidence level.

### Local qualification floor

This is a proposed minimum screening policy, not proof of universal reliability:

- Use deterministic ordinary/adversarial fixtures **and held-out real files** appropriate to the admitted profile. Include a do-nothing baseline and an unsupported-profile rejection.
- Exercise start, pause/resume, early/middle/late seeks, EOF, replace and destroy; add track switches, tails, faults and concurrent consumers where the candidate supports them.
- Start performance screening with warmup plus at least seven paired runs in rotated order. Confirm promising small/noisy effects with a larger sample (for example, at least 30 paired observations across multiple sources). Save distributions and absolute deltas; increase sampling when uncertainty remains.
- Run 100 bounded lifecycle cycles and a 30-minute representative playback screen for changed long-lived paths. A repeated short clip tests looping, not every property of a full-length source. Intended long-form/mobile releases additionally need full-duration and interruption/thermal tests.
- Test stock Chrome and Firefox where available. Actual Safari and physical mobile output require their own results. A declared unsupported configuration can pass the rejection/fallback contract without passing the candidate route.

A `QUALIFIED_LOCAL_PROFILE` label names the exact tested device/browser/source profile and its remaining gaps. It is not a universal support label. Separate narrow local decision speed from the eventual release matrix. [D1]

## 9. Practical run order and commands

These commands are entry points from the inspected repository, not a new universal driver. Inspect fixture/server requirements and output paths before running. Keep existing results from being overwritten. None were executed for this document. [C1; C3; C7]

```sh
# In a clean local experimental checkout with matching engines provisioned:
git rev-parse HEAD
git status --short
node --version
npm --version
python3 --version

npm ci
npm run build
npm test
npm run test:resources

# Relevant existing-route baselines:
npm run test:automatic-selection
npm run test:remux-negotiation
npm run test:remux-regressions
npm run test:public-api
npm run test:component
```

For optional adaptation/ASS, follow the current `docs/RUNTIME-ASSETS.md` and `docs/RELEASE.md` recipes. Use the actual `scripts/qualify-optional-runtime.py` argument requirements for the runtime inventory being tested. Missing assets are a prerequisite failure, not a failed codec hypothesis.

Once a candidate is ready for archive-level checking, use the same immutable locally assembled archive for `tests/beta-consumer.mjs`, `tests/beta-streaming.mjs`, the appropriate optional-runtime matrix and their required browser variants. Do not repack between verification and the reported result. Do not assume `RESULT_ROOT` or `BROWSER` is supported by every harness; inspect each entry point. No publishing, tagging or default-route promotion is authorized by this plan.

**Suggested assignment batches:** shared groundwork → #01–#03 → #04–#06 → re-rank. Do not launch all 24 tasks just because they are listed. API/source audits for #17–#19 can be cheap side investigations, but cannot be presented as completed integration work.

## 10. Copyable local-agent assignment

```text
Work on one named ranked task from Demuxe_Impact_and_Qualification_Priority.md.
The goal is a fair end-to-end local decision, not merely a successful PoC.

Before editing:
- Resolve exact source revision, runtime hashes, experiment mechanism and report.
- Identify the best existing correct baseline and whether this work already exists.
- State applicable workload/expected benefit, code/build work, missing fixtures,
  oracle work, and qualification requirements. Re-estimate C/Q grades.
- Stop/re-rank if the bounded task expands into a new architecture.

Then:
- Use the real Demuxe public path and matching compiled runtime.
- Implement only the smallest useful profile and reuse maintained infrastructure.
- Keep Native/Hybrid/Software modes, fidelity and authorization boundaries intact.
- Verify actual plan execution; successful fallback is not candidate success.
- Prove required output, interactions, negative controls and cleanup first.
- Measure complete equivalent work, including cold preparation and first indexing.
- Keep observer-heavy correctness runs separate from scored performance runs.

Return:
- One precise verdict: ALREADY_IMPLEMENTED, BLOCKED, INCORRECT, NO_BENEFIT,
  INCONCLUSIVE, or QUALIFIED_LOCAL_PROFILE. Label component evidence separately.
- Source/build/runtime identities, actual code changes, commands, fixture manifest,
  raw comparisons, negative controls, output checks and a minimal reproducer.
- Actual effort categories versus estimate, measured applicability, next gate,
  tested fallback and remaining device/long-session gaps.

Do not overwrite earlier evidence, invent missing R-card definitions, relax
fidelity to manufacture a win, or publish/promote default routes.
```

Suggested result skeleton:

```yaml
rank: 4
stable_key: packed-pcm-staging-bypass
legacy_ids: [R74]
source_report: R70-R75-report.md
source_report_sha256: null
repository_commit: null
runtime_hashes: {}
profile: null
baseline_plan: null
candidate_plan: null
actual_candidate_executed: null
impact_hypothesis: null
estimated_work:
  coding_grade: C1
  qualification_grade: Q2
actual_work:
  source_changes: []
  native_rebuilds: []
  fixtures_oracles_added: []
  integration_boundaries: []
  qualification_completed: []
  remaining_maintenance: []
correctness:
  oracle_boundary: null
  output: null
  negative_controls: []
  lifecycle: null
comparison:
  stage_share: null
  absolute_cpu_delta: null
  startup_seek_delta: null
  memory_bytes_delta: null
  raw_results: []
verdict: null
remaining_gates: []
revised_priority_reason: null
```

## 11. Experiment identity and scope

A rank in this document identifies a **bounded task**, not a replacement R-number. Several related experiments can support a task, but they are not interchangeable proof.

The prior guide documented conflicting identities. Continue to use descriptive stable keys and exact report hashes. The suffixes below are guide aliases, not official renumbering:

| Legacy ID | `-A`: original-card report R239–R246 | `-C`: reconstructed continuity rerun R239–R245 |
|---|---|---|
| R239 | AV1 operating-point extraction | Ogg Opus repagination |
| R240 | 2D view from multiview HEVC | VP9 WebM cluster splitting |
| R241 | Ultra HDR gain-map reconstruction | JPEG DCT-domain rotation |
| R242 | Continuous WebCodecs sessions | H.264 aspect-ratio metadata patch |
| R243 | Repeated residual inverse-transform cache | Nonessential SEI removal |
| R244 | Dirty-region video effects | Prepared reservoir-independent MP3 |
| R245 | Factored multichannel filter bank | Bounded FLAC frame extraction |

R132–R145 and R223–R231 reports also state reconstructed continuity provenance. Do not silently infer acceptance of those identities into the canonical backlog. [D1; L4; L8; L11]

This is a reprioritization of the prior guide, using its reviewed research scope plus the source checks identified below. It is **not a fresh exhaustive status audit of every R001–R294 card**. Missing or newly executed reports must be reconciled before assigning their work; an earlier `PROPOSED` or `BLOCKED` label should not be assumed current indefinitely.

### Where the former workstreams went

| Previous guide workstream | Revised treatment |
|---|---|
| Baseline/oracles; tails/recovery/lifecycle | Shared groundwork and mandatory per-candidate gates, not optional benefit-ranked work |
| Native coverage | #01 |
| Lossless adaptation | #02 current profile; #04 staging; #13 codec expansion |
| Subtitle-rich playback | #03 external ASS; #08 simple cues; #09 embedded ASS; specialist destinations remain conditional |
| Track transactions | #14 |
| Startup/reads/scheduling | #05 and #07; immutable cross-source caching separately #22 |
| Indexed seeking; mux delivery | #10; #06 and #11 |
| Previews | #12 |
| Worker MSE / continuous WebCodecs; non-pthread remux | #17 and #18 separated; #19 |
| GPU/YUV; verified transport; exact restart | #15; #20; #16 |
| Virtual edits; caches; audio graphs; compressed audio | #21; #22; #23; #24 |
| Browser encoder, HDR/multiview, specialized textures, kernels, research accelerators | Demand-gated table in section 7; scope must justify the larger qualification cost |

## 12. Source register

The rankings and workload/effort grades are engineering judgments. Source references establish mechanisms, current implementation boundaries, or historical evidence—not the predicted impact grades. Repository paths below are pinned to the revision rechecked for this document.

### Repository sources

- **C1 — Baseline and commands:** GitHub `main` rechecked on 18 September 2026; commit `9abfd1b22300cf273fc0bd1a8290261281c8f3f3`. The previously inspected `package.json` at the same revision supplies the listed npm scripts.
- **C2 — Finite playback registry:** `src/internal/playback-plans.ts` at that commit, inspected for the previous guide. Existing Native/direct/remux and experimental feature/admission contracts.
- **C3 — Runtime assets:** `docs/RUNTIME-ASSETS.md` at that commit, inspected for the previous guide. Optional assets, matching builds and local-archive qualification.
- **C4 — Optimization status:** `docs/OPTIMIZATION-COMPLETION.md` at that commit, inspected for the previous guide. Its latest-status header governs; later historical tables are not automatically current status.
- **C5 — Current audio wrapper:** `native/adaptation/flac.h`, freshly read for this revision. Blob `cbd76973ce52be38ecd46dcbc12a293fcf900b56`. Actual codec/precision/layout guards, packed staging and FIFO path.
- **C6 — Current remux worker:** `web/native-remux-worker.js`, freshly read for this revision. Blob `8bf8d87204e3ad4bc77780708035b712a6c5a4fd`. Emission collection, flush, native-step messages, timing and split-buffer responsibilities.
- **C7 — Release/build recipe:** `docs/RELEASE.md` at that commit, inspected for the previous guide. Pinned build and exact-archive verification requirements.

Pinned source locations:

```text
https://github.com/Jagalite/demuxe/tree/9abfd1b22300cf273fc0bd1a8290261281c8f3f3
https://github.com/Jagalite/demuxe/blob/9abfd1b22300cf273fc0bd1a8290261281c8f3f3/src/internal/playback-plans.ts
https://github.com/Jagalite/demuxe/blob/9abfd1b22300cf273fc0bd1a8290261281c8f3f3/native/adaptation/flac.h
https://github.com/Jagalite/demuxe/blob/9abfd1b22300cf273fc0bd1a8290261281c8f3f3/web/native-remux-worker.js
https://github.com/Jagalite/demuxe/blob/9abfd1b22300cf273fc0bd1a8290261281c8f3f3/docs/RUNTIME-ASSETS.md
https://github.com/Jagalite/demuxe/blob/9abfd1b22300cf273fc0bd1a8290261281c8f3f3/docs/OPTIMIZATION-COMPLETION.md
https://github.com/Jagalite/demuxe/blob/9abfd1b22300cf273fc0bd1a8290261281c8f3f3/docs/RELEASE.md
```

### Supplied Project/Library research

These are preserved artifact names, not invented repository locations. Most are standalone host/browser/model experiments, not production integrations. Retrieve the exact underlying report and raw evidence before coding from it.

- **D1:** `Demuxe_Ranked_Local_Testing_Guide.docx`, revision 1.0, 19 pages; reviewed in full as the document being reprioritized. Its evidence identity and scope limitations are retained. SHA-256: `1404f0882eb374da7394ca628de3f1d7265f5bed784f476055e5a8edbd323b29`.
- **L1:** `Demuxe_Routing_Optimization_Ideas.md`, `RESULTS.md`, `RESULTS_R31_R42.md`, `RESULTS_R43_R57.md`, `R58-R69-report.md`; initial routing, transitions, subtitling, source and ownership evidence from this conversation and retained files.
- **L2:** `R70-R75-report.md`; packed-PCM stage and preview comparison boundaries. R74 section freshly reread for this revision; no benchmark rerun.
- **L3:** `R88-R101-report.md`, `R102-R115-report.md`, `R116-R131-report.md`; existing conversation evidence on ownership, virtual representations, packet operations, sparse timing and indexing.
- **L4:** `R132-R145-report.md`; reconstructed continuity batch, partial delivery and worker/session primitives, with explicit provenance.
- **L5:** `R146-R158-report.md`; mixed component/browser/model evidence, cache and preview limits.
- **L6:** `R159-R171-report.md`, `R172-R182-report.md`; state/recovery, JSPI component evidence, specialized codec operations and rejected font subsetting.
- **L7:** `R183-R192-report.md`, `R193-R202-report.md`; source scheduling, observers, restricted transformations and immutable group reuse.
- **L8:** `R203-R213-report.md`, `R214-R222-report.md`, `R223-R231-report.md`; verified-source, transport, audio and restart evidence; the last report has reconstructed definitions.
- **L9:** `R232-R238-report.md`; retained report, audio/GPU/codec components and models.
- **L10:** `R239-R246-report.md`; original-card identities summarized in D1; recover the original report before assigning a card based solely on that summary.
- **L11:** `R239-R245-rerun-report.md`; retained continuity rerun reviewed for this revision. Do not confuse it with L10.
- **L12:** `R261-R267-report.md`; retained report reviewed for this revision, including source rescue, authored configuration intervals and model-only boundaries.
- **L13:** `R268-R275-report.md`; real decoder-frame/ROI distinction, smart FLAC cuts, Cues control and prepared AV1 tiles. Relevant sections freshly reread for this revision.

**Final decision principle:** a small, well-qualified change that removes real work is a better first result than a theoretically transformative route whose parser, runtime, ownership and oracle still need to be invented. Keep high-upside research visible, but price its full path to evidence honestly.