<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 22: HEVC Main 10 4:2:2 + AAC / MKV

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](receipt.json)

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 16.7% CPU | native-direct; Bounded playback checks passed |
| jspi | 🟢 (Pass) · 18.8% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| asyncify | 🟢 (Pass) · 17.1% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| software | 🟢 (Pass) · 37.9% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🔴 (Fail) | hybrid-private; Error: Seek output: displayed timeline marker incorrect |
| hybrid-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
