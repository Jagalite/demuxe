<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Prioritize the track that limits usable playback

Full key: `R039.prioritize-the-track-that-limits-usable-playback`

Current decision: **pursue** (2026-09-19T22:10:17.171625+00:00).

Actual independent source-scoped HTTP video segments/Opus audio support one-inflight retrieval and separate nativeMSE tracks. With2svideo prebuffered/audioempty, required-contiguous-track policy fetches audio before queuedfuturevideo, preserving all288000observed nonzero AudioWorklet samples, identicalpayloads, samebuffers and6.021sEOF. Actualvideo2..4hole wins priority despite farther6send; explicitlyended2saudio is excluded; wrongsourceHTTP404, realpendingfetchabort and subsequentfreshowner pass. Allremainingvideo requests finishwithin2s fairnessbudget. Three alternating coldrequest→firstPCM pairs419ms versus823.7ms FIFO, ratio0.50868 passes0.9 at identicalcontrolled200msvideo/400msaudio requestdelay. First variant erroneously imposed6sappendwindow and cut256samples, retainedinvalid; final removesartificialwindow and requires exact288000observed samples.

Pursue required-track scheduling only where independently retrievable representations are proved, using contiguous coverage and knownfinality. This is researchFIFO backlog comparator and controlledper-requestdelays, not production scheduler or general network benchmark. Exactoutputpacketbytes reuse existingmedia; observedPCMcount and timing are not fullacoustic sample oracle. No assumption interleavedsource permits independent retrieval.

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

[Run](../../shared/runs/20260919T221017Z-required-tracks/run.json) · [Analysis](../../shared/runs/20260919T221017Z-required-tracks/analysis.md) · [Manifest](../../shared/runs/20260919T221017Z-required-tracks/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
