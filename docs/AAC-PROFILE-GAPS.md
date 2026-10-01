# Finite AAC profile extensions

The default decoder remains AAC-LC. Extension admission requires an explicit `aacProfile`, exact retained AudioSpecificConfig bytes, the proven decoded rate and channel count, and the actual FFmpeg frame profile. Selecting a capability does not qualify other configurations with the same codec name.

| Capability profile | Qualified envelopes | Frame geometry and output |
| --- | --- | --- |
| `he-configured-float` | HE48 kHz stereo ASC `119056e598`; HE48 kHz six-channel ASC `1300058c01000108800056e598` | Stereo1024 samples; surround2048 samples. Surround native mask207 stays packet-only. |
| `he-v2-stereo32` | 32 kHz stereo ASC `140006040000000056e5a8` | 2048 samples. The source starts with actual HE profile4, then transitions to PS profile28. Reset clears transition state; flush requires that PS appeared. A short prefix without PS cannot qualify this offer. |
| `usac-stereo-configured` | Stereo32/44.1/48/88.2 kHz ASC `f94a452214c000` / `f948442214c000` / `f946432214c000` / `f942412214c000` | 1024 samples, actual profile41. Original priming2220 samples except88.2 kHz2323. The88.2 kHz offer is packet-only because the maintained output encoder excludes that rate. |
| `lc-pce8-44100` | AAC-LC eight-channel44.1 kHz ASC `1200050c05200109440003ac042f` | 1024 samples, native mask20543. Packet-only; no canonical surround remapping. |

Existing HE48 stereo, HEv2 44.1 stereo and USAC48 mono offers remain distinct. `aacExtensionTiming` validates the complete finite configuration before returning the observed frame size and priming. Container edits and final padding still belong to the original container metadata.

## Evidence

`tests/aac-profile-gap-fixtures.py` pins official FFmpeg FATE inputs, packet bytes/ASC/PTS and independently decoded scalar FFmpeg9.0.2 references. The reference build is reproducible with `scripts/build-aac-profile-reference.py`. Whole-stream checks compare the independently declared presentation samples under the unchanged2e-5 float limit, preserve original packet clocks, reset exactly, and recover targets by fresh original-stream restart and discard. They do not claim arbitrary packet reset equivalence.

`tests/aac-profile-gap-browser-fixtures.py` produces eight bounded complete-packet copies with independent reference PCM and original AVFrame timing. The32 kHz PS sample retains its full13.568-second source so the actual in-band transition remains covered. `tests/aac-profile-gap-browser.mjs` runs the maintained packet page against the actual native module in a Node VM. Installed assets/embedded browser conformance is a separate package gate.

## Explicit unsupported stereo SCE structure

The official `aac-sce-in-stereo.mp4` source starts with a single-channel element under a stereo ASC. The pinned bridge produces an unwritten zero right plane. A retained scalar CLI reference once contained nonzero values in that plane; a fresh invocation of the same hash-bound scalar executable and source produced zeros, and a direct host AVCodec driver also produced zeros. The absent plane therefore cannot provide a stable independent stereo reference. This is retained as a failed experiment, rather than treating allocator-dependent values as decoded audio.

For LC stereo ADTS, the public adapter first unwraps one complete LC stereo frame with an exact frame length and no multiple raw blocks. Missing configuration still rejects at construction. The public adapter parses at most64 leading FIL elements, checks the four-bit count and eight-bit escape size, and skips the declared fill bytes to the first coded element. It admits a CPE or metadata-only END and rejects SCE and other unqualified leading syntax in the finite AAC-LC stereo envelope before native decoding. It does not duplicate the left channel. Malformed fill extents and exhausted prefix budgets also reject. Actual FIL→SCE and prepended fill controls are covered by `tests/aac-lc-stereo-guard.mjs`, together with12 real generated conventional stereo CPE packets, a copy of the actual negative source in ADTS, and12 copied conventional ADTS packets with independent scalar PCM comparison. Independently proven mono/multichannel profiles retain their own admission. The actual original fixture is a regression control in `tests/aac-profile-gap-audio.mjs`.
