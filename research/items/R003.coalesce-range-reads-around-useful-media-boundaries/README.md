<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Coalesce range reads around useful media boundaries

Full identity: `R003.coalesce-range-reads-around-useful-media-boundaries`.

Current decision: **pursue** (actual-browser-policy-and-complete-work-count-comparison).

All actual AVIO read buffers SHA256-exact against source slices;8 independent paused full-frame references exact for each policy, forward/back seek, changed-source rejection and worker cleanup pass. Continuous callback oracle mismatch also affected baseline and is preserved as failed measurement, corrected to stable paused within-frame comparison. 128KiB sequential range window reduces median requests by41.89percent; worst paired fetched-byte increase25.76percent, within predeclared30percent budget inall5pairs. 256KiB prior variant exceeded budget in2pairs and remains recorded. Includes cold player/reader creation and actual distantseek; cost is requests/bytes, not CPU or network speed. License-only correction: source-derived snapshots are GPL-3.0-or-later, as their preserved headers say; earlier manifest GPL-2.0-or-later metadata was incorrect.

Next action: Scoped research gate complete. Production integration and broader workload qualification remain separate.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Historical fixture/runtime setup and actual outputs reconciled; latest declared artifact hashes match. No new setup or execution. |
| screen | passed | Historical outcome retained and individually reconciled. Adaptive read window reduces requests 73→24 while fetched bytes rise 4784128→5701632; real output progress, distant seek, source identity rejection and cleanup recorded. No full independent decoded-output comparison or abandoned-byte performance protocol. |
| correctness | passed | All actual AVIO read buffers SHA256-exact against source slices;8 independent paused full-frame references exact for each policy, forward/back seek, changed-source rejection and worker cleanup pass. Continuous callback oracle mismatch also affected baseline and is preserved as failed measurement, corrected to stable paused within-frame comparison. |
| performance | passed | 128KiB sequential range window reduces median requests by41.89percent; worst paired fetched-byte increase25.76percent, within predeclared30percent budget inall5pairs. 256KiB prior variant exceeded budget in2pairs and remains recorded. Includes cold player/reader creation and actual distantseek; cost is requests/bytes, not CPU or network speed. |
| results | passed | All actual AVIO read buffers SHA256-exact against source slices;8 independent paused full-frame references exact for each policy, forward/back seek, changed-source rejection and worker cleanup pass. Continuous callback oracle mismatch also affected baseline and is preserved as failed measurement, corrected to stable paused within-frame comparison. 128KiB sequential range window reduces median requests by41.89percent; worst paired fetched-byte increase25.76percent, within predeclared30percent budget inall5pairs. 256KiB prior variant exceeded budget in2pairs and remains recorded. Includes cold player/reader creation and actual distantseek; cost is requests/bytes, not CPU or network speed. License-only correction: source-derived snapshots are GPL-3.0-or-later, as their preserved headers say; earlier manifest GPL-2.0-or-later metadata was incorrect. |
| decision | passed | All actual AVIO read buffers SHA256-exact against source slices;8 independent paused full-frame references exact for each policy, forward/back seek, changed-source rejection and worker cleanup pass. Continuous callback oracle mismatch also affected baseline and is preserved as failed measurement, corrected to stable paused within-frame comparison. 128KiB sequential range window reduces median requests by41.89percent; worst paired fetched-byte increase25.76percent, within predeclared30percent budget inall5pairs. 256KiB prior variant exceeded budget in2pairs and remains recorded. Includes cold player/reader creation and actual distantseek; cost is requests/bytes, not CPU or network speed. License-only correction: source-derived snapshots are GPL-3.0-or-later, as their preserved headers say; earlier manifest GPL-2.0-or-later metadata was incorrect. |

[New run](../../shared/runs/20260919T212800Z-policy-license-correction/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
