// SPDX-License-Identifier: Apache-2.0
/** Logical contracts only. No browser probes, assets, loaders or codec claims.
 * Integrated playback boundaries and packet contracts remain distinct.
 * A capability declaration never grants composition qualification.
 */
export const EXECUTION_CAPABILITIES = {
    'audio.decode.ac3': {
        version: 1, profiles: ['48khz-fltp'],
        contract: 'Complete AC-3 packets to owned float planes with explicit sample timestamps, native channel layout, reset, drain and cancellation.',
    },
    'audio.decode.eac3': {
        version: 1, profiles: ['48khz-fltp'],
        contract: 'Complete E-AC-3 packets to owned float planes; no Atmos or dependent-substream composition qualification is implied.',
    },
    'audio.decode.dts': {
        version: 1, profiles: ['core-48khz-fltp', 'ma-48khz-s32p', 'ma-configured-integer', 'ma-high-rate-integer'],
        contract: 'Complete DTS core packets to owned float planes; The MA profiles preserve planar integer PCM; high-rate MA is finite96 kHz6/8-channel24-bit or192 kHz6-channel16-bit packet decoding. Only96 kHz qualifies FLAC composition; core and MA are separate offers.',
    },
    'audio.decode.truehd': {
        version: 1, profiles: ['48khz-integer', 'configured-integer'],
        contract: 'Complete TrueHD packets to owned left-justified integer PCM, sample timestamps, reset, drain and cancellation. No Atmos object preservation claim.',
    },
    'audio.decode.mlp': {
        version: 1, profiles: ['48khz-integer', 'configured-integer'],
        contract: 'Complete MLP packets to owned left-justified integer PCM with native channel layout, reset, drain and cancellation.',
    },
    'audio.decode.aac': {
        version: 1, profiles: ['lc-48khz-stereo', 'lc-configured', 'he-stereo48', 'he-v2-stereo44100', 'usac-mono48', 'he-configured-float', 'he-v2-stereo32', 'usac-stereo-configured', 'lc-pce8-44100'],
        contract: 'Explicitly admitted AAC-LC or exact ASC-owned HE48 stereo/six-channel, HEv2 stereo44100/32000, USAC mono48/stereo32/44100/48000/88200 and PCE eight-channel44100 packets with verified AudioSpecificConfig and actual decoded profile to owned PCM; explicit priming and discard padding belong to the container.',
    },
    'audio.decode.opus': {
        version: 1, profiles: ['48khz-stereo', 'configured-pcm'],
        contract: 'Configured Opus packets to owned PCM with explicit container delay and preroll; no implicit seek state.',
    },
    'audio.decode.vorbis': {
        version: 1, profiles: ['48khz-stereo', 'configured-pcm'],
        contract: 'Configured Vorbis packets and headers to owned PCM with reset, drain and cancellation.',
    },
    'audio.decode.flac': {
        version: 1, profiles: ['48khz-integer', 'configured-integer'],
        contract: 'Configured FLAC packets to owned left-justified integer PCM; lossless output rejects precision above 24 bits.',
    },
    'audio.decode.alac': {
        version: 1, profiles: ['48khz-integer', 'configured-integer'],
        contract: 'Configured ALAC packets to owned left-justified integer PCM with explicit channel layout.',
    },
    'audio.decode.wmapro': {
        version: 1, profiles: ['configured-pcm'],
        contract: 'Configured WMA Pro blocks to owned float PCM with bounded reservoir/drain and explicit native or packet-clock timestamps; packet-only qualification.',
    },
    'audio.decode.wmalossless': {
        version: 1, profiles: ['configured-integer'],
        contract: 'Configured 16/24-bit WMA Lossless blocks to owned exact integer PCM with explicit native or packet-clock timestamps; no composition admission.',
    },
    'audio.decode.wmavoice': {
        version: 1, profiles: ['speech-configured-pcm'],
        contract: 'Configured 8/16 kHz mono WMA Voice blocks to owned float PCM with an explicit numerical tolerance and timestamp provenance; no composition admission.',
    },
    'audio.decode.adpcm-g726': {
        version: 1, profiles: ['configured-integer'],
        contract: 'Explicit big-endian G726 8 kHz mono coded2/3/4/5-bit complete bit groups to owned signed16 integer PCM; seek requires original full restart and discard.',
    },
    'audio.decode.adpcm-g726le': {
        version: 1, profiles: ['configured-integer'],
        contract: 'Explicit least-significant-first G726 8 kHz mono coded2/3/4/5-bit complete bit groups to owned signed16 integer PCM; seek requires original full restart and discard.',
    },
    'audio.decode.speex': {
        version: 1, profiles: ['flv-wideband-float', 'ogg-mono-cbr'],
        contract: 'Canonical headerless Speex FLV 16 kHz mono packets to owned float PCM with original packet PTS and gaps; max two decoded frames, scalar error below7e-5 and whole-stream SNR above80dB; no container composition admission. Explicit ogg-mono-cbr admits canonical 80-byte Speex headers, 8/32 kHz mono CBR single160/640-sample frames with original signed Ogg PTS and full coded padding; unchanged7e-5/SNR80 qualification.',
    },
    'audio.decode.amrnb': {
        version: 1, profiles: ['mode0-float', 'ordinary-modes-float'],
        contract: 'Complete ordinary AMR-NB modes0–7 at8 kHz mono; defaultmode0 or explicit immutable amrModes whitelist; quality1 complete frames to owned float PCM, original PTS and restart-from-start/discard seeks; SID/DTX rejected; no container admission.',
    },
    'audio.decode.amrwb': {
        version: 1, profiles: ['mode0-float', 'ordinary-modes-float'],
        contract: 'Complete ordinary AMR-WB modes0–8 at16 kHz mono; defaultmode0 or explicit immutable amrModes whitelist; quality1 complete frames to owned float PCM, original PTS and restart-from-start/discard seeks; SID rejected; no container admission.',
    },
    'audio.decode.pcm-alaw': {
        version: 1, profiles: ['configured-integer'],
        contract: 'Finite G711 A-law 8/16 kHz mono/stereo to owned exact signed16 PCM with original sample clock; coded precision and predictor restart policy remain explicit.',
    },
    'audio.decode.pcm-mulaw': {
        version: 1, profiles: ['configured-integer'],
        contract: 'Finite G711 mu-law 8/16 kHz mono/stereo to owned exact signed16 PCM with original sample clock; coded precision and predictor restart policy remain explicit.',
    },
    'audio.decode.gsm': {
        version: 1, profiles: ['configured-integer'],
        contract: 'Finite raw GSM 8 kHz mono to owned exact signed16 PCM with original sample clock; coded precision and predictor restart policy remain explicit.',
    },
    'audio.decode.gsm-ms': {
        version: 1, profiles: ['configured-integer'],
        contract: 'Finite GSM-MS WAV 8 kHz mono to owned exact signed16 PCM with original sample clock; coded precision and predictor restart policy remain explicit.',
    },
    'audio.decode.adpcm-ms': {
        version: 1, profiles: ['configured-integer'],
        contract: 'Canonical Microsoft WAV ADPCM complete blocks to owned signed16 integer PCM with explicit sample clock and independent final fact padding.',
    },
    'audio.decode.adpcm-ima-qt': {
        version: 1, profiles: ['configured-integer'],
        contract: 'Finite MOV IMA-QT 44.1/48 kHz mono/stereo original complete34-byte/channel packets to owned exact signed16 PCM;64 decoded frames; original seeks restart from stream beginning; final stts presentation tail explicit.',
    },
    'audio.decode.adpcm-ima-wav': {
        version: 1, profiles: ['configured-integer'],
        contract: 'Canonical IMA WAV ADPCM complete blocks to owned signed16 integer PCM with explicit sample clock and independent final fact padding.',
    },
    'audio.decode.shorten': {
        version: 1, profiles: ['canonical-integer'],
        contract: 'Canonical version2 RIFF44100 stereo16 Shorten chunks to exact integer PCM with explicit stream clock; seeking recreates the decoder from byte zero.',
    },
    'audio.decode.tak': {
        version: 1, profiles: ['canonical-integer'],
        contract: 'CRC-checked TAK codec2/profile2 44.1 kHz mono16 packets with 125 ms frames to owned exact integer PCM; keyframe restarts require actual stream info.',
    },
    'audio.decode.tta': {
        version: 1, profiles: ['configured-integer'],
        contract: 'Unencrypted TTA1 packets with validated header and CRC to owned integer PCM; 44.1/48 kHz, 16/24 bit, mono/stereo/5.1 and bounded frames.',
    },
    'audio.decode.ape': {
        version: 1, profiles: ['configured-integer'],
        contract: 'Modern APE 3930-3990 packets to owned integer PCM; bounded 16/24 bit mono/stereo configuration, reset and drain. No container admission.',
    },
    'audio.decode.wavpack': {
        version: 1, profiles: ['configured-integer'],
        contract: 'Complete integer lossless WavPack blocks to owned PCM; hybrid, correction, float and DSD reject. No container admission.',
    },
    'audio.decode.mp1': {
        version: 1, profiles: ['32khz-stereo'],
        contract: 'Complete MPEG Layer I packets to owned PCM; canonical 32 kHz stereo packet evidence only.',
    },
    'audio.decode.mp2': {
        version: 1, profiles: ['configured-pcm', 'lower-rate-pcm'],
        contract: 'Configured MPEG Layer II packets with container priming to owned PCM.',
    },
    'audio.decode.wmav1': {
        version: 1, profiles: ['configured-pcm', 'lower-rate-pcm'],
        contract: 'WMA v1/v2 complete blocks with explicit WAVEFORMATEX framing, bitrate and bounded drain timing to owned PCM.',
    },
    'audio.decode.wmav2': {
        version: 1, profiles: ['configured-pcm', 'lower-rate-pcm'],
        contract: 'WMA v1/v2 complete blocks with explicit WAVEFORMATEX framing, bitrate and bounded drain timing to owned PCM.',
    },
    'audio.decode.mp3': {
        version: 1, profiles: ['48khz-stereo', 'configured-pcm'],
        contract: 'Complete MP3 packets to owned PCM; caller owns gapless metadata and reservoir warmup after reset.',
    },
    'audio.decode.pcm': {
        version: 1, profiles: ['48khz-stereo', 'configured-pcm', 'integer-8bit'],
        contract: 'Configured little-endian signed16/24/32 or float32/64 packets to owned PCM; integer-8bit admits WAV unsigned8 and AIFF signed8 at 44100/48000/96000 Hz mono/stereo to exact owned integers. Precision and clipping are explicit output policy.',
    },
    'audio.encode.opus': {
        version: 1, profiles: ['48khz-mono-stereo'],
        contract: 'Explicit lossy mono/stereo Opus output with header, encoder delay, packet timestamps and final trimming.',
    },
    'audio.encode.flac': {
        version: 1, profiles: ['48khz-s24', 'configured-s24', 'low-rate-s24'],
        contract: 'Signed 24-bit PCM at existing 44.1/48/96 kHz or explicitly admitted low rates 8/16/22.05/32 kHz mono/stereo to owned FLAC packets with stream info, sample timestamps and bounded send/drain; caller owns quantization and channel mapping.',
    },
    'container.read.matroska': {
        version: 1, profiles: ['finite-clear-av', 'finite-clear-webm'],
        contract: 'Bounded local container reads with owned packet bytes, explicit track configuration, timestamps, codec delay and discard padding; unsupported structures reject the provider profile.',
    },
    'container.read.mpegts': {
        version: 1, profiles: ['finite-pes-av'],
        contract: 'Single-program clear MPEG-TS AVC Annex B and AAC ADTS packets with explicit 90 kHz PTS/DTS; no packet rewriting, muxing or seek qualification.',
    },
    'container.read.wavpack': {
        version: 1, profiles: ['finite-clear-audio'],
        contract: 'Bounded integer lossless standalone WavPack headers and blocks with exact original sample counts; hybrid, float, DSD and unsupported layouts reject.',
    },
    'container.read.g726': {
        version: 1, profiles: ['finite-clear-audio', 'explicit-raw-audio'],
        contract: 'Canonical0x45 G726 WAV8kmono with exactfact final-group extent, or explicitly configured raw codec/codedwidth/optional original samplecount; complete bit groups and original predictor history only. No bit-order sniffing.',
    },
    'container.read.telephony': {
        version: 1, profiles: ['finite-clear-audio'],
        contract: 'Bounded G711/GSM-MS WAV and raw GSM reads with owned complete codewords/blocks, explicit original sample extent and final fact trim; GSM seek restarts from byte zero.',
    },
    'container.read.adpcm-wave': {
        version: 1, profiles: ['finite-clear-audio'],
        contract: 'Bounded canonical Microsoft/IMA WAV ADPCM metadata and whole owned blocks with explicit decoded duration, presentation fact extent and final discard padding.',
    },
    'container.read.shorten': {
        version: 1, profiles: ['finite-clear-audio'],
        contract: 'Finite canonical Shorten version2 embedded RIFF metadata and owned untimestamped chunks; full restart and discard seeking only.',
    },
    'container.read.tak': {
        version: 1, profiles: ['finite-clear-audio'],
        contract: 'Bounded TAK codec2/profile2 44.1 kHz mono16 files with strict metadata/frame CRC and exact sample clocks; compressed payload scan builds an actual keyframe index.',
    },
    'container.read.tta': {
        version: 1, profiles: ['finite-clear-audio'],
        contract: 'Bounded integer standalone TTA headers and seek tables; qualified 44.1 or 48 kHz mono, stereo and six channel sources with explicit packet budgets.',
    },
    'container.read.ape': {
        version: 1, profiles: ['finite-clear-audio'],
        contract: 'Bounded modern standalone APE descriptors and seek tables; conversion is limited to the exactly tested 3990 stereo16 at 44.1 kHz source profile.',
    },
    'container.read.ogg': {
        version: 1, profiles: ['finite-clear-audio'],
        contract: 'Bounded single-stream Ogg audio with validated CRC, continuation, codec headers and final granule presentation extent; no chained streams or arbitrary seek.',
    },
    'container.read.wave-aiff': {
        version: 1, profiles: ['finite-clear-audio'],
        contract: 'Bounded uncompressed WAV/AIFF mono/stereo audio to owned little-endian PCM packets with explicit sample-clock timestamps.',
    },
    'container.read.isobmff': {
        version: 1, profiles: ['finite-clear-av'],
        contract: 'Bounded self-contained clear MOV/MP4 sample tables, owned packets and explicit sample timestamps; encrypted, fragmented or unsupported edits reject.',
    },
    'container.mux.webm': {
        version: 1, profiles: ['explicit-timeline-av'],
        contract: 'Bounded VP8/VP9/AV1 plus Opus/Vorbis WebM packet copy preserving packet order, PTS, duration and final trims with explicit seek cues; no MP4 timeline inference.',
    },
    'container.mux.fmp4': {
        version: 1, profiles: ['explicit-timeline-av'],
        contract: 'Bounded clear AVC/HEVC and AAC/FLAC/Opus fragments from explicit codec configuration, DTS, PTS and duration; no inferred decode timeline.',
    },
    'media.present.original': {
        version: 1,
        profiles: ['selected-source'],
        contract: 'Present the admitted original source with selected-track/output verification.',
    },
    'media.prepare.file': {
        version: 1,
        profiles: ['packet-copy', 'video-only', 'flac-lossless', 'flac24', 'opus-permitted'],
        contract: 'Integrated selected-stream preparation on the established file timeline; preserve the profile fidelity and seek contract.',
    },
    'media.present.prepared': {
        version: 1,
        profiles: ['selected-streams'],
        contract: 'Present prepared media with bounded buffering and verified selected output/seeks.',
    },
    'media.play.adaptive': {
        version: 1,
        profiles: ['authorized-manifest'],
        contract: 'Own manifest scheduling, selected tracks, quality constraints and presentation.',
    },
    'media.play.complete': {
        version: 1,
        profiles: ['source-tracks'],
        contract: 'Atomic source, timing, audio, video and subtitle execution under the admitted feature policy.',
    },
    'audio.present.selected': {
        version: 1,
        profiles: ['stereo-synchronized'],
        contract: 'Integrated selected audio demux/decode/output synchronized with the existing video timeline.',
    },
    'subtitle.render': {
        version: 1,
        profiles: ['embedded-file', 'external-file'],
        contract: 'Render admitted subtitles and attachments on the presentation owner timeline.',
    },
    'audio.gain': {
        version: 1,
        profiles: ['scalar'],
        contract: 'Apply the requested presentation gain without changing source track identity.',
    },
};
