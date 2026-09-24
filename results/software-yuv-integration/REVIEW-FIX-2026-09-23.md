# Software YUV promotion review fixes, 2026-09-23

This record follows `PRODUCTION-YUV-2026-09-23.md`; that earlier CPU campaign
remains frozen. These changes address admission and RGB fallback fidelity. No
new broad performance comparison is claimed here.

## Admission

The effective decoded frame must still be even SDR 8-bit planar YUV420P with
full source visibility, zero rotation, BT.601/709 matrix, limited/full range,
left/center chroma placement and BT.1886 transfer. Primaries now use an exact
BT.601 525/625 or BT.709 allowlist. Unknown, BT.470M, EBU 3213 and other
primaries cannot pass by merely being classified as nonwide. ICC-bearing
frames also fall back to RGB. Original matrix, primaries and transfer values
retained by mpv are checked so an explicit unsupported declaration cannot be
normalized into YUV admission. RGB diagnostics include
`source-color-metadata` for that last rejection.

Some measured MPEG fixtures omit source color tags. mpv's decoder wrapper
resolves absent tags before presentation, using its deterministic defaults.
The frame predicate uses those effective values, and rejects any value still
unknown or unsupported. This preserves the previously measured routes while
making the distinction between source declarations and mpv-resolved values
explicit. In particular, this change does **not** assert that every source
color field in those fixtures was originally declared.

## RGB fallback

The combined Software engine retains mpv's RGB conversion for rejected frames
and uploads the RGBA result through WebGL. The original 2D ImageData engine
remains the explicit `softwarePresenter: 'rgb'` control and the no-WebGL2
fallback. A 90-degree source on a portrait canvas previously hit mpv's RGB
crop assertion; the combined engine now renders rotated RGB into a swapped
width/height buffer and rotates that texture into the destination canvas.
For rotated frames, subtitles are composed after the video rotation so the
text remains upright.

The browser regression fixture records the exact decoded frame at a paused
seek and compares the combined RGB fallback against the original 2D engine.
On Chrome 153.0.8010.53, ProRes, odd-dimension and 90-degree portrait output
were byte-identical. The 90-degree portrait case with a selected subtitle had
max channel error 1 and p99 0. The BT.470M-primaries YUV420P fixture selected
RGB with `color-primaries`. The browser completed cleanup in all cases. Raw
images and results are in
`admission-2026-09-23T22-37-07.722Z/result.json`.

This is a pixel-fidelity result for these rejected-frame cases, not a claim
that the WebGL upload and ImageData/2D APIs have identical cost or identical
behavior on every browser and output configuration.

## Final build and regression gates

The standard `bash scripts/build-beta-engines.sh` recipe completed with LGPL
closure and `build/beta-build.json`. Its YUV Wasm SHA-256 is
`dacf9b5002784287d4f12b8b8c7f0ba929949551a4dabb437fca78eccbadad8f`;
the presenter JS SHA-256 is
`c1661897d7366151059c72c11f04a71282af3fd8798d740d02a3b97362e05b2f`.
The exact local package `build/beta-yuv-review-fix/demuxe-0.3.0-beta.4.tgz`
has SHA-256
`21067bd849a2ef692d81a0caf75005b4f251ad2359808516219e2f0b3b3208b6`.
It is a dirty-source local beta candidate, not a tagged release.

Against the final build, all seven independent fidelity scripts passed:
controlled chroma siting and color, geometry and scaling, real decoded planes,
real player frames, animated subtitles and ProRes fallback. The three real
Software routes remained within max channel error 2 and p99 0 against the
independent full-chroma reference. The left-sited chroma negative control
remains in `probe.mjs`. Logs are
`review-fix-fidelity-{probe,geometry,real,player,real-player,subtitle,fallback}.log`.
The Chrome integration gate passed 11 cases, including source rotation,
source dimensions, animated subtitles, filters, two WebGL context losses and
cleanup (`yuv-chrome-2026-09-23T22-45-51.954Z/result.json`). The promotion
test confirmed MPEG-2 TS, MPEG-2 PS and MPEG-4 AVI still select YUV, ProRes
selects RGB, and source replacement returns to YUV with zero workers after
cleanup (`review-fix-promotion.log`). The exact archive passed the Software
default and explicit RGB override consumer checks
(`review-fix-consumer.log`).
The license suite passed 13 tests and LGPL closure passed 4
(`review-fix-licenses.log`, `review-fix-lgpl.log`).
