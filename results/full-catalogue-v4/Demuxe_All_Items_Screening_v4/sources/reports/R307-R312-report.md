# Demuxe — R307–R312 research results

**18 September 2026 · Six executed sandbox pilots · 38/38 QA checks passed · No production source changes**

**Baseline:** `9abfd1b22300cf273fc0bd1a8290261281c8f3f3` remains current Demuxe `main` for this run. The exact R307–R312 titles were recovered from the Demuxe idea thread before execution.

## Decision summary

| Card | Disposition | Decisive result |
|---|---|---|
| **R307** | **Promising component / real MVC still required** | 120 dependent-view-shaped NAL units were removed while the extracted AVC base stream remained byte-identical to the authored base stream. Host pixels were identical; Chromium played 2.0 s at 160×90 with 59 frame callbacks. |
| **R308** | **Correct work elimination / current prototype slower** | Exact output while recomputing only 18.15% of total pixels, but the sparse Python path took 13.74 ms versus 3.12 ms for vectorized full filtering (~4.4× slower). |
| **R309** | **Promising / strong for RMS-energy queries** | Cached cross-products reproduced all 180 integer mix energies exactly. Cache build + all queries: 7.83 ms versus 195.08 ms direct (~24.9×); measured break-even is about 7.2 mix evaluations in this fixture. |
| **R310** | **Validated finite-domain optimization** | Complete 256-code LUTs for both μ-law and A-law reproduced one million-sample FFmpeg chains byte-for-byte. Bulk lookup was ~57.2× / 58.9× lower wall time than the host FFmpeg subprocess paths, but those ratios include process/filter overhead. |
| **R311** | **Validated correctness architecture** | CRC32 found exactly the three damaged frames, but a real equal-length collision (`6e2f58f7`) left two CRC-valid candidates. The trusted SHA-256 selected exactly one repair. |
| **R312** | **Promising / strong on sparse peaks, conditional** | Exact 4× oversampled peak while reconstructing only 2 of 469 blocks (0.426%), with ~11.5× component speedup. Dense control reconstructed all 469 blocks. |

## R307 — Extract an MVC base view for explicitly requested 2D playback

The fixture starts from a valid 60-frame AVC Annex-B stream with stable configuration and four regular IDRs. The lab interleaves 120 syntactically shaped MVC prefix/slice-extension NAL units representing a dependent view, then applies the proposed 2D extraction rule: retain the ordinary AVC SPS/PPS/SEI/VCL units and discard the dependent MVC extension units.

The extracted stream is **byte-for-byte identical** to the original AVC base stream (`41ad7e439361aa03583dd88ff5ad028e3ccb2311f7d660848479471b73718ee5`). Host FFmpeg produces identical YUV, the extracted stream copy-packages to a 60-frame H.264 MP4, and Chromium plays the in-memory MP4 at 160×90 for 2.0 seconds with 59 frame callbacks.

**Evidence boundary:** this validates the base-view selection primitive, not general MVC playback. The extra-view units are a controlled MVC-shaped fixture rather than a genuinely encoded two-view MVC movie with real inter-view prediction. Before promotion, repeat with real MVC material and verify view IDs, parameter-set relationships, access units, timestamps, random access and any container signaling.

## R308 — Move already-filtered pixels instead of filtering them again

A 12-frame BGRA scrolling sequence was encoded to ZMBV and decoded back **byte-exactly**. Each transition shifts the previous image and applies bounded changed regions. The post-decode effect is a finite 3×3 integer convolution followed by a deterministic integer color transform.

For pixels whose translated input neighborhoods are unchanged, the prior frame's already-filtered pixels can be moved directly. Dirty/exposed neighborhoods are recomputed. Across all 12 frames, only **26,764 / 147,456 pixels (18.15%)** required filtering, and the assembled outputs are pixel-exact to full filtering.

The performance result is negative for this implementation: vectorized full filtering took 3.12 ms versus 13.74 ms for sparse Python gather/scatter. That is an implementation cost, not a correctness failure. Actual decoder motion-vector plumbing plus a low-overhead native/GPU dirty-region path is required before claiming a speed win.

