// SPDX-License-Identifier: Apache-2.0
import { nativeRejection as decideNativeRejection, nativeManifestRejection as decideManifestRejection } from './machine/source-policy.js';
export { losslessAdaptationRejection, audioTranscodeRejection, remuxRejection } from './machine/source-policy.js';
export function nativeRejection(probe, settings, _video) { return decideNativeRejection(probe, settings); }
export function nativeManifestRejection(source, settings, browserNativeHLS = false) { return decideManifestRejection({ demuxer: source.demuxer, format: source.format, streaming: source.streaming ? { live: source.streaming.live, maxBandwidth: source.streaming.maxBandwidth, representation: source.streaming.representation } : undefined }, settings, browserNativeHLS); }
