# Demuxe
## Ranked local testing guide

**Individual runtime screening, then survivor qualification**  
Revision 3.1 · Regenerated 19 September 2026 · Local-agent execution plan

> **Screen individual ideas when the real-path experiment is cheap. Share setup and compatible builds. Group worthwhile survivors for extensive end-to-end qualification.**

This guide regenerates the agreed revision-3.0 screening plan. **The 17-item screening order is unchanged.** It replaces the earlier Word guide's group-first execution instructions; the older impact/qualification ranking remains historical context, not a second active queue. [S1–S3]

### The next work to do

Start with the highest-ranked unfinished item whose relevant baseline and prerequisites are available. The first four screens are **R74 → R40 → R01 → R02**. Do not implement a broad subsystem merely to complete a low-cost screen, and do not execute every R-number sequentially. [S1, §5]

| Lane | What belongs here | Permitted conclusion |
|---|---|---|
| Baseline | Verify the existing route, exact assets, observer and source authority. | A trustworthy reference, not a new optimization gain. |
| Individual screen | Audit one opportunity; make a bounded real-path change when justified; check correctness and complete cost. | A scoped stop decision or `PROMISING_RUNTIME`. |
| Survivor qualification | Integrate useful survivors; test interactions, failure cases, real media and intended targets. | `QUALIFIED_LOCAL_PROFILE` with explicit limits. |

### What this regeneration does not claim

No new Demuxe build, media test, benchmark, repository inspection or production change was performed for this document. It does not promote later proposal cards, overwrite laboratory results, or turn component observations into integrated passes. Repository-specific statements inherited from earlier plans must be rechecked against the actual local checkout.

The research catalogue contains reused R-numbers. **Rank identifies queue order; a stable mechanism plus exact source report identifies the experiment.** A matching number alone is insufficient.

### Reading map

Pages 2–4 establish the baseline and exact ranked queue. Pages 5–8 define bounded assignments and stop points. Pages 9–12 cover builds, measurement, qualification and verdicts. Pages 13–16 cover identity, the evidence record, the copyable agent handoff and provenance.

---
## 1. Establish only the baseline needed to start

Complete shared groundwork once per relevant runtime family. Reuse it until affected source, artifacts, fixtures or assumptions change. Do not delay an unrelated inexpensive screen until every player feature passes release qualification. [S1, §3]

| Order | Reference lane | Minimum starting evidence |
|---|---|---|
| **B0** | Actual build and trustworthy observations | Source revision and diff; served JS/Wasm/glue hashes; effective configuration; actual selected plan and output. Demonstrate detection of a wrong-output fault and reject a stale source generation. |
| **B1** | Existing Native/direct/remux | One working direct source and one relevant remux source. Keep a no-op control and force only eligible alternatives. |
| **B2** | Already-admitted lossless audio adaptation | Matching optional assets and an input inside the actual compiled/admitted codec, precision and layout profile. Required for dependent audio work, not unrelated screens. |
| **B3** | Existing external Native ASS and gain | One static and one stateful/animated subtitle case through the maintained renderer. Required for subtitle work or combined measurements. |

Record source identity, selected tracks, requested fidelity, accepted execution-plan ID, effective experiment settings and fallback. Verify startup, a relevant seek, EOF and teardown. A requested flag, a MIME probe or a hard-coded zero counter does not prove candidate execution.

**Baseline failures and candidate regressions are separate records.** A serious correctness or source-authority defect preempts optimization of the affected path. Existing-functionality success is baseline evidence, not an optimization gain.

### Local command preflight

Inspect the actual checkout before choosing test commands. These inventory commands do not build or qualify media by themselves:

```sh
git rev-parse HEAD
git status --short
node --version
npm --version
python3 --version
npm run
```

Read the checkout's dependency locks, `package.json`, `docs/RELEASE.md` and `docs/RUNTIME-ASSETS.md`. Select its maintained build, fixture and browser commands; record them exactly. Do not invent script names or assume a historical SDK pin is still current. Native/interface changes require the matching affected rebuild. [S1, §§3, 8, 17]

The earlier snapshot was `9abfd1b22300cf273fc0bd1a8290261281c8f3f3`. It is **historical**, not a revision verified as current by this regeneration. Earlier audio/profile limits, browser guards and defaults stay in force unless current code and new evidence justify a specific change.

---
## 2. Exact screening queue — ranks 1–9

**Preserved from revision 3.0, section 5.** This orders the next useful investigation under a healthy relevant baseline, not theoretical speedups or production readiness. Each item retains its own decision. [S1]

