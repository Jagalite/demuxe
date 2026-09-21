# Demuxe focused research — Batch 7: D36–D39

**Executed preliminary component screens. Not a maintained-player run, release qualification, or performance benchmark.**

Repository reference: `Jagalite/demuxe`, `main` → `01611bdaa2d9a21903bd2f1086fe0d786df6d5d1`, checked with the GitHub connector during this batch. No repository files were modified or pushed. The repository was used for scope and overlap review; the executable candidates are the standalone scripts in this package.

Environment: Chromium **144.0.7559.96**, FFmpeg **7.1.5**, Python **3.13.5**. All four questions concern **video-only** presentations or timed images. There is no new audio, subtitle, A/V synchronization, HDR, hardware-acceleration, CPU, energy, or physical-display qualification.

## Executive findings

| Question | Executed result | Decision |
|---|---|---|
| D36: Source-indexed A/B/A MP4 view | Authored new sample tables; browser constructed a Blob from one header and original packet slices. All 60 picture ordinals and four return seeks matched the requested source pictures and timeline. | Pursue the bounded local view. Native HTTP virtual-resource playback remains blocked by environment. |
| D37: Repeat sample references, not stored picture payloads | The same 60-picture presentation used 40 stored packets, reducing the finite asset from 51,344 to 34,337 bytes. Browser output and host decoded output stayed exact. | Conditional storage/editing result; not fewer decodes and not a default playback optimization. |
| D38: Supply an independently decodable seek interval before earlier intervals | Browser displayed a late picture with only initialization plus its GOP, accepted earlier GOPs afterward in the same MSE objects, and matched ten timestamp/picture witnesses. | Pursue destination-level ordering qualification with a real player consumer. |
| D39: AVIF coded images as a timed AV1 video | Two three-image profiles became three-sample video with exact packet identity and host output. RGB/sRGB images matched the browser image pixels exactly; the YUV profile did not. | Pursue RGB subgroup. Stop claiming exact image/video presentation equivalence for the tested YUV profile. |

These are **four targeted follow-ups**, not four inventions absent from the existing catalogue. D37 builds on D36 and shares its fixtures. D39's RGB follow-up is a different input subgroup, not a lossless repair of the YUV inputs.

## Evidence standard and environment boundary

The candidates manipulate compressed bytes, timing/index metadata, or delivery order. Original test media are synthesized locally. FFmpeg is used to create fixtures and to provide independent packet/decoded-output checks; that oracle decoding is not candidate transformation work.

Browser observations include timestamp-bearing `requestVideoFrameCallback` witnesses, Canvas output hashes or full RGBA comparisons, reported duration, seeks, EOF, and cleanup. They do not prove physical display behavior, hardware decoding, seamless real-time switching, power consumption, or browser-internal zero-copy/decoder ownership.

The current page is an opaque, non-secure context. WebCodecs decoder APIs are absent there. A genuine loopback-server navigation was attempted and failed with **`ERR_BLOCKED_BY_ADMINISTRATOR`**. No browser policy was overridden. Consequently, D36 includes a tested byte-range mapping component and native **Blob** playback, not a working browser HTTP/Service Worker virtual URL. See `evidence/environment_probe.json`.

The browser harness transports fixtures with an exposed Python function. Those setup copies are neither hidden nor included in a runtime cost claim. The candidate Blob is assembled from source Blob slices, but the test then reads it completely to verify its hash. This test-only read is not proof of zero-copy operation.

---

## D36 — Author a source-indexed edited MP4, then leave playback to the browser

### Question and overlap

Can a bounded A/B/A edit be represented using newly authored sample tables and original coded samples, rather than decoding/re-encoding or relying on another muxer to author the edited header?

Nearest existing item: `R109.expose-an-edited-mp4-as-a-virtual-byte-range-url`. Its reviewed gate asks for a finite video-only closed-GOP A/B/A sample-table/range-map author, source validators, and cross-boundary comparisons. This batch advances that component gate, **not the complete HTTP authority and virtual-server integration**.

### Candidate

`edited_view.py` parses the actual source `stts`, `stsc`, `stsz`, `stco`, `stss`, sample description and media timescale. The restricted sources contain one AVC track, constant cadence, no reordered pictures, no nontrivial edit list, no alternate sample descriptions, self-contained media bytes and four-byte NAL lengths.

FFprobe independently checks the parsed positions, sizes, hashes, PTS/DTS/durations and sync flags. It is not used to supply the candidate's output tables. Selected starts require both a sync declaration and an AVC IDR NAL. Interval ends must be the next admitted GOP boundary or source end. This is not a complete arbitrary-AVC dependency prover.

The requested presentation is:

