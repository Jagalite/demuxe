// SPDX-License-Identifier: Apache-2.0
import type { TrackMatch, TrackTypePolicy } from '../../types.js';
/** Language aliases are normalized by the Intl adapter before admission. */
export type PolicyTrack = Readonly<{
    id: string;
    language: string | null;
    title: string | null;
    codec: string | null;
    streamIndex: number | null;
    default: boolean;
    selected: boolean;
}>;
export declare function matchesPolicyTrack(track: PolicyTrack, match: TrackMatch): boolean;
export declare function policyTrackAllowed(track: PolicyTrack, policy?: TrackTypePolicy): boolean;
export declare function preferredTrackIndex(list: readonly PolicyTrack[], policy?: TrackTypePolicy): Readonly<{
    index: number;
    rejection?: string;
}>;
export declare function trackSelectionRejection(policy: TrackTypePolicy | undefined, id: string | null, track?: PolicyTrack): string | undefined;
