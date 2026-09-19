# Demuxe media/browser frontier — R295–R300 executed results

**Run date:** 18 September 2026  
**Proposal source:** `Demuxe_R295_R300_Proposals.md` (exact Project card set)  
**Environment:** Chromium 144.0.7559.96, FFmpeg 7.1.5, Node 22.16.0, Python 3.13.5.  
**QA:** **59/59 checks passed.** No Demuxe production source changes.

## Result summary

| ID | Verdict | Decisive result |
|---|---|---|
| R295 | **BLOCKED — physical overlay lab** | Headless Chromium has no `/dev/dri`, WebGPU or WebGL and cannot expose physical overlay/energy diagnostics. |
| R296 | **PROMISING COMPONENT / PERFORMANCE UNRESOLVED** | Stateless requests 50→3→51→3 reproduced source fragment bytes exactly; repeated 3 is identical. Reconstructed 3+4 append/play in Chromium MSE. |
| R297 | **CONDITIONAL MEMORY TRADEOFF** | 1,000,000-sample run index answered 20,308 adversarial/random queries exactly and reduced modeled metadata payload **77.8%**, but random queries were **2.97× slower** than fully expanded typed arrays. |
| R298 | **PROMISING / STRONG** | 64 MiB of retained backing storage fell to **96 KiB** after copying only 96 KiB of unique surviving packet data; packet bytes and concurrent/duplicate ownership remained exact. |
| R299 | **PROMISING EXACT MECHANISM / TRADEOFF** | Actual order-1 FLAC residual stream became order 2 without full PCM-block reconstruction. libFLAC and FFmpeg outputs are sample-exact; file grew **11,625→11,823 B**. |
| R300 | **PARTIAL — REAL TRACE BLOCKED** | Transform-result cache semantics are exact, but the installed H.264 decoder exposes no coefficient trace, so realistic nontrivial reuse and decoder speedup cannot be qualified. |

## R295 — preserve hardware-overlay eligibility

The required evidence is a physical compositor decision plus matched system cost/energy. This environment is headless Chromium, has no `/dev/dri`, and exposes neither WebGPU nor WebGL. `requestVideoFrameCallback` and MediaSource exist, but neither establishes platform overlay admission. The card is therefore **BLOCKED**, not failed. No CSS-only proxy is promoted as evidence.

Evidence: `results/r295.json`.

## R296 — seek fragments without replaying mux state

A 60-second synthetic H.264 Baseline/AAC fragmented MP4 contains 60 one-second fragments. The constructor parses each fragment into an immutable recipe containing its exact moof template, explicit `mfhd` sequence, per-track `tfdt` values and `mdat` payload; construction is a pure function of that recipe rather than a mutable writer counter.

The required generation order **50 → 3 → 51 → 3** produced source-exact fragment bytes. Fragment 3 had the same SHA-256 both times. A non-key video packet at ~3.221 s was used as the mid-GOP control and was rejected before construction.

For destination validation, initialization + reconstructed fragments 3 and 4 produced ten video frames and 94 audio-frame hashes in FFmpeg. Chromium MSE buffered **3.008–5.021386 s**, presented 3.021386/3.221386/3.421386/3.621386 s frames, reached readyState 4 and reported no media error.

Ten thousand pure constructors took ~79.4 ms in this Python prototype. That is a construction microbenchmark, **not** evidence that this beats Demuxe's current persistent mux path; current-path integration/profiling remains the economic gate.

Evidence: `results/r296.json`, `fixtures/r296_source.mp4`, `fixtures/r296_frag3_4.mp4`.

## R297 — query MP4 tables without full sample expansion

The synthetic index contains **1,000,000 samples**, 133 `stts` runs, 109,928 irregular chunks and 157 sample-to-chunk runs, with variable sizes and offsets crossing 4 GiB. Compact queries were compared against a fully expanded typed-array oracle for **20,308** boundary/adversarial/random samples; timestamp, offset, size, configuration and sync status all matched.

Modeled raw metadata payload:

- expanded typed arrays: **22.00 MB**;
- compact + variable sample sizes: **4.89 MB** (**77.8% lower**);
- compact if sample size is constant: **0.89 MB** (**96.0% lower**).

The tradeoff is lookup cost. 100k random queries took medians of **134.7 ms compact vs 45.4 ms expanded**. This is therefore conditional: valuable only if real metadata expansion is a meaningful memory/startup problem. Signed composition offsets/reordered pictures remain the explicit next gate.

