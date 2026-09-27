<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Roadmap follow-up review

2026-09-27. Reviewed the implemented roadmap in the shared working tree at HEAD `4576bba9d65cc35cc4a1462acb87e2465ae85924`. Fixed the issues below and added regression coverage. No commit or push was issued. Earlier implementation evidence remains in [the original report](../20260927/README.md).

## Findings fixed

| Finding | Correction |
|---|---|
| A chapter seek queued behind source replacement used the old chapter timestamp against the new source. | Capture the accepted source identity and revalidate it when the queued seek executes. A failed replacement still leaves old chapter IDs usable. |
| Boundary handling captured a range before other queued controls could remove/change it. Its failure handler could also change a replacement session's pause intent. | Recheck the accepted session, latest range, and current clock at execution; contain failures to the original live session. |
| Setting an A–B loop outside its interval left playback before the requested start. | Seek and settle at the interval start before publishing the loop policy. |
| PiP entry could finish after destruction or exit; simultaneous document entries and late old-window events could corrupt restoration. | Lock pending video surfaces, retire late completions, reject concurrent entry, and bind restoration callbacks to their own window. Late fullscreen completion also exits on destruction. |
| Subtitle activation/attachment could bypass the unsupported video-PiP composition restriction after entry. | Reject these operations while video PiP is active or entry is pending, and recheck composition eligibility after entry completes. Document PiP keeps its separate supported container behavior. |
| Shaka could return false from configuration or ignore manual selection while the API published success. Automatic audio eligibility compared language/codecs but omitted roles and other identity fields. | Check configuration and actual backend selection, restore previous configuration on failure, match complete audio identity, and report runtime ABR policy accurately. |
| The fast parser's incomplete-result behavior swallowed provider failures, changed source identity, and premature EOF during standalone inspection. | Retain and rethrow provider errors separately from ordinary metadata gaps/budget exhaustion. Also validate optional close callbacks and count actual provider calls within the read limit. |
| Successful idle controls could increment source-scoped seek counters without an accepted source. | Ignore seek measurements while statistics have no source identity. |

Hidden selected attachment removal was also exercised; it already passed and required no change.

## Validation

- Normal build, generated declarations/runtime, dependency boundary and license checks: passed ([log](build-final.log)). A final TypeScript emit included the last PiP subtitle guards.
- Related Node contracts: **58/58 passed** ([log](node-final.log)): lifecycle races, streaming policy rejection/rollback, source ownership, idle statistics, public typing, state/tracks, and plan admission.
- Chrome roadmap suite: **21/21 passed** ([result](../chrome-1790524782985/result.json), [log](chrome-full.log)).
- Firefox focused review regressions: **4/4 passed** ([result](../firefox-1790524782985/result.json), [log](firefox.log)).
- Real Chrome Shaka quality/attachment/live navigation checks: **2/2 passed** ([result](../../shaka/lifecycle-2026-09-27T15-59-10.244Z/result.json), [log](shaka.log)).
- Final real Chrome video-PiP regression, including subtitle activation/attachment rejection and teardown: **1/1 passed** ([result](../chrome-1790524990866/result.json), [log](pip-subtitles.log)).
- Scoped `git diff --check`: passed.

The full Chrome and focused Firefox runs preceded the final idle-statistics guard and PiP subtitle restriction. The final Node and targeted PiP runs cover those final corrections; this is intentionally reported as separate evidence. Browser versions remain Chrome 153.0.8010.53 and Firefox 146.0.1 on Darwin arm64. Firefox programmatic PiP remains unavailable as documented previously.

Before-fix regressions are preserved in `before.log`, `browser-before.log`, `source-before.log`, `stats-before.log`, and `pip-subtitles-before.log`. The provider-only reproduction additionally exposed a test teardown reference error; the harness now uses `window.p?.destroy()` and starts its server only after fixture generation succeeds. [hashes.json](hashes.json) records reviewed source, generated modules, documentation, and tests.

These fixes preserve the original [API resource and route limits](../../../docs/API-EXTENSIONS.md). They do not establish new codec, HDR, physical audio-latency, non-default output-device, performance, Safari, or release qualification.
