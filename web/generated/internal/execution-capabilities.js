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
        version: 1, profiles: ['core-48khz-fltp', 'ma-48khz-s32p'],
        contract: 'Complete DTS core packets to owned float planes; The MA profile preserves planar integer PCM; core and MA are separate offers.',
    },
    'audio.decode.truehd': {
        version: 1, profiles: ['48khz-integer'],
        contract: 'Complete TrueHD packets to owned left-justified integer PCM, sample timestamps, reset, drain and cancellation. No Atmos object preservation claim.',
    },
    'audio.decode.mlp': {
        version: 1, profiles: ['48khz-integer'],
        contract: 'Complete MLP packets to owned left-justified integer PCM with native channel layout, reset, drain and cancellation.',
    },
    'audio.decode.aac': {
        version: 1, profiles: ['lc-48khz-stereo'],
        contract: 'Configured AAC-LC packets with AudioSpecificConfig to owned PCM; explicit priming and discard padding belong to the container.',
    },
    'audio.decode.opus': {
        version: 1, profiles: ['48khz-stereo'],
        contract: 'Configured Opus packets to owned PCM with explicit container delay and preroll; no implicit seek state.',
    },
    'audio.decode.vorbis': {
        version: 1, profiles: ['48khz-stereo'],
        contract: 'Configured Vorbis packets and headers to owned PCM with reset, drain and cancellation.',
    },
    'audio.decode.flac': {
        version: 1, profiles: ['48khz-integer'],
        contract: 'Configured FLAC packets to owned left-justified integer PCM; lossless output rejects precision above 24 bits.',
    },
    'audio.decode.alac': {
        version: 1, profiles: ['48khz-integer'],
        contract: 'Configured ALAC packets to owned left-justified integer PCM with explicit channel layout.',
    },
    'audio.decode.mp3': {
        version: 1, profiles: ['48khz-stereo'],
        contract: 'Complete MP3 packets to owned PCM; caller owns gapless metadata and reservoir warmup after reset.',
    },
    'audio.decode.pcm': {
        version: 1, profiles: ['48khz-stereo'],
        contract: 'Configured little-endian signed16/24/32 or float32/64 packets to owned PCM; precision and clipping are explicit output policy.',
    },
    'audio.encode.opus': {
        version: 1, profiles: ['48khz-mono-stereo'],
        contract: 'Explicit lossy mono/stereo Opus output with header, encoder delay, packet timestamps and final trimming.',
    },
    'audio.encode.flac': {
        version: 1, profiles: ['48khz-s24'],
        contract: 'Signed 24-bit PCM to owned FLAC packets with stream info, sample timestamps and bounded send/drain; caller owns quantization and channel mapping.',
    },
    'container.read.matroska': {
        version: 1, profiles: ['finite-clear-av'],
        contract: 'Bounded local container reads with owned packet bytes, explicit track configuration, timestamps, codec delay and discard padding; unsupported structures reject the provider profile.',
    },
    'container.mux.fmp4': {
        version: 1, profiles: ['explicit-timeline-av'],
        contract: 'Bounded clear AVC/HEVC and AAC/FLAC fragments from explicit codec configuration, DTS, PTS and duration; no inferred decode timeline.',
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
