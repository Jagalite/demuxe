# Demuxe media/browser frontier — R301–R306 executed results

**Run date:** 18 September 2026  
**Proposal source:** exact Project file `Demuxe_R301_R306_Proposals.md`.  
**Environment:** Chromium 144.0.7559.96, FFmpeg 7.1.5, libaom 3.12.1, libopus 1.5.2, Python 3.13.5, Node v22.16.0.  
**QA:** 33/33 checks passed.

## Result summary

| ID | Verdict | Decisive result |
|---|---|---|
| R301 | **PARTIAL — primitive works, full construction unproven** | A shown edited AV1 packet was encoded with `last_ref_updates=0`; the following frame continued from prior reference state. Denying every reference to force a truly independent replacement hit a libaom encoder assertion, and the required hidden-original + independent replacement stream was not authored. |
| R302 | **BLOCKED** | No libultrahdr implementation/tooling is installed. `ImageDecoder` and WebGPU are absent on the permitted page; localhost navigation is administrator-blocked. |
| R303 | **PROMISING SCHEDULE COMPONENT / GPU UNTESTED** | 120 FFmpeg-kernel-style luma edge operations formed 43 dependency batches (max width 15); 20 adversarial within-batch orders were byte-exact to sequential. Reversing dependencies changed 1735 bytes. |
| R304 | **PROMISING EXACT STRUCTURE / PERFORMANCE UNRESOLVED** | Rank-2 authored 8×8 FIR bank reproduced the full 64-path bank exactly in integer arithmetic; float max error 8.527e-14. Logical independent filters reduce 64→2, but the timing baseline is not an optimized MIMO convolver. |
| R305 | **PROMISING / STRONG COMPONENT** | Composed Ogg CRCs matched both stored checksums and libogg on all 7 real pages, and continued matching after serial/sequence-header changes without rescanning immutable page bodies. |
| R306 | **BLOCKED — encoder/model build** | Installed libopus 1.5.2 exports DRED parse/process/decode APIs, but `OPUS_SET_DRED_DURATION` returns `OPUS_UNIMPLEMENTED`; no compatible DRED payload can be generated for the required eager-vs-deferred test. |

## R301 — Edit displayed frames without changing prediction history

The installed libaom encoder exposes no-update frame flags. A four-picture lossless pilot inserted an edited displayed picture whose decoder-observed `show_frame=1` and `last_ref_updates=0`. The next picture decoded normally, demonstrating the useful **displayed-but-do-not-refresh** primitive.

However, the proposal requires more: the edited picture must be independently coded while the source B becomes a non-showing reference-building picture. When all AV1 reference permissions were disabled to force the replacement independent, libaom asserted that LAST or ALTREF must remain available. The lab has no maintained AV1 syntax writer for constructing the required intra-only/no-refresh header by hand. Chromium also exposes no `VideoDecoder` on the permitted page. Therefore the complete A→hidden-B→edited-B→C construction remains **unproven**, not failed.

## R302 — Ultra HDR split reconstruction

The prerequisite reference implementation is absent (`libuhdr`/`ultrahdr` is not installed), and there is no Ultra HDR tooling in PATH. On the permitted browser page `ImageDecoder` is undefined and WebGPU/WebGL are unavailable. A localhost origin was attempted but navigation returned `ERR_BLOCKED_BY_ADMINISTRATOR`.

Because the card's first oracle explicitly calls for matching pinned libultrahdr reconstruction on identical component arrays, reimplementing the math without that independent oracle would not satisfy the test. Verdict: **BLOCKED**.

## R303 — H.264 deblocking dependency graph

The component prototype uses the exact scalar arithmetic/threshold semantics of FFmpeg's 8-bit luma weak and strong filters and conservative worst-case read/write footprints. It generated 120 edge operations, including 11 strong and 8 disabled edges. Read-after-write, write-after-read and write-after-write conflicts created 376 directed dependencies.

Kahn scheduling yielded 43 dispatch-equivalent levels with maximum width 15. Twenty randomized orderings inside each level all produced exactly the same 64×64 result as strict sequential execution. A deliberately unsafe full reverse ordering differed at 1735 samples (max delta 3), confirming that ordering really matters. The threshold-equality negative control also stayed unchanged as required by FFmpeg's strict `<` comparisons.

This establishes the **schedule construction**, not GPU performance or complete H.264 integration: edge parameters were synthetic validated values rather than captured from a full reference-decoder trace, and this environment has no GPU API.

## R304 — factored multichannel filter bank

An authored 8-input/8-output FIR bank was created as `H[k] = A diag(g1[k],g2[k]) B` for every one of 31 taps. The independently constructed 64 impulse responses and the two-filter factorized graph were exactly equal under integer arithmetic. All eight input-impulse controls matched, and random floating-point processing differed by at most 8.527e-14 (RMSE 1.417e-14). An 8-rank identity control was rejected rather than approximated.

The logical filtering paths fall from 64 to 2 plus the input/output mixes. The NumPy convolution microprobe showed a large timing difference (1.766 ms vs 0.068 ms median), but that is **not** a valid optimized MIMO/FFT baseline, so no whole-engine speedup is claimed.

## R305 — composable Ogg CRC summaries

A real four-second Ogg Opus file contained 7 pages and 38,709 body bytes. For every page, the candidate zeroed the checksum field, CRC'd the header, and combined that state with the cached body CRC using the Ogg polynomial/state convention. Every composed checksum matched both the original stored checksum and `libogg`'s `ogg_page_checksum_set`.

Changing stream serial and page sequence numbers while retaining the same bodies still produced exact libogg checksums from header scan + cached-body summary. Empty spans, 255/510-byte spans, multiple spans and reordered lengths also passed the composition identity. Across 100 hypothetical header relayouts this would avoid rescanning 3,832,191 repeated body bytes after the cold summary pass.

The cache is valid only for immutable, identity-bound bytes. This test proves the checksum composition primitive; it does not yet claim complete alternate-lacing/granule repagination.

## R306 — deferred Opus DRED processing

The installed libopus is version libopus 1.5.2. It exports `opus_dred_parse`, `opus_dred_process`, DRED decoder creation and DRED synthesis. But its encoder was built without the matching DRED generation feature: `opus_encoder_ctl(OPUS_SET_DRED_DURATION(50))` returns -5 (`OPUS_UNIMPLEMENTED`).

The proposal requires a mutually compatible DRED encoder/model/bitstream revision before comparing eager and deferred processing. Ordinary Opus or synthetic redundancy would not satisfy that contract, so this card is **BLOCKED** at build capability.

## Evidence boundary

R303 is a scheduling/kernel component result, not GPU execution. R304 proves exact factorization and bounded floating equivalence, not an optimized-convolver speedup. R305 proves Ogg CRC-state composition, not cryptographic integrity. R301 is deliberately partial, and R302/R306 are prerequisite blockers rather than negative media results.