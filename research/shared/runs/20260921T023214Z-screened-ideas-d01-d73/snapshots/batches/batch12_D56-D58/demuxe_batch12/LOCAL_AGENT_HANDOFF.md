<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Local-agent handoff — D56–D58

Read REPORT.md, evidence/analysis.json, evidence/verification.json and REPO_LINEAGE.md first. These are local research labels, not automatically assigned R-numbers. Preserve the initial invalid WAV fixture/result distinction. Do not mark whole-player or performance stages passed from this package.

## First actions

Read the current repository and deduplicate against R106, R096, R243 and R341 plus the existing player/source workers. Base commit reviewed here: `0060c26c23290d20041f8433452e2eb088b31f59`. Run the package in a copy; never overwrite delivered evidence. Register only the smallest justified consumer.

### D56 — no default new repeat subsystem

Both fixed-cadence VP9 recalls and ordinary long-duration samples work. The latter uses three samples and 12,507 bytes, versus sixty samples and 12,885 bytes for recall. Stop default integration for simple display holds. Reopen only for a genuine fixed-coded-cadence producer or other measured need. Do not confuse reference-buffer-dependent recall with random access. Keep stale and empty-reference negatives. Current all-key producer refreshes all slots and cannot retain an arbitrary older picture dictionary. Compare against ordinary inter-frame encoding and the cheapest correct hold implementation, not only repeated keyframe payloads.

### D57 — sparse WAVE/native scheduling

Check whether the existing demuxer exposes wavl/slnt or drops its sample-hold semantics. The source has its required fact count. Keep the exact S16/32768 numerical contract explicit: native dense S16-WAVE decoding in the lab uses different scaling. Float32-WAVE reference and symbolic scheduler agree exactly. Do not treat slnt as zeros except for the known initial/no-prior state; use prior channel values on restored seeks.

Smallest next gate: one bounded live schedule from the actual source worker, including seek inside each hold, source replacement and cancellation before queued ConstantSourceNodes start. Inspect data ownership, output duration and every sample where a capture boundary can be independently established. Stop nodes belonging to the old generation. Add mono/8-bit/other sample-rate cases only with separate rules. Account for parser/index reads, node count/lifetime, channel semantics, all AudioBuffers and browser allocations. No broad WAVE playback claim from the current PCM-stereo prototype.

### D58 — native preview with opt-in bounded error

The real-arithmetic state bound and native floating-point observations are different evidence. No generic arithmetic certificate exists here. Confirm an actual preview/filter consumer, allowed coefficient family, source amplitude/state bound and error budget. Reject unknown bounds, changing coefficients and near-unit cases that exceed resource limits. Preserve a correct full-prefix/persistent filter fallback and exact-mode bypass.

Smallest next gate: a bounded request through the actual filtered-preview owner using IIRFilterNode, pinned channel/sample-rate policy, cancellation and adversarial DC/state tests. Compare with both complete native filtering and the independent recurrence. Charge amplitude verification and context creation; do not report smaller job buffers as process-memory savings. A broader floating-point guarantee requires a new implemented-arithmetic argument; R341's Q24 proof does not transfer automatically.

## Artifacts and commands

`python scripts/build.py` builds authored inputs. `python scripts/run_browser.py <video|continuous|sparse|iir>` executes each stage. `python scripts/verify.py` checks recorded outputs. `python scripts/run_all.py` runs all stages sequentially in the chosen copy. Browser path is `/usr/bin/chromium`; adjust only for an explicitly documented new environment. No network server is required.
