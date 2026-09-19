# Demuxe — R353–R357 research proposals

Status: PROPOSED / NOT PLAYBACK-TESTED

This batch is source review, mathematical derivation, and experiment design. No media fixture, playback benchmark, matching Wasm build, production change, or route admission is claimed. Existing Native / Hybrid / Software admission and fidelity rules remain authoritative. These are additional Demuxe experiments, not claims of industry invention.

## R353 — Let browser-managed streaming windows control remux production

### Question and mechanism

Can the preparation pipeline cooperate with ManagedMediaSource demand signals instead of only changing its network-fetch policy?

ManagedMediaSource exposes startstreaming/endstreaming, and ManagedSourceBuffer exposes bufferedchange. Browser-managed eviction means that data once appended is not necessarily still resident. These are API primitives; their exact implementation must be qualified on the test browser. [S1, S2]

On endstreaming, stop initiating speculative reads, demuxing, and remux jobs, while finishing or safely retaining in-flight work at valid boundaries. On renewed demand, produce the required next presentation interval. Maintain distinct records for source availability, prepared media, and actual browser-buffer residency. Repair demanded missing intervals together with their decode dependencies; do not refill every evicted interval reflexively.

The objective is not to pause playback or change its quality. It is to avoid building data that remains unused or immediately gets evicted.

### First scope and comparison

Use immutable VOD with stable, already-qualified H.264/AAC packet-copy output. Keep track selection, media samples, fidelity, and resource limits fixed. Compare:

1. The current tuned ordinary-MSE route.
2. ManagedMediaSource with otherwise unchanged production.
3. ManagedMediaSource with production tied to demand and current residency.

Use one supported real browser/device initially. Synthetic demand/eviction traces can test scheduler logic but do not establish real browser eviction or energy behavior.

### Acceptance and negative controls

Require the same displayed picture sequence, audio sample timeline, seeks, end-of-stream, and cancellation behavior. Test demand arriving during a partial fragment, eviction after an earlier successful append, seeks into evicted regions, a temporarily slow producer, unequal track buffering, and stale events after teardown.

An endstreaming notification must not corrupt a fragment that has already begun delivery. Historical append records cannot substitute for current buffered ranges. Unsupported APIs remain a capability blocker, not a codec failure.

### Measurements and rejection

Measure complete-session CPU, prepared-but-unused bytes, request and worker activity, retained memory, startup, stalls, seek latency, and actual device energy where measurable. Do not equate fewer callbacks with battery savings. Reject if resumption spikes or repair work erase the savings, playback worsens, or the existing scheduler already captures the opportunity.

Relation: extends R34/R49/R239, but makes browser demand and eviction authoritative scheduling inputs rather than only selecting application-side batch sizes.

## R354 — Replace an oversized preparation heap while native playback continues

### Question and mechanism

Can a temporarily enlarged Wasm preparation instance be retired without reopening a healthy native presentation?

WebAssembly memory can grow, and the JavaScript memory interface rejects attempts to resize its backing memory downward. Freeing an allocation can make its space reusable internally without reducing the memory object's length. This does not prove any particular resident-memory saving from worker replacement. [S3]

Keep MediaSource, SourceBuffers, playback intent, source identity, and a validated sample index under a long-lived owner. Put only restartable packet-copy preparation in a replaceable worker with private memory.

At a committed output-fragment boundary, record an explicit continuation recipe: next sample ordinals, track configuration, timeline mapping, fragment identity, and source version. Move any necessary surviving payload into independently owned storage. Initialize a fresh worker, verify its first continuation output, then commit the switch and retire the old worker. Do not export opaque decoder pointers or a raw Wasm heap snapshot.

### First scope and comparison

Use an indexed, immutable, unencrypted source and stateless or explicitly reconstructible packet-copy fragment production. Do not begin with audio re-encoding, arbitrary demux state, or a source requiring an unknown predictor history.

First profile a real temporary preparation-memory peak. Compare keeping the instance, improving its allocation behavior, and replacing it at a safe boundary. Include the period in which both instances coexist.

### Acceptance and negative controls

Require unchanged packet selection, timestamps, initialization, decoded continuation, audio, and EOF. Verify the next sample is neither duplicated nor omitted. Test seeks during handoff, slow or failed replacement initialization, cancellation, stale old-worker output, source mutation, and repeated size spikes.

Crucial ownership restriction: never terminate the worker that owns the active MediaSource. The MSE specification explicitly distinguishes behavior when its owning worker terminates. The preparation worker must be a separate lifetime domain. [S1]

If the handoff cannot complete within the already-qualified playback budget, defer it or continue with the existing worker; do not force a reset merely to obtain a smaller heap.

### Measurements and rejection

Measure live Wasm lengths, reachable backing allocations, process memory with appropriate caveats, transient peak memory, initialization/read overhead, stalls, and long-session cost. Do not claim immediate OS reclamation. Reject if no real high-water problem exists, regular recreation causes churn, or keeping the existing instance is cheaper.

Relation: differs from R67's paused-player hibernation and R298's view compaction. This retires the preparation instance while the native presentation continues.

