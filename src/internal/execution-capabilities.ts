// SPDX-License-Identifier: Apache-2.0
/** Logical contracts only. No browser probes, assets, loaders or codec claims.
 * Profiles describe existing integrated boundaries; they are not packet ABIs.
 * Codec-specific providers can add contracts when an implementation needs them.
 */
export const EXECUTION_CAPABILITIES = {
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
