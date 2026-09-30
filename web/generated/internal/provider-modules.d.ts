// SPDX-License-Identifier: Apache-2.0
/** Deployment-relative service entry points. Type references are erased; the
 * Apache control plane has no static import/re-export of provider code. These
 * are existing modules and lifecycle owners, not new playback backends. */
type Modules = {
    'mpv-private-player': typeof import('./private-software-player.js');
    'mpv-player': typeof import('./wasm-player.js');
    'mpv-audio': typeof import('./native-mpv-audio.js');
    'mpv-private-audio': typeof import('./native-private-mpv-audio.js');
    'mpv-subtitles': typeof import('./native-mpv-subtitles.js');
};
export declare function loadProviderModule<K extends keyof Modules>(id: K, assetBase: URL): Promise<Modules[K]>;
export {};
