# Demuxe: individual runtime screening, then survivor qualification

**Revision 3.0 · 18 September 2026 · Local-agent execution plan**

> **Screen individual ideas when the real-path experiment is cheap. Share setup and compatible builds. Group surviving mechanisms for extensive end-to-end qualification.**

This replaces the **execution strategy** in `Demuxe_Impact_and_Qualification_Priority.md` revision 2.0 and the earlier companion agent prompt. It retains impact-versus-effort prioritization, but removes the requirement to enter a broad integration workstream before testing a small individual change. The previous document remains useful historical context, not a competing instruction to qualify every group first. [S1]

**Deliverable:** a traceable decision for each investigated hypothesis, followed by production-faithful qualification of worthwhile survivors. This document specifies a campaign; it does not report new tests, builds, code changes or newly verified repository state.

## 1. The operating model

```text
Available research cards and reports
                |
                v
Identity check + cheap production audit
                |
        +-------+-------------------------------+
        |                                       |
Already implemented, duplicate,          Unresolved useful question
irrelevant to current workload,                   |
blocked, or too expensive                         v
        |                              Choose the cheapest honest screen
        v                                /          |          
Record scoped disposition          existing test  JS patch  Wasm patch/build
Do not fabricate a test                 \          |          /
                                        actual candidate execution
                                                 |
                                    correctness + complete-work screen
                                                 |
                       +-------------------------+-------------------+
                       |                         |                   |
                 Incorrect / blocked       No useful signal      Promising
                       |                   or uncertain result       |
                 preserve failure          record scope/noise       v
                 stop that variant         defer or refine     group survivors
                                                                    |
                                                   interactions + ablations
                                                                    |
                                                   extensive E2E qualification
                                                                    |
                                                   scoped adoption or rejection
```

**Do not execute all 200+ cards sequentially. Do not build a complete subsystem for each card. Do not mark a whole group passed because one member works.**

Maintain an inventory of available items, then investigate in priority order. Each investigated item gets its own outcome. Unread or unrecovered items remain explicitly unreviewed; they are not silently rejected. There is no target percentage of ideas that must fail or succeed.

**A complete cycle is:** inspect → change only what is needed → build if needed → test → interpret → revise or stop. A materially changed implementation is a new candidate revision and must be retested; its predecessor's result does not transfer automatically.

## 2. Four different units of work

| Unit | Purpose | What may be shared | What must remain separate |
|---|---|---|---|
| **Research item** | One falsifiable question with a specific mechanism and output contract. | Source references and related evidence. | Identity, hypothesis, admission conditions and disposition. |
| **Build batch** | Amortize compatible compilation and fixture setup. | Locked dependencies, compiler cache where valid, test plumbing and a small set of compatible experiment switches. | Effective flags, candidate-specific output checks and individual comparisons. |
| **Survivor workstream** | Integrate related mechanisms that passed screening or have a demonstrated dependency. | Production ownership, fixtures, lifecycle tests and interaction analysis. | Per-mechanism benefit and correctness attribution. |
| **Qualified profile** | Define what a particular artifact actually supports on particular targets. | A versioned fixture/action matrix and release evidence. | Unsupported profiles, remaining device gaps and exact artifact identity. |

Grouping **build setup** early is encouraged. Grouping **success verdicts** is not. A build containing three candidates does not mean those candidates should be enabled together during their individual screens.

## 3. Establish only the baseline needed to start

Do this once per relevant runtime family. Reuse it until affected code, artifacts or assumptions change. Do not delay every cheap screen until every Demuxe feature has completed release qualification.

### Baseline lane, in order

| Order | Reference to establish | Why it matters | Initial scope |
|---:|---|---|---|
| **B0** | Actual revision, assets and trustworthy observations. | Prevents testing stale binaries, the wrong route or a broken observer. | Record source/diff/build hashes and actual output; demonstrate detection of one wrong-output fault. |
| **B1** | Existing Native/direct/remux behavior. | Supplies the cheapest correct video baseline and a no-op control. | One working direct source and one relevant remux source; force only eligible alternatives. |
| **B2** | Existing admitted lossless audio adaptation. | Required before changing its staging, encoding or packaging path. | Matching optional assets and a source inside the actual compiled/admitted profile. |
| **B3** | Existing external Native ASS/gain behavior. | Required before subtitle-related changes or combined subtitle measurements. | One static and one stateful/animated subtitle case using the maintained renderer. |

B2 and B3 are needed when their dependent item is selected, not as universal prerequisites for unrelated work. Existing-functionality results are **baseline evidence**, not new optimization gains. A serious baseline correctness or source-authority defect preempts optimization of the affected path.

The prior source inspection recorded a finite Native/Hybrid/Software registry, optional hash-matched preparation/ASS assets, and narrower audio admission than the host experiments. At that snapshot the adaptation wrapper did not admit ALAC/TrueHD or layouts above two channels. Re-resolve those facts locally rather than assuming either support or absence persists. [S1, S2]

### Minimum observation contract

Record the accepted execution-plan ID, selected source/tracks, effective experimental configuration, actual media output, and whether fallback occurred. Do not infer candidate execution from a requested option or a hard-coded zero counter. Native playback is not proof of hardware decoding. Browser capability hints are not physical power measurements.

For each reference path, verify relevant startup, seek, EOF and teardown. Use the existing harness and one small independent output oracle. A new generic planner, telemetry platform or experiment dashboard is not a prerequisite.

