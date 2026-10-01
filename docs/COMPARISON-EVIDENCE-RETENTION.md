# Comparison evidence retention

This documentation checkpoint preserves the reports and source snapshots for the
30 newly referenced comparison campaigns in README rows 63–80, plus the
non-isolated renderer prerequisite research record.

Campaign manifests describe the complete original local captures. Git's existing
ignore rules omit screenshots (`*.png`) and request traces (`requests.jsonl`).
Those files remain local; their recorded hashes are retained in the manifests.
A fresh checkout therefore contains a partial artifact archive and cannot verify
every original manifest entry without obtaining the omitted captures. Numerical
results and recorded failures remain available in the committed JSON reports.

Before this checkpoint, all 1,808 artifact hashes in the selected comparison
campaigns and 35 research source snapshots were checked against local files.
This is archival integrity evidence, not a fresh playback or performance run.
Recorded fixture/build/browser scopes and CPU, fidelity and release limitations
remain in [row results](README-BACKLOG-RESULTS.md) and the
[testing backlog](README-TESTING-BACKLOG.md). Unreferenced intermediate campaigns
and generated runtime binaries are excluded from this checkpoint.
