<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Demuxe research

Start with the [item directory](ITEMS.md), using its full stable key. Each item
owns its definition, stages, current decision, history and evidence index.
The [identity index](index.json) covers all 433 records, including missing
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

[Progressive and reduced-decode preview research](campaigns/preview-research.md): imported native component screens, mapped to five existing owners with browser/provider qualification limits preserved.
