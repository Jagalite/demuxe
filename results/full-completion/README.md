<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Demuxe: is each idea worth further pursuit?

The bounded decision campaign is complete: **425 stable records have an explicit decision**, covering **392 named mechanisms plus 33 missing definitions**. This follows the clarified endpoint, “Enough to see if it’s worth it for further pursuit.” It is not completion of 392 implementations or experiments.

| Decision | Records | Meaning |
|---|---:|---|
| Pursue | **34** | Enough evidence or a concrete design/testing need to justify a next bounded investment; not necessarily a speedup |
| Stop for current profile | **93** | No demonstrated benefit, a cheaper alternative, or an unsuccessful tested variant; reopening conditions remain |
| Already implemented | **13** | Preserve the existing behavior rather than implement it again |
| Deferred setup/prerequisite work | **247** | Investigation requires additional machinery, representative inputs, or an unmet value prerequisite; scientific outcome remains unresolved |
| Environment hold | **5** | The required destination or observation is unavailable in the tested profile |
| Missing definition | **33** | R76–R81, R247–R260, R276–R288; no experiment can be invented for an undefined mechanism |

**53 records received follow-up decisions; 372 prior individual assessments were retained.** All 443 distinct evidence files referenced by the prior ledger were rehashed successfully. Reused IDs retain their separate full keys.

- [All 425 decisions, reasons, evidence levels and links](ALL_ITEMS.md)
- [The 34 recommendations for further pursuit](PURSUE.md)
- [Latest machine-readable decisions](decisions-latest.json)
- [Append-only decision history](completion.jsonl)
- [Coverage and unchanged-checkout verification](validation.json)
- [Probe inventory and canonical results](probe-inventory.json)
- [Reproduction and remaining work](REPRODUCE.md)

## Most useful results

| Idea | Observed result | Recommendation and limit |
|---|---|---|
| R27 compiled-module reuse | Existing local startup comparison reported 14.10% savings; 95% interval 9.89–18.39% | Pursue ownership/cache correctness next; the original 10% performance gate remains inconclusive |
| R26 event/deadline remux scheduling | Paused callbacks **24 → 1** over 1.2 seconds; seek, source-change rejection and cleanup passed | Pursue this one-owner change; no CPU measurement |
| R49 rate-aware lookahead | At 0.5x, buffered media **5.504 → 3.008 seconds**, initial fetched bytes **2,359,296 → 1,572,864**; actual 4x after seek asserted | Pursue bounded preparation; no universal fast-playback benefit |
| R3 adaptive read windows | Initial paused preparation used **36 → 10 requests**, with **2,359,296 → 2,424,832 bytes**; full observed trace **73 → 24 requests**, but **4,784,128 → 5,701,632 bytes** | Pursue a request-latency/extra-byte tradeoff. Larger windows can overfetch; this is not metadata-indexed coalescing |
| R59 selected MP4 track view | Metadata-only track view selects the correct alternate tone; selected packets and mdat remain identical; both moov layouts seek/finish | Pursue strict bounded track metadata editing. Selected tkhd must also be enabled; hiding other tracks alone failed |
| R215 stride-aware upload / R24 raw VideoFrame | Exact SDR checkerboard pixels; presenter JavaScript row-copy bytes **120 → 0**; raw VideoFrame matched | Pursue the smaller presentation change; HDR/general color and driver copies remain outside evidence |
| R57 native six-channel FLAC | Six independent channel identities preserved through direct and MSE playback; deliberate downmix rejected | Pursue explicit multichannel capability with a channel contract; physical speakers not tested |
| R41 simple SRT | Strict plain-SRT adapter matched reference VTT through five seeks on actual direct/remux routes | Pursue a restricted adapter; styled/embedded SRT was not qualified |
| R5/R136/R137 worker-owned MSE | Actual transferred MediaSourceHandle and compressed-buffer detachment; marked A/V, seek, malformed input and cleanup checks | Technically viable; UI/CPU advantage remains unmeasured |
| R88 native HLS / R115 open fMP4 URL | Native byte-range HLS played/seeked. Open native fMP4 produced A/V before response EOF with a longer initial fragment; shorter initial fragment waited for EOF | Pursue only with an explicit buffering/latency contract |
| R12 browser Opus | Browser encoding/decoding preserved marked stereo tones; 48,648 output samples for 48,000 input | Pursue a scoped adapter/cost comparison; **648 tail samples need trimming** |
| R202 guarded IDCT arithmetic | Exact pinned scalar baseline match on **85,536** corner/random blocks under UBSan; out-of-bound guard controls rejected | Pursue real coefficient admission-rate/cost measurement; no SIMD or decoder speedup established |

