<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 47: HEVC + AC-3 + PGS / MKV

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](receipt.json)

Earlier attempts and their original failure reasons are retained unchanged as historical evidence. They are excluded from the selected current proof.

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 21.7% CPU | native-transcode-mpv; Bounded playback checks passed |
| jspi | 🟢 (Pass) · 22.6% CPU · forced-remux ref | native-transcode-mpv; Bounded playback checks passed |
| asyncify | 🟢 (Pass) · CPU withheld · forced-remux ref | native-transcode-mpv; Bounded playback checks passed; CPU withheld: Error: Presentation cadence outside declared frame budget |
| software | 🟢 (Pass) · 37.8% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| hybrid-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
