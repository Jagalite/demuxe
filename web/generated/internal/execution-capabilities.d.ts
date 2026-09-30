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
        readonly profiles: readonly ["core-48khz-fltp", "ma-48khz-s32p"];
        readonly contract: "Complete DTS core packets to owned float planes; The MA profile preserves planar integer PCM; core and MA are separate offers.";
    };
    readonly 'audio.decode.truehd': {
        readonly version: 1;
        readonly profiles: readonly ["48khz-integer"];
        readonly contract: "Complete TrueHD packets to owned left-justified integer PCM, sample timestamps, reset, drain and cancellation. No Atmos object preservation claim.";
    };
    readonly 'audio.decode.mlp': {
        readonly version: 1;
        readonly profiles: readonly ["48khz-integer"];
        readonly contract: "Complete MLP packets to owned left-justified integer PCM with native channel layout, reset, drain and cancellation.";
    };
    readonly 'audio.encode.flac': {
        readonly version: 1;
        readonly profiles: readonly ["48khz-s24"];
        readonly contract: "Signed 24-bit PCM to owned FLAC packets with stream info, sample timestamps and bounded send/drain; caller owns quantization and channel mapping.";
    };
    readonly 'container.read.matroska': {
        readonly version: 1;
        readonly profiles: readonly ["finite-clear-av"];
        readonly contract: "Bounded local container reads with owned packet bytes, explicit track configuration, timestamps, codec delay and discard padding; unsupported structures reject the provider profile.";
    };
    readonly 'container.mux.fmp4': {
        readonly version: 1;
        readonly profiles: readonly ["explicit-timeline-av"];
        readonly contract: "Bounded clear AVC/HEVC and AAC/FLAC fragments from explicit codec configuration, DTS, PTS and duration; no inferred decode timeline.";
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
