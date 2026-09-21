<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Progressive and reduced-decode preview research import

Imported the supplied **Demuxe preview research** package unchanged. Attribution: **Demuxe preview research, prepared with ChatGPT, 2026-09-21.**

The package reports seven native component screens and zero browser codec experiments. Its browser attempt stopped at navigation. Imported measurements were not rerun here; archive integrity verification is not media correctness or performance qualification.

## Findings and ownership

- [R055.cache-bounded-decoded-previews-for-scrub-revisits](../../../items/R055.cache-bounded-decoded-previews-for-scrub-revisits/README.md): Authored PNG timings exclude preparation, transfer and storage. They motivate a baseline, not a replacement for the qualified bounded revisit cache.
- [R064.decode-directly-at-reduced-resolution-for-explicit-previews](../../../items/R064.decode-directly-at-reduced-resolution-for-explicit-previews/README.md): Native JPEG scaling and modern-codec lowres probes extend screening. They do not supersede the existing quarter-resolution MJPEG/MPEG-2 quality failures. The H.264 residual kernel is not a complete decoder or a certified-error JPEG implementation.
- [R072.decode-only-keyframes-for-coarse-previews](../../../items/R072.decode-only-keyframes-for-coarse-previews/README.md): VP9 packet selection and H.264 coarse IDR extraction support a browser baseline follow-up. Coarse 2-second and exact 3.5-second outputs are different contracts; full-file decode is not the best optimized random-access baseline.
- [R073.decode-a-gop-once-for-a-pending-exact-preview-batch](../../../items/R073.decode-a-gop-once-for-a-pending-exact-preview-batch/README.md): Context for exact refinement only; this package does not test pending-consumer GOP batching and does not replace the existing browser component result.
- [R185.progressively-refine-one-preview](../../../items/R185.progressively-refine-one-preview/README.md): Native progressive JPEG state reuse yields exact final pixels with extra total work. This does not overturn the existing browser compositor refinement/final-fidelity failure.

## Follow-up priority

First compare the existing independent browser preview provider with qualified source-keyframe extraction at the same represented timestamp, and exact refinement at the same exact target. Include cold source/decoder, warm operation, cache hit, preparation/index discovery, transfer, cancellation, cleanup and interference with ongoing playback. Keep source identity, requested/represented time and spatial fidelity explicit. Reuse the existing cache and pending-GOP ownership evidence.

Then evaluate codec-specific reduced decoding only under a predeclared quality contract. Native progressive JPEG is a separate provider profile from browser compositor delivery. Open selective H.264 reconstruction only if complete-provider measurements identify reconstruction as a material bottleneck; the seven-output 4x4 residual kernel omits prediction, entropy decoding, chroma, filtering and other transforms.

No imported speed ratio is a whole-player saving, and no retrospective threshold passes the performance gate. Current item definitions, stages, decisions, integration and qualification records are preserved. The provisional package key is resolved to existing owners rather than registered as a duplicate item.

## Preserved evidence and rights

- [Original report](snapshots/demuxe_preview_research/RESEARCH.md), [reproduction instructions](snapshots/demuxe_preview_research/REPRODUCE.md), and [handoff](snapshots/demuxe_preview_research/LOCAL_AGENT.md).
- [Original ZIP](snapshots/demuxe_preview_research.zip), [source manifest](snapshots/demuxe_preview_research/manifest.json), [mapping](mapping.json), and [verification](verification.json).
- [Notices](snapshots/demuxe_preview_research/NOTICES.md): original narrative/data CC BY 4.0, independent tooling Apache 2.0, and declared NOASSERTION for FFmpeg-generated chart/testsrc fixtures and derivatives. Preserve that unresolved provenance; public redistribution requires resolving those fixture rights or replacing them with approved independently generated fixtures. This import does not relabel them.

All packaged bytes, negative results, post-attempt browser scaffolding disclosures and original relative paths are retained. No production files are changed by this import.
