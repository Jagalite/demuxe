<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# MediaBunny provider adapters

Date: **2026-10-29**. Status: **inspection and preview adapters implemented; guarded local WebM/Matroska VP8 and MP4/MOV AVC and AVC/AAC preparation connected and tested, including bounded remote files. Guarded local incremental preparation is connected through qualified provider acquisition and NativePlayer to the existing MSE owner; remote incremental transport is connected and tested; public Player fixture compositions pass in Chrome; broader browser and release qualification remain open. Broader profiles and later phases remain open.** See the [implementation evidence](MEDIABUNNY-PROVIDER-IMPLEMENTATION.md).

## Decision

Use MediaBunny to implement selected existing provider responsibilities. Keep Demuxe's player API, playback plans, presentation owners and fallback policy. Keep the existing FFmpeg and mpv providers maintained and deployable as backups. MediaBunny extensions that themselves delegate to FFmpeg are outside this replacement work; retain the existing FFmpeg providers and individually downloadable codec slices for those responsibilities. The selected-codec evaluation is a retention decision for this delivery, not a requirement to implement wrappers around those extensions.

The integration unit is an **adapter behind an existing responsibility**, not a new player backend. A qualified MediaBunny implementation can satisfy the same capability/profile as an existing implementation, with its own provider identity, assets and qualification. Selecting that implementation substitutes the provider for that attempt; it does not remove the other implementations.

This design follows the [full provider audit](MEDIABUNNY-PROVIDER-AUDIT.md), which examined MediaBunny **1.63.0** at upstream revision `0f80f47e617b576737ffd4ce39a626eb7c7e934e`. That audit contains the complete format/codec coverage, upstream citations and package measurements. Its [evidence record](mediabunny-provider-audit-20261029.json) is static source/package evidence, not playback qualification.

## Scope and ownership

The desired behavior is browser-native presentation where the existing policy admits it, qualified MediaBunny preparation where useful, and the existing FFmpeg/mpv alternatives when their routes are required. Native browser playback of the original source should not acquire a preparation library just because it is deployed.

MediaBunny supplies container, packet, muxing and optional decoding facilities. Demuxe continues to own source access, track selection, admission, runtime preferences, MSE scheduling, clocks, startup verification, seek behavior, cancellation and fallback. The existing Shaka/native adaptive paths, mpv subtitle service, selected-audio service and complete software playback remain in place.

There is **no single universal executable provider interface today**. Capability catalogs describe alternatives; concrete owners execute them. Consequently this is a small set of adapters with explicit owner connections. Adding a `provides` entry alone cannot activate MediaBunny.

| Responsibility | Adapter contribution | Existing contract/owner | Integration work |
| --- | --- | --- | --- |
| Bounded inspection | Map MediaBunny format/track facts into existing inspection evidence | [`inspectMedia`](../src/sources.ts), [route inspection](../src/internal/machine/route-inspection.ts) | Add an optional inspector implementation bridge; preserve incomplete-fact semantics. There is no universal inspection-provider contract to assume. |
| Packet-copy preparation | Read selected packets and produce a browser-playable selected-stream result | `media.prepare.file` v1 / `packet-copy`, [`NativePlayer.startRemux`](../src/internal/native-player.ts) | Add an explicit preparation owner connection. Reuse the prepared-file path where appropriate; a streaming implementation needs a segment producer connected to the existing presentation lifecycle. |
| Preview | Produce a frame with represented timestamp, fidelity and cleanup | [`PreviewProvider`](../src/preview/controller.ts) | Implement the existing interface and register through the existing preview owner. Playback decoding remains independently owned. |
| Container/audio composition, later | Translate recognized packet/configuration/sample forms | [Container component owners](../packages/provider-container/src/owners.ts) and existing audio slices | Bridge only individually specified compositions. Matching codec names do not make every current decoder interchangeable. |

The conditional `selected-mp4-view` path is a useful precedent for bounded preparation under `NativePlayer`. Its local guards and file projection are not a general remux interface. Any extraction needed to connect another preparation implementation should be limited to that owner boundary; it should not introduce another routing system.

## Package and registration

Implemented private package: **`@demuxe/provider-mediabunny`**. Registration currently distinguishes these owners:

