# Initial optimization inventory

Fixed isolated snapshot 51f0792fa6c5229a8695d908006a0a573bfc1c10. All runtime paths resolve within this lab. Existing prototypes are retained; this review tests copies mounted at /risk. This inventory records implementation status; the final report adds executed results.

| Optimization | Availability | Planned narrow coverage |
|---|---|---|
| Native direct | Available baseline public Player | Ordinary MP4, no adaptation worker, move/audio/seek/cleanup |
| Native packet-copy remux | Available baseline public Player | Same MP4 forced remux, seek/cleanup |
| Native FLAC | Implemented scratch prototype | Sample roundtrip, bounds, lifecycle, faults, timeline |
| Native Opus | Implemented scratch prototype | Explicit lossy opt-in in test adapter, independent tail/seek |
| Native Web Audio gain | Implemented scratch prototype | Amplitude, mute, graph shutdown |
| Hybrid no filter | Available baseline | WebCodecs identity, move/audio/seek |
| Hybrid audio-only filter | Scratch backend binding; public constructor/setter reject | Gain signal and mpv authority, separate public-policy tests |
| Software same filter | Available baseline public constructor | FFmpeg reference, amplitude, lifecycle |
| Native FLAC + ASS | Implemented scratch components | Cue/animation/seek/pause/resize |
| Native FLAC + ASS + gain | Implemented scratch components | Seeded shared transition sequence |
| Buffered Native seeks | Implemented scratch prototype | Identity retention, actual ranges, overlap and regeneration |
| Native direct + ASS | Small combination of existing components | Direct worker exclusion distinguishes libass from adaptation |
| Smaller first fragment | Implemented scratch 600 ms first then keyframe policy | Pilot; restore policy/counters |
| FLAC encoder setting variants | NOT IMPLEMENTED; fixed compression_level=5 | NOT TESTED |
| Compiled module/worker reuse | NOT IMPLEMENTED in adapter | NOT TESTED |
| Reduced Hybrid compressed packet copying | No enabled candidate located; prior historical experiment reverted | NOT TESTED |
| Packet format/init adaptation | Existing AVC configuration helpers/native remux | Existing unit tests and remux pilot; narrow B-frame fixture |
| Qualified Native/Hybrid GPU effects | NOT IMPLEMENTED candidate in scratch | NOT TESTED |
| Software YUV/GPU presenter | Source exists, matching engine artifact absent | BLOCKED without new engine build; intentionally no rebuild |
| Separate A/V MSE SourceBuffers | No enabled implementation in tested adapter (single multiplexed buffer) | NOT TESTED |
| WebCodecs audio decoder | Not integrated in tested routes; Hybrid audio is mpv/FFmpeg | NOT TESTED |
| Auth unchanged-byte transport | Implemented earlier | Intentionally deferred by request |
| Hybrid-to-Native handoff | Proposed | Intentionally deferred |
| General client video transcoding | Proposed, outside scope | Intentionally deferred |
| Independent audio/native-video clocks | Proposed, outside scope | Intentionally deferred |
| HLS/DASH/live/DRM | Other agent's work not accessed | Intentionally deferred; handoff contracts only |

No automatic-route or dynamic-setter support is inferred from manually selected prototypes. No multitrack source is available among the reused main fixtures; selecting between multiple audio tracks is not qualified.
