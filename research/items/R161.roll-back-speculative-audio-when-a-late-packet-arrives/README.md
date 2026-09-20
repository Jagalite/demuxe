<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Roll back speculative audio when a late packet arrives

Full key: `R161.roll-back-speculative-audio-when-a-late-packet-arrives`

Current decision: **pursue** (2026-09-19T22:29:54.036748+00:00).

Actualpinnedhostlibopus snapshots decoderbeforePLC, decodesfourfollowingpackets provisionally, restoreslateoriginal and replacesfivepacketwindow beforepublication. Latepositions2/20/60/95 allreproduce everycontinuousno-loss floatbyte throughcomplete96000sample output with312preskip/endtrim. Missingrestore changesoutput; actualone-sampleconsumerread prohibitsrollback withoutstatechange; source/runtime identity, epoch andclosedguardsreject. Fivealternating completepacket40lateevent jobs including snapshot/PLC/restore/redecode cost2.393ms versus3.350ms freshdecoderprefix replay baseline, ratio0.71437 passes0.9. Retainedsnapshot18468bytes plus19200pendingPCMbytes explicit. Installedopus.h documents contiguousstate memcpy; no inventedopaque-state API.

Pursue bounded controlledhostlate-packet transaction beforeirreversibleconsumption, pinnedlibopus/runtimeABI andsource/epochkey. No WebCodecs opaque-state cloning, browseraudio rollback afteroutput, packetnetworkdeadline or production integration claim. Costsharedpreencodedinput/runtime; no networkwait included. Real-time application needs ownerpublication discipline matching this provedboundary.

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

[Run](../../shared/runs/20260919T222954Z-opus-rollback/run.json) · [Analysis](../../shared/runs/20260919T222954Z-opus-rollback/analysis.md) · [Manifest](../../shared/runs/20260919T222954Z-opus-rollback/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
