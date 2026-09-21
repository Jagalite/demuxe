# Local-agent master handoff

## Goal

Incorporate the screened D01–D73 findings into Demuxe's canonical `research/` system **without losing existing research history, negative results, or scope limits**.

## Import rules

1. Read the current `research/PROCESS.md`, `research/ITEMS.md`, and templates before changing research state.
2. Treat every D-label as external screening provenance, not as a requested R-number.
3. Search the current catalogue by mechanism, codec/container boundary, destination, and acceptance contract. If an existing R item covers the mechanism, append this evidence/subcase there rather than creating a duplicate.
4. Create a new canonical item only when the mechanism is materially distinct and no current item owns it.
5. Preserve the original report's exact distinction among: component feasibility, correctness, performance, whole-player qualification, and production integration. A playback pass is not a CPU/hardware-decoding result.
6. Preserve negative controls and failed variants. Several of the highest-value findings are stop decisions showing that a tempting transform is unnecessary or incorrect.
7. Keep source/destination specificity. Direct playback, MSE, Web Audio, image decoding, and Shaka are different destinations and may interpret the same media differently.
8. Re-run against the current maintained owner before promoting any result. Most screens were standalone harnesses against repository snapshots that changed during the campaign.
9. Do not infer zero-copy, hardware acceleration, memory savings, or energy savings from preserved payload bytes alone.
10. For overlapping mechanisms, prefer one canonical item with multiple evidence runs/subprofiles over proliferating closely related R-items.

## Suggested first-pass workflow

- **Pass A — catalogue reconciliation:** classify all 73 D-items as `merge_existing`, `new_candidate`, `regression_only`, `stop/negative`, or `needs_current-owner-retest`.
- **Pass B — evidence import:** copy useful manifests, scripts, controls, hashes, and reports from the original batch archive into the chosen canonical item's evidence/run directory. Keep the D-ID in provenance metadata.
- **Pass C — maintained-owner screen:** run the smallest current Demuxe path that owns the operation. If current code already handles it, record `already_implemented`/regression rather than adding another adapter.
- **Pass D — whole-player gate:** only for candidates with a real owner opportunity, run correctness/lifecycle first, then complete-cost CPU/startup/memory gates where the research process requires them.

## High-value clusters to reconcile first

These clusters repeatedly produced concrete admission/correctness results and are likely to map onto existing native-route owners:

- **AAC/configuration admission:** D01, D08, D20, D44, D46.
- **Container/remux/native routing:** D02, D09–D11, D14, D17, D36, D38, D60, D66, D72.
- **Image/animation native decode reuse:** D21, D25, D34, D39, D59, D67.
- **Audio component/native destination work:** D04, D23, D26, D32, D40, D42, D52, D57, D63–D65, D68–D69.
- **Presentation semantics:** D22, D49, D54, D70, D73.
- **Robustness/lifecycle:** D05, D12–D13, D18, D28, D53.

This ordering is only an ingestion convenience; it is not a claim that every item in those clusters should be implemented.

## Package layout

- `IDEA_INDEX.md` / `.csv` — all D01–D73 titles and batch provenance.
- `BATCH_MAP.md` — maps ID ranges to original archives and quick reports.
- `quick_docs/` — report + local-agent handoff for every batch.
- `original_batch_archives/` — the original evidence packages exactly as produced during screening. These are the authoritative batch artifacts when quick docs and extracted files differ.
- `extracted_evidence/` — convenient copies of evidence that remained materialized for later batches; not a replacement for the original archives.
- `MANIFEST.sha256` — package integrity manifest.

## Important campaign-wide interpretation

The campaign supports a strategy of **choosing the least expensive correct destination and doing the minimum transformation necessary to admit the requested semantics**. It does not establish that all transformed routes are near-native, hardware accelerated, or faster. Some screens intentionally found that no transform was needed, that an existing browser route already worked, or that a clever representation changed timing/fidelity and should be stopped.