## 4. Rank decisions, not R-numbers

Two rankings are necessary:

**Screen priority:** which next action can most cheaply resolve a consequential uncertainty?

**Qualification priority:** which promising mechanism has enough likely value to justify implementation hardening, wider tests and maintenance?

A worker-MSE capability query can have high screen priority while a worker-MSE rewrite has low near-term qualification priority. A small PCM-copy change can deserve an early screen without being the project's most important potential improvement.

### Assess these fields before each assignment

| Field | Required judgment |
|---|---|
| **Impact ceiling** | Route-changing; substantial operation; useful local stage; narrow specialty; or infrastructure. State the operation and users/content affected. |
| **Exposure** | Observed in current sources, plausibly relevant but unmeasured, or absent from the current workload. Never invent prevalence. |
| **Screen work** | Source audit, missing fixtures/oracle, coding boundaries, build/relink work, test execution and expected debugging. |
| **Positive qualification work** | Extra profiles, state transitions, browsers/devices, complete-path measurements and maintenance burden. |
| **Decision power** | Can this screen distinguish the proposed benefit from no benefit, or will it merely reconfirm a known primitive? |
| **Dependencies** | Existing assets, source provider, decoder surface, GPU, authorization flow, preview API or parser. |

Use qualitative estimates until the local build/test workflow has been measured. Do not attach invented speedup probabilities, completion-hour promises or a fixed rejection quota.

### Screen-work grades

| Grade | Meaning |
|---|---|
| **E0 — inspect/probe** | Existing source inspection, traces or an exact prerequisite query; no candidate implementation. |
| **E1 — localized runtime change** | One bounded JS/controller change or test extension with existing assets and oracle. |
| **E2 — localized native/integration change** | A small native patch plus matching rebuild, or a bounded adapter with several existing tests. |
| **E3 — architecture/fixture gap** | New stateful subsystem, difficult oracle, substantial codec/profile build work or unavailable specialized hardware. Usually defer implementation after preflight. |

An E0 rejection is cheap. An E0 success normally means only that the next test is possible.

## 5. Initial individual-screen queue

This is a **starting shortlist**, not an exhaustive audit of all R-cards. Research identities and source observations below are inherited from the supplied revision-2 plan and its cited reports. Resolve the current code and exact report before acting. `-A` and `-C` remain document aliases for conflicting report identities. [S1]

Ranks order the next useful investigation under a healthy relevant baseline. If an item has no applicable production operation, record that condition and continue. Do not invent a workload merely to fill the queue.

| Rank | Item / stable mechanism | Conditional impact | First honest action | Screen work | Positive qualification burden |
|---:|---|---|---|---|---|
| **1** | **R74 — packed-PCM staging bypass** | Small-to-moderate preparation saving; may be insignificant overall. | Profile the actual lossless branch; test one localized bypass if worthwhile. | E0 → E2 | Moderate: precision, ownership, rebuild and full sessions. |
| **2** | **R40 — obsolete application seek work** | Responsive scrubbing and fewer wasted reads/decodes. | Trace a real burst; patch one owner only if obsolete work escapes existing coalescing. | E0 → E1–2 | Moderate: final-target identity and cancellation. |
| **3** | **R01 — duplicate inspection/source work** | Startup/fallback improvement across affected opens. | Identify and reuse one identical, authorized inspection result. | E0 → E1–2 | Moderate-to-high if authority/lifetimes change. |
| **4** | **R02 — reuse useful startup work** | Avoid reopening/preparing the same candidate twice. | Demonstrate a concrete duplicated preparation step; prototype transferring that result, not a global broker. | E0 → E2 | High if ownership crosses backends. |
| **5** | **R242-A — unnecessary decoder-session boundaries** | Potential sustained/decode setup saving if unnecessary calls exist. | Audit configure/flush/reset calls across ordinary transport batches. Patch only a proven unnecessary operation. | E0; E1–3 if justified | High: predictive dependencies, drain semantics, seeks. |
| **6** | **R27 — immutable compiled-module reuse** | Repeated-open improvement where compilation actually repeats. | Measure compilation/instantiation separately and check browser/runtime reuse first. | E0 → E1–2 | Moderate-to-high: lifetime and memory. |
| **7** | **R48 — native cue virtualization** | Lower memory/work for unusually large simple-cue tracks. | Compare ordinary and large cue sets through an existing native-caption path. | E0 → E1–2 | Moderate: active cues and backward seeks. |
| **8** | **R04 — deliver useful mux bytes earlier** | Potentially substantial remux startup/refill saving. | Trace native emission, worker publication and append time without changing fragmentation. | E0 → E2–3 | High: timing validation, partial input and backpressure. |
| **9** | **R47 — avoid one application gather copy** | Transfer/memory improvement only where gather is material. | Identify a specific concatenation and test separate owned pieces if the existing pipeline can consume them. | E0 → E1–2 | Moderate-to-high: timing parser and ownership. |
| **10** | **R42 — bounded output-buffer reuse** | Fewer allocations on a churn-heavy path. | Count fresh buffers, then test one bounded pool with explicit return ownership. | E0 → E1–2 | High: asynchronous lifetime and stale generations. |
| **11** | **R34 — adaptive append batching** | Earlier useful output with acceptable steady-state overhead. | Compare policies on the same muxed samples and producer schedule. | E1–2 | Moderate-to-high: stalls, overhead and queue bounds. |
| **12** | **R09 — pass through already-compatible fMP4** | Eliminate redundant packaging for admitted input. | Check whether current Demuxe already preserves it; test a bypass only at a safe existing boundary. | E0 → E2 | High if timeline/track inspection is bypassed. |
| **13** | **R131 — use a truthful fMP4 seek index** | Substantial remote seek I/O saving on affected inputs. | Compare existing-index and missing-index paths, including all index acquisition/build work. | E0 → E2–3 | High: source identity and exact seek prerequisites. |
| **14** | **R274 — preserve/use truthful WebM Cues** | Substantial remote seek I/O saving on poorly indexed sources. | Check actual Cues availability and scan behavior; do not assume the experiment implemented an index generator. | E0 → E2–3 | High: byte mapping, stale indexes and cold costs. |
| **15** | **R72 — keyframe-only coarse previews** | Large potential saving for explicit coarse storyboards. | Use the real preview path if present; otherwise record the missing service before estimating integration. | E1–2 with service; E3 without | Moderate-to-high; does not qualify exact scrubbing. |
| **16** | **R73 — shared GOP work for exact previews** | Large potential saving for clustered requests. | Compare with the maintained persistent decoder, not separate process launches. | E2 with service; E3 without | High: dependency windows and interactive latency. |
| **17** | **R272 — rectangular VideoFrame copy** | Lower transfer cost when a consumer needs only a region. | Find a real full-frame copy followed by cropping; test actual decoder frames and formats. | E0 → E1–2 | Moderate-to-high: stride, subsampling and color. |

