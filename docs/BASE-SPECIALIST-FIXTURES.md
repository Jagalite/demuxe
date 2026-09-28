<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Five base specialist fixtures — validated 2026-09-28

All five previously unavailable Auto fixture contracts have locally available,
hash-pinned samples validated for **bounded playback screening**. The fresh
[validation archive](../results/head-to-head/base-specialist-validation-20260928-01/summary.json)
records source provenance, exact fixture SHA-256 values and host-decoded
references. The [TrueHD](BASE-SPECIALIST-TRUEHD-ROW.md) and
[DTS-HD MA](BASE-SPECIALIST-DTSHD-ROW.md) Auto rows subsequently passed bounded
browser screens; the other three Auto cells remain Unqualified.
Source validation alone is not a browser pass.

| README source contract | Fixture ID | Fresh validation |
| --- | --- | --- |
| HEVC + TrueHD 7.1 / MKV | `hevc-truehd` | HEVC; TrueHD, eight channels, 7.1; Matroska |
| HEVC + DTS-HD MA 7.1 / MKV | `hevc-dtshd` | HEVC; DTS-HD MA profile, eight channels, 7.1; Matroska |
| HEVC + E-AC-3 with Atmos metadata / MP4 | `hevc-atmos` | HEVC; E-AC-3 parsed as Dolby Digital Plus + Dolby Atmos; MP4 |
| Dolby Vision profile 5 HEVC + E-AC-3 / MP4 | `dv5` | Profile 5, compatibility ID 0, base layer and RPU flags, actual decoded RPU side data; E-AC-3; MP4 |
| Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV | `dv81` | Profile 8, compatibility ID 1, base layer and RPU flags, actual decoded RPU side data; E-AC-3; Matroska |

## References and limits

Every source matches the existing hash/size lock in
`tests/head-to-head/specialist-sources.json`. Every derived fixture matches its
frozen manifest and specialist catalogue. Fresh ffprobe results establish the
profiles and containers; full bounded FFmpeg decoding completed with `-xerror`.
Commands, stderr, FFmpeg version and probes are retained.

At 1 and 10 seconds (4 and 12 for DTS-HD), each fixture has a half-second
native-rate PCM reference preserving all decoded channels, per-channel RMS and
SHA-256, a separate stereo reference, and a decoded base-video frame checksum.
Both stereo channels have measurable energy in each selected window. Dolby
Vision frame side data independently establishes RPU presence beyond container
flags. The evidence archive contains 42 hash-verified files.

These references do not certify browser waveform/channel fidelity, physical
HDR, Dolby Vision color/RPU application, or Atmos object rendering. FFmpeg base
video checksums are decoder-specific reference artifacts, not Dolby Vision
display oracles. Browser output must be compared under an explicitly matched
output contract before stronger fidelity claims are made.

The fixtures retain their original limitations:

- TrueHD repeats a roughly 0.107-second genuine 7.1 regression sample into a
  bounded file. It is not representative long-form program audio.
- DTS-HD repeats a clean eight-second segment; copied compressed audio remains
  DTS-HD MA rather than a re-encoded core substitute.
- The Atmos fixture copies an existing E-AC-3/Atmos sample. Its host decode
  exposes a 5.1 bed; that does not establish rendered object audio.
- Dolby Vision fixtures retain the genuine HEVC/RPU bitstreams and use authored
  stereo E-AC-3 tones. These two base rows do not claim Atmos.
- All clips are about 36 seconds. External source media remains local and is
  not redistributed or relicensed by this validation.

## Reproduce and qualify

The validator reads frozen assets and pinned local originals; it writes only a
new evidence directory:

```sh
python3 tests/head-to-head/validate-specialist-fixtures.py \
  --assets build/head-to-head/assets-release-specialist-20260925-05 \
  --sources build/head-to-head/specialist-samples-01 \
  --output results/head-to-head/base-specialist-validation-fresh
```

Use a fresh output directory. If the originals are absent,
`tests/head-to-head/fetch-specialist-samples.py` restores the pinned files to a
new local directory and verifies their hashes. Do not overwrite consumed inputs.

For current Auto qualification, build and freeze a new runtime with these exact
fixture bytes and the matching specialist catalogue, following the
[snapshot procedure](SPECIALIST-HARNESS-RESET.md#fresh-qualification), then run:

```sh
node tests/head-to-head/specialist-screen.mjs \
  build/head-to-head/assets-specialist-fresh \
  results/head-to-head/base-specialist-fresh-auto demuxe-auto \
  hevc-truehd,hevc-dtshd,hevc-atmos,dv5,dv81
```

Retain output, route/fallback, seek, rate, EOF and cleanup evidence. Run forced
Software controls with a separate output directory. Only a fresh successful
bounded screen can replace the corresponding Unqualified Auto cell; it cannot
establish full output fidelity or supply a CPU value. Measure CPU separately
after matching correctness passes.

The source/reference changes passed eight Python regression tests, including
rejection of 5.1 TrueHD substitutes, DTS core, plain E-AC-3, wrong DV
profile/compatibility/RPU flags, wrong containers and malformed PCM references.
