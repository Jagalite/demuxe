# Demuxe focused research — batch 5: D26–D30

**Executed:** 2026-09-20. **Repository read:** `Jagalite/demuxe`, `main` at `01611bdaa2d9a21903bd2f1086fe0d786df6d5d1`.

**Scope:** Five new bounded questions/subcases, largely advancing existing catalogue mechanisms. Temporary D-labels are not new canonical R-numbers. This package contains standalone prototypes, not execution or modification of the maintained Demuxe player. No performance gate was run or passed.

## Executive findings

1. **D26: browser-owned Opus mapping works without recoding audio.** A four-byte expansion of the identification header represents mono duplicated to both channels, mono-left/silence-right, or silence-left/mono-right. All 108 coded audio packets are preserved. Browser whole-file Ogg and WebM decoding matches the requested mappings exactly, and MSE has the expected channel signals through EOF. An independent libopus oracle agrees. **FFmpeg's default native Opus decoder unexpectedly silences both channels for the left-only mapping. That failed oracle is retained, not hidden.**
2. **D27: initialization omission is conditional.** A single avc3 initialization allows coded resolution changes and playback to EOF. When the aspect ratio changes, it retains incorrect display geometry; fresh initialization on the same SourceBuffer restores the checked reference output. Same-aspect-ratio transitions pass the six seek checks, but one first-run transition-frame geometry discrepancy did not reproduce. Seamless presentation remains unqualified.
3. **D28: retry requires both parser reset and stale-work rejection.** Real interrupted MSE appends recover after abort plus a complete random-access fragment retry, retaining the MediaSource and SourceBuffer. Actual late suffix bytes can break that recovery. The epoch guard is a prototype, not verification of Demuxe's production worker ownership.
4. **D29: stop these metadata-only crop routes on this profile.** MP4 clean aperture is ignored. Correct SPS crop transformations preserve all 30 coded-picture packets and produce exact requested cropped YUV in host decoding, but browser dimensions remain incorrect, even after coherent container geometry and color follow-ups.
5. **D30: stop naive MSE start trimming.** Removing decode preroll with append windows or negative timestamp offsets drops requested opening pictures. One variant still reaches EOF, making it a false success under an EOF-only gate. Keeping preroll and seeking provides the correct start witness; exact excerpt end/public UI behavior remains untested.

## Environment and method

Chromium **144.0.7559.96**, FFmpeg **7.1.5-0+deb13u1**, Python **3.13**, Playwright, NumPy and Pillow. Exact executable/feature evidence: `evidence/environment.json`. The browser runs on an opaque `about:blank` page with fixture bytes supplied through the test bridge. WebCodecs interfaces are unavailable in that context. This batch uses actual MSE, media elements, Canvas, and browser whole-file audio decoding; it does not bypass the environment's restrictions.

Fixtures are authored synthetic signals and pictures. Sources, transformations and deliberately wrong controls are included. Packet payload hashes, decoded sample comparisons, independent host output and timestamp-associated browser picture hashes are used where specified. **A playback event is not considered an output-fidelity oracle.** Browser output is generally compared with a same-route reference to avoid assuming different browser presentation paths use identical color processing.

These are feasibility/correctness screens, not benchmarks. No hardware acceleration, GPU overlay behavior, physical speaker/display output, browser-general support, real-world prevalence, CPU, energy, memory-system cost or production savings is claimed. The finite, tiny fixtures do not establish streaming scalability.

## D26 — Explicit mono duplication and silent slots through Opus mapping

**Relation:** directly advances the setup gate of `R225.produce-dual-mono-and-silent-channel-slots-through-opus-mapping-metadata`. The idea is not new to the catalogue; the actual writer and decoder comparisons are new in this batch.

**Question:** Can a requested output-channel arrangement remain metadata work, rather than PCM reconstruction, mixing and audio re-encoding?

**Construction:** A 48 kHz, 2.137-second mono Opus source is rewritten from mapping family 0 to a restricted family-1 configuration: one uncoupled coded stream, two output channels, mapping `[0,0]`, `[0,255]`, or `[255,0]`. RFC 7845 explicitly permits repeated channel indices and index 255 for silence. The initial Ogg page lacing/checksum is rebuilt. Every subsequent page remains byte-identical. A packet-copy FFmpeg remux supplies WebM for the MSE probe; it is not an audio re-encode.