Evidence: `results/r297.json`, `scripts/r297.py`.

## R298 — compact surviving encoded views

Four **16 MiB** application-owned ArrayBuffers retained only six unique 4 KiB packet regions each, plus duplicate/concurrent handles. In always-view mode, those tiny views retained all **64 MiB** of backing storage. Density-aware compaction copied the **96 KiB** of unique live packet bytes into four small slabs and migrated all 28 handles consistently.

Results:

- unique retained backing: **64 MiB → 96 KiB** (**99.85% reduction**);
- copy work: **96 KiB**, versus 64 MiB for always-copy (**99.85% less copying**);
- hashes: exact;
- duplicate views: migrated consistently;
- cancelled owner: did not invalidate remaining owners;
- transferable control: source detached and transferred bytes remained exact.

An isolated Node `arrayBuffers` measurement independently reported **64 MiB retained** for views versus **96 KiB** after density compaction. As expected, process RSS did not deterministically mirror logical ownership. The policy microbenchmark was ~0.545 ms for density compaction versus ~34.3 ms for copying every packet; these are synthetic JS allocation/copy timings, not a browser-session forecast.

Evidence: `results/r298.json`, `scripts/r298.js`, `scripts/r298_mem.js`.

## R299 — FLAC predictor order conversion in residual space

A real 4096-sample mono FLAC frame selected fixed predictor **order 1**. The transformer parsed its Rice-coded residuals, recovered only the additional target warm-up sample `x1 = x0 + r1[1]`, and generated order-2 residuals as adjacent differences of the source order-1 residuals. It rebuilt Rice coding, alignment, frame CRC-16 and STREAMINFO frame-size fields.

The **4,094 transformed residuals** exactly matched an independent PCM-derived order-2 oracle. Both libFLAC and FFmpeg decoded every sample exactly to the source PCM. Integer identity tests also passed negative ramps, impulses, random 16-bit samples, 16-bit extrema, **24-bit extrema**, and a short legal block.

The target used Rice parameter 5 versus source 4 and grew **11625 → 11823 bytes (+1.7%)**. Thus the compressed-to-compressed mechanism is exact, but this fixture gives no compression-size reason to prefer order 2. The Python arithmetic microprobe is not an end-to-end codec speed comparison.

Evidence: `results/r299.json`, `fixtures/r299_order1.flac`, `fixtures/r299_order2.flac`.

## R300 — cache H.264 inverse-transform results

The first requirement in the card is a **real coefficient trace before building the cache**. A controlled 120-frame H.264 Baseline/CAVLC/4x4/no-deblock repetitive-graphics fixture was decoded with FFmpeg's documented `dct_coeff` debug flag, but the H.264 decoder emitted **zero coefficient trace lines**. No instrumented H.264 decoder build is available in this lab, so realistic coefficient-block reuse cannot be measured honestly.

The exact cache boundary was still verified against FFmpeg's 4x4 integer-transform formula. A 100,000-job controlled kernel test stored signed `T(coefficients)` residuals and then combined them with each job's own predictor. Full-key verification survived deliberately colliding fingerprints, one-coefficient near misses did not hit, and all reconstructed outputs matched recomputation. Caching final pixels was correctly shown unsafe when predictors differ. An adverse 20,000-block random control had **zero repeated coefficient blocks**.

The artificial high-reuse workload showed a ~2.06× Python kernel reduction, but that number is **not a codec result** because the required real trace prerequisite failed. Verdict: **PARTIAL / TRACE BLOCKED**; do not implement or claim performance until an instrumented decoder measures real nontrivial reuse.

Evidence: `results/r300.json`, `fixtures/r300_repetitive.mp4`, `tmp/r300_dct_debug.log`.

## Evidence boundary

R296 proves deterministic/session-independent construction from parsed immutable fragment recipes; it does not yet prove an economic improvement over the current Demuxe mux path. R297 compares compact and expanded component representations, not Demuxe's current metadata structure. R298's ownership accounting is application-buffer accounting; JavaScript GC/RSS are separately nondeterministic. R299 is exact only for the admitted fixed-predictor profile. R300 explicitly stops before a production cache because the required real coefficient trace is unavailable. R295 requires a physical hardware/display laboratory.