<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Research process

Every research item has one canonical home under `research/items/<full-key>/`.
Campaigns select items and record evaluations; they do not own a second current
decision. A full key includes the mechanism and any report branch. Never merge
two mechanisms because both were called R131 or R242.

The purpose of research is to make an evidence-backed decision at the requested
depth. A useful negative, prerequisite block, or source-only screen can finish
an investigation. A research decision is separate from production integration
and release qualification.

## Layout and ownership

```text
research/
  README.md
  PROCESS.md
  index.json
  items/<full-key>/
    README.md                 # Human-readable contract, status and next action
    item.json                 # Current definition, stages and decision
    history.jsonl             # Append-only decisions, including original records
    tests/                    # Create when this item needs its own harness
    fixtures/                 # Create for item-specific generated inputs + notices
    evidence/
      index.json              # Historical artifact references and SHA-256 values
      <UTC-run-id>/
        run.json              # Stage, commands, environment and outcome
        manifest.json         # Input, source, runtime and output hashes/licenses
        commands.log
        results.json
        analysis.md
  shared/
    README.md                 # Shared fixture/tooling/archive inventory
    fixtures/                 # New fixtures reused by multiple items
    tooling/                  # New shared research helpers
    runs/<UTC-run-id>/         # Experiments genuinely shared by multiple items
  campaigns/<campaign>.json   # Membership and original ledger reference
  campaigns/<campaign>.md    # Links to item homes
  templates/                 # Starting records for new items/runs
```

Create optional directories only when there is content. Run IDs should include
UTC date/time and a short variant name. Keep baseline and candidate outputs in
the same run, or reference their immutable manifests. Shared runs list all
applicable full keys; each item explains its own applicability and decision.
Store large shared inputs once, using path and hash references.

`src/`, `web/`, and `native/` remain production/integration directories. Research
does not change default routing or shipping behavior implicitly. If a successful
idea becomes a production change, link that change and its validation from the
item. Move lasting regression tests into the maintained test suite deliberately.

## The seven stages

Each stage in `item.json` has `status`, `basis`, and `evidence`. Allowed statuses
are `pending`, `passed`, `failed`, `blocked`, and `not_applicable`. Describe the
exact gate being passed: screening completed is not candidate output passed.
An unavailable prerequisite is blocked, not an experimental failure.

| Stage | Required work | Exit evidence |
| --- | --- | --- |
| 1. Define | State the hypothesis, scope, input/output contract, opportunity, cheapest correct baseline, falsifier, success/stop criteria, and allowed effort. Identify the exact source definition. | A reviewable contract; missing definitions block dependent work. |
| 2. Prepare | Identify or generate fixtures, independent reference outputs, adverse controls, toolchain/runtime assets, exact commands, and source/fixture hashes and licenses. Charge setup costs relevant to the claim. | A reproducible setup and known reference; a successful build alone does not establish correctness. |
| 3. Screen | Run the cheapest faithful source review, prerequisite probe, component test, or actual-route experiment that can change the decision. Confirm whether the candidate ran and whether fallback occurred. | A scoped feasibility/opportunity finding, with the evidence level and next uncertainty. A reasoned stop can end here. |
| 4. Correctness | Compare required pictures/audio/subtitles/timing against an independent oracle. Include a relevant wrong-output control, cleanup, and affected seek/cancel/source-change/lifecycle behavior. State what is outside the tested profile. | Actual execution and output fidelity evidence for the candidate and baseline. An API availability query cannot pass this gate. |
| 5. Performance | Only after relevant correctness passes, compare equivalent work under a predeclared workload, metric, threshold and sampling method. Include cold setup, retention, transfer, fallback and teardown costs when applicable. | Raw measurements, controls, analysis and uncertainty. Separate copy counts, CPU, latency, memory, hardware use and physical energy. |
| 6. Results | Capture positive and negative runs, identities, commands, expected failures, measurements, uncertainty, observations and limitations. Preserve meaningful failed variants. | Immutable run outputs with manifests and a concise interpretation. Recording a result is not asserting it is positive. |
| 7. Decision | Choose a disposition, state its scope and rationale, and specify the next test or reopening condition. Link the exact runs used. | An appended decision and updated current state. Integration and qualification remain separate. |

These are gates, not a requirement to execute seven experiments. A source screen
that finds no relevant opportunity can stop before preparing new fixtures.
Record later stages as not applicable with the reason. A blocked setup leaves
dependent stages blocked or pending. Do not force a benchmark onto a capability
or fidelity investigation with no performance claim. Use the effort limit in the
item/campaign rather than introducing a global percentage or endurance threshold.

## Decisions and evidence levels