| Property | Observation |
|---|---:|
| Source Ogg size | 22,698 bytes |
| Each transformed Ogg size | 22,702 bytes |
| Original coded audio packets preserved | 108 / 108 in each Ogg and WebM variant |
| Decoded sample frames | 102,576 per output channel |
| Requested scalar samples checked per stereo output | 205,152 |
| Browser whole-file Ogg mismatch counts | 0 for all three mappings |
| Browser whole-file WebM mismatch counts | 0 for all three mappings |
| Explicit host libopus mismatch counts | 0 for all three mappings |

The reference is the decoded mono source in each respective decoder, not the original signal before lossy Opus encoding. Exact cross-decoder float equality is not assumed.

Actual MSE/WebM playback seeks to 0.51 and 1.51 seconds and reaches EOF. A subsequent playback from 0.01 seconds is captured at the Web Audio boundary. Dual output has identical channel samples; left-only and right-only output have the correct active channel and an exactly silent other channel. The opposite-side variant is an actual wrong-output control. Corrupted Ogg page CRC, truncation and an unsupported output mapping are rejected by the prototype.

### Unexpected independent-decoder failure

The default FFmpeg decoder returns **102,576 zero-valued frames in both channels** for the left-only mapping. That creates **102,576 scalar mismatches** against its own decoded-mono-plus-silence reference. Dual and right-only mappings pass in that decoder. Explicit FFmpeg `-c:a libopus`, browser Ogg decoding, browser WebM decoding and MSE channel capture all produce the requested left-only arrangement.

This is an observed decoder-specific discrepancy, not a claim about its root cause, security impact, every FFmpeg version or every Opus mapping. Decoder-selection logs and output hashes are retained. The verification suite intentionally still fails the default-decoder left-map assertion.

### Timing restriction

MSE reports **2.161 seconds** for both the unmodified mono WebM control and all mapped WebM outputs, whereas the complete decoded PCM lasts **2.137 seconds**. Mapping does not introduce that discrepancy, but this screen **does not certify an exact MSE tail or exact post-seek PCM**. It establishes complete whole-file output and streaming channel identity, not complete streaming presentation equivalence.

**Decision:** pursue the restricted, explicitly requested browser-output adapter. Do not treat it as a universally interchangeable file transformation across every decoder. No downmix, arbitrary gain/mix matrix, multistream extraction, physical speaker identity, full Ogg validator, or untrusted-source authentication is implemented.

**Evidence:** `component_initial.json`, `mono.opus.probe.json`, per-variant probe files, `host_checks.json`, `browser_first.json:opus`, `browser_opusstream.json`, `browser_monostream.json`, `opus_additional_oracle.json`, and `left_*_decoder.txt` under `evidence/`.

## D27 — Configuration changes without an automatic player rebuild

**Relation:** extends `R091.in-band-video-configuration-changes-with-avc3-and-qualified-hev1`, whose previous record qualified a fresh-init AVC transition, not arbitrary no-init changes.

**Construction:** Three independently encoded 1.5-second, 20 fps AVC intervals use the same profile, track identity and time base. Each has IDR-aligned half-second fragments and repeated in-band SPS/PPS. The fragment decode times are rebased to one 4.5-second presentation; coded packets are not re-encoded during assembly.

Two geometry plans are compared:

- Changed aspect: `160×96 → 192×112 → 160×96`.
- Same aspect: `160×96 → 240×144 → 160×96`.

The first mode appends one initialization segment; the comparator appends the source-correct initialization at each interval. Both retain one MediaSource, one SourceBuffer and one media element. No inference about internal decoder instance reuse is made.

### Changed aspect exposes stale presentation state

With one init, playback reaches EOF, but the middle interval is observed as **192×115**, not the requested **192×112**. With fresh init, six timestamp-checked seeks across and backwards through the three intervals match standalone MSE reference geometry and hashes exactly. Across the 89 common sequential frame callbacks, **30 differ** between the two modes in the changed-aspect profile.

Separately decoding the three intervals from the constructed source with FFmpeg produces **90/90 RGB pictures exactly matching** independently decoded original interval files. This uses **three separate interval decodes**, not one uninterrupted host decode.

Replacing in-band SPS/PPS with same-length filler NAL units preserves VCL payloads but causes a real browser decode error at the geometry transition. Initialization is not a substitute for the required coded configuration state.

### Same-aspect result remains conditional

The same-aspect source passes all six seek/reference comparisons with one init and reaches EOF. However, the first sequential run reports old 160×96 display geometry at the 1.5-second transition callback, while fresh init reports 240×144. **88/89 common callback outputs match** in that run. A repeat instrumenting callback dimensions and presentation-frame counters has **89/89 matches** and no discrepancy. Both runs are retained.

