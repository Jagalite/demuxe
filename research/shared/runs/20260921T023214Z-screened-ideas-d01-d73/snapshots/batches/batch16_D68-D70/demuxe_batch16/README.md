<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Demuxe focused research — batch 16 (D68–D70)

Read **REPORT.md**, then **LOCAL_AGENT_HANDOFF.md**. D-numbers are provisional conversation IDs, not new official R-IDs.

Three bounded component screens: CAF PCM→WAVE, CAF Opus→Ogg with explicit source priming/trim, and native WebVTT syllable-step highlighting. The current repository was read through the GitHub connector at `ee7fe7774270fe34fe617cb0dd5adb9d9e9f689e`; no checkout was modified and no PR was created.

## Reproduce

Requirements: Python 3, numpy, Pillow, Playwright Python, FFmpeg with libopus and libx264, and a Chromium binary. The captured environment used Chromium 144 and FFmpeg 7.1.5. No browser packages or fonts are bundled.

```sh
python scripts/reproduce.py /tmp/demuxe-batch16-fresh
# To select another installed browser binary:
CHROMIUM_EXECUTABLE=/path/to/chromium python scripts/reproduce.py /tmp/demuxe-batch16-other
```

The output directory must be new/empty. `DEMUXE_BATCH_DIR` selects the artifact root when invoking individual scripts. A fresh replay was actually executed in this environment; replay records are in `evidence/replay/`. Each browser process is closed. CAF host decoding is an oracle, not part of the adapter path. WebVTT screenshots are test instruments, not candidate render operations.

## Scope

There is no maintained Demuxe or Shaka execution, CPU benchmark, hardware-decoding proof, live PCM-exact seeking qualification, or general ASS renderer replacement. The 76 consistency checks include controls that must reject wrong output. They are not 76 experiments or production passes.
