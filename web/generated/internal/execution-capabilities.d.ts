// SPDX-License-Identifier: Apache-2.0
/** Logical contracts only. No browser probes, assets, loaders or codec claims.
 * Profiles describe existing integrated boundaries; they are not packet ABIs.
 * Codec-specific providers can add contracts when an implementation needs them.
 */
export declare const EXECUTION_CAPABILITIES: {
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
