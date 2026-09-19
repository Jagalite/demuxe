<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Native HLS playlist views over compatible existing media

Full identity: `R088.native-hls-playlist-views-over-compatible-existing-media`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Reconciled completed prior evidence: Native HLS byte-range view reaches marked audio/video, seeks and EOF; deliberately misaligned segment ranges fail. Local unchanged fMP4 payload supports the proposed destination primitive.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

Question. Can browser-owned manifest fetching and scheduling remove application demux/append work for this source? What differs from earlier work. New direct-source construction; not another application-owned MSE controller or a claim that all Chrome builds expose native HLS. Input scope. Finite, clear, already HLS-compatible fragmented MP4 or TS; valid segment boundaries and configuration. Mechanism to test. Create a byte-range HLS VOD playlist over existing segments and initialization data, then assign the playlist directly to a media element. Smallest experiment. 1. Probe native HLS with extensions and JavaScript HLS libraries absent. Record exact Chrome version and platform. 2. Serve one qualified H.264/AAC presentation first as separate segments, then as byte ranges over the same resource. 3. Compare native-HLS, direct-file where available, and application-MSE playback under the same delivery conditions.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R088.native-hls-playlist-views-over-compatible-existing-media.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R088.native-hls-playlist-views-over-compatible-existing-media.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R88-R101-research-backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R88-R101-research-backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R088.native-hls-playlist-views-over-compatible-existing-media.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R088.native-hls-playlist-views-over-compatible-existing-media.md)
- [results/full-completion/continuity/native-delivery.json](../../../results/full-completion/continuity/native-delivery.json)
