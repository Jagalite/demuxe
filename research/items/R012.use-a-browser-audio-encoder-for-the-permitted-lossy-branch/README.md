<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Use a browser audio encoder for the permitted lossy branch

Full identity: `R012.use-a-browser-audio-encoder-for-the-permitted-lossy-branch`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (full-completion).

Browser Opus encodes/decodes marked stereo PCM with independently correct tones and51 packets.48648 decoded samples for48000 input exposes648-sample padding that adapter must trim. Capability warrants scoped cost comparison against existing Wasm Opus; no speedup claimed.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

Audio · New execution-plan hypothesis · P2 · Risk: Medium First environment: Audio decode source + browser. Dependencies: None; verify prerequisites locally. Status: Untested hypothesis. Proposed mechanism. Feed normal decoded audio into WebCodecs AudioEncoder when the actual codec/rate/channel configuration is supported, then mux it with copied video. Compare this with the maintained Wasm audio encoder, not with a route that omitted conversion. Source basis. WebCodecs defines AudioData, AudioEncoder and configuration queries, but does not promise a particular encoder or hardware acceleration. [W1] First agent experiment. Use one supported AAC or Opus output profile and identical bitrate/channel requirements. Measure decode-to-AudioData copies, encoder startup, delay/padding, muxing and total browser cost. Compare decoder-equivalent input samples.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R012.use-a-browser-audio-encoder-for-the-permitted-lossy-branch.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R012.use-a-browser-audio-encoder-for-the-permitted-lossy-branch.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R012.use-a-browser-audio-encoder-for-the-permitted-lossy-branch.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R012.use-a-browser-audio-encoder-for-the-permitted-lossy-branch.md)
- [results/full-completion/audio-components/result.json](../../../results/full-completion/audio-components/result.json)