- `mediabunny-mp4-file-preparation`: a separately acquired classic MP4/MOV H264 video preparation implementation.
- `mediabunny-file-preparation`: initially only `media.prepare.file` v1 / `packet-copy` for explicitly qualified source profiles.
- `mediabunny-preview`: an implementation of `PreviewProvider`, using the existing preview controller's selection and resource rules.
- `createMediaBunnyInspector`: optional implementation consumed by `InspectionOptions.inspector`, without inventing a generic capability to label it.

Keep the upstream dependency in the optional provider package. The Apache core receives Demuxe-owned types and lifecycle hooks, consistent with the [core boundary check](../scripts/check-core-boundary.mjs). Format-specific entry points and separately acquired codec extensions should preserve the existing individual-download approach. Verify the emitted import graph: tree shaking and lazy Wasm initialization alone do not prove that unused code or embedded Wasm was not transferred.

For playback preparation, add a finite binding beside the current alternatives in the [provider inventory](../src/internal/media-providers.ts) and [execution recipes](../src/internal/execution-recipes.ts). It pairs the new preparation identity with `browser-prepared`; required subtitle/gain companions remain part of the complete composition. The binding list remains an unordered catalog. Existing policy selects among eligible bindings and retains public plan ordering, provider preferences and explicit runtime constraints.

Register a distinct implementation identity covering the adapter build and its upstream dependency/assets. Do not reuse an FFmpeg provider ID or an old qualification record. Selection uses the existing [resolution](../src/internal/provider-resolution.ts) and [acquisition](../src/internal/provider-acquisition.ts) owners. Only the selected binding's declared assets are acquired at its existing activation point.

## Adapter behavior

### Inspection and input

Back MediaBunny `CustomSource` with Demuxe's bounded byte reader or validated remote range transport. This is a bridge between two source abstractions; it does not replace the public Demuxe source contract with MediaBunny's `UrlSource` defaults.

Preserve authorization refresh, source identity, range validation, deadlines, read/byte limits and original transport errors. Public inspection currently defaults to **512 KiB, 32 reads and 10 seconds**. Expensive duration scans must remain inside the caller's budget. This work does not lift the existing 32 MiB custom-source playback staging limit.

Translate only facts the adapter can establish. MediaBunny A/V discovery is not evidence of subtitle absence or complete chapter metadata. Keep stable mappings between source track IDs, selected tracks and emitted tracks. Missing required facts remain partial/unknown and follow the existing inspection path, including FFmpeg inspection when policy requires it. Do not overwrite established facts with guesses or present a budget stop as a transport success.

### Packet-copy preparation

Use explicit packet sinks/sources and mux output rather than generic `Conversion` for the first playback adapter. The requested selected-track set must equal the produced set. Packet-copy must not silently transcode, discard a requested track, change channel layout/sample rate, or change an authored timeline outside the qualified profile.

Support begins with fixture-defined, clear local MP4/MOV and MKV/WebM cases whose codecs/configurations the browser presenter accepts. A container name alone is insufficient admission. Edit lists, reordered frames, negative starts, codec delay, preroll and tail padding need explicit coverage or rejection. MediaBunny packets lack a public original-DTS field; remux qualification must verify presentation and decode ordering rather than claim identical container timestamps.

For a prepared-file result, retain `NativePlayer`'s object-URL ownership, startup verification and seek checks. For streaming output, emit initialization/media segments through the existing presentation owner with explicit queue limits and backpressure. Avoid whole-output buffering for a streaming profile. The adapter owns its parser/mux state; `NativePlayer` retains load generations, presentation and retirement. A streaming segment connection is real implementation work, not something a muxer automatically supplies.

### Preview

Implement `canHandle`, `getFrame` and `release` through `PreviewProvider`. Preserve cancellation, source generations, decoder-contention policy and deferred cleanup. Return the represented frame timestamp and honest temporal accuracy/fidelity labels; do not label a nearest keyframe as an exact requested frame. Close samples, frames, bitmaps and inputs owned by the adapter on completion, cancellation and source replacement.

### Codec adapters, later

