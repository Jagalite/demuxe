<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Comparison gap follow-up — 2026-09-22

The affected Dolby Vision and PGS fixtures now pass bounded automatic playback.
External PCM24+ASS can retain Native audio/video with the existing libass overlay.
This is local Chrome/macOS evidence, with additional Chrome/Firefox checks for
the external ASS selection policy; it is not release or HDR-fidelity qualification.

## Playback findings and changes

| Scope | Fresh baseline | Accepted behavior |
| --- | --- | --- |
| Dolby Vision 5 / MP4 and 8.1 / MKV | Remux stops at `Missing HEVC parameter sets` | That exact construction limit permits fallback. Both pass in Software. |
| Dolby Vision 5 + ASS | Hybrid passes ordinary seeks but misses the near-EOF target | Retained WebCodecs rejects empty hvcC parameter-set arrays before playback. Software passes the full bounded lifecycle. |
| Dolby Vision 8.1 + ASS | Hybrid rejects a duplicate retained-frame timestamp | That renderer limitation permits Software fallback; the empty-hvcC guard also excludes the tested source before playback. |
| HDR10 + TrueHD/DTS-HD + PGS | Both already pass on the current checkout | Existing Hybrid subtitle composition and seek behavior are retained. |
| HEVC + AC-3 + PGS | Refreshed catalogue check passes | Existing Hybrid path retained. |
| HEVC Main10 + FLAC/Opus + ASS | Regression controls | Both retain Hybrid and pass. |
| H.264 + PCM24 + external ASS | Hybrid selected by default | Auto mode admits the existing finite Native ASS plans. Explicit opt-out retains mpv routing. |

The fallback classifier still treats cancellation, permission, identity,
transport and installed-runtime failures as terminal. Empty hvcC is a diagnosed
Hybrid limitation, not a claim that HEVC or Dolby Vision is generally unsupported.
No parameter sets are fabricated, timestamps rewritten, or frames silently dropped.
Hybrid support for this in-band configuration remains deferred to a separate
decoder/seek repair; the accepted route here is Software.

The profile 8.1 fixture contains repeated `0.083`-second packet timestamps.
Increasing Matroska Hybrid preroll from 0.5 to 1 second did not fix the tail-seek
failures and was not adopted. The original preroll remains unchanged.

Native ASS still requires matching renderer assets and cross-origin isolation.
The beta packager includes those optional assets when supplied `--ass-build`;
the optimization does not imply that every existing package contains them.
Packages without the optional renderer use the mpv caption route when the asset
check returns 404; permission failures and broken installed runtimes remain errors.
Explicit Native mode continues to require `experimentalNativeASS: true`.
Auto callers can use `experimentalNativeASS: false` to retain the previous policy.
Embedded subtitle extraction, manifest attachments, adapted Opus+ASS, video-only
PiP/casting and broader output fidelity are not newly admitted.

During playback, the Native ASS overlay follows `requestVideoFrameCallback`
rather than display refresh. Paused seeks, resize, track changes and visibility
changes still invalidate immediately. Browsers without video-frame callbacks
and audio-only sources retain animation-frame scheduling.

## Evidence

- [Fresh specialist baseline](../results/head-to-head/gap-baseline-01/summary.json): four Dolby Vision failures and two HDR10+PGS passes.
- [First candidate](../results/head-to-head/gap-candidate-01/summary.json): narrow fallback plus the rejected preroll experiment; two tail-seek failures retained.
- [Accepted specialist screen](../results/head-to-head/gap-final-01/summary.json): 8/8 passes; four Dolby Vision Software paths and four Hybrid controls.
- [Ordinary PGS catalogue rerun](../results/head-to-head/gap-pgs-correctness-01/summary.json): marked video/audio/subtitles, seeks, EOF and cleanup pass.
- [PCM24+ASS baseline correctness](../results/head-to-head/gap-ass-baseline-correctness-01/summary.json).
- [PCM24+ASS Native correctness](../results/head-to-head/gap-final-ass-correctness-02/summary.json): Demuxe and native reference pass with matching frozen assets.

