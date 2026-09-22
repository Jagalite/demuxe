<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Turn abbreviated JPEG transport frames into browser-decodable images

Disposition: **pursue**. correctness: **passed**, performance: **not_applicable**.

Implemented truthful header reconstruction from18 actual RFC2435 RTP/JPEG packets emitted by installed FFmpeg from the genuineAVI1 camera frame. The bounded adapter requires one source/timestamp, type0/1 progressive geometry, explicit128-byte8bit quantization tables, contiguous fragment offsets andonefinalmarker; missingfragment/tables andchangedgeometry reject. It reconstructs SOF/DQT/defaultHuffman/SOS while preserving compressed entropy SHA exactly. Original camera packet had one zero wrapperpadding byte afterEOI; an initial comparison wronglycounted itasentropy, preserved failure, then onecorrection bounds scan attrueEOI and verifieszero padding. Independent FFmpeg original/reconstructed fullRGBA are identical; actualbrowser reconstructed JPEG pixels exactlymatch the separately normalized original JPEG. Browser-versus-FFmpeg color differences remain present and the R063 strictdecoderreplacement failure remainsunchanged: this gate verifies header equivalence within each decoder, not a new crossdecoder fidelityclaim. Actual oldepoch imagepromise closeslatebitmap, malformedimage rejects, allthreecreatedbitmapsclose; transporttimestampmetadata preserved, no independentAVclock. This is additional admitted-input capability, no performance cost-reduction hypothesis.

Next: Scoped truthful RTP/JPEG header capability verified. Preserve explicit quantization/completeness/source identity, unchangedentropy and existingdecodercolor limits. Restartmarkers/implicitquantization/othergeometry/streamtiming require separate contracts before admission.

[Current record](item.json) · [History](history.jsonl) · [Run analysis](evidence/20260919T223355Z-rtp-eoi-boundary/analysis.md)

## Imported D01–D73 screening supplement

Existing decisions and stage gates above remain unchanged. These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D21 — Source-bound reconstruction of abbreviated JPEG frames**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch04_D21-D25/demuxe_batch4/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).
- **D59 — Native JPEG decoding for restricted TIFF pages and regions**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch13_D59-D61/demuxe_batch13/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.


## Screened-owner follow-up (20260921T030620Z-screened-owner-completion)

**D21 — deferred_profile_followup**: Defer timed abbreviated-JPEG ownership until a real source/configuration/epoch consumer is defined; native image decoding alone does not implement MJPEG playback.

**D59 — deferred_profile_followup**: TIFF pages/regions are a new image capability; current getFrame API does not define page/strip/orientation ownership. Keep wrong-table/strip controls and require a real consumer.

[Shared report](../../shared/runs/20260921T030620Z-screened-owner-completion/REPORT.md) · [Current item state](item.json) · [Append-only history](history.jsonl).