The ordering between near neighbors is intentionally revisable. For example, measured UI contention can promote worker MSE; a missing subtitle capability in most target media can promote embedded ASS extraction above small-copy work.

### Cheap prerequisite probes outside the patch queue

Run these alongside source triage when they can unlock a material branch of the campaign. Do not conduct heavy builds or scored benchmarks concurrently.

| Candidate | Cheap question | What a successful probe does **not** prove |
|---|---|---|
| **R05 / R136-C — worker-owned MSE** | Does the exact target origin/browser permit creation, transfer, attachment and basic output? | Correct production worker ownership, responsiveness or lower CPU. |
| **R06 / R176 — non-pthread asynchronous remux** | Are the required suspension/toolchain facilities usable with the pinned local environment? | A working FFmpeg demux/remux build, safe reentrancy or worthwhile complete-path cost. |
| **GPU/YUV candidates** | Are the actual APIs, formats and hardware output surfaces available? | Accurate color, reduced power, low-copy execution or sustained performance. |
| **Codec-preserving routes** | Does the real target configuration decode correctly? | Hardware acceleration or preservation of every subtitle/HDR/audio requirement. |
| **Verified partial-byte delivery** | Is there an actual authorized provider exposing verifiable subranges? | A working torrent/network integration or a latency advantage. |

Record these as prerequisite results attached to their exact items. Do not repeatedly rebuild/retest a shared missing prerequisite for every dependent card. Reopen the gate when its environment or implementation changes.

## 6. High-impact items that should not become accidental rewrites

Keep these visible. They can outrank the shortlist when a real workload warrants them, but their first action is estimating the missing work—not building the whole feature by default.

| Candidate | Why it can matter | Why positive qualification is slower | First decision |
|---|---|---|---|
| **Embedded ASS/fonts → maintained Native renderer** | Keeps required rich subtitles on an efficient video path. | Extraction, font ownership, timing, seek restore and cross-route identity. | Reuse existing extraction if available; otherwise price that adapter separately. |
| **ALAC/TrueHD or multichannel lossless adaptation** | Could avoid a more expensive full playback route for those sources. | Actual decoder/profile inclusion, fidelity semantics, channel layout, packaging and matching optional builds. | One codec/precision/layout at a time; never broaden admission from a host conversion alone. |
| **Retained audio/video transactions** | Avoids unnecessarily rebuilding valid playback during changes. | Commit/rollback, future data, configuration epochs and rewind across boundaries. | One transaction direction on an existing owner; defer a universal switching framework. |
| **Software YUV/GPU presenter** | Helps media that genuinely still needs software video decode. | Matching native output, pixel formats, color, subtitles, devices and timing. | Requalify an existing candidate before inventing another presenter. |
| **Non-pthread remux** | Could broaden deployment options. | New build/I/O behavior, cancellation and suspension semantics. | One real demux/read/seek/remux slice; do not port all of mpv as the screen. |
| **Exact codec restart/crop** | Less reprocessing for seeks or edits. | Codec-tool state, preroll, truthful metadata and output-boundary oracles. | One precisely admitted dependency window; no universal preroll constant. |
| **Virtual edits / cross-source prepared-work reuse** | Less repeated packaging or preparation. | Source authorization, stable byte mappings, configuration and cache invalidation. | One justified operation with first-construction costs included. |
| **Compressed-domain AAC/FLAC/JPEG operations** | Can replace decode/manipulate/re-encode for specific operations. | New parser/transform code, narrow codec tools, malformed input and independent output checks. | Verify the operation is needed and component evidence is exact; estimate integration before coding. |
| **Prepared tiles / alternative representations** | Selective decoding can help specialized visual workloads. | Preparation costs, new distribution contract and decoder/API constraints. | Treat as a prepared-media product decision, not an arbitrary-file playback optimization. |

