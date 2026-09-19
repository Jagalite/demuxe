<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Reproduction and continuation

Run from `/Volumes/seed2/Projects/demuxe`. Do not rerun the whole campaign automatically: the clarified endpoint was a pursuit decision, and existing results are retained.

Read `README.md`, `ALL_ITEMS.md` and the specific stable key in `decisions-latest.json`. Missing reports, environment limits and expensive setup are separate outcomes. Reopen a row only when its prerequisite changes or its next uncertainty justifies investigation. The 34 recommendations are in `PURSUE.md`; there are no unreviewed catalogue keys.

## Verify saved results without rerunning media

```sh
python3 results/full-completion/verify.py
npm run check:licenses
git diff --check
```

`summarize.py` can rebuild the human-readable views and validate prior evidence identities and unchanged tracked source state; regeneration changes the timestamp and invalidates the fixed manifest, so it is not part of the read-only verification command. `verify.py` validates the recorded canonical probe predicates and fixed evidence manifest. Neither performs playback or claims blocker resolution. `record-decisions.py` is retained for decision provenance; it appends history and should not be run casually.

## Selected bounded reruns

```sh
node tests/completion-remux-policies.mjs
node tests/completion-track-view.mjs
node tests/completion-vp9-framing.mjs
node tests/completion-parser-boundaries.mjs
node tests/completion-lacing.mjs
node tests/completion-lace-remux.mjs
node tests/completion-remote-index.mjs
node tests/completion-frame-boundaries.mjs
```

These use retained synthetic fixtures/current build assets. Reruns overwrite canonical result paths, intentionally invalidating the old fixed evidence manifest; preserve the old results and write a new campaign manifest when experimenting further. Individual scripts contain their modes, exact transformations, assertions and cleanup.

```sh
node tests/completion-native-delivery.mjs
LONG_FIXTURE=1 node tests/completion-native-delivery.mjs
FORCE_WEBM=1 node tests/completion-remux-webm.mjs
python3 results/full-completion/r202/probe.py
python3 results/full-completion/r222/probe.py
python3 results/full-completion/r225/probe.py
```

The default `completion-remux-webm.mjs` capture is MP4 unless the test-only WebM capability filter is enabled. An early capture named `continuity/maintained.webm` is actually MP4; its bytes and original result are retained. Canonical WebM evidence is `continuity/maintained-webm.webm` and `maintained-webm-result.json`. File extension is not a container oracle.

The R21 cache harness cannot run its candidate until `/web/engine-ass/subtitles.mjs` and matching Wasm are built. Its saved failure is a setup result. Do not infer cache correctness or benefit from the unexecuted candidate code.

## Important diagnosed harness variants retained

- Remux route interception initially omitted worker isolation headers; corrected served variants restore them.
- Browser `VideoPlaybackQuality` needs explicit property extraction for serialization; an empty serialized object was not evidence of no pictures.
- Media load/seek resets playback rate; canonical policy run sets the default half-speed rate and explicitly re-applies/asserts 4x after seek.
- Reusing one media element across selected-track tests contaminated the analyser with earlier audio. Fresh elements exposed the real disabled-track flag defect; enabling the selected tkhd fixed both moov layouts.
- Original generated WebM inter-track ordering was rejected by both candidate and baseline. The retained fixture-only stable ordering change preserved all per-track packets/timing before comparison.
- The maintained WebM fixture begins at timeline bias 1. A first-block probe must seek to its actual buffered start after the remainder is appended; the initial unbounded zero-origin wait was terminated and retained as a harness failure.
- Audio-only remux has zero video packets; the corrected oracle handles an empty video list and independently checks complete decoded PCM.

## Recommended next work

For implementation work, start with the narrowest promising owner changes: R26 paused timer behavior, R49 rate-aware preparation, R215 stride upload, R41 strict SRT, or R59 selected-track view. Each still needs its affected production ownership/fidelity checks. R27 has the strongest retained initial startup evidence but still needs cache/asset/cancellation qualification. Do not combine these into an unmeasurable multi-change performance patch.

R3 needs a realistic latency and abandoned-byte tradeoff before implementation. R12 needs exact priming/padding accounting before a cost comparison. R202 needs real coefficient distributions and guard costs before SIMD investment. Regression witnesses from R110/R125/R158/R171 are useful regardless of feature selection.

No production integration, commit, publication, route promotion or release qualification is included in this decision campaign.
