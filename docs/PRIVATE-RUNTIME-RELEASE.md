<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Private-runtime beta release preparation

Candidate `v0.3.0-beta.4-rc.15` uses source commit
`217507596a3fc616523cf014351e3bf8e4cf46df`. Its frozen runtime is
`demuxe-0.3.0-beta.4.tgz`, SHA-256
`8b0bb6d8c2365900bc6865e855117a1f2dae208207e612f131391ea54371660d`.

All mandatory exact-archive gates passed after the retained requalification runs below. This is a bounded developer-beta publication handoff; nothing has been published.

The [verification record](../results/jspi-asyncify/private-runtime-release-rc15/verification.json)
and [private Player verification](../results/jspi-asyncify/private-runtime-release-rc15/release-preparation.json)
identify the exact archive, source companions, test harnesses and original results.
The [evidence index](../results/jspi-asyncify/private-runtime-release-rc15/evidence-index.json)
records hashes and local paths for the detailed evidence.

## Qualification

| Release gate | Result |
| --- | --- |
| Consumer package, Chrome and Firefox | 30 cases per browser passed |
| Streaming package, Chrome and Firefox | 6 cases per browser passed |
| Shaka package, Chrome and Firefox | 4 cases per browser passed |
| Public API, Player component and menus | All 8 groups passed, including 50 component checks per browser |
| Optional ASS/adaptation package | All 27 source, asset and browser groups passed in the complete requalification |
| Full format catalogue | All 80 formats compared against the preserved baseline; no regressions |
| Private Player correctness / routes / lifecycle | 31 / 12 / 18 cases passed |
| Runtime and three source companions | All four checksums verified; npm publication dry run passed |

The catalogue retains 71 bounded playback successes (47 identical paths and 24 passing route changes) and 9 preexisting unqualified cases. There are no newly blocked cases or changed preexisting limits. This is not an 80-format fidelity claim. The nine unqualified cases include the preserved specialist audio/HDR limitations; multichannel downmix screens do not qualify discrete channel fidelity.

The private Player matrix covers pthread, JSPI and Asyncify, five subtitle
formats, exact PCM capture, subtitle pixel comparisons, pause, seek, 2x rate,
context suspension, source replacement, EOF/replay and teardown. The full
61-case matrix is Chrome evidence; the two browser consumer suites independently
cover private services and runtime selection. Automated WebKit menu checks do
not establish Safari media qualification. Clock figures estimate consumed-PCM
presentation; they are not acoustic latency measurements.

## Defects closed during preparation

A complete subtitle sequence exposed a Chrome MSE worker that survived
`terminate()` until its owning page closed. The worker now belongs to a
disposable same-origin document that is removed on acknowledged, timed-out or
failed shutdown. Concurrent destroy calls await the same teardown. Three full
patched-runtime subtitle sequences passed before the new archive was assembled.

A local JSPI PCM case exceeded the existing 150 ms A/V clock gate after a seek
and rate reset. Starting after the first consumed block allowed video to run
before audio reached the held video position. Video now waits for the consumed
presentation clock to reach that position, with a fully drained audio-tail
exception. Four focused playback trials passed at 58–62 ms p95 before archive
qualification. The new regressions fail against the previous implementation.
The clock threshold and zero-worker cleanup requirement are unchanged.

Preparation also corrected archive import discovery, current engine inventory,
private source/build bindings, Firefox error messages, automatic-route output
checks, autoplay-aware UI tests, and same-frame seek assertions. Catalogue
comparison now requires every current format regardless of README column order.
Quiet audio remains a failure at the output stage under the original shared
startup deadline. Failed candidates and diagnostic attempts remain at the paths
recorded in [defect evidence](../results/jspi-asyncify/private-runtime-release-rc15/defect-fixes.json).

## Earlier Firefox interruption

RC14's first package/UI run passed 49 Firefox component cases before a native
content-process `SIGSEGV` interrupted the final queue case. The macOS crash
record and failed run are retained. The first full component diagnostic passed;
the second exposed a separate test assumption that pausing reveals hidden
controls. The center-transport test now explicitly reveals controls through a
pointer interaction before testing an actual click and waits for actionability
before checking geometry. No forced click or assertion relaxation is used.
The original native crash is not claimed fixed. This candidate's qualification
is bounded developer-beta evidence, without a browser endurance claim.

## Retained navigation timeout

The first RC15 optional run timed out after 20 seconds while loading the local
Firefox test page, before Player was constructed. Its other ten automatic
playback cases passed. The failed attempt remains in the evidence. Two fixed complete diagnostic runs passed all 11 cases each. One fresh complete official optional qualification then passed all 27 groups with the same timeout, output assertions, tagged harness and archive. The navigation timeout's cause has not been established;
no product fix is claimed for it.

## Retained catalogue timing failure

The first RC15 catalogue comparison retained one new failure: PCM24 with external
ASS advanced 0.67502 seconds during the 800 ms rate window, below the unchanged
0.7-second minimum. Three fixed complete diagnostic trials passed. Their traces
show public time updates lagging the media-element clock; this establishes timing
sensitivity, not the cause of the original failure. One fresh complete 80-format campaign then passed the unchanged regression comparison. Both the original failed comparison and the successful full requalification remain recorded; no product fix is claimed for this timing failure.

## Artifacts and handoff

The clean native build records 181 inputs. None changed for the final worker and
audio host fixes. The release artifacts include the standard source companion and separate
ASS and adaptation companions; all four archive checksums and the npm publication
dry run passed. The committed tag and source manifests bind the final JavaScript
changes. This does not claim universal bit-for-bit build reproducibility.

No CPU campaign or README table measurement was run for this release preparation.
Performance work remains with the separately assigned campaign. Existing CPU
results retain their original runtime hashes.

Nothing has been published. The registry check found only `0.3.0-beta.3`;
`npm whoami` returned `E401 Unauthorized` on 2026-09-28. Publication requires renewed
npm login, downloadable matching source companions, and the explicit publication
steps in [the release guide](RELEASE.md#publishing-a-qualified-beta). Use the
qualified archive without rebuilding or repacking it. The other agent's local
Player/API and measurement edits are outside this frozen candidate.
