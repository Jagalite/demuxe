<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Integration follow-up review — 2026-09-27

Reviewed the uncommitted integration increment over `f68c1b1b`. The original
[implementation report](../20260927/README.md) remains historical evidence.
Unrelated README/research changes were preserved. No commit or push was issued.

## Findings corrected

- A removed subscription could still receive a callback copied into an in-flight
  publisher iteration. Individual subscriptions now guard their own lifetime.
- Reentrant state changes from adapter event handlers could leave the outer
  publication emitting stale events. Events now require the originating snapshot
  to remain current.
- Unknown/live transitions with a null canonical duration did not notify changes
  from NaN to Infinity. Duration events now compare the projected duration.
- Rebinding an already observed media element did not initialize external controls
  from current accepted settings. Binding now synchronizes initial properties,
  explicitly marked `initial: true`, without replaying seeked or ended.
- The media view reconstructed ended events that the canonical owner intentionally
  suppresses for looping. It now retains the core's loop suppression rule.
- Two Video.js Techs could claim one host, teardown could steal an application-
  relocated host, and disposing after runtime destruction could resurrect the
  removed host. Presentation ownership is exclusive; restoration respects current
  location and owner lifetime. Repeated disposal is harmless.
- Successful source replacement left Video.js's previous fatal error latched.
  Session error queries now project canonical errors; accepted replacement clears
  the host UI error without synthesizing a new Tech error.
- Fullscreen used an ancestor validated only at configuration, allowed target
  changes during pending entry, and did not retire entry on exit. Entry revalidates
  composition, locks its target, and retires late completion. Configuration on an
  independent player remains possible while another player is fullscreen.

## Verification

- Final Node integration and related API contracts: **72/72 passed**; see [node.log](node.log).
- Public package TypeScript consumer: passed, no diagnostics ([types.log](types.log)).
- Chrome 153.0.8010.53: both external profiles passed, including exclusive host
  ownership, error recovery, application relocation, destroyed-owner disposal and
  initial-state synchronization ([result](../chrome-1790527543137/result.json)).
- Firefox 146.0.1: both profiles passed the same regressions
  ([result](../firefox-1790527584591/result.json)).
- Focused Chrome presentation test: passed stale target rejection, pending entry
  retirement, independent-player configuration, responsive host and owned teardown
  ([result](../presentation-1790527585289/result.json)).
- Final normal build and license/dependency checks: [build.log](build.log).
- Scoped whitespace check passed. [hashes.json](hashes.json) pins reviewed files.

Chrome's external-profile run preceded the final independent-player fullscreen
configuration refinement; the subsequent presentation test and Firefox run cover
that refinement. The final loop-event suppression was checked by the final Node
regression after those browser runs. Generated SPDX stamping has no runtime effect.
These are separately scoped results, not a claim that every browser scenario was
rerun after every change. Fixture, platform and profile limitations remain as in
the original integration report; this review adds no performance qualification.
