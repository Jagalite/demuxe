// SPDX-License-Identifier: Apache-2.0
import type { RemoteSource } from '../types.js';
import type { Probe } from './machine/media-facts.js';
export type { Probe, ProbeTrack } from './machine/media-facts.js';
export type { SelectionAttempt } from './machine/source-policy.js';
export { losslessAdaptationRejection, audioTranscodeRejection, remuxRejection } from './machine/source-policy.js';
export declare function nativeRejection(probe: Probe, settings: {
    aid: string;
    sid: string;
    subtitles: boolean;
}, _video?: HTMLVideoElement): string | undefined;
export declare function nativeManifestRejection(source: RemoteSource, settings: {
    aid: string;
    sid: string;
    subtitles: boolean;
}, browserNativeHLS?: boolean): string | undefined;
