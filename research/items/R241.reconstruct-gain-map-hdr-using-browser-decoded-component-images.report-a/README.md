<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Reconstruct gain-map HDR using browser-decoded component images

Full identity: `R241.reconstruct-gain-map-hdr-using-browser-decoded-component-images.report-a`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

The shared current probe exposes a nonfallback Apple GPU, so the historical no-GPU blocker is stale. A conforming gain-map fixture/reference and an UltraHDR metadata/reconstruction path remain unprovided; current SDR YUV shader is not that implementation.

Next action: Acquire one pinned conforming gain-map image and decoded HDR reference, then audit metadata and browser component decode before a reconstruction shader.

## Definition and contract

The permitted browser exposed no GPU context. The container had no discoverable libultrahdr runtime and no conforming Ultra HDR fixture with a pinned decoded reference. Consequently the browser-component decoding plus HDR reconstruction experiment could not be executed as defined. Verdict: BLOCKED. No made-up gain-map carrier, generic multiplication shader or unrelated tone mapper was substituted for the actual Ultra HDR route. This is not a format failure or a claim about browsers outside this harness.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R241.reconstruct-gain-map-hdr-using-browser-decoded-component-images.report-a.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R241.reconstruct-gain-map-hdr-using-browser-decoded-component-images.report-a.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R239-R246-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R239-R246-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R241.reconstruct-gain-map-hdr-using-browser-decoded-component-images.report-a.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R241.reconstruct-gain-map-hdr-using-browser-decoded-component-images.report-a.md)
