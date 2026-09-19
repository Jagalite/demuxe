<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Use verbatim FLAC as a lightweight integer-PCM carrier

Full identity: `R102.use-verbatim-flac-as-a-lightweight-integer-pcm-carrier`. Original rank: 218.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

The existing producer uses general FFmpeg FLAC encoding and compatible packet muxing; a true verbatim formatter is a new bitstream component. The historical host advantage includes executable differences and can multiply output bytes almost sevenfold.

No matching candidate/reference/control execution for this exact gate. Actual S16 verbatim-FLAC formatter, independent PCM/CRC oracle and like-for-like output-cost workload.

Next action: Build one isolated S16 mono/stereo verbatim formatter with valid CRC/frame metadata, compare exact PCM and same-duration level0/5 output including total bytes and decoder work. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Actual S16 verbatim-FLAC formatter, independent PCM/CRC oracle and like-for-like output-cost workload. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Actual S16 verbatim-FLAC formatter, independent PCM/CRC oracle and like-for-like output-cost workload. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