Use `pursue`, `stop_current_profile`, `already_implemented`, `inconclusive`, or
`blocked` for new normalized dispositions. Explicit user-directed permanent source closures use
`closed_source_unavailable`; these are administrative closures, counted separately
from concluded research and experimental negatives. Add the precise blocker category
(definition, fixture, setup, environment) where relevant. Retain the original
decision vocabulary verbatim in historical imports; do not reinterpret its scope.
An optional regression-only recommendation must say so explicitly.

Evidence levels distinguish source review, prerequisite probe, component test,
actual-route screen, imported measurement, and user-reported evidence. An imported
result is not a new execution. Every decision should record:

- Full item key, run IDs, stage, decision date, and exact tested profile.
- Observed result and evidence level; whether the candidate ran or fell back.
- Output contract, controls, errors and exclusions.
- Measurement units, uncertainty, threshold and all included/excluded costs.
- Rationale, next action, and a concrete condition for reopening a stop or block.

Update `item.json` and its README together, append the complete decision to
`history.jsonl`, and register new evidence. Never replace the old record just
because a newer run has a different result. A source or environment change can
require a new qualification run without invalidating the old scoped observation.

## Fixtures, commands and reproducibility

Record the generator and arguments, input provenance, content hashes, license,
and independent oracle. Synthetic and third-party fixtures must be distinguishable.
Preserve source media. Record transformations such as cropping, remuxing, scaling,
gain edits or intentional corruption. An adverse fixture must describe the
expected rejection or wrong-output signal.

Run commands from their documented working directory. Existing harnesses often
write fixed `results/` paths: inspect them before running, and add an explicit
output directory when adapting one for a new run. Do not assume all legacy
harnesses honor `RESULT_ROOT`. Never overwrite a historical canonical result to
populate a new item run. Record exact source revision and dirty diff, engine and
fixture identities, browser/device versions, environment flags and command exits.
Do not treat a fixture prepared by host FFmpeg as execution of the Wasm decoder.

## Licensing

Research is an organizational boundary, not a single license grant:

- Original reports, documentation and result data: CC BY 4.0.
- Original independent research/test tooling: Apache 2.0.
- Player/engine integrations and copied source: their existing software licenses.
- Upstream code, fonts, movies, images and archives: retained component notices.

Put an SPDX header on new code and reports where the format allows it. Record
license/provenance alongside binary fixtures and hash-sensitive data. Do not add
headers to captured evidence whose bytes are already hashed. A copied source file
retains its notice; place snapshots in a named `snapshots/` directory and identify
the original path/revision. Unknown rights must be marked `NOASSERTION` with a
provenance follow-up, never automatically relabeled Apache or Creative Commons.

The repository boundary map must agree with the actual notices. New independent
tooling gets a specific rule; a generic research fallback preserves existing terms.
Consult [project licensing](../docs/LICENSING.md) and
[media notices](../docs/MEDIA-NOTICES.md), including the separate BBB CC BY 3.0
and font notices. A standalone export needs its referenced evidence, notices and
license texts; an item folder containing archive links is not a self-contained
distribution.

## Migration and historical evidence

The initial import establishes homes for all 425 catalogue records, including
33 missing definitions. It includes decision history from local screening, the
full v4 catalogue, full completion, and top100. Later campaign dispositions take
precedence in that order, with ledger append order retained within a campaign.
The original definition/contract remains visible even when a later run refines it.
Read the latest result before reusing the original screening plan.

Historical evidence stays in `results/`; existing harnesses remain in `tests/`,
and existing fixtures, build/runtime assets and prototypes keep their paths.
The item evidence indexes make those shared archives reachable by full key.
This avoids changing recorded bytes, relative imports, command paths and manifests.
It is a reorganization of item ownership and navigation, not a rewrite of old runs.
Older unrelated experiments remain in the shared archive until their identities
are explicitly mapped; do not force them into an R-number from a filename guess.

Imported preparation/correctness/performance stages start pending reconciliation.
That does not revoke a recorded qualification or require repeating it. Populate
the acceptance record from the cited evidence when the item is next worked on.
Definitions, recorded screening, indexed results and recorded decisions have
separate, explicit import-only gate descriptions.

`migration.json` captures the imported sources, artifact bytes and any historical
hash mismatches. A historical mismatch means an earlier declared hash no longer
matches the retained file; keep both identities and do not present that earlier
run as independently verified. The import does not repair or hide such history.
Unfinished `results/catalogue-current` work is intentionally not promoted into a
decision; its owner should register its finished runs under the appropriate full
keys. The migration is one-shot and refuses to overwrite existing item homes.

From the repository root, verify organization and licensing with:

```sh
python3 scripts/research.py verify
python3 scripts/check-licenses.py
```

The first command checks imported identity, records and byte preservation. It
does not run media tests or declare hypotheses correct. Historical campaign
verifiers may rewrite manifests or assert an unchanged full checkout diff; inspect
them before using them after unrelated source changes. New run acceptance must
be verified against its own manifest and declared correctness/performance gates.
