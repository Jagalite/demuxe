# Native ASS review fixes

All four findings from `results/optimization-review-current/REVIEW.md` are fixed.
The integration remains on f97588443ff4d2a043a2fd8500fb73bd45e656e1 with local changes;
no commit, push, merge or release was performed. The original review evidence,
optimization laboratory and prior checkpoints remain unchanged.

| Finding | Before | After | Permanent regression |
| --- | --- | --- | --- |
| Source/layout geometry | 10 px border stayed 10 px at half output size | 10 → 5 → 10 px through shrink/restore | tests/native-ass-style-regressions.mjs |
| Invalid selection | Valid parsed track discarded, overlay hidden | Old parsed track, selected ID and visibility retained; fresh output after seek/toggle | tests/native-ass-selection-regressions.mjs |
| Worker constructor failure | One orphan canvas per rejected retry | Zero canvases after each of three retries | tests/native-ass-selection-regressions.mjs |
| Visibility/selection | Hide marked selected track unselected | Selected track metadata unchanged during hide/show | tests/native-ass-selection-regressions.mjs |

The JS/Wasm render interface is version 2. Old subtitle assets reject explicitly
both during worker initialization (Chrome fault-injection test) and at packaging
(`interface-gate.json`). Rebuilt matching assets are `build/native-ass-04`.
The four regression cases pass in Chrome 152.0.7977.83 and Firefox 146.0.1.
The initial additional Firefox interface-mismatch test failed because the worker
module import bypassed Playwright's interception. That failed attempt is retained;
only this extra interface fault-injection case is skipped in Firefox, not the four
review-fix regressions. The same interface guard passes its Chrome test.

Additional validation:

- Existing ASS suite: direct, remux, FLAC, FLAC+gain and destroy during blocked
  Wasm loading pass in both browsers, including fullscreen, active cues, animation,
  pause, resize, source/track transitions and resource cleanup.
- Root contracts: 36/36. Saved-streaming assembly 25 compiles and passes 59/59
  contracts. This is source/contract coverage, not modernized streaming E2E.
- Package 13: installed-consumer cases automatic-local, native-external-ass and
  native-adaptation-ass-gain pass; all six asset/source-companion checks pass.
- Patch reverse-check and `git diff --check` pass; no patch was applied in reverse.

Runtime package: `build/optimization-package-13/demuxe-0.3.0-beta.3.tgz`
SHA-256: `105ce93f1849f4d5e28b617787ab9db2b298c04ad5e8fff2058ff6ac35b1f80f`.
Source companion hashes are in that directory's SHA256SUMS. Library locks and
maintained build scopes are unchanged; clean release correspondence remains gated.
No new performance claim is made; prior benchmarks identify their older artifacts.

`review-fixes.patch` is the independent 12-file patch against the previous delivery
checkpoint. Its baseline contents were reconstructed without modifying an active
checkout and verified against the prior checkpoint hashes. `checkpoint/` contains
the full local integration patch and hashes for current evidence and artifacts.

Rerun from the integration root with matching interface-v2 served assets:

```sh
npm run build
node tests/native-ass-selection-regressions.mjs
BROWSER=firefox node tests/native-ass-selection-regressions.mjs
node tests/native-ass-style-regressions.mjs
BROWSER=firefox node tests/native-ass-style-regressions.mjs
node tests/native-ass.mjs
BROWSER=firefox node tests/native-ass.mjs
BETA_ARCHIVE=build/optimization-package-13/demuxe-0.3.0-beta.3.tgz ADAPTATION_FIXTURE=build/optimization-fixtures/long-pcm.mkv CASES=automatic-local,native-external-ass,native-adaptation-ass-gain node tests/beta-consumer.mjs
BETA_ARCHIVE=build/optimization-package-13/demuxe-0.3.0-beta.3.tgz node --test tests/copy-assets.mjs
```

Long unequal-tail adaptation, embedded Native ASS, Opus+ASS and automatic adaptation
are not enabled by these fixes. No Safari/mobile, anamorphic, endurance or physical
A/V qualification is inferred from these tests.
