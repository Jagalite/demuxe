<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Installed audio matrix: 762 cases

The local installed Chromium campaign completed 762 packet and composition cases
using the same frozen installed packages, server, page, and validation contract.
Both assets and embedded delivery were exercised. The combined raw report is
`build/codec-expansion/browser/extended-positive.json`; the compact verified
record is `results/media-components/codec-expansion/extended-browser.json`.
The compact record binds package identities, the host FFmpeg/ffprobe environment,
selective Wasm requests, and the portable input inventory.
The final verified inventory SHA256 is
`26bff1f09112a26a78924fee0574b2f8c34399e746db91dbc644a2a52c31c267`.
The matrix contains 528 composition and 234 packet cases. Its expected rejections
include 114 precision, 28 explicit profile, four packet-budget and two unsupported-
feature cases; 30 selectively requested Wasm paths passed the family checks.

Completed segments contain 646, 20, 59, 2, and 35 cases. Every result's complete
fixture metadata is checked against its final expected case. The final record
retains each segment hash and prior failure, rather than representing this as an
uninterrupted run. Earlier all-black videos and silent composition prefixes were
corrected in generators; no playback, precision, or fresh-audio gate was relaxed.

The official DTS-HD 5.1 composition uses original complete packets 308–336,
14,848 samples. The historical DTS-HD 7.1 composition uses original complete
packets 282–563, 144,384 samples. Scalar reference decoding of both ranges equals
the corresponding slice of the full original PCM, byte for byte. Native installed
conversion also preserves the full integer PCM, sample extent, video frames and
balanced codec cleanup. Both compositions passed real browser pause, seek and
fresh post-seek audio. Their separate silent packet prefixes remain unchanged.
The derivations are recorded in the manifests and maintained fixture generators;
`dtshd-audible-tail.json` and `dtshd-historical-audible-range.json` retain the native
proofs.

The deliberate AAC post-seek gain-zero control failed with
`silent post-seek playback`, as required. Positive composition cases required
nonzero fresh audio and independently validated output PCM and video where
applicable. Precision, explicit profile, packet-budget and unsupported-feature
rejections are counted separately in the compact record.

This qualifies only the exact frozen installed artifacts and tested Chromium
version. It does not qualify later Shorten, ADPCM, telephony, PCM8 or AAC profile
extensions, newer checkout packages, Firefox, Linux CI, production routing, or a
release. Those retain their separate native, owner, package and browser gates.
