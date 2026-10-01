# Telephony audio split qualification

The optional `telephony` profile builds native FFmpeg `pcm_alaw`, `pcm_mulaw`, `gsm`, and `gsm_ms`. Decoder kinds 31–34 are appended after existing kinds. mpv and default Player routing stay unchanged.

## Finite envelopes

| Family | Source/configuration | Decoded PCM | Packet / seek contract |
| --- | --- | --- | --- |
| G.711 A-law / μ-law | WAV tags 6/7; 8/16kHz; mono/stereo; coded8;empty extradata;blockAlign=channels;bitRate=rate×channels×8 | Signed16, left-justified owned Int32 | At most 4096coded bytes; complete channel tuples; independent codewords and packet seeks |
| GSM | Raw 33-byte frames, magic high nibble 0xd;8kHz mono; coded width0;empty extradata;13200bit/s | Signed16, 160samples/frame | Exactly one frame; fresh stream restart and discard for seeks |
| GSM-MS | WAV tag0x31;8kHz mono; coded width0;65-byte blocks;13000bit/s;2-byte extension LE 320 | Signed16, 320samples/block | Exactly one block; original predictor history required; WAV fact may clip only the last block |

Coded widths describe original metadata rather than decoded PCM. All four families independently enforce actual decoded signed16/rate/channel/layout/sample geometry. Headerless G.711 packets require caller-owned verified metadata; maintained container conversion uses the bounded reader below.

## Reader and conversion

`TelephonyReader.open(file, signal)` admits raw GSM or finite classic RIFF/WAVE. It exposes tracks, `container`, declared presentation `sampleCount`, original padded `decodedSampleCount`, bytesRead, and owned `packets(startSample, prerollSamples)`.

- Local Blob budget 64MiB;metadata reads at most 64KiB; 4096RIFF chunks and 100000codec packets.
- RIFF extent, format extension, channel/rate/average/block geometry and complete data bytes are checked. Duplicate format/fact/data, unknown timeline chunks and nonzero padding reject.
- G.711 byte extent owns sample count; a present fact must match exactly. Reader packets contain at most 512samples/channel and the final partial packet remains complete channel tuples.
- GSM raw frames are scanned in bounded windows to check every magic nibble; partial/trailing frames reject. GSM-MS requires fact and clips at most the final original complete 320-sample block.
- GSM seeking always returns original packets from sample zero. Callers decode original predictor history and discard PCM to the target. G.711 starts at an independently decodable sample block.

`repairTelephonyAudio` and `repairTelephonyAudioFragments` prepare FLAC fMP4 at the original 8/16kHz rate. Original decoded blocks, timestamps, precision and declared presentation endpoint are validated before returning a complete Blob. All original signed16 samples, including discarded final codec padding, must match the decoded precision contract. There is no resampling or Opus output route. Native decoder/encoder owners are released on completion, error, abort and early iterator return.

## Native evidence

`tests/telephony-audio-fixtures.py` prepares 15 packet fixtures: eight generated G.711 rate/layout cases, two exhaustive 256-codeword G.711 fixtures, two canonical official GSM sources and one canonical GSM-MS source. Full 211.26-second GSM exercises sustained predictor state. Scalar host FFmpeg uses explicit native decoders and `-cpuflags 0`; original host packet timestamps/time bases are independently checked against the counted sample clock.

`tests/telephony-audio.mjs` passes full scalar integer PCM for all 15, complete reset, 60 forward/backward comparisons against the original full-stream reference and 161 framing/configuration/abort controls. GSM uses full restart/discard; G.711 independent packet restart is exact. An explicit negative control confirms an arbitrary GSM block restart differs from original PCM. Native GSM frame.duration is zero; actual 160/320 decoded sample counts and original packet sample timestamps remain explicit.

`tests/telephony-audio-standalone.mjs` passes 16 reader cases, 64 original PCM seek comparisons and 216 metadata/seek/abort controls. Its additional GSM-MS case changes only the independently declared fact endpoint by 123samples, retaining every original compressed block and slicing the independent full PCM reference accordingly.

Conversion passes all 16 finite source cases plus profile, clock, precision, framing, factory, owner and abort controls. Each full output matches scalar integer PCM, original rate/channels/sample extent, and identical repeated streamed fragments. Evidence is in `tests/provider-telephony-repair.mjs` and `results/media-components/codec-expansion/telephony-compositions.json`. Native/reader evidence is recorded separately in `telephony-audio.json` and `telephony-standalone.json`. Installed browser, portable CI and public provider/recipe delivery remain separate qualification gates.

## Source and provenance

The pinned FFmpeg n9.0.2 archive is SHA256 `6e374ed621e48faa40639307dff48ba6fe574a509977956d2cce9669b7cc27e9`. [Native GSM source](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/gsmdec.c) and [PCM implementation](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/pcm.c) use LGPL2.1-or-later; the native build does not link libgsm or another external speech library.

Official sources are pinned from [the FFmpeg GSM archive](https://samples.ffmpeg.org/A-codecs/GSM/) and its GSM-MS samples inventory. The long `sample-gsm-8000.gsm` input SHA256 is `d749c338c50199672dfe638950411d7dadba1617cd56adebd7f8c6e9dddcab50`. Short GSM SHA256 is `601e3370b2729e1ed8ce7d4d772f9643f0c838fc78e3d69508aa04fb9db2254c`; GSM-MS is `40c39ebf1f088f8092c148e57a15aefc943972549519765bd885f5c595c08fce`.

Normalized native build record `build/codec-expansion/telephony-provenance/engine-build.json` has SHA256 `30f0ec1b16ec00924a7869b53f8f4de61079f92c788bbb20dd68f3f2d88a85ee`. All 24 exact preferred build/policy inputs are retained under `/tmp/demuxe-telephony-source-inputs/recovered-retained.json`; later native encoder edits do not replace those originals. Fixture binaries/reference PCM stay ignored temporary assets.

## Not admitted

GSM stereo or other rates, MSN shortened GSM-MS blocks, extra format modes, other G.711 rates/layouts, arbitrary GSM packet seeks, and Speex/AMR are not admitted by this profile. GSM has no payload integrity CRC; malformed framing tests do not establish rejection of every syntactically valid mutated speech payload. G.711 and GSM are lossy source codecs; exact PCM means fidelity to independent decoded source samples, not recovery of the original pre-encoding signal.
