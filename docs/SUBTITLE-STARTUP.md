# ASS subtitle startup

Subtitle selection still verifies decoded output before playback is admitted.
The worker's `profile` request now checks scheduling evidence without seeking
or scanning the whole subtitle track. The previous 400-iteration scan could
hold up startup for more than two seconds and read hundreds of megabytes while
still returning the frame scheduler.

Normal rendering and state updates collect subtitle timing. When decoding
reaches EOF continuously from the beginning, the worker can mark the ASS
timeline complete using the existing native completeness check. Seeking into
the middle or changing tracks prevents new completeness qualification until
decoding starts again at zero. Previously completed, retained timelines remain valid. Unknown/incomplete timelines retain frame scheduling; complete
static timelines use deadlines and active animations retain frame cadence.
No speculative background scan or additional read-ahead is introduced. Ordinary
subtitle demux I/O remains, and can still be substantial for large files.

## Validation

The Chrome comparison used the same runtime and fixtures, two fresh-browser
pairs per file, reversed order in the second pair, and a worker-only override.
All eight process sets stayed stable during six-second CDP CPU windows. Fixture
hashing warmed the OS cache; this is not a cold-storage benchmark.

For `full_subs_test.mkv` (1,632,771,887 bytes):

- Previous open: 3,313 and 2,913 ms; updated open: 1,442 and 615 ms.
- Previous profile: 2,390 and 2,273 ms; updated profile: below 1 ms.
- Both versions retained Native Direct with mpv subtitles and frame scheduling.
- CPU samples were 47.7/89.0% before and 43.8/70.0% after (one logical core).
  Variation is large; these samples establish no general CPU-saving claim.

The small ASS fixture retained deadline scheduling. CPU samples were
17.1/16.4% before and 16.1/14.1% after. Forward/backward seek text matched in
both pairs for both files. Browser correctness checks also covered same-text
style boundaries, overlap, 1x/2x rates, paused seek/resize/clearing, animated ASS,
PGS/VobSub, incomplete-timeline fallback, invalidation races, and worker cleanup.
The boundary fixture includes overlapping styled events; it is not an exhaustive
subtitle-format qualification.

Raw comparison, worker snapshots, fixture hashes, CPU samples, and correctness
logs are in `results/subtitle-startup/2026-09-27T03-51-49.947Z/`. The earlier
`03-49-50.015Z` run was rejected because its worker override omitted isolation
headers; it supplies no performance evidence. Canonical earlier boundary results
were preserved; the fresh boundary report is copied into this campaign folder.

Reproduce with `tests/subtitle-startup-scan-browser.mjs`: `SUBTITLE_FILES` is a
JSON array of file paths, `BASELINE_WORKER` supplies the comparison worker,
`ROUNDS` defaults to two and `WINDOW` to six seconds. Each output directory is
new. The production change is JavaScript only and uses the existing subtitle
Wasm exports.

Review validation additionally ran the corrected benchmark acceptance gates on
the small ASS fixture (one pair, two-second window), including matched seek
text, unchanged runtime hashes, and worker cleanup. Evidence is in
`results/subtitle-startup/2026-09-27T04-00-07.159Z/`; this short harness check is
not additional CPU qualification. All 24 focused Node tests passed.
