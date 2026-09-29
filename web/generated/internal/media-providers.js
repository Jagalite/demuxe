// SPDX-License-Identifier: Apache-2.0
/** Current source inventory, not a deployment manifest or qualification grant.
 * Loader owners retain asset dependencies, ABI checks and runtime/presenter
 * choices. Do not fetch or instantiate anything by importing this module.
 * External file subtitles use the integrated mpv attachment service.
 */
export const MEDIA_PROVIDERS = {
    'browser-original': {
        technology: 'browser-native', delivery: ['browser', 'application-bundle'],
        provides: [{ capability: 'media.present.original', version: 1, profile: 'selected-source' }],
        implementation: ['src/internal/native-player.ts'],
        requirementsOwner: 'nativeBrowserCapabilities / NativePlayer.verifyStartup',
        configurationOwner: 'UnifiedPlayer.create / NativePlayer.loadPlan', acquisition: 'backend-owned',
    },
    'browser-prepared': {
        technology: 'browser-native', delivery: ['browser', 'application-bundle'],
        provides: [{ capability: 'media.present.prepared', version: 1, profile: 'selected-streams' }],
        implementation: ['src/internal/native-player.ts', 'web/native-remux-player.js'],
        requirementsOwner: 'planAdmission / nativeBrowserCapabilities / NativePlayer.verifyStartup',
        configurationOwner: 'NativePlayer.startRemux', acquisition: 'backend-owned',
    },
    'ffmpeg-file-preparation': {
        technology: 'mixed', delivery: ['application-bundle', 'optional-assets'],
        provides: [
            { capability: 'media.prepare.file', version: 1, profile: 'packet-copy' },
            { capability: 'media.prepare.file', version: 1, profile: 'video-only' },
            { capability: 'media.prepare.file', version: 1, profile: 'flac-lossless' },
            { capability: 'media.prepare.file', version: 1, profile: 'flac24' },
            { capability: 'media.prepare.file', version: 1, profile: 'opus-permitted' },
        ],
        implementation: ['src/internal/native-player.ts', 'web/native-remux-player.js'],
        requirementsOwner: 'planAdmission / remuxRejection / adaptation predicates / current asset checks',
        configurationOwner: 'selectRemuxRuntime / NativePlayer.startRemux', acquisition: 'backend-owned',
    },
    'selected-mp4-view': {
        technology: 'javascript', delivery: ['optional-assets'],
        provides: [{ capability: 'media.prepare.file', version: 1, profile: 'packet-copy' }],
        implementation: ['web/selected-mp4-view.js'],
        requirementsOwner: 'NativePlayer.startRemux local file guard / selectedMP4View return value',
        configurationOwner: 'NativePlayer.startRemux', acquisition: 'backend-owned',
    },
    'shaka-adaptive': {
        technology: 'mixed', delivery: ['browser', 'application-bundle', 'optional-assets'],
        provides: [{ capability: 'media.play.adaptive', version: 1, profile: 'authorized-manifest' }],
        implementation: ['src/internal/shaka-backend.ts'],
        requirementsOwner: 'planAdmission / ShakaBackend',
        configurationOwner: 'ShakaBackend', acquisition: 'backend-owned',
    },
    'mpv-hybrid': {
        technology: 'mixed', delivery: ['browser', 'application-bundle', 'optional-assets'],
        provides: [{ capability: 'media.play.complete', version: 1, profile: 'source-tracks' }],
        implementation: ['src/internal/wasm-player.ts'],
        requirementsOwner: 'planAdmission / current external decoder admission / WasmPlayer',
        configurationOwner: 'UnifiedPlayer.create / WasmPlayer hybrid mode', acquisition: 'backend-owned',
    },
    'mpv-software': {
        technology: 'mixed', delivery: ['application-bundle', 'optional-assets'],
        provides: [{ capability: 'media.play.complete', version: 1, profile: 'source-tracks' }],
        implementation: ['src/internal/wasm-player.ts'],
        requirementsOwner: 'planAdmission / WasmPlayer',
        configurationOwner: 'UnifiedPlayer.create / WasmPlayer software presenter policy', acquisition: 'backend-owned',
    },
    'mpv-selected-audio': {
        technology: 'mixed', delivery: ['application-bundle', 'optional-assets'],
        provides: [{ capability: 'audio.present.selected', version: 1, profile: 'stereo-synchronized' }],
        implementation: ['src/internal/native-mpv-audio.ts', 'src/internal/native-private-mpv-audio.ts'],
        requirementsOwner: 'UnifiedPlayer.admissible / planAdmission / selective audio asset checks',
        configurationOwner: 'selectRemuxRuntime / NativePlayer.openServices', acquisition: 'native-service-owned',
    },
    'mpv-embedded-subtitles': {
        technology: 'mixed', delivery: ['application-bundle', 'optional-assets'],
        provides: [{ capability: 'subtitle.render', version: 1, profile: 'embedded-file' }],
        implementation: ['src/internal/native-mpv-subtitles.ts'],
        requirementsOwner: 'planAdmission / mpvSubtitleSourceQualified / current subtitle asset checks',
        configurationOwner: 'selectRemuxRuntime / NativePlayer.openServices', acquisition: 'native-service-owned',
    },
    'mpv-external-subtitles': {
        technology: 'mixed', delivery: ['application-bundle', 'optional-assets'],
        provides: [{ capability: 'subtitle.render', version: 1, profile: 'external-file' }],
        implementation: ['src/internal/native-mpv-subtitles.ts'],
        requirementsOwner: 'planAdmission / NativePlayer.addSubtitle / NativeMpvSubtitles',
        configurationOwner: 'NativePlayer.addSubtitle', acquisition: 'native-service-owned',
    },
    'web-audio-gain': {
        technology: 'browser-native', delivery: ['browser', 'application-bundle'],
        provides: [{ capability: 'audio.gain', version: 1, profile: 'scalar' }],
        implementation: ['src/internal/native-player.ts', 'src/internal/shaka-backend.ts', 'src/internal/wasm-player.ts'],
        requirementsOwner: 'planAdmission / current backend gain method',
        configurationOwner: 'current backend gain method', acquisition: 'backend-gain-owned',
    },
};
