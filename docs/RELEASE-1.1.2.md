<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# 1.1.2 release candidate

The candidate targets package version `1.1.2` and proposed tag `v1.1.2`.
Package versions and internal Demuxe peer pins advance together.

Changes since 1.1.1:

- Add OLED, High contrast, Paper and Terminal player themes and improve Classic
  phone layout, safe-area spacing and control reading order.
- Keep excerpt shortcuts, timeline bounds and buffered progress inside the
  active playback range; restore full navigation when the range is cleared.
- Preserve foreground thumbnail cache entries against background prefetch,
  decline unsupported exact requests before opening a preview session, and
  resume stationary hover previews after buffering.
- Show thumbnails during touch scrubbing and keep Terminal thumbnails visible
  above the controls. Touch movement commits only the final seek.
- Expose source-scoped Shaka automatic retry state and show stream recovery in
  the player, with cleanup across source replacement and close.
- Verify development-demo asset hashes against its deployment manifest and
  identify its source revision visibly.

Qualification uses the [unpublished candidate workflow](TAG-RELEASE.md#qualify-an-unpublished-candidate).
The exact source commit, runtime/source hashes, complete workflow outcome and
browser receipts must be recorded before recommending approval. Focused source
tests establish the fixes; they do not qualify the release archive.

The approval decision covers publication of the qualified GitHub assets and npm
staging. Public npm publication remains a separate maintainer approval with 2FA.
No production tag, release, deployment or npm stage is created by qualification.

Format support and device/platform claims remain within the existing tested
scope. Playwright WebKit is not physical Safari/iOS qualification; performance
and endurance were not changed into publication gates.
