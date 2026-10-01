# Next bounded audio experiments

Status: **source/host inventory only**. No new decoder provider was built or
qualified by this inventory. Existing production routing remains unchanged.
Machine-readable source hashes, fixture hashes, formats, framing and host decode
results are in [the inventory](../results/media-components/codec-expansion/speech-adpcm-aac-inventory.json).
Media remains in `/tmp/demuxe-speech-adpcm-inventory`; no binary fixtures are added.

## Recommended order

| Priority | Finite experiment | Initial maintained envelope | Prerequisites |
| --- | --- | --- | --- |
| 1 | HE-AAC, then HE-AACv2 | Explicit profile; mono/stereo; decoded 44.1/48 kHz; fixed profile/rate/layout | Existing AAC module contains SBR/PS. Extend profile admission and ASC parsing without weakening the AAC-LC default. Separate core rate/channel config from decoded output; bind trims and PTS in the output sample clock. |
| 2 | Microsoft/IMA WAV ADPCM | 4-bit; mono/stereo; start 44.1/48 kHz; one validated block per packet | New compressed-WAV reader; preserve block alignment and format extension; independently honor `fact` final sample extent. Existing FLAC output rates suffice for this first envelope. |
| 3 | G.711 A-law/mu-law | 8-bit coded samples; mono/stereo; 8/16 kHz WAV, optionally 44.1/48 kHz test envelope | Native packet split is simple; real telephony conversion requires low-rate FLAC/output qualification first. |
| 4 | GSM/GSM-MS | 8 kHz mono; raw GSM 33-byte/160-sample frames; WAV GSM-MS 65-byte/320-sample blocks | Native packet split, raw/WAV reader, exact decoded integer PCM, low-rate output. Reject MSN shortened-block extensions initially. |
| 5 | Speex | Start 16 kHz mono; explicit Ogg header/version/mode; finite frames per packet | New Ogg Speex header/granule handling; native float reference tests and reset; low-rate output. FLV/AVI/OpenACM require separate container support. |
| 6 | AMR-NB / AMR-WB | 8/16 kHz mono; finite speech-frame modes | Raw AMR or separately qualified MOV/3GP reader; reject SID/DTX modes; low-rate output. |
| Later | xHE-AAC / USAC | A separately enumerated subset of ISO test configurations | Native implementation exists, but eSBR, timewarping and uniDrc processing contain explicit unsupported paths. Bound those features and loudness policy before adding any recipe. |

Suggested new packet build profiles are `telephony` (`pcm_alaw,pcm_mulaw,gsm,gsm_ms`),
`adpcm-wave` (`adpcm_ms,adpcm_ima_wav`) and `speech`
(`speex,amrnb,amrwb`). AAC extensions can reuse the existing AAC provider rather
than adding a duplicate binary. Profile names are proposals, not current offers.

## Pinned source and dependency closure

The source lock pins FFmpeg **n9.0.2**, archive SHA256
`6e374ed621e48faa40639307dff48ba6fe574a509977956d2cce9669b7cc27e9`.
`scripts/build-audio-providers.py` currently has none of the proposed speech,
telephony or ADPCM profiles. The shared C kind table and TypeScript codec/profile
validation must also be extended after their current owner finishes.

| Decoder | Native implementation and additional objects | Source license / external dependency |
| --- | --- | --- |
| Speex | `speexdec.c` | BSD 3-Clause implementation within FFmpeg's LGPL closure; no libspeex required. Preserve its copyright/notice. |
| AMR-NB/WB | `amrnbdec.c` / `amrwbdec.c`; `celp_filters`, `acelp_filters`, `acelp_vectors`, `acelp_pitch_delay`; configure selects `lsp`, `celp_math` | LGPL 2.1 or later; no opencore library required. |
| GSM/GSM-MS | `gsmdec.c`, `gsmdec_data.c`, `msgsmdec.c`, included decoder template | LGPL 2.1 or later; no libgsm required. |
| G.711 | `pcm.c` | LGPL 2.1 or later; no external library required. |
| WAV ADPCM | `adpcm.c`, `adpcm_data.c` | LGPL 2.1 or later; no external library required. |
| AAC extensions | `aacsbr`, `aacps_common`, `aacps_float`, `sbrdsp`, `aacpsdsp_float`; `aac/Makefile` includes `aacdec_usac`, arithmetic coding/LPD and `aacdec_usac_mps212` | Native FFmpeg AAC closure; no libfdk-aac required. |

These are configure/Makefile source closures, not measured Wasm byte sizes or
link-map qualification. Preserve the current `--disable-autodetect`, no-network,
decoder-only build and source-companion audit policy.

## Correctness boundaries

- Native AMR-NB explicitly rejects DTX; AMR-WB explicitly rejects SID comfort
  noise with `AVERROR_PATCHWELCOME`. Native AMR-NB documents float behavior that
  is not bit-exact against the specification reference. Use measured native
  reference comparisons and explicit mode controls; do not claim complete AMR.
- GSM/GSM-MS, G.711 and these ADPCM variants decode to 16-bit integer samples
  (packed or planar). Carry left-justified owned `Int32Array` PCM and require
  exact integer comparisons. Coded widths such as ADPCM's 4 bits describe its
  bitstream, not the decoded PCM precision.
