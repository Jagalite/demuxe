<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Use verbatim FLAC as a lightweight integer-PCM carrier

Full identity: `R102.use-verbatim-flac-as-a-lightweight-integer-pcm-carrier`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

The existing producer uses general FFmpeg FLAC encoding and compatible packet muxing; a true verbatim formatter is a new bitstream component. The historical host advantage includes executable differences and can multiply output bytes almost sevenfold.

Next action: Build one isolated S16 mono/stereo verbatim formatter with valid CRC/frame metadata, compare exact PCM and same-duration level0/5 output including total bytes and decoder work.

## Definition and contract

Type: New transport construction. Priority: P1. Question. Can an integer-PCM producer reach the native FLAC destination with a much simpler formatter than a general compressor? What differs from earlier work. R71 changed FLAC encoder effort and R74 removed a staging copy. This deliberately bypasses compression search, while still writing a standards-conforming FLAC stream. Mechanism. PCM -> verbatim FLAC subframes + frame headers/checksums -> qualified FLAC container -> browser audio decoder. This is still encoding/framing, but no predictor search or Rice residual coding is needed for verbatim subframes. Initial source profile. Start with 48 kHz mono/stereo S16. Add S24 only as a separately verified format; do not silently quantize float PCM.

Output contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Primary metric: Correct additional admitted source/destination capability; otherwise full startup and CPU/resource cost.

Adverse control: Alter one admission-critical configuration, remove a required dependency, or preserve video while making selected audio unsupported. Candidate must reject or use a declared fallback.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| performance | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Historical decision imported verbatim: DEFER_SETUP. No integration or qualification inferred. |

Pending preparation/correctness/performance means the historical evidence has not
been converted into a stage acceptance record; it does not erase historical passes
or require rerunning them. Read the evidence before updating these fields.

## Working files

- [Item state and original definition](item.json): authoritative current metadata; update this README when changing it.
- [Decision history](history.jsonl): imported records and their exact ledger locations; append future decisions.
- [Evidence index](evidence/index.json): paths, hashes, and historical hash declarations.
- [Research process](../../PROCESS.md): run layout, gates, fixture and license requirements.

Create `tests/` and `fixtures/` only when this item needs its own code or data.
Shared historical harnesses remain in `tests/` at repository root; commands and
fixture references are in the linked evidence. No unverified harness-to-item
association was invented during migration.

## Archived evidence and definitions

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R102.use-verbatim-flac-as-a-lightweight-integer-pcm-carrier.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R102.use-verbatim-flac-as-a-lightweight-integer-pcm-carrier.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R102-R115-research-backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R102-R115-research-backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R102.use-verbatim-flac-as-a-lightweight-integer-pcm-carrier.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R102.use-verbatim-flac-as-a-lightweight-integer-pcm-carrier.md)
