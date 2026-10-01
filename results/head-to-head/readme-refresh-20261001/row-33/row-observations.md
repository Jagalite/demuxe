<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 33: MPEG-2 video + AC-3 / MPEG-TS

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](receipt.json)

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · CPU withheld | software; Bounded playback checks passed; CPU withheld: Error: Startup readiness unconfirmed: completed hardware-key task missing; CPU block rejected; Error: CPU block aborted after prior cleanup/browser failure: row:mpeg2-ac3; Error: CPU block aborted after prior cleanup/browser failure: row:mpeg2-ac3 |
| jspi | — Blocked | Error: UNQUALIFIED: requested remux runtime was not observed on software-private |
| asyncify | — Blocked | Error: UNQUALIFIED: requested remux runtime was not observed on software-private |
| software | 🟢 (Pass) · CPU withheld | software; Bounded playback checks passed; CPU withheld: Error: CPU block aborted after prior cleanup/browser failure: row:mpeg2-ac3; Error: CPU block aborted after prior cleanup/browser failure: row:mpeg2-ac3; Error: CPU block aborted after prior cleanup/browser failure: row:mpeg2-ac3 |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🔴 (Fail) | page.evaluate: PlayerError: Video codec is outside the private Software playback profile |
| hybrid-asyncify | 🔴 (Fail) | page.evaluate: PlayerError: Video codec is outside the private Software playback profile |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
