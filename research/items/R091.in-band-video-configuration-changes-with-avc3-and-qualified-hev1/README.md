<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# In-band video configuration changes with avc3, and qualified hev1

Current decision: **pursue**. Legal source-authored avc3 SPS/PPS epochs change 360p→720p→360p without a second initialization. Independent complete image/seek and continuous-playback checks pass. The declared fresh-owner workload shows10.87% median savings with95% bootstrap interval6.80–17.52%; this is a bounded browser component result, not general HEVC or maintained-route qualification.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | New executable probe and declared workload/controls registered with source/input/runtime evidence. |
| screen | passed | Legal source-authored avc3 SPS/PPS epochs change 360p→720p→360p without a second initialization. Independent complete image/seek and continuous-playback checks pass. The declared fresh-owner workload shows10.87% median savings with95% bootstrap interval6.80–17.52%; this is a bounded browser component result, not general HEVC or maintained-route qualification. |
| correctness | passed | Both fresh-init and in-band-only paths match all72 independent full-frame RGBA hashes/dimensions, five reverse/forward seek queries,71 continuous presented pictures, EOF and cleanup. Truthful same-profile AVC level3.1; actual SPS/PPS/IDR admission rejects a missing-configuration control before mutation. Delayed stale-generation publication is rejected before append. Unchanged AAC lane identity is observed but no PCM continuity claim; no hev1, open-GOP, arbitrary parameters or post-mutation rollback claim. |
| performance | passed | 11 predeclared alternating pairs;5% median saving gate passed at10.8734%, bootstrap95 median[6.7969,17.5184]%. Fresh MSE owner, byte slicing, append, three correct full-image seek queries and cleanup included; resident fixture/reference setup common and excluded. All timed images pass. Large first-pair and final-pair variance retained, no discarded samples. |
| results | passed | Actual new execution raw outcomes, controls and scoped interpretation retained. |
| decision | passed | pursue: Legal source-authored avc3 SPS/PPS epochs change 360p→720p→360p without a second initialization. Independent complete image/seek and continuous-playback checks pass. The declared fresh-owner workload shows10.87% median savings with95% bootstrap interval6.80–17.52%; this is a bounded browser component result, not general HEVC or maintained-route qualification. |

Next/reopen: Bounded AVC component worth pursuing. Reopen for maintained integration or independently scoped hev1 source/destination; preserve exact configuration admission and qualify real source replacement/audio separately before production.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)

## Imported D01–D73 screening supplement

Existing decisions and stage gates above remain unchanged. These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D27 — Configuration changes without an automatic player rebuild**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch05_D26-D30/demuxe_batch5/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).
- **D44 — Try an unchanged native destination before projecting sample descriptions**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch09_D44-D47/demuxe_batch9/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.


## Screened-owner follow-up (20260921T030620Z-screened-owner-completion)

**D27 — retain_scoped_stop**: Retain the observed configuration-transition witness failure; a repeated positive does not erase it. Maintained transition lifecycle and every-picture timing are still required.

**D44 — deferred_profile_followup**: Unchanged-source destination selection is preferable for the accepted multi-description profile. No new generic description projector is justified without a maintained-route failure.

[Shared report](../../shared/runs/20260921T030620Z-screened-owner-completion/REPORT.md) · [Current item state](item.json) · [Append-only history](history.jsonl).

## Ecosystem follow-up EB08

Evaluated at `20260922T131542Z-ecosystem-evaluation`: **deferred_until_trigger**. [Assessment](evidence/20260922T131542Z-ecosystem-evaluation/evaluation.json) · [Shared report](../../shared/runs/20260922T131542Z-ecosystem-evaluation/REPORT.md).

The remuxer inspects actual AAC packets when extradata is absent, prepares selected-track configuration before write_header, and rejects changed video extradata with a new-initialization requirement. That source ordering does not prove delayed browser-encoder or later dynamic reconfiguration support.

Next gate / reopening condition: When introducing a browser encoder, gate init on bounded first outputs of every selected track; test mismatched requested/actual config, a delayed track, cancellation and a later epoch before admission.

This scoped supplement does not broaden earlier correctness or performance qualification.
