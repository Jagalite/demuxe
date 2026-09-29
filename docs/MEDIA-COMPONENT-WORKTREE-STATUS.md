<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Media-component worktree status

Worktree: `/Volumes/seed2/Projects/demuxe-media-components`.
Branch: `modular-media-providers`. Consolidation checkpoint: `ea98201f`;
broad-provider checkpoint: `0ed14cdf`. The original checkout is unchanged.

The requested lightweight extensions are now implemented alongside the broad
FFmpeg/mpv foundation: fine/common audio Wasm builds, a TS Matroska/fMP4 provider,
separate JSPI/Asyncify packages, and measured selection within finite qualified
compositions. They are no longer deferred implementation items.

See [completion, local commands and qualification limits](MEDIA-COMPONENT-COMPLETION.md)
for the current delivery. [Distribution details](PROVIDER-DISTRIBUTION-DRAFT.md)
explain the contracts and package boundaries. The
[architecture plan](MEDIA-COMPONENT-IMPLEMENTATION-PLAN.md) retains the design and
migration rationale; its first-delivery phases are historical.

`npm run dev:providers` runs the regular playground from explicitly installed
local packages. `npm run dev:components` runs the qualified fixture lab. All
required runtime assets are present in this worktree. Neither command requires
publication. No push, tag or npm publication has been performed.

Existing ordered plans, public Player API and legacy source routing are retained.
Packet recipes are available as explicit internal executions; they are not
silently inserted into production Player routing. Full mpv remains atomic.
Additional codecs/profiles/devices need their own qualification, as they did
before this architecture work.