This may involve presentation state or observation/event ordering; the experiment does not settle the cause. The repeat is **not** used to erase the first witness or declare seamless correctness. The first frame at startup was not captured by the sequential observer, so callback totals are not a dropped-frame measurement.

**Decision:** pursue a configuration/display-contract-aware continuation test. Do not infer that a matching aspect ratio alone is a sufficient admission predicate. Do not remove needed fresh-init appends to save metadata bytes. Fresh init can preserve browser-owned playback without rebuilding the application playback objects.

**Evidence:** `browser_epochs.json`, `browser_sameaspect.json`, `browser_boundary.json`, `transition_observations.json`, `host_checks.json:D27`, `host_reference_pixels/`, `host_interval_pixels/`.

## D28 — Reset parsing and reject stale completions before retry

**Relation:** an adversarial extension/reproduction of `R037.recover-an-interrupted-partial-append-without-replacing-mse`, not a new recovery mechanism. It also composes the earlier D12 generation concept with the actual MSE append boundary.

**Construction:** Three half-second video fragments. The middle fragment is interrupted either inside its `mdat` header or at 60% of its payload. The latter has already made media buffered through **0.75 s**, demonstrating that a partial append may have committed complete samples before the interruption.

| Sequence | Header interruption | Payload interruption |
|---|---|---|
| Uninterrupted baseline | Pass | Pass |
| Reappend complete fragment without abort | Append error | Append error |
| Abort, then retry complete random-access fragment | Exact checked pictures + EOF | Exact checked pictures + EOF |
| Abort, publish abandoned old suffix, then retry | Incomplete buffered range / picture timeout | Append error |
| Abort, reject old-generation suffix, then retry | Exact checked pictures + EOF | Exact checked pictures + EOF |

Four seek-picture hashes/times match the uninterrupted baseline for each successful recovery, and playback reaches EOF with the original SourceBuffer retained. No new MediaSource or media element is created.

`abort()` is **not rollback of previously buffered media**. The experiment retries a complete independently decodable fragment and checks the resulting timeline. It does not prove arbitrary mid-GOP retry, A/V synchronization, indefinite retries, or all parser states. The late suffix is really supplied to MSE in the negative control; the generation check is still simulated in the prototype rather than tested in maintained Demuxe workers.

**Decision:** carry this real stale-suffix negative into a maintained-owner test. No reason to expand this into a separate recovery subsystem before inspecting the current owner.

**Evidence:** `browser_recovery.json`, `recovery.js`, fixture fragment files and `manifest.json`.

## D29 — Metadata-only cropping: valid coded output, wrong browser presentation

**Relation:** a new bounded destination test adjacent to display-only operations (R008), not a proof that all crops can be moved into metadata.

**Question:** Could a static, explicitly requested crop retain browser-owned playback without a custom pixel-cropping stage?

A 160×96 source is given a centered **144×80 MP4 clean-aperture box**. Browser direct playback and MSE both ignore the requested aperture in this profile: all three checked pictures retain 160×96 geometry and the uncropped same-route hashes, while still reaching EOF.

A second approach uses FFmpeg's `h264_metadata` filter to express crop in SPS data, preserving all 30 VCL picture packets. Independent host decoding yields the exact requested planar crop. A coherent follow-up also changes the MP4 sample-entry/tkhd dimensions and explicitly normalizes the color declarations. A 32-pixel-left-crop variant is tested separately, not silently substituted for the original requested rectangle.

| Variant | Requested geometry | Browser MSE geometry | Browser direct geometry |
|---|---|---|---|
| Centered clean aperture | 144×80 | 160×96 | 160×96 |
| Initial SPS crop, original container dimensions | 144×80 | 152×91 | 152×80 |
| Coherent container + 8-pixel left/right SPS crop | 144×80 | 152×84 | 152×80 |
| Coherent container + 32-pixel left SPS crop | 128×80 | 160×100 | 160×80 |

All values above were observed at each of three checked timestamps. They are **observations**, not a diagnosis of the browser decoder or a universal alignment rule. Do not infer physical display behavior from Canvas alone. The full requested rectangle fails before a browser pixel-fidelity pass can be claimed.

**Decision:** stop these exact native-metadata candidates on the tested environment. Preserve the requested crop through a qualified presenter or other path instead of silently displaying a different image. Other browsers/codecs/crop profiles remain untested. Correct metadata-only output in host decoding is insufficient for route admission.

**Evidence:** `browser_first.json`, `browser_cropfollow.json`, `crop_comparison.json`, `host_checks.json:D29`, `crop_followup.py`.

