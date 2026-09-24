<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Software YUV presenter

Software selects its presenter from each decoded frame. The YUV/WebGL2 path is
used only when all of these properties hold after mpv has normalized the frame:

- planar 8-bit `yuv420p` (`IMGFMT_420P`), positive plane strides, even source
  width and height;
- the entire decoded source frame is visible, with no source crop and rotation 0;
- BT.601 or BT.709 matrix, limited or full range, and left or center chroma
  location after mpv's deterministic metadata resolution;
- BT.1886 SDR transfer, no HDR metadata or ICC profile, and BT.601 (525/625)
  or BT.709 primaries.

Legacy files can omit color tags. mpv resolves missing matrix, range, transfer,
primaries and chroma location before Software presentation. The three measured
MPEG fixtures use some of these defaults. YUV admission uses the resulting
frame values and rejects any surviving unknown or unsupported value. It also
checks retained original matrix, primaries and transfer values so an explicit
unsupported declaration cannot be normalized into YUV eligibility. Missing
source tags are therefore admitted only through mpv's established resolution
rules; they are not treated as declared metadata.

Ordinary qualified destination scaling, including the tested bilinear upscales,
downscales, odd destination dimensions and letterbox, remains allowed. Frames
outside this predicate use mpv's existing RGB conversion and the combined
engine's RGBA WebGL upload. Rejected ProRes, odd-dimension and rotation frames,
including rotated subtitle composition, are checked against the standalone
ImageData/2D RGB output at matched paused frames. The explicit `rgb` override
and the WebGL2-unavailable path use that
standalone engine. The
Software playback mode stays the same throughout. Diagnostics expose
`backend.softwarePresenter` (`pending`, `yuv` or `rgb`),
`backend.yuvRejectionReason` for RGB, and `backend.softwarePresenterPolicy`.
The explicit `softwarePresenter: 'rgb'` override remains available for
comparisons. The older `experimental-yuv` option is retained as a compatibility
alias for the same bounded frame predicate; it does not force unsupported
frames through YUV.

The shader uploads Y/U/V as three R8 textures, reconstructs chroma with WebGL
LINEAR filtering at the declared left or center chroma phase, then applies the
qualified matrix and range conversion. Subtitles are composed on a separate
RGBA texture. Context loss pauses mpv and restores textures and drawing after
the context returns. When WebGL2 is unavailable, Software uses the standalone
RGB engine and reports `webgl2-unavailable`.

The independent-reference fidelity suite is under
[`experiments/software-yuv-fidelity`](../experiments/software-yuv-fidelity/).
Its left-sited vertical chroma edge is a regression gate: center-coordinate
sampling differs sharply, while the corrected phase must remain within 2/255
of the full-chroma reference. Real MPEG-2 TS/PS and MPEG-4 AVI frames were
checked against the same reference. The old RGB fast swscale chroma filter can
produce different edge pixels and is not a pixel-for-pixel YUV oracle.

The standard engine build now includes `web/engine-software-yuv` and the
standalone `web/engine-software-full` RGB override. Both must be distributed
with the Software worker and `web/yuv-presenter.js`. The local engine build is
`npm run build:software-yuv`; the locked full recipe is
`bash scripts/build-beta-engines.sh`. The browser assets require the documented
cross-origin isolation and media range/CORS rules.

This admission does not qualify odd source dimensions, source crops, rotation,
10-bit, 4:2:2, 4:4:4, HDR, ProRes yuv422p10, matrix/range/chroma values that
remain unresolved after mpv's resolution, unsupported source declarations or
other formats. The measured CPU benefit is workload-specific;
see the [matched AC-powered production comparison](../results/software-yuv-integration/PRODUCTION-YUV-2026-09-23.md).
The [admission and RGB fallback review fixes](../results/software-yuv-integration/REVIEW-FIX-2026-09-23.md)
have their own fixture and build evidence.
