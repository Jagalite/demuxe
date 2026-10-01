<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# October 2026 README refresh

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 1: H.264 + AAC / MP4

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-01/receipt.json)

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

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 2: H.264 + AAC / MKV

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-02/receipt.json)

Browser and CPU results retain their original captured harness. The later supplemental validator audits the same recorded rate samples; these runs did not execute that newer validator.

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 14.1% CPU | native-direct; Bounded playback checks passed |
| jspi | 🟢 (Pass) · 16.3% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| asyncify | 🟢 (Pass) · 15.9% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| software | 🟢 (Pass) · 34.0% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| hybrid-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 3: Dual-audio H.264 + AAC + AC-3 stereo / MKV

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-03/receipt.json)

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

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 4: H.264 + PCM24 / MKV

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-04/receipt.json)

Browser and CPU results retain their original captured harness. The later supplemental validator audits the same recorded rate samples; these runs did not execute that newer validator.

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 13.2% CPU | native-direct; Bounded playback checks passed |
| jspi | 🟢 (Pass) · 18.0% CPU · forced-remux ref | native-transcode; Bounded playback checks passed |
| asyncify | 🟢 (Pass) · 19.2% CPU · forced-remux ref | native-transcode; Bounded playback checks passed |
| software | 🟢 (Pass) · 33.6% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| hybrid-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
