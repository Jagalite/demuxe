<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Full-catalogue first-pass results

**Completed the bounded first pass: 392/392 named mechanisms have decisions, with zero untouched.** Separately, all 33 missing-definition slots have source holds. The catalogue accounts for all 366 legacy ID slots through 425 distinct records, preserving conflicting definitions under their full stable keys.

This is complete first-pass coverage, not implementation or survivor qualification. The seven supplied local findings were reconciled; additional existing local results were inspected rather than rerun.

| Decision | Records | Meaning |
|---|---:|---|
| ADVANCE_CONFIRMATION | 48 | A useful bounded next experiment is identified; benefit is not qualified. |
| DEFER_SETUP | 241 | Missing mechanism-specific parser, state access, fixture, owner or substantial integration setup; not a negative experiment. |
| STOP_PROFILE | 85 | Stop the specified variant/profile: includes absent current opportunity, fidelity mismatch, or explicit negative source/local results; not universal rejection. |
| ALREADY_IMPLEMENTED | 10 | The explicitly scoped slice exists in the current checkout; broader variants may remain unimplemented. |
| HOLD_ENV | 3 | Current environment cannot supply the required API or physical observation. |
| INCONCLUSIVE | 5 | Available evidence does not settle the scoped question. |
| HOLD_SOURCE | 33 | Definition missing; no scientific verdict. |

## What actually ran

Two short secure-localhost Chrome probe sessions ran. They checked window/worker codec and MSE APIs, exact configuration hints, GPU availability, generator/encoded-chunk API exposure, and teardown. One shared component probe decoded an 850-byte deflate payload exactly and rejected a deliberately corrupted checksum. It informs two compression-related records; this is one primitive execution, not two codec implementations.

No complete-mechanism candidate, new performance benchmark, soak, all-browser matrix or survivor qualification ran in v4. Prior R47 endurance and prior R74/R27 measurements remain imported historical evidence. API support hints are not playback, physical hardware or energy proof.

Named-record evidence tiers (each record counted once):

- COMPONENT_TEST: 2
- IMPORTED_LOCAL_EVIDENCE: 12
- PREREQUISITE_PROBE: 25
- SOURCE_REVIEW: 353

The 33 missing-definition slots are source-recovery reviews, excluded from those named-mechanism evidence counts. Shared probe records reuse the same run and must not be added up as independent experiments.

## Reconciled findings

- R02: prior direct playback retained the same prepared backend and surface; missing-video rejection and teardown passed. The narrow promotion mechanism already exists.
- R40: prior maintained UI scrub recorded zero backend seeks before commit and one final seek. No repeated preview work exists in that profile.
- R47: current worker identity matches the earlier tested worker. Application gather-copy bytes fell 96.2% on the small fixture but only 8.96% on the movie, below that movie value gate; no CPU improvement is inferred.
- R27: retain the promising startup result and its inconclusive threshold boundary for later confirmation. R74: retain the unsuccessful packed-PCM value result without repeating its benchmark.
- R03: actual remux range windows are 64 KiB, overriding the generic 256 KiB reader default. Corrected baseline is attached.
- Active Hybrid presentation uses filter-retained-engine-worker, not its experimental predecessor. Corrected owner, geometry, subtitles and deadline semantics are attached to affected entries.

## Blockers and negatives remain separate

Missing definitions: R76–R81, R247–R260 and R276–R288. The previously missing R116–R131, R239–R246 and R268–R275 reports are present and their mechanisms were screened.

Environment holds: R30 has no appendEncodedChunks in this default Chrome; R353 has no ManagedMediaSource; R295 lacks a physical compositor/energy witness in the headless profile. Other mechanisms are not blocked by these absences. Current WebGPU and HEVC configuration availability removed several obsolete historical environment assumptions.

The 85 STOP_PROFILE entries are not 85 failed experiments. Examples of explicit historical negatives include R33 lost AAC tail, R179 font-subset combining-mark mismatch, R317 floating-envelope error, and R346 much slower Paeth state maps. Other stops identify no current workload or an unauthorized fidelity change. Each record names its own reason and reopening condition. Setup holds instead identify the missing prerequisite needed to make a fair test possible.

## Recommended next work

The separate [follow-up backlog](FOLLOWUP_QUEUE.md) contains 48 candidates and their specific next tests. Examples include intentionally disabled audio avoiding preparation (R13), stride-aware presentation, bounded range-read policy (R03), and worker-owned MSE. These are proposals for a later phase; none was silently promoted into a default route.

Highest-ranked follow-up keys:

- `R332.normalize-vp9-superframes-at-the-decoder-boundary-not-globally`
- `R138.one-sourcebuffer-different-codec-and-container.report-continuity`
- `R005.move-mse-ownership-off-the-window-thread`
- `R057.probe-a-real-six-channel-native-flac-destination`
- `R088.native-hls-playlist-views-over-compatible-existing-media`
- `R024.compare-raw-yuv-videoframe-presentation-with-existing-software-output`
- `R059.construct-a-selected-track-mp4-view-without-remuxing-samples`
- `R115.play-an-ongoing-fmp4-response-through-one-native-url`

Highest-priority untouched keys: **none**. Source holds remain unresolved; setup and environment holds remain visible.

```sh
python3 results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/tools/screening.py status
python3 results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/tools/screening.py next --lane followup --limit 12
```

The second command lists the backlog; it does not start qualification.

## Evidence and verification

[All 425 decisions with reasons and evidence](ALL_ITEMS.md) · [Machine-readable summary](CAMPAIGN_SUMMARY.json) · [Append-only ledger](state/decisions.jsonl) · [Final checkout identity](evidence/checkout-final.json).

Source-register and ledger verification passes for 60 source documents and 425 stable keys. The tracked diff and HEAD exactly match campaign start, preserving pre-existing edits. New work is this screening package and two bounded probe scripts. No production source edits, default-route changes, native rebuilds, commits or pushes occurred. License/boundary checks and git diff whitespace checks passed.
