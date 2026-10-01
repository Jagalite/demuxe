<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Bounded WebM packet copy

`remuxWebm(blob, signal)` in `packages/provider-container/src/webm-remux.ts`
is a separate WebM output API. Existing AVC/HEVC plus AAC MP4 recipes retain
those codec boundaries. This route copies compressed packets and codec data;
it does not require any video decoder or encoder Wasm slice.

The initial structural admission is one video track (`V_VP8`, `V_VP9`, or
`V_AV1`) and one 48 kHz mono/stereo Opus or Vorbis track. Pixel dimensions are
at most 1920×1080, video default duration is present and within 1–1000 ms,
and the first video packet must be random access. VP8/VP9 private extensions
reject; AV1 requires a version 1 Main 8-bit 4:2:0 configuration record. Actual
codec payload validity remains the browser/native decoder's responsibility.
Current real fixtures qualify VP8/VP9 8-bit 4:2:0 and AV1 Main 8-bit 4:2:0,
Opus mono/stereo and Vorbis stereo. Other representations are not established
by this matrix. The installed experimental Vorbis encoder cannot generate mono
fixtures; this does not establish a mono decoder rejection.

The reader accepts only finite segments, one ordinary track configuration,
existing bounded metadata, no lacing, no invisible blocks, no encryption or
linked segments. Display/crop/interlace/HDR presentation extensions outside
its existing contract reject. This API requires a declared finite positive
Segment Duration and retains it exactly. Tags, names and other descriptive
metadata are omitted. Opus mapping family 0, version 1, zero output gain and
pre-skip up to 3840 samples are required; declared CodecDelay must agree with
pre-skip, and SeekPreRoll must be 80 ms. Vorbis retains its three ordered
headers and declared delay bounded by 8192 samples. Delay and final positive
DiscardPadding are copied without reapplying or guessing codec trims.

`WebmPacketWriter` writes one bounded cluster per original packet. Original
packet order, key flags and presentation timestamps are retained, including
codec-internal presentation logic; no DTS is derived from PTS. Video BlockGroup
explicit durations and audio groups requiring reference mapping reject.
Each timestamp is an exact integer multiple of the source TimestampScale.
Segment length is finite. SeekHead entries point to Info, Tracks and Cues;
CuePoints identify original video key packets with exact segment-relative
cluster offsets. Duration and indexes enable complete-file seeking; MSE fragment
append and browser seeking still need their separate installed-package proof.

Budgets are 64 MiB input, 96 MiB output, 1 MiB per codec packet and 18,000
packets. Abort is checked before/after reads and during packet iteration.
Output is `video/webm`. Full output remains a bounded Blob; there is no
streaming-output claim or provider owner to release.

## Native evidence

```sh
node --no-maglev --test tests/provider-webm.mjs
```

Nine actual FFmpeg files cover each video with Opus mono/stereo and Vorbis
stereo. Independent ffprobe checks exact packet hashes, PTS, duration, key flags,
codec configuration and final skip/discard side data. Independent scalar decoding
checks exact full video and PCM bytes, plus an actual indexed seek interval.
Index inspection verifies SeekHead/Cue offsets target the correct key packets.
Duration is identical to the source. Abort, malformed codec configuration,
invalid/nonfinite duration, truncation, timestamp, packet count and byte limits
have negative controls. Temporary media and full reports stay outside Git;
compact hashes are recorded separately. Browser assets/embedded playback,
pause/seek, exact source package closure and registry admission remain separate
qualification gates.

The campaign uses the previously recorded Node 23.5.0 `--no-maglev` workaround
for a host compiler/GC deadlock; it is not a browser limitation.

## Why WebM output

