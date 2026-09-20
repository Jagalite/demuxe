<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# R274 whole-player prerequisite audit

**Deferred for a missing index-construction/source-integration prerequisite, not a negative experiment.** No browser, build or benchmark was run.

The retained native seek comparison saved88.47% transferred bytes and2077.7ms for a trusted prebuilt index. Those conditional observations remain intact. They do not include constructing an index from a source that has no Cues.

`virtual-cues-sized-fixture.py:17-27` extracts existing Cues and replaces the element with equal-sized Void. `virtual-cues-browser.mjs:3-6` checks source/index/output hashes and restores the precomputed overlay after loading the complete source into server memory. The fixture is3,652,612bytes, with574bytes of Cues at offset3,652,038. The browser test uses a raw video element.

Wrapping that server in the maintained Player is feasible but does not repair the missing cost boundary. A faithful cold job needs a validated cue-less cluster/block/random-access scanner, truthful index/SeekHead/Segment authoring, authenticated source binding and measured acquisition/scanning/hash/retention costs. It also needs Player source lifecycle, selected A/V and cancellation checks. None is provided by restoring the removed fixture bytes.

Keep the component pursue decision. Reopen whole-player testing for a real authenticated prebuilt-index deployment or after implementing and charging actual source-index construction. Do not report this as environment failure, experimental negative or a passed whole-player stage.