| Rank | Item / stable mechanism | First honest action | Work |
|---|---|---|---|
| **1** | **R74 — packed-PCM staging bypass** | Profile the actual lossless branch. Test one localized bypass only if that staging work is worthwhile. | E0 → E2 |
| **2** | **R40 — obsolete application seek work** | Trace a real scrub burst. Patch one owner only if obsolete work escapes existing coalescing. | E0 → E1–2 |
| **3** | **R01 — duplicate inspection/source work** | Identify and reuse one identical, authorized inspection result. | E0 → E1–2 |
| **4** | **R02 — reuse useful startup work** | Demonstrate one duplicated preparation step. Transfer that result rather than first building a global broker. | E0 → E2 |
| **5** | **R242-A — unnecessary decoder-session boundaries** | Audit configure/flush/reset across ordinary transport batches. Remove only a proven unnecessary operation. | E0; E1–3 if justified |
| **6** | **R27 — immutable compiled-module reuse** | Measure compilation and instantiation separately. Check existing browser/runtime reuse first. | E0 → E1–2 |
| **7** | **R48 — native cue virtualization** | Compare ordinary and unusually large cue sets through the existing native-caption path. | E0 → E1–2 |
| **8** | **R04 — deliver useful mux bytes earlier** | Trace native emission, worker publication and append timing without changing fragmentation. | E0 → E2–3 |
| **9** | **R47 — avoid one application gather copy** | Locate one material concatenation. Test separate owned pieces only where the consumer can accept them safely. | E0 → E1–2 |

### Effort grades

**E0 — inspect/probe:** source inspection, traces or an exact prerequisite query; no candidate implementation. **E1 — localized runtime change:** one bounded JS/controller change using existing assets and oracles. **E2 — localized native/integration change:** a small native patch and matching rebuild, or a bounded adapter using several existing tests. **E3 — architecture/fixture gap:** a new stateful subsystem, difficult oracle, substantial profile/build work or missing specialized hardware.

E0 success ordinarily means only that the next test is possible. An E1/E2 assignment that unexpectedly requires E3 work returns for re-estimation; it does not expand indefinitely under the original rank.

**Identity warning:** the R242-A item here means decoder-session continuity in the exact report cited by the screening plan. It does not mean every R242 proposal in the catalogue. Resolve report and mechanism before assignment.

---
## 3. Exact screening queue — ranks 10–17

The remaining ranks are also preserved from revision 3.0. Their possible benefits are conditional on an actual production operation and a fair comparison. [S1, §5]

| Rank | Item / stable mechanism | First honest action | Work |
|---|---|---|---|
| **10** | **R42 — bounded output-buffer reuse** | Count fresh buffers; test one bounded pool with explicit return ownership. | E0 → E1–2 |
| **11** | **R34 — adaptive append batching** | Compare policies on identical muxed samples and producer schedules. | E1–2 |
| **12** | **R09 — pass through already-compatible fMP4** | Check whether the current path already preserves it. Bypass packaging only at a safe existing boundary. | E0 → E2 |
| **13** | **R131 — use a truthful fMP4 seek index** | Compare indexed and missing-index paths, including all index acquisition/build work. | E0 → E2–3 |
| **14** | **R274 — preserve/use truthful WebM Cues** | Inspect actual Cues and scanning. Do not assume the lab built an index generator. | E0 → E2–3 |
| **15** | **R72 — keyframe-only coarse previews** | Use the real preview path if present; otherwise record the missing service before pricing integration. | E1–2 with service; E3 without |
| **16** | **R73 — shared GOP work for exact previews** | Compare with the maintained persistent decoder, not separate process launches. | E2 with service; E3 without |
| **17** | **R272 — rectangular VideoFrame copy** | Find a real full-frame copy followed by cropping. Test actual decoded-frame formats. | E0 → E1–2 |

### Cheap probes outside the patch queue

| Branch | Cheap prerequisite question | Still unproved after a positive probe |
|---|---|---|
| Worker MSE | Can the exact browser/origin create, transfer, attach and produce basic output? | Correct worker ownership, responsiveness and cost. |
| Non-pthread remux | Can the pinned toolchain/runtime perform the required suspension? | A real FFmpeg demux/read/seek/remux path. |
| GPU / codec destination | Are the actual API, format and source configuration usable? | Color fidelity, sustained output, hardware decoding and power. |
| Verified partial delivery | Is a real authorized provider exposing verifiable subranges? | End-to-end integration and latency benefit. |

Share prerequisite results by exact environment; do not repeat an unchanged missing gate for every dependent card. A blocked item does not stall unrelated ready work. Keep scored benchmarks and heavy builds serialized on the measurement device.

**Re-ranking is allowed only with a recorded reason:** a measured bottleneck, source demand, a changed dependency, or a materially different effort estimate. This regeneration assigns no new ranks to later cards.

---
## 4. Six gates for each investigated item

### Gate 0 — Resolve identity and scope

Record a descriptive stable key, legacy R-ID, exact report filename/hash and mechanism revision. Write one sentence each for the hypothesis, admitted input, requested output, cheapest correct baseline and falsifier. Missing or conflicting identity is `IDENTITY_UNRESOLVED`, not permission to invent a replacement test. [S1, §7]

