// SPDX-License-Identifier: Apache-2.0
// Explicit, reviewable gate membership. A new API needs a contract and a scenario.
export const surfaces = {
  '.': {source:'src/index.ts', contracts:['core', 'preview'], browser:['core', 'sequences', 'preview', 'streaming']},
  './contracts': {source:'src/contracts.ts', contracts:['integration'], browser:['integration']},
  './player': {source:'src/player/index.ts', contracts:['preview'], browser:['ui', 'sequences']},
  './integration': {source:'src/integration/index.ts', contracts:['integration'], browser:['integration', 'sequences']},
  './media-element': {source:'src/media-element/index.ts', contracts:['integration'], browser:['integration', 'sequences']},
  './adapters/videojs': {source:'src/adapters/videojs.ts', contracts:['integration'], browser:['integration']},
  './components': {source:'src/components.ts', contracts:['components'], browser:['bundles']},
};
export const contracts = {
  core: ['api-stability/trace-replay', 'api-stability/local-reader-state', 'api-stability/element-configuration-state', 'api-stability/engine-preparation-state', 'api-stability/settings-transactions', 'api-stability/settings-observation-race', 'api-stability/byte-reader', 'api-stability/routing-state', 'api-stability/element-controls-state', 'api-stability/element-queue-state', 'api-stability/element-lifecycle-state', 'api-stability/source-state', 'api-stability/advanced-controls-state', 'api-stability/operations', 'api-stability/telemetry', 'api-stability/presentation-state', 'api-stability/effect-runtime', 'api-stability/resource-ledger', 'api-stability/functional-boundary', 'api-stability/player-projection', 'api-stability/media-projection', 'api-stability/capability-projection', 'api-stability/contracts', 'api-stability/sequences', 'public-api-state', 'roadmap-contracts', 'track-policy', 'tier-policy', 'pause-promotion', 'play-pause-cancellation', 'native-startup-recovery', 'buffering-policy', 'native-readiness-contracts', 'runtime-capability-contracts', 'native-selection', 'plan-admission', 'file-reader', 'range-reader', 'range-reader-deadline', 'subtitle-overlay', 'subtitle-deadline-race', 'shaka-backend', 'shaka-network', 'remux-buffering', 'audio-worklet', 'retained-video', 'timing-coalescing', 'native-seek-frame-race', 'private-mpv-eof-race', 'private-mpv-worker-errors', 'engine-preparation', 'browser-media-capability', 'media-capabilities', 'fast-source-inspector', 'probe-requirements'],
  preview: ['api-stability/scrubber-state', 'api-stability/preview-core', 'preview', 'preview-facade', 'preview-pregeneration', 'preview-strategies', 'scrubber-preview', 'preview-range'],
  integration: ['api-stability/videojs-state', 'api-stability/binding-state', 'integration'],
  components: ['api-stability/provider-runtime-state', 'api-stability/provider-acquisition-state', 'component-selection', 'provider-resolution', 'provider-runtime', 'provider-acquisition', 'provider-container-metadata', 'provider-owner-failures', 'asset-deployment', 'resource-loader'],
};
// Suites without a structured report must exit nonzero for any assertion failure.
// Every process is supervised, including its dev server and browser children.
export const browsers = {
  core: [
    {file:'public-api', report:'results/public-api', minimum:20},
    {file:'roadmap-browser', report:'results/api-roadmap', minimum:18},
  ],
  ui: [
    {file:'player-component', report:'results/player-component', minimum:25},
    {file:'player-presentation', report:'results/player-presentation', minimum:12},
    {file:'api-stability/advanced-settings', report:'results/api-stability/advanced', minimum:24},
    {file:'api-stability/advanced-playback', report:'results/api-stability/advanced-playback', minimum:5},
  ],
  integration: [
    {file:'integration-browser', report:'results/api-integration', minimum:2},
    {file:'integration-presentation', report:'results/api-integration', minimum:1},
  ],
  preview: ['preview-browser','preview-ui','preview-options-browser','preview-software','preview-shaka-browser'].map(file=>({file})),
  sequences: [{file:'api-stability/browser', report:'results/api-stability/scenarios', minimum:22}],
  streaming: [{file:'shaka-lifecycle', report:'results/shaka', minimum:2, selection:'roadmap'}],
  // The existing bundle job verifies actual installed components in both deliveries.
  bundles: [{file:'bundle-playback'}],
};
