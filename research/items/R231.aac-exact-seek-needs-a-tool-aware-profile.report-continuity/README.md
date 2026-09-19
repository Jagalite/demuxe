<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# AAC exact seek needs a tool-aware profile

Full identity: `R231.aac-exact-seek-needs-a-tool-aware-profile.report-continuity`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (full-completion).

Current adaptation does not claim arbitrary AAC sample-exact restarts. The cited default AAC-LC failure after 100 preroll frames invalidates codec-name-only or fixed-count exact-seek claims; tool-aware admission is necessary.

Next action: For an exact PCM suffix feature, inspect AAC tools and compare continuous decode with one admitted restart plus a PNS/TNS-enabled counterexample.

## Definition and contract

With the default FFmpeg AAC-LC encode, a decoder started midstream does not reproduce the continuous output bit-exactly even when fed 100 earlier ADTS frames in this fixture. The mismatches are consistent with stateful coding-tool behavior; bounded frame count alone is therefore not enough to claim exactness for arbitrary AAC-LC. The controlled profile disables PNS and TNS. Under that restriction, zero pre-roll differs only at restart, while one prior ADTS frame / 21.33 ms restores exact equality for the complete suffix. This is the correct kind of admission rule for Demuxe: qualify by concrete codec-tool state, not only codec name/profile label.

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
| decision | passed | Historical decision imported verbatim: STOP_PROFILE. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R231.aac-exact-seek-needs-a-tool-aware-profile.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R231.aac-exact-seek-needs-a-tool-aware-profile.report-continuity.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R223-R231-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R223-R231-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R231.aac-exact-seek-needs-a-tool-aware-profile.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R231.aac-exact-seek-needs-a-tool-aware-profile.report-continuity.md)
