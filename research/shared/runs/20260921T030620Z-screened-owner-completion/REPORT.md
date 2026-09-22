<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# D01–D73: prioritized maintained-owner results

The useful near-term work is bounded source admission and fidelity: AAC configuration normalization, finite G.711/CAF representations, selected Ogg pages and source-bound sync-label repair. Research implementations and exact positive/negative evidence are retained here. No production routing was changed by this work.

All 73 imported IDs were reviewed against their canonical owners. Twenty-one IDs have new browser/host execution or an executed output-control analysis. Eight IDs support restricted candidates (D01, D08, D11, D32, D60, D65, D68, D69); related IDs are not independent engines or additive speedups. Ten have current-owner/regression evidence. D72 fails full lifecycle. Thirteen preserve scoped stops. Other imported subgroups remain deferred; earlier canonical scoped studies are not erased.

**Five new owners remain incomplete:** D35 sample-window audio scheduling, D42 chained audio, D55 FIR previews, D57 sparse/held WAVE, and D61 isolated-cycle loops. Their preparation/screening is now grounded in current owner review, but correctness/performance remains pending. The current preview API returns images; these operations need a new bounded audio owner, source/cancel semantics and a public timeline. This report does not call those future features complete.

## Positive results

- **AAC D01/D08:** the old maintained path rejects PCE metadata or times out on an exactly representable explicit rate. An isolated build adds a strict AAC-LC normalizer. All compressed packet hashes and independent complete host PCM/YUV match canonical output; browser seek-picture hashes, requested audio/video output, EOF and teardown pass. Parser controls cover 26 rate-table forms, truncations, unsupported declarations and 20,000 seeded random byte strings. Those parser tests do not qualify every rate in a browser. D11's compound source becomes exact with this same normalizer plus existing remux behavior; no generic repair search is introduced. D03's two-byte AVC representation already works unchanged.
- **G.711 D32:** the candidate copies AU coded bytes into finite WAVE framing. Both laws, including all 256 code values, match host decoding and the corresponding browser PCM-WAVE reference. Wrong-law audio still decodes but fails the output oracle. Unknown length, unsupported encoding and truncation reject. This is bounded file audio, not MSE/live G.711 or universal integer/32768 Float32 normalization.
- **CAF PCM D68:** float32 little/big endian, S24 little/big endian and S16 big endian match all host/browser reference samples. Canonical WAVE bytes match authored views. Only representation/endian bytes change; no resampling or downmixing is added. Timing uses the float32 big-endian representative, not every CAF profile.
- **CAF Opus D69:** the existing route preserves packet bytes yet outputs 59,520 frames instead of the declared 59,377. The 143-frame excess equals the declared 120-frame leading trim plus 23-frame trailing trim. The restricted packet-table translator emits correct Ogg pre-skip/final granule and matches full reference PCM. Contradictory trim, truncation and unsupported packet/configuration forms reject. This does not overturn the earlier, different host-subprocess clip-cost stop.
- **Ogg selection D65:** the current remux owner exposes/selects both tracks but later fails seeking with missing selected packet PTS. The candidate validates bounded page CRC/sequence/continuation/EOS, binds an explicit serial to a whole-source digest, and retains original selected pages. Both 60,013-frame stereo FLAC streams match selected-page bytes and complete independent/browser PCM. Wrong valid stream selection fails the output oracle. Full-source reads/hashing, copies and projection are charged; selected size is not a network or total-memory saving.
- **Sync metadata D60:** re-executing the source-bound constructor reconstructs the authored original exactly. All 76 genuine dependent samples reject as IDR candidates; wrong source identity rejects. Ten maintained-player seek pictures and EOF match the unchanged original; the damaged input fails seeking. This is a capability repair under authoritative authored descriptors, not an arbitrary MP4 repair policy or a performance claim.

## Existing owners and meaningful failures

D09/D10 addressing/continuity, D41 stripped/laced Opus and D15 gain-tagged packet/host-PCM output already work through current remux ownership. Default Native plays D14 AVC+Vorbis directly; forced remux is not the correct cheapest baseline. D13's actual full-A/V adverse control has 13 video frames but zero audio RMS, demonstrating why visible video alone is insufficient.

D53 executes the real maintained `pump()` with a real browser SourceBuffer. Removing through 3.99999 retains [4,6]; the 4.0001 negative removes the final GOP. D73 coherent anamorphic and rotated references expose 320x96 and 96x320 natural dimensions through both maintained routes. Geometry evidence does not resolve conflicting source authority or reverse R008's prior Hybrid/Software pixel-fidelity stop.

**D72 remains stopped at lifecycle.** Six checked held-frame pictures can match the direct reference, and coverage [1.625,2.75] exists. Consecutive seeks followed by play in that terminal held picture time out. A hypothesis that a WebM muxer duration omission caused the problem was tested and rejected: this source actually negotiates MP4, so that isolated muxer patch does not affect the route. Host ffprobe omitting packet `duration_time` does not prove the MP4 presentation interval is missing. The irrelevant patch is retained as a failed investigation, not a proposed production change. The precise timeout cause remains to be isolated at the Native seek/output-evidence boundary.

