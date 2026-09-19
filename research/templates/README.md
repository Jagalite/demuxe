<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Starting an item or run

For an existing item, update its current state instead of replacing it with a
template. For a new item, create a full, collision-free key under `research/items/`,
copy `item.json` there, and write a README with the contract and next action.
Create an empty `history.jsonl` and `evidence/index.json` with the item key and an
empty `artifacts` list. Add the identity and path to `research/index.json`;
campaign membership is optional. Keep the migration snapshot unchanged.

Copy `run.json` and `manifest.json` into a new unique evidence run directory.
Replace every placeholder and capture actual commands/environment before executing
the candidate. Hash final artifacts only after files close. Do not invent missing
values or copy an older run's environment into a new observation.

For a performance run, link the passed correctness run and its manifest for the
same candidate/output contract. Record raw measurements and uncertainty. For a
non-performance screen, mark performance not applicable with a reason.

Append the completed decision to the item's `history.jsonl` with its run ID,
timestamp, evidence references and limits; update `item.json` and README together.
Historical index entries keep their paths and hashes. Add new run references
to the evidence index rather than replacing imported entries. The organization
verifier checks indexed artifact bytes; each run still needs its actual acceptance
checks and manifest validation before a stage is marked passed.
