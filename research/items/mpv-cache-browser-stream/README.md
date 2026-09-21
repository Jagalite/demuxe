<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# mpv cache over Demuxe's browser stream bridge

**Completed bounded investigation: mpv cache looks promising for Hybrid/Software.**
The original experiment changed no production routing or defaults. Read the [short report](REPORT.md) and
[measurement qualifications](METHOD-NOTES.md) before reusing individual numbers.

**Implementation follow-up:** the subsequent user-authorized automatic buffering
API enables balanced 32/8 MiB caching locally. See the [fresh validation report](../../../docs/BUFFERING-VALIDATION.md)
and [run index](../../../results/buffering/summary/index.json); release qualification
remains incomplete. Historical results below are unchanged.

- [Predeclared experiment](PLAN.md)
- [Current stage and decision record](item.json)
- [Fixture identities and commands](fixtures/manifest.json)
- [Evidence index](evidence/index.json)
- [Full derived metrics](evidence/metrics.json)
- [Exact run commands and environment](evidence/runs.json)
- [Licenses and media attribution](NOTICES.md)

The baseline and candidate use the same frozen `runtime/` and source bytes.
Initial candidate: `cache=yes`; retain 32 MiB forward and 8 MiB backward packet
budgets and every other engine/decoder/presentation option. Source-cache bytes,
demux packets and timeline ranges, decoded frames, audio queue, Wasm committed
memory, and Chrome process RSS are accounted for separately.

From repository root, fixture preparation is reproducible with
`python3 research/items/mpv-cache-browser-stream/tests/prepare.py` after placing
the archive from `fixtures/manifest.json` at `fixtures/bbb-source.zip` in this item.
The script retains existing inputs and creates a runtime snapshot once.
Do not reuse a runtime snapshot as evidence for a later changed checkout.

The corrected `run-v2.mjs` runner accepts `stage run-id selection [correctness-directory]`. A new run ID
is mandatory; it refuses to overwrite a run directory. `selection` is `all`, a
fixture name, or comma-separated trial IDs. For example:

```sh
node research/items/mpv-cache-browser-stream/tests/run-v2.mjs correctness NEW-UTC-ID all
node research/items/mpv-cache-browser-stream/tests/run-v2.mjs performance NEW-UTC-ID all PATH-TO-CORRECTNESS-RUN
python3 research/items/mpv-cache-browser-stream/tests/analyze.py PATH-TO-RUN > NEW-METRICS.json
python3 research/items/mpv-cache-browser-stream/tests/verify.py
```

Use `CACHE_TUNED=1` for the two high-bitrate 24/16 MiB candidates, and
`CACHE_AUTO=1` with `screen NEW-UTC-ID h264-hybrid-auto` for the auto probe.
`cold NEW-UTC-ID h264,high PATH-TO-CORRECTNESS-RUN` starts media at 1.05× bitrate;
`rate NEW-UTC-ID high PATH-TO-CORRECTNESS-RUN` exercises 2× playback. Correctness
includes independent 10/30 s images/audio and three presentation-confirmed seeks.
Performance runs require matching passing configuration and runtime/fixture/page/
server identities. For a new runtime or fixture, create a separate item/run
snapshot and repeat correctness; do not combine old proof with changed assets.
The final runner enforces these identities. To replay older records exactly,
restore their archived harness files in a separate lab copy; older proof records
without the final identity fields are deliberately rejected by the current runner.

`verify.py` checks media, runtime and all raw run hashes. Original manifests that
named mutable source paths resolve to preserved content-addressed source bytes
under `evidence/harness-snapshots/`. This preserves old manifests without silently
rewriting their recorded source identity. Run IDs are labels; use recorded
`started`/`finished` fields for actual execution times.

Run media tests serially, with no competing fixture generation/builds. Preserve
unrelated user processes and record them. Chromium automation uses Playwright
with installed stable Chrome, a fresh temporary profile per trial, and headed
640x360 output. Browser backend measurement excludes the router, probes and UI.

The first observer used seek acknowledgement instead of completed presentation,
and Software's idle render could be counted as a first frame. Those raw values
remain archived. Use corrected `qualifiedSourceFrame` metrics and v2 completed
seeks. The corrected 22-cell picture/audio/seek/cleanup matrix passed; the original
wrong-picture capture is not established as a production defect or cache fix.
