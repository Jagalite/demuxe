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

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 12: H.264 + E-AC-3 stereo / MKV

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-12/receipt.json)

Browser and CPU results retain their original captured harness. The later supplemental validator audits the same recorded rate samples; these runs did not execute that newer validator.

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 17.8% CPU | native-transcode; Bounded playback checks passed |
| jspi | 🟢 (Pass) · 16.9% CPU · forced-remux ref | native-transcode; Bounded playback checks passed |
| asyncify | 🟢 (Pass) · 17.7% CPU · forced-remux ref | native-transcode; Bounded playback checks passed |
| software | 🟢 (Pass) · 33.8% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| hybrid-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 13: H.264 + DTS core stereo / MKV

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-13/receipt.json)

Browser and CPU results retain their original captured harness. The later supplemental validator audits the same recorded rate samples; these runs did not execute that newer validator.

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 18.2% CPU | native-transcode; Bounded playback checks passed |
| jspi | 🟢 (Pass) · 18.1% CPU · forced-remux ref | native-transcode; Bounded playback checks passed |
| asyncify | 🟢 (Pass) · 18.4% CPU · forced-remux ref | native-transcode; Bounded playback checks passed |
| software | 🟢 (Pass) · 36.9% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| hybrid-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 14: H.264 + FLAC stereo / MKV

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-14/receipt.json)

Browser and CPU results retain their original captured harness. The later supplemental validator audits the same recorded rate samples; these runs did not execute that newer validator.

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 13.9% CPU | native-direct; Bounded playback checks passed |
| jspi | 🟢 (Pass) · 16.5% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| asyncify | 🟢 (Pass) · 17.9% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| software | 🟢 (Pass) · 33.6% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| hybrid-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 15: H.264 + FLAC 5.1 / MKV

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-15/receipt.json)

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

### Recorded seek failure

The Hybrid/Asyncify `seek-6` observation retained a red frame where the fixture required blue. Diagnostics recorded `Retained presentation frame budget`, a peak of 16 retained frames, and an inactive browser decoder while the playback clock continued to advance. The trigger for the queue growth remains unresolved; a targeted reproduction and runtime fix are follow-up work. The original failed result is preserved in the compact correctness archive above.

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 16: H.264 + Opus stereo / MKV

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-16/receipt.json)

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 14.0% CPU | native-direct; Bounded playback checks passed |
| jspi | 🟢 (Pass) · 17.7% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| asyncify | 🟢 (Pass) · 16.9% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| software | 🟢 (Pass) · 37.5% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| hybrid-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 17: H.264 + PCM16 stereo / MKV

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-17/receipt.json)

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 14.0% CPU | native-direct; Bounded playback checks passed |
| jspi | 🟢 (Pass) · 18.3% CPU · forced-remux ref | native-transcode; Bounded playback checks passed |
| asyncify | 🟢 (Pass) · 19.0% CPU · forced-remux ref | native-transcode; Bounded playback checks passed |
| software | 🟢 (Pass) · 34.3% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| hybrid-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 18: H.264 + PCM24 5.1 / MKV

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-18/receipt.json)

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟡 Screened* · 13.9% CPU | native-direct; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| jspi | — Blocked | Error: UNQUALIFIED: requested remux runtime was not observed on hybrid-private |
| asyncify | — Blocked | Error: UNQUALIFIED: requested remux runtime was not observed on hybrid-private |
| software | 🟡 Screened* · 35.6% CPU | software; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟡 Screened* · not measured (outside CPU campaign scope) | hybrid-private; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| hybrid-asyncify | 🟡 Screened* · not measured (outside CPU campaign scope) | hybrid-private; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| software-jspi | 🟡 Screened* · not measured (outside CPU campaign scope) | software-private; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| software-asyncify | 🟡 Screened* · not measured (outside CPU campaign scope) | software-private; Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 19: HEVC Main 8-bit + AAC / MP4 (hvc1)

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-19/receipt.json)

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 15.4% CPU | native-direct; Bounded playback checks passed |
| jspi | 🟢 (Pass) · 16.5% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| asyncify | 🟢 (Pass) · 16.7% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| software | 🟢 (Pass) · 35.6% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🔴 (Fail) | hybrid-private; Error: Seek output: displayed timeline marker incorrect |
| hybrid-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |

