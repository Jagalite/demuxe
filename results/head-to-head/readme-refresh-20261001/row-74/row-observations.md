<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 74: HEVC Main 10 + Opus / MKV

Browser: chromium/154.0.8037.93/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](receipt.json)

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟡 Screened* · CPU withheld | native-direct; 36-second bounded playback only; synthetic picture/audio for ordinary Main10 cases; repeated specialist audio and tagged synthetic HDR10 for UHD-style cases. No HDR, lossless, discrete surround or object fidelity qualification.; CPU withheld: Error: Process turnover makes this CPU window invalid |
| jspi | 🟡 Screened* · 26.5% CPU · forced-remux ref | native-remux; 36-second bounded playback only; synthetic picture/audio for ordinary Main10 cases; repeated specialist audio and tagged synthetic HDR10 for UHD-style cases. No HDR, lossless, discrete surround or object fidelity qualification. |
| asyncify | 🟡 Screened* · 25.9% CPU · forced-remux ref | native-remux; 36-second bounded playback only; synthetic picture/audio for ordinary Main10 cases; repeated specialist audio and tagged synthetic HDR10 for UHD-style cases. No HDR, lossless, discrete surround or object fidelity qualification. |
| software | 🟡 Screened* · 41.0% CPU | software; 36-second bounded playback only; synthetic picture/audio for ordinary Main10 cases; repeated specialist audio and tagged synthetic HDR10 for UHD-style cases. No HDR, lossless, discrete surround or object fidelity qualification. |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟡 Screened* · not measured (outside CPU campaign scope) | hybrid-private; 36-second bounded playback only; synthetic picture/audio for ordinary Main10 cases; repeated specialist audio and tagged synthetic HDR10 for UHD-style cases. No HDR, lossless, discrete surround or object fidelity qualification. |
| hybrid-asyncify | 🟡 Screened* · not measured (outside CPU campaign scope) | hybrid-private; 36-second bounded playback only; synthetic picture/audio for ordinary Main10 cases; repeated specialist audio and tagged synthetic HDR10 for UHD-style cases. No HDR, lossless, discrete surround or object fidelity qualification. |
| software-jspi | 🟡 Screened* · not measured (outside CPU campaign scope) | software-private; 36-second bounded playback only; synthetic picture/audio for ordinary Main10 cases; repeated specialist audio and tagged synthetic HDR10 for UHD-style cases. No HDR, lossless, discrete surround or object fidelity qualification. |
| software-asyncify | 🟡 Screened* · not measured (outside CPU campaign scope) | software-private; 36-second bounded playback only; synthetic picture/audio for ordinary Main10 cases; repeated specialist audio and tagged synthetic HDR10 for UHD-style cases. No HDR, lossless, discrete surround or object fidelity qualification. |
