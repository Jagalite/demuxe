<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# packet-granular Ogg Opus repagination

Full identity: `R239.packet-granular-ogg-opus-repagination.report-c`.

Current decision: **pursue** (2026-09-19T20:13:17.931463+00:00).

One-packet Ogg repagination preserves all 103 packets including headers, complete host/browser PCM and final granule. New strict parser rejects truncated body and a correctly checksummed missing continuation. Source 5 pages become 103, increasing bytes 20487 to 23133 (+12.9155%). No measured delivery-latency benefit.

## Tested contract

Reused genuine 2s mono Ogg source and group-1 repagination, new independent page/packet validation; no codec frame regrouping

Next action: Require a real page-withholding delivery trace before building a production Ogg output path; compare full latency and byte cost under that policy.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Exact mechanism and bounded profile distinguished from overlapping item keys. |
| prepare | passed | Fixtures, independent same-decoder output references, wrong-output controls and runtime/source hashes pinned. |
| screen | passed | One-packet Ogg repagination preserves all 103 packets including headers, complete host/browser PCM and final granule. New strict parser rejects truncated body and a correctly checksummed missing continuation. Source 5 pages become 103, increasing bytes 20487 to 23133 (+12.9155%). No measured delivery-latency benefit. |
| correctness | passed | Whole-output host/browser evidence reused with exact artifact identities; new CRC/lacing/continuation and packet-identity adverse controls pass. |
| performance | pending | Byte overhead observed, but no equivalent actual delivery trace or latency measurement. |
| results | passed | New and reused execution identities, controls, limits, manifests and commands captured. |
| decision | passed | Scoped pursue disposition; integration and release qualification remain separate. |

[Shared run](../../shared/runs/20260919T201317Z-ogg-controls/run.json) · [Analysis](../../shared/runs/20260919T201317Z-ogg-controls/analysis.md) · [Manifest](../../shared/runs/20260919T201317Z-ogg-controls/manifest.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Historical definitions/evidence remain intact. No production integration or release qualification.
