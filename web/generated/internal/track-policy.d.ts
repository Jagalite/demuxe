// SPDX-License-Identifier: Apache-2.0
import type { MediaTrack, TrackMatch, TrackPolicy, TrackTypePolicy } from '../types.js';
import { type PolicyTrack } from './machine/track-policy.js';
export declare function normalizeTrackPolicy(value?: unknown): TrackPolicy;
/** Host language canonicalization is observation capture; matching and policy
 * choices are deterministic over the resulting detached scalar records. */
export declare function capturePolicyTrack(track: MediaTrack): PolicyTrack;
export declare function captureTrackPolicy(policy: TrackTypePolicy | undefined): TrackTypePolicy | undefined;
export declare function matchesTrack(track: MediaTrack, match: TrackMatch): boolean;
export declare function trackAllowed(track: MediaTrack, policy?: TrackTypePolicy): boolean;
export declare function defaultTrack(list: readonly MediaTrack[], policy?: TrackTypePolicy): MediaTrack | null;
export declare function assertTrackSelection(policy: TrackTypePolicy | undefined, id: string | null, track?: MediaTrack): void;