```
A samples 0–19 → B samples 0–19 → A samples 0–19
```

Both sources have 20 frames/second, identical sample descriptions and explicit color metadata. The author writes new duration/index/chunk tables and references the original packet extents. The browser constructs one Blob from the 1,184-byte header and 60 source slices.

### Observations

- Edited file: **51,344 bytes**, including **1,184 header bytes** and **50,160 coded-payload bytes**.
- **60 timeline samples**, with the requested three-second A/B/A sequence.
- All 60 packet hashes and rewritten timestamps/durations match the independently parsed plan.
- Complete host output is **1,382,400 YUV bytes**, exactly equal to independently decoded A/B/A source slices.
- **620 deterministic random/cross-boundary range reads** match the corresponding bytes of a materialized reference.
- Browser Blob construction matches the materialized reference hash.
- All **60 picture ordinals plus four return seeks** match the expected source picture hashes, geometry, and timestamps. Duration and EOF are three seconds.

### Controls

The author rejects non-random-access starts, non-GOP ends, invalid ranges, a source-content identity change, a forged sync flag on a non-IDR sample, and an unequal configuration record. The latter two are explicitly unit-level guard inputs; they are not new full media runs. The browser also rejects a changed source validator before publishing the view. A one-byte sample-address error causes actual browser decoding failure.

The early setup rejected A/B sample descriptions whose advisory bitrate boxes differed. The positive fixtures were then authored with bitrate boxes disabled, making their complete supported descriptions equal. This was fixture qualification, not evidence that arbitrary unequal descriptions are safely interchangeable.

### Limits and next gate

This does not qualify audio, reordered pictures, arbitrary edits, unknown configuration transitions, encryption, hidden feature preservation or network delivery. The parser and header author run in host Python; browser-side authoring is not implemented. Hashing entire sources and retaining complete source Blobs have costs. Browser-internal storage of Blob parts is unmeasured.

Next: port only this admitted component to the real owner, then test native remote range delivery with source validators and authority rules. Compare setup, source reads, retained bytes and cancellation against the current route before any value claim.

Evidence: `edited_component.json`, `manifest.json`, `browser_views.json`, `view_comparison.json`, and packet-probe records.

---

## D37 — Refer to repeated coded pictures twice without storing them twice

### Question and overlap

Can a finite A/B/A presentation keep one physical copy of A while giving its repeated samples distinct positions on the playback timeline?

Nearest existing item: `R120.repeat-media-without-repeating-mdat.report-frontier`, stopped for ordinary playback because stored-byte savings do not reduce repeated decoding. That restriction remains valid. The earlier item used repeated edit-list views; this experiment uses **sample/chunk-address aliasing**, not repeated edit-list interpretation.

### Candidate and result

D36's sample table writer is modified so the second occurrence of A points back to the first A payload offsets. All 60 sample records remain, with their own timestamps. The media-data payload physically contains A and B only.

| Measurement | Ordinary edited view | Aliased-payload view |
|---|---:|---:|
| Total asset bytes | 51,344 | **34,337** |
| Header bytes | 1,184 | 1,184 |
| Physical packet spans | 60 | **40** |
| Timeline samples/pictures | 60 | **60** |
| Duration | 3 s | 3 s |

The reduction is **17,007 bytes, 33.12% of this constructed asset**. It is not a CPU, decoding, memory or network-transfer percentage.

The table contains one backward address jump. Host packet/timing checks and complete decoded YUV match D36. **580 byte-range comparisons** pass. Native Blob playback matches all **60 picture ordinals and four return seeks**, with three-second duration and EOF. The wrong-offset control remains decisive.

### Limits and next gate

Repeated picture payloads are still presented and decoded again; no decoded-frame cache is demonstrated. Remote clients might reread earlier ranges, so file-size savings are not an automatic transfer reduction. This is relevant to explicit finite edited/repeated assets, not evidence to replace a working queue or loop API.

Next: only under an actual asset/export requirement, compare this with repeated edit-list views and normal payload layout across browsers and real range caches. Stop if the only proposed benefit is lower video decoding cost.

Evidence: the shared D36 component and browser records, with `aliased` entries.

---

## D38 — Admit a useful seek GOP without waiting for earlier GOPs

### Question and overlap

Can the browser consume whole independently decodable fragmented intervals in arrival order while their authored timestamps preserve presentation order?

Nearest existing work: `R188.schedule-verified-playable-data` establishes bounded dependency closure and trusted digest checks. This batch tests a **destination behavior** after complete GOPs are available. It does not implement another network scheduler or establish trusted verification of arbitrary live data.

### Candidate

