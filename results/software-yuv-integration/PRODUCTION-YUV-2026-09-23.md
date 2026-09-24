# Bounded Software YUV production admission, 2026-09-23

## Decision

**Promote the corrected YUV presenter for the qualified decoded-frame subset.**
Automatic Software now uses YUV only when the native frame predicate passes;
otherwise it uses RGB and reports a rejection reason. The three requested
Software routes selected YUV. ProRes `yuv422p10` selected RGB. All eleven
accepted final-build RGB/YUV CPU pairs favored YUV, with steady video near
30 fps and zero measured drops. The public playback modes remain Native,
Hybrid and Software.

RGB fallback inside the combined engine uses mpv's RGB conversion and its
existing RGBA WebGL upload. The explicit RGB control uses the standalone
ImageData/2D presenter. This comparison therefore measures the current
Software RGB route against the production YUV route; it does not claim the
combined engine's RGB fallback has identical upload cost to the control.

This is a production Software presenter decision for a bounded frame contract,
not a claim of whole-product release readiness, other-browser fidelity or
long-duration playback qualification.

## Exact build and measurement contract

- Source HEAD: `1519377384fffce83896a4da5c911a36013f9a3b`, with scoped
  uncommitted presenter/build/test changes. `bash scripts/build-beta-engines.sh`
  passed, including LGPL closure and `build/beta-build.json` provenance.
  The local beta archive was assembled and license-checked at
  `build/beta-yuv-promotion/demuxe-0.3.0-beta.4.tgz`, SHA-256
  `f8dc45ca2766aac12839b4ed495fbc8473aa20911a3ea95ff4b966688fe4eb5b`.
  This dirty-source local archive is not a tagged release.
- The measured, recorded and packaged YUV Wasm SHA-256 is
  `ff34d22c348b6bce26f50c76e39682f48d37f138cb633494729badfab5de530b`;
  RGB Wasm is `cf85433d7dbccb5e18035a8e2e5359fa6d360d0f5e21c21d9b02a0b451e42b75`.
  The packaged presenter JS SHA-256 is
  `a797c7edfa0ceeb3870e24596025f86c9e60df21f9c1de391f99a774430180dd`.
- Apple M1, macOS arm64, 8 GiB, Chrome `153.0.8010.53`, AC power on every
  recorded sample. Each arm launched a fresh headed Chrome process with the
  same profile/flags, 1920×1080 canvas displayed at 960×540 CSS pixels,
  4-second warmup and about 12 seconds of steady measurement. Pair order
  alternated. `softwarePresenter: 'rgb'` was the control; the treatment omitted
  that option and used the production automatic Software decision.
- CPU is summed Chrome process-family CPU seconds divided by elapsed wall
  seconds, expressed as percent of one core. Browser focus, visibility,
  foreground PID, AC power and process IDs were checked throughout each
  window. Work outside Chrome, physical output timing and energy are not
  included. Timer attribution is not summed into this CPU value.
- Frozen fixture SHA-256: TS `2a8a669612280c1e1089abcb1774791e7d81c7413c8b8147817036d9b80c2095`,
  PS `522eac536b4ef0e36ffcf52b6989217f2b6010280fed6e9ee6754aaf2198b970`,
  AVI `b2cec9836caffc25ea8f15ebcfecd804cc5df05b3986d0cc76d042db61a8e21d`.

## Matched CPU and correctness

The table shows medians of accepted pairs; delta is the median of each pair's
YUV-minus-RGB difference, in percentage points of one core. These medians
are from the same final build and campaign, not the earlier battery runs or
README CPU catalogue.

| Software route | Accepted pairs | RGB CPU | Production YUV CPU | Paired CPU delta | Correctness |
| --- | ---: | ---: | ---: | ---: | --- |
| MPEG-2 + AC-3 / TS | 5 | 73.7% | 55.6% | −18.2 points | YUV selected; 10 accepted arms passed; zero measured drops |
| MPEG-2 + MP2 / PS | 3 | 72.4% | 52.7% | −19.3 points | YUV selected; all 6 arms passed; zero measured drops |
| MPEG-4 Part 2 + MP3 / AVI | 3 | 73.3% | 61.2% | −12.1 points | YUV selected; all 6 arms passed; zero measured drops |