### Gate 1 — Audit the real opportunity

Locate the actual production function, source/track owner, cost or capability gap, and final consumer. Determine whether Demuxe or its underlying implementation already avoids the work. Establish the relevant baseline before patching; use traces only to the extent needed for a decision.

Choose the metric the idea concerns. A tiny total-CPU change does not refute a memory or startup hypothesis; a faster isolated kernel does not prove faster playback. Do not change the success metric after seeing disappointing data.

### Gate 2 — Set an effort envelope

Name the intended code boundaries, rebuilds, fixture/oracle needs, primary comparison and stop conditions. Prefer an existing real-path test, localized JS change or small matching native rebuild. If the next honest step becomes an architecture rewrite, record `DEFERRED_HIGH_COST` and re-estimate rather than rescuing the idea indefinitely.

### Gate 3 — Run the smallest faithful runtime screen

Execute the relevant Demuxe public operation through the actual worker/runtime, required output and teardown. Start with an admitted deterministic fixture, a relevant edge case, an unchanged control and a deliberate negative control. Add representative real media when available; otherwise retain the synthetic-only limitation.

Exercise startup, relevant seeking, EOF, cancellation/replacement and cleanup as affected. Retain required audio, subtitles and effects. Forced-path tests are useful, but also keep an automatic-routing control. Silent fallback is not success of the candidate.

### Gate 4 — Revise only from a concrete diagnosis

Separate mechanism, implementation, fixture, observer, environment and baseline failures. A bounded revision is legitimate; retain the failed input, logs and patch. Rebuild affected artifacts and retest after a change. Never combine speed from revision A with correctness from revision C.

### Gate 5 — Record the decision and continue

Save evidence level, disposition, actual effort, scope, limitations and reopening condition. A useful real-runtime screen earns `PROMISING_RUNTIME`, not qualification. Move a worthwhile survivor into deeper checks promptly; do not wait to screen the entire catalogue.

**Scope containment:** no new planner, experiment dashboard, plugin framework, universal state broker or hundreds of production flags are prerequisites for answering one bounded question.

---
## 5. First assignments — localized work before architecture

### Rank 1 / R74 — packed-PCM staging bypass

Reproduce B2 using the actual admitted lossless branch and matching optional build. Measure the staging allocation/copy in its real context before editing. The bounded candidate removes redundant staging only for already-packed lossless input, preserves the FIFO and independent ownership, validates S24 precision before publication, and leaves planar/Opus behavior unchanged. [S1, §10A]

Use exact sample and sample-count checks, overwrite the source after the ownership handoff, reject invalid low bits, and exercise seek, drain, cancellation and teardown. Include preparation, muxing and destination audio work. A large modeled copy-stage percentage is not whole-player savings. Stop if the stage is immaterial or already bypassed.

### Rank 2 / R40 — obsolete seek work

Trace real rapid scrubbing before changing anything. Identify one owner that actually allows obsolete reads, preparation or decoding to escape cancellation/coalescing. Compare against the current persistent, already-coalesced route—not an artificial restart on every pointer event.

Check the final requested covering-frame identity, relevant audio alignment, backward movement, source changes, cancelled requests and late callbacks. Count total work and latency after the user stops moving. If existing coalescing already removes the opportunity, retain that evidence and close the item.

### Ranks 3–4 / R01 and R02 — share one result, not every state

For R01, identify one duplicated inspection result over identical authorized source bytes. Include source version, credentials and selected content in reuse eligibility. A cancelled consumer must not abort another live consumer.

For R02, demonstrate a specific startup result being discarded and rebuilt. Retain or transfer that result through an existing ownership boundary. Do not introduce a universal broker before the narrow comparison works. Paused readiness and actual presented A/V remain different observations.

For both, test changed source content, revocation, different tracks, partial preparation, cancellation, missing audio and failed-candidate fallback. Include first preparation and no-reuse controls. If success requires broad backend ownership changes, record the new E3 cost.

### Ranks 6–7 / module reuse and native cues

Separate compiled-module reuse from instantiation and live decoder state. Charge cold loading, compilation, retained memory and teardown. For cue virtualization, verify active cues at forward/backward seeks, overlapping cues and ordinary small tracks as well as unusually large sets. Do not remove formatting requirements to obtain a cheaper route.

---
## 6. Delivery, ownership and indexing assignments

### Rank 5 / decoder-session boundaries

Audit configure, flush and reset calls by their semantic purpose. Remove only an operation proved unnecessary for ordinary transport batching. The earlier audit rejected suppressing a same-configuration reset that had a real purpose. This is not a blanket instruction to avoid resets or drains. [S1, §§7, 10]

Use a continuing predictive stream, required end-of-stream drainage, configuration changes, valid random-access starts, seeks and cancellation. Record actual output and candidate execution. If preserving the session requires a new ownership architecture, re-estimate rather than treating the original E0 audit as implementation success.