D42 starts under default native-direct but reports 2.235083 seconds rather than the independent concatenated-link reference's 3.2294375 seconds. Forced remux rejects its discontinuous timeline. D57 sparse WAVE fails while the ordinary dense WAVE reference plays under default routing. These observations justify new-owner work; they do not qualify a live graph from an imported offline render.

## Predeclared finite-operation cost

**7/7 representative profiles pass the final median-ratio gates**, across 49 final paired trials. Five profiles use the frozen runtime; both Ogg profiles have matching retained correctness/performance asset hashes. [Raw frozen-runtime pairs](performance-final/results.json), [Ogg pairs](ogg-performance/results.json), [runtime identity resolution](runtime-resolution.json).

Seven pairs per profile alternate candidate/reference order, using a fresh page/player. Thresholds were declared before timing: median paired total ratio <=1.15 and startup ratio <=1.25. The table reports candidate/reference median wall milliseconds and median **paired** ratios; a ratio of independent medians is a different statistic. Bootstrap intervals use 10,000 seeded paired resamples. A point-gate pass is not a claim that every confidence bound meets the threshold.

| Profile | Total candidate / reference ms | Paired total ratio [95% interval] | Paired startup ratio [95% interval] | Gate |
|---|---:|---:|---:|---|
| D01 | 4581.6 / 4660.9 | 0.994 [0.985, 1.020] | 0.904 [0.635, 1.181] | pass |
| D08 | 4367.9 / 4443.3 | 0.992 [0.915, 1.009] | 0.737 [0.314, 1.042] | pass |
| D32 | 1440.9 / 1448.2 | 0.995 [0.979, 1.007] | 0.882 [0.651, 1.019] | pass |
| D68 | 1329.5 / 1326.1 | 0.998 [0.997, 1.003] | 0.990 [0.930, 1.065] | pass |
| D69 | 1319.5 / 1316.2 | 1.002 [0.996, 1.004] | 1.048 [0.938, 1.104] | pass |
| D65-0 | 1447.8 / 1452.8 | 0.989 [0.949, 0.997] | 0.860 [0.665, 0.969] | pass |
| D65-1 | 1452.8 / 1456.5 | 0.996 [0.957, 1.006] | 0.857 [0.725, 1.076] | pass |

The denominator includes source read, owned copy, constructor/hash/parser work where applicable, native open, verified requested output, finite playback to EOF and destroy/context close. Per-phase raw values include prepare/open/startup/playback/cleanup and a broader host wall time. “Startup” ends at owner readiness plus AudioContext setup, not a physical first-audio measurement. Seeks are qualified separately. Browser launch, JS module bootstrap before the measured source operation, remote-network/server CPU, attributed process CPU/memory, energy and physical output are excluded. These short clips are dominated by playback duration. No decoder-acceleration, whole-player CPU-saving, universal non-regression or release claim follows.

Every final trial records zero workers after destroy; CDP-reported remaining browser processes are absent in OS checks after browser close. Complete host sample/picture hashes and browser sampled-output checks are stronger than codec availability, but do not establish physical speakers/display, exact streaming post-seek PCM, exhaustive presented-frame delivery, long-duration drift or cross-browser behavior.

## Evidence integrity and retained harness failures

The working checkout was concurrently edited. Early screens record their served hashes. Some early harness runs reused mutable snapshot filenames; the resulting mismatches are explicitly listed in [legacy-runtime-collisions.json](legacy-runtime-collisions.json), not restamped or presented as final pinned evidence. The affected five-profile correctness and cost gates were repeated against [frozen-runtime.json](frozen-runtime.json); later snapshots use content hashes in their paths. Ogg correctness/cost already shares matching retained bytes. Earlier timing passes are preliminary, not substituted for final gate outcomes.

Other preserved harness failures: an incorrect private source-field access; a fixed 180-ms source-replacement wait that sampled before progress; and an Ogg byte-equality check performed after `decodeAudioData` detached the reference buffer. Final checks use the actual source identity, bounded observed progress and an undecached copy for decoding. Positive output comparisons and adverse controls were rerun; failures remain visible in their original result directories.

The source import, its 17 archives and original controls are unchanged. The new manifest hashes this run's reports, records, copied source/runtime bytes and generated observations. Fixture indexes identify original archive members and hashes. Existing FFmpeg object archives/toolchain paths are recorded external build prerequisites. Original notices govern copied upstream code; new tooling is Apache-2.0 and reports CC-BY-4.0.

## Reproduction and remaining work

[Acceptance plan](acceptance-plan.json), [extension](acceptance-plan-extension.json), [command record](commands.log), [owner audit](owner-audit.md), [all-73 triage](triage.json), [canonical decisions](decisions.json), [artifact manifest](manifest.json). Versioned tool sources are under `snapshots/tooling`; runtime files are frozen separately. Restore fixture members from their original archives before replaying on a different machine. SDK/object prerequisites are in `build-inputs.json`.

Production integration needs explicit source-preparation ownership, narrow eligibility, metadata policy and fallback. New audio scheduler/edit/preview capabilities remain pending. D72 needs a specific lifecycle fix before promotion. Existing unrelated playback/preview/transport edits are preserved; this research does not modify their production sources or commit them.
