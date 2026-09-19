<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Construct a selected-track MP4 view without remuxing samples

Current disposition: **pursue**. Historical execution reconciled; no new media run.

Reconciled completed prior evidence: Both front- and tail-moov Blob views play the requested second AAC tone through seek/EOF with5368 metadata bytes edited and unchanged214 selected packet payloads/timestamps/durations. Must enable the selected tkhd track; hiding the old track alone produced silent browser audio despite valid ffprobe output.

Correctness: **passed**. Performance: **pending**.

Front/tail moov views preserve selected packets, mdat and size; edit only 5368 metadata bytes. Default 440 Hz control and selected 880 Hz reference/view outputs distinguish track selection before/after seek to EOF; two structural negatives and cleanup recorded. Unselected bytes remain; not redacted export.

Next: Add remote/admission profiles only when needed; benchmark metadata view construction versus equivalent selected-track baseline.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Acceptance review](../../shared/runs/20260919T201644Z-top100-31-65-reconciliation/analysis.md)