### Ranks 8–11 / incremental delivery, gather copies, pools and batching

For R04, trace whether useful bytes exist before current publication. Record native emission, worker release, timing validation and append time separately. A synchronous native step, borrowed heap view or incomplete parser can make a superficial JS change invalid. Keep fragmentation unchanged for this first comparison. [S1, §10B]

For R47, remove only a demonstrated gather copy that the consumer can safely avoid. For R42, test one bounded pool whose return path is explicit. For R34, vary append batching over the same samples and producer schedule. Test each mechanism alone before combining them.

Across these screens, include moof/mdat/sample boundaries, reordering, partial delivery, backpressure, cancellation and source generations. Do not transfer shared Wasm memory or reuse a buffer while any consumer needs it. A buffered range is not proof of presented output; fewer messages or allocations is not automatically lower total cost.

### Ranks 12–14 / pass-through and truthful indexes

For R09, preserve source inspection, selected tracks, configuration and timeline semantics even when packaging is skipped. Direct playback is a mandatory control where it already meets the request.

For the R131 index-report identity and R274 Cues, measure first-use acquisition/build work as well as warm seeking. Check actual existing indexes before constructing any new service. The prior WebM result preserved existing Cues; it did not qualify a production index generator. [S1, §10C]

Test early/middle/late seeks, B-frame and GOP prerequisites, nonzero timestamps, variable frame rate, large offsets, stale indexes, wrong offsets, changed validators, short reads and 200-versus-206 behavior. Reading the entire file to build an index and reporting only a small later seek is not a cold-start byte saving.

**Stop boundary:** a new incremental parser, index generator or source-authority model is E3 work until scoped and justified, even if the first API probe was inexpensive.

---
## 7. Previews and high-impact conditional work

### Ranks 15–17 / preserve the requested preview contract

R72 qualifies an explicitly coarse keyframe storyboard, not exact scrubbing or normal-playback frame dropping. R73 reuses dependency work for clustered exact requests, measured against a persistent decoder. Do not delay the first interactive result merely to fill a batch.

R272 tests extraction from actual decoded frames, not only canvas-created RGBA frames. Exercise crop coordinates, plane strides, subsampling, visible/coded rectangles and color metadata. Compare the requested region against the same region from a complete-frame extraction.

For all three, include sparse distant targets, long GOPs, no-revisit controls, cancellation, concurrent playback and a slow consumer. Bound retained frames and prevent analysis from starving playback. Charge initial decoding, cache construction and any readback. With no real preview service, price that missing component honestly as E3. [S1, §§5–6]

### High-impact work remains visible, but is not an automatic rewrite

| Candidate family | First bounded decision | Why full qualification costs more |
|---|---|---|
| Embedded ASS and fonts | Can an existing extractor feed the maintained Native renderer? | Font ownership, shaping, cue restoration, destinations and source identity. |
| ALAC/TrueHD or multichannel lossless audio | Is one exact codec/precision/layout built and admitted? | Decoder inclusion, semantic fidelity, packaging and optional-runtime matching. |
| Retained track transactions | Can one transition direction use an existing owner? | Commit/rollback, configuration epochs and backward restoration. |
| Software YUV/GPU presentation | Can the existing candidate be reproduced on a real target? | Formats, color, subtitles, timing and device behavior. |
| Non-pthread remux | Can one real demux/read/seek/remux slice execute safely? | Build, suspension, reentrancy and cancellation. |
| Exact restart/crop or compressed-domain editing | Is the requested operation useful and the oracle decisive? | Codec state, malformed input, metadata and bounded numerical semantics. |
| Virtual edits, verified bytes and cross-source reuse | Is the provider/authority/data contract available? | Authorization, source versions, mapping and invalidation. |
| Prepared tiles or alternative representations | Is a producer-assisted media product actually wanted? | Preparation, distribution, new profiles and complete decode/presentation cost. |

A meaningful workload can justify re-ranking one of these above a small-copy optimization. Record the reason and the actual next-step burden; do not change the preserved starting order silently. Host-only conversion or a mathematical identity is not evidence that the new profile is admitted in Demuxe.

---
## 8. Build sharing and survivor combinations

### Rebuild only what changed, but rebuild everything affected

| Change | Appropriate research build | Required guard |
|---|---|---|
| Test or JS/controller only | Normal source/generated-output workflow. | Served assets match the candidate; no stale cache. |
| Local native patch, unchanged interface | Recompile affected sources and relink the correct engine. | Native configuration and emitted JS/Wasm hashes are recorded. |
| ABI, imports/exports or glue | Rebuild the complete affected interface set. | Reject mixed glue, workers, Wasm or manifests. |
| Compiler/dependency/profile change | Rebuild affected artifacts with isolated cache identity. | Old objects cannot masquerade as a new feature profile. |
| Shipping candidate | Maintained clean build and exact-package qualification. | Incremental research evidence does not replace release checks. |

