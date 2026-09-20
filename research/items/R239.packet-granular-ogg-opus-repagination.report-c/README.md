<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# packet-granular Ogg Opus repagination

Full key: `R239.packet-granular-ogg-opus-repagination.report-c`

Current decision: **stop_current_profile** (2026-09-19T20:56:27.118329+00:00).

Real progressive HTTP page-readiness delivery reaches first browser audio at median2035.9ms original pages versus2036.9ms one-packet pages;1.00049 ratio fails0.90 startup target while bytes grow12.9155%. All8 actual delivery trials consume complete responses, produce audio and reach EOF. No lower latency on this browser/fixture policy; additional23.705ms repagination setup only increases candidate cost.

Stop the low-latency claim for this2s Chrome page-delivery profile. Reopen only with a materially different consumer/buffering policy or justified live workload; unchanged packets and PCM remain correct.

No production integration or release qualification. Original provisional directory renamed after capture; replay into a new output directory. Exact original protocol and all measured samples retained.

| Stage | Status |
| --- | --- |
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | failed |
| results | passed |
| decision | passed |

[Run](../../shared/runs/20260919T205627Z-ogg-delivery/run.json) · [Analysis](../../shared/runs/20260919T205627Z-ogg-delivery/analysis.md) · [Manifest](../../shared/runs/20260919T205627Z-ogg-delivery/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