An authored four-second, 80-picture AVC source has B pictures, closed one-second GOPs and four complete fMP4 fragments. Each fragment retains its original packet order, initialization configuration and authored decode-time header. This is **not arbitrary reordering of compressed dependent pictures inside a GOP**.

The source's presentation starts at 0.1 s because of the authored decode/composition timing, and the MSE presentation ends at 4.1 s. The candidate preserves that mapping; it does not silently normalize it to zero.

Tested orders:

- Reference: 0, 1, 2, 3.
- Permutation: 2, 0, 3, 1.
- Reverse fragment delivery: 3, 2, 1, 0.
- Target-first: 3, seek to the target, then 0, 1, 2.
- Duplicate delivery: 0, 1, 1, 2, 3.

### Observations

All five valid cases match **ten timestamp/picture/geometry witnesses** from the chronological baseline, retain the same JavaScript MediaSource/SourceBuffer objects, and reach EOF with duration 4.1 s. This does not reveal whether the browser internally recreates a decoder.

For the target-first case, the browser receives only **781 initialization bytes plus the 18,855-byte last GOP** before a seek request at 3.225 s displays the correct picture timestamped 3.2 s. The earlier three GOPs have not been supplied to that presentation. Its only buffered interval is [3.1, 4.1]. After backfilling the earlier GOPs, backward seeks match the baseline.

This is an actual browser supply-order test, not measured HTTP/P2P network latency or a maintained Demuxe planner implementation.

### Controls

With `SourceBuffer.mode = "sequence"`, the same permuted bytes are laid out by append order: the video reaches EOF, but **all ten baseline comparisons fail**, and duration becomes four seconds. It is playable but is the wrong presentation.

A wrong decode-time header on the final fragment overwrites/repositions content, leaves duration 3.1 s and makes the requested later picture unavailable. Six earlier observations are recorded, of which only four match the baseline.

The duplicate-append result establishes output equivalence at the checked points, not free/idempotent processing internally. General overlaps, malformed dependencies, memory eviction, audio and active decoder transitions remain outside scope.

### Next gate

Route one real seek through the maintained source identity/verification/dependency planner and append owner. Qualify cross-track timing, eviction, cancellation and source replacement. Count requests and bytes separately from elapsed network latency and decoding work. Stop an integration variant if it only duplicates an already-implemented seek path.

Evidence: `order_manifest.json`, `ordered_component.json`, `browser_ordered.json`, `order_comparison.json`.

---

## D39 — Reuse AVIF coded images as timed AV1 samples, with a presentation gate

### Question and overlap

AVIF image data can already contain an AV1 sync sample. Can a small item parser and a timeline writer turn an eligible still-image set into a browser-owned video presentation without raster reconstruction and re-encoding?

Nearest existing item: `R089.avif-image-payloads-as-timed-av1-video-and-eligible-av1-frames-as-avif`, whose setup gate asks for a compatible three-image set and packet/output comparisons. This is a forward-direction component screen. It does not implement reverse video-to-AVIF conversion or the public Demuxe image-sequence API.

The AVIF specification distinguishes simple image items, grids, auxiliary images, image transforms and color properties. Extracting an arbitrary first packet is not sufficient to preserve those features. See the external references below.

### Candidate

The actual parser reads `pitm`, `iinf/infe`, `iloc`, `ipco/ipma`, `ispe`, `pixi`, `av1C` and `colr`. It accepts a bounded single av01 item, one local extent, the tested property set, and exactly one sequence-header OBU plus one frame OBU. It retains color properties and requires matching image geometry/configuration/sequence headers across a set.

It rejects unsupported relationships, alpha/multiple items, transforms and unknown properties instead of silently discarding them. Supported test dimensions are capped; input and coded-item sizes are bounded. The parser is a strict experiment, not a hardened general HEIF implementation.

Three original coded items are wrapped into regular MP4 and fMP4 with durations **0.5, 1.5 and 0.75 seconds**. They remain **three compressed samples**, with presentation timestamps 0, 0.5 and 2.0 s. Host mux tables are authored in this package, not copied from a muxer's prepared timeline. These are AV1 video tracks, not a claim to have authored every AVIF image-sequence profile.

### YUV subgroup: playable, but fails exact browser image equivalence

The first three authored AVIFs contain 8-bit YUV 4:2:0 pictures. Their nclx properties actually read as primaries 2 / transfer 2 / matrix 1 / limited range; the report does not assume stronger declarations from command-line intent.

- Coded payloads: **1,030, 1,071 and 1,047 bytes**.
- Regular timeline: **3,850 bytes**. Fragmented timeline: **4,118 bytes**.
- All three coded payload hashes survive both wrappers unchanged.
- Complete host YUV output is identical to the original images: **69,120 bytes**.
- Browser direct and MSE routes seek through all six hold positions and reach EOF at **2.75 s**.
- Nevertheless, every checked Canvas picture differs from the corresponding browser-decoded original AVIF image.

