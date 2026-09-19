<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Isolate a selected program from multi-program transport streams

Current disposition: **pursue**. Historical execution reconciled; no new media run.

Explicit program202 TS packet filter keeps selected elementary/PCR/PMT PIDs and rewrites PAT with valid CRC. Reversed PAT order produces identical selected payload/timing. Unchanged RemuxPlayer plays/seeks output, complete host decoded pixels/PCM exact. Missing program rejects; dynamic PSI/scrambled transport outside scope.

Correctness: **passed**. Performance: **pending**.

Selected program 202 packets and timing exact for normal/reversed PAT, valid selected PID set and missing program rejection. Real RemuxPlayer plays and seeks both outputs with host decoded A/V exact and zero surviving workers. Dynamic PSI/scrambling excluded.

Next: Measure selection opportunity only on actual multi-program workload; add dynamic tables before widening admission.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Acceptance review](../../shared/runs/20260919T201644Z-top100-31-65-reconciliation/analysis.md)
