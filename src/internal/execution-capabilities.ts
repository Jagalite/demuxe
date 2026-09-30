// SPDX-License-Identifier: Apache-2.0
/** Logical contracts only. No browser probes, assets, loaders or codec claims.
 * Integrated playback boundaries and packet contracts remain distinct.
 * A capability declaration never grants composition qualification.
 */
export const EXECUTION_CAPABILITIES = {
  'audio.decode.ac3': {
    version: 1, profiles: ['48khz-fltp'] as const,
    contract: 'Complete AC-3 packets to owned float planes with explicit sample timestamps, native channel layout, reset, drain and cancellation.',
  },
  'audio.decode.eac3': {
    version: 1, profiles: ['48khz-fltp'] as const,
    contract: 'Complete E-AC-3 packets to owned float planes; no Atmos or dependent-substream composition qualification is implied.',
  },
  'audio.decode.dts': {
    version: 1, profiles: ['core-48khz-fltp', 'ma-48khz-s32p'] as const,
    contract: 'Complete DTS core packets to owned float planes; The MA profile preserves planar integer PCM; core and MA are separate offers.',
  },
  'audio.decode.truehd': {
    version: 1, profiles: ['48khz-integer'] as const,
    contract: 'Complete TrueHD packets to owned left-justified integer PCM, sample timestamps, reset, drain and cancellation. No Atmos object preservation claim.',
  },
  'audio.decode.mlp': {
    version: 1, profiles: ['48khz-integer'] as const,
    contract: 'Complete MLP packets to owned left-justified integer PCM with native channel layout, reset, drain and cancellation.',
  },
  'audio.encode.flac': {
    version: 1, profiles: ['48khz-s24'] as const,
    contract: 'Signed 24-bit PCM to owned FLAC packets with stream info, sample timestamps and bounded send/drain; caller owns quantization and channel mapping.',
  },
  'container.read.matroska': {
    version: 1, profiles: ['finite-clear-av'] as const,
    contract: 'Bounded local container reads with owned packet bytes, explicit track configuration, timestamps, codec delay and discard padding; unsupported structures reject the provider profile.',
  },
  'container.mux.fmp4': {
    version: 1, profiles: ['explicit-timeline-av'] as const,
    contract: 'Bounded clear AVC/HEVC and AAC/FLAC fragments from explicit codec configuration, DTS, PTS and duration; no inferred decode timeline.',
  },
  'media.present.original': {
    version: 1,
    profiles: ['selected-source'] as const,
    contract: 'Present the admitted original source with selected-track/output verification.',
  },
  'media.prepare.file': {
    version: 1,
    profiles: ['packet-copy', 'video-only', 'flac-lossless', 'flac24', 'opus-permitted'] as const,
    contract: 'Integrated selected-stream preparation on the established file timeline; preserve the profile fidelity and seek contract.',
  },
  'media.present.prepared': {
    version: 1,
    profiles: ['selected-streams'] as const,
    contract: 'Present prepared media with bounded buffering and verified selected output/seeks.',
  },
  'media.play.adaptive': {
    version: 1,
    profiles: ['authorized-manifest'] as const,
    contract: 'Own manifest scheduling, selected tracks, quality constraints and presentation.',
  },
  'media.play.complete': {
    version: 1,
    profiles: ['source-tracks'] as const,
    contract: 'Atomic source, timing, audio, video and subtitle execution under the admitted feature policy.',
  },
  'audio.present.selected': {
    version: 1,
    profiles: ['stereo-synchronized'] as const,
    contract: 'Integrated selected audio demux/decode/output synchronized with the existing video timeline.',
  },
  'subtitle.render': {
    version: 1,
    profiles: ['embedded-file', 'external-file'] as const,
    contract: 'Render admitted subtitles and attachments on the presentation owner timeline.',
  },
  'audio.gain': {
    version: 1,
    profiles: ['scalar'] as const,
    contract: 'Apply the requested presentation gain without changing source track identity.',
  },
} as const;

export type ExecutionCapabilityId = keyof typeof EXECUTION_CAPABILITIES;
export type CapabilityRequest = {
  [C in ExecutionCapabilityId]: Readonly<{
    capability: C;
    version: typeof EXECUTION_CAPABILITIES[C]['version'];
    profile: typeof EXECUTION_CAPABILITIES[C]['profiles'][number];
  }>
}[ExecutionCapabilityId];

/** Technology and delivery are independent: JS may be bundled or lazy; a
 * browser provider may need an adapter but no downloadable media engine.
 */
export type ProviderTechnology = 'browser-native' | 'javascript' | 'wasm' | 'mixed';
export type ProviderDelivery = 'browser' | 'application-bundle' | 'optional-assets';