### Recorded seek failure

The Hybrid/JSPI `seek-6` result also reached the 16-frame retained-queue limit: the browser decoder became inactive and a red frame remained visible while the clock advanced into the expected blue-marker interval. This matches the observed limit in row 15 across a different runtime and codec. The scheduling or backpressure trigger remains unresolved; the original failed result is preserved in the compact correctness archive above.

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 20: HEVC Main 8-bit + AAC / MP4 (hev1)

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-20/receipt.json)

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 15.2% CPU | native-direct; Bounded playback checks passed |
| jspi | 🟢 (Pass) · 17.0% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| asyncify | 🟢 (Pass) · 17.1% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| software | 🟢 (Pass) · 35.2% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| hybrid-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 21: HEVC Main 10-bit SDR + AAC / MP4

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-21/receipt.json)

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 16.8% CPU | native-direct; Bounded playback checks passed |
| jspi | 🟢 (Pass) · 18.7% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| asyncify | 🟢 (Pass) · 19.1% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| software | 🟢 (Pass) · 38.1% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🔴 (Fail) | hybrid-private; Error: Seek output: displayed timeline marker incorrect |
| hybrid-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |

#### Seek failure diagnostic

The nonisolated Hybrid JSPI `seek-6` failure shows the same retained-frame budget error observed in rows 15 and 19. The sampled output was red (`[252, 1, 0]`) instead of blue at playback position 6.144 seconds. The decoder mailbox recorded `Retained presentation frame budget`, retained frames peaked at 16, and the browser decoder became inactive. One pending presentation drained (204 to 205 presented frames), but no new decoder frames arrived as the playback clock advanced. Audio output remained healthy. The paired Asyncify case passed all three seek checks with a retained-frame peak of 13 and no mailbox error. This identifies the observed failure mechanism; the exact scheduling trigger remains unproven.

Failed result SHA-256: `2858b02b3665269c95880cde71caa19836785d5776103f98db8fcd12281c0f80`. Local diagnostic: `build/readme-refresh-20261001/row21-seek-analysis.json`, SHA-256 `10d5534228fc7589261568bff12f7b977b412c3dcdc4e353c24b5f013d1f06b7`. No runtime changes or replacement results were introduced.

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 22: HEVC Main 10 4:2:2 + AAC / MKV

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-22/receipt.json)

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

#### Seek failure diagnostic

Nonisolated Hybrid JSPI failed `seek-6` with the same retained-frame budget error as rows 15, 19, and 21: red output (`[252, 1, 0]`) at position 6.149 seconds instead of blue, a retained-frame peak of 16, one decoder mailbox error (`Retained presentation frame budget`), and an inactive browser decoder. The paired Asyncify case passed all three seeks with a retained-frame peak of 14 and no mailbox errors. This extends the observed failure to the HEVC 4:2:2 fixture; it does not establish a codec-specific cause.

Failed result SHA-256: `8cf2b59f66f150b0060d96f056c218a030f53f2ef3e4ffe589e9c87bf22a9b55`. Local diagnostic: `build/readme-refresh-20261001/row22-seek-analysis.json`, SHA-256 `1d28e4a65d2cf076b801a8fb243078351946efac0a7da80f629006684ffb7496`. The application build and original results remain unchanged.

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 23: HEVC Main 10-bit SDR + AC-3 / MKV

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-23/receipt.json)

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · CPU withheld | native-transcode; Bounded playback checks passed; CPU withheld: Error: Presentation cadence outside declared frame budget |
| jspi | 🟢 (Pass) · 19.8% CPU · forced-remux ref | native-transcode; Bounded playback checks passed |
| asyncify | 🟢 (Pass) · 20.3% CPU · forced-remux ref | native-transcode; Bounded playback checks passed |
| software | 🟢 (Pass) · 36.2% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| hybrid-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |

