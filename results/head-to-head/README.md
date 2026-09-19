<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Maintained head-to-head evidence

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
