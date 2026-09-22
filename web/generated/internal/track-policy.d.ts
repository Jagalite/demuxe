// SPDX-License-Identifier: Apache-2.0
import type { MediaTrack, TrackMatch, TrackPolicy, TrackTypePolicy } from '../types.js';
export declare function normalizeTrackPolicy(value?: unknown): TrackPolicy;
export declare function matchesTrack(track: MediaTrack, match: TrackMatch): boolean;
export declare function trackAllowed(track: MediaTrack, policy?: TrackTypePolicy): boolean;
export declare function defaultTrack(list: readonly MediaTrack[], policy?: TrackTypePolicy): MediaTrack | null;
export declare function assertTrackSelection(policy: TrackTypePolicy | undefined, id: string | null, track?: MediaTrack): void;
