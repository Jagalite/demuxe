# Final presentation windows

This stage preserves the native manifest owner's final window when HLS gains
ENDLIST or a dynamic MPD becomes static. It does not substitute wall-clock duration
or seekable bytes for playable buffer.

The mpv demux-thread poll publishes the final duration through the existing demux
cache mutex and duration event. No libmpv call runs inside a stream callback.
The public state uses an authoritative known native window before considering the
application's initial live hint. The final seek range retains its nonzero start;
removed DVR history is not advertised as available again.

The controlled fixture finishes on an explicit request, freezes its window, and
serves a standard ENDLIST/static update. The browser check preserves one engine,
verifies paused finalization and hint override, seeks near the final end, and
requires actual playback EOF. This stage is not qualified until those checks pass.

## Pending rendition and request identities

A paused pending rendition can lose all overlapping playlist entries before its
next refresh. Window admission now invokes the same checked anchor inheritance
used by segment planning. The active rendition's established timeline remains
authoritative; a matching overlap/discontinuity identity is required. The native
old/new regression reproduces the rejected seek and its recovery. All four
Chrome/Firefox Hybrid/Software rolling-discontinuity expiry checks pass on clean
archive `timeline-runtime-02`.

Authorization refresh may change a signed transport URL. The loader retains the
original logical resource identity for validators, pending opens and retirement,
while the handle keeps the effective authorized URL for transport. Closing a
refreshed handle decrements the same identity that opening incremented. Old/new
injected Fetch tests cover pending-open and active-handle retirement.

Transport stall failures already retain their native timeout result. Their
message now explicitly identifies a timed-out read so the existing public error
conversion preserves `NETWORK_TIMEOUT` and retryability. Header/body unit
regressions fail on the preceding text and pass on the new text; browser network
matrices verify the actual integrated path. No timeout becomes successful EOF.

The current results and exact archive identities are recorded in the central
status document; these changes still require the combined final gate.

The expanded finalization case exposed a stale-origin bug after switching audio:
segment planning used the global initial timestamp again when ENDLIST arrived,
while the published DVR window retained its later anchor. The fix makes both
finite and rolling segment lookup use the same checked playlist anchor. The
initial native finalization probe retained default audio and did not reproduce
the browser failure; the alternate-audio reproducer preserves that distinction.

### Component boundary admission

A video seek may select preroll preceding the first audio or subtitle timestamp.
On an out-of-range component plan, admission requires an available video plan at
the target and an overlapping first component segment. It never shifts packet
timestamps, guesses a tolerance, or restores an expired video segment. The native
`probe-startup.py` tests the available start and a just-expired negative control.

Decoder metadata is also source-owned: before a wrapper changes to a segmented
codec record, it clears the old record's decoder-name pointers. Retired track
metadata must not retain strings owned by a destroyed decoder wrapper.
