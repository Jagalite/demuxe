<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# EB20: oracle requirements for the evaluated follow-ups

This is an acceptance contract, not an executed corpus. Node mocks cannot establish browser output or physical A/V. A structural validator cannot establish decoded fidelity. FFmpeg and ffprobe share lineage and do not count as two independent implementations.

| Axis | Required reference | Adverse control | Apply to |
|---|---|---|---|
| Structure and offsets | A second parser with declared lineage, or independently authored bounded parser tied to the relevant format specification | Offset targets wrong sample, size overflow/nonconvergence, truncated init | EB08, EB14, EB19 |
| Payload/sample identity | Frozen original payload hashes plus independent decoded impulse/channel or picture references; record sample format/rounding | Missing track, duplicate/double-trimmed samples, altered payload | EB09, EB12, EB16, EB19 |
| Timeline and metadata | Marked PTS/sample positions, trim ownership and preserved color/crop/channel metadata | Double offset, wrong channel, stale epoch, inferred duration classified as exact | EB09, EB10, EB17, EB19 |
| Destination residency | Real SourceBuffer and media-element ranges plus marked output; inspect intended and completed operations separately | Partial append failure, eviction, tail-only dependency refill | EB01, EB02 |
| Resource lifecycle | Actual owner generation, terminal-release counts and bounded retained objects after cancel/reset/source replacement | Late frame, double close, canceled shared consumer, unreleased backing view | EB04, EB05, EB06, EB15, EB22 |
| Subtitle output | Independent libass image/glyph/color/position comparisons at predeclared timestamps, including resize/font generations | Movement without bitmap-content change, missed karaoke change | EB18 |
| Route identity | Observe the executed decoder/demux/presenter and fallback, not MIME/API support alone | Software output reported native, prepared state reported verified | EB05, EB07, EB12 |
| Live policy | Explicit loss budget, dependency closure and A/V/subtitle marker recovery; separate strict VOD comparator | Dropped required VOD group, dependent frame without RAP, unreported skipped interval | EB21 |

For every row used by a future run, record reference version/hash, source/fixture rights, implementation lineage, tolerance, expected negative outcome and actual output. Stop corpus expansion when it cannot change a decision. Performance starts only after the relevant output/lifecycle gates, with cold setup, transfer, retained memory and teardown charged. Physical output requires its own device measurement.
