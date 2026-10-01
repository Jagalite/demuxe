# Telephony provider integration

`audio-telephony` provides exact integer packet decoding for G711 A-law/mu-law at 8/16 kHz mono/stereo, and raw GSM/GSM-MS WAV at 8 kHz mono. Coded widths are eight bits for G711 and unspecified/zero for GSM; decoded PCM is signed sixteen-bit, returned as owned left-justified `Int32Array` values.

The separate `container.read.telephony/finite-clear-audio` capability covers bounded clear G711/GSM-MS WAV and raw GSM. Public recipes explicitly select `container: 'telephony'`, FLAC output and the `audio.encode.flac/low-rate-s24` capability. Existing PCM WAV/AIFF recipes retain their original rates. There is no implicit resampling or Opus output. The direct reader records `wave` or `gsm` source structure; direct converters can additionally check that source structure.

G711 codewords are independently seekable. GSM and GSM-MS require full predictor restart from byte zero and discard to the requested sample. Final GSM-MS fact padding is explicit: full original blocks are decoded, then only the final declared presentation tail is discarded. Output clock, rate, channels and full original integer PCM are independently checked.

Native qualification covers 15 packet fixtures, 16 reader/conversion fixtures and exact restart controls, including real official GSM/GSM-MS sources, generated rate/channel cases and all 256 G711 codewords. `tests/provider-telephony-integration.mjs` exercises the actual maintained owner path, recipe/rate/output guards, complete original PCM and MP4 duration, busy/early-return/abort/failure recovery. Installed browser delivery qualification remains separate.

`tests/telephony-browser-fixtures.py` adapts the original native packet JSON into the installed page schema with explicit stream configuration; original packet bytes, timestamps and source hashes are preserved. Namespaced packet and composition manifests remain ignored under `/tmp/demuxe-telephony-browser-fixtures`. `tests/telephony-browser-packets.mjs` runs the actual page packet handler with native Wasm in a Node VM and checks portable CI roundtrip references. This proof does not claim actual browser playback.
