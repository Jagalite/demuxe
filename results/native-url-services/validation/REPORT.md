# HEVC seek follow-up — 2026-09-26

The HEVC open-GOP seek failure is fixed in the working tree based on `a560ca9b`.
The remuxer now reads at most one signaled reorder window (bounded by 256 packets
and 2 MiB) and seeds synthetic decode timestamps before its earliest video PTS.
It retains every packet in decode order and preserves source presentation
timestamps and payloads. The strict non-increasing DTS rejection remains intact.
This applies to HEVC Matroska reconstruction; the separately gated unequal-tail
audio adaptation path retains its existing behavior.

Final validation:

- Rebuilt remux Wasm successfully using the same dependency provenance described below.
- **12/12 URL browser cases passed**, including both HEVC rows. Video markers,
  stereo tones, subtitle presence/clearing, repeated seeks, route retention,
  authorization refresh, rate state and worker cleanup all passed.
- **2/2 local-File HEVC controls passed** with the same output and seek checks.
- Terminal source-identity failures remained terminal in both browser runs.
- **3/3 focused C/packaging regressions passed**. The new C test compiles the actual
  lookahead and timestamp reconstruction with address/undefined-behavior sanitizers;
  it checks packet retention, interleaved audio, short EOF, read errors, malformed
  timestamps, resource bounds, bypass cases, and rejection of real duplicates.
- The earlier standard build and 109 contract checks passed as recorded below.
  No CPU benchmark was run and no README performance figures were changed.

Evidence: [full URL matrix](../2026-09-26T14-59-39.821Z/),
[local HEVC controls](../2026-09-26T14-59-40.481Z/), and
[follow-up artifact hashes](hevc-fix-identity.json). Follow-up logs use the
`hevc-fix-` prefix in this directory. Historical failed runs and their hashes
remain unchanged. This follow-up is recorded in a subsequent commit to `a560ca9b`.

Review coverage note: both HEVC fixtures contain the same encoded video stream
(SHA-256 `55b348d5f9659ea46455ddd4504d0e167926d17fe46b55d4404429b8b93614b4`).
They exercise different service combinations, not independent encoder/reorder
configurations. Other reorder depths, variable frame rates, and encoder outputs
remain unqualified. The three focused regressions passed again during review.

---

# Native URL validation — 2026-09-26

Commit under test: `a560ca9b`, with regenerated TypeScript output, a rebuilt remux
Wasm, and corrections to the regression harness described below. Existing audio,
subtitle and fallback engine binaries were copied from the main checkout. The
remux link reused its FFmpeg static libraries; this was not a clean dependency
rebuild or package/release qualification. No CPU benchmarks were run.

## Results

- Standard `npm run build`: passed, including TypeScript, core boundary and
  source/license checks. Initial sparse-checkout attempts lacked license inputs;
  restoring the preserved files from HEAD resolved that setup issue.
- Remux runtime build: passed; new Wasm validated before publication in this worktree.
- Focused native-service, parameter-set, tier-policy, plan-admission and range-reader
  tests: **52/52 passed**. The initial range-reader run lacked its expected local
  server; the complete rerun passed with that prerequisite running.
- Related selection, browser capability, runtime/readiness, remux packaging and
  subtitle overlay contracts: **57/57 passed**.
- URL browser regressions: **10/12 passed**. Each passing row retained its expected
  Native plan, showed correct timeline colors and stereo tones after seeks, and
  completed rate change and worker cleanup. Subtitle rows also checked text or
  magenta drawing presence and clearing. Authorization refresh succeeded.
- Local-File controls: H.264/AC-3 passed; H.264/ASS passed with Native remux
  explicitly selected to match the URL transport. Its initial default selected
  the valid Native Direct subtitle plan, so that route-expectation mismatch was
  corrected in the harness.
- The terminal source-identity failure assertion passed before the final aggregate
  assertion reported the two failing rows.

| Fixture | Result |
| --- | --- |
| h264-aac-pgs-isolation | PASS |
| h264-aac-vobsub-isolation | PASS |
| h264-ac3 | PASS |
| h264-ass | PASS |
| h264-dts | PASS |
| h264-eac3 | PASS |
| h264-movtext | PASS |
| h264-srt | PASS |
| h264-ts | PASS |
| h264-vobsub | PASS |
| hevc-pgs | FAIL — Native lost on seek |
| hevc10-ac3 | FAIL — Native lost on seek |

## Historical blocker — resolved by the follow-up above

Both `hevc10-ac3` and `hevc-pgs` initially select the intended Native split, then
fall back to Hybrid at the first seek to 3 seconds. The remuxer rejects
`Selected timeline discontinuity` at its non-increasing DTS guard. The same
`hevc10-ac3` failure reproduces with local File input, so this is not specific to
the new URL transport. Packet inspection around that seek shows the key packet
at PTS 3000 followed by a reordered packet at PTS 2967; the current reconstruction
seeds synthetic timestamps from the first packet. A correct seek/timestamp repair
needs its own validation; this run did not loosen the discontinuity guard.

The HEVC rows blocked Native lifecycle qualification in this initial run. The
follow-up above resolves both failures. The MPEG-TS row passed with the rebuilt
padding-normalization change.

## Harness corrections and evidence

The initial bitmap checks assumed the text fixture's 0.5–35.8 second cue interval.
`ffprobe` showed that the muxed PGS/VobSub packets instead span 0–35.3 seconds.
The corrected checks seek beyond that actual clear boundary and then back inside
the cue. Those bitmap rows pass. The test now retains per-seek diagnostics,
continues across failing rows, checks plan identity immediately after every seek,
and supports a local-File control. Its terminal identity assertion was corrected
to inspect `selection.attempts`.

Final URL evidence: [per-row diagnostics](../2026-09-26T14-50-45.819Z/).
Earlier failed runs are retained in the sibling timestamped directories.
[Artifact and fixture hashes](identity.json) record the tested inputs; build and
contract logs are retained here. Generated runtime changes, harness corrections
and this report are not included in the earlier commit.
