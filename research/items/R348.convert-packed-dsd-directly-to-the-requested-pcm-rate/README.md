<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Convert packed DSD directly to the requested PCM rate

Full key: `R348.convert-packed-dsd-directly-to-the-requested-pcm-rate`

Current decision: **pursue** (2026-09-19T23:18:52.844593+00:00).

Actual efficient packed-byte table DSD baseline retains pinned FFmpeg96tap first filter at2.8224MHz→352.8k PCM, then explicit17tap factor8 PCM FIR. Candidate composes224tap packed-byte filter directly to44.1k, avoiding50332672-byte intermediate float payload on longer fixture. All1572880 outputs match actual FFmpeg DSD decode plus independent second-FIR reference within5.9605e-8 under declared1e-6 tolerance; baseline oracle error7.34e-19. Bit-order and filter perturbations differ by0.0683/0.00995; invalid coefficient shape exits without output. Prefix history, phase and128byte tail explicit. Short0.786MB CLI timings were too variable for robust inference and retained separately. Prospective16x-longer workload declared median paired ratio<=0.9 and4of5 faster: paired median0.63677 and4of5 pass. Ratio of independent medians is0.95076 and timings retain large outliers; this is not stable latency qualification.

Pursue bounded filter fusion and removal of high-rate intermediate storage for this exact two-filter/rate recipe; further timing confidence needs controlled runtime ownership. Do not claim a stable36percent end-to-end speedup from noisy paired values, generic DSD quality, exact floating-bit identity, other rates or automatic integration. Baseline already uses efficient packed-byte tables; original LGPL coefficient provenance retained. Candidate lookup-table payload grows from24576 to57344bytes, separately from avoided intermediate and unmeasuredRSS.

No production integration or release qualification. Original provisional directory renamed after capture; replay into a new output directory. Exact original protocol and all measured samples retained.

| Stage | Status |
| --- | --- |
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | passed |
| results | passed |
| decision | passed |

[Run](../../shared/runs/20260919T231852Z-dsd-fused/run.json) · [Analysis](../../shared/runs/20260919T231852Z-dsd-fused/analysis.md) · [Manifest](../../shared/runs/20260919T231852Z-dsd-fused/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
