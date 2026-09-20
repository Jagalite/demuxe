<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# AV1 pre-super-resolution preview

Full identity: `R269.av1-pre-super-resolution-preview`.

Current decision: **pursue** (actual_decoder_internal_surface_and_bounded_cancellation).

Actual libaom decoder-internal tap copies427x360 pre-super-resolution420 samples before upscaling, then intentionally cancels the one-shot decode after the owned copy. Copy survives decoder destruction; continuing tap yields identical preview and ordinary full640x360 output equals independent dav1d. Preview luma43.663dB versus full decode+area-downscale passes predeclared20dB altered-output budget. No-superres and truncated input reject. Eleven complete process/decode/copy/output jobs versus direct strided full-output area-downscale: median0.7712x cost, bootstrap95[0.6220,0.8088]. Pursue this pinned one-keyframe preview, not later-reference decoding or browser integration.

Next action: Keep pinned internal-surface lifetime, profile and explicit altered-output guard; browser deployment, future references and other restoration/depth profiles require separate qualification.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Real decoder-internal pre-upscale surface exposed by isolatedlibaom rebuild; ownpixels copied before cancellation/destruction. |
| screen | passed | 427x360 actual pre-upscale reconstruction versus640x360publicoutput; no reencode proxy. |
| correctness | passed | Continuing/cancelled taps byteexact, fulloutput independentdav1dexact;43.663dBpreview exceeds20dBbudget, malformed/no-tap controls reject. |
| performance | passed | Completecold process+decode+requestedpreview copy/write median22.88% saving, bootstrap95saving19.12–37.80%,11pairs versusdirect-plane area baseline. |
| results | passed | Actual libaom decoder-internal tap copies427x360 pre-super-resolution420 samples before upscaling, then intentionally cancels the one-shot decode after the owned copy. Copy survives decoder destruction; continuing tap yields identical preview and ordinary full640x360 output equals independent dav1d. Preview luma43.663dB versus full decode+area-downscale passes predeclared20dB altered-output budget. No-superres and truncated input reject. Eleven complete process/decode/copy/output jobs versus direct strided full-output area-downscale: median0.7712x cost, bootstrap95[0.6220,0.8088]. Pursue this pinned one-keyframe preview, not later-reference decoding or browser integration. |
| decision | passed | Actual libaom decoder-internal tap copies427x360 pre-super-resolution420 samples before upscaling, then intentionally cancels the one-shot decode after the owned copy. Copy survives decoder destruction; continuing tap yields identical preview and ordinary full640x360 output equals independent dav1d. Preview luma43.663dB versus full decode+area-downscale passes predeclared20dB altered-output budget. No-superres and truncated input reject. Eleven complete process/decode/copy/output jobs versus direct strided full-output area-downscale: median0.7712x cost, bootstrap95[0.6220,0.8088]. Pursue this pinned one-keyframe preview, not later-reference decoding or browser integration. |

[New run](../../shared/runs/20260920T001343Z-superres-preview-qualification/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
