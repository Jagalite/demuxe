# IMA-QT native split experiment

The optional native build profile `adpcm-qt` contains FFmpeg's built-in `adpcm_ima_qt` decoder. Append-only packet ABI kind40 is `adpcm-ima-qt`. The initial contract is 44.1/48 kHz mono/stereo, coded4-bit and decoded signed16 PCM, empty extradata, block alignment34 bytes per channel, and bitrate metadata0. One original complete packet decodes64 sample frames; every channel header's seven-bit step index must be at most88. Packet and decoded end clocks must be nonnegative safe integers.

This experiment initially qualifies native packet decoding only. It does not add a MOV reader, remux recipe, browser provider, or Player route. mpv remains unchanged.

## Predictor history and seeking

IMA-QT's big-endian header carries only the top nine bits of the initial predictor. The pinned decoder retains its previous predictor when the header index matches and its predictor differs by at most127. A complete packet therefore does not imply that arbitrary packet reset reconstructs the original waveform exactly. Original seek qualification restarts from original packet zero and discards prior output. Tests independently compare forward and backward target packets against the original full-stream scalar reference and retain a block-reset control proving that independent restart can differ.

## Independent reference and evidence

`scripts/build-adpcm-qt-reference.py` builds a minimal host FFmpeg n9.0.2 reference from the exact locked archive. It binds the decoder, encoder, MOV reader/writer, configuration, and host executable hashes. Reference execution uses scalar CPU flags and the native built-in encoder/decoder, without external codec libraries. The production patched source cache is intentionally not accepted as pristine reference input when its MOV source differs from the original archive.

`tests/adpcm-qt-fixtures.py` generates deterministic source PCM and four actual MOV files at44.1/48 kHz mono/stereo. It verifies the original packet size and sample clock, and records independently decoded padded original PCM. The encoder's final64-sample padding is retained explicitly; no original source-length composition claim is made.

`tests/adpcm-qt-audio.mjs` verifies exact owned S32 output, full source extent, original sample clocks, reset/EOF/abort, forward/backward original seeks, retained returned memory, constructor metadata, partial/grouped blocks, invalid step indices on each channel, negative/overflow clocks, and direct native guards bypassing the wrapper. Binary fixtures remain ignored under `/tmp/demuxe-imaqt-fixtures`. Native proof status is recorded in `results/media-components/codec-expansion/adpcm-qt-audio.json` after execution; build availability alone is not qualification.

## Qualified packet envelope

The initial packet suite passes all four generated MOV sources,16 original forward/backward seek comparisons, and104 controls. All four sources prove that arbitrary block reset differs from the original full-stream reference. The normalized native record is `build/codec-expansion/adpcm-qt-provenance/engine-build.json` (SHA256 `9003b042d3d5306d37db7b21d9ea68c2cd12df37e2861f4126b40c1236014d8e`), with24 exact retained native/policy inputs. The module comprises14,009 bytes of JavaScript and251,791 bytes of Wasm. This remains a native packet experiment until actual public MOV reader, recipe, source package, and installed browser qualification are completed.

## Public MOV composition

The maintained reader and `audioRepairRecipe('adpcm-ima-qt', channels, 'flac', 'isobmff', rate)` now admit the proven 44.1/48 kHz mono/stereo envelope through `audio-adpcm-qt`. The optional package advertises `audio.decode.adpcm-ima-qt` / `configured-integer`. Other rates, surround, alternate containers, and Opus output reject.

The proven `ima4` sample description is QuickTime version1 with declared decoded depth16, compression identifier-2, packet fields0/0/0/2, and optional explicit mono/stereo channel bitmap. The reader retains literal decoded16 metadata; the packet decoder receives coded4 configuration. The actual sample tables count compressed packets: fixed `stsz` size34 bytes per channel and `stts` duration64 except one shorter final block. Every `stsc` chunk mapping and media byte range is validated. Alternate QuickTime mappings remain rejected until independently tested.

Four visible H264 MOV fixtures copy every original compressed audio packet without re-encoding. Reader proof verifies packet bytes and original sample clocks plus36 metadata controls. Direct composition proof verifies original declared sample extent, exact independent scalar integer PCM after final-block presentation clipping, exact copied video packets, byte-identical whole/fragment outputs, and cleanup. Six actual public owner tests verify the distinct provider offer and finite recipe, all four outputs, partial iteration, abort, busy ownership, and factory-failure recovery. Thirty-five existing ISO reader regression cases still pass. Original predictor-history seeks remain restart-from-start/discard; no arbitrary block restart is advertised.

Packet and composition fixture references are distinct: packet references retain every decoded64-sample block, while composition references end at the independently declared final `stts` sample. Their manifests are `/tmp/demuxe-imaqt-fixtures/packet-browser.json` and `compositions.json`. Installed assets and embedded browser qualification remain separate, pending the maintained harness and package gates.
