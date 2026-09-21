<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Local-agent handoff — D48–D51

## Required starting point

Read `REPORT.md`, `REPO_LINEAGE.md`, `ITEMS.json`, and `evidence/analysis.json`. The repository review was at `efd9e1537666b3120936ed24a34431645506e953`; inspect the current worktree before importing. These D labels are provisional conversation IDs, not canonical R assignments.

Replay into a new directory using `python scripts/run_all.py --output /tmp/demuxe-batch10-replay`. Preserve the original results and any new disagreement. Do not replace a negative with an updated all-green label.

First inspect maintained owners to see whether each behavior already exists. No wholesale refactor, generalized transform engine, custom decoder, or new backend is authorized by these screens alone.

## D49 — smallest useful next test

Locate the native media element's display-operation owner and determine whether display-only crop already uses a clipped DOM viewport. Keep original media/decode semantics, and expose the operation explicitly rather than silently changing the media rectangle.

Run the supplied exact DPR1 rectangles in the maintained player. Use the uncropped SAME-route image at matched presentation times as the display-operation reference. Also preserve a separate independent decoder/fidelity comparison where that is the route's pre-existing contract; this package does not repair R008's chroma-edge failure.

Add maintained seek/source replacement, changing source dimensions, non-square pixels, rotation, subtitle coordinate mapping, pointer mapping, fullscreen and picture-in-picture cases. Do not force GPU-layer promotion and then call hardware-overlay eligibility proven.

Preserve the DPR2 odd rectangle's one-level differences. Either fix them under the exact contract or define a separately authorized bounded-error display contract; do not silently relabel exactness. Benchmark only after output qualification, against the actual existing crop implementation, including compositor and cleanup cost.

## D51 — bounded native graph follow-up

Identify a real already-decoded preview/edit consumer. Use the original buffers with two native source nodes and two a-rate gain nodes. Preserve sample coordinates for offset/start/end and the declared <=2e-7 float output bound, with exact unaffected regions. The 128-sample exact result must not be generalized to all lengths.

Add source replacement and cancellation during the fade, live scheduling with actual deadlines, matching context sample rate, channel layout and mono/stereo policy, and a declared clipping/headroom policy. If the use case requests a lossless integer export rather than float playback, this is a different contract: do not reuse the bounded-error acceptance.

Measure against the maintained/native graph baseline, accounting for source decoding and all retained inputs. No new compressed bridge encoder should be built for the sake of reproducing this playback result.

## D50 — precision regression, not blanket normalization

Audit where large parsed media ticks first become JavaScript Number/double seconds. Preserve source-bound precise origins and perform any needed differences while integer-valued. The JS component is intentionally narrow; use it as a test oracle/example, not an arbitrary MP4 parser.

The 13.26-hour offset already works through timestampOffset in this browser. The giant tick tests are stress cases and must not inflate claimed format coverage. R220's existing transport unwrapping stays authoritative.

Before any multi-track adapter, specify one common timeline mapping that preserves relative audio/video/subtitle offsets and edit/composition semantics. Cover fields beyond tfdt, including indexes/events where applicable. Negative tests should detect correct pictures at wrong times. Reject unknown or conflicting origin authority instead of inventing one.

## D48 — preserve the strict stop

Current result: float host short windows match; browser short windows do not. The browser failure is deterministic, not removed by the tested extra warm-up. Full-prefix controls match and explicit fixed-point host decoding shows a matching one-step discrepancy pattern. Browser internal decoder choice was not traced.

Do not implement a magic two/three/eight-packet exactness promise. To reopen, choose either a traceable decoder/state boundary or a separately predeclared error-tolerant operation. New performance work must compare a real persistent/range-aware consumer to the existing route; the old R230 subprocess result remains stopped on cost.

Add VBR, other sample rates, joint stereo, MPEG2/2.5, Xing/LAME delay and final trim, source identity, damage, and cold/warm decoder cases only after the exact numerical question is resolved for a real consumer. Full-source reads used to build the test index are not evidence of range-fetch savings.

## Import and claims

Keep component correctness, complete operation correctness, performance, integration and release status separate. Passing the 83 consistency checks means the observations agree with the recorded scientific dispositions, including failures. It does not promote four candidates to production.

Suggested priority: D49 narrow display-operation regression; D51 already-decoded native graph; D50 integer safety tests; D48 retained counterexample. Do not push or modify production defaults solely on these artifacts.
