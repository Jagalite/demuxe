<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Completed source gates

This records existing item-specific source decisions in the stage checklist. It does not add experiments or change the original scoped findings.

## R014.avoid-duplicate-resampling-and-oversized-audio-work-batches

Current AO explicitly negotiates browser context rate and fixed ring transport; no duplicate resampling stage or oversized-work regression was identified in these owners. Retain required source-to-context conversion and current batching. Reopen only with a rate/occupancy trace demonstrating avoidable conversion or retained work; physical device conversion remains unobserved.

## R033.interleave-samples-for-earlier-complete-a-v-output

Related report explicitly records frag_interleave=1,2,4 losing AAC packets/tail and no earlier joint A/V; current code deliberately omits this option. Stop the reported settings/profile rather than repeat a known equivalence failure. This is a source-reconciled historical negative, not a new local experiment.

## R050.evict-on-actual-gop-boundaries-to-preserve-useful-rewind-media

Current eviction chooses known RAPs behind playback and buffered seek checks live ranges plus retained RAP coverage. The proposed application-level boundary mechanism is already present; browser allocation opacity remains.

## R056.map-repeated-clip-boundaries-in-integer-media-ticks

Current queue activates independent sources after ended rather than accumulating rounded clip durations onto one timeline. No cumulative float-offset algorithm exists at this owner; the historical arithmetic report also rejects a contrived rounded baseline.

## R069.separate-decoder-compatibility-from-per-source-initialization-identity

Same-configuration configure occurs within semantic seek/reset clearing software buffers, replay, delivered/recovery and keyframe state. No redundant wrapper-only configure boundary exists in inspected owner. Do not suppress this reset.

## R070.remove-the-intermediate-host-remux

Maintained rm_open already bounded-prefetches AAC and derives initialization before direct fragmented output; there is no intermediate host MP4 stage in runtime. The lab two-pass removal is therefore not a missing production optimization.

## R076.definition-not-recovered

R76 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

## R077.definition-not-recovered

R77 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

## R078.definition-not-recovered

R78 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

## R079.definition-not-recovered

R79 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

## R080.definition-not-recovered

R80 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

## R081.definition-not-recovered

R81 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

## R087.dependency-aware-transport

Current source delivery requires exact validated file ranges. Synthetic base/enhancement WebSocket loss demonstrates a dependency rule, not fidelity-preserving transport for ordinary compressed files; degraded frames are outside the current output request.

## R096.sparse-native-video-with-explicit-long-frame-holds

Sparse long-held pictures are valid for an explicitly static authored timeline; ordinary source playback cannot drop changing/dependent pictures. Current direct route can already attempt prepared sparse files, so a new runtime mechanism is not justified for general playback.

## R098.one-atlas-video-for-many-synchronized-visible-clips

Current player presents one selected timeline, with no simultaneously visible synchronized grid. Atlas preparation requires re-encoding and forces shared seeking, so it does not preserve arbitrary independent-player behavior.

## R111.factor-repeated-fmp4-sample-metadata-into-defaults

Pinned FFmpeg movenc writes default duration/size/flags in tfhd and emits trun exceptions for differing duration, size, flags and CTS. Current mux uses this writer; another equivalent defaults rewriter duplicates the stated mechanism.

## R120.repeat-media-without-repeating-mdat.report-frontier

The queue opens each source independently; it does not author repeated edit-list views. Repeating mdat references saves stored bytes but still decodes repeated pictures, so it is not a decode optimization for current playback.

## R128.fast-playback-does-not-imply-cheap-decoding.report-frontier

The maintained rate setter changes playbackRate only. The supplied report shows every source frame decoded at faster rates, decisively rejecting faster playback itself as a dependable decode-work saving.

## R129.pitch-preservation-is-a-real-optional-processing-stage.report-frontier

The rate control does not expose changed-pitch permission. Disabling pitch preservation changes audible output; overlapping historical CPU samples cannot justify silently changing that contract.

## R135.microfragment-size-versus-startup-bytes.report-continuity

Reconciled completed prior evidence: Current maintained native mux defaults its first fragment to 0.5 s and subsequent fragments to 0.5 s, with actual packet-boundary constraints. The report compares 2 s with 500 ms; adopting that exact interval is not a new missing change here. This does not assert every output fragment has exact 500 ms duration.

