// SPDX-License-Identifier: Apache-2.0
const paths = Object.freeze({
    'mpv-player': 'web/generated/internal/wasm-player.js',
    'mpv-audio': 'web/generated/internal/native-mpv-audio.js',
    'mpv-private-audio': 'web/generated/internal/native-private-mpv-audio.js',
    'mpv-subtitles': 'web/generated/internal/native-mpv-subtitles.js',
});
export function loadProviderModule(id, assetBase) {
    return import(new URL(paths[id], assetBase).href);
}