#### CPU rejection diagnostic

Auto round 1 failed the presentation-cadence gate: 464 frames were presented during a 20.001-second measurement, below the allowed 582.04–618.04 range. The video counter recorded 601 total frames and 137 dropped frames; the drop limit was approximately 6. Playback time advanced normally on the isolated pthread `native-transcode` route (`adapted-flac24`). The specific cause of the dropped frames is unproven. Later accepted Auto rounds do not replace the rejected round, so its CPU median remains withheld.

Failed result SHA-256: `fa21f255f68d6876a45529726ce5482c1b758b22f6613c3a72a361c127a52a00`. Local diagnostic: `build/readme-refresh-20261001/row23-auto-cpu-analysis.json`, SHA-256 `3f8df200f6b58482784cd72b9c8dd90939668176a491ed60570e151e9ededfca`.

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 24: HEVC Main 10-bit SDR + E-AC-3 / MKV

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-24/receipt.json)

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 20.4% CPU | native-transcode; Bounded playback checks passed |
| jspi | 🟢 (Pass) · 19.8% CPU · forced-remux ref | native-transcode; Bounded playback checks passed |
| asyncify | 🟢 (Pass) · 20.8% CPU · forced-remux ref | native-transcode; Bounded playback checks passed |
| software | 🟢 (Pass) · 35.5% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| hybrid-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 25: HEVC Main 10-bit SDR + DTS core / MKV

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-25/receipt.json)

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 21.1% CPU | native-transcode; Bounded playback checks passed |
| jspi | 🟢 (Pass) · 20.8% CPU · forced-remux ref | native-transcode; Bounded playback checks passed |
| asyncify | 🟢 (Pass) · 21.4% CPU · forced-remux ref | native-transcode; Bounded playback checks passed |
| software | 🟢 (Pass) · 35.8% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| hybrid-asyncify | 🔴 (Fail) | hybrid-private; Error: Seek output: displayed timeline marker incorrect |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |

#### Seek failure diagnostic

Nonisolated Hybrid Asyncify failed `seek-6` with the recurring retained-frame budget signature: red output (`[252, 1, 0]`) instead of blue at position 6.139 seconds, retained-frame peak 16, one mailbox error (`Retained presentation frame budget`), and an inactive browser decoder. Audio output remained healthy. The paired JSPI case passed all three seeks with peak 13 and no mailbox errors. This supports a shared presentation-queue failure across runtimes; it does not establish the exact trigger or a DTS-specific cause.

Failed result SHA-256: `ce8e2e7396302263ddb66a37cc0a3fed6839c68da94093fae6c00e8a4289003e`. Local diagnostic: `build/readme-refresh-20261001/row25-seek-analysis.json`, SHA-256 `ebf0b6240f76b14ae1df58bb0aadd0b96965f63b5598b44ae3ece461448d22ec`. No runtime changes or replacement results were introduced.

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 26: AV1 8-bit + AAC / MP4

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-26/receipt.json)

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 13.7% CPU | native-direct; Bounded playback checks passed |
| jspi | 🟢 (Pass) · 14.9% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| asyncify | 🟢 (Pass) · 14.9% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| software | 🟢 (Pass) · 33.8% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| hybrid-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 27: AV1 10-bit SDR + Opus / MKV

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-27/receipt.json)

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 17.3% CPU | native-direct; Bounded playback checks passed |
| jspi | 🟢 (Pass) · 18.3% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| asyncify | 🟢 (Pass) · 19.4% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| software | 🟢 (Pass) · 36.7% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| hybrid-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 28: AV1 + Opus / WebM

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-28/receipt.json)

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 12.3% CPU | native-direct; Bounded playback checks passed |
| jspi | 🟢 (Pass) · 15.8% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| asyncify | 🟢 (Pass) · 16.3% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| software | 🟢 (Pass) · 33.2% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| hybrid-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 29: VP9 8-bit + Opus / WebM

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-29/receipt.json)

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 4.3% CPU | native-direct; Bounded playback checks passed |
| jspi | 🟢 (Pass) · 4.7% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| asyncify | 🟢 (Pass) · 4.9% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| software | 🟢 (Pass) · 36.1% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| hybrid-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 30: VP9 10-bit SDR + Opus / WebM

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-30/receipt.json)

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 15.4% CPU | native-direct; Bounded playback checks passed |
| jspi | 🟢 (Pass) · 18.8% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| asyncify | 🟢 (Pass) · 11.5% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| software | 🟢 (Pass) · 33.6% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| hybrid-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 31: VP8 + Vorbis / WebM

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-31/receipt.json)

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 12.7% CPU | native-direct; Bounded playback checks passed |
| jspi | 🟢 (Pass) · 13.0% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| asyncify | 🟢 (Pass) · 13.9% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| software | 🟢 (Pass) · 36.1% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| hybrid-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 32: H.264 + AAC / MPEG-TS

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-32/receipt.json)

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 17.6% CPU | native-remux; Bounded playback checks passed |
| jspi | 🟢 (Pass) · 16.1% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| asyncify | 🟢 (Pass) · 17.1% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| software | 🟢 (Pass) · 32.8% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| hybrid-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 33: MPEG-2 video + AC-3 / MPEG-TS

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-33/receipt.json)

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

