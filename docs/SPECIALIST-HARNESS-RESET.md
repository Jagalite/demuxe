<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Compound specialist row reset — 2026-09-28

The four HDR10/TrueHD/PGS, HDR10/DTS-HD MA/PGS and Dolby Vision
5/8.1/Atmos/ASS rows have been reset to **Untested across all nine player
columns**. Previous results remain in their immutable archives. No old pass,
failure or CPU result is carried into the reset rows.

## Why the previous test was invalid for these sources

`prepare-library-fixtures.py` copies genuine specialist audio and records
`markedAudio: false`. The catalogue import omitted that field. `run.mjs` then
required 440 Hz left / 880 Hz right from every audio source. TrueHD and both
Atmos combinations produced nonzero audio but failed that inappropriate check.
DTS-HD video advanced while observed audio remained silent during the startup
window. That observation alone does not distinguish a silent source interval
from a playback defect; a matching host-decoded source window is required.

The Dolby Vision files also encountered missing HEVC parameter sets on native
paths and used Software fallback. Correcting the audio oracle does not repair
or remove that recorded packaging limitation.

## Corrected contracts

- Snapshot setup preserves specialist marker flags when `--specialist-from` is
  supplied. Unknown legacy flags are treated as unqualified, never marked.
- The marked catalogue runner blocks explicitly unmarked inputs and imported
  `library/` or `specialist/` files whose marker metadata is absent. This happens
  before bitmap oracles or browser launches, including CPU attempts.
- `specialist-screen.mjs` verifies fixture identity and independently decodes
  half-second stereo references from the exact frozen file. Each channel must
  have measurable energy. Missing, truncated or silent references fail preflight.
- Initial clock progression is checked separately from audio. The runner seeks
  to a host-verified non-silent interval before checking both browser audio
  channels, then repeats reference checks on backward and forward seeks. Browser
  observations must fall within the decoded reference interval. It does not
  require arbitrary program audio to contain synthetic tones.
- Authored markers remain required when their metadata says they exist.
  Visible output, subtitles, pause/resume, rate, seeks, EOF and cleanup retain
  their specialist checks. Energy checks establish presence only: they do not
  verify waveform identity, channel mapping, losslessness or Atmos objects.

## Validation

The deterministic Node checks cover missing/false marker metadata, silent or
one-channel host references, truncated windows, wrong tones, stale browser
positions, silent output and missing browser channels. Python checks cover
imported metadata and specialist codec/profile admission.

The [marked-runner guard archive](../results/head-to-head/specialist-marked-guard-20260928-01/summary.json)
records four preparation blocks and no playback failures or browser launches.
Its nonzero runner exit is expected: blocked inputs are not passes.

The [specialist pilot](../results/head-to-head/specialist-harness-reset-20260928-02/summary.json)
uses the frozen runtime from `20b5cd0319a64334c29d36ea7a6c8cdac7c6f4d8`,
not the current dirty checkout. Its four media SHA-256 values match the failed
September 27 retest. This is a harness validation pilot, not current-build
qualification or CPU evidence. The first pilot (`specialist-harness-reset-20260928-01`)
is retained separately; the final pilot tightens browser observation to the exact
half-second reference interval. Neither pilot repopulates the README.

The final pilot passed all four cases: HDR10/TrueHD and HDR10/DTS-HD used
Hybrid; both Dolby Vision combinations used Software. All four completed the
bounded lifecycle and cleanup checks. The 17 Node and five Python checks passed,
and both final pilot and marked-runner guard archives passed integrity verification.

## Fresh qualification

Build the intended runtime revision and freeze a **new** snapshot with matching
`--fixtures-from` and `--specialist-from` inputs. For example, after the normal
runtime build:

```sh
python3 tests/head-to-head/setup.py \
  --output build/head-to-head/assets-specialist-fresh \
  --fixtures-from build/head-to-head/assets-release-specialist-20260925-05 \
  --specialist-from build/head-to-head/assets-release-specialist-20260925-05

node tests/head-to-head/specialist-screen.mjs \
  build/head-to-head/assets-specialist-fresh \
  results/head-to-head/specialist-fresh-auto demuxe-auto \
  hdr10-truehd-pgs,hdr10-dtshd-pgs,dv5-atmos-ass,dv81-atmos-ass

node tests/head-to-head/verify.mjs results/head-to-head/specialist-fresh-auto
```

Use a different output directory for each run. Repeat with the `software` lane
and separately qualify other players before restoring their cells. Label any
successful energy/visible-output result as a bounded specialist screen. Full
HDR/Dolby Vision, discrete surround and object-audio fidelity remain unqualified.