## R139.mix-channels-before-performing-all-their-output-transforms

The selected Native adaptation explicitly preserves channel layout and does not admit an output downmix. Spectral mixing before synthesis requires that requested matrix plus compatible codec window/state; no such operation is available to optimize in this route.

## R142.the-same-no-index-fmp4-when-all-bytes-are-local.report-continuity

Local File playback already goes through an object URL and direct-first policy. There is no rule rejecting local media solely for lacking mfra; the locality-dependent direct attempt exists without a new adapter.

## R148.actual-mpeg-2-coefficient-data-reused-by-jpeg

The historical bridge admits only flat DC-only MPEG2 I blocks and rejects actual nonzero AC. Current playback uses general MPEG2 software decode where no browser bridge exists, so this restricted grayscale construction cannot replace that route.

## R149.image-data-through-a-lossless-audio-decoder

Image-as-FLAC is unrelated to current audio output contract and both historical fixtures are larger than PNG. Browser recovery relies on a matched sample rate and nearest-grid decoding, not exact float PCM. No image carrier consumer exists and speakers must not receive carrier data.

## R151.parsed-coefficients-as-a-cache-tier

Current retained caches hold decoded video frames, not repeated JPEG crop/downsample queries. The report itself shows coefficient storage larger than pixels and excludes object/RSS costs; it does not justify replacing this playback cache tier.

## R154.silence-certification-mathematical-boundary-only

The report itself disproves zero-current-coefficients implying silence when prior overlap is nonzero; no coded AAC coefficients or overlap state were certified. Current native adaptation does not admit AAC for this decode path and exposes no AAC synthesis-state certificate. Skipping synthesis from packet silence assumptions is unsupported in this profile.

## R155.fused-synthesis-and-resampling-mathematical-boundary-only

The maintained adaptation contract forbids resampling, and the historical dense 24MiB matrix only verifies linear composition. It lacks real AAC transforms, streaming edge handling and comparison against a fast implementation; no optimization is supported.

## R156.sparse-translucent-layers-with-correct-disposal

For the maintained subtitle overlay, old/current bounds are unioned, the bounded staging canvas is reset, all current tiles are redrawn and only that region is uploaded. This already applies sparse presentation with disposal at that specific layer owner. It does not implement a compressed layered-video format or claim reduced physical GPU traffic.

## R157.interpolation-guided-by-real-codec-motion-vectors

Current bridge exposes decoded pictures but not codec motion-vector side data, and ordinary playback does not request synthetic intermediate pictures. Historical cut control is worse than frame hold, rejecting universal guided-interpolation quality from average errors.

## R163.recover-an-interrupted-recording-from-a-committed-sample-journal

Current remux streams bounded transient fragments into MSE; it is not a durable recorder and has no journal/fsync commitment contract. Recovery of a recording is useful but no existing persisted-output path is being optimized.

## R167.produce-a-requested-dissolve-directly-in-transform-space

The current presenter already has decoded surfaces, so a requested display dissolve can blend there. Transform-space JPEG output differs at intermediate alpha and needs entropy serialization; it is an export representation, not a pixel-identical live-display shortcut.

## R168.compress-cold-reference-tiles-not-just-whole-cached-frames

Browser reference pictures are opaque; retained frames are output surfaces, not motion-compensation reference tiles. The historical cold-tile trace decompressed frequently and was much slower than dense access, so it is not a latency optimization for current owners.

## R179.exact-subtitle-font-subsetting

The full report shows a concrete decomposed combining-acute mismatch for the subset recipe. Current libass receives complete supplied fonts under byte/cache limits; reducing these fonts with that failed recipe cannot preserve the exact subtitle contract. This is a historical experimental rejection, not a new test or an environment blocker.

## R189.sparse-track-future-time-bounds

Scoped mux selects only video and audio. No selected sparse metadata track is present to create the source model bottleneck; implementing sparse-frontier machinery here has no current opportunity.

## R197.common-jpeg-quantization-basis-without-requantization-loss

