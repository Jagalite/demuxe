<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Demuxe research

Start with the [item directory](ITEMS.md), using its full stable key. Each item
owns its definition, stages, current decision, history and evidence index.
The [identity index](index.json) covers all 439 records, including missing
definitions and distinct mechanisms with reused R-numbers.

The [current stage summary](STATUS.md) and [latest advancement campaign](campaigns/2026-09-19-stage-advancement.md) distinguish new execution from evidence reconciliation.

Read the [research process](PROCESS.md) for the seven stages: define, prepare,
screen, correctness, performance, results and decision. Use the
[item template](templates/item.json) and [run template](templates/run.json) for
new work. Existing item metadata is authoritative; do not rerun the import to
update an item.

Campaigns are selections of item homes:

- [Screened ideas D01–D73](campaigns/screened-ideas-d01-d73.md) — 73 imported screens, mapped by mechanism with original evidence and scoped retest gates.

- [Local screening](campaigns/local-screening.md)
- [Full catalogue v4](campaigns/full-catalogue-v4.md)
- [Full completion](campaigns/full-completion.md)
- [Top100](campaigns/top100.md)

For example, [R47 owned output buffers](items/R047.assemble-output-as-headers-plus-original-payload-views/README.md)
now has one home linking its prior findings, qualification and decision history.

Historical captured files keep their original paths under `results/`; current
item ownership is here. See the [shared inventory](shared/README.md) and
[migration record](migration.json). Active work under `results/catalogue-current`
has not been assigned a final decision by this import.

The [verification record](verification.json) records the migration checks and
their limits, including retained historical hash discrepancies.

Reports/data use CC BY 4.0; original independent tooling uses Apache 2.0.
Copied software and third-party media retain their own terms. See the licensing
section of the process before adding or exporting artifacts.

Bulky raw telemetry, media, screenshots and captured runtimes remain local.
The [local artifact inventory](shared/local-artifacts-20260922.json) records their
exact paths, sizes and SHA-256 values; `.gitignore` excludes those specific files.
Source, reports, manifests and compact evidence remain versioned. No remote
archive is implied: a fresh checkout needs the listed artifacts restored before
full historical verification or benchmark reproduction. See the
[commit validation record](shared/commit-validation-20260922.md) for the executed
checks and pre-existing evidence-reference failures.

[Prioritized D01–D73 owner follow-up](campaigns/screened-owner-completion.md): exact-output/cost results, retained lifecycle failures, and five new audio owners with pending gates. The source-import campaign remains a historical incorporation record.

[Progressive and reduced-decode preview research](campaigns/preview-research.md): imported native component screens, mapped to five existing owners with browser/provider qualification limits preserved.

Production decision: [R006 non-isolated remux](items/R006.offer-a-non-pthread-remux-path-without-isolation/README.md) and [R176 JSPI I/O](items/R176.jspi-backed-synchronous-wasm-i-o/README.md) are **Dropped / intentionally removed**. Maintenance complexity outweighs present production value. Advanced Wasm retains pthreads; browser-native paths remain usable without isolation. Revisit only on concrete deployment demand. Earlier evidence remains historical.

[Native production pipeline integration](shared/runs/20260921T203100Z-production-pipeline/analysis.md): R005, bounded R059 and R133 are integrated; R132 remains conditional; R162 existing repairs are requalified while the patch constructor is deferred. Measured regressions and release limits are retained.

New imported batches:

- [Focused batch 22: D86–D88](campaigns/focused-research-batch22.md) — component screens with original evidence, linked to existing owners.
- [Ecosystem expansion: EB01–EB22](campaigns/ecosystem-expansion-2026-09-21.md) — 22 proposals evaluated and integrated into 19 existing owners and 3 new homes; explicit follow-up and deferred gates are listed in the campaign.
