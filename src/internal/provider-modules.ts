// SPDX-License-Identifier: Apache-2.0
/** Deployment-relative service entry points. Type references are erased; the
 * Apache control plane has no static import/re-export of provider code. These
 * are existing modules and lifecycle owners, not new playback backends. */
type Modules = {
  'mpv-player': typeof import('./wasm-player.js');
  'mpv-audio': typeof import('./native-mpv-audio.js');
  'mpv-private-audio': typeof import('./native-private-mpv-audio.js');
  'mpv-subtitles': typeof import('./native-mpv-subtitles.js');
};
const paths: Readonly<Record<keyof Modules, string>> = Object.freeze({
  'mpv-player': 'web/generated/internal/wasm-player.js',
  'mpv-audio': 'web/generated/internal/native-mpv-audio.js',
  'mpv-private-audio': 'web/generated/internal/native-private-mpv-audio.js',
  'mpv-subtitles': 'web/generated/internal/native-mpv-subtitles.js',
});
export function loadProviderModule<K extends keyof Modules>(id: K, assetBase: URL): Promise<Modules[K]> {
  return import(new URL(paths[id], assetBase).href) as Promise<Modules[K]>;
}