Current playback consumes JPEG/video pixels without requiring a shared coefficient quantization basis. The gcd transform is exactly useful for coefficient editing but substantially grew both example files, so it is not a transparent compression/playback improvement.

## R204.edit-mp3-coded-gain-without-changing-spectral-payload

Current real-time gain already uses one GainNode without audio re-encoding. Editing MP3 global_gain is a narrow approximate altered-output/export representation, so it offers no demonstrated advantage over the existing live gain owner.

## R212.vectorize-across-independent-streams-rather-than-time

Current player produces one selected audio stream, not eight independent IMA state machines. Cross-stream SIMD requires simultaneous independent demand absent from this playback profile; adding dummy streams would create an artificial gain.

## R219.shared-spectral-analysis

The current browser audio stage is a PCM consumer; the qualified filter subset is scalar volume, with no repeated source FFT across multiple FIR outputs. Shared FFT algebra is valid but there is no duplicated transform at this owner to remove.

## R221.gpu-intermediate-lifetime-planning

Presenter owns simultaneously needed Y/U/V and overlay textures. No multi-pass transient effect graph or delayed preview allocation exists for lifetime aliasing to reclaim. Report planner savings do not apply to this owner.

## R224.opus-exact-state-pre-roll.report-continuity

The report contains a concrete counterexample to treating an ordinary 80 ms Opus preroll as bit-exact state restoration. Current packet-copy Opus and browser seek behavior expose no decoder-state witness; original compressed packets cannot justify an exactness claim. The report fixture first passes at 600 ms but supplies no universal bound.

## R228.naive-aac-splice-is-rejected.report-continuity

The supplied counterexample preserves lengths/sample counts yet changes decoded AAC B, decisively invalidating naive concatenation. Current queue opens each source separately rather than claiming same-header raw splice continuity.

## R231.aac-exact-seek-needs-a-tool-aware-profile.report-continuity

Current adaptation does not claim arbitrary AAC sample-exact restarts. The cited default AAC-LC failure after 100 preroll frames invalidates codec-name-only or fixed-count exact-seek claims; tool-aware admission is necessary.

## R238.let-channel-reduction-cross-the-resampler-boundary

The audited native adaptation contract preserves channel layout and sample rate; there is neither requested channel reduction nor resampling to reorder. Adding downmixing would change output semantics rather than optimize this profile. Software filter routes require their own libswresample audit.

## R239.wait-for-the-required-pictures-without-draining-the-decoder

The browser decoder bridge submits ordinary packets without flush and requests operation 3 only for null-packet drain. Both workers flush at that drain operation. Thus the proposed removal of ordinary-batch drains is already satisfied at this owner; output watchdog and true EOF drain remain required.

## R241.jpeg-90-dct-domain-rotation.report-c

Existing display rotation operates after decode and preserves current presentation semantics. Coefficient-domain JPEG rotation is an export/representation operation with up-to-two-level IDCT differences, not an exact pixel replacement for present display rotation.

## R242.keep-decoder-sessions-continuous-across-transport-and-mux-boundaries.report-a

Reconciled completed prior evidence: The recovered report was blocked by an opaque insecure origin. The present secure environment has VideoDecoder. More decisively, current decoder bridge calls operation 3 only for a null-packet drain, and workers flush only for that operation; ordinary packet batches keep the decoder session. No unconditional transport-batch flush opportunity is present in these owners.

## R243.cache-inverse-transform-results-for-recurring-residual-blocks.report-a

Browser decoding exposes packets and frames, not residual transforms. The historical cache is slower on unique/mixed synthetic traces and approximately tied on repetitive pools; no real decoder trace or hook establishes opportunity.

## R243.remove-nonessential-h-264-sei.report-c

Native packet copy preserves codec parameter side data and packets. The report saves only a known x264 nonessential SEI in a controlled fixture, not arbitrary type-6 semantics. No admitted metadata-discard contract exists; broad SEI stripping would violate requested color/timing/orientation semantics.

## R244.make-dithering-reproducible-at-any-sample-position

Current lossless preparation rejects quantization and copies integer values; its optional S16/S24-to-float conversion is exact. There is no dithered parallel quantizer at this boundary, so adding counter noise would change required output rather than remove work.

