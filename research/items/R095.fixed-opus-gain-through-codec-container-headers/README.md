<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Fixed Opus gain through codec/container headers

Full identity: `R095.fixed-opus-gain-through-codec-container-headers`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (full-completion).

Requested-6dB combines with existing+3dB Opus header gain. Browser header-only output RMS matches original header plus gain node within0.02%; doubled attenuation differs by50%. Seek/EOF pass. Worth static explicit asset gain, not dynamic volume or quantified CPU claim.

Next action: Find where bytes/timestamps actually change, are copied, or are withheld. Compare against current persistent mux/parser behavior.

## Definition and contract

Question. Can fixed per-asset gain be expressed without an application-created audio-processing graph? What differs from earlier work. Distinct from R53 audio-clock gain automation and R61 channel graphs: changes a static decode instruction, not the application PCM graph. Input scope. Clear Opus source with known existing gain metadata; test Ogg/WebM/MP4 independently. Mechanism to test. Adjust the encoded stream output-gain metadata while retaining the original audio packets, and let the normal decode/output path apply the requested fixed attenuation. Smallest experiment. 1. Create 0, -6 and -12 dB variants of the same packets. 2. Measure the resulting internal digital signal against a controlled gain reference. 3. Verify gain persistence across seek and reconcile existing output gain and loudness tags.

Output contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Primary metric: Complete preparation/startup/refill work, bytes and ownership; output parser acceptance alone is not the metric.

Adverse control: Wrong size/offset/configuration or a non-random-access cut must fail specifically; cancellation cannot publish another generation.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R095.fixed-opus-gain-through-codec-container-headers.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R095.fixed-opus-gain-through-codec-container-headers.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R88-R101-research-backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R88-R101-research-backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R095.fixed-opus-gain-through-codec-container-headers.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R095.fixed-opus-gain-through-codec-container-headers.md)
- [results/full-completion/r95/result.json](../../../results/full-completion/r95/result.json)
