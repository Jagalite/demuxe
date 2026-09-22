<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Unified full Hybrid and Software engine

Unified full engine shares download/compilation with 49.43 percent combined gzip savings and qualified bounded playback; paired preparation/recovery timings completed.

See [REPORT.md](REPORT.md), [NOTICES.md](NOTICES.md), and [reproduction](tests/REPRODUCE.md). Shipping integration has not started; the executed prototype is isolated under evidence.

[Pre-commit review](REVIEW.md) records guarded tooling, read-only verification and the cold network startup tradeoff.

## Ecosystem follow-up EB07

Evaluated at `20260922T131542Z-ecosystem-evaluation`: **deferred_until_trigger**. [Assessment](evidence/20260922T131542Z-ecosystem-evaluation/evaluation.json) · [Shared report](../../shared/runs/20260922T131542Z-ecosystem-evaluation/REPORT.md).

The inspected route uses explicit VideoDecoder/EncodedVideoChunk constructors and explicit Software plans. No native/polyfill family mixing was identified in those owners. Future codec-module integration still needs concrete family identity; the unified engine study remains lab-only.

Next gate / reopening condition: Apply adapter-local family checks if a software WebCodecs adapter is introduced. Reject mixed families before publication and repeat output/fallback qualification; do not install a global shim.

This scoped supplement does not broaden earlier correctness or performance qualification.