Keep the current individually downloadable codec slices in the first delivery. A later adapter may connect existing codecs or selected MediaBunny extensions for recognized codec IDs and exact configuration profiles.

Do not globally register every fallback coder. MediaBunny's custom registrations are module-global, have no public unregister operation and take precedence over WebCodecs. Select the implementation before acquisition, and use a controlled module/worker lifetime or an explicit Demuxe-owned packet-to-decoder bridge. A browser-native check must not be satisfied accidentally by an already registered Wasm fallback.

Preserve precision, layout and sample extent explicitly. The audited sample path does not represent f64 or a speaker mask, and its FLAC extension emits 16/24-bit output. These are not automatic replacements for current lossless profiles. Some MediaBunny extensions themselves use FFmpeg; adopting one does not establish a browser-native implementation.

## Qualification and fallback

An adapter is selectable only when one maintained evidence record qualifies the **whole binding** for the source/configuration and exact implementation identities. Independently qualified parsers and decoders cannot be combined into an untested qualification. An adapter upgrade requires matching evidence before the new identity becomes eligible.

Fallback remains an owner decision, not `catch (anything) -> FFmpeg` inside the adapter:

| Outcome | Required treatment |
| --- | --- |
| Adapter not configured, absent, unsupported or unqualified | Preserve the distinct availability reason; existing policy may select another eligible implementation. |
| Required inspection facts incomplete | Keep partial evidence and use existing inspection escalation when required. |
| Admitted compatibility/startup failure | Retire the attempt, then allow only the fallback already authorized by the owning policy. Never publish partial prepared output as success. |
| Declared asset acquisition/integrity failure | Preserve the failure and original error contract; do not relabel it as absence to try another provider. |
| Authorization failure, changed source, transport failure or cancellation | Preserve the existing classification and owner policy; the adapter must not create a new fallback entitlement or publish stale results. |

FFmpeg/mpv backup availability remains a deployment responsibility. Keep their packages, bindings, profiles and qualification maintained; acquire them when selected. An optional installation that omits them cannot claim to offer the corresponding backup. Rollback means selecting the maintained alternatives or removing the new binding from deployment, without changing the player API.

## Delivery sequence and acceptance

1. **Inspection and preview:** add the optional package and explicit bridges; qualify bounded local inputs and frame extraction independently. No playback-provider substitution is needed to ship these uses.
2. **Local packet-copy preparation:** connect one narrow preparation result to the existing owner, register the complete binding and qualify exact MP4/MOV/MKV/WebM profiles. Enable preference only for those profiles. Unsupported variants retain the existing path.
3. **Remote and streaming preparation:** qualify the Demuxe transport bridge, bounded output, source identity, seek/reopen behavior and cleanup before enabling these profiles.
4. **Selected codec/processing adapters:** evaluate overlap with current slices separately. Each new decode, encode or lossless profile needs its own contract and complete binding evidence.

For each enabled profile, acceptance must cover:

- **Preservation:** selected track identity/count/configuration, decoded content or expected sample/frame extent, timestamps, channel layout and precision appropriate to the claimed profile. Use fixture truth and the maintained implementation as comparators; neither parse success nor output-file existence is sufficient.
- **Playback:** startup with the required A/V, seek target and subsequent progress/fresh audio where required, stream changes and repeated open/close under the existing owner.
- **Lifecycle:** abort during reads/decode/mux, late results after source replacement, simultaneous players, preview contention and complete resource retirement.
- **Failure policy:** unsupported/unqualified/absent providers distinguished from corrupt acquisition, authorization failure and changed source; correct eligible backup behavior and terminal outcomes.
- **Acquisition:** no MediaBunny download on an unaffected direct path, no unused format/codec downloads for the selected adapter, and backup assets acquired only when selected.

Record runtime/browser, fixtures, implementation hashes and the exact complete composition with results. Measure bytes transferred, startup/seek latency and peak retained memory after correctness is established; the source audit provides no performance claim. Keep fallback qualification in the same release checks.

This document authorizes no implicit capability expansion: subtitle rendering, DASH/DRM, a WebCodecs playback clock, generic export/conversion and broad resampling replacement remain separate work. The intended result is selective provider substitution under the contracts Demuxe already owns.