## D30 — Trimming presentation must not delete decode prerequisites

**Relation:** adds the requested browser append-window negative to `R044.play-an-exact-requested-excerpt-without-re-encoding-its-edge-gop`. It does not complete the public excerpt implementation or its end-boundary gate.

A three-second, 25 fps AVC fixture contains B pictures and one-second random-access spacing. The requested opening is **0.36 seconds on the native presentation timeline**. References and candidates are compared through the same MSE route; host FFprobe timestamp origin is not assumed interchangeable with the browser's presentation origin.

| Method | Buffered presentation interval | Observed behavior |
|---|---|---|
| Keep decode preroll, then seek | [0, 3] | Correct pictures at 0.36, 0.60 and 1.20 s; EOF |
| `appendWindowStart = 0.36` | [1, 3] | Requested opening unavailable; picture wait times out |
| `timestampOffset = -0.36`, default window start 0 | [0.64, 2.64] | Reaches EOF, but early seeks land on 0.64 rather than the requested opening; wrong first two picture identities |

The last candidate's later picture does match the expected shifted reference. Thus it has not simply broken all decoding: it has **silently removed the beginning** while passing an EOF test. The MSE coded-frame algorithm explicitly permits dropping pre-window frames and requiring a new random-access point; append windows are not a general exact video-edit primitive.

The retained-preroll variant is deliberately the unmodified reference path, not a newly invented optimization. It shows that the browser can display the correct requested starting frame when supplied with required history. Start suppression, exact public zero-based timeline, end suppression, audio, pause/replay and maintained lifecycle remain separate gates.

**Decision:** stop naive append-window/negative-offset clipping. Pursue a presentation-boundary contract that keeps decoder prerequisites available. No re-encoding saving is quantified.

**Evidence:** `browser_clip.json`, `clip.js`, `bframes.mp4.probe.json`.

## Verification, retained failures and reproducibility

`evidence/verification.json` records **74 post-run consistency assertions: 73 pass, 1 fails**. The failed assertion is the **unexpected default FFmpeg decoder's left-only Opus mapping output**. It is intentionally not changed into a successful candidate result. `scripts/verify.py` exits nonzero while that failure exists. Expected candidate failures in other screens are correctly detected by their negative controls; this does not make those candidates successful.

The D27 first-run transition discrepancy remains outside a seamless correctness pass despite its non-reproduction. Initially trying to write one changing-resolution host decode into a single fixed PNG encoder produced unreadable output files after the size transition; those initial files/error logs are retained under `evidence/initial/`. The host oracle was changed to separately decode source-defined intervals, and its narrower scope is explicit. No unreadable output was counted as a match. The initial invalid `-autoscale 0` command was corrected to `-noautoscale` before that attempt; its error log is also retained.

`README.md` contains execution commands. `ITEMS.json` contains decisions, prior-item relationships and next gates. `LOCAL_AGENT_HANDOFF.md` specifies the next smallest maintained-player work. `checksums.sha256` identifies the package's bytes; generated fixtures may differ across encoders/tool versions and Ogg serial choices on a new run.

## Source references

Repository definitions were read at the pinned commit, not inferred from prior chat summaries:

- R225 mapping: `research/items/R225.produce-dual-mono-and-silent-channel-slots-through-opus-mapping-metadata/README.md`.
- R091 configurations: `research/items/R091.in-band-video-configuration-changes-with-avc3-and-qualified-hev1/README.md`.
- R037 recovery: `research/items/R037.recover-an-interrupted-partial-append-without-replacing-mse/README.md`.
- R044 excerpts: `research/items/R044.play-an-exact-requested-excerpt-without-re-encoding-its-edge-gop/README.md`.
- R017 unequal tails was inspected as another possible question and not added as a new experiment: the current record already documents working baseline tail handling and requires measuring residual cost before inventing retirement work.

Primary technical references, accessed for this screen:

- RFC 7845, Ogg Opus channel mapping, §5.1.1: https://www.rfc-editor.org/rfc/rfc7845.html
- MSE ISO BMFF byte-stream format: https://www.w3.org/TR/mse-byte-stream-format-isobmff/
- MSE specification, abort/parser reset and coded-frame processing: https://www.w3.org/TR/media-source-2/
- FFmpeg bitstream filters, `h264_metadata`: https://ffmpeg.org/ffmpeg-bitstream-filters.html

The technical references define mechanisms, not browser performance or these measured outcomes. The local evidence files support the experimental observations.
