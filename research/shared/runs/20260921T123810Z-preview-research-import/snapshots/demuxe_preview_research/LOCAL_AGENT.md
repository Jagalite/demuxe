<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Local-agent continuation prompt

Continue the attached Demuxe progressive/reduced-preview investigation. Read `RESEARCH.md`, `item.json`, and the raw evidence before changing production code. This is a completed component screen with a bounded follow-up, not a mandate to build a new universal video decoder.

## 1. Incorporate without duplicating research

Inspect current main, `research/PROCESS.md`, templates, and existing item homes. Search by mechanism: reduced-resolution preview decoding, source keyframe extraction, scrub coalescing, cancellation, GOP reuse, and preview caching. Resolve the relevant full keys; do not assume an R-number alone identifies an item. The attached key is provisional and unregistered.

Import the evidence under the appropriate canonical home/shared run, retaining source files, negative results, hashes, provenance and this run's limitations. Update the item README/record together, append history, and register evidence. Keep any new local results in a new UTC-named run. No upstream push or production default change has already been made by this package.

Inspect the current preview/cache/index/engine/Shaka implementation before adding anything. Reuse a suitable existing provider and test harness rather than recreating the foundations. A current mpv/native/streaming cache may not expose reusable source bytes through the same interface: verify rather than assuming it does.

## 2. First establish the browser baseline

This environment could not navigate Chromium to the test page; it did not measure WebCodecs or hardware decoding. The attached browser script is **unexecuted diagnostic scaffolding** beyond its failed navigation attempt. Review its assumptions before using results, keep each decoder operation time-bounded, and ensure every frame/decoder is closed even when a test throws.

Run a small real-browser screen first. Use the installed browser, record version/device/OS and launch flags, and distinguish headful hardware testing from headless diagnostics. Try the best existing isolated-preview route in Demuxe, WebCodecs hardware-preferred/software-preferred routes where actually available, and the existing Wasm fallback. A request hint or support query does not establish which decoder executed.

Use the included 2 s IDR / 3.5 s exact-target case initially. Compare **coarse to coarse** at the same actual timestamp, and **exact to exact** at the same target; do not turn their accuracy difference into a same-output speedup. For frame correctness use actual pixel comparisons or strong digests with timestamps/dimensions, not the scaffold's small diagnostic fingerprint alone. Its full-GOP path converts many outputs for diagnosis; optimize the real preview path before treating that diagnostic timing as a production baseline.

Measure request-to-first-usable image, exact/refined completion, total CPU across relevant processes, source bytes, decoder setup, decode, resize/transfer, retained resources, and cleanup separately. Test cold decoder/cold source, warm decoder, and image-cache hit. Account for demux/index discovery, SPS/PPS/configuration and source authentication/range costs. Do not average cold and warm results into one headline.

Stop after the cheapest faithful screen if the current provider is already adequate or another cost dominates. A suggested first-screen effort budget is one focused work session; report the decisive evidence instead of expanding infrastructure indefinitely.

## 3. Choose the next path based on the bottleneck

**A. Indexed source extraction and temporal refinement:** pursue first when unnecessary dependency decoding or repeated seeks dominate. Use qualified random-access samples, accurate represented timestamps, coalescing and latest-generation publication. Keep main playback position/decoder/audio/buffering state untouched. Borrow cached immutable bytes only when actually supported. Cancelling preview work must not abort a shared fetch needed by playback. Decode toward the exact target only after dwell or an explicit accuracy request.

**B. Existing reduced-decode provider:** admit only when actual output dimensions and quality support it. JPEG is a positive native screen; MPEG-2 still needs quality/timing follow-up. Check best-effort ImageDecoder dimensions directly. Do not rename full video decode followed by canvas scaling as reduced video reconstruction.

**C. Selective video reconstruction:** open this only if software reconstruction is an important measured cost after A/B. Start with one explicitly whitelisted H.264 intra profile/block subset. The included kernel validates only 4×4 residual arithmetic; it does not cover the High-profile fixture's possible 8×8 transforms, prediction modes, entropy decoding, filtering or chroma. Reuse the existing decoder's validated parser/configuration wherever feasible, and preserve normal reconstruction as fallback for unsupported modes.

Before timing, verify required boundary samples against full reconstruction, then compare the final thumbnail against a declared spatial reference/quality threshold. Sparse sampling is not equivalent to area/Lanczos resizing. Validate eligibility and fallback on unsupported transform/profile/configuration cases. Include malformed/truncated input and a wrong-output control. Compare against the best existing complete keyframe decode plus resize, including tuned native/SIMD and browser hardware where applicable—not merely the toy C full kernel. If retaining a full frame/reference buffer remains necessary, do not claim reduced-frame memory.

Timebox the first faithful decoder prototype separately and report at the first decisive outcome. Stop/restrict it when benefits disappear after initialization/entropy/transfer costs or when maintenance becomes disproportionate. Removing this provider must not alter the public preview API or ordinary providers.

**D. Progressive authored images:** test only where an existing progressive image, sprite, or image-track source makes sense. Use first-output and total-completion metrics separately. Compare with an already-small independently fetched thumbnail; account for preparation, storage, caching and coefficient-buffer retention. The native prototype is not a claim that ordinary video has progressive JPEG scans.

## 4. Protect correctness and playback

Test source changes, time bucketing, cancel during decode, out-of-order updates, repeated targets, cache eviction and teardown. An exact cached result must not be overwritten by a stale or coarser update. Expose requested time, actual time and spatial qualification independently. A provider's final result is not automatically frame-exact.

Test rotation/aspect/cropping, timestamps with B-frame reordering, long/open GOPs and codec-configuration changes. Add animation/line art, subtitles or screen text, natural detail/grain, and high-motion material beyond the synthetic fixtures. Expand HDR/interlace/bit-depth coverage only with explicit qualification; reject or route unsupported cases. Preview metadata must reflect any altered tone/color/subtitle policy.

During real playback, issue isolated hovers, rapid sweeps, direction reversals, random jumps and held targets. Measure playback drops/deadlines/underruns and source-buffer pressure. Separate decoder state does not prove absence of hardware/CPU/memory contention. Keep preview concurrency, image/source-byte memory and speculative prefetch bounded; initially disable prefetch unless measured useful.

## 5. Declare a decision gate before new timings

Choose the workload and threshold before measuring. A suggested **local, targeted** gate for a custom provider is at least a 20% and 5 ms absolute improvement in first-usable latency on a meaningful software-fallback class, with accepted spatial quality and no playback regression beyond a predeclared noise budget. This is a suggested engineering gate, not a global policy or a retroactive pass for the attached exploratory data. Different intended benefits may justify a different declared gate.

Collect at least 30 interleaved samples per key condition where practical, retain raw trials, and extend noisy cases rather than hiding them behind medians. Report distributions and paired differences; do not give p95 an unwarranted precision from a handful of samples. Include setup, memory and total-work regressions in the decision even if first output improves.

Finish with one disposition for each path: pursue, stop_current_profile, inconclusive, or blocked, plus exact scope/reopening condition. Keep research, production integration and release qualification separate. Run repository research/licensing verification after import, but do not present those checks as media correctness tests.
