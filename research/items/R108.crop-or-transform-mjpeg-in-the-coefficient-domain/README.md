<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Crop or transform MJPEG in the coefficient domain

Full identity: `R108.crop-or-transform-mjpeg-in-the-coefficient-domain`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

The current native/browser video codec bridge has no MJPEG coefficient transform or JPEG image-decode adapter. Display crop/rotation already occurs in the shader without rewriting media. A required transformed asset needs a coefficient-domain component and iMCU/orientation contract, not another display transform.

Next action: For a requested transformed MJPEG asset, use a perfect aligned grayscale JPEG crop as one component and compare retained coefficients plus decoded geometry; misaligned/edge transforms must reject rather than expand silently.

## Definition and contract

Type: Compressed-image/video transformation. Priority: P1. Question. Can an existing MJPEG source expose only a requested aligned region without a full decode/re-encode round trip? What differs from earlier work. R63 delegated JPEG image decoding and R64 decoded lower-resolution previews. This reduces or transforms the coded image before pixel reconstruction. Mechanism. Operate on JPEG DCT coefficients with a jpegtran-style crop/rotation/flip, then use the browser image-decoder path for the resulting packets. Initial source profile. Simple DCT-based JPEG/MJPEG frames with controlled geometry; crop origins aligned to the required iMCU grid. Start with grayscale or simple subsampling. Source basis. libjpeg-turbo documents coefficient-domain transformations, perfect-transform checks and crop alignment. Entropy decode/recode remains work. [S7]

Output contract: Correct source/time/target and agreed fidelity. Approximate results cannot populate exact caches or qualify normal playback.

Primary metric: Time to the requested exact or explicitly approximate preview, total prerequisite work and retained state.

Adverse control: Move backward, request a non-RAP dependency, change source or cancel a pending request; stale previews must never become current.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R108.crop-or-transform-mjpeg-in-the-coefficient-domain.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R108.crop-or-transform-mjpeg-in-the-coefficient-domain.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R102-R115-research-backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R102-R115-research-backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root3/audits/R108.crop-or-transform-mjpeg-in-the-coefficient-domain.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root3/audits/R108.crop-or-transform-mjpeg-in-the-coefficient-domain.md)