- MS ADPCM's decoded predictor handling uses the standard coefficient table.
  Initially require the canonical coefficient extension, block/sample geometry,
  supported predictor range, positive delta and finite `fact` extent. IMA WAV
  must initially require canonical 4-bit coding and valid index/block geometry;
  FFmpeg also implements other coded widths that are outside this proposal.
- Public `scatter.wav` declares **66,075** samples in `fact` but the host decodes
  **67,188** padded block samples; public IMA WAV declares **50,240** but decodes
  **50,500**. Trim the final block to the independently declared extent. Do not
  invent the presentation duration from padded decode length.
- Native Speex accepts up to 64 frames per packet and several header/fallback
  modes. Start with a smaller explicit packet/frame envelope; validate the
  80-byte header, bitstream version 4, mode/rate/channel consistency and granule
  endpoints. Do not infer a timestamp from packet count when packets vary.
- Native AAC includes SBR/PS/USAC, while `PacketAudioDecoder` checks AAC-LC and
  the ISO reader admits only bounded LC ASC. Preserve that default and introduce
  separate explicit HE requests. AAC core sample rate and HE decoded rate, and
  PS mono core versus stereo output, need independent validation. A PS-named
  fixture that probes merely as HE-AAC is not proof of an HE-AACv2 profile.

## Output rate gate

Current FLAC encoder, recipes and maintained reader/conversion envelopes admit
44.1/48/96 kHz. Speech/telephony packet decoding at 8/16 kHz can be built and tested
first. Composition additionally needs finite **8/16/22.05/32 kHz** output support:
FLAC bridge/configuration, frame validation, MP4 sample entry/timescale/duration,
recipes/capability offers, independent output PCM and installed browser MSE.
Keep the existing Opus stereo48 policy; do not introduce hidden resampling.

## Real fixtures and host screening

All seven initial speech/ADPCM files and four AAC files decoded on the host
FFmpeg 8.1.2 with scalar `-cpuflags 0`. This is fixture availability screening,
not proof for pinned n9.0.2 Wasm. Exact input/scalar hashes are recorded in the
inventory. Twenty-four locally generated G.711/MS/IMA WAV fixtures also encoded
and decoded at 8/16/22.05/32/44.1/48 kHz with mono/stereo selected envelopes.

| Primary fixture | Actual host format / output | Important observation |
| --- | --- | --- |
| [AMR-NB 4.75k](https://fate-suite.ffmpeg.org/amrnb/4.75k.amr) | Raw AMR; 8 kHz mono float | 284 frames, 13-byte maximum; 160 samples/frame. |
| [AMR-WB 6.60k](https://fate-suite.ffmpeg.org/amrwb/seed-6k60.awb) | MOV/3GP; 16 kHz mono float | `.awb` extension does not identify the actual container; 512 frames, 320 samples/frame. |
| [GSM](https://samples.ffmpeg.org/A-codecs/GSM/sample.gsm) | Raw GSM; 8 kHz mono integer | 220 packets, 33 bytes each. |
| [GSM-MS](https://fate-suite.ffmpeg.org/gsm/ciao.wav) | WAV; 8 kHz mono integer | Tag `0x31`, block 65, 2-byte sample-block extension, exact `fact` extent. |
| [Speex](https://samples.ffmpeg.org/A-codecs/speex/testingSpeex.flv) | FLV; 16 kHz mono float | 171 variable packets, maximum 103 bytes; no ASC/Ogg header. Ogg qualification still needs an actual Ogg fixture. |
| [MS ADPCM](https://samples.ffmpeg.org/A-codecs/msadpcm-stereo/scatter.wav) | WAV; 44.1 kHz **mono** integer | Folder name does not prove stereo; block 1,024; explicit final `fact` trim. |
| [IMA WAV](https://samples.ffmpeg.org/A-codecs/ima-adpcm/test_ima_adpcm.wav) | WAV; 8 kHz mono integer | Block 256, 505 decoded samples/block; explicit final trim. |
| [HE-AAC](https://fate-suite.ffmpeg.org/aac/al_sbr_cm_48_2.mp4) | MP4; 48 kHz stereo | 5-byte ASC, SBR sync extension differs from maintained LC allowance. |
| [PS-named sample](https://fate-suite.ffmpeg.org/aac/al_sbr_ps_04_new.mp4) | MP4; 32 kHz stereo; probes HE-AAC | Useful extension/control sample; not counted as a proven HEv2 profile. |
| [Explicit HEv2](https://fate-suite.ffmpeg.org/aac/CT_DecoderCheck/sbr_i-ps_i.aac) | ADTS; 44.1 kHz stereo; probes HE-AACv2 | Actual HEv2 reference available; raw ADTS reader is a separate gate. |
| [USAC](https://fate-suite.ffmpeg.org/aac/usac/Fd_1_c1_0x03.mp4) | MP4; 48 kHz mono; probes xHE-AAC | 7-byte ASC; source FATE identifies ISO/IEC 23003-3 references. Native implementation exists, broad feature coverage does not follow. |

Next evidence must include real positive/negative mode and framing controls,
reset/flush/abort/owner cleanup, source precision, presentation extent and exact
installed asset/embedded identity. Public sample availability does not establish codec/provider qualification.
