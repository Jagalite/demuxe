<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Expose prepared fragments as a native HLS presentation

Full identity: `R363.expose-prepared-fragments-as-a-native-hls-presentation`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Actual Demuxe-produced fMP4 fragments served as native HLS byte ranges reach marked A/V, seek and EOF; misaligned ranges fail. Tiny loopback delivery prototype only; not a generic source-authorized production resource service.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

Hypothesis. A source already transformable into compatible fragmented MP4 may be delivered through a generated HLS presentation rather than through an application-managed MSE append queue. The experiment changes the destination and delivery ownership, not the codec or the selected media. Source basis. Apple documents HLS for its platforms and Safari. RFC 8216 defines fragmented-MP4 segments, initialization references through EXT-X-MAP, explicit segment durations, and end-of-list semantics. These are existing mechanisms. Neither source qualifies arbitrary Demuxe output or promises lower energy use. [S1, S2] Proposed construction. Source inspection and packet-copy preparation produce the same qualified initialization and media fragments used by a baseline route. A small manifest adapter publishes a truthful playlist and stable fragment resources. A browser with qualified native HLS support obtains those resources and owns the presentation. Demuxe retains source authorization, exact track intent, and resource-generation identity.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R363.expose-prepared-fragments-as-a-native-hls-presentation.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R363.expose-prepared-fragments-as-a-native-hls-presentation.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R363_R366_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R363_R366_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root/audits/R363.expose-prepared-fragments-as-a-native-hls-presentation.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root/audits/R363.expose-prepared-fragments-as-a-native-hls-presentation.md)
- [results/top100/hls/maintained-result.json](../../../results/top100/hls/maintained-result.json)
- [results/top100/hls/native-delivery.json](../../../results/top100/hls/native-delivery.json)