## R309 — Recalculate mix loudness from cached cross-products

For linear mixes `y = aX`, sum-square energy is `aᵀGa` where `G = XXᵀ`. The test uses eight deterministic integer PCM tracks and 180 changing integer coefficient vectors. Direct sample mixing and cached quadratic-form energy match **exactly as integers**, and the derived RMS values match after the shared square root.

The one-time Gram build cost was 7.80 ms; all 180 cached queries took 0.0249 ms. Directly rebuilding every mix took 195.08 ms. Including cache construction, the measured fixture is ~24.9× faster, with a break-even around 7.2 changed mixes.

This result applies to linear mean-square/RMS energy. It does **not** mean EBU R128/LUFS, true peak, frequency-weighted loudness, dynamics or nonlinear effects can be reduced to this same small matrix without additional state/terms.

## R310 — Compile G.711 processing chains into exact lookup tables

G.711 has only 256 possible input codewords per law. The lab enumerates every μ-law input and every A-law input through the same deterministic, stateless FFmpeg chain (`volume=0.75, volume=-1.0`) and stores each resulting output code as a 256-entry table.

On one million arbitrary input samples, table lookup is **byte-for-byte identical** to running the full FFmpeg decode/filter/re-encode path for both laws. A shuffled-order control also matches, verifying the tested chain is sample-local rather than history-dependent.

The observed host-process-to-lookup ratios (~57.2× μ-law, ~58.9× A-law) are not a production speed forecast because the FFmpeg side includes process startup and filter-graph overhead. The durable result is the exact finite-domain compilation. Stateful filters, resampling, dithering, packet loss concealment and history-dependent gain cannot use a simple 256-entry LUT this way.

## R311 — Use frame CRCs to narrow a repair, then require trusted-hash verification

The test file contains 64 fixed 256-byte frames with stored CRC32 values and a trusted whole-file SHA-256. Three frames are corrupted; scanning the cheap frame CRCs identifies **exactly frames 7, 23 and 51**.

The negative control is deliberate: after 84,512 deterministic candidates, the lab found two different equal-length 256-byte frames with the same CRC32 `6e2f58f7`. Both therefore survive the frame-level CRC gate. Replacing the other damaged frames gives two CRC-consistent repair candidates, but only the real frame reconstructs the trusted whole-file SHA-256 `2a67a58f6230583f1845b72e7d83c195061abf85f4f114610421af9e79ff50a1`.

This is the intended architecture: CRC narrows *where/which candidates to inspect*; a trusted cryptographic identity decides correctness. CRC must never be treated as authenticity or final repair proof.

## R312 — Find oversampled peaks by ruling out regions before reconstructing them

The reference reconstructs a 4× waveform with the same finite 17-tap, phase-specific sinc/Lanczos basis for every input region. For each 512-sample region, the candidate computes a conservative upper bound from the maximum source magnitude in the filter-support halo multiplied by the maximum phase L1 norm. Blocks are visited from highest bound downward; once the remaining certified bound is no larger than the best reconstructed peak, those blocks cannot win and are skipped.

On the sparse-transient signal, the exact peak is `0.957076930295` at input/phase (121336, 3). Only **2 of 469 blocks** required reconstruction and all skipped bounds were certified below the winner. Median component time fell from 26.87 ms to 2.34 ms (~11.5×).

The dense high-level control is equally important: its bounds remain too loose to rule anything out, so **469/469 blocks** are reconstructed. R312 is therefore a workload-sensitive exact optimization, not a universal true-peak shortcut.

## Evidence boundary

These are sandbox/component tests, not production Demuxe integration. R307 still needs real MVC media. R308 proves output reuse with a known motion relation but does not yet extract decoder motion vectors and is slower in this Python prototype. R309 covers linear RMS/energy only. R310 covers stateless sample-local G.711 processing only. R311 requires an already-trusted cryptographic identity. R312's win depends on sparse amplitude structure and sufficiently tight conservative bounds.