Across the three unique images, direct playback differs at **24,182–31,668 RGBA component positions**, with maximum absolute component error up to **154/255**. MSE differs at **11,677–12,416 positions**, with maximum error up to **174/255**. These are exact comparison witnesses, not perceptual-quality scores. The cause was not isolated; do not attribute the discrepancy solely to one matrix, chroma filter, browser bug or decoder.

**Decision: reject exact-canvas-equivalence admission for this tested YUV subgroup.** Packet identity and host YUV identity do not establish identical browser-rendered RGB.

### RGB/sRGB subgroup: exact bounded result

A separate three-image source set is authored with RGB components, full range and explicit sRGB signaling (primaries 1 / transfer 13 / identity matrix 0). This changes the input profile. It is **not a repair of the original YUV files** and does not suggest re-encoding them as an optimization.

- Coded payloads: **1,982, 2,086 and 2,255 bytes**.
- Regular timeline: **7,025 bytes**. Fragmented timeline: **7,293 bytes**.
- All three coded payloads survive unchanged.
- Complete host GBR output equals the original image outputs: **138,240 bytes**.
- Both browser routes have **zero different RGBA components** at all six tested positions.
- Correct picture-hold timestamps, duration 2.75 s, EOF and cleanup pass.

The MSE codec used for this subgroup is `av01.1.00M.08`. A positive software-capable browser decoder is not proof of hardware support for that profile.

### Controls and next gate

Wrong primary identity, out-of-file extents, truncation and an actual alpha-bearing AVIF are rejected. A real RGB/YUV configuration mismatch is rejected by the compatibility guard. The earlier synthetic sequence-record mutation is only a unit-level predicate check, not a bitstream qualification result.

Next: integrate the RGB single-item subgroup only when there is a real timed-image consumer. Expand corpus and lifecycle checks without generalizing to YUV, alpha, grids, ICC transforms, HDR, arbitrary dimensions or sequence changes. Diagnose the YUV image/video presentation difference before reopening exact output claims. Compare complete construction/decoding/presentation cost with an existing native image-decoding baseline; there is no presumption that video decoding is cheaper.

Evidence: `avif_component.json`, `avif_rgb_component.json`, `browser_avif.json`, `browser_avif_rgb.json`, and both comparison files.

---

## Verification and reproducibility

`python scripts/analyze_verify.py` records **69 passing consistency checks** and zero unexpected consistency failures for the delivered run. Some checks deliberately require a failed route or mismatched output. This does not convert D39 YUV, wrong sequence mode, wrong timestamps or wrong addresses into positive playback qualifications.

`evidence/verification.json` records scientific dispositions separately. `evidence/commands.jsonl` contains commands, return codes and stderr. `evidence/harness_notes.json` retains setup restrictions and harness changes. Full raw browser pixels are included so comparisons can be recomputed rather than accepted from a prose claim.

Run `python scripts/run_all.py` to regenerate candidates and execute browser screens. No Demuxe checkout, credentials, external sample media or network download is required. The dependency versions may change numerical/rendering results; each target runtime must qualify itself.

## Suggested order

1. **D38** for an actual maintained seek/delivery owner: the most direct ordinary-playback opportunity, without promising a decoder-cost reduction.
2. **D36** for an explicit edited-source consumer: the missing authoring/range-map gate is substantially advanced, but remote delivery remains untested.
3. **D39 RGB** as a narrow timed-image destination with an explicit fidelity contract; retain the YUV rejection.
4. **D37** only under a finite repeated-asset/storage requirement, not as a default decoding optimization.

## Source references used for framing, not as experimental evidence

- Reviewed repository commit: `https://github.com/Jagalite/demuxe/tree/01611bdaa2d9a21903bd2f1086fe0d786df6d5d1`.
- Repository items: R109 virtual byte-range URL; R120 repeated mdat references; R188 verified-playable scheduling; R089 AVIF/AV1 representation conversion. Each exact item key is recorded in `ITEMS.json`.
- W3C Media Source Extensions: `https://www.w3.org/TR/media-source-2/`.
- W3C ISO BMFF byte-stream format: `https://www.w3.org/TR/mse-byte-stream-format-isobmff/`.
- AOM AV1 Image File Format, v1.2.0: `https://aomediacodec.github.io/av1-avif/`.
- RFC 9110 HTTP semantics: `https://www.rfc-editor.org/rfc/rfc9110.html` (future virtual-resource validation context only; no working browser HTTP route is claimed).