#### Capability and CPU startup diagnostics

Both nonisolated Hybrid runtimes rejected MPEG-2 at codec admission: the maintained Hybrid WebCodecs profile includes H.264, HEVC, VP8, VP9, and AV1. The shared error wording mentions the private Software profile, but these failures occurred in Hybrid admission. They are not retained-frame budget failures. Both forced-remux checks fell back to working `software-private` playback; that fallback does not qualify the requested remux runtime. Auto, Software, and both explicit nonisolated Software lanes passed correctness.

The subsequent Auto/Software CPU block was rejected before any measured arm ran because Chrome startup readiness did not confirm the completed hardware-key task. All six scheduled rounds are preserved as failed setup attempts; no browser identity or CPU values were fabricated. Both main CPU medians remain withheld.

Correctness summary SHA-256: `711845bf8d26447c6ad1d2b3578ef7cc390909b6f5aeec21f8d3d7a81f1018b0`. Local capability analysis: `build/readme-refresh-20261001/row33-mpeg2-ac3-analysis.json`, SHA-256 `4b78533d84eeb7242d656cb002b39e62680828d97e2f86269de9fdade94a5dcd`. Original CPU startup evidence is preserved in this row's compact evidence archive.

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 34: Interlaced MPEG-2 + AC-3 stereo / MPEG-TS

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-34/receipt.json)

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 33.2% CPU | software; Bounded playback checks passed |
| jspi | — Blocked | Error: UNQUALIFIED: requested remux runtime was not observed on software-private |
| asyncify | — Blocked | Error: UNQUALIFIED: requested remux runtime was not observed on software-private |
| software | 🟢 (Pass) · 32.3% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🔴 (Fail) | page.evaluate: PlayerError: Video codec is outside the private Software playback profile |
| hybrid-asyncify | 🔴 (Fail) | page.evaluate: PlayerError: Video codec is outside the private Software playback profile |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 35: MPEG-2 video + MP2 / MPEG-PS

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-35/receipt.json)

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 33.0% CPU | software; Bounded playback checks passed |
| jspi | — Blocked | Error: UNQUALIFIED: requested remux runtime was not observed on software-private |
| asyncify | — Blocked | Error: UNQUALIFIED: requested remux runtime was not observed on software-private |
| software | 🟢 (Pass) · 32.6% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🔴 (Fail) | page.evaluate: PlayerError: Video codec is outside the private Software playback profile |
| hybrid-asyncify | 🔴 (Fail) | page.evaluate: PlayerError: Video codec is outside the private Software playback profile |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 36: MPEG-4 Part 2 + MP3 / AVI

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-36/receipt.json)

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 34.4% CPU | software; Bounded playback checks passed |
| jspi | — Blocked | Error: UNQUALIFIED: requested remux runtime was not observed on software-private |
| asyncify | — Blocked | Error: UNQUALIFIED: requested remux runtime was not observed on software-private |
| software | 🟢 (Pass) · 31.9% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🔴 (Fail) | page.evaluate: PlayerError: Video codec is outside the private Software playback profile |
| hybrid-asyncify | 🔴 (Fail) | page.evaluate: PlayerError: Video codec is outside the private Software playback profile |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 37: ProRes + PCM / MOV

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-37/receipt.json)

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

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 38: H.264 + AAC / fragmented MP4 (single file)

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-38/receipt.json)

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 14.0% CPU | native-direct; Bounded playback checks passed |
| jspi | 🟢 (Pass) · 17.0% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| asyncify | 🟢 (Pass) · 16.1% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| software | 🟢 (Pass) · 34.8% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| hybrid-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 39: H.264 video-only / MP4

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-39/receipt.json)

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 11.9% CPU | native-direct; Bounded playback checks passed |
| jspi | 🟢 (Pass) · 13.9% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| asyncify | 🟢 (Pass) · 14.6% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| software | 🟢 (Pass) · 30.4% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| hybrid-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 40: H.264 High 10 + AAC / MKV

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-40/receipt.json)

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 17.2% CPU | native-direct; Bounded playback checks passed |
| jspi | 🟢 (Pass) · 18.6% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| asyncify | 🟢 (Pass) · 18.7% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| software | 🟢 (Pass) · 37.0% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| hybrid-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 41: MPEG-2 video-only / MPEG-TS

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-41/receipt.json)

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 29.9% CPU | software; Bounded playback checks passed |
| jspi | — Blocked | Error: UNQUALIFIED: requested remux runtime was not observed on software-private |
| asyncify | — Blocked | Error: UNQUALIFIED: requested remux runtime was not observed on software-private |
| software | 🟢 (Pass) · 29.1% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🔴 (Fail) | page.evaluate: PlayerError: Video codec is outside the private Software playback profile |
| hybrid-asyncify | 🔴 (Fail) | page.evaluate: PlayerError: Video codec is outside the private Software playback profile |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 42: H.264 + AAC + embedded SRT / MKV

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-42/receipt.json)

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 18.9% CPU | native-remux-mpv; Bounded playback checks passed |
| jspi | 🟢 (Pass) · 18.9% CPU · forced-remux ref | native-remux-mpv; Bounded playback checks passed |
| asyncify | 🟢 (Pass) · 20.2% CPU · forced-remux ref | native-remux-mpv; Bounded playback checks passed |
| software | 🟢 (Pass) · 36.5% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| hybrid-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

## Row 43: H.264 + AAC + external WebVTT / MP4

Browser: chromium/153.0.8010.53/chrome/headed/5cf9f2f24ceb3e4a10fbce9dc2f1c4aa56fddd16640818dba1676d00f6d827f8. Player source: `75585a0f91920fdc30391698b0d0156aed4572c1`.

Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.

[Compact evidence](../results/head-to-head/readme-refresh-20261001/row-43/receipt.json)

### README lanes

| Lane | Result | Route / reason |
| --- | --- | --- |
| auto | 🟢 (Pass) · 15.0% CPU | native-direct; Bounded playback checks passed |
| jspi | 🟢 (Pass) · 17.0% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| asyncify | 🟢 (Pass) · 17.0% CPU · forced-remux ref | native-remux; Bounded playback checks passed |
| software | 🟢 (Pass) · 35.8% CPU | software; Bounded playback checks passed |

### Nonisolated observations

| Mode / runtime | Result | Route / reason |
| --- | --- | --- |
| hybrid-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| hybrid-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | hybrid-private; Bounded playback checks passed |
| software-jspi | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
| software-asyncify | 🟢 (Pass) · not measured (outside CPU campaign scope) | software-private; Bounded playback checks passed |
