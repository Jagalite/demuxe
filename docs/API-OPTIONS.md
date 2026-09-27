<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Player option stability and limits

This table classifies the current constructor surface. Experimental/compatibility names remain accepted; this cleanup changes no routing defaults. Stable means an application contract, not universal route/browser support. Feature availability and admission still govern execution.

| Options | Classification | Default / contract |
|---|---|---|
| `mode`, `automaticSelection` | Stable | Native preference with automatic selection when mode is omitted. An explicit mode is pinned unless automatic selection is explicitly enabled. |
| `assetBase` | Stable | HTTP(S) runtime root; accepts custom folders and CORS-enabled CDN URLs. |
| `width`, `height` | Stable | 640×360 presentation surface. |
| `trackPolicy` | Stable | File defaults among allowed tracks; no host lock unless configured. |
| `prepare` | Stable | Lazy loading; no proactive preparation when omitted. |
| `preview` | Stable | Enabled; independent bounded lane. `false` disables it. |
| `buffering` | Stable | Auto preload and balanced profile. Memory ceilings apply only on enforcing backends. |
| `watchdogs` | Stable | Playback-health heuristics enabled; disabling them does not remove operation/network/cleanup deadlines. |
| `decodeQuality`, `adaptiveFrameDrop` | Stable policy | Exact decoding, no explicitly requested adaptive frame drop. Backend fidelity qualification still applies. |
| `audioOutput`, `audioFallback` | Stable policy | Stereo output; stereo fallback. Channel delivery remains route-qualified. |
| `audioPlayback` | Stable policy | Auto: preserve playable audio, then qualified FLAC24 adaptation before mpv audio. `worklet` disables automatic transcoding. |
| `toneMapping` | Stable policy | Off. HDR metadata is not proof of HDR presentation. |
| `resourceLimits` | Stable policy | Software decode cap 8,294,400 pixels; individual FFmpeg allocation cap 134,217,728 bytes. Not a total memory cap. |
| `videoFilters`, `audioFilters` | Advanced | Empty filter chains. Capability/routing checks apply. |
| `nativeRemux` | Advanced | Auto; `never` disables packet-copy fallback, `always` is an explicit packaging choice. |
| `audioGain` | Experimental | Scalar 1 (no extra attenuation graph). |
| `experimentalBufferedNativeSeeks` | Experimental | Off; retained-session seek qualification is separate. |
| `experimentalHybridAudioFilters` | Experimental | Off; only the qualified scalar-filter subset is eligible. |
| `experimentalAudioAdaptation` | Experimental | Unset; explicit FLAC/Opus trial policy. |
| `automaticAudioAdaptation` | Compatibility policy | Unset; `lossless` retains the stricter legacy qualified subset. |
| `allowLossyAudio` | Stable permission | False; explicit lossy permission does not grant resampling/downmixing. |
| `experimentalNativeASS` | Compatibility name | Defaults to the resolved automatic-selection policy. False disables the qualified external ASS overlay. |
| `experimentalMpvSubtitles` | Compatibility name | True; false retains previous Hybrid/Software subtitle routing. |
| `experimentalBackgroundPromotion` | Experimental | Unset/off; configured budget counts known allocations only. |
| `softwarePresenter` | Advanced, with compatibility alias | Auto uses qualified YUV and otherwise RGB. `experimental-yuv` is retained as an alias for that qualified policy; `rgb` is a comparison override. |

No option is removed or silently renamed. New experimental backend mechanics should not become additional public playback modes. A future deprecation needs migration notes and a version boundary; the compatibility names above have not been removed.

## Three different limits

Source decode dimensions, presentation dimensions, and total process/device resources are distinct:

- Software source decoding defaults to at most 8,294,400 pixels (3840×2160). `maxDecodePixels` can reduce this, not increase it beyond the current cap.
- Constructor dimensions and `resize()` accept integers from 1 through **1920 wide and 1080 high**. A 4K source does not imply a 4K presentation surface.
- The individual FFmpeg allocation cap defaults to 128 MiB and accepts 32–256 MiB. It does not account for all allocations, browser decoder memory, GPU resources, or an application's other players.

Browser/native decoder limits remain separately observable. This documentation does not relax any resource or presentation bound.