## R244.recompute-video-effects-only-where-the-input-actually-changed.report-a

Current presentation receives complete frames with no trustworthy effect-damage metadata. The reported full compare/retain/halo CPU implementation is 3.28x slower despite fewer evaluated blur pixels, so porting that discovery scheme has negative evidence.

## R244.reservoir-independent-prepared-mp3.report-c

Current packet-copy playback preserves source MP3 and does not author a no-reservoir encoding. Removing reservoir dependence changes preparation requirements and still leaves synthesis-state preroll, so it cannot make arbitrary MP3 packets independent.

## R245.factor-a-multichannel-filter-bank-into-fewer-actual-filters.report-a

The current admitted audio graph has no exactly factorizable FIR bank; the host rank-two win depends on supplied factors and excludes clipping. No 16-to-2 filter transformation applies to scalar volume or arbitrary filters.

## R246.make-parallel-audio-quantization-deterministic-without-shared-random-state

The Philox source provides concrete deterministic-worker correctness, distinct from unspecified legacy dither equality. Current playback has no Q8-to-integer parallel render stage; the reported worker results do not justify inserting quantization into this lossless path.

## R247.definition-not-recovered

R247 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

## R248.definition-not-recovered

R248 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

## R249.definition-not-recovered

R249 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

## R250.definition-not-recovered

R250 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

## R251.definition-not-recovered

R251 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

## R252.definition-not-recovered

R252 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

## R253.definition-not-recovered

R253 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

## R254.definition-not-recovered

R254 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

## R255.definition-not-recovered

R255 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

## R256.definition-not-recovered

R256 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

## R257.definition-not-recovered

R257 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

## R258.definition-not-recovered

R258 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

## R259.definition-not-recovered

R259 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

## R260.definition-not-recovered

R260 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

## R264.exact-incremental-image-statistics

The report assumes sparse edits of a persistent scalar image with per-tile histograms. Current presenter draws changing full video frames and has no persistent histogram/statistics consumer; two bounded pixel checks are not such a workload.

## R265.sparse-correction-for-cached-linear-audio-filtering

The reported mechanism accelerates sparse edits to cached LTI FIR output. Current audited playback adaptation streams frames through FIFO, not an editable audio document with cached filter output. Streaming decode cannot claim the sparse-edit saving.

## R266.snappy-dependency-graph

Pinned Snappy copy primitive handles overlap sequentially; historical graph construction is 4.1x to 11.3x slower on both tested CPU shapes and incomplete for full Snappy framing. Do not replace the CPU decoder on this evidence. GPU availability is not a graph-executor result.

## R271.opus-fec-aware-scheduling

Maintained path reads complete immutable file ranges and treats failed transport as an error; no real-time lossy Opus receive/PLC/FEC policy exists. Concealment changes exact file playback output.

## R272.roi-videoframe-copyto

Current retained presentation transfers complete VideoFrame resources; fallback copy reads the full visible rectangle because downstream playback needs the whole picture. There is no ROI analysis consumer to justify a cropped copy in this profile.

## R276.definition-not-recovered

R276 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

## R277.definition-not-recovered

R277 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

## R278.definition-not-recovered

R278 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

## R279.definition-not-recovered

R279 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

## R280.definition-not-recovered

R280 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

## R281.definition-not-recovered

R281 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

## R282.definition-not-recovered

R282 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

## R283.definition-not-recovered

R283 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

## R284.definition-not-recovered

R284 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

## R285.definition-not-recovered

R285 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

## R286.definition-not-recovered

R286 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

## R287.definition-not-recovered

R287 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

## R288.definition-not-recovered

R288 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

## R291.disable-in-loop-filtering-only-after-proving-it-is-a-no-op

Pinned FFmpeg already returns when alpha/beta are zero and the historical encoder already disabled these filters. Its successful rewrite needed an artificially enabled equivalent source. A new derivative preprocessor has no demonstrated useful no-op workload in current software decode.

## R294.parallelize-a-nonlinear-peak-release-envelope-using-composable-summaries

Current admitted scalar gain and ring output do not compute max-decay envelopes. The report exact/toleranced prefix result is for a specific recurrence and cannot replace a differently defined compressor or limiter.