The [VP codec MP4 binding](https://www.webmproject.org/vp9/mp4/) requires codec
configuration records and restricts alternate reference frame encapsulation.
Pinned FFmpeg `n9.0.2` `libavformat/movenc.c` rejects VP8 MP4 muxing; VP9 and AV1
have maintained MP4 entries. [AV1 MP4 binding](https://aomediacodec.github.io/av1-isobmff/v1.3.0.html)
requires temporal-unit sample semantics and forbids composition offsets. Those
are additional parser/writer contracts, not codec name substitutions in the
existing MP4 writer. [Matroska Cues](https://www.matroska.org/technical/cues.html)
and [element definitions](https://www.matroska.org/technical/elements.html)
specify the original timestamp and segment-relative index contracts used here.

## Installed assets and embedded qualification

The independent harness selects only `@demuxe/provider-container`, installs
exact audited archives with lifecycle scripts disabled, and builds both delivery
forms. It uses public `webmPacketCopyRecipe()` and `createComponentOwners` through
a test-only installed package entry. Nine fixtures run in each delivery form.

```sh
node scripts/prepare-webm-browser-fixtures.mjs
WEBM_CORE_ASSEMBLY=build/codec-expansion/packages/core/assembly.json \
WEBM_CONTAINER_ASSEMBLY=build/codec-expansion/packages/container/assembly.json \
  node scripts/setup-webm-installed-consumer.mjs
node tests/webm-installed-browser.mjs
```

Open the printed local URL with the collaborative browser and click **Run
installed WebM tests**. Then open the same URL with `?postSeekSilence` and run
the deliberately muted control. Host results are written separately under
`build/codec-expansion/webm-installed/browser`; qualification requires both the
18-case result and both successful rejection controls. Run `?postSeekFrozenCanvas`
as well; its cached post-seek pixels must fail the fresh-frame gate. Local navigation uses the
in-app browser tools. The CI runner deliberately refuses non-CI use.

The host validates exact native output hashes, all packet/configuration/timing
identities, independent video/PCM bytes, source duration and indexes. Playback
uses the resulting native video Blob, requires fresh post-seek audio and video
frames, checks canvas content and forward progress, and disposes owners, media,
AudioContext and embedded runtime URLs/workers. The complete request log must
contain zero Wasm requests. Archives, inventories, fixture bytes, bundled output
and harness sources are pinned, and checked again before recording qualification.
These mechanisms do not grant a passing browser result before actual execution.

```sh
# Portable CI runner after exact package/fixture preparation:
CI=true WEBM_INPUT_INVENTORY_SHA256=<reviewed-sha256> BROWSER=chromium node tests/webm-installed-ci.mjs
CI=true WEBM_INPUT_INVENTORY_SHA256=<reviewed-sha256> BROWSER=firefox node tests/webm-installed-ci.mjs
# Non-browser harness contract and independent host reference checks:
node --test tests/webm-installed-contracts.mjs
```

`WEBM_INSTALLED_ROOT` can isolate concurrent campaigns. The CI runner records
browser version, the complete normal result and the deliberate silence control;
it refuses missing/duplicate cases, stale playback, retained resources and any
Wasm request. Firefox remains an external gate when the attached browser tools
provide only Chromium.

## Hidden compositor diagnostic

The attached T3 Chromium tab reported UI `visible:false` while its page reported
`document.visibilityState === "visible"`. Controlled original-versus-copy tests
observed zero animation-frame and video-frame callbacks for both files, while
the decoder counters advanced and canvas captures changed through the seek.
The failure was the presentation-callback assumption in the harness.

The maintained functional gate requires at least two new decoded frames and
three distinct canvas hashes, plus clock progress, fresh audio and nonblack
pixels. Actual presentation-callback counts remain in evidence. A deliberately
frozen canvas must fail even with advancing playback, decoded frames and audio.
Zero compositor callbacks qualify decoded frame/canvas behavior only; visible
on-screen compositor presentation remains a separate gate. The original failed
result and compact paired diagnostic are retained.

## Pinned portable CI inputs

`.github/workflows/webm-packet-copy.yml` is a manual Chromium/Firefox matrix.
It consumes an explicitly reviewed artifact and inventory SHA256. It does not
build codecs, upload input artifacts, publish packages or promote registry rows.
Only the core and TypeScript container archives plus nine source media files are
included; compressed media is decoded independently on the runner, with exact
output/configuration and native reference hashes retained as gates.

```sh
node scripts/webm-installed-inputs.mjs export /tmp/webm-installed-inputs
# Review the printed inventory hash, then package canonical regular files only:
python3 - <<'PY'
import tarfile
from pathlib import Path
root = Path('/tmp/webm-installed-inputs')
with tarfile.open('/tmp/webm-installed-inputs.tar.gz', 'w:gz') as tar:
    for entry in sorted(root.rglob('*')):
        if entry.is_file():
            tar.add(entry, arcname=str(entry.relative_to(root)), recursive=False)
PY
# On a matching clean checkout, after safe extraction into a fresh directory:
WEBM_INPUT_INVENTORY_SHA256=<reviewed-sha256> \
  node scripts/webm-installed-inputs.mjs prepare /tmp/webm-installed-inputs
```

Export re-audits both exact archives and rejects any current source hash mismatch.
Preparation verifies every blob and pin, binds the full checkout/source closure,
re-audits package inventories, installs with lifecycle scripts disabled and builds
selected assets/embedded bundles. The runner requires the reviewed pin and checks
its installed archives against that inventory. Tar extraction rejects links,
traversal, duplicates and oversized input before writing. Total inputs are bounded
to 128 MiB; raw gzip-expanded tar bytes are capped at 136 MiB including headers,
and PAX/GNU metadata headers at 64 KiB before Python's tar parser reads them.
WebM tests retain their own media/output limits.

An artifact must be supplied through the workflow's reviewed `input_tag`, and
both actual CI browser jobs must pass before their result can be claimed. Exact
host decode hashes across the macOS fixture campaign and Linux FFmpeg remain a
real cross-platform verification gate; a locally prepared artifact is not a CI
qualification result.
