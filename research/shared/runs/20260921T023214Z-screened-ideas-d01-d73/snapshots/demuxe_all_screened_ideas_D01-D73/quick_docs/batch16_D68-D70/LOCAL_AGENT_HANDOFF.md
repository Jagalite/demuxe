<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Local-agent handoff — batch 16

Use the existing source, native playback, and subtitle owners. Do not install parallel streaming control beside Shaka. Read REPORT.md and evidence/analysis.json; rerun into a fresh directory. D68–D70 are provisional subcases, not official research IDs or release support declarations.

## D68 — CAF PCM admission

Find what the maintained CAF path actually does for finite 48-kHz stereo packed S16/S24/Float32, and compare the existing native-ready preparation before adding code. The smallest new gate is an actual source→native-owner test on the same fixtures with complete decoded output, playback, seek output, cancel/source replacement, and cleanup. Require an explicit WAVE numerical contract; preserve endian/layout/finite-value guards. The demo hashes and materializes whole files, so neither zero-copy nor low memory is established. Reject unsupported semantic metadata rather than silently discard regions or change layouts. Other rates/channels, nonfinite floats, unpacked PCM and unknown-length input require separate tests.

## D69 — CAF Opus timing ownership

Keep the source packet table authoritative and reconcile it with actual packet TOCs. Both zero-trim emitted source and explicitly trimmed authored source are valid research cases with DIFFERENT output requests. Do not infer 120 samples of delay for an arbitrary CAF just because this encoder used it. Retain the original stream-copy file with 975 declared frames versus 960 actual frames as a refusal regression. Inspect the maintained demuxer's handling of priming/remainder; host CAF decode alone is not the exact reference. The next meaningful qualification is actual native owner output at source start/end and after seeks, plus source replacement/late packet controls. The current media element duration discrepancy is also present in the original reference Ogg; do not 'fix' it by changing sample data. Unknown cookies, mapping families and multichannel sources stay excluded.

## D70 — Native syllable-step highlighting

Inspect existing native/Shaka caption handling. Add this as a narrowly declared native-style subtitle option or regression, not a general ASS replacement. Qualify source style eligibility, independently authored text/timing, escaped literal markup, corrected inner timestamps after editing/repeat, backward seeking, playback-rate changes, subtitle track replacement, source generations, and real-time boundary observations. The browser candidate uses three long cues with nested timestamp objects; the reference uses ten snapshots. Both share the native renderer; libass geometry and arbitrary ASS fidelity remain untested. Keep \kf, \K, moves, fades, drawings, transforms and unsupported syntax rejected. Do not infer CPU or overlay improvements from fewer application updates.

## Cost work

There is no benefit gate in this package. After actual-owner correctness, compare the least expensive already-correct implementation, including validation, setup, copies, source reads, retained representations, byte swapping, Ogg page construction, caption parsing, playback, and cleanup. Do not benchmark a toy parse loop or report whole-file decode equality as proof of live sample-perfect seeking. Do not rerun stopped old R-profiles merely because a new D-subcase exists.

## Reproduction note

Use scripts/reproduce.py with an empty/new output directory. Source constructors and browser tests have bounded subprocess timeouts. Records are immutable inputs to interpretation; preserve failed guards, initial corrections and incidental variations. Package scripts are research prototypes, not hardened untrusted-media parsers.
