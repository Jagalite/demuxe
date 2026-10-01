<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 3: Dual-audio H.264 + AAC + AC-3 stereo / MKV

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](receipt.json)

Browser and CPU results retain their original captured harness. The later supplemental validator audits the same recorded rate samples; these runs did not execute that newer validator.

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 13.5% CPU · initial AAC | native-direct; Bounded playback checks passed; audio selections: AC3 via native-transcode, AAC via native-direct; CPU measures initial AAC only |
| jspi | 🟢 (Pass) · 16.3% CPU · initial AAC · forced-remux ref | native-remux; Bounded playback checks passed; audio selections: AC3 via native-transcode, AAC via native-remux; CPU measures initial AAC only |
| asyncify | 🟢 (Pass) · 16.9% CPU · initial AAC · forced-remux ref | native-remux; Bounded playback checks passed; audio selections: AC3 via native-transcode, AAC via native-remux; CPU measures initial AAC only |
| software | 🟢 (Pass) · 35.2% CPU · initial AAC | software; Bounded playback checks passed; audio selections: AC3 via software, AAC via software; CPU measures initial AAC only |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed; audio selections: AC3 via hybrid-private, AAC via hybrid-private |
| hybrid-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed; audio selections: AC3 via hybrid-private, AAC via hybrid-private |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed; audio selections: AC3 via software-private, AAC via software-private |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed; audio selections: AC3 via software-private, AAC via software-private |
