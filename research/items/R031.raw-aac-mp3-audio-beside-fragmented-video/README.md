<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Raw AAC/MP3 audio beside fragmented video

Full key: `R031.raw-aac-mp3-audio-beside-fragmented-video`

Current decision: **pursue** (2026-09-19T21:45:10.321305+00:00).

Actual Chrome same-owner raw AAC/MP3 and WebM Opus audio with H264 fragmented video passes digital marker timing within50ms, no audio gaps above5ms (zero measured), presented pictures/geometry against independent standalone destination, parser partial-append abort/reset, unsupported changeType rejection, forward/backward seek, EOF and cleanup. H264160x96 to VP9WebM240x136 to H264 preserves continuous Opus owner and passes same checks. AAC283 and Opus301 payload hashes match wrapped comparators. After correctness,5alternating preparation pairs plus fresh host wrapping show cold candidate/baseline ratios0.19485 AAC and0.16322 Opus against0.9 threshold; prepared browser alone16.945/19.755ms and13.3/13.87ms. Preserved rejected missing-bsf and empty_moov variants; independent reference corrects prior unsupported VP9 RGB expectation.

Pursue bounded profiles. R031 cost onlyAAC versus optional same-payloadMP4 wrapper; MP3 is capability-only. R032 saves host wrapping in this cold endpoint; no browser decoder speedup. R058 original same-owner codec-change capability has no separate speed claim, performance not applicable. Known encoder priming offsets, digital50ms timing, six-second complete appends only; no sample-exact acoustic sync, live transactional rollback or production admission. Arbitrary invalid incoming append recovery excluded.

No production integration or release qualification. Original provisional directory renamed after capture; replay into a new output directory. Exact original protocol and all measured samples retained.

| Stage | Status |
| --- | --- |
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | passed |
| results | passed |
| decision | passed |

[Run](../../shared/runs/20260919T214510Z-mixed-tracks/run.json) · [Analysis](../../shared/runs/20260919T214510Z-mixed-tracks/analysis.md) · [Manifest](../../shared/runs/20260919T214510Z-mixed-tracks/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)

## Ecosystem follow-up EB12

Evaluated at `20260922T131542Z-ecosystem-evaluation`: **deferred_until_trigger**. [Assessment](evidence/20260922T131542Z-ecosystem-evaluation/evaluation.json) · [Shared report](../../shared/runs/20260922T131542Z-ecosystem-evaluation/REPORT.md).

Packet-copy remux and destination-specific packaging already exist. R031 has scoped raw-audio evidence and R032 records a working direct AVC/Vorbis baseline. The external wrapper list does not expose a new unsupported source or prove a faster browser decoder.

Next gate / reopening condition: Select a real source whose cheapest unchanged route fails, then compare exact compressed frames and decoded timing/channels across the specific wrapper; charge parse/mux/setup. Preserve working direct playback.

This scoped supplement does not broaden earlier correctness or performance qualification.
