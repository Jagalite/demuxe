<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Streaming source maintenance

The upstream pins are exact commits and archive hashes in the prepared
`sources.lock.json`. `build/beta-build.json` binds those archives, every applied
patch, build configuration, SDK source inputs, license files and all three
engine artifacts. A passing test on another archive is historical evidence,
not qualification of a changed patch series.

The baseline classification remains in `baseline/profile.json`. The later
`live/subtitles` stage additionally pins libass 0.17.5: pruning needs the upstream
API, and this version includes the subsequent bounds fixes. GPL/source companion
requirements are unchanged. Distribute the exact preferred source, patches,
configuration and upstream archives corresponding to the runtime.

## New or extended patches

| Series | Responsibility | Maintenance boundary |
| --- | --- | --- |
| mpv 0013–0014 | Source-bound resources, accepted-seek cancellation and callback ownership | Keep browser bridge tests independent of demux fixtures |
| mpv 0016 | Integrated session and independently prepared container tasks | Private mpv/lavf hook; no second playback clock or public raw stream IDs |
| mpv 0017 | Demuxed/presented quality and retained output generation | Test decoder reconfiguration and stale frame ownership on both paths |
| mpv 0018 | Audio/subtitle component tasks, live window polling, discontinuity mapping, bounded cues, overlapping component admission, retired decoder metadata, audio-head ordering and condition waits, AVIO error precedence, source-bound terminal errors, accepted-read abandonment, fresh-seek refresh retirement, explicit internal seek preroll, accepted-video startup track references and final duration updates | Preferred task source is `live/subtitles/task`; generator is `live/make-mpv-live-patch.py --timeline` |
| FFmpeg 0010, 0014 | Truncation and genuine EOF distinction, including chunked HTTP characterization | Candidates for focused upstream fixes with minimal native reproducers |
| FFmpeg 0011–0013 | Continuous fMP4 admission, private segment plans and bounded sparse discovery | Preserve existing parser ownership; do not add a parallel JavaScript manifest timeline |
| FFmpeg 0015–0016 | HLS live component plans and resource retirement | Retirement is tied to accepted parser references, not guessed URL age |
| FFmpeg 0017 | DASH period catalog and stable logical component plans | Keep explicit admission limits and period/seek native fixtures |
| FFmpeg 0018 | HLS discontinuity identities and DASH retired resources | Retain checked timestamp arithmetic and bounded retirement lists |
| FFmpeg 0021 | Six-second integrated live DASH discovery headroom | `live/timeline/make-dash-startup-patch.py`; deterministic expired-oldest native and browser discovery cases; compatibility path unchanged |
| FFmpeg 0020 | Strict MOV sample EOF under `AV_EF_EXPLODE` | Native truthful-length half-payload and empty-mdat reproducers; default non-strict upstream behavior unchanged |
| FFmpeg 0019 | Pending rendition, ENDLIST and complete-VOD subtitle anchor correspondence | `live/timeline/make-window-patch.py`; preserve old/new paused-seek reproducer |

The earlier finite-HLS timestamp, indexed-WebVTT and fixed-selection compatibility
patches remain necessary for sources outside integrated admission. The integrated
path and compatibility path are selected once per source. They must never run two
segment schedulers for one accepted session. Compatibility reopen behavior is not
reported as persistent switching or ABR.

## Updating or upstreaming

1. Reproduce against the pinned unmodified upstream to separate upstream behavior
   from the browser bridge and Demuxe integration. Preserve the failing output.
2. Prefer small upstream submissions for EOF, callback routing, parser bounds and
   timestamp defects. Supply native fixtures and sanitizer reproducers without
   the browser dependency. No patch has been submitted upstream by this work.
3. Keep the browser mailbox and retained-frame bridge downstream while the upstream
   interface is browser-specific. Propose a generic demux/provider interface only
   with the ownership, cancellation and discovery evidence attached.
4. Rebase the stable baseline independently. Remove a patch only after the same
   workload passes without it, including the existing direct/remux regression.
5. Regenerate later patches from their preferred task source; inspect the full
   generated diff and record its hash. Never copy an old output after a generator
   fails. Update `live/timeline/patch-inputs.json` from the generated input
   record when promoting a regenerated patch; preparation checks every preferred
   task file and the generator before building. Do not edit an already built snapshot.
6. Build all three engines in a fresh directory, create one runtime archive, and
   run the browser/native/unit matrices against the corresponding bytes. Preserve
   failed archives and logs. Require a matching source companion and verifier.

The standalone native container-task tests establish packet ordering, resource
bounds and timestamp behavior. Injected Fetch tests establish transport state
transitions. Browser tests establish rendered/audio progression and actual mpv
lifetime. None substitutes for the others or for physical device qualification.

## Build-only naming debt

`WEBMPV_EM_CONFIG` is an internal path handoff between the existing clean-build
wrapper and linker scripts. It is not a browser API, npm consumer option or
credential. It remains unchanged for this baseline to preserve build attribution;
consolidating it with `EM_CONFIG` is separate build-tooling debt. SDK/cache paths
in historical evidence retain their actual filesystem names for correspondence.
