<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Promote useful startup work instead of reopening

Current disposition: **already_implemented**. Historical execution reconciled; no new media run.

Reconciled completed prior evidence: The accepted prepared backend is retained and later play invokes the same session backend, followed by output verification. This directly addresses the retained-candidate portion; optional metadata deferral and cross-backend sharing are not established. Imported direct-local-04: retainedPreparation.surface and backend are true, direct lifecycle and missing-video rejection pass, workersAfter is zero. Confirms the narrow existing prepared-session promotion; no optional metadata or cross-backend sharing claim.

Correctness: **passed**. Performance: **not_applicable**.

Direct-local lifecycle retains both exact prepared backend and surface, presents frames, seeks to 6 and EOF, then zero workers. Missing-video control rejects despite audio counters. Accepted existing prepared-session promotion only, not cross-backend sharing or PCM fidelity.

Next: Retain lifecycle regression; reopen only for a distinct startup owner that actually discards useful accepted preparation.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Acceptance review](../../shared/runs/20260919T201644Z-top100-31-65-reconciliation/analysis.md)
