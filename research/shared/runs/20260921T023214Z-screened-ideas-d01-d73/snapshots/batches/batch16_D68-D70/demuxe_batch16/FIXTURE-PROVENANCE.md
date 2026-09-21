<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Fixture and code provenance

All media in this package was procedurally authored for these tests: deterministic integer formulas/noise (numpy seed 16068), known float headroom values, libopus encoding of the authored source, and an FFmpeg color-source backdrop. Captions are original short test phrases with literal-markup controls. No third-party audio, footage or font files are supplied.

`build_caf.py` records the emitted CAF, original encoder Ogg, source-declared CAF packet-table variant, and deliberately inconsistent/wrong-boundary controls separately. The trim-declared CAF changes only declarations using known original encoder metadata; an arbitrary untrimmed CAF is not silently assigned those declarations. `build_karaoke.py` retains an actual restricted ASS input and an independently spelled-out text/timing truth.

`sha256.js` is reused unchanged apart from an SPDX annotation from the earlier user-provided MIT research package; its existing MIT notice is included in LICENSE-CODE.txt. Other scripts were authored in this batch. Installed FFmpeg/Chromium/Python libraries are execution dependencies, not redistributed here. Code is MIT under LICENSE-CODE.txt. Narrative reports are CC-BY-4.0 under their SPDX declarations. Authored fixtures are supplied under CC0-1.0 for test reuse.

Initial exploratory CAF encodes in evidence/setup are not counted as accepted profiles or final fixtures. The failed option spelling, invalid stream-copy CAF declaration and caption-harness correction remain in evidence logs.