Do not create an index generator, subtitle service or decoder-state system and still classify the task as a tiny runtime patch. Changing the necessary architecture changes its rank.

## 7. Per-item execution: six gates

### Gate 0 — Resolve identity and scope

Use a descriptive `stable_key`, exact report filename/hash, mechanism revision and legacy R-ID. Recover the relevant evidence rather than relying on previous conversational summaries. Check for reconstructed definitions, duplicates and incompatible meanings of the same number.

The earlier plan records collisions at R239–R245. In particular, **R242-A is continuous WebCodecs sessions; R242-C is an H.264 aspect-ratio metadata patch**. Do not transfer one result to the other. [S1]

For decoder-session work, do not conflate transport boundaries with required decoder resets. The earlier R69 audit rejected suppressing a same-configuration reset that had semantic purpose; a new continuity candidate must establish a different, genuinely unnecessary operation. [S1]

Write one sentence each for the hypothesis, admitted input, requested output, cheapest correct baseline and falsifier. If the original report is unavailable or ambiguous, use `IDENTITY_UNRESOLVED`; do not silently invent a replacement experiment.

### Gate 1 — Audit the real opportunity

Identify the exact production function, actual source/track owner, cost or capability gap, and final consumer. Check whether the mechanism already exists in Demuxe or the underlying runtime. Trace only enough to decide the next action.

For a local CPU optimization, a measured stage fraction can bound its possible benefit: if the stage is 2% of total measured CPU, removing 90% of it saves about 1.8% of total CPU **under unchanged surrounding work**. This calculation does not bound startup waiting, allocations, opaque OS/GPU work or other metrics. Evaluate those separately.

Optimize the cheapest correct complete path, not hardware usage as an end in itself. Software audio, a software video fallback, or a cheaper existing presenter can remain the right choice.

Do not kill an idea solely because whole-session CPU barely changes when the hypothesis concerns startup, peak memory or a newly supported file. Conversely, do not redesign the metric after seeing a disappointing result just to call it a win.

### Gate 2 — Choose the least costly faithful screen

Use an existing real-path test when possible. Otherwise choose a localized JS change, a small native patch with matching rebuild, or a prerequisite/component probe when real integration is too expensive.

Before coding, record an **effort envelope**: intended code boundaries, required artifact rebuilds, fixtures/oracles, primary comparison and stop conditions. This is a scope budget, not a predicted duration.

If the test unexpectedly needs another subsystem, stop and re-estimate. An E1/E2 assignment that becomes E3 returns to the queue as `DEFERRED_HIGH_COST` unless the new evidence justifies its promotion. Do not spend unlimited effort rescuing a low-priority hypothesis.

### Gate 3 — Run a minimal real-runtime screen

For a positive integrated screen, the candidate must execute through the relevant Demuxe public operation, real worker/runtime, required media output and teardown. A preconverted source or a host CLI is not a substitute for in-browser adaptation.

A default small screen uses an admitted deterministic fixture, a relevant edge case, an unchanged control, and one deliberate negative control. Add a representative real file when available; if absent, retain the synthetic-only limitation. These are proposed starting points, not proof of broad coverage.

Exercise startup, a relevant seek, EOF, cancellation/replacement and cleanup to the extent the patch can affect them. Required audio/subtitles/effects stay present. A functional test may deliberately force the candidate path, but retain an automatic-routing control. Silent fallback is not candidate success.

Measure the claimed operation and complete relevant work. Preserve raw results and actual build/configuration identity. A passing screen earns `PROMISING_RUNTIME`, not `QUALIFIED_PROFILE`.

### Gate 4 — Permit evidence-driven revision

A failed variant need not kill the underlying research idea. Diagnose what failed: mechanism, implementation, fixture, observer, environment or comparison.

Make a further code change only when there is a concrete explanation and a bounded next test. Keep the failing input/log and revision history. Rebuild affected native artifacts and rerun relevant correctness checks after each change. Rerun performance for the final implementation; do not combine correctness from revision C with speed from revision A.

Stop when the next revision requires disproportionate architecture work, the best plausible gain is immaterial to the target operation, the oracle cannot decide, or the results remain too noisy. State which candidate/profile was rejected and what evidence would justify reopening it.

### Gate 5 — Record and choose the next action

Record the verdict, scope, actual coding/build/test work and remaining uncertainty. Re-rank nearby items when a shared prerequisite, bottleneck or reusable harness changes.

Advance a meaningful survivor into integration/qualification promptly. **Do not wait to screen all 200+ before validating any winner.** Alternate exploration with deeper checks so the campaign produces usable results instead of accumulating promising prototypes.

## 8. Build strategy: amortize compilation, not correctness

### Rebuild only what changed

| Change | Research build approach | Required guard |
|---|---|---|
| Test-only or JS/controller patch | Use the normal source/generated-output workflow. No native rebuild merely because an R-ID changed. | Served files must match the recorded candidate, not cached old assets. |
| Small native patch with unchanged interfaces | Recompile affected sources and relink the appropriate engine using valid matching dependencies. | Record native source/configuration and emitted JS/Wasm hashes. |
| Native ABI/import/export or glue change | Rebuild the whole affected interface set. | Reject mixed glue/Wasm; verify worker expectations and manifests. |
| Compiler, dependency, configuration or feature-profile change | Rebuild all affected artifacts; use an isolated cache namespace. | Do not let an old object or optional build masquerade as the new profile. |
| Shipping candidate | Follow maintained clean-build and exact-package qualification rules. | Research incremental-build evidence does not substitute for release evidence. |

