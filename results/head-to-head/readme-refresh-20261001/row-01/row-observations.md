<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 1: H.264 + AAC / MP4

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](receipt.json)

Browser and CPU results retain their original captured harness. The later supplemental validator audits the same recorded rate samples; these runs did not execute that newer validator.

Earlier attempts are retained unchanged as historical evidence, including the earlier rate-gate failures. They are excluded from the selected current proof.

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 13.5% CPU | native-direct; Bounded playback checks passed |
| jspi | 🟢 (Pass) · 15.4% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| asyncify | 🟢 (Pass) · 16.0% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| software | 🟢 (Pass) · 35.0% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| hybrid-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
