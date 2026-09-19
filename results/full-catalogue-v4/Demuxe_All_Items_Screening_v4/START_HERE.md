# Demuxe — full-catalogue decision-first screening

**Version 4.0 · 19 September 2026 · Start with this file and AGENTS.md.**

## The assignment

Give **every research item** a bounded first-pass decision, working from the highest practical impact and easiest trustworthy decision downward. Do not stop after a 17-item shortlist. Do not turn first-pass screening into full implementation, statistical confirmation, cross-browser qualification or release testing.

A screen answers **“Is this worth further testing, not worth it for the stated profile, already present, blocked, or too expensive to investigate now?”** It does not need to produce a shippable feature.

## What is actually covered

| Coverage | Count / meaning |
|---|---|
| Legacy IDs accounted for | **R01–R366: all 366 slots** |
| IDs with a named, readable definition | **333** |
| Ranked source-defined mechanism records | **392**, because some IDs were reused for different ideas |
| Alternate source-identity records | **59**; never merge their verdicts by number |
| Missing-definition slots | **33**; explicit source-recovery tasks, not invented experiments |
| Included source documents | **60**; full recovered text/attachments with representation and hashes recorded |
| Carried-forward local screen findings | **7**, from the user's supplied follow-up, not independently rerun here |
| New media or Demuxe tests performed in packaging | **0** |

The missing definitions are **R76–R81, R247–R260, and R276–R288**. They remain visible in the coverage ledger. A bounded failed search can close their *source gate* as HOLD_SOURCE, but cannot count as a scientific test of the missing idea.

## Start the local agent

Give the agent the extracted package directory and the authorized Demuxe checkout. Tell it:

> Read AGENTS.md and follow version 4.0. Screen the complete catalogue, breadth-first within the ranked order. Reuse existing local evidence and setup. Make cheap per-item decisions and keep going. Do not enter survivor qualification in this campaign.

From the package root:

```sh
python3 tools/screening.py verify
python3 tools/screening.py status
python3 tools/screening.py next --limit 12
python3 tools/screening.py next --lane import --limit 12
python3 tools/screening.py next --lane source --limit 40
```

These commands inspect the package and its ledger. **They do not execute media tests or alter Demuxe.** Python 3.10+ and its standard library are sufficient for the supplied utility. The agent uses the existing repository harness for actual probes.

For one item:

```sh
python3 tools/screening.py show R343
python3 tools/screening.py template R343 > decision.json
# Edit decision.json, create/retain the actual evidence file(s), then:
python3 tools/screening.py record decision.json
```

Use the full stable key whenever an R-number is ambiguous. `show R242` intentionally rejects an ambiguous lookup; choose the report-A continuity record, report-C aspect-ratio record, or conversation proposal explicitly.

## Read only what the next decision needs

`catalogue/FULL_CATALOGUE.md` and `priority_queue.tsv` cover the entire named pool. Each `catalogue/cards/<key>.md` gives a source location, exact local source hash/line span, scope excerpt, metric, initial probe, adverse control and stop rule. The attached original source governs the mechanism; the generated brief is a screening aid.

`catalogue/ID_COVERAGE.md` prevents gaps from disappearing. `IDENTITY_CONFLICTS.md` explains reused IDs. `SOURCE_GAPS.md` separates absent definitions from absent raw evidence and from engineering prerequisites.

`protocol/SCREENING_PROTOCOL.md` is the effort limit. `protocol/PRIORITIZATION.md` defines the rank rubric. The handbook summarizes the complete operating model.

## Previously missing reports are now inside the package

- `sources/reports/R116-R131-report.md`: recovered text export; local digest recorded, not claimed to be an original raw-file digest.
- `sources/reports/R239-R246-report.md`: complete body, matching recorded original report SHA-256 `c1c8624957347a393ab1a531d368e9c676286cb5aa8aa4a3c14d616c32f2aa5a`.
- `sources/reports/R268-R275-report.md`: complete body, matching recorded original report SHA-256 `e745e617985ff8fadbe4c1bbb5d1db451aeb08ba1f378ba1a7d6398c4a13d37c`.

The latter two were reconstructed from authorized text exports by restoring the terminal newline and comparing with their existing verification records. The exact transformation is in `catalogue/source_register.json`; no report wording was rewritten. Those specific report-content gates need not remain blocked. **The original evidence TARs, all referenced raw runs and all fixture binaries are not included.** Their absence must not become a new requirement to download everything before a source/code screen.

## Authority and safety

This version replaces earlier 17-item/group-first execution instructions. Historical plans remain evidence, not competing directions. Preserve current repository security, fidelity, ownership, deployment and fallback guards. Do not publish, change licenses, broaden default routing, execute unknown source-provided scripts, or access protected folders just to make an item pass.

A serious reproducible defect can preempt the affected path. One unsupported source or backend must not halt unrelated ready work. See the scoped deep-preroll finding before treating every prior timeout as an unexplained baseline failure.
