<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Decode → graphics processing → encode

Full identity: `R083.decode-graphics-processing-encode`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current graphics owner presents, not encodes; software handles requested video filters. Historical MediaRecorder pilot dropped callbacks and had transformed-pixel error. Shared physical GPU API availability removes only a prerequisite, not frame/timestamp preserving encode integration.

Next action: Define one three-frame deterministic inversion encode with timestamp ownership before realtime tests; compare full retained frame identities.

## Definition and contract

WebGPU is unavailable in the permitted origin. A headful Xvfb run did expose WebGL1 through: ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device ...), SwiftShader driver) The pilot decoded the H.264 source in a media element, uploaded each presented frame directly to a WebGL texture, ran an RGB-inversion fragment shader, captured the resulting canvas and encoded VP9 through MediaRecorder. The processing path never called getImageData; pixel readback was used only after encoding as an oracle. The generated WebM was accepted by MSE and reached EOF. The final run captured 88/90 source callbacks; repeated pre-oracle runs captured 87, 87 and 88, so this environment did not sustain a perfect frame-for-frame realtime chain. Nearest-frame transformed-output error was around 4.3–5.1/255 mean absolute RGB in the final run.

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
| decision | passed | Historical decision imported verbatim: DEFER_SETUP. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R083.decode-graphics-processing-encode.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R083.decode-graphics-processing-encode.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R82-R87-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R82-R87-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R083.decode-graphics-processing-encode.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R083.decode-graphics-processing-encode.md)
