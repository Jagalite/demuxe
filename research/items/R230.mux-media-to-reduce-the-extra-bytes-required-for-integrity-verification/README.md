<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Mux media to reduce the extra bytes required for integrity verification

Current decision: **stop_current_profile**. Legal fMP4 free-box padding aligns the second4s A/V fragment to a16KiB authenticated leaf boundary. New file/root identities verified; every packet timing/payload and decoded A/V frame hash matches ordinary layout.5236B padding is1.66%, within2% budget, but actual authenticated bytes across cold startup+distant seek fall only3.20%, below5% gate. Stop this layout profile; no invented CPU or network saving.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | New executable probe and declared workload/controls registered with source/input/runtime evidence. |
| screen | passed | Legal fMP4 free-box padding aligns the second4s A/V fragment to a16KiB authenticated leaf boundary. New file/root identities verified; every packet timing/payload and decoded A/V frame hash matches ordinary layout.5236B padding is1.66%, within2% budget, but actual authenticated bytes across cold startup+distant seek fall only3.20%, below5% gate. Stop this layout profile; no invented CPU or network saving. |
| correctness | passed | Independent FFprobe packet timing/flags/SHA256 and complete FFmpeg A/V framemd5 sequences exact. Both prepared layouts omit original absolute mfra index, avoiding stale references. Actual file-root Merkle proofs verify all required16KiB leaves; altered source fails its pinned root. Host mux/verified-byte component, not browser or torrent protocol qualification. |
| performance | failed | Deterministic exact-byte gate: two cold verified reads cover init+startup group and init+distant group, unique leaf indices counted per job including final partial leaf. Candidate padding1.661% passes2%; authenticated bytes save3.204% fails5%. No statistical interval needed for exact byte count, and no latency benchmark admitted after gate failure. |
| results | passed | Actual new execution raw outcomes, controls and scoped interpretation retained. |
| decision | passed | stop_current_profile: Legal fMP4 free-box padding aligns the second4s A/V fragment to a16KiB authenticated leaf boundary. New file/root identities verified; every packet timing/payload and decoded A/V frame hash matches ordinary layout.5236B padding is1.66%, within2% budget, but actual authenticated bytes across cold startup+distant seek fall only3.20%, below5% gate. Stop this layout profile; no invented CPU or network saving. |

Next/reopen: Reopen with a concrete media layout and seek distribution where authenticated-leaf overfetch exceeds this bounded padding cost. Preserve ordinary interleaving when no material verification-unit reduction exists.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
