<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Remux encrypted media without decrypting its samples

Full identity: `R159.remux-encrypted-media-without-decrypting-its-samples`. Original rank: 28.

Current decision: **pursue**. Scientific verdict preserved from **PURSUE_COMPONENT_EME_UNVERIFIED**; stages reconciled 2026-09-19T20:18:43.070415+00:00. No new media execution.

Restricted owned CENC container relocation preserves ciphertext, IV/subsamples and repaired sample/auxiliary offsets; independent decryption matches all reference pixels and wrong-IV mutation fails. Both original and relocated direct ClearKey playback reach EOF but yield no observed decoded frames: browser destination unverified. Generic fragmented encrypted remux remains further work.

## Accepted scope

Owned AES-CTR relocation component; generic fragmented encrypted remux and EME playback excluded.

CENC relocation preserves ciphertext/IV/subsamples, repairs offsets, independently decrypts to exact pixels and rejects wrong IV. Both original/candidate ClearKey runs yield no observed decoded frames, so browser destination correctness remains unverified.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Historical fixtures, runtime/source manifest and result hashes reviewed and verified; no new execution or fixture generation. |
| screen | passed | Prior bounded screening reviewed; scientific disposition unchanged. |
| correctness | pending | CENC relocation preserves ciphertext/IV/subsamples, repairs offsets, independently decrypts to exact pixels and rejects wrong IV. Both original/candidate ClearKey runs yield no observed decoded frames, so browser destination correctness remains unverified. |
| performance | pending | No predeclared equivalent-work benchmark and complete cost/sampling analysis in cited evidence; counters and incidental timing do not pass this gate. |
| results | passed | Referenced result bytes and source/runtime manifests verified; reconciliation records acceptance scope without rerunning experiments. |
| decision | passed | Scientific verdict preserved with normalized disposition and explicit scoped gates. |

[Reconciliation](../../shared/runs/20260919T201843Z-top30-stage-reconciliation/run.json) · [Evidence index](evidence/index.json) · [Current state](item.json) · [History](history.jsonl)

Original definitions and historical evidence remain intact. Integration and release qualification are separate.
