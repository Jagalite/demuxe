<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# FLAC bit-depth promotion without sample reconstruction

Full key: `R174.flac-bit-depth-promotion-without-sample-reconstruction`

Current decision: **pursue** (2026-09-19T22:22:43.500827+00:00).

Actual4096sample mono20bit fixed-predictor0/escape-residual FLAC is promoted to24bit by4wastedbits and rebuilt frame/header CRCs; every coded residual bit remains unchanged. Sourceframe10253bytes→10254. Independent hostnormalizedS32 and Chrome nativefloat are exactly identical; wrong3wastedbits changesPCM and is rejected. MalformedCRC/truncation/dependent-channel profiles reject. Five alternating cold read/parse/promote/write+hostdecode pairs30.798ms versus57.001ms ordinarydecode/reencode24+sameconsumer, ratio0.54030 passes0.9.

Pursue admitted mono20→24 fixed0/escape profile, not arbitraryRice partitions, predictionorders or decorrelatedstereo. Native destination and exactpayload verified; hostprocess-bound cold endpoint, no browserdecode CPU speedclaim. MD5explicitlyunknownzeros, frameCRCs independentlyverified. No productionintegration.

Shared immutable component run; no production qualification.

| Stage | Status |
| --- | --- |
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | passed |
| results | passed |
| decision | passed |

[Run](../../shared/runs/20260919T222243Z-flac-bits/run.json) · [Analysis](../../shared/runs/20260919T222243Z-flac-bits/analysis.md) · [Manifest](../../shared/runs/20260919T222243Z-flac-bits/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
