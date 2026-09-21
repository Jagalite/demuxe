<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Expose an edited MP4 as a virtual byte-range URL

Full identity: `R109.expose-an-edited-mp4-as-a-virtual-byte-range-url`.

Current decision: **stop_current_profile** (actual-route screen).

Actual finite closed-GOP video-only2s–4s virtual MP4 uses1045header bytes plus48source-range extents for39504logical bytes. Authored sample tables,48full independent host pictures, native forward/back target hashes, cross-boundary reads, changed source and real in-flight HTTP cancellation all pass. Five alternating native owners including cold index/source identity and preparation fail5%cost gate: median10.18%slower (observed4.90–16.98%slower). No media bytes materialized by virtual server; validation copy is independently retained, not served. Audio joins and multi-edit lists excluded.

Next action: Reopen only for larger/repeated edited-source workloads with observed materialization cost; preserve video-only ownership and source identity contract.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Actual finite closed-GOP video-only2s–4s virtual MP4 uses1045header bytes plus48source-range extents for39504logical bytes. Authored sample tables,48full independent host pictures, native forward/back target hashes, cross-boundary reads, changed source and real in-flight HTTP cancellation all pass. Five alternating native owners including cold index/source identity and preparation fail5%cost gate: median10.18%slower (observed4.90–16.98%slower). No media bytes materialized by virtual server; validation copy is independently retained, not served. Audio joins and multi-edit lists excluded. |
| screen | passed | Actual finite closed-GOP video-only2s–4s virtual MP4 uses1045header bytes plus48source-range extents for39504logical bytes. Authored sample tables,48full independent host pictures, native forward/back target hashes, cross-boundary reads, changed source and real in-flight HTTP cancellation all pass. Five alternating native owners including cold index/source identity and preparation fail5%cost gate: median10.18%slower (observed4.90–16.98%slower). No media bytes materialized by virtual server; validation copy is independently retained, not served. Audio joins and multi-edit lists excluded. |
| correctness | passed | Actual finite closed-GOP video-only2s–4s virtual MP4 uses1045header bytes plus48source-range extents for39504logical bytes. Authored sample tables,48full independent host pictures, native forward/back target hashes, cross-boundary reads, changed source and real in-flight HTTP cancellation all pass. Five alternating native owners including cold index/source identity and preparation fail5%cost gate: median10.18%slower (observed4.90–16.98%slower). No media bytes materialized by virtual server; validation copy is independently retained, not served. Audio joins and multi-edit lists excluded. |
| performance | failed | Actual finite closed-GOP video-only2s–4s virtual MP4 uses1045header bytes plus48source-range extents for39504logical bytes. Authored sample tables,48full independent host pictures, native forward/back target hashes, cross-boundary reads, changed source and real in-flight HTTP cancellation all pass. Five alternating native owners including cold index/source identity and preparation fail5%cost gate: median10.18%slower (observed4.90–16.98%slower). No media bytes materialized by virtual server; validation copy is independently retained, not served. Audio joins and multi-edit lists excluded. |
| results | passed | Actual finite closed-GOP video-only2s–4s virtual MP4 uses1045header bytes plus48source-range extents for39504logical bytes. Authored sample tables,48full independent host pictures, native forward/back target hashes, cross-boundary reads, changed source and real in-flight HTTP cancellation all pass. Five alternating native owners including cold index/source identity and preparation fail5%cost gate: median10.18%slower (observed4.90–16.98%slower). No media bytes materialized by virtual server; validation copy is independently retained, not served. Audio joins and multi-edit lists excluded. |
| decision | passed | Actual finite closed-GOP video-only2s–4s virtual MP4 uses1045header bytes plus48source-range extents for39504logical bytes. Authored sample tables,48full independent host pictures, native forward/back target hashes, cross-boundary reads, changed source and real in-flight HTTP cancellation all pass. Five alternating native owners including cold index/source identity and preparation fail5%cost gate: median10.18%slower (observed4.90–16.98%slower). No media bytes materialized by virtual server; validation copy is independently retained, not served. Audio joins and multi-edit lists excluded. |

[New run](../../shared/runs/20260919T224243Z-virtual-edit-qualification/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)

## Imported D01–D73 screening supplement

Existing decisions and stage gates above remain unchanged. These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D33 — Can finite MP4 edit metadata express exact audio excerpts?**: stop/negative. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch06_D31-D35/demuxe_batch6/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).
- **D36 — Author a source-indexed edited MP4, then leave playback to the browser**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch07_D36-D39/demuxe_batch7/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.