## R298.copy-surviving-packets-to-release-oversized-backing-buffers

RangeReader returns views into bounded cache blocks, but the native source worker immediately copies them to its mailbox; encoded browser packets are copied out of Wasm before submission. No long-lived sparse JS packet handles retaining 16 MiB source slabs were found in these owners. Range cache itself retains intentional bounded reusable blocks.

## R299.change-flac-predictor-order-directly-in-the-residual-domain

Historical order-1 to order-2 transform is exact but increases fixture bytes 1.7% and provides no complete preparation/decode gain. Current adaptation uses the optimized FLAC encoder; replacing it with residual conversion lacks a demonstrated value on this profile.

## R304.factor-a-multichannel-effect-into-fewer-independent-filters

The scoped Native/Hybrid admitted effect is scalar gain, and FLAC adaptation preserves channels without an 8x8 FIR bank. The exact factorization report is useful algebra, but no current MIMO convolution workload exists in these owners.

## R305.compose-ogg-checksums-from-reusable-byte-range-summaries

Maintained remux output is MP4/WebM, not Ogg page relayout. Historical exact Ogg CRC composition offers no repeated checksum scan in these owners to remove. Source integrity is not replaceable by CRC summaries.

## R306.defer-opus-redundancy-processing-until-it-can-repair-a-real-gap

Maintained finite-source path reads complete authorized bytes and has no packet-loss concealment deadline or DRED model state. Normal packets make redundancy irrelevant for this exact-file profile; historical encoder build blocker is not asserted about current SDK.

## R309.recalculate-mix-loudness-from-cached-cross-products

Current gain is one scalar playback control; diagnostics expose bounded RMS, not stem-mix loudness analysis. The report proves integer mean-square energy, explicitly not full K-weighted gated LUFS. There is no repeated multistem analysis query here to accelerate.

## R310.compile-g-711-processing-chains-into-exact-lookup-tables

Pinned G711 already uses conversion maps; current native adaptation does not admit a G711 process/reencode operation. Historical host-process ratios are not an optimized fused baseline, and there is no current fixed telephony recipe to compile.

## R312.find-oversampled-peaks-by-ruling-out-regions-before-reconstructing-them

Current output diagnostics do not perform a full finite-filter oversampled peak scan. The report shows a workload-dependent exact digital reference optimization, not an opportunity to replace ordinary playback or its RMS observation.

## R314.send-gif-dictionaries-to-the-gpu-instead-of-expanded-index-images

Historical per-phrase descriptors already exceed complete index bytes by 29.7% before dictionary traffic. Current rendering has no GIF dictionary job consumer. GPU availability does not rescue the failed initial layout economics without a separately specified coarser executor.

## R316.cache-the-peak-envelope-of-every-fixed-gain-mix

There is no fixed-gain multistem peak-query service in the current player. The report itself needs about 1493 repeated queries to repay Python hull construction; using it for one playback gain setting would add preparation with no relevant amortization.

## R317.parallelize-a-true-attack-release-envelope-with-piecewise-affine-maps

The report floating transfer-curve implementation exceeds its 1e-12 tolerance by orders of magnitude and is slower. Current scalar/audio ring operations do not need this recurrence. Preserve the exact rational identity but reject that floating implementation rather than marking it merely blocked.

## R319.copy-only-the-part-of-a-decoded-videoframe-an-analysis-task-actually-needs

The exact proposal requires an analysis task needing only a rectangle. Current caller consumes whole pictures and optimized path transfers retained frames; no unnecessary analysis full-copy boundary was found.

## R320.gram-cache-after-a-fixed-fir-effect.report-continuity

There is no repeated gain-vector energy-analysis stage over fixed filtered stems in current playback. Gram quadratic forms answer aggregate energy only and do not replace actual mixed samples or changing FIR processing.

## R323.merkle-proof-cached-range-verification.report-continuity

Current range reads use immutable/ETag authority and bounded cached ranges; they do not rehash the complete object for every independent request. The report explicitly conditions its large saving on that repeated-hash baseline, so that optimization opportunity is absent in this profile. ETag authority is not claimed cryptographic Merkle authentication.

