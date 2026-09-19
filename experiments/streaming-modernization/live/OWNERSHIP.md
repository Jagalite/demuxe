<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Live/period integration: acceptance boundary

This next overlay is not implemented or qualified yet. Its fixture origin serves
rolling standards-based manifests and rejects future/expired segment requests;
it is test infrastructure, not a manifest adapter in Demuxe.

The native integrated demux must retain ownership of one presentation timeline.
Its representation snapshot must include a source-scoped revision, current
presentation window, end-of-stream versus temporarily unavailable data, and
initialization/discontinuity identity. A missing future segment is not EOF.
The browser transport fetches those resources and applies authorization, deadlines
and budgets. It cannot infer a playback window from cache bytes or wall time.

HLS playlist reload must update the native parser's stable timeline anchor.
Unselected video playlists cannot stop refreshing merely because FFmpeg stream
`discard` is set. Packet tasks consume copied plans only; they must not call the
parent parser from a second thread. Audio/subtitle timestamp mapping must agree
with video across discontinuities. Shifting video alone is not an implementation.

DASH period start and presentationTimeOffset belong to manifest interpretation.
The pinned upstream parser currently selects a single period, so exposing more
choices or re-opening the JavaScript Player cannot provide period continuity.
Any replacement must retain a single native period/timeline owner and use FFmpeg's
container demuxers with explicit stream/initialization transitions. Existing
compatibility adapters remain active until the integrated replacements pass.

Live seek windows must be translated into mpv's presentation-time domain, with
one recorded origin. Expired paused positions need an explicit recovery policy
and event. Return-to-live must use the accepted window/edge, not a guessed
`duration` value. Retired window resources can leave the immutable-identity ledger
only when no permitted seek or active request can reference them.

## Generalizing packet execution for live sources

The finite prototype leaves audio/subtitles in the parent's normal `av_read_frame`
loop. Native source inspection shows that HLS can sleep in `reload_playlist` at
the live edge while a ready video packet waits in a separate queue. Returning
EAGAIN from an arbitrary mid-container AVIO read would risk leaving that container
in partial state. The next implementation therefore extends the existing bounded
container task to selected audio and subtitle components too. The same native
manifest owner supplies every plan and maps every timeline. mpv continues owning
packet caching, clock, audio output, synchronization and subtitle rendering.

This is one integration backend, not a second HLS timeline: the pinned FFmpeg
HLS parser retains manifest/sequence ownership. Container tasks do not reload
manifests, choose variants, or advance playback. They emit copied packets and
codec parameters; the owning coordinator merges them and admits transitions.
Finite and live inputs must converge on that executor before qualification.
The old finite path remains available only as preserved comparison evidence
until equivalent audio/subtitle/seek tests pass.

`hls-live-plan-probe-01` passes the native plan seam on all three aligned live
renditions. Sequence-before-window is ERANGE, sequence-after-current-window is
EAGAIN, and only a finished playlist returns EOF. Window refresh remains an
explicit demux-owner operation. The next tests must cover paused expiry, stalled
refresh, discontinuities and real mpv playback; this probe does not cover them.

Native coordinator runs 01/02 advance packets but do not switch: an unselected
playlist was never refreshed before its first candidate plan. Run 03 corrects
that owner operation and accepts three switches, but has a 1.9-second demux call.
Run 04 attributes the delay to active playlist refresh. The fixture origin wrote
its entire evidence log while holding the response lock. Run 05 moves that
fixture write outside the response path and records a 19.07 ms maximum demux call,
three switches, 672 video packets, 1,313 audio packets and 13 subtitle packets,
without timestamp regression or expired/future HTTP requests. These runs and
source hashes remain separate; none is browser A/V qualification.

Paused windows need work on the owning demux thread even when its packet cache is
full. The planned mpv hook is an optional timed demux poll, invoked with mpv's
internal cache mutex released, with no calls back into libmpv from AVIO. It
refreshes parser/window state and publishes a copied native status snapshot.
It does not consume packets or move playback. A pause keeps its position; resume
from an expired position must explicitly recover within the new window and expose
the reason. Cached-byte ranges are not substituted for the manifest window.

The live mailbox reserves eight lanes: one root lane and seven independently
cancellable nested lanes. This covers selected components, one candidate and
manifest refresh without holding a pool mutex across I/O. The layout has a new
ABI signature; the worker rejects mismatched layouts. Native ASan/UBSan checks in
`live-mailbox-native-01` pass independent progress, candidate cancellation,
exhausted-pool retirement (including waiters beyond the seven nested lanes),
stale-session callbacks and root resource metadata. Browser peer tests remain
separate from this injected native test.

## Live browser increment, archive 07

`live-01` completed a fresh clean build of all three engines. Subsequent
`live-05` changes rebuilt mpv/bridges with unchanged dependency libraries;
`live-07` reused those exact experimental engine bytes and rebuilt TypeScript.
Neither reuse record is a clean release qualification. The original snapshots
and failures remain intact (`live-06` assembly rejected generated TypeScript
output before the assembler was corrected to rebuild, rather than copy, it).

Archive 07 passes Chrome Software and Firefox Hybrid/Software rolling HLS cases.
Chrome Hybrid passes playback and worker cleanup but fails browser-process
shutdown timing. No aggregate Chrome Hybrid pass is claimed. These cases check
manual quality switching, selected audio/subtitle preservation, paused window
refresh and a DVR seek. Their audio counters and rendered callbacks are browser
measurements, not physical A/V timing.

The initial browser failures exposed an internal-seek presentation bug: an
mpv audio-track refresh can reset decoding without a host `seek` message.
Decoder operation 6 now sends a same-port presentation-reset notification before
new frames. Presentation clears obsolete ownership and waits for a selected
frame from the new generation. Either native selection or frame delivery can
arrive first, including a paused seek with only one new frame. Ordinary codec
reconfiguration still retains already selected output and active subtitles.
Six ownership/race unit cases pass. Archive 04's earlier finite evidence remains
separate and will be rerun against the final implementation.

## Resource retirement ownership

The native HLS manifest parser builds a temporary ordered set of all currently
referenced segment/init URLs before retiring previous entries. A URL is eligible
only when no current playlist references it. The callback uses the same
source-bound mailbox (operation 4); JavaScript does not infer expiry from URL
names, elapsed time, or playback cache size. Allocation failure retains old
validators rather than weakening identity checks.

The loader defers deletion while an open or handle still owns the URL. Each
handle retains its strong validator for ranged reads. A completion racing with
retirement cannot recreate an untracked permanent identity. Admission remains
four Fetch opens, with queued operations counted in the 16-handle budget and
subject to cancellation and their original absolute deadline. Eight component
operations can be admitted at the loader boundary. Focused units cover queued
cancellation, closure, deadline expiry, pending-open retirement, shared handles,
origin policy and operation counts beyond the previous lifetime limit.

Expired pause policy is staged: on explicit resume, activate audio output while
still paused, then seek to six seconds behind the known available edge (clamped
to the window start) before unpausing. It preserves the mpv session. Unknown or
failed window refresh does not constitute evidence of a valid recovery target.
This policy still needs the dedicated expiry browser case and stale-window
failure handling before qualification.
