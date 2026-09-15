# DASH catalog and packet-session stage

This is isolated, unqualified staging. No release-path switch is implied.

The existing FFmpeg MPD parser builds the authoritative catalog for every
Period. It reuses its AdaptationSet, Representation, URL-template and container
parsers. JavaScript does not rewrite the MPD or choose segment URLs. mpv owns the
logical tracks, packet cache, clock, output and normal controls. The existing
native adaptive coordinator consumes immutable plan copies; its component tasks
perform bounded container reads and candidate preparation independently.

## Period correspondence

The first Period creates logical AVStreams. Later periods bind representation
ID, adaptation-group identity and language to those same logical streams. The
catalog rejects ambiguous identities, changed track inventories, unsupported
codec-family transitions and non-contiguous periods. Language remains owned by
the representation after copying it into AVStream metadata. Moving that string
out of the representation broke subsequent identity checks and is corrected.

Private sequence tokens pair a source-local period serial with the original
segment number. They are never public quality or track identities. Refresh keeps
the serial of a retained Period only if its identity and start time agree.
Successful parsing and binding precede replacing the accepted catalog. Failed
refreshes retain the previous catalog, while surfacing the failure.

Segment timestamps map as `(container timestamp - presentationTimeOffset) /
timescale + Period.start`, using checked integer arithmetic. Plans carry period
presentation bounds separately from packet timestamps. mpv receives those bounds
for decoder preroll and output clipping. Correct packet timestamps alone do not
prove that rendered period transitions preserve A/V continuity.

## Current admission limits

The current implementation supports initialization-bearing SegmentTemplate with
an explicit positive SegmentTimeline, aligned H.264 video and the existing
component paths. It rejects negative repeat counts, unsupported segment layouts,
protected representations, more than 32 periods, and unbounded/invalid sequence
arithmetic. These are implementation limits, not a claim that DASH forbids those
features. UTCTiming and low-latency availability offsets are not qualified.

Dynamic availability currently uses availabilityStartTime, complete segment end
times and timeShiftBufferDepth. Candidate discovery does not probe the media of
unselected video renditions. Native initial characterization still reads selected
video and alternate-audio components; measure that traffic separately.

## Evidence and remaining work

`dash-session-probe-04` traverses both 16-second periods, returns 768 video and
1496 audio packets, and accepts three rendition switches. It deliberately paces
packet consumption by 3 ms so asynchronous preparation overlaps consumption.
This is native packet execution, not browser rendering or physical A/V evidence.
Earlier rejected handoff and unpaced-switch attempts remain preserved.

DASH archive 01 passes rendered two-period playback in both browsers and decoder
paths. Archive 03 adds current-window startup/seek admission; three repeated
Firefox Hybrid and one Chrome Hybrid expired-pause cases pass. Earlier Firefox
Hybrid failure evidence remains preserved. Native resource-identity retirement
passes in `dash-retirement-native-01` (55 retired, none still referenced).

The separate subtitle overlay adds fragmented MOV text and cue admission;
`dash-subtitle-native-02` passes 16 correctly timed cues across both periods with
three quality switches. Browser subtitle rendering, dynamic period-inventory
updates, long-running bounds and final combined-archive qualification remain open.
The HLS archive-12 browser results do not qualify this DASH stage.
