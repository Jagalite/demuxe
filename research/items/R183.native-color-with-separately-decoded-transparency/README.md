<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# native color with separately decoded transparency

Full identity: `R183.native-color-with-separately-decoded-transparency`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Independent VP8 color/mask decoders pair frames by timestamp and dimensions, preserve exact alpha and reference visible color after explicit SD matrix metadata. Wrong pair rejects; implicit matrix variant failed and retained. No production two-clock owner or cost benefit claimed.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

A three-second VP8 color stream and a separate VP8 grayscale alpha stream were decoded by Chromium, sought independently to 0.5, 1.5 and 2.5 s, uploaded as two WebGL textures, and combined by a fragment shader. At two spatial samples for every timestamp, the shader's output exactly equaled the browser-decoded color RGB plus the alpha stream's decoded grayscale value: maximum sampled RGBA difference = 0. A deliberately stale pairing (color at 1.5 s, alpha at 0.5 s) produced alpha 56 instead of the correctly paired 205 and was therefore detectable. This validates synchronized two-stream composition, not a performance win. The run used ANGLE/SwiftShader rather than a physical GPU, and it does not show that this is cheaper than native WebM alpha when that representation already exists.

Output contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Primary metric: Correct additional admitted source/destination capability; otherwise full startup and CPU/resource cost.

Adverse control: Alter one admission-critical configuration, remove a required dependency, or preserve video while making selected audio unsupported. Candidate must reject or use a declared fallback.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| performance | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Historical decision imported verbatim: PURSUE. No integration or qualification inferred. |

Pending preparation/correctness/performance means the historical evidence has not
been converted into a stage acceptance record; it does not erase historical passes
or require rerunning them. Read the evidence before updating these fields.

## Working files

- [Item state and original definition](item.json): authoritative current metadata; update this README when changing it.
- [Decision history](history.jsonl): imported records and their exact ledger locations; append future decisions.
- [Evidence index](evidence/index.json): paths, hashes, and historical hash declarations.
- [Research process](../../PROCESS.md): run layout, gates, fixture and license requirements.

Create `tests/` and `fixtures/` only when this item needs its own code or data.
Shared historical harnesses remain in `tests/` at repository root; commands and
fixture references are in the linked evidence. No unverified harness-to-item
association was invented during migration.

## Archived evidence and definitions

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R183.native-color-with-separately-decoded-transparency.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R183.native-color-with-separately-decoded-transparency.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R183-R192-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R183-R192-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R183.native-color-with-separately-decoded-transparency.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R183.native-color-with-separately-decoded-transparency.md)
- [results/top100/alpha/result.json](../../../results/top100/alpha/result.json)
