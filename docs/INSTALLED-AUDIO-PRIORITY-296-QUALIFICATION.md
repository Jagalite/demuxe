<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Installed priority audio cohort: 296 cases

The local Chromium campaign passed 296 installed-package cases: 138 packet,
136 FLAC composition, and 22 Opus composition cases. It used 13 exact audited
packages and 18 bundles covering assets and embedded delivery. The cohort covers
the original required families plus finite AAC HE/HEv2/USAC, PCM8, canonical
Shorten, WAV ADPCM, telephony, and packet-only speech fixtures.

The compact verified record is
`results/media-components/codec-expansion/priority-browser.json`.
The combined raw record is `build/codec-expansion/browser/priority-positive.json`.
Its segments preserve the original five passing cases and the resumed 291 cases,
including the original failure and segment hashes. Every final case's complete
fixture metadata matches its expected case. Six precision rejections were required
independently from the scalar references; no profile rejection substitutes for a
positive codec test.

HE and HEv2 composition fixtures explicitly seek to 0.6 seconds inside their
original independently verified audible extent. The HEv2 change corrects an
initial near-silent interval; no media was re-encoded or trimmed and no audio,
seek, precision, or quality gate was relaxed. Both bounded and full fixture
metadata and the maintained generator record this seek. The deliberate AAC
post-seek gain-zero control failed with `silent post-seek playback`.

WAV ADPCM and fact-clipped GSM-MS compositions validate the independently declared
presentation sample count. Scalar host decoding retains padded blocks, so host
references are trimmed to the original `fact` extent before comparison. Exact
integer PCM, output duration, pause, seek, and fresh post-seek audio all passed.

AMR-NB mode 0, AMR-WB mode 0, and the finite FLV Speex packet fixture passed their
fixed speech limits (maximum absolute error below 7e-5 and SNR above 80 dB), exact
sample extents, reset and clock checks. Actual decoded silence and corrupted-block
controls rejected in both delivery forms. Speech remains packet-only.

The final portable inventory SHA256 is
`452d382e3c1ee89f43a35b59ebb0520ed2873f50c39d70af5fb23ef4917e219f`.
Its correction changes only the two supplemental manifests and the AAC fixture
generator. Package identities, media and reference bytes are unchanged. The prior
isolated portable restore, audit, installation and preparation proof retains its
original inventory pin; corrected portable fixture metadata was checked exactly
against the installed cohort. All 1,782 files in the 18 bundles stayed unchanged
from the resume fingerprint, and their recorded bundle output hashes verified.
Twenty-two selective Wasm paths passed the family checks. Host FFmpeg/ffprobe
binary hashes and versions are bound to the original reference environment.

This establishes the exact finite cases for the tested Chromium artifacts. It
adds no Firefox, Linux CI, performance, broader codec profile, production route,
or release qualification. The earlier 762-case campaign belongs to its separate
frozen packages; their results are not merged into a single current-package claim.
