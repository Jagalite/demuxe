<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Make streaming representation choices aware of complete-plan feasibility

Current decision: **blocked**. Actual maintained HLS selector chooses highest bandwidth under cap, honors an explicit rendition even above cap, and rejects missing explicit IDs. It does not consult plan feasibility; StreamingOptions explicitly specifies one session rendition, not automatic bitrate switching. The source-required existing adaptive controller and qualified R015 per-track transactional switch are not available. This is a verified implementation/setup prerequisite blocker, not a negative experiment on the proposed policy.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Required existing ABR/per-track transition implementation is absent; one-shot selector probe does not supply it. |
| screen | passed | Actual maintained HLS selector chooses highest bandwidth under cap, honors an explicit rendition even above cap, and rejects missing explicit IDs. It does not consult plan feasibility; StreamingOptions explicitly specifies one session rendition, not automatic bitrate switching. The source-required existing adaptive controller and qualified R015 per-track transactional switch are not available. This is a verified implementation/setup prerequisite blocker, not a negative experiment on the proposed policy. |
| correctness | blocked | No complete-plan-aware adaptive transition candidate ran. The existing one-shot selector probe confirms boundary only; it cannot qualify HDR/audio/subtitle preservation, playback fidelity or track invalidation. Missing ABR owner and R015 transactional prerequisite remain explicit. |
| performance | blocked | No relevant policy correctness candidate; no speed, energy or bandwidth advantage inferred from selector choices. No invented controller or expensive baseline. |
| results | passed | Actual new execution raw outcomes, controls and scoped interpretation retained. |
| decision | passed | blocked: Actual maintained HLS selector chooses highest bandwidth under cap, honors an explicit rendition even above cap, and rejects missing explicit IDs. It does not consult plan feasibility; StreamingOptions explicitly specifies one session rendition, not automatic bitrate switching. The source-required existing adaptive controller and qualified R015 per-track transactional switch are not available. This is a verified implementation/setup prerequisite blocker, not a negative experiment on the proposed policy. |

Next/reopen: Supply a qualified adaptive transition owner and transactional selected-track boundary, then compare equivalent-role renditions under explicit user intent and full output constraints. A static initial-plan selector would be a separately scoped component, not fulfillment of this source-defined ABR hypothesis.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
