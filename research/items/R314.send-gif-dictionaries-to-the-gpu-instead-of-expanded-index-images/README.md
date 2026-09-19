<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Send GIF dictionaries to the GPU instead of expanded index images

Full identity: `R314.send-gif-dictionaries-to-the-gpu-instead-of-expanded-index-images`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

Historical per-phrase descriptors already exceed complete index bytes by 29.7% before dictionary traffic. Current rendering has no GIF dictionary job consumer. GPU availability does not rescue the failed initial layout economics without a separately specified coarser executor.

Next action: Reopen only for coarser job aggregation with credible total traffic savings; compare optimized/native decode before building full GPU path.

## Definition and contract

Mechanism. Let a CPU/Wasm parser read GIF LZW codes and construct immutable dictionary nodes containing a parent, final palette index, phrase length, and first index. Emit bounded jobs specifying dictionary node, dictionary generation, output position, and length. Expand independent phrases on the GPU, then apply the palette and image composition. A first implementation may use one GPU invocation per phrase, writing the phrase in reverse while following its parent chain. Source basis. GIF specifies variable-width LZW codes, clear codes, end codes, and deferred clearing of a full dictionary. FFmpeg's decoder explicitly stores prefix/suffix arrays and expands codes through a stack. Those are the existing stages being divided differently. [S3, S4]

Output contract: Exact integer planes or an explicitly defined numerical/altered-output contract; compare the final requested region and later references where relevant.

Primary metric: Complete decode/process/present cost, transfers, command work or peak live storage for identical requested output.

Adverse control: Change stride, crop, phase, alpha, edge neighborhood or resource generation; exercise a case where the proposed shortcut is ineligible.

## Current stage reconciliation

**stop_current_profile** — retained source decision, no new experiment. [Run](../../shared/runs/20260919T200619Z-source-stage-reconciliation/run.json).

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | not_applicable | This investigation ended at a source-only stop_current_profile decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | not_applicable | This investigation ended at a source-only stop_current_profile decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| performance | not_applicable | This investigation ended at a source-only stop_current_profile decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Prior scoped decision reconciled into the current checklist: stop_current_profile |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R314.send-gif-dictionaries-to-the-gpu-instead-of-expanded-index-images.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R314.send-gif-dictionaries-to-the-gpu-instead-of-expanded-index-images.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R313_R317_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R313_R317_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R314.send-gif-dictionaries-to-the-gpu-instead-of-expanded-index-images.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R314.send-gif-dictionaries-to-the-gpu-instead-of-expanded-index-images.md)