Compiler caching and unchanged dependencies can reduce work, but do not skip dependency invalidation. Record flags and source/configuration hashes. Reuse existing build scripts; proposed experiment switches in this plan are not existing Demuxe APIs or command-line flags.

### A shared research build is optional

Use a small batch—normally two or three localized compatible candidates—only when it reduces actual rebuild work and preserves isolated comparisons. This is a suggested operational cap, not a required architecture.

A new parser/profile, incompatible ABI, altered global ownership model or compile-time semantic change normally deserves separate artifacts. Prefer separate builds when runtime switches would distort code generation or cannot faithfully select the old behavior.

Do not add hundreds of production flags or build a general plugin framework before screening anything. A temporary harness configuration plus focused patches is sufficient.

### Three controls for switchable builds

```text
U: unmodified reference build
R0: research build with all candidate switches disabled
R1: same research build with only candidate A enabled
```

Compare **U versus R0** to detect shared scaffolding, code-generation, bundle-size or initialization changes. Compare **R0 versus R1** for the isolated toggle effect. Also report **U versus R1** as the practical candidate comparison.

If U and R0 differ materially, do not assume the toggle isolates the cause. Use separately built variants, reduce instrumentation or account for the contamination explicitly. Fresh sessions and declared cold/warm cache conditions must be comparable.

Record the **effective** switch state from the running worker/engine. A harness setting that never reaches Wasm is not an experiment. Keep experimental configuration internal; no default route promotion is implied.

### Scheduling

Independent source reviews, fixture preparation and result analysis may proceed concurrently in isolated workspaces. Do not share mutable working trees, object directories or runtime outputs between simultaneous builds.

Serialize scored performance runs on the test device. Pause competing native builds, test suites and other heavy work. Save device power state and environmental conditions. Parallel development is not permission to benchmark under uncontrolled contention.

## 9. What a fair fast measurement looks like

**Choose the primary outcome and a practical minimum worthwhile change before timing.** Express it in the relevant units: startup/seek latency, CPU seconds per operation, maximum live buffers, bytes fetched, or an added correct capability. There is no universal percentage threshold.

Keep source, selected tracks, output fidelity, display geometry/rate, requested action sequence and available features equivalent. Compare against the cheapest correct existing route, not automatically Software. Charge inspection, preparation, indexing, hashing, conversion, copying, worker coordination and teardown where they belong to the operation.

Use diagnostic runs for expensive hashes/capture and separate performance runs with lightweight counters. Measure observer overhead. Playback counters alone do not establish frame/sample identity; packet hashes alone do not establish timing, selected tracks or complete playback.

### Suggested measurement stages

| Stage | Starting protocol | Permitted conclusion |
|---|---|---|
| **Fast opportunity screen** | Correctness first; one warmup and a small rotated paired set, such as seven pairs, for the selected operation. Declare cold/warm state and preserve all runs. | An initial promising result, a clear scoped loss, a measured lack of opportunity, or uncertainty. |
| **Confirmation** | More independent pairs across several sources and fresh/warm sessions; use at least 30 pairs for consequential latency claims as a starting policy, increasing when variability requires it. | Better-supported magnitude and variability for the tested workload—not population-wide prevalence. |
| **Profile qualification** | Required fixture/action matrix, denied profiles, lifecycle and longer sessions; include all supported target configurations. | A scoped artifact/profile decision. |

Repetition counts are policies, not guarantees of statistical power. Do not present the maximum of seven runs as a meaningful p95. Do not equate “not statistically detected” with “no benefit.” If the uncertainty overlaps the worthwhile-change threshold, use `INCONCLUSIVE` or defer pending better measurement.

A rough prototype can lose because of incidental allocation or language overhead. That rejects its current implementation, not necessarily the mechanism. Record a specific plausible improvement and its cost; do not extrapolate a hypothetical optimized win as evidence.

**Do not automatically discard a simple 0.7% whole-session saving.** It may also reduce allocations or simplify code. Judge the complete observed value against risk and maintenance. Equally, a dramatic component percentage is not enough when the whole operation is unaffected.

## 10. Three worked assignment patterns

### A. R74: a good candidate for patch → build → measure

The prior source audit identified an actual packed-audio staging allocation/copy in `adaptation_frames()` and a narrow next gate: preserve the FIFO, precision/layout/timeline checks and planar/Opus behavior while testing only the packed-lossless branch. Its large reported percentage applied to a component model, not total playback. [S1, S2]

1. Reproduce an admitted lossless reference path and measure whether that staging work is material.
2. Patch only the packed-lossless branch. Validate S24 precision before any publication; retain bounded FIFO ownership and existing rejection behavior.
3. Rebuild the matching preparation engine, verify hashes and run exact-sample, ownership, seek/drain and cancellation tests.
4. Compare unchanged and candidate sessions, including setup and output work. Report stage and complete-path deltas separately.
5. If the result is useful, harden that patch. If not, preserve the variant and evidence outside the maintained runtime and close or defer it with the proper scope.

No complete audio-architecture redesign or arbitrary codec expansion is necessary to answer this question.

### B. R04: a promising parser primitive is not necessarily a cheap production patch

