<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 70: AV1 + Opus / DASH VOD (WebM segments)

Browser: chromium/154.0.8037.93/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](receipt.json)

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 21.4% CPU | shaka-mse; Bounded playback checks passed |
| software | 🟢 (Pass) · 34.9% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | N/A · finite-file scope | Streaming excluded from this lane |
| hybrid-asyncify | N/A · finite-file scope | Streaming excluded from this lane |
| software-jspi | N/A · finite-file scope | Streaming excluded from this lane |
| software-asyncify | N/A · finite-file scope | Streaming excluded from this lane |
