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

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 5: H.264 + PCM24 / MKV + ASS

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-05/receipt.json)

Browser and CPU results retain their original captured harness. The later supplemental validator audits the same recorded rate samples; these runs did not execute that newer validator.

Earlier attempts and their original failure reasons are retained unchanged as historical evidence. They are excluded from the selected current proof.

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 16.2% CPU | native-direct-ass; Bounded playback checks passed |
| jspi | 🟢 (Pass) · 18.3% CPU · forced-remux ref | native-transcode-ass; Bounded playback checks passed |
| asyncify | 🟢 (Pass) · 7.5% CPU · forced-remux ref | native-transcode-ass; Bounded playback checks passed |
| software | 🟢 (Pass) · 26.0% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| hybrid-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 6: H.264 + AAC 5.1 / MP4

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-06/receipt.json)

Browser and CPU results retain their original captured harness. The later supplemental validator audits the same recorded rate samples; these runs did not execute that newer validator.

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟡 Screened* · 13.6% CPU | native-direct; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| jspi | 🟡 Screened* · 17.4% CPU · forced-remux ref | native-remux; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| asyncify | 🟡 Screened* · 17.2% CPU · forced-remux ref | native-remux; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| software | 🟡 Screened* · 36.3% CPU | software; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟡 Screened* · not measured (outside CPU campaign scope) | hybrid-private; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| hybrid-asyncify | 🟡 Screened* · not measured (outside CPU campaign scope) | hybrid-private; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| software-jspi | 🟡 Screened* · not measured (outside CPU campaign scope) | software-private; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| software-asyncify | 🟡 Screened* · not measured (outside CPU campaign scope) | software-private; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 7: H.264 + MP3 stereo / MP4

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-07/receipt.json)

Browser and CPU results retain their original captured harness. The later supplemental validator audits the same recorded rate samples; these runs did not execute that newer validator.

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 13.5% CPU | native-direct; Bounded playback checks passed |
| jspi | 🟢 (Pass) · 17.7% CPU · forced-remux ref | native-transcode; Bounded playback checks passed |
| asyncify | 🟢 (Pass) · 17.2% CPU · forced-remux ref | native-transcode; Bounded playback checks passed |
| software | 🟢 (Pass) · 35.8% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| hybrid-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 8: H.264 + AC-3 5.1 / MKV

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-08/receipt.json)

Browser and CPU results retain their original captured harness. The later supplemental validator audits the same recorded rate samples; these runs did not execute that newer validator.

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟡 Screened* · 19.5% CPU | native-transcode; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| jspi | 🟡 Screened* · 17.6% CPU · forced-remux ref | native-transcode; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| asyncify | 🟡 Screened* · 18.3% CPU · forced-remux ref | native-transcode; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| software | 🟡 Screened* · 33.9% CPU | software; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟡 Screened* · not measured (outside CPU campaign scope) | hybrid-private; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| hybrid-asyncify | 🟡 Screened* · not measured (outside CPU campaign scope) | hybrid-private; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| software-jspi | 🟡 Screened* · not measured (outside CPU campaign scope) | software-private; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| software-asyncify | 🟡 Screened* · not measured (outside CPU campaign scope) | software-private; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 9: H.264 + E-AC-3 5.1 / MKV

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-09/receipt.json)

Browser and CPU results retain their original captured harness. The later supplemental validator audits the same recorded rate samples; these runs did not execute that newer validator.

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟡 Screened* · CPU withheld | native-transcode; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified.; CPU withheld: Error: Presentation cadence outside declared frame budget |
| jspi | 🟡 Screened* · 13.5% CPU · forced-remux ref | native-transcode; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| asyncify | 🟡 Screened* · 14.9% CPU · forced-remux ref | native-transcode; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| software | 🟡 Screened* · 13.5% CPU | software; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟡 Screened* · not measured (outside CPU campaign scope) | hybrid-private; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| hybrid-asyncify | 🟡 Screened* · not measured (outside CPU campaign scope) | hybrid-private; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| software-jspi | 🟡 Screened* · not measured (outside CPU campaign scope) | software-private; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| software-asyncify | 🟡 Screened* · not measured (outside CPU campaign scope) | software-private; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 10: H.264 + DTS core 5.1 / MKV

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-10/receipt.json)

Browser and CPU results retain their original captured harness. The later supplemental validator audits the same recorded rate samples; these runs did not execute that newer validator.

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟡 Screened* · 20.4% CPU | native-transcode; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| jspi | 🟡 Screened* · 20.4% CPU · forced-remux ref | native-transcode; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| asyncify | 🟡 Screened* · 20.7% CPU · forced-remux ref | native-transcode; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| software | 🟡 Screened* · 38.2% CPU | software; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟡 Screened* · not measured (outside CPU campaign scope) | hybrid-private; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| hybrid-asyncify | 🟡 Screened* · not measured (outside CPU campaign scope) | hybrid-private; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| software-jspi | 🟡 Screened* · not measured (outside CPU campaign scope) | software-private; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| software-asyncify | 🟡 Screened* · not measured (outside CPU campaign scope) | software-private; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 11: H.264 + AC-3 stereo / MKV

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-11/receipt.json)

Browser and CPU results retain their original captured harness. The later supplemental validator audits the same recorded rate samples; these runs did not execute that newer validator.

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 17.6% CPU | native-transcode; Bounded playback checks passed |
| jspi | 🟢 (Pass) · 17.7% CPU · forced-remux ref | native-transcode; Bounded playback checks passed |
| asyncify | 🟢 (Pass) · 17.2% CPU · forced-remux ref | native-transcode; Bounded playback checks passed |
| software | 🟢 (Pass) · 35.2% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| hybrid-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