## R355 — Preserve native playback when an MPEG-TS track changes packet identifier

### Question and mechanism

Can a transport-level reassignment remain invisible to a healthy downstream playback track?

FFmpeg already provides merge_pmt_versions to reuse streams when an updated Program Map Table moves elementary streams to different packet identifiers. This is a qualification and integration investigation, not a new MPEG-TS demuxing algorithm. [S4]

Maintain a distinction between transport PID, logical source track, and output track ID. Permit identity preservation only for an admitted, unambiguous program/component transition with compatible codec configuration and continuing timeline. Real content or configuration changes still require their normal transition handling.

The pinned FFmpeg implementation can fall back to PMT-position matching and use position to disambiguate repeated component identifiers. Those heuristics must not be mistaken for proof of identity. [S5]

### First scope and comparison

Author one program containing continuous H.264/AAC access units, stable unique component descriptors, unchanged codec configuration, and a PMT update that changes PIDs at complete PES boundaries. Keep clocks continuous.

Compare the current route, the existing merge option, and a version constrained by explicit transition validation. Audit the production baseline before changing defaults.

### Acceptance and negative controls

Require the original ordered access-unit payloads, stable logical track intent, correct output timestamps, and uninterrupted reference-equivalent A/V continuation. Count application-visible resets but do not infer an identical internal native decoder solely from unchanged JavaScript objects.

Test reordered PMT entries, duplicated or absent component identifiers, two same-codec language tracks, a real codec-configuration change, late/incomplete PMT updates, stale old-PID packets, and truncated PES data. Ambiguous matching must remain unresolved or take a separately qualified recovery path. Do not suppress genuine track changes to make playback appear continuous.

### Measurements and rejection

Measure repeated setup, extra probing, remux reconstruction, stalls, lost/duplicated samples, and long-session memory. First prove an actual problem in the current route. Reject if it already handles the event correctly or if reliable identity cannot be established from the admitted source profile.

Relation: R65 selected a program and R220 interpreted transport clocks; this preserves logical identity across a transport address change.

## R356 — Repack independent stereo FLAC as mid-side using parity-state residuals

### Question and mechanism

Can stereo decorrelation be performed on prediction residuals without reconstructing both full-amplitude channels?

FLAC defines independent stereo and reversible mid-side stereo. Its mid channel uses a right-shifted sum, and its side channel needs an additional precision bit. Fixed predictors and residuals provide a precise restricted input profile. [S6]

For first-order independently coded channels:

rL[n] = L[n] - L[n-1]
rR[n] = R[n] - R[n-1]

Define e[n] = (L[n] + R[n]) mod 2, with e in {0,1}, including for negative sums. Then:

M[n] = (L[n] + R[n] - e[n]) / 2
S[n] = L[n] - R[n]

The parity state can be advanced without reconstructing L or R:

e[n] = (e[n-1] + rL[n] + rR[n]) mod 2

The output residuals are:

rM[n] = (rL[n] + rR[n] - e[n] + e[n-1]) / 2
rS[n] = rL[n] - rR[n]

The numerator for rM is even. The parity correction preserves the floor behavior that a naive average of residuals would lose. Convert the first warm-up samples into M[0], S[0], and e[0]; then Rice-encode the transformed residuals and construct truthful mid-side framing.

### First scope and comparison

Use 16-bit stereo, equal frame boundaries, first-order fixed predictors in both channels, and no wasted bits. Start with known valid fixtures. Compare against a fused, persistent decode/decorrelate/re-encode implementation restricted to the same predictor and entropy choices.

One input subframe may need to be retained while the other is parsed. This is not automatically a memory reduction, and entropy parsing and encoding remain required.

### Acceptance and negative controls

Require exact equality of decoded L/R samples and unchanged presentation/sample counts. Independently calculate M/S and their residuals from PCM, then compare against the candidate. Test negative odd sums, alternating parity, identical and opposite-polarity channels, extreme samples, short final blocks, partition changes, and inputs outside the admitted profile.

Use proven-safe integer widths and validate output residual ranges. Regenerate frame CRCs, frame-size information, and affected seek offsets. The decoded-audio digest can remain the same only because decoded L/R samples remain the same.

Higher fixed orders could extend the idea using the corresponding finite difference of the parity sequence, but require independent qualification. Arbitrary shifted LPC is outside this card's first profile.

### Measurements and rejection

Measure extraction, residual transformation, scratch storage, re-encoding, output bytes, and complete preparation/destination cost. Compare with leaving the input unchanged. Existing encoders may already choose a better channel assignment; correlated independent-channel sources may be uncommon. Reject when there is no useful size/decode tradeoff or preparation costs outweigh later savings.

Relation: unlike R224, which extracts a pre-existing mid channel, this constructs reversible mid/side residuals from independent stereo and explicitly repairs integer-rounding parity.

## R357 — Evaluate gain-only loudness changes from a sorted energy index

### Question and mechanism

Can many whole-program gain candidates be measured without rerendering audio or scanning every energy window again?

The reference loudness algorithm applies an absolute energy gate and then a relative gate based on the energy of retained windows. The pinned libebur128 implementation exposes these calculations and offers list and histogram representations. [S7]

