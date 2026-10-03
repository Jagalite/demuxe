<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 60: AV1 10-bit + Opus / WebM (HDR10)

Browser: chromium/154.0.8037.93/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](receipt.json)

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟡 Screened* · 23.6% CPU | native-direct; Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified. |
| jspi | 🟡 Screened* · 24.3% CPU · forced-remux ref | native-remux; Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified. |
| asyncify | 🟡 Screened* · 24.7% CPU · forced-remux ref | native-remux; Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified. |
| software | 🟡 Screened* · 40.7% CPU | software; Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified. |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟡 Screened* · not measured (outside CPU campaign scope) | hybrid-private; Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified. |
| hybrid-asyncify | 🟡 Screened* · not measured (outside CPU campaign scope) | hybrid-private; Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified. |
| software-jspi | 🟡 Screened* · not measured (outside CPU campaign scope) | software-private; Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified. |
| software-asyncify | 🟡 Screened* · not measured (outside CPU campaign scope) | software-private; Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified. |