The prior worker audit recorded collection of emitted chunks, concatenation in `flush()`, and publication after native start/step calls, with additional timing and split-buffer responsibilities. Those boundaries make incremental delivery more than merely choosing a smaller JavaScript chunk. [S1, S2]

First trace whether useful bytes actually exist early enough and can be safely published. A synchronous native step, borrowed memory, required timing validation or missing incremental parser can defeat a superficial patch.

Keep fragmentation unchanged while testing delivery. Do not expose unvalidated output, pass borrowed Wasm views beyond their lifetime or disable timing checks. If a substantial native/worker/parser redesign becomes necessary, record the E3 cost and re-rank. Do not declare MSE's incremental parsing disproven simply because this Demuxe integration is expensive.

Only after the individual mechanism is supported should it be combined with batching, gather-copy removal or pooling.

### C. R131/R274: distinguish the benefit of an index from the cost of creating one

The prior plan records strong indexed-versus-unindexed seek observations, but explicitly notes that the WebM experiment retained existing Cues rather than implementing a production virtual-index generator. [S1]

First determine whether the actual source already contains a usable index and whether Demuxe/browser uses it. Then count **all** index retrieval/build bytes, startup work and the target seek. Measure both first-use and reuse cases.

Reading the entire file to build an index and then showing a small warm seek does not establish a cold-start byte saving. A warm repeated-seek benefit may still be real; label it correctly. If a new source-bound index service is required, do not price that as a small metadata patch.

## 11. Group survivors without hiding interactions

Form a workstream when survivors share a production owner, data contract or implementation dependency. Preserve every item's stable key and result. Separate unrelated operations even when both “avoid work.”

For two compatible survivors A and B, test:

```text
Reference / neither
A only
B only
A + B
```

Retain individual correctness checks in every relevant variant. Do not add the individual speedups to predict the combined result. For larger groups, use targeted combinations and leave-one-out comparisons rather than an unbounded 2^N matrix.

If A only becomes useful with B, record a **dependency-enabled combination**. Neither card inherits an individual win. An item that was individually uneconomic can be reconsidered when a new shared infrastructure cost is genuinely amortized.

Possible survivor groups include incremental mux delivery, retained-track transactions and a preview service. Related cards can supply additional test conditions even when their implementation variant was rejected. Rejected cards stay rejected for the recorded variant; test coverage is not promotion.

## 12. Extensive end-to-end qualification belongs here

A survivor is not ready merely because it played a fixture quickly. Qualification must exercise:

```text
Original authorized source
  → public Demuxe operation and actual admission
  → matching source reader / worker / native runtime
  → candidate transformation or reused representation
  → required video, selected audio, subtitles and effects
  → interactions, failures, recovery and teardown
```

### Required qualification matrix

| Dimension | Minimum requirement for the declared profile |
|---|---|
| **Artifact** | Exact source/diff and JS/Wasm/glue identity; clean final candidate build and installed-package check where distributed. |
| **Media** | Controlled positive/negative fixtures plus independent real media; relevant codec tools, B-frames, VFR, offsets, GOP boundaries, priming, layouts and metadata. |
| **User operations** | Startup, pause/resume, repeated and backward seeks, EOF/tails, source/track replacement and supported effects/subtitles. |
| **Failures** | Unsupported profile, truncated/malformed input, cancelled work, slow/failed source reads, stale generations, worker failure and recovery where applicable. |
| **Ownership** | No stale output, leaked live workers/frames, unbounded queues, cross-source/credential reuse or premature buffer recycling. |
| **Routing** | Candidate definitely executes when admitted; automatic selection and explicit modes stay truthful; denied cases reject or use a tested correct alternative. |
| **Value** | Repeatable complete-operation improvement or a useful added correct capability; include startup/preparation and steady-state costs. |
| **Targets** | Exact browsers/OS/devices stated. Physical GPU, HDR, surround or mobile claims require those actual targets. |
| **Duration** | Initial 100 bounded lifecycle cycles and 30-minute representative soak are starting screens; long-form/mobile support needs appropriate full-length, interruption and thermal checks. |

Define explicit fixture/action IDs and expected outcomes before calling the matrix complete. Select device coverage to match intended claims; do not demand every browser for a deliberately local profile, or claim portability from one laptop. An automated WebKit run is not physical Safari/mobile qualification.

Preserve all fidelity and source-authority guards. An exact digital PCM comparison does not establish preservation of object-audio metadata or physical speaker output. Reduced CPU is not a measured battery-life claim. Do not bypass DRM, authorization or browser/origin policy to make a route work.

A successful result is `QUALIFIED_LOCAL_PROFILE` with exact limits. Default-routing or release promotion remains a separate explicit decision.

## 13. Verdicts: fast decisions without false certainty

Keep **evidence level** separate from **disposition**. A candidate can have strong component evidence while its browser integration is blocked.

### Evidence level

`NONE` → `SOURCE_AUDIT` → `COMPONENT` → `REAL_RUNTIME_SCREEN` → `INTEGRATED_COMBINATION` → `QUALIFIED_LOCAL_PROFILE`

These are labels for what actually ran, not an obligation to execute every stage. A decisive source audit can close an item without a component rebuild.

### Disposition

