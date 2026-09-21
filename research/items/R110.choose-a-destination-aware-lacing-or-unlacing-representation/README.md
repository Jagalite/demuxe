<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Choose a destination-aware lacing or unlacing representation

Full identity: `R110.choose-a-destination-aware-lacing-or-unlacing-representation`.

Current decision: **already_implemented** (opportunity-review-grounded-in-actual-route-evidence).

Existing maintainedWasm route already converts Chrome-rejectedXiph-lacedWebM into acceptedunlacedoutput with101packetpayloads and648sample finaldiscard preserved, realseek andcleanup. Sourcecontract is destination-specificpackagingcapability; no new subsystem or added admission remains for this testedprofile. NoCPU/startupspeed claim; other lacing modes requireseparateprofiles.

Next action: Scopedresearch complete; reopen only for newdestination/configuration not covered by preservedactualroute.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Historical fixture/runtime setup and actual outputs reconciled; latest declared artifact hashes match. No new setup or execution. |
| screen | passed | Historical outcome retained and individually reconciled. Chrome rejects paired and single Xiph laces while unlaced baseline plays. Actual maintained Wasm remux preserves 101 packet payloads and 648-sample final discard padding; seek and cleanup pass. Accepted existing normalization profile, no new subsystem. |
| correctness | passed | Chrome rejects paired and single Xiph laces while unlaced baseline plays. Actual maintained Wasm remux preserves 101 packet payloads and 648-sample final discard padding; seek and cleanup pass. Accepted existing normalization profile, no new subsystem. |
| performance | not_applicable | Existing maintainedWasm route already converts Chrome-rejectedXiph-lacedWebM into acceptedunlacedoutput with101packetpayloads and648sample finaldiscard preserved, realseek andcleanup. Sourcecontract is destination-specificpackagingcapability; no new subsystem or added admission remains for this testedprofile. NoCPU/startupspeed claim; other lacing modes requireseparateprofiles. |
| results | passed | Existing maintainedWasm route already converts Chrome-rejectedXiph-lacedWebM into acceptedunlacedoutput with101packetpayloads and648sample finaldiscard preserved, realseek andcleanup. Sourcecontract is destination-specificpackagingcapability; no new subsystem or added admission remains for this testedprofile. NoCPU/startupspeed claim; other lacing modes requireseparateprofiles. |
| decision | passed | Existing maintainedWasm route already converts Chrome-rejectedXiph-lacedWebM into acceptedunlacedoutput with101packetpayloads and648sample finaldiscard preserved, realseek andcleanup. Sourcecontract is destination-specificpackagingcapability; no new subsystem or added admission remains for this testedprofile. NoCPU/startupspeed claim; other lacing modes requireseparateprofiles. |

[New run](../../shared/runs/20260919T214400Z-framing-opportunity-review/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)

## Imported D01–D73 screening supplement

Existing decisions and stage gates above remain unchanged. These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D41 — Restore stripped headers after unlacing, not once per block**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch08_D40-D43/demuxe_batch8/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.
