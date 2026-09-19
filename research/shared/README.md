<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Shared research assets

Existing assets retain their paths so historical commands and hashes remain valid.
Item evidence indexes point into these archives without duplicating captured media.

| Location | Role |
| --- | --- |
| [results/](../../results/) | Historical campaign captures, shared runs, fixtures, source snapshots and logs |
| [tests/](../../tests/) | Existing research harnesses and maintained regression tests |
| [fixtures/](../../fixtures/) | Existing fixture media, subtitle inputs and font assets/notices |
| [scripts/](../../scripts/) | Existing fixture generators, analysis, verification and build tooling |
| [experiments/](../../experiments/) | Existing research prototypes and historical experiments outside the numbered catalogue |
| `build/`, `web/engine-*` | Locally built runtime/toolchain assets; use the exact recorded manifests |
| [results/catalogue-current/](../../results/catalogue-current/) | Active unregistered follow-up at migration time; no final decision inferred |

Put new shared fixtures in `research/shared/fixtures/`, shared tools in
`research/shared/tooling/`, and genuinely shared runs in `research/shared/runs/`.
Create these directories when needed. Each shared run lists the full item keys
it serves; each item keeps its own applicability note and decision.

Existing reproduction commands and fixture generation records remain in each
campaign's README, command logs, manifests and harnesses. Linking a script does
not establish that it ran. Items without an explicitly recorded harness mapping
retain their evidence links rather than a guessed command.
