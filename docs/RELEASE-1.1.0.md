<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# 1.1.0 stable release target

The next release targets package version `1.1.0` and tag `v1.1.0`.
Package versions and internal Demuxe peer pins advance together. Existing RC
tags remain immutable.

Publication requires the complete [release pipeline](TAG-RELEASE.md) against
the exact archive built from the clean tagged revision. Earlier RC receipts
and focused source tests do not qualify these bytes. This document records the
target, not a completed qualification or publication.

The qualified GitHub release will be marked stable and latest. The same verified
archive will be staged on npm as `latest`, with public npm publication awaiting
maintainer approval. Archive hashes, source companions and required functional
qualification evidence remain mandatory for stable releases.

Stable versioning does not expand the tested format, browser, device or physical
audio/HDR scope. Performance and endurance investigations remain separate from
the required functional gates. The historical `developer-beta-candidate-tested`
verification status identifies those gates; it does not determine whether the
package version is stable or a prerelease.
