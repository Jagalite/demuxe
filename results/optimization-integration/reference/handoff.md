# HLS/DASH integration handoff

**Reusable unchanged:** the existing 22 codec/selection/buffer contracts; gain-output assertions; packet/sample equality assertions; owned-server401/range/truncation behavior; generation/latest-operation and teardown assertions once attached to the same semantic hooks. `README.md` gives exact commands; `run-all.mjs` was executed and writes fresh timestamped evidence. Expected unresolved cases produce nonzero exit status.

**New adapter hooks required:** integrated actual plan/decoder/presenter; source/timeline/configuration epochs; session/worker/MSE identity; selected public track IDs; outstanding fetch/conversion/append barriers; current buffered ranges; source-byte and decoded/encoded counters; first correct presented frame and audio signal; and explicit owner shutdown. Current scratch tests sometimes access `player.worker`, `sb`, `pending` or backend commands directly—do not mistake those for public capabilities.

**Contracts to preserve:** source and track identity isolation, latest-operation authority, pause/settings preservation, no stale append/frame/cue, clear starvation-versus-EOF distinction, real byte counts, bounded retry/read-ahead, packet DTS/PTS validity, audio delay/drain accounting, safe gaps, independent explicit lossy policy and complete resource release.

**Still required after streaming integration:** ABR switches, live-window eviction, moving seekable ranges, DASH periods, initialization changes, discontinuities, segment retry/key/auth changes, partial segments, end-of-live semantics, rendition track consistency, and any cross-engine handoff. This review does not qualify any of those, DRM or physical A/V synchronization.

