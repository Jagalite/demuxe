<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Offer explicit compatible-core extraction before audio re-encoding

Full key: `R029.offer-explicit-compatible-core-extraction-before-audio-re-encoding`

Current decision: **stop_current_profile** (2026-09-19T22:10:57.352909+00:00).

ActualFFmpeg archive DTS-HD MA5.1 core-plus-extension input yields329DTS corepackets; everycore packet is exact originalprefix,63276extensionbytes discarded (725224to661948). Bothhostdecoded168448frames; nonzero full/corePCM differs max0.00045344, so no losslessfullfidelity claim. Chrome152 rejects actual core.dts and core.mp4 decodeAudioData; DTSCoreMSE typefalse and realaddSourceBuffer raisesNotSupportedError. Samecore decodedtoFLAC positivecontrol succeeds6channels/168448frames/48k, provingvalidfixture. Destination correctness fails as proposalstoprule predicts; no downstreamperformance or video-preservation qualification attempted.

Stop current Chrome native DTS-core profile: extracted core stillunsupported, so addingbitstreamfilter alone cannot admit route. Reopen only for an actual supportedcore destination and explicit extension-loss intent, then test preservedvideo and completecost. Sourcefixture missingblock resolved; nativecapability failure is experimentalnegative, not environment/setupblock. External/derivedmedia NOASSERTION and localresearch-only attribution pinned.

No production integration or release qualification. Original provisional directory renamed after capture; replay into a new output directory. Exact original protocol and all measured samples retained.

| Stage | Status |
| --- | --- |
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | failed |
| performance | not_applicable |
| results | passed |
| decision | passed |

[Run](../../shared/runs/20260919T221057Z-dts-core/run.json) · [Analysis](../../shared/runs/20260919T221057Z-dts-core/analysis.md) · [Manifest](../../shared/runs/20260919T221057Z-dts-core/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)

Gate classification clarified 2026-09-19T23:44:08.258984+00:00: R029 actual native DTS-core destination rejection is a failed correctness gate and stop_current_profile, not a missing prerequisite. Performance is not_applicable after that terminal failure. No new media execution or scientific verdict change. Audit found R012 and R052 already correctly classified not_applicable. [Audit](../../shared/runs/20260919T234408Z-audio-terminal-gate-audit/run.json).
