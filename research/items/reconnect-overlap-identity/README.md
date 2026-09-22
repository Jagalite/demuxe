<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Recover reconnect overlap with explicit identity and confidence levels

Stable key: `reconnect-overlap-identity`. Origin: EB16.

Decision: **stop_current_profile**, bounded source review only.

The inspected maintained sources provide bounded VOD ranges and packaged Shaka streaming, not an Icecast compressed-overlap or alternate-encoding alignment owner. Exact sequence overlap and estimated PCM correlation are distinct from R220 clock normalization and R060 captions.

Next action: Reopen only for an explicit reconnecting audio source contract. Byte-verify hash candidates, retain unique samples, bound overlap, reject silence/periodic ambiguity and label estimated alternate-source alignment separately.

Correctness contract: Exact mode does not drop unique samples; byte-verify hash candidates; approximate mode reports confidence and bounded offset; ambiguous matches fall back without claiming continuity.

No browser/media candidate or performance measurement was executed.

## Ecosystem follow-up EB16

Evaluated at `20260922T131542Z-ecosystem-evaluation`: **deferred_until_trigger**. [Assessment](evidence/20260922T131542Z-ecosystem-evaluation/evaluation.json) · [Shared report](../../shared/runs/20260922T131542Z-ecosystem-evaluation/REPORT.md).

The inspected maintained sources provide bounded VOD ranges and packaged Shaka streaming, not an Icecast compressed-overlap or alternate-encoding alignment owner. Exact sequence overlap and estimated PCM correlation are distinct from R220 clock normalization and R060 captions.

Next gate / reopening condition: Reopen only for an explicit reconnecting audio source contract. Byte-verify hash candidates, retain unique samples, bound overlap, reject silence/periodic ambiguity and label estimated alternate-source alignment separately.

This scoped supplement does not broaden earlier correctness or performance qualification.
