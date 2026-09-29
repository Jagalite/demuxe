// SPDX-License-Identifier: Apache-2.0
/** Current source inventory, not a deployment manifest or qualification grant.
 * Loader owners retain asset dependencies, ABI checks and runtime/presenter
 * choices. Do not fetch or instantiate anything by importing this module.
 * External file subtitles use the integrated mpv attachment service.
 */
export declare const MEDIA_PROVIDERS: {
    readonly 'browser-original': {
        readonly technology: "browser-native";
        readonly delivery: readonly ["browser", "application-bundle"];
        readonly provides: readonly [{
            readonly capability: "media.present.original";
            readonly version: 1;
            readonly profile: "selected-source";
        }];
        readonly implementation: readonly ["src/internal/native-player.ts"];
        readonly requirementsOwner: "nativeBrowserCapabilities / NativePlayer.verifyStartup";
        readonly configurationOwner: "UnifiedPlayer.create / NativePlayer.loadPlan";
        readonly acquisition: "backend-owned";
    };
    readonly 'browser-prepared': {
        readonly technology: "browser-native";
        readonly delivery: readonly ["browser", "application-bundle"];
        readonly provides: readonly [{
            readonly capability: "media.present.prepared";
            readonly version: 1;
            readonly profile: "selected-streams";
        }];
        readonly implementation: readonly ["src/internal/native-player.ts", "web/native-remux-player.js"];
        readonly requirementsOwner: "planAdmission / nativeBrowserCapabilities / NativePlayer.verifyStartup";
        readonly configurationOwner: "NativePlayer.startRemux";
        readonly acquisition: "backend-owned";
    };
    readonly 'ffmpeg-file-preparation': {
        readonly technology: "mixed";
        readonly delivery: readonly ["application-bundle", "optional-assets"];
        readonly provides: readonly [{
            readonly capability: "media.prepare.file";
            readonly version: 1;
            readonly profile: "packet-copy";
        }, {
            readonly capability: "media.prepare.file";
            readonly version: 1;
            readonly profile: "video-only";
        }, {
            readonly capability: "media.prepare.file";
            readonly version: 1;
            readonly profile: "flac-lossless";
        }, {
            readonly capability: "media.prepare.file";
            readonly version: 1;
            readonly profile: "flac24";
        }, {
            readonly capability: "media.prepare.file";
            readonly version: 1;
            readonly profile: "opus-permitted";
        }];
        readonly implementation: readonly ["src/internal/native-player.ts", "web/native-remux-player.js"];
        readonly requirementsOwner: "planAdmission / remuxRejection / adaptation predicates / current asset checks";
        readonly configurationOwner: "selectRemuxRuntime / NativePlayer.startRemux";
        readonly acquisition: "backend-owned";
    };
    readonly 'ffmpeg-file-preparation-jspi': {
        readonly technology: "mixed";
        readonly delivery: readonly ["application-bundle", "optional-assets"];
        readonly provides: readonly [{
            readonly capability: "media.prepare.file";
            readonly version: 1;
            readonly profile: "packet-copy";
        }, {
            readonly capability: "media.prepare.file";
            readonly version: 1;
            readonly profile: "video-only";
        }, {
            readonly capability: "media.prepare.file";
            readonly version: 1;
            readonly profile: "flac-lossless";
        }, {
            readonly capability: "media.prepare.file";
            readonly version: 1;
            readonly profile: "flac24";
        }];
        readonly implementation: readonly ["web/private-remux.js", "web/engine-remux-jspi/remux.mjs" | "web/engine-remux-asyncify/remux.mjs", "web/engine-adaptation-jspi/remux.mjs" | "web/engine-adaptation-asyncify/remux.mjs"];
        readonly requirementsOwner: "selectRemuxRuntime / private engine ABI and capability checks";
        readonly configurationOwner: "NativePlayer.startRemux";
        readonly acquisition: "backend-owned";
    };
    readonly 'ffmpeg-file-preparation-asyncify': {
        readonly technology: "mixed";
        readonly delivery: readonly ["application-bundle", "optional-assets"];
        readonly provides: readonly [{
            readonly capability: "media.prepare.file";
            readonly version: 1;
            readonly profile: "packet-copy";
        }, {
            readonly capability: "media.prepare.file";
            readonly version: 1;
            readonly profile: "video-only";
        }, {
            readonly capability: "media.prepare.file";
            readonly version: 1;
            readonly profile: "flac-lossless";
        }, {
            readonly capability: "media.prepare.file";
            readonly version: 1;
            readonly profile: "flac24";
        }];
        readonly implementation: readonly ["web/private-remux.js", "web/engine-remux-jspi/remux.mjs" | "web/engine-remux-asyncify/remux.mjs", "web/engine-adaptation-jspi/remux.mjs" | "web/engine-adaptation-asyncify/remux.mjs"];
        readonly requirementsOwner: "selectRemuxRuntime / private engine ABI and capability checks";
        readonly configurationOwner: "NativePlayer.startRemux";
        readonly acquisition: "backend-owned";
    };
    readonly 'selected-mp4-view': {
        readonly technology: "javascript";
        readonly delivery: readonly ["optional-assets"];
        readonly provides: readonly [{
            readonly capability: "media.prepare.file";
            readonly version: 1;
            readonly profile: "packet-copy";
        }];
        readonly implementation: readonly ["web/selected-mp4-view.js"];
        readonly requirementsOwner: "NativePlayer.startRemux local file guard / selectedMP4View return value";
        readonly configurationOwner: "NativePlayer.startRemux";
        readonly acquisition: "backend-owned";
    };
    readonly 'shaka-adaptive': {
        readonly technology: "mixed";
        readonly delivery: readonly ["browser", "application-bundle", "optional-assets"];
        readonly provides: readonly [{
            readonly capability: "media.play.adaptive";
            readonly version: 1;
            readonly profile: "authorized-manifest";
        }];
        readonly implementation: readonly ["src/internal/shaka-backend.ts"];
        readonly requirementsOwner: "planAdmission / ShakaBackend";
        readonly configurationOwner: "ShakaBackend";
        readonly acquisition: "backend-owned";
    };
    readonly 'mpv-hybrid': {
        readonly technology: "mixed";
        readonly delivery: readonly ["browser", "application-bundle", "optional-assets"];
        readonly provides: readonly [{
            readonly capability: "media.play.complete";
            readonly version: 1;
            readonly profile: "source-tracks";
        }];
        readonly implementation: readonly ["src/internal/wasm-player.ts"];
        readonly requirementsOwner: "planAdmission / current external decoder admission / WasmPlayer";
        readonly configurationOwner: "UnifiedPlayer.create / WasmPlayer hybrid mode";
        readonly acquisition: "backend-owned";
    };
    readonly 'mpv-software': {
        readonly technology: "mixed";
        readonly delivery: readonly ["application-bundle", "optional-assets"];
        readonly provides: readonly [{
            readonly capability: "media.play.complete";
            readonly version: 1;
            readonly profile: "source-tracks";
        }];
        readonly implementation: readonly ["src/internal/wasm-player.ts"];
        readonly requirementsOwner: "planAdmission / WasmPlayer";
        readonly configurationOwner: "UnifiedPlayer.create / WasmPlayer software presenter policy";
        readonly acquisition: "backend-owned";
    };
    readonly 'mpv-selected-audio': {
        readonly technology: "mixed";
        readonly delivery: readonly ["application-bundle", "optional-assets"];
        readonly provides: readonly [{
            readonly capability: "audio.present.selected";
            readonly version: 1;
            readonly profile: "stereo-synchronized";
        }];
        readonly implementation: readonly ["src/internal/native-mpv-audio.ts", "src/internal/native-private-mpv-audio.ts"];
        readonly requirementsOwner: "UnifiedPlayer.admissible / planAdmission / selective audio asset checks";
        readonly configurationOwner: "selectRemuxRuntime / NativePlayer.openServices";
        readonly acquisition: "native-service-owned";
    };
    readonly 'mpv-embedded-subtitles': {
        readonly technology: "mixed";
        readonly delivery: readonly ["application-bundle", "optional-assets"];
        readonly provides: readonly [{
            readonly capability: "subtitle.render";
            readonly version: 1;
            readonly profile: "embedded-file";
        }];
        readonly implementation: readonly ["src/internal/native-mpv-subtitles.ts"];
        readonly requirementsOwner: "planAdmission / mpvSubtitleSourceQualified / current subtitle asset checks";
        readonly configurationOwner: "selectRemuxRuntime / NativePlayer.openServices";
        readonly acquisition: "native-service-owned";
    };
    readonly 'mpv-external-subtitles': {
        readonly technology: "mixed";
        readonly delivery: readonly ["application-bundle", "optional-assets"];
        readonly provides: readonly [{
            readonly capability: "subtitle.render";
            readonly version: 1;
            readonly profile: "external-file";
        }];
        readonly implementation: readonly ["src/internal/native-mpv-subtitles.ts"];
        readonly requirementsOwner: "planAdmission / NativePlayer.addSubtitle / NativeMpvSubtitles";
        readonly configurationOwner: "NativePlayer.addSubtitle";
        readonly acquisition: "native-service-owned";
    };
    readonly 'web-audio-gain': {
        readonly technology: "browser-native";
        readonly delivery: readonly ["browser", "application-bundle"];
        readonly provides: readonly [{
            readonly capability: "audio.gain";
            readonly version: 1;
            readonly profile: "scalar";
        }];
        readonly implementation: readonly ["src/internal/native-player.ts", "src/internal/shaka-backend.ts", "src/internal/wasm-player.ts"];
        readonly requirementsOwner: "planAdmission / current backend gain method";
        readonly configurationOwner: "current backend gain method";
        readonly acquisition: "backend-gain-owned";
    };
};
export type MediaProviderId = keyof typeof MEDIA_PROVIDERS;
/** Describes a binding to an existing integrated offer, not permission to run it.
 * Keep the provider/offer pair correlated so a recipe cannot accidentally claim
 * an independently callable codec from the broad preparation engine.
 */
export type CurrentProviderBinding = {
    [P in MediaProviderId]: Readonly<{
        provider: P;
        request: typeof MEDIA_PROVIDERS[P]['provides'][number];
    }>;
}[MediaProviderId];