## R324.reuse-av1-show-existing-frame-for-repeated-ui-states

Current browser decoder already consumes standard AV1 coded streams; Demuxe does not author UI state streams. The report ordinary encoder already uses show_existing and yields the same total size, so no new encoding benefit is established over its correct baseline.

## R325.decode-only-the-alpha-plane-of-a-transparent-image-when-color-is-already-cached

The player presents video plus subtitle overlay, not repeated WebP color+alpha asset variants. The report exact independent ALPH reuse is meaningful for a separate image cache but no current repeated color decode owner was identified here.

## R331.decode-sparse-flac-channels-only-when-the-selected-output-matrix-actually-needs-them

Current Native adaptation admits mono/stereo preservation and does not permit a matrix that ignores selected 7.1 FLAC channels. Skipping channels would change requested output in this scoped route, even though independent subframes can support an explicitly different matrix elsewhere.

## R333.keep-soft-telecine-as-progressive-pictures-plus-timing

Related report found one progressive reconstruction plus repeat timing, not duplicated field pictures; current player does not explicitly enable deinterlacing and forwards complete decoded images. No removable telecine stage is identified for this default progressive profile. This is not whole-browser cadence qualification.

## R337.evaluate-tone-curve-statistics-from-an-exact-source-histogram

Histogram push-forward is exact for declared pointwise integer LUT statistics, but the current player renders requested images and has no repeated candidate-statistics query stage. It cannot substitute for spatial effects or final rendering.

## R339.collapse-chroma-expansion-and-final-resizing-into-one-filter

The maintained YUV presenter samples subsampled planes directly in the final draw with crop/rotation/color conversion. It does not first materialize a full-resolution chroma plane and then resize it. The specific removable intermediate in the proposal is absent from this owner; arbitrary filter substitution would not preserve its contract.

## R342.recompute-lookahead-gain-only-where-an-edit-can-affect-it

There is no finite-window sample-peak edit processor in current playback adaptation. Historical incremental results qualify only the stated gain rule, not FFmpeg alimiter with recursive release. Ordinary playback gain changes do not create sparse source edits.

## R345.stack-png-images-by-joining-their-compressed-scanline-streams

Current player does not batch PNG previews into atlases. Historical splice is exact but cold assembly is slower than the tiny baseline; cached-metadata advantage would require repeated prepared-image reuse absent here. This is scoped no current profile, not unsupported deflate.

## R346.turn-paeth-prediction-into-composable-byte-state-maps

The existing Paeth owner computes one predictor per byte. Historical dense 256-state maps are exact but 252.4x slower and require 4096 logical map bytes for a 1024-byte row. No reason to replace current CPU reconstruction with this candidate.

## R347.morph-convolution-effects-using-reusable-basis-outputs

Current native graph has scalar gain, not a persistent convolution-basis morphing effect or repeated automation-edit cache. Historical correct basis outputs do not make this an optimization of the actual admitted gain operation.

## R357.evaluate-gain-only-loudness-changes-from-a-sorted-energy-index

Current gain changes playback, while diagnostics offer RMS rather than a retained integrated loudness query. No hundreds-of-gain-candidates normalization service exists here. Historical libebur128 result is scoped and promising only for such repeated analysis.

## R361.keep-frame-adaptive-analysis-and-rendering-on-one-gpu-timeline

The inspected player presenter has no current-frame histogram/percentile/LUT CPU feedback round trip. It directly converts/samples video and renders overlays. Adding a requested contrast effect would be new functionality, not removal of a present synchronization bottleneck in this profile.

## R365.compute-gif-color-statistics-without-expanding-lzw-strings

Historical aggregate-query kernel is exact and beneficial on repetitive GIF but slower on noise; current player requires spatial decoded pixels and has no GIF histogram request. An added aggregate parse cannot be credited as replacing rendering.

## R366.evaluate-time-varying-audio-fades-from-cached-polynomial-moments

Current player uses scalar playback gain and diagnostic RMS, not repeated fixed-alignment polynomial fade energy queries. Historical result needs about 48 queries plus retained source arrays for cancellation fallback; it does not render chosen audio or compute loudness.
