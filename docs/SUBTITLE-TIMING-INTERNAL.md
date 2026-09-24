<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Internal subtitle timing bridge

The pinned mpv adaptation is `patches/0014-subtitle-raw-timing.patch`. It adds
`sub_next_raw_boundary(dec_sub *, video_pts, &next)` and
`sub_set_timing_changed_cb(dec_sub *, cb, ctx)`. The former returns the first
known ASS/text event start or end strictly after the supplied media PTS, with
mpv's subtitle delay and speed conversion applied. It returns `false` for
unsupported decoders and `MP_NOPTS_VALUE` for no currently known boundary.
It does not advance demuxing, extract text, render, or promise completeness of
future events. Bitmap subtitle timing is not supported by this query.

`sub-lines` intentionally keeps mpv's plain-text deduplication. Two ASS events
can have the same text and different styles or positions; deduplication can
hide the end of the shorter event. The internal query iterates the underlying
ASS events before this deduplication and returns only a number. It does not
alter the public property or expose subtitle content to Demuxe.

After a subtitle packet is decoded (including preload, segment and cached
redecode), or the decoder is reset, mpv invokes the registered callback under
`dec_sub`'s lock. The callback means that the known timing set *may* have
changed. It must not call back into mpv. The service increments an atomic
32-bit epoch and coalesces notifications onto the subtitle worker's main
runtime thread. Its unsolicited `subtitleTimingChanged` message carries the
latest epoch and never calls `web_subtitle_render`.

The worker's internal `timing` RPC calls
`subtitle_service_next_raw_boundary(pts, &next, &epoch)` and returns
`{supported, unstable, next, epoch, avChains}`. Status `-1` means no supported
selected text decoder, `-2` means the timing set changed across both bounded
query attempts and the caller must retry, `0` means no known boundary, and
`1` means `next` is valid. A stable snapshot is paired with the epoch observed
at the end of its query, so a later decode notification makes it stale.
A consumer must reject an old snapshot after seek, selection, source change,
visibility/rate change, reset, or destroy. The host's existing revision covers
these lifecycle changes; native seek, selection, source open, reset and close
also increment the timing epoch. An arriving notification alone does not
request a full render. Production still uses the existing 60 Hz render loop.

This is a prerequisite, not a deadline scheduler. Late packets appear only
when mpv advances subtitle demux/decode; the callback does not cause that
advance itself. A future scheduler still needs a bounded discovery mechanism
when the next event is not yet known. ASS animation and bitmap subtitles also
need independent qualification before leaving frame cadence.