The accepted paired differences were TS −14.9, −16.7, −18.2, −19.6 and
−26.2 points; PS −19.3, −13.5 and −24.3; AVI −10.0, −12.1 and −33.5.
All accepted windows had continuous Chrome process IDs, a focused visible
Chrome foreground process, AC power, zero reported frame drops and video
cadence between 29.7 and 30.4 fps. Every arm passed pause/resume, forward
and backward seeks, EOF and worker cleanup. The AVI spread warrants
workload-specific interpretation of the median; every matched pair still
favored YUV.

One initial TS YUV arm lost foreground to another process. Its 52.9% CPU
reading is **excluded**, as is its paired RGB arm for the paired table. A
fresh replacement pair at the same round index passed. The rejected arm and
the replacement are both retained in the raw records:

- `cpu-routes-2026-09-23T20-00-50.623Z/result.json` (initial TS series);
- `cpu-routes-2026-09-23T20-05-45.450Z/result.json` (TS replacement);
- `cpu-routes-2026-09-23T20-06-50.873Z/result.json` (PS and AVI series).

## Fidelity, fallback and lifecycle gates

- The independent libswscale full-chroma reference gate passed 80 controlled
  YUV420P patterns across BT.601/709, limited/full and left/center chroma
  placement. Declared-site YUV output was within max 2/255. The left-sited
  vertical edge has an explicit negative control: same-coordinate center
  sampling differs by 88/255, while corrected sampling matches exactly.
  Scaling and letterbox cases stayed within max 2/255 and p99 1/255.
- Frozen actual player frames 120 (TS/PS) and 119 (AVI) were within max
  2/255, p99 0, of the independent full-chroma reference on the final Wasm.
  RGB matched the mpv-style fast swscale reference within max 3/255. Its
  large edge difference from full-chroma output is the known resampling
  choice, not a YUV fidelity failure.
- Four actual player BT.601/709 × limited/full patch cases passed with
  zero center-patch error. Animated subtitle composition, four seeks,
  disable/reenable, resize, two WebGL context losses/restores, paused redraw
  and zero workers after cleanup passed. Source replacement switched
  YUV → ProRes RGB → YUV while rate control and cleanup passed.
- ProRes `yuv422p10` and a 4:4:4 filter selected RGB with `pixel-format`;
  a 65×49 YUV420P source selected RGB with `odd-source-dimensions`; a
  negative-stride filter selected RGB with `plane-layout`. A 90-degree
  display rotation selected RGB with `rotation`, rendered without the
  mpv crop assertion, and matched the orientation of FFmpeg's rotated
  reference image. The rotation fallback required inverse mapping of mpv's
  rotated source rectangle and RGB texture coordinates; it does not enlarge
  the YUV admission predicate.
- The exact local archive passed the Software default and explicit RGB
  override consumer checks. The archive contains both Wasm engines, the
  YUV presenter and the admission/capability documents. No engine Wasm
  embeds this checkout's absolute path.

## Production admission predicate

The decision is frame-based within Software. Admit only `IMGFMT_420P` with
even positive source dimensions, positive and sufficient Y/U/V strides,
the full visible source rectangle, rotation 0, BT.601 or BT.709 matrix,
explicit limited or full range, explicit left or center chroma location,
BT.1886 transfer, no HDR metadata and no wide-gamut primaries. The tested
destination scaling and letterbox operations remain allowed. If WebGL2 is
unavailable, the standalone RGB engine is used. Everything else remains RGB:
odd dimensions, source crops, rotation, 10-bit, 4:2:2, 4:4:4, HDR,
unresolved matrix/range/chroma metadata and other pixel formats. Diagnostics
expose `softwarePresenter`, `softwarePresenterPolicy` and
`yuvRejectionReason`.

The measured gain and independent-reference fidelity support the bounded
automatic Software change. No 10-bit, 4:2:2, HDR, ProRes or further YUV
optimization is admitted by this decision.
