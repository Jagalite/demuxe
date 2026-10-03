<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 52: MP3 audio-only / MP3

Browser: chromium/154.0.8037.93/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](receipt.json)

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · CPU withheld | native-direct; Bounded playback checks passed; CPU withheld: Error: Process turnover makes this CPU window invalid |
| jspi | — Blocked | Error: UNQUALIFIED: requested remux runtime was not observed on hybrid-private |
| asyncify | — Blocked | Error: UNQUALIFIED: requested remux runtime was not observed on hybrid-private |
| software | 🟢 (Pass) · 18.6% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| hybrid-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