Share locked dependencies, legitimate compiler caches and fixture setup. A small research build may hold two or three compatible localized candidates when that actually saves work. Use separate artifacts for incompatible interfaces, stateful parsers or compile-time semantics. [S1, §8]

### Three controls for switchable builds

```text
U   = unmodified reference
R0  = research build, all candidate switches disabled
R1  = same research build, only the selected candidate enabled
```

Compare **U vs R0** for scaffolding or code-generation effects, **R0 vs R1** for the toggle effect, and **U vs R1** for practical value. A material U/R0 difference contaminates the simple toggle interpretation; reduce scaffolding or use separate builds. Confirm effective switch state inside the executing worker/engine.

Keep mutable worktrees, object directories and runtime outputs isolated. Reviews and fixture preparation may proceed independently; scored benchmarks must not compete with builds or unrelated heavy tests on the device.

### Group survivors, not initial verdicts

For compatible survivors A and B, test neither, A only, B only, and A+B. Keep their individual correctness checks. Do not add percentages to predict combined gains. Use targeted combinations and leave-one-out tests for larger groups rather than an unbounded factorial campaign.

If A is useful only with B, record `COMBINATION_DEPENDENT`. A rejected variant does not become individually passed because its test supplies useful coverage for a workstream. When a survivor enters the research baseline, record the change and remeasure overlapping candidates whose marginal benefit changed. [S1, §§11, 15]

---
## 9. Measure complete equivalent work

Choose the **primary outcome and minimum worthwhile change before timing**: startup/seek latency, CPU seconds per operation, peak live storage, actual fetched bytes, or a useful added capability. There is no universal percentage threshold. [S1, §9]

Hold input, tracks, requested operation, fidelity, geometry/rate, origin, device conditions and feature requirements constant. Compare the cheapest correct existing route, not automatically Software. Charge reading, inspection, indexing, preparation, hashing, transformations, copies, messages, decoding, presentation and teardown to the operation that needs them.

| Outcome | Record | Avoid claiming |
|---|---|---|
| Startup / seek | First correct video and selected audio separately; target identity and required preroll/refill. | An early frozen image is sustained playback. |
| Compute | CPU seconds and wall time, with measured components and excluded services identified. | JS elapsed time is total system CPU. |
| Memory / ownership | Peak and steady live bytes, Wasm size, unique backing storage, queues, frames and workers. | Object counts equal physical-memory savings. |
| Source / preparation | Actual server bytes, useful/wasted bytes, derivative size, first build/index/cache costs. | Warm-cache byte savings also apply cold. |
| Presentation / energy | Correct outputs, late/dropped pictures, stalls, continuity; defined power instrumentation where available. | Native means hardware; a CPU delta proves battery life. |

### Staged measurement policy

**Fast screen:** correctness first, then one warmup and a small rotated paired set, such as seven pairs, for the declared operation. Save every run, configuration and cache condition. The result is an initial signal or scoped decision—not broad reliability.

**Confirmation:** more independent pairs across multiple files and fresh/warm sessions. At least 30 pairs is a starting policy for consequential latency claims; increase when variability requires it. Report paired differences, spread and uncertainty.

**Qualification:** the complete declared fixture/action/target matrix, denied profiles, lifecycle, longer sessions and exact installed artifact where distributed.

Counts are policies, not guarantees of statistical power. The maximum of seven runs is not a meaningful p95. An interval spanning the worthwhile-change threshold is `INCONCLUSIVE`, not automatically no benefit.

Run expensive hashes/capture in separate correctness sessions; measure observer overhead. Never combine correctness from one revision with performance from another. A prototype loss may reflect incidental overhead; it rejects that variant, not every conceivable implementation. A tiny simple improvement can still be worthwhile, while a large component percentage can be irrelevant to the full operation.

---
## 10. Extensive qualification — only for worthwhile survivors

A favorable screen is not a release decision. The survivor must run from the original authorized source through public admission, matching worker/runtime, required output, user actions, failures and teardown. [S1, §12]

| Dimension | Required evidence for the declared profile |
|---|---|
| Artifact | Exact source/diff and JS/Wasm/glue identity; clean final build; exact-package consumer check where distributed. |
| Media | Controlled positives/negatives and held-out real media; applicable B-frames, VFR, offsets, GOPs, configurations, priming, layouts and metadata. |
| User actions | Startup, pause/resume, repeated/backward seeking, EOF and unequal tails, track/source replacement, required effects and subtitles. |
| Failures | Unsupported/truncated/malformed input, delayed or failed reads, cancelled work, stale generations, worker failure and scoped recovery. |
| Ownership | No stale publication, leaked live resources, premature reuse, unbounded queues or cross-source/credential cache contamination. |
| Routing | Candidate is observed when admitted; automatic selection stays truthful; denied cases reject or use a tested correct alternative. |
| Value | Repeatable complete-operation benefit or useful new correct capability, with cold and preparation costs included. |
| Targets | Name the actual browser, OS, device and source profile. Physical GPU, HDR, multichannel or mobile claims require those targets. |
| Duration | Start with 100 bounded lifecycle cycles and a 30-minute representative soak; add full-length/interruption/thermal tests for intended long-form or mobile use. |

