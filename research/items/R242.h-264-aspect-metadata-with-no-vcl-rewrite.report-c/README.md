<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# H.264 aspect metadata with no VCL rewrite

Full identity: `R242.h-264-aspect-metadata-with-no-vcl-rewrite.report-c`.

Current decision: **pursue** (actual-host-and-browser-metadata-only-fidelity).

Explicit1:1→4:3aspect request changesonly3bytes inexistingavcC SPS/pasp; sourceandcandidate both101762bytes, nooffsetmoves. All90B-framepacketpayloads/flags/PTS/DTS/duration andall90hostdecodedpictures exact. Chromeintrinsicdisplaygeometry changes320x180→427x180 whileall90independent pausedfullpicturehashes equal; source replacement restores320x180/requiredframe andsuppressesdelayedoldgeometry. WrongSPSlength/type rejectbeforemutation. Thisqualifiesconstantlength metadata-onlyaspectcorrection; no AnnexBremux timing disturbance, no realtimezerodrop/CPU/generalSPSrewriter claim.

Next action: Scopedresearch complete; largerSPS/unsupportedboxlayouts require separatevalidatedrewriter beforeadmission.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Authored90B-frame320x180H264MP4, independentBSFheader andfullpacket/pixelreference, invalidlength/type controls. |
| screen | passed | Actualconstantlengthcodec/containeraspectpatch changesonly3metadata bytes. |
| correctness | passed | Explicit1:1→4:3aspect request changesonly3bytes inexistingavcC SPS/pasp; sourceandcandidate both101762bytes, nooffsetmoves. All90B-framepacketpayloads/flags/PTS/DTS/duration andall90hostdecodedpictures exact. Chromeintrinsicdisplaygeometry changes320x180→427x180 whileall90independent pausedfullpicturehashes equal; source replacement restores320x180/requiredframe andsuppressesdelayedoldgeometry. WrongSPSlength/type rejectbeforemutation. Thisqualifiesconstantlength metadata-onlyaspectcorrection; no AnnexBremux timing disturbance, no realtimezerodrop/CPU/generalSPSrewriter claim. |
| performance | not_applicable | Literalreportcontract ismetadata/VCL/timing fidelity anddisplaygeometry capability; no completecostspeedup claim. |
| results | passed | Explicit1:1→4:3aspect request changesonly3bytes inexistingavcC SPS/pasp; sourceandcandidate both101762bytes, nooffsetmoves. All90B-framepacketpayloads/flags/PTS/DTS/duration andall90hostdecodedpictures exact. Chromeintrinsicdisplaygeometry changes320x180→427x180 whileall90independent pausedfullpicturehashes equal; source replacement restores320x180/requiredframe andsuppressesdelayedoldgeometry. WrongSPSlength/type rejectbeforemutation. Thisqualifiesconstantlength metadata-onlyaspectcorrection; no AnnexBremux timing disturbance, no realtimezerodrop/CPU/generalSPSrewriter claim. |
| decision | passed | Explicit1:1→4:3aspect request changesonly3bytes inexistingavcC SPS/pasp; sourceandcandidate both101762bytes, nooffsetmoves. All90B-framepacketpayloads/flags/PTS/DTS/duration andall90hostdecodedpictures exact. Chromeintrinsicdisplaygeometry changes320x180→427x180 whileall90independent pausedfullpicturehashes equal; source replacement restores320x180/requiredframe andsuppressesdelayedoldgeometry. WrongSPSlength/type rejectbeforemutation. Thisqualifiesconstantlength metadata-onlyaspectcorrection; no AnnexBremux timing disturbance, no realtimezerodrop/CPU/generalSPSrewriter claim. |

[New run](../../shared/runs/20260919T220939Z-aspect-metadata-qualification/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