## Useful negatives and existing behavior

- **VP9 superframe normalization (R332):** existing aggregate packet submission already reproduced all independent reference pictures/timestamps. Splitting added six submissions without repairing output. Removing hidden dependencies produced wrong pixels. Stop the global normalization change for this profile.
- **Test-set reduction (R171):** 13 witnesses distinguished observed route plans, but missed unauthorized-lossy and discarded-subtitle mutations caught by the full pool. Use as a supplement, never replacement coverage.
- **WebM lacing (R110):** Chrome rejected Xiph-laced Opus. Existing Demuxe remux repaired it with **101 identical packet payloads, exact decoded PCM and preserved 648-sample trim**. No new unlacing subsystem needed here.
- **Failure reduction (R158):** reducing 49 lace groups to one preserved the same specific Chrome parser failure, while the unlaced positive control played. A concrete reason to pursue a structure-aware reducer.
- **WebM duration signaling (R125/R112):** VP8 with truthful DefaultDuration exposed one frame from the first block; the same-size metadata removal did not. Maintained VP9 output already had duration metadata. This supports regression protection, not invented VFR durations.
- **Partial MP4 delivery (R134):** both the complete-first-video-sample and 37-byte-truncated cuts produced no early picture in the muxed A/V fixture. Both completed after the remaining data arrived.
- **Native remote indexes (R131/R141):** all 20-second seek variants reached identical target pixel hashes. Global sidx saved about 360 KB on this fixture; removing mfra after sidx made no additional difference. Do not extrapolate to large network assets.
- **Early native target (R66):** loadedmetadata versus loadeddata target seeking fetched identical bytes here. Single-run timing differences were not promoted into a performance claim.
- **Copied held frame (R124):** copied I420 survives decoder closure exactly, but adds copying without evidence of decoder-surface pressure. Retain current bounded ownership until such pressure is observed.

## What remains unresolved

The 247 setup/prerequisite deferrals are **not negative experimental results**. Each retains its individual source/code rationale and next test in the full catalogue. No new broker, custom decoder port, large corpus, service, broad build matrix or production integration was introduced merely to make a row look finished.

Concrete follow-up blockers include missing compiled libass assets for R21 and its R22 owner-transfer dependency; a fixed physical display/compositor observation for R169 and R295; unavailable managed/encoded-chunk MSE APIs on the tested browser; and no demonstrated native streaming A/V Float32 destination. Finite Float32 WAV did play and preserve 1.25 sample headroom, but all four tested streaming MIME gates rejected.

Long-GOP WebM cluster tuning, large-Cluster block-relative seeking, and matched Wasm FLAC compression-level cost remain deferred with explicit tests. Their hypotheses were not disproved.

## Verification and provenance

Current profile: installed Chrome **152.0.7977.83**, macOS, headless browser observations. Independent host media oracles use **FFmpeg 8.1.2**; the maintained remux Wasm and extracted IDCT reference use the checkout's pinned FFmpeg source/build. Host decoder success is not pinned-Wasm execution. Video/audio graph output is not proof of physical display/speaker behavior, hardware acceleration or energy savings.

Twenty browser harnesses reached their canonical success predicates, including negative controls. One subtitle harness stopped at missing runtime setup. Three standalone host component probes passed. These are shared harness counts, not independent mechanisms; individual applicability is in the decision ledger.

Catalogue verification, evidence hashes, new JavaScript syntax checks, license checks and `git diff --check` passed. HEAD and the complete pre-existing tracked diff are unchanged. Production source files, default routing, commits and releases were not changed by this phase.

The captured fixtures and failing variants are retained. The existing Big Buck Bunny fixture retains the project's media attribution; new synthetic fixtures were created locally. See `docs/MEDIA-NOTICES.md`, the v4 package `sources/NOTICES.md`, and [provenance manifest](provenance.json).
