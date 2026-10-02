<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 37: ProRes + PCM / MOV

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](receipt.json)

Earlier attempts and their original failure reasons are retained unchanged as historical evidence. They are excluded from the selected current proof.

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 26.4% CPU | software; Bounded playback checks passed |
| jspi | — Blocked | Error: UNQUALIFIED: requested remux runtime was not observed on software-private |
| asyncify | — Blocked | Error: UNQUALIFIED: requested remux runtime was not observed on software-private |
| software | 🟢 (Pass) · 27.3% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🔴 (Fail) | page.evaluate: PlayerError: Video codec is outside the private Software playback profile |
| hybrid-asyncify | 🔴 (Fail) | page.evaluate: PlayerError: Video codec is outside the private Software playback profile |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
