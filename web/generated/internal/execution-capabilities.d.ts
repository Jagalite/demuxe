// SPDX-License-Identifier: Apache-2.0
/** Logical contracts only. No browser probes, assets, loaders or codec claims.
 * Integrated playback boundaries and packet contracts remain distinct.
 * A capability declaration never grants composition qualification.
 */
export declare const EXECUTION_CAPABILITIES: {
    readonly 'audio.decode.ac3': {
        readonly version: 1;
        readonly profiles: readonly ["48khz-fltp"];
        readonly contract: "Complete AC-3 packets to owned float planes with explicit sample timestamps, native channel layout, reset, drain and cancellation.";
    };
    readonly 'audio.decode.eac3': {
        readonly version: 1;
        readonly profiles: readonly ["48khz-fltp"];
        readonly contract: "Complete E-AC-3 packets to owned float planes; no Atmos or dependent-substream composition qualification is implied.";
    };
    readonly 'audio.decode.dts': {
        readonly version: 1;
        readonly profiles: readonly ["core-48khz-fltp", "ma-48khz-s32p", "ma-configured-integer", "ma-high-rate-integer"];
        readonly contract: "Complete DTS core packets to owned float planes; The MA profiles preserve planar integer PCM; high-rate MA is finite96 kHz6/8-channel24-bit or192 kHz6-channel16-bit packet decoding. Only96 kHz qualifies FLAC composition; core and MA are separate offers.";
    };
    readonly 'audio.decode.truehd': {
        readonly version: 1;
        readonly profiles: readonly ["48khz-integer", "configured-integer"];
        readonly contract: "Complete TrueHD packets to owned left-justified integer PCM, sample timestamps, reset, drain and cancellation. No Atmos object preservation claim.";
    };
    readonly 'audio.decode.mlp': {
        readonly version: 1;
        readonly profiles: readonly ["48khz-integer", "configured-integer"];
        readonly contract: "Complete MLP packets to owned left-justified integer PCM with native channel layout, reset, drain and cancellation.";
    };
    readonly 'audio.decode.aac': {
        readonly version: 1;
        readonly profiles: readonly ["lc-48khz-stereo", "lc-configured", "he-stereo48", "he-v2-stereo44100", "usac-mono48", "he-configured-float", "he-v2-stereo32", "usac-stereo-configured", "lc-pce8-44100"];
        readonly contract: "Explicitly admitted AAC-LC or exact ASC-owned HE48 stereo/six-channel, HEv2 stereo44100/32000, USAC mono48/stereo32/44100/48000/88200 and PCE eight-channel44100 packets with verified AudioSpecificConfig and actual decoded profile to owned PCM; explicit priming and discard padding belong to the container.";
    };
    readonly 'audio.decode.opus': {
        readonly version: 1;
        readonly profiles: readonly ["48khz-stereo", "configured-pcm"];
        readonly contract: "Configured Opus packets to owned PCM with explicit container delay and preroll; no implicit seek state.";
    };
    readonly 'audio.decode.vorbis': {
        readonly version: 1;
        readonly profiles: readonly ["48khz-stereo", "configured-pcm"];
        readonly contract: "Configured Vorbis packets and headers to owned PCM with reset, drain and cancellation.";
    };
    readonly 'audio.decode.flac': {
        readonly version: 1;
        readonly profiles: readonly ["48khz-integer", "configured-integer"];
        readonly contract: "Configured FLAC packets to owned left-justified integer PCM; lossless output rejects precision above 24 bits.";
    };
    readonly 'audio.decode.alac': {
        readonly version: 1;
        readonly profiles: readonly ["48khz-integer", "configured-integer"];
        readonly contract: "Configured ALAC packets to owned left-justified integer PCM with explicit channel layout.";
    };
    readonly 'audio.decode.wmapro': {
        readonly version: 1;
        readonly profiles: readonly ["configured-pcm"];
        readonly contract: "Configured WMA Pro blocks to owned float PCM with bounded reservoir/drain and explicit native or packet-clock timestamps; packet-only qualification.";
    };
    readonly 'audio.decode.wmalossless': {
        readonly version: 1;
        readonly profiles: readonly ["configured-integer"];
        readonly contract: "Configured 16/24-bit WMA Lossless blocks to owned exact integer PCM with explicit native or packet-clock timestamps; no composition admission.";
    };
    readonly 'audio.decode.wmavoice': {
        readonly version: 1;
        readonly profiles: readonly ["speech-configured-pcm"];
        readonly contract: "Configured 8/16 kHz mono WMA Voice blocks to owned float PCM with an explicit numerical tolerance and timestamp provenance; no composition admission.";
    };
    readonly 'audio.decode.adpcm-g726': {
        readonly version: 1;
        readonly profiles: readonly ["configured-integer"];
        readonly contract: "Explicit big-endian G726 8 kHz mono coded2/3/4/5-bit complete bit groups to owned signed16 integer PCM; seek requires original full restart and discard.";
    };
    readonly 'audio.decode.adpcm-g726le': {
        readonly version: 1;
        readonly profiles: readonly ["configured-integer"];
        readonly contract: "Explicit least-significant-first G726 8 kHz mono coded2/3/4/5-bit complete bit groups to owned signed16 integer PCM; seek requires original full restart and discard.";
    };
    readonly 'audio.decode.speex': {
        readonly version: 1;
        readonly profiles: readonly ["flv-wideband-float", "ogg-mono-cbr"];
        readonly contract: "Canonical headerless Speex FLV 16 kHz mono packets to owned float PCM with original packet PTS and gaps; max two decoded frames, scalar error below7e-5 and whole-stream SNR above80dB; no container composition admission. Explicit ogg-mono-cbr admits canonical 80-byte Speex headers, 8/32 kHz mono CBR single160/640-sample frames with original signed Ogg PTS and full coded padding; unchanged7e-5/SNR80 qualification.";
    };
    readonly 'audio.decode.amrnb': {
        readonly version: 1;
        readonly profiles: readonly ["mode0-float", "ordinary-modes-float"];
        readonly contract: "Complete ordinary AMR-NB modes0–7 at8 kHz mono; defaultmode0 or explicit immutable amrModes whitelist; quality1 complete frames to owned float PCM, original PTS and restart-from-start/discard seeks; SID/DTX rejected; no container admission.";
    };
    readonly 'audio.decode.amrwb': {
        readonly version: 1;
        readonly profiles: readonly ["mode0-float", "ordinary-modes-float"];
        readonly contract: "Complete ordinary AMR-WB modes0–8 at16 kHz mono; defaultmode0 or explicit immutable amrModes whitelist; quality1 complete frames to owned float PCM, original PTS and restart-from-start/discard seeks; SID rejected; no container admission.";
    };
    readonly 'audio.decode.pcm-alaw': {
        readonly version: 1;
        readonly profiles: readonly ["configured-integer"];
        readonly contract: "Finite G711 A-law 8/16 kHz mono/stereo to owned exact signed16 PCM with original sample clock; coded precision and predictor restart policy remain explicit.";
    };
    readonly 'audio.decode.pcm-mulaw': {
        readonly version: 1;
        readonly profiles: readonly ["configured-integer"];
        readonly contract: "Finite G711 mu-law 8/16 kHz mono/stereo to owned exact signed16 PCM with original sample clock; coded precision and predictor restart policy remain explicit.";
    };
    readonly 'audio.decode.gsm': {
        readonly version: 1;
        readonly profiles: readonly ["configured-integer"];
        readonly contract: "Finite raw GSM 8 kHz mono to owned exact signed16 PCM with original sample clock; coded precision and predictor restart policy remain explicit.";
    };
    readonly 'audio.decode.gsm-ms': {
        readonly version: 1;
        readonly profiles: readonly ["configured-integer"];
        readonly contract: "Finite GSM-MS WAV 8 kHz mono to owned exact signed16 PCM with original sample clock; coded precision and predictor restart policy remain explicit.";
    };
    readonly 'audio.decode.adpcm-ms': {
        readonly version: 1;
        readonly profiles: readonly ["configured-integer"];
        readonly contract: "Canonical Microsoft WAV ADPCM complete blocks to owned signed16 integer PCM with explicit sample clock and independent final fact padding.";
    };
    readonly 'audio.decode.adpcm-ima-qt': {
        readonly version: 1;
        readonly profiles: readonly ["configured-integer"];
        readonly contract: "Finite MOV IMA-QT 44.1/48 kHz mono/stereo original complete34-byte/channel packets to owned exact signed16 PCM;64 decoded frames; original seeks restart from stream beginning; final stts presentation tail explicit.";
    };
    readonly 'audio.decode.adpcm-ima-wav': {
        readonly version: 1;
        readonly profiles: readonly ["configured-integer"];
        readonly contract: "Canonical IMA WAV ADPCM complete blocks to owned signed16 integer PCM with explicit sample clock and independent final fact padding.";
    };
    readonly 'audio.decode.shorten': {
        readonly version: 1;
        readonly profiles: readonly ["canonical-integer"];
        readonly contract: "Canonical version2 RIFF44100 stereo16 Shorten chunks to exact integer PCM with explicit stream clock; seeking recreates the decoder from byte zero.";
    };
    readonly 'audio.decode.tak': {
        readonly version: 1;
        readonly profiles: readonly ["canonical-integer"];
        readonly contract: "CRC-checked TAK codec2/profile2 44.1 kHz mono16 packets with 125 ms frames to owned exact integer PCM; keyframe restarts require actual stream info.";
    };
    readonly 'audio.decode.tta': {
        readonly version: 1;
        readonly profiles: readonly ["configured-integer"];
        readonly contract: "Unencrypted TTA1 packets with validated header and CRC to owned integer PCM; 44.1/48 kHz, 16/24 bit, mono/stereo/5.1 and bounded frames.";
    };
    readonly 'audio.decode.ape': {
        readonly version: 1;
        readonly profiles: readonly ["configured-integer"];
        readonly contract: "Modern APE 3930-3990 packets to owned integer PCM; bounded 16/24 bit mono/stereo configuration, reset and drain. No container admission.";
    };
    readonly 'audio.decode.wavpack': {
        readonly version: 1;
        readonly profiles: readonly ["configured-integer"];
        readonly contract: "Complete integer lossless WavPack blocks to owned PCM; hybrid, correction, float and DSD reject. No container admission.";
    };
    readonly 'audio.decode.mp1': {
        readonly version: 1;
        readonly profiles: readonly ["32khz-stereo"];
        readonly contract: "Complete MPEG Layer I packets to owned PCM; canonical 32 kHz stereo packet evidence only.";
    };
    readonly 'audio.decode.mp2': {
        readonly version: 1;
        readonly profiles: readonly ["configured-pcm", "lower-rate-pcm"];
        readonly contract: "Configured MPEG Layer II packets with container priming to owned PCM.";
    };
    readonly 'audio.decode.wmav1': {
        readonly version: 1;
        readonly profiles: readonly ["configured-pcm", "lower-rate-pcm"];
        readonly contract: "WMA v1/v2 complete blocks with explicit WAVEFORMATEX framing, bitrate and bounded drain timing to owned PCM.";
    };
    readonly 'audio.decode.wmav2': {
        readonly version: 1;
        readonly profiles: readonly ["configured-pcm", "lower-rate-pcm"];
        readonly contract: "WMA v1/v2 complete blocks with explicit WAVEFORMATEX framing, bitrate and bounded drain timing to owned PCM.";
    };
    readonly 'audio.decode.mp3': {
        readonly version: 1;
        readonly profiles: readonly ["48khz-stereo", "configured-pcm"];
        readonly contract: "Complete MP3 packets to owned PCM; caller owns gapless metadata and reservoir warmup after reset.";
    };
    readonly 'audio.decode.pcm': {
        readonly version: 1;
        readonly profiles: readonly ["48khz-stereo", "configured-pcm", "integer-8bit"];
        readonly contract: "Configured little-endian signed16/24/32 or float32/64 packets to owned PCM; integer-8bit admits WAV unsigned8 and AIFF signed8 at 44100/48000/96000 Hz mono/stereo to exact owned integers. Precision and clipping are explicit output policy.";
    };
    readonly 'audio.encode.opus': {
        readonly version: 1;
        readonly profiles: readonly ["48khz-mono-stereo"];
        readonly contract: "Explicit lossy mono/stereo Opus output with header, encoder delay, packet timestamps and final trimming.";
    };
    readonly 'audio.encode.flac': {
        readonly version: 1;
        readonly profiles: readonly ["48khz-s24", "configured-s24", "low-rate-s24"];
        readonly contract: "Signed 24-bit PCM at existing 44.1/48/96 kHz or explicitly admitted low rates 8/16/22.05/32 kHz mono/stereo to owned FLAC packets with stream info, sample timestamps and bounded send/drain; caller owns quantization and channel mapping.";
    };
    readonly 'container.read.matroska': {
        readonly version: 1;
        readonly profiles: readonly ["finite-clear-av", "finite-clear-webm"];
        readonly contract: "Bounded local container reads with owned packet bytes, explicit track configuration, timestamps, codec delay and discard padding; unsupported structures reject the provider profile.";
    };
    readonly 'container.read.mpegts': {
        readonly version: 1;
        readonly profiles: readonly ["finite-pes-av"];
        readonly contract: "Single-program clear MPEG-TS AVC Annex B and AAC ADTS packets with explicit 90 kHz PTS/DTS; no packet rewriting, muxing or seek qualification.";
    };
    readonly 'container.read.wavpack': {
        readonly version: 1;
        readonly profiles: readonly ["finite-clear-audio"];
        readonly contract: "Bounded integer lossless standalone WavPack headers and blocks with exact original sample counts; hybrid, float, DSD and unsupported layouts reject.";
    };
    readonly 'container.read.g726': {
        readonly version: 1;
        readonly profiles: readonly ["finite-clear-audio", "explicit-raw-audio"];
        readonly contract: "Canonical0x45 G726 WAV8kmono with exactfact final-group extent, or explicitly configured raw codec/codedwidth/optional original samplecount; complete bit groups and original predictor history only. No bit-order sniffing.";
    };
    readonly 'container.read.telephony': {
        readonly version: 1;
        readonly profiles: readonly ["finite-clear-audio"];
        readonly contract: "Bounded G711/GSM-MS WAV and raw GSM reads with owned complete codewords/blocks, explicit original sample extent and final fact trim; GSM seek restarts from byte zero.";
    };
    readonly 'container.read.adpcm-wave': {
        readonly version: 1;
        readonly profiles: readonly ["finite-clear-audio"];
        readonly contract: "Bounded canonical Microsoft/IMA WAV ADPCM metadata and whole owned blocks with explicit decoded duration, presentation fact extent and final discard padding.";
    };
    readonly 'container.read.shorten': {
        readonly version: 1;
        readonly profiles: readonly ["finite-clear-audio"];
        readonly contract: "Finite canonical Shorten version2 embedded RIFF metadata and owned untimestamped chunks; full restart and discard seeking only.";
    };
    readonly 'container.read.tak': {
        readonly version: 1;
        readonly profiles: readonly ["finite-clear-audio"];
        readonly contract: "Bounded TAK codec2/profile2 44.1 kHz mono16 files with strict metadata/frame CRC and exact sample clocks; compressed payload scan builds an actual keyframe index.";
    };
    readonly 'container.read.tta': {
        readonly version: 1;
        readonly profiles: readonly ["finite-clear-audio"];
        readonly contract: "Bounded integer standalone TTA headers and seek tables; qualified 44.1 or 48 kHz mono, stereo and six channel sources with explicit packet budgets.";
    };
    readonly 'container.read.ape': {
        readonly version: 1;
        readonly profiles: readonly ["finite-clear-audio"];
        readonly contract: "Bounded modern standalone APE descriptors and seek tables; conversion is limited to the exactly tested 3990 stereo16 at 44.1 kHz source profile.";
    };
    readonly 'container.read.ogg': {
        readonly version: 1;
        readonly profiles: readonly ["finite-clear-audio"];
        readonly contract: "Bounded single-stream Ogg audio with validated CRC, continuation, codec headers and final granule presentation extent; no chained streams or arbitrary seek.";
    };
    readonly 'container.read.wave-aiff': {
        readonly version: 1;
        readonly profiles: readonly ["finite-clear-audio"];
        readonly contract: "Bounded uncompressed WAV/AIFF mono/stereo audio to owned little-endian PCM packets with explicit sample-clock timestamps.";
    };
    readonly 'container.read.isobmff': {
        readonly version: 1;
        readonly profiles: readonly ["finite-clear-av"];
        readonly contract: "Bounded self-contained clear MOV/MP4 sample tables, owned packets and explicit sample timestamps; encrypted, fragmented or unsupported edits reject.";
    };
    readonly 'container.mux.webm': {
        readonly version: 1;
        readonly profiles: readonly ["explicit-timeline-av"];
        readonly contract: "Bounded VP8/VP9/AV1 plus Opus/Vorbis WebM packet copy preserving packet order, PTS, duration and final trims with explicit seek cues; no MP4 timeline inference.";
    };
    readonly 'container.mux.fmp4': {
        readonly version: 1;
        readonly profiles: readonly ["explicit-timeline-av"];
        readonly contract: "Bounded clear AVC/HEVC and AAC/FLAC/Opus fragments from explicit codec configuration, DTS, PTS and duration; no inferred decode timeline.";
    };
    readonly 'media.present.original': {
        readonly version: 1;
        readonly profiles: readonly ["selected-source"];
        readonly contract: "Present the admitted original source with selected-track/output verification.";
    };
    readonly 'media.prepare.file': {
        readonly version: 1;
        readonly profiles: readonly ["packet-copy", "video-only", "flac-lossless", "flac24", "opus-permitted"];
        readonly contract: "Integrated selected-stream preparation on the established file timeline; preserve the profile fidelity and seek contract.";
    };
    readonly 'media.present.prepared': {
        readonly version: 1;
        readonly profiles: readonly ["selected-streams"];
        readonly contract: "Present prepared media with bounded buffering and verified selected output/seeks.";
    };
    readonly 'media.play.adaptive': {
        readonly version: 1;
        readonly profiles: readonly ["authorized-manifest"];
        readonly contract: "Own manifest scheduling, selected tracks, quality constraints and presentation.";
    };
    readonly 'media.play.complete': {
        readonly version: 1;
        readonly profiles: readonly ["source-tracks"];
        readonly contract: "Atomic source, timing, audio, video and subtitle execution under the admitted feature policy.";
    };
    readonly 'audio.present.selected': {
        readonly version: 1;
        readonly profiles: readonly ["stereo-synchronized"];
        readonly contract: "Integrated selected audio demux/decode/output synchronized with the existing video timeline.";
    };
    readonly 'subtitle.render': {
        readonly version: 1;
        readonly profiles: readonly ["embedded-file", "external-file"];
        readonly contract: "Render admitted subtitles and attachments on the presentation owner timeline.";
    };
    readonly 'audio.gain': {
        readonly version: 1;
        readonly profiles: readonly ["scalar"];
        readonly contract: "Apply the requested presentation gain without changing source track identity.";
    };
};
export type ExecutionCapabilityId = keyof typeof EXECUTION_CAPABILITIES;
export type CapabilityRequest = {
    [C in ExecutionCapabilityId]: Readonly<{
        capability: C;
        version: typeof EXECUTION_CAPABILITIES[C]['version'];
        profile: typeof EXECUTION_CAPABILITIES[C]['profiles'][number];
    }>;
}[ExecutionCapabilityId];
/** Technology and delivery are independent: JS may be bundled or lazy; a
 * browser provider may need an adapter but no downloadable media engine.
 */
export type ProviderTechnology = 'browser-native' | 'javascript' | 'wasm' | 'mixed';
export type ProviderDelivery = 'browser' | 'application-bundle' | 'optional-assets';
