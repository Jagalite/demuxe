<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Preserve native playback when an MPEG-TS track changes packet identifier

Full identity: `R355.preserve-native-playback-when-an-mpeg-ts-track-changes-packet-identifier`. Original rank: 5.

Current decision: **stop_current_profile**. Scientific verdict preserved from **STOP_SIMPLE_OPTION**; stages reconciled 2026-09-19T20:18:43.070415+00:00. No new media execution.

PMT/PID mutation preserves every video/audio packet and PTS/DTS as a multiset, but FFmpeg merge_pmt_versions changes video packet order. Actual candidate rejects Selected timeline discontinuity; baseline loses continuity as well. Do not enable the option alone. A bounded reordering/track-authority adapter is a distinct next variant.

## Accepted scope

Option-alone PID transition variant rejected; a new authority/reordering adapter is a separate variant.

Candidate merge_pmt_versions changes video demux order and actual player rejects Selected timeline discontinuity. Packet multiset equality is insufficient; baseline also loses video continuity.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Historical fixtures, runtime/source manifest and result hashes reviewed and verified; no new execution or fixture generation. |
| screen | passed | Prior bounded screening reviewed; scientific disposition unchanged. |
| correctness | failed | Candidate merge_pmt_versions changes video demux order and actual player rejects Selected timeline discontinuity. Packet multiset equality is insufficient; baseline also loses video continuity. |
| performance | not_applicable | Stopped tested profile/variant; further performance work has no authorized candidate benefit. |
| results | passed | Referenced result bytes and source/runtime manifests verified; reconciliation records acceptance scope without rerunning experiments. |
| decision | passed | Scientific verdict preserved with normalized disposition and explicit scoped gates. |

[Reconciliation](../../shared/runs/20260919T201843Z-top30-stage-reconciliation/run.json) · [Evidence index](evidence/index.json) · [Current state](item.json) · [History](history.jsonl)

Original definitions and historical evidence remain intact. Integration and release qualification are separate.
