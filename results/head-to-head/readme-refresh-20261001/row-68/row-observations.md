<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 68: HEVC + AAC / HLS VOD (fMP4 segments)

Browser: chromium/154.0.8037.93/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](receipt.json)

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🔴 (Fail) | shaka-mse; page.evaluate: PlayerError: No playback route satisfied the source: mpv subtitle service requires inspected finite file subtitles and available assets; Controlled adaptive quality requires Shaka; mpv subtitle service requires inspected finite file subtitles and available assets; File preparation is not qualified for manifest sources; Gain stage does not match the requested presentation; This execution plan already failed for the current streaming source; Gain stage does not match the requested presentation; Gain stage does not match the requested presentation; File preparation is not qualified for manifest sources; Gain stage does not match the requested presentation; Subtitle component does not match the requested presentation; Gain stage does not match the requested presentation; Subtitle component does not match the requested presentation; Gain stage does not match the requested presentation; Subtitle component does not match the requested presentation; Gain stage does not match the requested presentation; File preparation is not qualified for manifest sources; Gain stage does not match the requested presentation; Audio transcoding requires an inspected random-access file; Audio transcoding requires an inspected random-access file; Audio transcoding requires an inspected random-access file; Selective audio requires an inspected random-access file; Selective audio requires an inspected random-access file; FFmpeg fallback cannot preserve an explicit adaptive quality constraint; FFmpeg fallback cannot preserve an explicit adaptive quality constraint; Gain stage does not match the requested presentation; Gain stage does not match the requested presentation; Private playback requires the selected cooperative runtime; Private playback requires the selected cooperative runtime; Private playback requires the selected cooperative runtime; Private playback requires the selected cooperative runtime; Gain stage does not match the requested presentation; FFmpeg fallback cannot preserve an explicit adaptive quality constraint |
| software | 🟢 (Pass) · 36.5% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | N/A · finite-file scope | Streaming excluded from this lane |
| hybrid-asyncify | N/A · finite-file scope | Streaming excluded from this lane |
| software-jspi | N/A · finite-file scope | Streaming excluded from this lane |
| software-asyncify | N/A · finite-file scope | Streaming excluded from this lane |
