<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# virtual WebM Cues

Full identity: `R274.virtual-webm-cues`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Source-bound range ownership exists but no virtual WebM Cues author or composed-byte namespace exists. The provided report now resolves definition identity, but its raw remote logs are not local new evidence.

Next action: First inspect one target source for existing useful Cues; if absent, define immutable virtual Cues offsets and compare target frame/range bytes, rejecting stale identity and malformed cluster offsets.

## Definition and contract

The 30-second VP9 WebM was tested in two same-sized forms. The candidate retained normal Cues; the control replaced only the Cues element with an equal-sized Void. All bytes before the Cues—including the Cluster/media region—remain identical. Seeking native Chromium playback to 24 seconds produced the same 24.033 s media frame in both cases. With Cues, the capped-range server observed 10 requests totaling 562,306 bytes. Without Cues, Chromium made 32 requests totaling 2,004,098 bytes, effectively scanning the whole ~2.00 MB file. Thus a truthful source-bound Cues layer can materially reduce native browser seek I/O without rewriting media Cluster bytes. A production virtual index still needs immutable source identity and stale-index rejection.

Output contract: Source/version identity, requested exact sample/frame, dependency coverage and byte-range accounting.

Primary metric: Total bytes and time to correct startup/target, including cold index/identity acquisition; bounded retained bytes.

Adverse control: Change the source/version or corrupt an offset/proof and cancel one consumer. No stale or unverified bytes may be published.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R274.virtual-webm-cues.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R274.virtual-webm-cues.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R268-R275-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R268-R275-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R274.virtual-webm-cues.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R274.virtual-webm-cues.md)
- [results/local-screening/README.md](../../../results/local-screening/README.md)
- [results/local-screening/follow-up.md](../../../results/local-screening/follow-up.md)
- [results/local-screening/full-queue-audit.md](../../../results/local-screening/full-queue-audit.md)
