# Additional finite AAC movie conversions

The P2 experiment adds five proven stereo ISO-BMFF → FLAC24 compositions:

| Source profile | Decoded rate | Exact ASC | Frame samples |
| --- | --- | --- | --- |
| HE, same-rate SBR | 48 kHz | `119056e598` | 1024 |
| HEv2, parametric stereo | 32 kHz | `140006040000000056e5a8` | 2048 |
| USAC | 32 kHz | `f94a452214c000` | 1024 |
| USAC | 44.1 kHz | `f948442214c000` | 1024 |
| USAC | 48 kHz | `f946432214c000` | 1024 |

These extend the existing HE48, HEv2 44.1 and USAC48 mono recipes. Selection still requires an explicit AAC profile and ISO-BMFF input. AAC-LC remains the default profile. Its stereo packet guard now rejects unqualified single-channel-element syntax, including leading fill elements and ADTS wrapping, before native decoding. USAC retains the independently observed 2220-sample priming; configuration bytes determine frame geometry through the validated shared helper.

`tests/aac-profile-gap-composition-fixtures.py` pairs the retained complete original AAC packets with generated AVC without frame reordering. It copies the original audio edit verbatim: ordinary FFmpeg packet remuxing can remove the source's final presentation trim. It verifies every AAC payload and compares the independently decoded presentation to the retained scalar FFmpeg9 reference. Numerically identical signed zeros are accepted.

The reader permits an edit endpoint past the last complete coded sample by at most one movie clock tick. It emits no additional PCM. Fractional edits inside the coded presentation, trims beyond the final frame, unknown ASC bytes and unsupported rate/layout combinations still fail. The real USAC44.1 sample exercises this bounded movie clock overhang.

`tests/aac-profile-gap-compositions.mjs` verifies all five actual conversions against the independent PCM references, exact sample count/rate/channel count, and decoded AVC frame identity. Current native conversion results are retained in [aac-profile-gap-compositions.json](../results/media-components/codec-expansion/aac-profile-gap-compositions.json). Maximum observed PCM error was 1.7881393432617188e-7, within the unchanged 2e-5 limit.

HE six-channel, AAC-LC PCE eight-channel and USAC88.2 stereo remain packet-only qualifications. They do not gain a FLAC conversion recipe from this experiment. Installed package conformance, assets/embedded browser execution, and final source audit are separate gates; the native result alone does not qualify them.
