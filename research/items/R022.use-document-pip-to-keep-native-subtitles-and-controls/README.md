<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Use Document PiP to keep Native subtitles and controls

Disposition: **pursue**. correctness: **passed**, performance: **not_applicable**.

Actual Chrome Document PiP with trusted click retains the same maintained native Player video, ASS worker, gain0.5, paused0.7s/rate1.25 and exact full video/ASS-mask hashes. No-activation request correctly throws NotAllowedError. Research custom control shell moves to actual PiP document: focus and volume0.3 work, old document pointer listener removed/new listener bound, video/overlay coordinates agree.640x360 resize then320x180 restore exactly restores the complete original ASS mask; close restores same owner, reopen/source replacement retires old video/canvas and renders different black source/new ASS; destroy while PiP open leaves zero workers and detached shell. Preserve initial harness ReferenceError and substantive second-resize failure: transferred original ResizeObserver stopped scheduling and left640x360 mask on320x180 video. Bounded research correction installs an observer from current owner document and invokes retained ASS invalidation hook; disconnect/rebind on transfer/source/destroy. No production edits. Native-direct ASS/gain and custom Player shell only; full custom-element global listeners, fullscreen, worker MSE and physical PiP geometry remain outside scope. Capability performance not applicable; no speed claim.

Next: Scoped native-direct custom Player shell capability passes. Integrating owner-document observer/control rebinding into maintained custom element or fullscreen/worker-MSE profiles requires separate validation.

[Current record](item.json) · [History](history.jsonl) · [Run analysis](evidence/20260919T225320Z-pip-owner-observer/analysis.md)

[Fixture provenance metadata amendment](../../shared/runs/20260919T230543Z-presentation-provenance-amendment/analysis.md); output and gate decisions unchanged.
