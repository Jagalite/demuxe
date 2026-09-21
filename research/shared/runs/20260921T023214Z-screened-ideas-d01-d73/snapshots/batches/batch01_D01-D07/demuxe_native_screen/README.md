# Demuxe — focused research screening package

Read **REPORT.md** first, then **LOCAL_AGENT_HANDOFF.md**. The seven D-labels are provisional batch labels, not assignments to Demuxe's R registry.

This package contains self-authored fixtures, standalone component prototypes, commands, browser event logs, packet/frame/sample hashes, negative controls, and 40 cross-check assertions. It does not contain a pulled Demuxe working tree or a patched player.

## Reproduce

Required: Python 3.10+ with `numpy` and `playwright`, FFmpeg/ffprobe with libx264, AAC, ALAC, FLAC and MPEG-2 support, and Chromium. The recorded environment is in `evidence/environment.json`.

```sh
# Install dependencies in your own environment as needed.
python3 -m pip install numpy playwright
# Set this when Chromium is not discoverable as chromium or google-chrome.
export CHROMIUM_EXECUTABLE='/path/to/chromium-or-chrome'
bash run_all.sh
```

The shell script archives existing evidence before rerunning. Tests intentionally use an in-memory document and local byte bindings, not HTTP, network fetch, or secure-context WebCodecs. `decode` records WebCodecs checks as blocked in this environment; that is expected. MSE and whole-file browser audio decoding are actually exercised.

The scripts build small controlled fixtures; they are **not production parsers** and are not intended to process arbitrary untrusted media. No external media downloads are needed. `build_fixtures.py` can overwrite generated fixture files in this package only.

## Interpreting output

`evidence/verification.json` records whether the expected bounded observations and controls agree. Forty passing assertions do **not** mean forty experiments, seven production-ready routes, or any passed performance gate. The guarded negative cases are expected to fail playback, fail their exactness oracle, or reject input.

`evidence/pre_presentation_witness/` preserves superseded browser logs from an early harness that sampled canvas immediately at `seeked`. Those are not accepted pixel evidence. The final harness waits for `requestVideoFrameCallback` with the expected source presentation timestamp before sampling. Initial island and AAC prototype logs are retained separately and explained in the report.

`checksums.sha256` covers the distributed files other than itself. The original baseline fixture manifest predates the AAC/island additions; the package checksum list covers those too.
