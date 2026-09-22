<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Recovery windows rather than immediate clean-access assumptions

Full identity: `R150.recovery-windows-rather-than-immediate-clean-access-assumptions`.

Current decision: **inconclusive** (component test).

Actual periodic intra-refresh AVC source advertises exact_match=1/recovery_frame_cnt=8 at cuts30/60/90/120. Fresh showall software decoders expose wrong warmup pictures; all first permanent exact suffixes begin at offset8 and conservative admission at9 preserves every remaining picture. Immediate-admission falsifier fails. Nine alternating cold four-target jobs charge source reads, SEI/config parsing, temporary packet-prefix writing, fresh decode and target extraction against shortest ordinary IDR prefix: median9.92%slower, observed154.25%slower to60.17%faster; cost gate inconclusive. Closed independent subprocess owners; no native/browser recovery admission or shared persistent decoder claim.

Next action: Research profile complete at software component boundary. Reopen performance only for an applicable larger target window with a demonstrated full-job benefit; browser support is not implied.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Actual periodic intra-refresh AVC source advertises exact_match=1/recovery_frame_cnt=8 at cuts30/60/90/120. Fresh showall software decoders expose wrong warmup pictures; all first permanent exact suffixes begin at offset8 and conservative admission at9 preserves every remaining picture. Immediate-admission falsifier fails. Nine alternating cold four-target jobs charge source reads, SEI/config parsing, temporary packet-prefix writing, fresh decode and target extraction against shortest ordinary IDR prefix: median9.92%slower, observed154.25%slower to60.17%faster; cost gate inconclusive. Closed independent subprocess owners; no native/browser recovery admission or shared persistent decoder claim. |
| screen | passed | Actual periodic intra-refresh AVC source advertises exact_match=1/recovery_frame_cnt=8 at cuts30/60/90/120. Fresh showall software decoders expose wrong warmup pictures; all first permanent exact suffixes begin at offset8 and conservative admission at9 preserves every remaining picture. Immediate-admission falsifier fails. Nine alternating cold four-target jobs charge source reads, SEI/config parsing, temporary packet-prefix writing, fresh decode and target extraction against shortest ordinary IDR prefix: median9.92%slower, observed154.25%slower to60.17%faster; cost gate inconclusive. Closed independent subprocess owners; no native/browser recovery admission or shared persistent decoder claim. |
| correctness | passed | Actual periodic intra-refresh AVC source advertises exact_match=1/recovery_frame_cnt=8 at cuts30/60/90/120. Fresh showall software decoders expose wrong warmup pictures; all first permanent exact suffixes begin at offset8 and conservative admission at9 preserves every remaining picture. Immediate-admission falsifier fails. Nine alternating cold four-target jobs charge source reads, SEI/config parsing, temporary packet-prefix writing, fresh decode and target extraction against shortest ordinary IDR prefix: median9.92%slower, observed154.25%slower to60.17%faster; cost gate inconclusive. Closed independent subprocess owners; no native/browser recovery admission or shared persistent decoder claim. |
| performance | failed | Actual periodic intra-refresh AVC source advertises exact_match=1/recovery_frame_cnt=8 at cuts30/60/90/120. Fresh showall software decoders expose wrong warmup pictures; all first permanent exact suffixes begin at offset8 and conservative admission at9 preserves every remaining picture. Immediate-admission falsifier fails. Nine alternating cold four-target jobs charge source reads, SEI/config parsing, temporary packet-prefix writing, fresh decode and target extraction against shortest ordinary IDR prefix: median9.92%slower, observed154.25%slower to60.17%faster; cost gate inconclusive. Closed independent subprocess owners; no native/browser recovery admission or shared persistent decoder claim. |
| results | passed | Actual periodic intra-refresh AVC source advertises exact_match=1/recovery_frame_cnt=8 at cuts30/60/90/120. Fresh showall software decoders expose wrong warmup pictures; all first permanent exact suffixes begin at offset8 and conservative admission at9 preserves every remaining picture. Immediate-admission falsifier fails. Nine alternating cold four-target jobs charge source reads, SEI/config parsing, temporary packet-prefix writing, fresh decode and target extraction against shortest ordinary IDR prefix: median9.92%slower, observed154.25%slower to60.17%faster; cost gate inconclusive. Closed independent subprocess owners; no native/browser recovery admission or shared persistent decoder claim. |
| decision | passed | Actual periodic intra-refresh AVC source advertises exact_match=1/recovery_frame_cnt=8 at cuts30/60/90/120. Fresh showall software decoders expose wrong warmup pictures; all first permanent exact suffixes begin at offset8 and conservative admission at9 preserves every remaining picture. Immediate-admission falsifier fails. Nine alternating cold four-target jobs charge source reads, SEI/config parsing, temporary packet-prefix writing, fresh decode and target extraction against shortest ordinary IDR prefix: median9.92%slower, observed154.25%slower to60.17%faster; cost gate inconclusive. Closed independent subprocess owners; no native/browser recovery admission or shared persistent decoder claim. |

[New run](../../shared/runs/20260919T225103Z-recovery-window-qualification/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)

## Imported D01–D73 screening supplement

Existing decisions and stage gates above remain unchanged. These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D45 — A recovery point is not necessarily a native cold-start point**: stop/negative. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch09_D44-D47/demuxe_batch9/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.


## Screened-owner follow-up (20260921T030620Z-screened-owner-completion)

**D45 — retain_scoped_stop**: Stop the imported native cold-recovery profile: empty MSE coverage fails before output, despite host recoverability.

[Shared report](../../shared/runs/20260921T030620Z-screened-owner-completion/REPORT.md) · [Current item state](item.json) · [Append-only history](history.jsonl).
