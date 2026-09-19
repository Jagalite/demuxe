<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Play an ongoing fMP4 response through one native URL

Full identity: `R115.play-an-ongoing-fmp4-response-through-one-native-url`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Reconciled completed prior evidence: Native URL produces marked audio/video before response EOF with a four-second initial fragment; one-second initial fragment waited for EOF with either known or unknown total length, whereas MSE produced output early. Pursue only for an explicit buffering/latency contract, not assumed low-latency equivalence.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

Type: Progressive native-source experiment. Priority: P1. Question. Will Chrome start and continue useful playback while a valid fragmented MP4 source is still arriving, with no manifest or application append loop? What differs from earlier work. R90 used a complete local fragmented file; R88 used a playlist; R04 appended through MSE. This tests native playback before one progressively delivered HTTP media response has finished. Mechanism. Serve initialization followed by valid moof/mdat fragments progressively from one HTTP response and let the media element own ingestion. Initial source profile. A controlled finite-but-progressively-generated stream first; video-only then A/V; valid codec configuration and known fragments. Endless-live and reconnection semantics are separate.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R115.play-an-ongoing-fmp4-response-through-one-native-url.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R115.play-an-ongoing-fmp4-response-through-one-native-url.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R102-R115-research-backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R102-R115-research-backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R115.play-an-ongoing-fmp4-response-through-one-native-url.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R115.play-an-ongoing-fmp4-response-through-one-native-url.md)
- [results/full-completion/continuity/native-delivery-long.json](../../../results/full-completion/continuity/native-delivery-long.json)