| Disposition | When justified |
|---|---|
| `UNREVIEWED` | The item has not been examined. No implication about viability. |
| `IDENTITY_UNRESOLVED` | Missing/conflicting mechanism or report identity prevents a valid assignment. |
| `ALREADY_IMPLEMENTED` | Current code already implements the relevant behavior; cite the path. Qualification coverage may still need work. |
| `DUPLICATE` / `SUPERSEDED` | Another exact mechanism/result covers it; record the mapping and material differences. |
| `NO_CURRENT_OPPORTUNITY` | The supposed cost/capability gap is absent or immaterial in the audited target path. |
| `BLOCKED` | A specific required runtime, build, fixture, oracle or device is unavailable. Not a universal failure. |
| `DEFERRED_HIGH_COST` | The next honest test requires work disproportionate to currently justified value. |
| `INCORRECT_VARIANT` | This candidate violates the declared output/ownership/source contract. Preserve the counterexample. |
| `NO_MEANINGFUL_BENEFIT` | A fair, sufficiently informative equivalent-path comparison rules out the predefined useful improvement for the tested workload. |
| `INCONCLUSIVE` | Measurement, baseline, implementation quality or observation is insufficient to decide. |
| `PROMISING_RUNTIME` | Correct narrow real-runtime screen with a useful signal or new capability; wider qualification remains. |
| `COMBINATION_DEPENDENT` | Benefit is demonstrated only with explicitly named other mechanisms. |
| `QUALIFIED_LOCAL_PROFILE` | The stated artifact/profile passed its defined qualification and value gates. |

For every stop, say what changed condition would reopen it: new API, new source class, new shared infrastructure, smaller patch, better oracle or measurable bottleneck. Do not relabel a missing prerequisite as an optimization failure.

## 14. Evidence, patches and build inventory

Use existing repository conventions when available. The following is a **suggested layout**, not a claim these directories or commands already exist:

```text
research/local-screening/
  README.md
  inventory.jsonl
  queue.md
  builds/<build-key>/manifest.json
  items/<stable-key>/
    hypothesis.md
    runs/<run-id>/result.json
    runs/<run-id>/commands.log
    runs/<run-id>/raw/
    variants/<variant-id>.patch
  workstreams/<stable-key>/qualification.md
```

Keep evidence append-only by run. Record source/report hashes, actual flags and fixture IDs. Preserve meaningful failed variants as patches or immutable revisions even if their code is removed from the active research branch. Never delete the only reproducer while “cleaning up.”

A minimal JSON record follows; `null` means unmeasured or not yet assigned, not zero or pass:

```json
{
  "stable_key": "packed-pcm-staging-bypass",
  "legacy_ids": ["R74"],
  "report": {"filename": null, "sha256": null, "mechanism_revision": null},
  "hypothesis": "Remove redundant staging for already-packed admitted lossless audio.",
  "scope": {"source_profile": null, "requested_operation": null, "fidelity": null},
  "priority": {
    "impact": "conditional preparation-stage saving",
    "exposure": "unmeasured",
    "screen_effort": "E2",
    "qualification_effort": "moderate",
    "re_rank_reason": null
  },
  "baseline": {"git_sha": null, "diff_sha256": null, "build_key": null, "plan": null},
  "candidate": {
    "variant_id": null,
    "git_sha": null,
    "diff_sha256": null,
    "build_key": null,
    "runtime_hashes": {},
    "effective_switches": {}
  },
  "environment": {"browser": null, "os": null, "cpu_gpu": null, "origin": null, "power_state": null},
  "fixtures": [],
  "execution": {"candidate_observed": null, "actual_plan": null, "fallback": null},
  "checks": {"oracle_boundary": null, "correctness": null, "negative_controls": [], "lifecycle": null},
  "measurement": {
    "primary_metric": null,
    "worthwhile_threshold": null,
    "cache_protocol": null,
    "raw_runs": [],
    "uncertainty": null,
    "excluded_work": [],
    "observer_overhead": null
  },
  "effort_actual": {"code_boundaries": [], "builds": [], "new_oracles": [], "iterations": 0},
  "evidence_level": "NONE",
  "disposition": "UNREVIEWED",
  "limitations": [],
  "reopen_condition": null,
  "next_action": null,
  "survivor_workstream": null
}
```

A build manifest should separately capture toolchain/dependency/configuration hashes, compile/link commands, touched sources, interface versions and served artifact hashes. A result references that exact manifest.

## 15. Decision checkpoints and code promotion

After each item, update its disposition and the queue. After a small batch, review actual build/fixture costs and whether a survivor is ready for deeper qualification. Do not let completing the inventory become a reason to postpone every real improvement.

If a survivor is adopted into the next research baseline, record the baseline change. Results against the old baseline remain historical; remeasure overlapping candidates whose marginal benefit or correctness assumptions changed. Do not keep claiming a candidate's original gain after another optimization already removed the same work.

Keep candidate code behind internal experimental gates or in a dedicated worktree until admitted. Do not publish, tag a release, change licensing, broaden default routing or merge unrelated architecture work merely because the screening plan permits local tests. Follow separately granted repository-write permissions.

**Campaign success is measured by useful, defensible decisions and qualified improvements—not an arbitrary total of tested cards, closed tickets or green assertions.**

## 16. Copyable local-agent prompt

