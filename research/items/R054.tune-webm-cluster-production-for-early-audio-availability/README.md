<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Tune WebM cluster production for early audio availability

Full key: `R054.tune-webm-cluster-production-for-early-audio-availability`

Current decision: **pursue** (2026-09-19T22:04:30.568845+00:00).

Genuine real-time FFmpeg Opus-copy producer stdout feeds actual same-owner nativeMSE alongside identical H264video. Bounded40ms clusters plus flush_packets1 preserve301coded payloads, every288000stereo PCMframes, allPTS/durations,312preskip and648enddiscard in every complete output versus source/default.500ms real producer SIGSTOP/CONT resumes toEOF; actualfetchabort terminates producer255, newownedproducer restarts. Three alternating coldrequest→firstnonzeroAudioWorklet pairs:102.5ms candidate versus598ms default, ratio0.17140 passes0.9;119977/118549bytes ratio1.01205 passes1.20. Actualstdout release traces captured, not artificially paced prebuiltbytes. Everybrowser run produces288000nonzero samples and identical6.021sMSEend; no sample-exact wall-clock/acoustic alignment claim. Two initial unsolicitedfavicon producers retained and finished before performance, excluded by actualjobidentity.

Pursue bounded small-cluster/flush policy for separate OpusWebM audio producer in working mixed route. No broad long-GOP multiplexedvideo or lossy-codec claim. Browserpreparedvideo and preencodedinput shared; measured coldproducer/output delivery and actualfirstPCM. Higher emit/append count139versus9 and1.205percentbytes tradeoff explicit; no CPUwin inferred. Source/endtrimexact; currentMSEcontainer end6.021s distinguished from6sdecodedPCM.

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

[Run](../../shared/runs/20260919T220430Z-webm-live/run.json) · [Analysis](../../shared/runs/20260919T220430Z-webm-live/analysis.md) · [Manifest](../../shared/runs/20260919T220430Z-webm-live/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