Define fixture/action IDs and expected outcomes before marking a matrix complete. Do not require every browser for a deliberately local profile; do not claim portability from one laptop. An automated WebKit run does not qualify actual Safari or a physical iPhone.

### Non-negotiable boundaries

Retain selected audio and required subtitles, authored timing and display semantics, fidelity permissions and source authority. Lossy conversion, channel reduction, reduced frame rate, approximate previews and prepared representations each need their own explicit output contract.

Exact digital PCM does not prove object-audio metadata or speaker-output preservation. A source-level API or host component does not establish the built browser route. Missing APIs, assets, fixtures, or devices remain blockers; do not bypass origin, authorization or DRM restrictions.

### Promotion

A successful local result is **`QUALIFIED_LOCAL_PROFILE`**, naming artifact, admitted inputs, operations, targets, fallback and rollback behavior. Default-routing changes, publication, tags, licensing changes and unrelated architecture work require separate authorization.

Promote a survivor into deeper checks as soon as it is useful. The campaign should produce trustworthy decisions and usable improvements—not an arbitrary count of green cards.

---
## 11. Keep evidence level separate from disposition

A component can have strong evidence while its browser integration is blocked. Never convert one axis into the other. [S1, §13]

**Evidence levels:** `NONE` → `SOURCE_AUDIT` → `COMPONENT` → `REAL_RUNTIME_SCREEN` → `INTEGRATED_COMBINATION` → `QUALIFIED_LOCAL_PROFILE`. These name what actually ran; they do not require every stage to be executed.

| Disposition | Meaning |
|---|---|
| `UNREVIEWED` | Not examined; no implication about viability. |
| `IDENTITY_UNRESOLVED` | Missing or conflicting card/report identity prevents a valid assignment. |
| `ALREADY_IMPLEMENTED` | Current code implements the mechanism; cite its location. Coverage can still be incomplete. |
| `DUPLICATE` / `SUPERSEDED` | Exact mapping and material differences are recorded. |
| `NO_CURRENT_OPPORTUNITY` | The assumed cost or capability gap is absent or immaterial in the audited path. |
| `BLOCKED` | A required runtime, build, fixture, oracle or device is unavailable; not a universal failure. |
| `DEFERRED_HIGH_COST` | The next honest test costs more than currently justified value. |
| `INCORRECT_VARIANT` | This revision violates output, ownership or source contract; preserve its counterexample. |
| `NO_MEANINGFUL_BENEFIT` | A fair, sufficiently informative comparison rules out the predeclared useful change for this workload. |
| `INCONCLUSIVE` | Noise, baseline, implementation or observation cannot support a decision. |
| `PROMISING_RUNTIME` | A correct narrow real-runtime screen shows a useful signal or capability; wider checks remain. |
| `COMBINATION_DEPENDENT` | Benefit is demonstrated only with explicitly named mechanisms. |
| `QUALIFIED_LOCAL_PROFILE` | This artifact/profile passed its defined correctness, value and target gates. |

For every stop, record the reopening condition: changed API/device, new source demand, a smaller patch, better oracle, shared infrastructure or a measurable bottleneck.

Do not label a source-only or host-only observation `PROMISING_RUNTIME`. Do not turn a request to test a batch into evidence that it was run. Preserve meaningful failed variants outside the active runtime rather than deleting their only reproducer.

---
## 12. Identity, rank changes and later research

**The active order is the 17-screen queue on pages 3–4.** B0–B3 are baseline lanes, not competing optimization ranks. The older revision-2 grouped work order does not require finishing every group before screening an individual idea. [S1–S3]

### Minimum stable identity

```text
stable_key: descriptive mechanism, not just an R-number
legacy_ids: preserve the original labels and any source aliases
report: exact filename + SHA-256 of the report actually used
mechanism_revision: the precise hypothesis being tested
output_contract: exact, bounded approximation, or requested alteration
fixture_identity: source hash, profile, tracks and authority
candidate_identity: source/diff/build/runtime hashes
```

### Known ambiguity that affects this queue

The source screening plan's **R242-A** means continuous WebCodecs sessions; its **R242-C** means an H.264 aspect-ratio metadata patch. The current conversation also used R242 for GPU-side Hap/Snappy decompression. These are different mechanisms and cannot share a success verdict. [S1, §7; C1]

Likewise, queue **R131** means the fMP4 seek-index experiment named in the planning source, while this conversation also used R131 for automated representation search. Queue **R272** names the rectangular-copy report identity; the later R319 proposal is related, but is not interchangeable without checking the exact scope and source.

