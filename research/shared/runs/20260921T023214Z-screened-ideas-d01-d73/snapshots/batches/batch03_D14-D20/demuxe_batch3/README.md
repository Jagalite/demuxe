# Demuxe focused research, batch 3

Seven bounded component questions: **D14–D20**. Start with [REPORT.md](REPORT.md), then [LOCAL_AGENT_HANDOFF.md](LOCAL_AGENT_HANDOFF.md) and [evidence/verification.json](evidence/verification.json).

The package contains real generated media, executed browser/host evidence, prototypes and expected-failure controls. It does **not** contain an integrated Demuxe patch, performance qualification or hardware-decoder evidence.

Verify delivered files:

```sh
sha256sum -c checksums.sha256
```

Run in an environment with Python, numpy, Playwright, ffmpeg, ffprobe, libFLAC's `flac` executable and Chromium:

```sh
bash run_all.sh
```

The original delivered evidence is archived before a rerun. `CHROMIUM_EXECUTABLE` may point to a specific Chromium binary. Tests use in-memory fixture bindings, not network streaming. The Python formatter and parsers deliberately cover restricted constructed profiles and are not production-ready media parsers.

All scripts authored for this batch are MIT-licensed. The retained SHA-256 helper comes from the preceding self-authored research package. No user source files or repository state were modified.
