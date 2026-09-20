<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Maintained head-to-head evidence

## Expanded catalogue (latest outcomes)

All **56 additional combinations** were processed across four default players.
After the subtitle/live follow-ups and the fresh Demuxe engine build, the latest
224 outcomes are **96 passed, 85 failed, 43 blocked**. Fifty-one combinations had generated fixtures;
five remained fixture-blocked. The original four-fixture study below is separate.

[Detailed outcomes and blockers](../../docs/HEAD-TO-HEAD-CATALOGUE.md) ·
[Main run](expanded-matrix-01/REPORT.md) ·
[Subtitle selection / bitmap follow-up](expanded-subtitles-01/REPORT.md) ·
[AVPlayer subtitle follow-up](expanded-subtitles-02/REPORT.md) ·
[Live marked-output follow-up](expanded-live-01/REPORT.md) ·
[Demuxe with freshly built engines](demuxe-with-engines-01/REPORT.md)

The prepared snapshots are `build/head-to-head/assets-expanded-02/` and
`assets-expanded-03/`; both capture source revision `8666434` and the dirty player
diff. They retain pinned dependencies and original synthetic media with notices.
The later snapshot adds PGS/VobSub fixtures with independent FFmpeg overlay checks.
Five remaining fixture gaps are TrueHD 7.1 (the encoder produced 5.1), DTS-HD MA,
Atmos, and Dolby Vision profiles 5 and 8.1.

The clean [engine build](engine-build-01/README.md) installed fresh Hybrid and
Software artifacts. `assets-with-engines-01` reuses all fixture bytes from
`assets-expanded-03`, with parent-manifest and individual fixture hash verification.
The Demuxe follow-up recorded **38 passed, 4 failed, 14 blocked**: nine successful
surround/HDR screens still need fidelity qualification, and five fixtures remain
unavailable. There are **no missing-engine blockers** in the latest Demuxe rows.
Observed paths include Native, Native remux, Hybrid and Software.

The four Demuxe failures are the marked PGS subtitle drawing, HLS/fMP4 seeking,
HLS/HEVC command timeout and DASH/H.264 command timeout. They are recorded failures,
not codec-support conclusions. Other players retain their earlier exact outcomes.
No CPU or percentage-gain measurements ran.

Preserved validation runs:

- [Expanded pilot 1](expanded-pilot-01/REPORT.md): exposed a text-subtitle pixel-region limitation; replaced by actual rendered-text recognition.
- [Expanded pilot 2](expanded-pilot-02/REPORT.md): confirmed WebVTT recognition, DASH playback and explicit qualification blockers.
- [Initial bitmap run](expanded-bitmap-01/REPORT.md): retained separately; later subtitle runs record explicit track selection.
- [Hidden-caption negative control](expanded-negative-subtitles-01/REPORT.md): correctly failed OCR while video/audio kept running.
- Eight maintained harness contracts passed. Every completed run passed evidence integrity verification, including retained failures.

AVPlayer's first subtitle-selection follow-up reset the active renderer; the next
follow-up avoids that reset and preserves both attempts. Initial text rendering
can pass while post-seek text is absent. Do not pool pilots or repeated follow-ups
into the latest-outcome totals, and do not treat missing assets as codec failures.

## Original combinations: refreshed Demuxe auto results

The [four-case follow-up](demuxe-original-with-engines-01/REPORT.md) passed all four
original Demuxe auto combinations using `assets-with-engines-01`. AAC MP4, AAC MKV
and PCM MKV used Native; PCM MKV plus ASS used Hybrid. The README and default-route
table use these four latest Demuxe results, with other player/configuration rows
unchanged. The historical full matrix below remains preserved exactly as run.

## Original comparison

The first complete maintained matrix ran on **2026-09-19**, installed Chrome
**152.0.7977.83**, headless macOS. It used generated 320x180/30fps/36-second
fixtures and current Demuxe source snapshot `a99e793beab78ec6f28cae252562cb844af527c5`
plus the captured dirty player diff. Every runtime/fixture identity is in the
run's asset manifest. Competitors are pinned Movi 0.4.0 and AVPlayer 1.3.1.

## Complete matrix

[Report](matrix-01/REPORT.md) · [machine-readable summary](matrix-01/summary.json) ·
[evidence hashes](matrix-01/manifest.json) · [asset identities](matrix-01/assets-manifest.json)

| Player | Passed | Failed | Blocked |
| --- | ---: | ---: | ---: |
| Plain video | 4 | 0 | 0 |
| Demuxe | 7 | 0 | 1 |
| Movi | 5 | 3 | 0 |
| libmedia AVPlayer | 4 | 4 | 0 |
| Total | 20 | 7 | 1 |

Each result applies to one explicit player/route/fixture combination, not general
format support or an overall player ranking. Plain video's ASS case and configured
Native Demuxe/Movi ASS cases include the same explicit host libass overlay; this
is not built-in subtitle support. Full case configurations are retained in JSON.

- Demuxe built-in ASS is blocked because the current checkout's Hybrid and
  Software engine assets were absent. No earlier lab binaries were substituted.
- Movi's default AAC MP4/MKV cases failed near-EOF progression, retaining position
  near 35.35 seconds. Its default PCM/ASS case did not display the required drawing.
  These observations do not establish the cause or behavior on other fixtures.
- AVPlayer's four PCM cases failed the audio/progression gate, with retained
  `nbChannels` exceptions. AAC MP4/MKV cases passed both tested configurations.

The runner exits nonzero for this matrix because some combinations did not pass.
All 28 case outcomes and their evidence files passed the independent integrity
verifier. Failed cases are retained, not retried into a success total.

## Harness validation and preserved pilots

- [Pilot 1](pilot-01/REPORT.md): three passes and one Movi startup integration
  failure. The harness was corrected to use Movi's autoplay attribute for its
  asynchronous source loading. Original failure retained; the retrospective
  file inventory is explicitly labeled in [its note](pilot-01/ARCHIVE-NOTE.md).
- [Pilot 2](pilot-02/REPORT.md): configured Movi MP4 and host ASS with plain video
  and Native Demuxe all passed.
- [Black-screen negative control](negative-cover-01/REPORT.md): deliberately
  obscuring real playback failed the displayed timeline-marker assertion, as
  required. Its nonzero exit is expected; it is not a player regression.
- Seven maintained contract tests passed, including wrong/silent/swapped audio,
  wrong visual marker, performance identity mismatches, malformed HTTP ranges,
  server path containment, selection typos and altered evidence.

The original failed fixture preparation used an unavailable `drawtext` filter.
The corrected generator uses `geq`/`drawbox` and passed with independent video-packet
copy checks. The failed setup is local at `build/head-to-head/assets-01/commands.json`;
the complete prepared snapshot is `build/head-to-head/assets-02/`.

No performance trial was run alongside the active research work. The performance
runner is gated on matching headed correctness and an exclusive-workload assertion;
its live measurement path has not been qualified by this correctness campaign.
Firefox and other browser/device profiles were not run here. No physical audio,
HDR, full-length endurance, production release or universal codec claim is made.

See [the rerun guide](../../docs/HEAD-TO-HEAD.md). Preserve the prepared snapshot
for offline byte-identical reruns; `build/` assets are intentionally not committed.
The earlier September 16 lab remains a separate study and is not pooled here.