```text
Read Demuxe_Individual_Runtime_Screening_Plan.md revision 3.0. It supersedes
previous group-first execution instructions. Use earlier documents only as
historical evidence where this plan does not replace them.

Objective: find worthwhile Demuxe improvements with the least work needed for
an honest decision, then qualify the survivors through the actual runtime.

Do not execute every R-number in sequence and do not implement each broad
workstream in full. Inventory available items, resolve exact report/mechanism
identities, and keep unread/missing items explicitly unresolved.

Establish only the reference paths needed for the next candidate. Reuse existing
harnesses, exact assets and independent output checks. Do not first build a
general research framework.

Choose a high-impact, low-screen-cost item from the queue. Audit current code,
actual workload, baseline, prerequisites and observer before coding. If the
opportunity already exists, is absent, blocked, duplicated or too expensive,
record that scoped disposition and proceed. Do not invent a failure or success.

When a faithful patch is cheap, change the real JS/Wasm path, rebuild affected
artifacts, and run a small candidate-versus-reference comparison. Otherwise
use a prerequisite/component probe, explicitly labeled as such. Never call
preconverted media or a host FFmpeg script integrated browser qualification.

Price the full next step: coding, native relink/build, fixtures, oracle, debugging
and test runs. Set a scope envelope. If the patch becomes an architecture rewrite,
re-rank it rather than continuing indefinitely.

A shared research build may hold a small compatible set of candidates, but test
one change at a time. Verify an all-off build against an unmodified reference.
Record effective runtime switches and actual candidate execution. Use separate
artifacts when flags contaminate the baseline or interfaces differ. Serialize
scored performance runs and avoid competing builds on that machine.

Correctness comes before timing. Preserve selected A/V, required subtitles,
fidelity, timeline, source authorization, generations, fallback and cleanup.
Use an edge case, unchanged control and deliberate negative control. Silent
fallback is not candidate success. Native success is not hardware proof.

Measure complete equivalent work, charging preparation and cold costs. Pick the
primary metric and useful-change threshold before timing. Noisy small deltas
are INCONCLUSIVE, not automatically NO_MEANINGFUL_BENEFIT. A tiny stage win is
not a whole-player win, and a rough prototype loss is not a universal refutation.

Revise a candidate only when a failure has a concrete diagnosis and the next
attempt is bounded. Preserve failing variants. Rebuild and retest changed code;
never combine performance and correctness evidence from different revisions.

A favorable screen is PROMISING_RUNTIME. Group related survivors afterward and
test individual, combined and relevant leave-one-out variants. Keep per-item
attribution; record synergy as combination-dependent rather than individual wins.

Begin extensive E2E qualification for useful survivors without waiting to screen
all 200+ items. Use exact Demuxe artifacts, a defined fixture/action/device matrix,
real media, denied profiles, interactions, resource tests, repeated measurement
and appropriate long sessions. QUALIFIED_LOCAL_PROFILE must name its boundaries.

After each decision save the hypothesis, source/report/build/fixture hashes,
patch, commands, raw evidence, actual work, limitations and reopening condition.
Update the queue. Preserve meaningful negative results outside the active runtime.

Work autonomously within the authorized local checkout and scope. A blocked item
should not stall unrelated ready work. Do not publish, tag, change licensing or
promote default routes without separate authorization. Finish each session with
the decisions reached, artifacts changed and the next highest-value action.
```

## 17. Sources and revision boundary

**[S1] Prior planning document, directly reviewed for this revision.**

`Demuxe_Impact_and_Qualification_Priority.md`, revision 2.0, 18 September 2026.
SHA-256: `03dec2a6da1e0a5c63f068e5893938fb2267fbcac45489a4045fe31bd815f226`.

Relevant sections: shared groundwork; ranked queue; fair-verdict contract; detailed R74, incremental-delivery, index and preview assignments; experiment-identity collisions; source register. This revision changes sequencing, not the recorded laboratory findings. It does not repeat any laboratory measurements or establish a newly complete experiment inventory.

**[S2] Historical repository snapshot cited in S1 and reproduced in the conversation.**

Commit `9abfd1b22300cf273fc0bd1a8290261281c8f3f3`; not re-resolved as current by this revision. The local agent must identify its actual checkout and inspect current source before applying any source-specific statement.

- `src/internal/playback-plans.ts`: finite plans and profile/fidelity admission.
- `native/adaptation/flac.h`: codec/layout/precision guards, packed staging and FIFO ownership; recorded blob `cbd76973ce52be38ecd46dcbc12a293fcf900b56`.
- `web/native-remux-worker.js`: native emission collection, flushing and message/timing boundaries; recorded blob `8bf8d87204e3ad4bc77780708035b712a6c5a4fd`.
- `docs/RUNTIME-ASSETS.md` and `docs/RELEASE.md`: matching optional builds and final package qualification.

Pinned source locations for the local agent:

```text
https://github.com/Jagalite/demuxe/tree/9abfd1b22300cf273fc0bd1a8290261281c8f3f3
https://github.com/Jagalite/demuxe/blob/9abfd1b22300cf273fc0bd1a8290261281c8f3f3/native/adaptation/flac.h
https://github.com/Jagalite/demuxe/blob/9abfd1b22300cf273fc0bd1a8290261281c8f3f3/web/native-remux-worker.js
```

**Research references:** original reports are evidence inputs to retrieve by exact identity, not automatically present repository files. The prior plan lists their filenames and limitations. Resolve those reports before executing each assignment; do not reconstruct missing results from R-numbers or conversational enthusiasm.

**Final rule:** make the next trustworthy decision cheap. Keep individual hypotheses accountable, reuse legitimate setup, and spend extensive qualification effort only where the evidence justifies it.