Specialist checks cover changing visible video, stereo audio energy, subtitle
markers where present, pause/resume, playback rate, forward/backward seek, EOF
and cleanup. They do not establish Dolby Vision RPU/color correctness, physical
HDR, Atmos objects, losslessness or discrete surround. Competitor results were
not rerun. Historical reports remain intact.

The new `demuxe-auto` specialist lane limits a rerun to Demuxe while preserving
the existing auto-mode configuration. For example:

```sh
node tests/head-to-head/specialist-screen.mjs \
  build/head-to-head/assets-gap-final-01 results/head-to-head/NEW-RUN \
  demuxe-auto dv5,dv81,dv5-atmos-ass,dv81-atmos-ass,hdr10-truehd-pgs,hdr10-dtshd-pgs
```

The frozen input manifests and per-run harness copies identify the tested runtime
and media. Fresh output directories are required; previous evidence is never replaced.

## Regression validation

- `npm run build`: TypeScript, generated headers and license boundaries pass.
- 48 Node contracts pass across runtime failure classification, plan admission,
  public state, retained decoder, codec configuration and subtitle composition.
  The retained-worker test loader also now handles its SPDX header correctly.
- `node tests/automatic-native-ass.mjs` passes in Chrome and Firefox: automatic
  admission, renderer omission, permission denial, opt-out, explicit-mode behavior,
  frame cadence and worker cleanup.
- Existing Chrome direct ASS lifecycle, style/resize and selection-recovery tests pass.

[Chrome policy evidence](../results/automatic-native-ass/chrome-1790049929294/result.json)
and [Firefox policy evidence](../results/automatic-native-ass/firefox-1790049935767/result.json)
record the final optional-asset guard and frame scheduling changes. The specialist
snapshot precedes those external-overlay-only changes. The final PCM24+ASS snapshot
`assets-gap-final-02` includes them, the source diff and frozen source copies.
Earlier cloned snapshots inherit a historical `git_revision` field; use their
`gapBaseline` metadata and complete file hashes rather than that inherited field
as the runtime identity.

## PCM24+ASS CPU

| Route | Median CPU, one core | Accepted round range |
| --- | ---: | ---: |
| Fresh Demuxe baseline, Hybrid | 56.81% | 56.35–57.18% |
| Final Demuxe auto, Native + libass | 46.58% | 45.13–47.02% |
| Matched plain Native + host ASS | 45.61% | 43.35–45.62% |

The final Demuxe median is **18.0% lower** than the fresh Hybrid baseline,
and **2.1% higher** than the native reference. The final route ranges overlap;
this is not a statistical-superiority claim. The older README values of 37.8%
and 23.6% belong to a different campaign and are not the before/after pair here.
The PCM media, ASS file and font hashes match across these fresh snapshots.

Each route has three accepted headed Chrome rounds, with five-second warmup and
at least twenty seconds measured. CPU trials ran serially without our other
browser tests or builds. All final rounds pass the frame-quality and process-
continuity gates; renderer counters do not certify physical display smoothness.

The first Native ASS CPU attempt retained one failed Demuxe round (`Excessive
dropped frames`, 12 drops during the measured window). It supplies no accepted
three-round Demuxe median. Following the video-cadence change and optional-asset
guard, correctness was rerun against the final snapshot before all six new
CPU rounds passed. The failed round remains evidence, not an established diagnosis
of why frames dropped.

[Fresh Hybrid measurements](../results/head-to-head/gap-ass-baseline-cpu-01/summary.json),
[excluded earlier Native trial](../results/head-to-head/gap-final-ass-cpu-01/summary.json),
[final measurements](../results/head-to-head/gap-final-ass-cpu-02/summary.json),
[derived values](../results/head-to-head/gap-closeout-01/summary.json), and
[48-contract test log](../results/head-to-head/gap-closeout-01/node-contracts.log).
