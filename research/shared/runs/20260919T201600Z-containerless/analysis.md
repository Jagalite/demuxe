<!-- SPDX-License-Identifier: CC-BY-4.0 -->

In explicit experimental Chrome152, --enable-blink-features=MediaSourceExtensionsForWebCodecs exposes appendEncodedChunks. Actual AVC SourceBuffer configuration rejects both no-B and B-frame inputs with H264/H265 buffering unsupported. A further VP9/Opus two-buffer attempt fails SourceBuffer quota during construction, even without invalid-config preflight. No complete containerless A/V candidate played. Default Chrome absence remains separate from experimental codec/destination limits; not a decoded-output negative.

Limits: Default browser flag never changed.; No native A/V success, fidelity, performance or shipping support inferred from API exposure.
