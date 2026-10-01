<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 15: H.264 + FLAC 5.1 / MKV

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](receipt.json)

Browser and CPU results retain their original captured harness. The later supplemental validator audits the same recorded rate samples; these runs did not execute that newer validator.

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟡 Screened* · 14.5% CPU | native-direct; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| jspi | 🟡 Screened* · 19.2% CPU · forced-remux ref | native-remux; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| asyncify | 🟡 Screened* · 19.9% CPU · forced-remux ref | native-remux; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| software | 🟡 Screened* · 34.9% CPU | software; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟡 Screened* · not measured (outside CPU campaign scope) | hybrid-private; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| hybrid-asyncify | 🔴 (Fail) | hybrid-private; Error: Seek output: displayed timeline marker incorrect |
| software-jspi | 🟡 Screened* · not measured (outside CPU campaign scope) | software-private; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| software-asyncify | 🟡 Screened* · not measured (outside CPU campaign scope) | software-private; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