The original guide additionally recorded reconstructed-continuity batches and gaps in recovered evidence. Keep both histories; do not choose a definition merely because its timestamp is newer. If the exact source report cannot be recovered, leave the queue item `IDENTITY_UNRESOLVED` and move to the next ready item.

### Later cards do not silently displace the agreed ranking

The conversation's later proposal series extends through R366, with gaps and reused identifiers elsewhere in the project. This is not a verified inventory of 366 distinct completed experiments. Later proposals, batch requests and laboratory reports must enter the inventory under their exact identities and actual evidence levels.

R363–R366 were supplied here as proposals, not new integrated-runtime results. This regeneration assigns them no rank. Likewise, no earlier failed, blocked or component-only variant is upgraded by appearing in a related workstream.

When actual measurements justify a change, record old rank, new rank, reason, source evidence and affected baseline. If one adopted mechanism already removed another candidate's cost, remeasure the latter's marginal effect instead of retaining its old headline gain.

**General safeguard:** use the source report's exact title and contract, not enthusiasm from a previous shortlist, to authorize the next local test.

---
## 13. Evidence record and local handoff files

Use existing repository conventions where available. The following layout is suggested, not a claim that these paths or scripts already exist. Keep run evidence append-only. [S1, §14]

```text
research/local-screening/
  README.md
  inventory.jsonl
  queue.md
  builds/<build-key>/manifest.json
  items/<stable-key>/hypothesis.md
  items/<stable-key>/variants/<variant-id>.patch
  items/<stable-key>/runs/<run-id>/result.json
  items/<stable-key>/runs/<run-id>/commands.log
  items/<stable-key>/runs/<run-id>/raw/
  workstreams/<stable-key>/qualification.md
```

### Minimal result template

`null` means unmeasured or unassigned, never zero or passed. Add fields when the specific contract requires them.

```json
{
  "stable_key": "packed-pcm-staging-bypass",
  "legacy_ids": ["R74"],
  "screen_rank": 1,
  "report": {"filename": null, "sha256": null, "revision": null},
  "hypothesis": "Bypass redundant staging for admitted packed lossless PCM.",
  "scope": {"input_profile": null, "operation": null, "fidelity": null},
  "baseline": {"git_sha": null, "diff_sha256": null, "build_key": null},
  "candidate": {"variant_id": null, "build_key": null,
                "runtime_hashes": {}, "effective_switches": {}},
  "environment": {"browser": null, "os": null, "cpu_gpu": null,
                  "origin": null, "isolation": null, "power_state": null},
  "fixtures": [],
  "execution": {"candidate_observed": null, "actual_plan": null,
                "selected_tracks": null, "fallback": null},
  "checks": {"oracle_boundary": null, "correctness": null,
             "negative_controls": [], "lifecycle": null},
  "measurement": {"primary_metric": null, "worthwhile_threshold": null,
                  "cache_protocol": null, "raw_runs": [],
                  "uncertainty": null, "excluded_work": [],
                  "observer_overhead": null},
  "effort_actual": {"code_boundaries": [], "builds": [], "iterations": 0},
  "evidence_level": "NONE",
  "disposition": "UNREVIEWED",
  "limitations": [],
  "reopen_condition": null,
  "next_action": null,
  "survivor_workstream": null
}
```

The referenced build manifest records toolchain, dependency/configuration hashes, compile/link commands, interfaces and served artifact hashes. Preserve candidate patches or immutable revisions, including meaningful failures. A summarized verdict without its actual commands, raw observations and identity is not a reproducible handoff.

---
## 14. Copyable local-agent prompt

Read `Demuxe_Ranked_Local_Testing_Guide.md`, revision 3.1. It regenerates revision 3.0's individual-screening workflow and preserves its exact 17-item queue. Earlier group-first execution instructions are historical context, not the active campaign strategy.

**Objective:** find worthwhile Demuxe improvements with the least work needed for an honest decision, then qualify useful survivors in the actual runtime. New idea generation is not part of this assignment.

Inventory available cards and reports. Resolve stable mechanism, exact report/hash, revision, legacy IDs and output contract before assignment. R242-A in this queue means decoder-session continuity; do not substitute an unrelated R242. Missing evidence stays unresolved. Do not run every R-number in sequence or fabricate a canonical definition.

Establish B0 and only the relevant B1–B3 baselines. Use current source, maintained harnesses, matching optional assets and an independent output check. Do not build a generic research framework. Keep pre-existing failures separate from candidate regressions.

Start with the highest-ranked unfinished ready item: R74, R40, R01, R02, R242-A, R27, R48, R04, R47, R42, R34, R09, R131, R274, R72, R73, R272. Record any evidence-driven re-ranking explicitly. An unrelated ready item may proceed when another is blocked.

