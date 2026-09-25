# Dual-audio H.264 + AAC + AC-3 stereo / MKV row refresh — 2026-09-25

The qualified row uses the frozen release-campaign `h264-dual-audio` fixture
(`index.mkv`, SHA-256 `805810e7fda17982c0f4f5702c05943a177f413d2f10ead74cc6f18e00847437`).
Headed Chrome was 153.0.8010.53. The
[correctness run](../row-h264-dual-audio-correctness-20260925-02/REPORT.md)
passed plain video, Demuxe Auto, forced Software, and AVPlayer. Movi failed near
EOF at media time 35.371/36 seconds, so it has no CPU figure. Auto began on
`native-direct`; selecting AC-3 moved to `hybrid`. The
[CPU run](../row-h264-dual-audio-cpu-20260925-02/REPORT.md) measured the
default AAC playback state, not the AC-3 switch. All 12 CPU windows passed in
one Chrome launch, and both artifacts passed integrity verification with equal
asset, harness, and browser-configuration hashes.

One fresh Chrome profile served all four passing arms across three rotated
rounds, with a fresh context per arm. The startup task completed and tracing
stopped before CPU sampling. Each arm had a 5-second warmup and a 20-second
measurement window. The run took 9.18 minutes. Three rounds in one launch are
correlated; the values below do not establish launch-to-launch reproducibility.
CPU is percentage of one core. The README uses the whole-Chrome median.

| Arm | Whole | Browser | Renderer | GPU | Audio | Min–max whole |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Plain `<video>` | 13.90 | 0.20 | 6.29 | 6.82 | 0.57 | 9.86–14.00 |
| Demuxe Auto | 11.29 | 0.28 | 5.33 | 4.82 | 0.77 | 10.19–14.60 |
| Demuxe forced Software | 36.26 | 0.21 | 21.80 | 13.51 | 0.75 | 27.26–38.15 |
| AVPlayer default | 32.80 | 0.17 | 17.50 | 14.42 | 0.69 | 29.53–35.54 |

Paired Auto minus plain whole-Chrome CPU was **+0.33, −2.61, +0.59** points
in rounds 1–3. The matching non-browser deltas were **+0.23, −2.70, +0.54**;
browser-process contributions were **+0.09, +0.09, +0.05**. These paired
differences do not support a precise Auto-versus-plain ranking. Whole-Chrome
CPU rose after round 1 in most lanes: plain video 9.86→13.90→14.00, Auto
10.19→11.29→14.60, and Software 27.26→36.26→38.15. Renderer and GPU CPU
accounted for most of that rise. AVPlayer was 29.53→35.54→32.80.

The 20-second idle samples before rounds 1–3 measured browser-process CPU of
**0.32, 0.37, 0.39** and whole-Chrome CPU of **1.53, 1.28, 1.38**. Idle summed
RSS fell from **1311 to 1122 to 1123 MiB**. There is no clear browser-process
CPU or RSS buildup, but the playback CPU drift is material. All three idle
windows had stable process IDs. No idle constant was subtracted. Summed RSS
can count shared pages twice.

Playback progression passed all qualified correctness checks. Recorded dropped
frames were zero for plain video, Auto, and AVPlayer; the Software drop counter
was unavailable. The harness did not record a decoder backend, so no hardware
decoding claim is made. The fixture server was excluded from Chrome CPU.

An earlier attempt used the older routing-isolation snapshot with a different
fixture SHA-256 (`4ea93542395311f438e69452ab1a598c06c6c1faf807b7194731129517b21e43`).
Its [correctness artifact](../row-h264-dual-audio-correctness-20260925-01/REPORT.md)
is retained as excluded evidence. Its CPU run was interrupted during startup
before any measurement window. Neither artifact contributes to the README row.

**Interpretation:** The accepted windows show a small and inconsistent paired
Auto-versus-plain difference in one Chrome launch. Absolute medians have wide
within-launch ranges, so this row remains descriptive; they should not be used
to claim a fine-grained player advantage or a Demuxe regression.
