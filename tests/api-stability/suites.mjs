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
  core: ['api-stability/private-scheduler', 'api-stability/initial-inspection-state', 'api-stability/player-executor', 'api-stability/native-subtitle-lifetime', 'api-stability/player-resources', 'api-stability/resource-ledger-monotonic', 'api-stability/private-range-source', 'api-stability/native-captions-state', 'api-stability/shaka-backend-state', 'api-stability/shaka-network-state', 'api-stability/native-controls-state', 'api-stability/wasm-settings', 'api-stability/shaka-runtime', 'api-stability/native-load-state', 'api-stability/private-software-state', 'api-stability/wasm-seek', 'api-stability/player-readiness', 'api-stability/player-actions', 'api-stability/external-video-decoder-state', 'api-stability/wasm-lifecycle', 'api-stability/wasm-player-lifecycle', 'watchdogs', 'native-url-services-contracts', 'api-stability/player-publication-state', 'api-stability/native-backend-state', 'api-stability/player-monitor-state', 'api-stability/remux-producer-state', 'api-stability/private-retained-lease', 'api-stability/software-preview-readiness', 'api-stability/route-recovery-state', 'api-stability/route-evidence-state', 'api-stability/route-promotion-state', 'api-stability/private-retained-decoder-state', 'api-stability/private-decoder-mailbox-state', 'api-stability/remux-negotiation-state', 'api-stability/remux-output-state', 'private-retained-decoder', 'private-decoder-mailbox', 'remux-eof-coverage', 'api-stability/route-discovery-state', 'api-stability/remux-scheduling-state', 'api-stability/error-classification', 'api-stability/sequence-diagnostics', 'api-stability/route-inspection-state', 'api-stability/private-retained-presentation-state', 'private-retained-presentation', 'api-stability/remux-buffer-state', 'api-stability/private-playback-worker-state', 'api-stability/remux-controller', 'private-playback-worker', 'private-playback-host', 'api-stability/route-admission-state', 'api-stability/attachment-state', 'api-stability/private-audio-worker-state', 'api-stability/remux-worker', 'native-audio-diagnostics', 'api-stability/track-selection-state', 'api-stability/private-pcm-state', 'api-stability/remux-lifecycle', 'private-playback-pcm', 'private-software-player', 'optimization-contracts', 'api-stability/transport-request-accounting', 'api-stability/private-audio-state', 'api-stability/playback-boundary', 'api-stability/filter-policy', 'api-stability/range-reader-state', 'api-stability/resource-ledger-state', 'api-stability/effect-runtime-state', 'api-stability/backend-requests', 'api-stability/resource-loader-state', 'api-stability/trace-replay', 'api-stability/local-reader-state', 'api-stability/element-configuration-state', 'api-stability/engine-preparation-state', 'api-stability/settings-transactions', 'api-stability/settings-observation-race', 'api-stability/byte-reader', 'api-stability/routing-state', 'api-stability/element-controls-state', 'api-stability/element-queue-state', 'api-stability/element-lifecycle-state', 'api-stability/source-state', 'api-stability/advanced-controls-state', 'api-stability/operations', 'api-stability/telemetry', 'api-stability/presentation-state', 'api-stability/effect-runtime', 'api-stability/resource-ledger', 'api-stability/functional-boundary', 'api-stability/player-projection', 'api-stability/media-projection', 'api-stability/capability-projection', 'api-stability/contracts', 'api-stability/sequences', 'public-api-state', 'roadmap-contracts', 'track-policy', 'tier-policy', 'pause-promotion', 'play-pause-cancellation', 'native-startup-recovery', 'buffering-policy', 'native-readiness-contracts', 'runtime-capability-contracts', 'native-selection', 'plan-admission', 'file-reader', 'range-reader', 'range-reader-deadline', 'subtitle-overlay', 'subtitle-deadline-race', 'shaka-backend', 'shaka-network', 'remux-buffering', 'audio-worklet', 'retained-video', 'timing-coalescing', 'native-seek-frame-race', 'private-mpv-eof-race', 'private-mpv-worker-errors', 'engine-preparation', 'browser-media-capability', 'media-capabilities', 'fast-source-inspector', 'probe-requirements'],
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