Audit the real opportunity before coding. If it is already implemented, absent, duplicated, blocked or too expensive, record that scoped disposition and continue. When a faithful patch is cheap, change the real JS/Wasm path, rebuild affected artifacts and run a small candidate-versus-reference screen. A host script or preconverted fixture is not integrated adaptation evidence.

Set a scope envelope covering code boundaries, rebuilds, fixtures, oracle, comparison and stop conditions. Re-estimate an assignment that becomes an architecture rewrite. Revise only from a concrete diagnosis; preserve failed inputs and variants. Rebuild and retest each materially changed revision.

Share compatible build setup, not success verdicts. For switchable builds compare U, R0 and R1, verify effective settings in the executing engine, and report the practical U/R1 comparison. Use separate artifacts when scaffolding or interfaces contaminate the baseline. Serialize scored runs and pause competing builds.

Correctness precedes timing. Preserve selected A/V, required subtitles, fidelity, timing, authority, source generations, fallback and cleanup. Include an edge case, unchanged control and deliberate negative control. Silent fallback is not candidate success; Native output is not hardware proof.

Declare the primary metric and worthwhile-change threshold before measuring. Charge complete equivalent work, including cold preparation. Preserve raw paired runs and uncertainty. Noisy small deltas are inconclusive, not automatically no benefit. A modeled stage improvement is not a whole-player gain.

A favorable screen is `PROMISING_RUNTIME`. Group related survivors afterward; test individual and combined effects without adding percentages. Begin deeper qualification before screening the whole catalogue. `QUALIFIED_LOCAL_PROFILE` must name the exact artifact, source profile, actions, targets, fallback and remaining limits.

Save identity, patches, commands, raw evidence, actual effort, limitations and reopening conditions after every decision. Finish with decisions reached and the next ready action. Do not publish, tag, change licensing, broaden default routes, remove existing guards or merge unrelated architecture work without separate authorization.

---
## 15. Provenance, preservation and completion boundary

### Planning sources directly read for this regeneration

**[S1] `Demuxe_Individual_Runtime_Screening_Plan.md` — revision 3.0, 18 September 2026.** Library path: `/Demuxe/Demuxe_Individual_Runtime_Screening_Plan.md`. This is the authority for the active workflow, B0–B3 lanes, 17 ordered screens, E0–E3 grades, build controls, verdict vocabulary, survivor policy and agent instructions. The complete extracted text was reviewed.

**[S2] `Demuxe_Impact_and_Qualification_Priority.md` — revision 2.0, 18 September 2026.** Library path: `/Demuxe/Demuxe_Impact_and_Qualification_Priority.md`. Its impact-versus-total-effort rationale and original grouped queue were reviewed. Revision 3.0 explicitly superseded its group-first execution strategy. It remains context, not a second mandatory order.

**[S3] `Demuxe_Ranked_Local_Testing_Guide.docx` — revision 1.0, 18 September 2026.** Library path: `/Demuxe/Demuxe_Ranked_Local_Testing_Guide.docx`. Its extracted 19-page text supplied the original document purpose, historical source register, known identity collisions and broader qualification safeguards. Its old workstream-first sequencing is superseded.

**[C1] Supplied Demuxe conversation and proposal attachments.** Used only to preserve the distinction between current proposal labels and the planning sources' report identities, and to note the proposal-only boundary of the latest R363–R366 batch. Later proposals are not automatically promoted into the ranked screen queue.

### What changed in revision 3.1

The agreed plan is now packaged as a Word guide and matching Markdown handoff. The 17 ranks are retained; screening and release qualification are visibly separated; operational instructions, ownership tests, evidence templates and the copyable agent prompt are consolidated. R-number collision warnings are carried forward and made explicit where they affect the active queue.

This is a regenerated document, not a byte-for-byte copy of either earlier artifact. The guide was reconstructed from the readable planning records; original-file digests were not recomputed. The local agent must hash the exact reports and runtime artifacts it actually uses.

### What remains unchanged

Correctness before timing. Real Demuxe/Wasm execution for integrated claims. Matching builds. Cheapest correct complete baseline. Selected tracks and fidelity preserved. Negative controls and source authority. Bounded ownership and cancellation. Separate evidence level and disposition. No success claim for missing prerequisites. No default-route or release promotion without authorization.

### Coverage limits

This regeneration does not reread every research report or reconcile all later test outcomes. It assigns no completion percentage and no new performance numbers. A report mentioned in a prior plan is an evidence dependency to retrieve, not proof that it is mounted in the local checkout or that its result matches the current proposal bearing the same R-number.

**First local action:** perform B0, establish the relevant baseline for rank 1, and audit whether packed-lossless PCM staging remains a material opportunity. Record a scoped decision, then proceed to the next ready item. Do not wait for a comprehensive catalogue audit before performing that bounded inspection.

**Campaign success:** useful, reproducible decisions and qualified improvements—not an arbitrary number of tested ideas.