Let E_i be the fully weighted energy of each original measurement window BEFORE absolute gating. For one positive amplitude gain g applied to every channel for the entire measured history, energies become g^2 E_i in exact arithmetic.

Let A be the absolute threshold expressed as energy. Original windows survive that gate when E_i >= A/g^2, using the pinned reference's boundary convention. Let mu_A(g) be their mean. The final source-domain threshold is:

tau(g) = max(A/g^2, 0.1 * mu_A(g))

The final integrated result comes from g^2 times the mean of E_i above tau(g), followed by the reference's energy-to-loudness conversion. Handle empty sets and g=0 explicitly.

Sort all E_i once, retain cumulative counts and energy sums, and answer each gate with a binary search plus a range-sum query. This removes a repeated linear scan of windows for the admitted global-gain operation.

### First scope and comparison

Use fixed-rate PCM, fixed channel weights and weighting filters, fixed window alignment and tail policy, and no clipping, quantization, dynamics, or time-varying gains. Evaluate gain candidates independently over the entire signal history, not as live gain steps applied to an already-running filter.

Compare against direct evaluation over cached window energies, independent gain/render/measure runs, and an optimized histogram implementation under the same requested precision. Do not compare only against an unnecessarily repeated full decode.

### Acceptance and negative controls

Check gate membership, retained counts, threshold calculations, energy means, and final loudness. Test long quiet regions, all-zero signals, barely audible material raised across the absolute gate, values exactly around both thresholds, gains below and above one, and empty accepted sets.

Critical cache rule: preserve windows below the original absolute gate. A conventional already-gated summary cannot answer future gain increases correctly.

Floating-point summation order and filtering can change rounding. Use stable/extended accumulation, a higher-precision oracle, and a direct-reference fallback for uncertain threshold decisions. No bit-exactness or standards conformance follows solely from the real-arithmetic identity.

The operation does not predict true peak, clipping, arbitrary remixing, changed filters, changed stem alignment, or automated gains. Gate changes can create discontinuities, so do not assume a unique normalization gain or blindly substitute a binary root search for query evaluation.

### Measurements and rejection

Measure first-pass filtering, energy retention, sorting/index construction, memory, per-query cost, and repeated-query break-even. Reject for one-off queries or when an existing compact analysis representation is equally effective.

Relation: R309 supports many stem-gain combinations but still changes individual window energies. This narrower global-gain case preserves energy ordering and removes repeated window scans while reevaluating both gates.

## Suggested first gates

| ID | Earliest useful test | Early rejection condition |
|---|---|---|
| R353 | Demand/eviction-aware packet-copy playback on one supported browser | Demand bursts or repairs worsen stalls or total work |
| R354 | Real preparation-memory peak followed by a verified worker handoff | Recreation does not reduce useful retained cost or causes playback churn |
| R355 | Continuous known media with one unambiguous PID migration | Current route already handles it or source identity is ambiguous |
| R356 | Independent integer oracle for parity-correct residual conversion | Source opportunity is rare or re-encoding erases savings |
| R357 | Gate-by-gate equality versus direct cached-energy queries | Precision handling or setup costs erase repeated-query benefit |

## Source register

References establish component primitives and existing behavior, not success of the proposed whole pipelines. Living documents must be mapped to the implementation actually tested. No latest-repository audit is claimed.

[S1] W3C Media Source Extensions 2, Working Draft 7 August 2026. ManagedMediaSource/ManagedSourceBuffer events, browser cleanup, and worker ownership. `https://www.w3.org/TR/2026/WD-media-source-2-20260807/`

[S2] Apple WWDC23, Explore media formats for the web. ManagedMediaSource fetching demand and low-power intent; historical introduction, not a complete current support matrix. `https://developer.apple.com/videos/play/wwdc2023/10122/`

[S3] WebAssembly JavaScript Interface, Memory API and memory-buffer resizing rules; consulted living document. `https://webassembly.github.io/spec/js-api/index.html`

[S4] FFmpeg formats documentation, MPEG-TS merge_pmt_versions option. `https://ffmpeg.org/ffmpeg-formats.html`

[S5] FFmpeg n7.1.1, libavformat/mpegts.c. merge_pmt_versions and find_matching_stream, including descriptor/position-based matching. `https://raw.githubusercontent.com/FFmpeg/FFmpeg/n7.1.1/libavformat/mpegts.c`

[S6] RFC 9639, FLAC, sections 4.2, 9.2.5, and frame/subframe precision and integrity rules. `https://www.rfc-editor.org/rfc/rfc9639.html`

[S7] libebur128 v1.2.6, ebur128.c. calc_relative_threshold, gated_loudness, block-energy collection, absolute threshold, and relative gate factor. `https://raw.githubusercontent.com/jiixyj/libebur128/v1.2.6/ebur128/ebur128.c`

## Work log

Reviewed the preceding proposals through R352. Read the primary references above and derived the residual-parity and gain-query equations. No claim is made that the broader project catalogue was exhaustively audited. Authored these cards. No audio/video generation, compiled prototype, browser playback, benchmark, repository edit, or background task was performed.
