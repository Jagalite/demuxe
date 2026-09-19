<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Discontinuity and retained-resource stage

This stage is not yet qualified. Its source and generated patches are separate
from the DASH browser candidate so regressions can be attributed.

HLS parsing attaches the absolute EXT-X-DISCONTINUITY-SEQUENCE identity to every
segment. Rolling overlap checks require that identity to remain consistent. The
existing packet-established playlist anchor plus EXTINF durations supplies each
segment's nominal position; URL names and wall time never supply media timestamps.

Container tasks return raw packets and immutable plan metadata. The owning native
adaptive demux session establishes a discontinuity offset from the active video's
first DTS in a planned segment. Audio, subtitles and candidate video use that same
offset. They cannot create competing offsets. A component packet whose epoch is
not established waits while the active video task makes progress. Candidate
preparation remains independent of the active producer.

Plans carry known presentation boundaries separately from decode timestamps.
Preroll packets remain available to the decoder; mpv owns output clipping. A live
window that no longer contains a period-start marker does not invent that bound.
The initial implementation uses a fixed offset cache; seek, eviction and delayed
component behavior still require adversarial coverage before promotion.

The native DASH catalog computes resource-identity retirement from the old and
new accepted tables, including all periods and representations. It does not fetch
unselected resources. Each temporary identity set has a 1 MiB allocation charge
and at most 8192 segment visits. An allocation or admission failure retains the
old catalog and its validators. Open browser handles retain their own validators
until close, even after catalog retirement. Integrated MPDs have a 4 MiB parser
input limit. These bounds require dedicated native and browser qualification.

After HLS hands off its initial readers, initialization records absent from all
current segment plans can be freed. Copied task plans contain URLs and ranges,
not pointers into that list. The parent still owns all records referenced by its
current manifest and frees them at close.

The native fixture repeats two 16-second timestamp epochs with an explicit HLS
discontinuity, alternate audio, three video renditions and segmented subtitles.
`hls-discontinuity-session-02` passes packet checks, including first/last subtitle
PTS within 1 ms of the intended timestamp-map offsets. ASan/UBSan units cover
positive/negative 33-bit WebVTT wrapping. These checks do not qualify rendered
A/V continuity, real wrapped-stream playback, network gaps or sustained cleanup.
Those remain separate gates.
